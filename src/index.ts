import 'dotenv/config';
import { createServer } from 'node:http';
import { getEnv } from './config/env.js';
import { describeChannelRoutes, getChannelRoutes, getRouteConfigErrors } from './config/channels.js';
import { initDatabase } from './db/db.js';
import { createDiscordClient } from './discord/client.js';
import { logger } from './utils/logger.js';

async function main() {
  const env = getEnv();
  const routes = getChannelRoutes(env);
  const routeErrors = getRouteConfigErrors(routes);

  initDatabase(env.databasePath);

  logger.info(`Approval channel: ${env.approvalChannelId}`);
  logger.info(
    `Source channels: ${env.sourceChannelIds.size > 0 ? [...env.sourceChannelIds].join(', ') : 'all readable channels'}`,
  );
  logger.info(`Destination routes:\n${describeChannelRoutes(routes)}`);
  if (routeErrors.length > 0) logger.warn('Destination route config warnings', routeErrors);
  if (env.debugVideoRouter) logger.info('Debug logging is enabled.');

  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'video-router-bot' }));
      return;
    }

    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('video-router-bot online');
  });

  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${env.port} is already in use. Set PORT=3001 locally or stop the other process.`);
      process.exit(1);
    }

    logger.error('Health server error', error);
    process.exit(1);
  });

  server.listen(env.port, '0.0.0.0', () => {
    logger.info(`Health server listening on 0.0.0.0:${env.port}`);
  });

  const client = createDiscordClient(env);
  await client.login(env.discordToken);

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received. Shutting down.');
    client.destroy();
    server.close(() => process.exit(0));
  });
}

main().catch((error) => {
  logger.error('Fatal startup error', error);
  process.exit(1);
});
