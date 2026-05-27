import {
  Client,
  Events,
  GatewayIntentBits,
  Partials,
} from 'discord.js';
import type { Env } from '../config/env.js';
import { handleMessageCreate } from './events.js';
import { handleApprovalInteraction } from './approval-message.js';
import { logger } from '../utils/logger.js';

export function createDiscordClient(env: Env): Client {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel, Partials.Message],
  });

  client.once(Events.ClientReady, (readyClient) => {
    logger.info(`Discord bot logged in as ${readyClient.user.tag}`);
  });

  client.on(Events.MessageCreate, (message) => {
    void handleMessageCreate(env, client, message);
  });

  client.on(Events.InteractionCreate, (interaction) => {
    void handleApprovalInteraction(env, client, interaction);
  });

  return client;
}
