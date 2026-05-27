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
import { describeChannelRoutes, findChannelRoute, getChannelRoutes } from '../config/channels.js';
import type { VideoAnalysis } from '../ai/schemas.js';
import { getJob, markPosted, updateJobStatus } from '../db/jobs.js';
import { getDb } from '../db/db.js';
import { parseYouTubeUrl } from '../links/youtube.js';
import { logger } from '../utils/logger.js';

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1))}…`;
}

function getYouTubeThumbnailUrl(videoUrl: string): string | null {
  const parsed = parseYouTubeUrl(videoUrl);
  return parsed ? `https://i.ytimg.com/vi/${parsed.videoId}/hqdefault.jpg` : null;
}

export function buildApprovalEmbed(jobId: number, videoUrl: string, analysis: VideoAnalysis): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(truncate(analysis.title_guess || 'Video ready for review', 256))
    .setURL(videoUrl)
    .setDescription(truncate(analysis.short_summary, 4096))
    .addFields(
      {
        name: 'Recommended channel',
        value: `${analysis.recommended_channel_key} (${Math.round(analysis.confidence * 100)}% confidence)`,
        inline: true,
      },
      {
        name: 'Topics',
        value: analysis.topics.length ? truncate(analysis.topics.join(', '), 1024) : 'None',
        inline: true,
      },
      {
        name: 'Reason',
        value: truncate(analysis.reason || 'No reason provided.', 1024),
      },
      {
        name: 'Key points',
        value: analysis.key_points.length
          ? truncate(analysis.key_points.map((point) => `• ${point}`).join('\n'), 1024)
          : 'None',
      },
    )
    .setFooter({ text: `Job ${jobId} • Transcript-based summary` });

  const thumbnail = getYouTubeThumbnailUrl(videoUrl);
  if (thumbnail) embed.setThumbnail(thumbnail);

  return embed;
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
    logger.warn(`Approval failed because no destination route was available for job ${jobId}.`, {
      requestedKey: analysis.recommended_channel_key,
      routes: describeChannelRoutes(routes),
    });

    await interaction.reply({
      content: [
        `No destination channel is configured for key "${analysis.recommended_channel_key}".`,
        '',
        'Loaded routes:',
        describeChannelRoutes(routes),
        '',
        'Run `npm run check:config`, fix `CHANNEL_MAP_JSON`, then restart the bot.',
      ].join('\n'),
      ephemeral: true,
    });
    return;
  }

  let destination;
  try {
    destination = await client.channels.fetch(route.channelId);
  } catch (error) {
    logger.error(`Could not fetch destination channel ${route.channelId} for job ${jobId}.`, error);
    await interaction.reply({
      content: `Could not fetch destination channel <#${route.channelId}> for key "${route.key}". Check bot permissions and the channel ID.`,
      ephemeral: true,
    });
    return;
  }

  if (!destination || destination.type !== ChannelType.GuildText) {
    await interaction.reply({
      content: `Destination channel for "${route.key}" is not a normal text channel or could not be fetched: <#${route.channelId}>.`,
      ephemeral: true,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(truncate(analysis.title_guess || 'Video summary', 256))
    .setURL(row.original_url)
    .setDescription(truncate(analysis.short_summary || analysis.detailed_summary, 4096))
    .addFields(
      {
        name: 'Key points',
        value: analysis.key_points.length
          ? truncate(analysis.key_points.map((point) => `• ${point}`).join('\n'), 1024)
          : 'None',
      },
      {
        name: 'Detailed summary',
        value: truncate(analysis.detailed_summary || 'None', 1024),
      },
      {
        name: 'Topics',
        value: analysis.topics.length ? truncate(analysis.topics.join(', '), 1024) : 'None',
      },
      {
        name: 'Source',
        value: row.original_url,
      },
    )
    .setFooter({ text: 'Transcript-based summary' });

  const thumbnail = getYouTubeThumbnailUrl(row.original_url);
  if (thumbnail) embed.setThumbnail(thumbnail);

  const posted = await (destination as TextChannel).send({ embeds: [embed] });
  markPosted(jobId, route.channelId, posted.id);

  await interaction.update({
    content: `Approved and posted to <#${route.channelId}>.`,
    embeds: [],
    components: [],
  });

  logger.info(`Approved job ${jobId} and posted message ${posted.id}`);
}
