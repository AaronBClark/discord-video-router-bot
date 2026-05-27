import 'dotenv/config';
import { getEnv } from '../config/env.js';
import { describeChannelRoutes, getChannelRoutes, getRouteConfigErrors } from '../config/channels.js';

function mask(value: string, visible = 4): string {
  if (value.length <= visible) return '*'.repeat(value.length);
  return `${value.slice(0, visible)}...${value.slice(-visible)}`;
}

const env = getEnv();
const routes = getChannelRoutes(env);
const routeErrors = getRouteConfigErrors(routes);

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
console.log(`Debug logging: ${env.debugVideoRouter ? 'enabled' : 'disabled'}`);
console.log('Routes:');
console.log(describeChannelRoutes(routes));

if (!env.channelMapJson) {
  console.warn('Warning: CHANNEL_MAP_JSON is empty. Approvals will not have a usable destination unless you configure routes.');
}

if (routeErrors.length > 0) {
  console.error('\nConfig problems:');
  for (const error of routeErrors) console.error(`- ${error}`);
  process.exitCode = 1;
}
