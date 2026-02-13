import { Client } from "stoat.js";
import { config } from 'dotenv';
import { Client as DiscordClient, GatewayIntentBits } from 'discord.js';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs/promises';
import yaml from 'js-yaml';
import { formatMessageForDiscord } from './messageFormatter.js';
import { formatMessageForStoat } from './messageFormatter.js';
import { logger } from './logger.js';
import path from 'path';

// Load environment variables
config();

// Configuration
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const STOAT_BOT_TOKEN = process.env.STOAT_BOT_TOKEN;
const STOAT_BASE_URL = process.env.STOAT_BASE_URL;
const STOAT_API_URL = `${STOAT_BASE_URL}/api`;
const STOAT_AUTUMN_URL = `${STOAT_BASE_URL}/autumn`;

// Initialize Stoat client
let stoatClient = new Client({baseURL: STOAT_API_URL});

// Initialize Discord client
const discordClient = new DiscordClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// Load channel mappings
const fileContents = await fs.readFile('channel_mapping.yaml', 'utf8');
const CHANNEL_MAPPING = yaml.load(fileContents);

// Reverse the mapping for Stoat -> Discord
const STOAT_TO_DISCORD_MAPPING = {};
for (const [discordId, stoatId] of Object.entries(CHANNEL_MAPPING)) {
  STOAT_TO_DISCORD_MAPPING[stoatId] = discordId;
}

// Message mapping storage (Stoat message ID -> Discord message ID)
const stoatToDiscordMapping = new Map();
// Message mapping storage (Discord channel ID -> Map of Discord message ID -> Stoat message ID)
const discordToStoatMapping = new Map();

async function uploadAttachmentToStoat(filePath) {
    try {
        if (!await fs.access(filePath).then(() => true).catch(() => false)) {
            logger.log(`[!] Attachment not found locally: ${filePath}`);
            return null;
        }

        const form = new FormData();
        form.append('file', await fs.readFile(filePath), {
            filename: path.basename(filePath),
            contentType: 'application/octet-stream'
        });

        const response = await axios.post(`${STOAT_AUTUMN_URL}/attachments`, form, {
            headers: {
                ...form.getHeaders(),
                'x-bot-token': STOAT_BOT_TOKEN
            }
        });

        return response.data?.id || null;
    } catch (error) {
        logger.error(`[!] Error uploading file: ${error.message}`);
        return null;
    }
}

// Stoat Event Handlers
stoatClient.on("ready", async () => {
  logger.info(`Logged in as ${stoatClient.user.username}!`);
});

stoatClient.on("messageCreate", async (message) => {
  // Check if this Stoat channel should be mirrored
  const discordChannelId = STOAT_TO_DISCORD_MAPPING[message.channelId];
  if (!discordChannelId) return;

  // Check if message is from bot
  if (message.author.id == process.env.STOAT_BOT_ID) return;

  // Get the Discord channel
  const discordChannel = await discordClient.channels.fetch(discordChannelId);
  if (!discordChannel) {
    logger.error(`Could not find Discord channel with ID ${discordChannelId}`);
    return;
  }

  // Format the message
  const formattedContent = await formatMessageForDiscord(message);

  // Handle attachments
  const attachmentFiles = [];
  if (message.attachments && typeof message.attachments === 'object') {
    const attachments = Array.isArray(message.attachments) ? message.attachments : [message.attachments];
    for (const attachment of attachments) {
      try {
        const response = await fetch(`${process.env.STOAT_BASE_URL}/autumn/attachments/${attachment.id}`);
        const buffer = await response.arrayBuffer();
        attachmentFiles.push({
          attachment: Buffer.from(buffer),
          name: attachment.name
        });
      } catch (error) {
        logger.error(`Error downloading attachment ${attachment.name}: ${error.message}`);
      }
    }
  }

  // Send the message to Discord
  try {
    const sentMessage = await discordChannel.send({
      content: formattedContent,
      files: attachmentFiles
    });

    // Store the mapping (Stoat message ID -> Discord message ID)
    stoatToDiscordMapping.set(message.id, sentMessage.id);

    logger.info(`Successfully mirrored message from ${message.author.username} to Discord (Stoat ID: ${message.id} -> Discord ID: ${sentMessage.id})`);
  } catch (error) {
    logger.error(`Failed to send message to Discord: ${error.message}`);
  }
});

stoatClient.on("messageUpdate", async (oldMessage, newMessage) => {
  // Check if this Stoat channel should be mirrored
  const discordChannelId = STOAT_TO_DISCORD_MAPPING[newMessage.channelId];
  if (!discordChannelId) return;

  // Get the Discord message ID from our mapping
  const discordMessageId = stoatToDiscordMapping.get(newMessage.id);
  if (!discordMessageId) return;

  // Get the Discord channel
  const discordChannel = await discordClient.channels.fetch(discordChannelId);
  if (!discordChannel) {
    logger.error(`Could not find Discord channel with ID ${discordChannelId}`);
    return;
  }

  // Format the updated message
  const formattedContent = await formatMessageForDiscord(oldMessage);

  try {
    // Get the Discord message and edit it
    const discordMessage = await discordChannel.messages.fetch(discordMessageId);
    await discordMessage.edit(formattedContent);
    logger.info(`Successfully updated message in Discord (Stoat ID: ${newMessage.id} -> Discord ID: ${discordMessageId})`);
  } catch (error) {
    logger.error(`Failed to update message in Discord: ${error.message}`);
  }
});

stoatClient.on("messageDelete", async (message) => {
  // Get the Discord message ID from our mapping
  const discordMessageId = stoatToDiscordMapping.get(message.id);
  if (!discordMessageId) return;

  // Get the Discord channel ID from our mapping
  const discordChannelId = STOAT_TO_DISCORD_MAPPING[message.channelId];
  if (!discordChannelId) return;

  try {
    // Get the Discord channel and delete the message
    const discordChannel = await discordClient.channels.fetch(discordChannelId);
    const discordMessage = await discordChannel.messages.fetch(discordMessageId);
    await discordMessage.delete();
    logger.info(`Successfully deleted message in Discord (Stoat ID: ${message.id} -> Discord ID: ${discordMessageId})`);

    // Remove from our mapping
    stoatToDiscordMapping.delete(message.id);
  } catch (error) {
    logger.error(`Failed to delete message in Discord: ${error.message}`);
  }
});

stoatClient.on("error", (error) => {
    logger.error("Stoat error details:", {
        message: error.message,
        stack: error.stack,
        context: error.context
    });
    // Attempt to reconnect after a delay
    setTimeout(() => {
        logger.info("Attempting to reconnect to Stoat...");
        stoatClient.loginBot(process.env.STOAT_BOT_TOKEN);
    }, 5000);
});

stoatClient.on("close", (code, reason) => {
    logger.warn(`Stoat connection closed (${code}): ${reason}`);
    // Attempt to reconnect
    setTimeout(() => {
        logger.info("Attempting to reconnect to Stoat...");
        stoatClient.loginBot(process.env.STOAT_BOT_TOKEN);
    }, 5000);
});

// Discord Event Handlers
discordClient.on('ready', () => {
    logger.info(`Logged in as ${discordClient.user.tag}`);
});

discordClient.on('messageCreate', async (message) => {
    // Ignore messages from the bot itself
    if (message.author.id == process.env.DISCORD_BOT_ID) return;

    // Check if the message is in a channel we want to mirror
    const stoatChannelId = CHANNEL_MAPPING[message.channelId];
    if (!stoatChannelId) return;

    // Format the message
    const formattedContent = await formatMessageForStoat(message);

    // Handle attachments
    const attachmentIds = [];
    for (const attachment of message.attachments.values()) {
        const filePath = `temp_${attachment.id}_${attachment.name}`;
        try {
            // Download the attachment
            const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
            await fs.writeFile(filePath, response.data);

            // Upload to Stoat
            const uploadedId = await uploadAttachmentToStoat(filePath);
            if (uploadedId) {
                attachmentIds.push(uploadedId);
            }

            // Clean up
            await fs.unlink(filePath);
        } catch (error) {
            logger.error(`[!] Error uploading file: ${error.message} (File): ${attachment.name}`);
            if (await fs.access(filePath).then(() => true).catch(() => false)) {
                await fs.unlink(filePath);
            }
        }
    }

    // Prepare payload
    const payload = {
        content: formattedContent,
        attachments: attachmentIds
    };

    // Send to Stoat
    try {
        const response = await axios.post(
            `${STOAT_API_URL}/channels/${stoatChannelId}/messages`,
            payload,
            {
                headers: {
                    'x-bot-token': STOAT_BOT_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );

        const stoatMessageId = response.data?._id;
        if (stoatMessageId) {
            if (!discordToStoatMapping.has(message.channelId)) {
                discordToStoatMapping.set(message.channelId, new Map());
            }
            discordToStoatMapping.get(message.channelId).set(message.id, stoatMessageId);
            logger.info(`Successfully sent message from ${message.author.username} to Stoat (ID: ${stoatMessageId})`);
        } else {
            logger.warn("No message ID returned from Stoat API");
        }
    } catch (error) {
        logger.error(`Failed to send message: ${error.response?.status || 'Unknown'} - ${error.message}`);
    }
});

discordClient.on('messageUpdate', async (oldMessage, newMessage) => {
    // Ignore if the message is from the bot itself
    if (newMessage.author.bot) return;

    // Check if the message is in a channel we're mirroring
    const stoatChannelId = CHANNEL_MAPPING[newMessage.channelId];
    if (!stoatChannelId) return;

    // Check if we have a mapping for this message
    const channelMap = discordToStoatMapping.get(newMessage.channelId);
    if (!channelMap || !channelMap.has(newMessage.id)) return;

    const stoatMessageId = channelMap.get(newMessage.id);

    // Format the edited message
    const formattedContent = await formatMessageForStoat(newMessage);

    // Prepare payload
    const payload = {
        content: formattedContent
    };

    // Send the edit to Stoat
    try {
        await axios.patch(
            `${STOAT_API_URL}/channels/${stoatChannelId}/messages/${stoatMessageId}`,
            payload,
            {
                headers: {
                    'x-bot-token': STOAT_BOT_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        logger.info(`Successfully edited message in Stoat (ID: ${stoatMessageId})`);
    } catch (error) {
        logger.error(`Failed to edit message: ${error.response?.status || 'Unknown'} - ${error.message}`);
    }
});

discordClient.on('messageDelete', async (message) => {
    // Check if the message is in a channel we're mirroring
    const stoatChannelId = CHANNEL_MAPPING[message.channelId];
    if (!stoatChannelId) return;

    // Check if we have a mapping for this message
    const channelMap = discordToStoatMapping.get(message.channelId);
    if (!channelMap || !channelMap.has(message.id)) return;

    const stoatMessageId = channelMap.get(message.id);

    // Delete the message in Stoat
    try {
        await axios.delete(
            `${STOAT_API_URL}/channels/${stoatChannelId}/messages/${stoatMessageId}`,
            {
                headers: {
                    'x-bot-token': STOAT_BOT_TOKEN
                }
            }
        );
        logger.log(`Successfully deleted message in Stoat (ID: ${stoatMessageId})`);

        // Remove from our mapping
        channelMap.delete(message.id);
    } catch (error) {
        logger.error(`Failed to delete message: ${error.response?.status || 'Unknown'} - ${error.message}`);
    }
});

// Login to both clients
await Promise.all([
  stoatClient.loginBot(STOAT_BOT_TOKEN),
  discordClient.login(DISCORD_TOKEN)
]);