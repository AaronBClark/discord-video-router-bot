import 'dotenv/config';
import { createServer } from 'node:http';
import { getEnv } from './config/env.js';
import { initDatabase } from './db/db.js';
import { createDiscordClient } from './discord/client.js';
import { logger } from './utils/logger.js';

async function main() {
  const env = getEnv();

  initDatabase(env.databasePath);

  const server = createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'video-router-bot' }));
      return;
    }

    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('video-router-bot online');
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
