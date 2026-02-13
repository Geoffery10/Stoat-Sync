# Stoat Sync

![Stoat Sync Icon](/image/README/Stoat-Sync-Icon-Small.png)

**Stoat Sync** is a bidirectional bridge between Discord and Stoat chat platforms, allowing seamless communication between users on both platforms. Messages, edits, and deletions are automatically synchronized in real-time.

## Features

- **Bidirectional Messaging**: Messages sent on either platform appear on the other
- **Message Editing**: Edits to messages are synchronized between platforms
- **Message Deletion**: Deleted messages are removed from both platforms
- **Attachment Support**: Files and images are transferred between platforms
- **Channel Mapping**: Configure which channels should be synchronized
- **User Identification**: Messages show the original sender's name from their platform

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
4. Create a `channel_mapping.yaml` file to configure which channels should be synchronized:
   ```yaml
   # Discord Channel ID: Stoat Channel ID
   "discord-channel-id-1": "stoat-channel-id-1"
   "discord-channel-id-2": "stoat-channel-id-2"
   ```

## Usage

Start the synchronization:
```bash
node discord-to-stoat.js
node stoat-to-discord.js
```

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

The system consists of two main components:

1. **discord-to-stoat.js**: Listens to Discord events and forwards them to Stoat
2. **stoat-to-discord.js**: Listens to Stoat events and forwards them to Discord

Both components maintain message mappings to ensure proper synchronization of edits and deletions.

## Logging

The system uses a logger to track operations. Logs include:
- Successful message transmissions
- Errors during synchronization
- Connection status updates