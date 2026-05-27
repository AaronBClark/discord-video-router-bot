# Video Router Bot Starter

A TypeScript Discord bot that detects YouTube links, retrieves transcript text without downloading video/audio, asks Gemini for a structured summary/classification, caches the result, and posts an approval card before reposting.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Fill in `.env` first.

## Discord setup

Enable these bot intents in the Discord Developer Portal:

- Server Members Intent is not needed for this MVP.
- Message Content Intent is needed so the bot can read posted links.
- Guilds and Guild Messages are used by discord.js.

Invite the bot with permissions to:

- Read Messages/View Channels
- Send Messages
- Embed Links
- Use External Emojis is optional
- Read Message History

## Railway setup

1. Push this repo to GitHub.
2. Create a Railway project from the repo.
3. Add the environment variables from `.env.example`.
4. Add a Railway Volume.
5. Mount the volume to something like `/data`.
6. Leave `DATABASE_PATH` blank, or set it to `/data/video-router.sqlite`.
7. Deploy.

The app starts a small HTTP health server on `PORT`, but the main workload is the Discord gateway client.

## MVP flow

1. A user posts a YouTube link in an allowed source channel.
2. The bot detects the link.
3. The bot checks SQLite cache.
4. The bot fetches transcript text using an unofficial YouTube transcript package.
5. The bot sends transcript text to Gemini with a JSON schema.
6. The bot posts an approval embed.
7. An admin clicks Approve.
8. The bot reposts the summary to the recommended destination channel.

## Notes

This starter intentionally avoids audio/video download. If YouTube captions are unavailable, the job fails cleanly with `no_transcript`.
