import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  type ButtonInteraction,
  type Client,
  type Interaction,
  type TextChannel,
} from 'discord.js';
import type { Env } from '../config/env.js';
import { findChannelRoute, getChannelRoutes } from '../config/channels.js';
import type { VideoAnalysis } from '../ai/schemas.js';
import { getJob, markPosted, updateJobStatus } from '../db/jobs.js';
import { getDb } from '../db/db.js';
import { logger } from '../utils/logger.js';

export function buildApprovalEmbed(jobId: number, videoUrl: string, analysis: VideoAnalysis): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(analysis.title_guess || 'Video ready for review')
    .setURL(videoUrl)
    .setDescription(analysis.short_summary)
    .addFields(
      {
        name: 'Recommended channel',
        value: `${analysis.recommended_channel_key} (${Math.round(analysis.confidence * 100)}% confidence)`,
        inline: true,
      },
      {
        name: 'Topics',
        value: analysis.topics.length ? analysis.topics.join(', ') : 'None',
        inline: true,
      },
      {
        name: 'Reason',
        value: analysis.reason || 'No reason provided.',
      },
      {
        name: 'Key points',
        value: analysis.key_points.length
          ? analysis.key_points.map((point) => `• ${point}`).join('\n').slice(0, 1000)
          : 'None',
      },
    )
    .setFooter({ text: `Job ${jobId} • Transcript-based summary` });
}

export function buildApprovalButtons(jobId: number): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`video-router:approve:${jobId}`)
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`video-router:reject:${jobId}`)
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger),
  );
}

export async function handleApprovalInteraction(
  env: Env,
  client: Client,
  interaction: Interaction,
): Promise<void> {
  if (!interaction.isButton()) return;
  if (!interaction.customId.startsWith('video-router:')) return;

  const [, action, jobIdText] = interaction.customId.split(':');
  const jobId = Number(jobIdText);

  if (!Number.isInteger(jobId)) {
    await interaction.reply({ content: 'Invalid job id.', ephemeral: true });
    return;
  }

  if (action === 'reject') {
    updateJobStatus(jobId, 'rejected');
    await interaction.update({ content: `Rejected job ${jobId}.`, embeds: [], components: [] });
    return;
  }

  if (action === 'approve') {
    await approveJob(env, client, interaction, jobId);
  }
}

async function approveJob(env: Env, client: Client, interaction: ButtonInteraction, jobId: number): Promise<void> {
  const job = getJob(jobId);

  if (!job) {
    await interaction.reply({ content: `Job ${jobId} not found.`, ephemeral: true });
    return;
  }

  const row = getDb().prepare(`
    SELECT v.original_url, a.analysis_json
    FROM jobs j
    JOIN videos v ON v.id = j.video_id
    JOIN analyses a ON a.video_id = v.id
    WHERE j.id = ?
    ORDER BY a.created_at DESC
    LIMIT 1
  `).get(jobId) as { original_url: string; analysis_json: string } | undefined;

  if (!row) {
    await interaction.reply({ content: `Job ${jobId} has no saved analysis.`, ephemeral: true });
    return;
  }

  const analysis = JSON.parse(row.analysis_json) as VideoAnalysis;
  const routes = getChannelRoutes(env);
  const route = findChannelRoute(routes, analysis.recommended_channel_key);

  if (!route?.channelId) {
    await interaction.reply({
      content: `No destination channel is configured for key "${analysis.recommended_channel_key}".`,
      ephemeral: true,
    });
    return;
  }

  const destination = await client.channels.fetch(route.channelId);

  if (!destination || destination.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: `Destination channel for "${route.key}" is not a text channel or could not be fetched.`,
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(analysis.title_guess || 'Video summary')
    .setURL(row.original_url)
    .setDescription(analysis.detailed_summary)
    .addFields(
      {
        name: 'Key points',
        value: analysis.key_points.length
          ? analysis.key_points.map((point) => `• ${point}`).join('\n').slice(0, 1000)
          : 'None',
      },
      {
        name: 'Topics',
        value: analysis.topics.length ? analysis.topics.join(', ') : 'None',
      },
      {
        name: 'Source',
        value: row.original_url,
      },
    )
    .setFooter({ text: 'Transcript-based summary' });

  const posted = await (destination as TextChannel).send({ embeds: [embed] });
  markPosted(jobId, route.channelId, posted.id);

  await interaction.update({
    content: `Approved and posted to <#${route.channelId}>.`,
    embeds: [],
    components: [],
  });

  logger.info(`Approved job ${jobId} and posted message ${posted.id}`);
}
