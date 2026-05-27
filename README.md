# Video Router Bot

A TypeScript Discord bot that detects YouTube links, retrieves transcript text without downloading video/audio, asks Gemini for a structured summary/classification, caches the result, and posts an approval card before reposting.

## Local setup

```bash
npm install
cp .env.example .env
npm run check:config
npm run dev
```

On Windows PowerShell, use this instead of `cp`:

```powershell
copy .env.example .env
```

Fill in `.env` before running the bot. Never commit `.env`.

## Required environment variables

```env
DISCORD_TOKEN=
APPROVAL_CHANNEL_ID=
SOURCE_CHANNEL_IDS=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
DATABASE_PATH=
PORT=3000
CHANNEL_MAP_JSON=[]
```

`CHANNEL_MAP_JSON` must be a one-line JSON array, not an object. Example:

```env
CHANNEL_MAP_JSON=[{"key":"ai","channelId":"123","description":"AI tools, models, agents, automation"},{"key":"uncategorized","channelId":"456","description":"Fallback when no category clearly fits"}]
```

## Useful scripts

```bash
npm run check          # TypeScript check
npm run build          # Compile to dist/
npm run dev            # Local watch mode
npm start              # Run compiled dist/index.js
npm run check:config   # Validate local env/config without logging into Discord
npm run test:gemini    # Test Gemini JSON output without running the Discord bot
```

## Discord setup

Enable these bot intents in the Discord Developer Portal:

- Message Content Intent, so the bot can read posted links.
- Guilds and Guild Messages are used by discord.js.
- Server Members Intent is not needed for this MVP.

Invite the bot with permissions to:

- View Channels
- Send Messages
- Embed Links
- Read Message History

## Railway setup

1. Push this repo to GitHub.
2. Create a Railway project from the repo.
3. Add the environment variables from `.env.example` in the Railway Variables tab.
4. Add a Railway Volume.
5. Mount the volume to `/data`.
6. Set `DATABASE_PATH=/data/video-router.sqlite`.
7. Deploy.

The app starts a small HTTP health server on `PORT`, but the main workload is the Discord gateway client.

## MVP flow

1. A user posts a YouTube link in an allowed source channel.
2. The bot detects the link.
3. The bot checks SQLite cache.
4. The bot fetches transcript text using an unofficial YouTube transcript package.
5. The bot sends transcript text to Gemini with a JSON schema.
6. The bot posts an approval embed.
7. Someone clicks Approve.
8. The bot reposts the summary to the recommended destination channel.

## Notes

This starter intentionally avoids audio/video download. If YouTube captions are unavailable, the job fails cleanly with `no_transcript`.

The transcript provider uses unofficial YouTube transcript access, so it is wrapped behind `resolveTranscript` and can be replaced or given fallbacks later.
