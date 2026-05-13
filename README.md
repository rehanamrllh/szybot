# Discord Music Bot

An interactive Discord music bot built with `discord.js` v14 and `discord-player` v7. It supports prefix commands, queue management, shuffle, repeat, and player controls like the ones shown in the screenshot.

## Features

- Play songs from a title, URL, or search query
- Prefix commands for `play`, `add`, `queue`, `shuffle`, `skip`, `stop`, and `help`
- Queue view that shows the current track and upcoming songs
- Now Playing embed with control buttons:
  - previous
  - pause / resume
  - next
  - repeat
- Loop status displayed directly in the player embed

## Requirements

- Node.js 18+ recommended
- A Discord bot with the following intents enabled:
  - `Guilds`
  - `GuildMessages`
  - `MessageContent`
  - `GuildVoiceStates`
- FFmpeg provided through the `ffmpeg-static` dependency

## Installation

```bash
npm install
```

## Configuration

Set the bot token through an environment variable:

```bash
set DISCORD_TOKEN=your_bot_token
```

Or for PowerShell:

```powershell
$env:DISCORD_TOKEN="your_bot_token"
```

You can change the prefix in [config.json](config.json).

## Running the Bot

```bash
node index.js
```

## Commands

### Prefix Commands

- `.play <query>` or `.add <query>` — play a song or add it to the queue
- `.queue` — show the queue list
- `.shuffle` — shuffle the queue
- `.skip` — skip the current song
- `.stop` — stop the player and clear the queue
- `.help` — show help

### Slash Commands

- `/play`
- `/queue`
- `/shuffle`
- `/skip`
- `/stop`
- `/help`

## Player Controls

When a song starts playing, the bot sends a **Now Playing** embed with these buttons:

- ⏮️ previous
- ⏸️ pause
- ▶️ resume
- ⏭️ next
- 🔁 repeat

## Notes

- Do not commit your bot token to GitHub.
- If you want to keep local settings, use a local file that is not committed or an environment variable.
