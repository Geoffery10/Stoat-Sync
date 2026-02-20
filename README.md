# Stoat Sync
[![Tests](https://img.shields.io/github/actions/workflow/status/Geoffery10/Stoat-Sync/tests.yml?label=tests)](https://github.com/Geoffery10/Stoat-Sync/actions/workflows/tests.yml) [![Coveralls](https://img.shields.io/coverallsCoverage/github/Geoffery10/Stoat-Sync)](https://coveralls.io/github/Geoffery10/Stoat-Sync?branch=main)

![Stoat Sync Icon](/image/README/Stoat-Sync-Icon-Small.png)

**Stoat Sync** is a bidirectional bridge between Discord and Stoat chat platforms, allowing seamless communication between users on both platforms. Messages, edits, and deletions are automatically synchronized in real-time.

## Features

- **Bidirectional Messaging**: Messages sent on either platform appear on the other
- **Message Editing**: Edits to messages are synchronized between platforms
- **Message Deletion**: Deleted messages are removed from both platforms
- **Attachment Support**: Files and images are transferred between platforms
- **Channel Mapping**: Configure which channels should be synchronized
- **User Identification**: Messages show the original sender's name and profile picture from their platform
- **Slash Commands**: Manage channel synchronization directly from Discord

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your credentials:
   ```
   DISCORD_TOKEN=your_discord_bot_token
   DISCORD_BOT_ID=your_discord_bot_id
   STOAT_BOT_TOKEN=your_stoat_bot_token
   STOAT_BOT_ID=your_stoat_bot_id
   STOAT_BASE_URL=https://your-stoat-instance.com
   ```

## Usage

Start the synchronization:
```bash
node bot.js
```

### Discord Commands

Once the bot is running, you can use these slash commands in Discord:

- `/is-synced` - Checks if the current channel is synced with a Stoat channel
- `/sync-channel <stoatid>` - Syncs the current Discord channel with a Stoat channel (Admin only)
- `/unsync-channel` - Removes the sync between the current Discord channel and its Stoat channel (Admin only)

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DISCORD_TOKEN` | Your Discord bot token |
| `DISCORD_BOT_ID` | Your Discord bot's user ID |
| `STOAT_BOT_TOKEN` | Your Stoat bot token |
| `STOAT_BOT_ID` | Your Stoat bot's user ID |
| `STOAT_BASE_URL` | Base URL of your Stoat instance |

## Architecture

The system uses a single unified application (`bot.js`) that handles bidirectional synchronization between Discord and Stoat. This simplified architecture:

1. Maintains a single connection to both platforms
2. Handles all event types (messages, edits, deletions) in both directions
3. Manages message mappings for proper synchronization

## Notes

- The application must be run with Node.js 18 or higher due to its use of ES modules
- Both bot accounts need appropriate permissions in their respective platforms