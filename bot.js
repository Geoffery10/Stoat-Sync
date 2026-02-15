import { Client } from "stoat.js";
import { Client as DiscordClient, GatewayIntentBits } from 'discord.js';
import { logger } from './logger.js';
import * as config from './config.js';
import * as messageHandler from './messageHandler.js';

// Load channel mappings
const { CHANNEL_MAPPING, STOAT_TO_DISCORD_MAPPING } = await config.loadChannelMappings();

// Initialize Stoat client
let stoatClient = new Client({baseURL: config.STOAT_API_URL});

// Initialize Discord client
const discordClient = new DiscordClient({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

function shouldMirrorChannel(channelId, isStoatChannel = false) {
  if (isStoatChannel) {
    return STOAT_TO_DISCORD_MAPPING[channelId] !== undefined;
  } else {
    return CHANNEL_MAPPING[channelId] !== undefined;
  }
}

function isBotMessage(message, isStoatMessage = false) {
  if (isStoatMessage) {
    return message.author.id === config.STOAT_BOT_ID ||
           message.author.id === "01KH706FEP6ZVDTD0Y99W3FVEZ"; // Discord-Restore Bot
  } else {
    return message.author.id === config.DISCORD_BOT_ID || message.author.bot;
  }
}


// Stoat Event Handlers
stoatClient.on("ready", async () => {
  logger.info(`Logged in as ${stoatClient.user.username}!`);
});

stoatClient.on("messageCreate", async (message) => {
  if (!shouldMirrorChannel(message.channelId, true)) return;
  if (isBotMessage(message, true)) return;
  if (message.author.id == "01KH706FEP6ZVDTD0Y99W3FVEZ") return; // Ignore Discord-Restore Bot

  // Get the Discord channel
  const discordChannelId = STOAT_TO_DISCORD_MAPPING[message.channelId];
  const discordChannel = await discordClient.channels.fetch(discordChannelId);
  if (!discordChannel) {
    logger.error(`Could not find Discord channel with ID ${discordChannelId}`);
    return;
  }

  // Send message to Discord
  const sentMessage = await messageHandler.sendMessageToDiscord(message, discordChannel, config.STOAT_BASE_URL);
  if (sentMessage) {
    // Store the mapping (Stoat message ID -> Discord message ID)
    messageHandler.stoatToDiscordMapping.set(message.id, sentMessage.id);
  }
});

stoatClient.on("messageUpdate", async (oldMessage, newMessage) => {
  if (!shouldMirrorChannel(oldMessage.channelId, true)) return;

  // Get the Discord message ID from our mapping
  const discordMessageId = messageHandler.stoatToDiscordMapping.get(newMessage.id);
  if (!discordMessageId) return;

  // Get the Discord channel
  const discordChannelId = STOAT_TO_DISCORD_MAPPING[oldMessage.channelId];
  const discordChannel = await discordClient.channels.fetch(discordChannelId);
  if (!discordChannel) {
    logger.error(`Could not find Discord channel with ID ${discordChannelId}`);
    return;
  }

  await messageHandler.editMessageInDiscord(discordChannel, discordMessageId, oldMessage);
});

stoatClient.on("messageDelete", async (message) => {
    if (!shouldMirrorChannel(message.channelId, true)) return;

    // Get the Discord message ID from our mapping
    const discordMessageId = messageHandler.stoatToDiscordMapping.get(message.id);
    if (!discordMessageId) return;

    // Get the Discord channel ID from our mapping
    const discordChannelId = STOAT_TO_DISCORD_MAPPING[message.channelId];

  try {
    // Get the Discord channel
    const discordChannel = await discordClient.channels.fetch(discordChannelId);
    if (!discordChannel) {
      logger.error(`Could not find Discord channel with ID ${discordChannelId}`);
      return;
    }

    await messageHandler.deleteMessageInDiscord(discordChannel, discordMessageId, message.id);
  } catch (error) {
    logger.error(`Failed to delete message in Discord: ${error.message}`);
  }
});


// Discord Event Handlers
discordClient.on('ready', () => {
    logger.info(`Logged in as ${discordClient.user.tag}`);
});

discordClient.on('messageCreate', async (message) => {
    if (!shouldMirrorChannel(message.channelId, false)) return;
    if (isBotMessage(message, false)) return;


    // Send message to Stoat
    const stoatChannelId = CHANNEL_MAPPING[message.channelId];
    const stoatMessageId = await messageHandler.sendMessageToStoat(message, stoatChannelId, config.STOAT_API_URL, config.STOAT_BOT_TOKEN, config.STOAT_AUTUMN_URL, config.STOAT_BASE_URL);
    if (stoatMessageId) {
        if (!messageHandler.discordToStoatMapping.has(message.channelId)) {
            messageHandler.discordToStoatMapping.set(message.channelId, new Map());
        }
        messageHandler.discordToStoatMapping.get(message.channelId).set(message.id, stoatMessageId);
    }
});

discordClient.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!shouldMirrorChannel(newMessage.channelId, false)) return;
    if (isBotMessage(newMessage, false)) return;


    // Check if we have a mapping for this message
    const stoatChannelId = CHANNEL_MAPPING[newMessage.channelId];
    const channelMap = messageHandler.discordToStoatMapping.get(newMessage.channelId);
    if (!channelMap || !channelMap.has(newMessage.id)) return;

    const stoatMessageId = channelMap.get(newMessage.id);

    await messageHandler.editMessageInStoat(stoatChannelId, stoatMessageId, newMessage, config.STOAT_API_URL, config.STOAT_BOT_TOKEN);
});

discordClient.on('messageDelete', async (message) => {
    if (!shouldMirrorChannel(message.channelId, false)) return;

    // Check if we have a mapping for this message
    const channelMap = messageHandler.discordToStoatMapping.get(message.channelId);
    if (!channelMap || !channelMap.has(message.id)) return;

    const stoatMessageId = channelMap.get(message.id);
    const stoatChannelId = CHANNEL_MAPPING[message.channelId];

    const success = await messageHandler.deleteMessageInStoat(stoatChannelId, stoatMessageId, config.STOAT_API_URL, config.STOAT_BOT_TOKEN);
    if (success) {
        // Remove from our mapping
        channelMap.delete(message.id);
    }
});


// Login to both clients
await Promise.all([
  stoatClient.loginBot(config.STOAT_BOT_TOKEN),
  discordClient.login(config.DISCORD_TOKEN)
]);