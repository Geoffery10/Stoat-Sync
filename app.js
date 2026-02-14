import { Client } from "stoat.js";
import { Client as DiscordClient, GatewayIntentBits } from 'discord.js';
import { logger } from './logger.js';

// Import the config module
import {
  DISCORD_TOKEN,
  STOAT_BOT_TOKEN,
  STOAT_BASE_URL,
  STOAT_API_URL,
  STOAT_AUTUMN_URL,
  STOAT_BOT_ID,
  DISCORD_BOT_ID,
  loadChannelMappings
} from './config.js';

import {
  stoatToDiscordMapping,
  discordToStoatMapping,
  sendMessageToDiscord,
  editMessageInDiscord,
  deleteMessageInDiscord,
  sendMessageToStoat,
  editMessageInStoat,
  deleteMessageInStoat
} from './messageHandler.js';

// Load channel mappings
const { CHANNEL_MAPPING, STOAT_TO_DISCORD_MAPPING } = await loadChannelMappings();

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
// Stoat Event Handlers
stoatClient.on("ready", async () => {
  logger.info(`Logged in as ${stoatClient.user.username}!`);
});

stoatClient.on("messageCreate", async (message) => {
  // Check if this Stoat channel should be mirrored
  const discordChannelId = STOAT_TO_DISCORD_MAPPING[message.channelId];
  if (!discordChannelId) return;

  // Check if message is from bot
  if (message.author.id == STOAT_BOT_ID) return;

  // Get the Discord channel
  const discordChannel = await discordClient.channels.fetch(discordChannelId);
  if (!discordChannel) {
    logger.error(`Could not find Discord channel with ID ${discordChannelId}`);
    return;
  }

  // Send message to Discord
  const sentMessage = await sendMessageToDiscord(message, discordChannel, STOAT_BASE_URL);
  if (sentMessage) {
    // Store the mapping (Stoat message ID -> Discord message ID)
    stoatToDiscordMapping.set(message.id, sentMessage.id);
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

  // Edit message in Discord
  await editMessageInDiscord(discordChannel, discordMessageId, oldMessage);
});

stoatClient.on("messageDelete", async (message) => {
  // Get the Discord message ID from our mapping
  const discordMessageId = stoatToDiscordMapping.get(message.id);
  if (!discordMessageId) return;

  // Get the Discord channel ID from our mapping
  const discordChannelId = STOAT_TO_DISCORD_MAPPING[message.channelId];
  if (!discordChannelId) return;

  try {
    // Get the Discord channel
    const discordChannel = await discordClient.channels.fetch(discordChannelId);
    if (!discordChannel) {
      logger.error(`Could not find Discord channel with ID ${discordChannelId}`);
      return;
    }

    // Delete message in Discord
    await deleteMessageInDiscord(discordChannel, discordMessageId, message.id);
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
        stoatClient.loginBot(STOAT_BOT_TOKEN);
    }, 5000);
});

stoatClient.on("close", (code, reason) => {
    logger.warn(`Stoat connection closed (${code}): ${reason}`);
    // Attempt to reconnect
    setTimeout(() => {
        logger.info("Attempting to reconnect to Stoat...");
        stoatClient.loginBot(STOAT_BOT_TOKEN);
    }, 5000);
});

// Discord Event Handlers
discordClient.on('ready', () => {
    logger.info(`Logged in as ${discordClient.user.tag}`);
});

discordClient.on('messageCreate', async (message) => {
    // Ignore messages from the bot itself
    if (message.author.id == DISCORD_BOT_ID) return;

    // Check if the message is in a channel we want to mirror
    const stoatChannelId = CHANNEL_MAPPING[message.channelId];
    if (!stoatChannelId) return;

    // Send message to Stoat
    const stoatMessageId = await sendMessageToStoat(message, stoatChannelId, STOAT_API_URL, STOAT_BOT_TOKEN);
    if (stoatMessageId) {
        if (!discordToStoatMapping.has(message.channelId)) {
            discordToStoatMapping.set(message.channelId, new Map());
        }
        discordToStoatMapping.get(message.channelId).set(message.id, stoatMessageId);
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

    // Edit message in Stoat
    await editMessageInStoat(stoatChannelId, stoatMessageId, newMessage, STOAT_API_URL, STOAT_BOT_TOKEN);
});

discordClient.on('messageDelete', async (message) => {
    // Check if the message is in a channel we're mirroring
    const stoatChannelId = CHANNEL_MAPPING[message.channelId];
    if (!stoatChannelId) return;

    // Check if we have a mapping for this message
    const channelMap = discordToStoatMapping.get(message.channelId);
    if (!channelMap || !channelMap.has(message.id)) return;

    const stoatMessageId = channelMap.get(message.id);

    // Delete message in Stoat
    const success = await deleteMessageInStoat(stoatChannelId, stoatMessageId, STOAT_API_URL, STOAT_BOT_TOKEN);
    if (success) {
        // Remove from our mapping
        channelMap.delete(message.id);
    }
});

// Login to both clients
await Promise.all([
  stoatClient.loginBot(STOAT_BOT_TOKEN),
  discordClient.login(DISCORD_TOKEN)
]);