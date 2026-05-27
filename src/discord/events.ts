import type { Client, Message } from 'discord.js';
import type { Env } from '../config/env.js';
import { extractYouTubeLinks } from '../links/extract-video-links.js';
import { upsertVideo } from '../db/videos.js';
import { createJob } from '../db/jobs.js';
import { processVideoJob } from '../queue/process-video-job.js';
import { logger } from '../utils/logger.js';

function debug(env: Env, message: string, payload?: unknown): void {
  if (env.debugVideoRouter) logger.debug(message, payload);
}

export async function handleMessageCreate(env: Env, client: Client, message: Message): Promise<void> {
  if (message.author.bot) {
    debug(env, 'Ignored bot message.', { messageId: message.id, channelId: message.channelId });
    return;
  }

  if (!message.guildId) {
    debug(env, 'Ignored non-guild message.', { messageId: message.id, channelId: message.channelId });
    return;
  }

  if (env.sourceChannelIds.size > 0 && !env.sourceChannelIds.has(message.channelId)) {
    debug(env, 'Ignored message outside configured source channels.', {
      messageId: message.id,
      channelId: message.channelId,
      configuredSourceChannels: [...env.sourceChannelIds],
    });
    return;
  }

  const links = extractYouTubeLinks(message.content);
  if (links.length === 0) {
    debug(env, 'No YouTube links found in message.', {
      messageId: message.id,
      channelId: message.channelId,
      contentLength: message.content.length,
    });
    return;
  }

  logger.info(`Found ${links.length} YouTube link(s) in message ${message.id} from channel ${message.channelId}.`);

  for (const link of links) {
    const video = upsertVideo(link.platform, link.videoId, link.url);
    const job = createJob(video.id, message.guildId, message.channelId, message.id);

    logger.info(`Queued video job ${job.id} for ${link.videoId}`);

    processVideoJob(env, client, job.id, {
      videoId: link.videoId,
      url: link.url,
    }).catch((error) => {
      logger.error(`Unhandled processing error for job ${job.id}`, error);
    });
  }
}
