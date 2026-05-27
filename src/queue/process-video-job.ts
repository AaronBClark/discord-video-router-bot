import type { Client, TextChannel } from 'discord.js';
import { ChannelType } from 'discord.js';
import type { Env } from '../config/env.js';
import { describeChannelRoutes, getChannelRoutes, getRouteConfigErrors } from '../config/channels.js';
import { analyzeVideoTranscript } from '../ai/summarize-video.js';
import { getCachedAnalysis, saveAnalysis } from '../db/analysis-cache.js';
import { getJob, setApprovalMessage, updateJobStatus } from '../db/jobs.js';
import { resolveTranscript } from '../transcripts/resolve-transcript.js';
import { buildApprovalButtons, buildApprovalEmbed } from '../discord/approval-message.js';
import { logger } from '../utils/logger.js';

type ProcessVideoInput = {
  videoId: string;
  url: string;
};

export async function processVideoJob(
  env: Env,
  client: Client,
  jobId: number,
  input: ProcessVideoInput,
): Promise<void> {
  try {
    const job = getJob(jobId);
    if (!job) throw new Error(`Job not found: ${jobId}`);

    logger.info(`Job ${jobId} started for ${input.videoId}.`);
    updateJobStatus(jobId, 'fetching_transcript');

    const transcript = await resolveTranscript(input.videoId, input.url);

    if (!transcript.ok) {
      updateJobStatus(jobId, 'failed', `${transcript.reason}${transcript.error ? `: ${transcript.error}` : ''}`);
      logger.warn(`Transcript failed for job ${jobId}`, transcript);
      return;
    }

    logger.info(`Job ${jobId} transcript resolved from ${transcript.source} (${transcript.plainText.length} chars).`);
    updateJobStatus(jobId, 'summarizing');

    const routes = getChannelRoutes(env);
    const routeErrors = getRouteConfigErrors(routes);
    if (routeErrors.length > 0) {
      logger.warn(`Route config warnings for job ${jobId}`, { routeErrors, routes: describeChannelRoutes(routes) });
    }

    const cached = getCachedAnalysis(job.video_id, env.geminiModel);
    if (cached) logger.info(`Job ${jobId} using cached Gemini analysis.`);

    const analysis = cached ?? (await analyzeVideoTranscript(env, routes, transcript.plainText));

    if (!cached) {
      saveAnalysis(job.video_id, env.geminiModel, analysis);
    }

    logger.info(`Job ${jobId} analysis recommends "${analysis.recommended_channel_key}" at ${Math.round(analysis.confidence * 100)}% confidence.`);

    const approvalChannel = await client.channels.fetch(env.approvalChannelId);

    if (!approvalChannel || approvalChannel.type !== ChannelType.GuildText) {
      throw new Error(`APPROVAL_CHANNEL_ID (${env.approvalChannelId}) does not point to a guild text channel the bot can access.`);
    }

    const approvalMessage = await (approvalChannel as TextChannel).send({
      embeds: [buildApprovalEmbed(jobId, input.url, analysis)],
      components: [buildApprovalButtons(jobId)],
    });

    setApprovalMessage(jobId, approvalMessage.id);
    updateJobStatus(jobId, 'pending_approval');

    logger.info(`Job ${jobId} pending approval as message ${approvalMessage.id}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateJobStatus(jobId, 'failed', message);
    logger.error(`Job ${jobId} failed`, error);
  }
}
