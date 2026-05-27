import 'dotenv/config';
import { getEnv } from '../config/env.js';
import { getChannelRoutes } from '../config/channels.js';

function mask(value: string, visible = 4): string {
  if (value.length <= visible) return '*'.repeat(value.length);
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

const env = getEnv();
const routes = getChannelRoutes(env);

console.log('Config loaded successfully.');
console.log(`Discord token: ${mask(env.discordToken)}`);
console.log(`Approval channel: ${env.approvalChannelId}`);
console.log(
  `Source channels: ${env.sourceChannelIds.size > 0 ? [...env.sourceChannelIds].join(', ') : 'all readable channels'}`,
);
console.log(`Gemini model: ${env.geminiModel}`);
console.log(`Gemini key: ${mask(env.geminiApiKey)}`);
console.log(`Database path: ${env.databasePath}`);
console.log(`Port: ${env.port}`);
console.log('Routes:');
for (const route of routes) {
  console.log(`- ${route.key} -> ${route.channelId || '(missing channel id)'} :: ${route.description}`);
}

if (routes.some((route) => !route.channelId)) {
  console.warn('Warning: at least one route is missing a destination channel id. Approvals cannot post there.');
}
