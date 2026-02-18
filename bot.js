import { Client } from "stoat.js";
import { Client as DiscordClient, GatewayIntentBits } from 'discord.js';
import { logger } from './src/logger.js';
import * as config from './src/config.js';
import * as messageHandler from './src/messageHandler.js';

import discordMessageCreate from './src/events/discord/messageCreate.js';
import discordMessageUpdate from './src/events/discord/messageUpdate.js';
import discordMessageDelete from './src/events/discord/messageDelete.js';

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

export function shouldMirrorChannel(channelId, isStoatChannel = false) {
  if (isStoatChannel) {
    return config.STOAT_TO_DISCORD_MAPPING[channelId] !== undefined;
  } else {
    return config.CHANNEL_MAPPING[channelId] !== undefined;
  }
}

export function isBotMessage(message, isStoatMessage = false) {
  if (isStoatMessage) {
    return message.author.id === config.STOAT_BOT_ID ||
           message.author.id === "01KH706FEP6ZVDTD0Y99W3FVEZ"; // Discord-Restore Bot
  } else {
    // Check if the message is from the bot user itself
    if (message.author.id === config.DISCORD_BOT_ID) return true;

    // Check if the message is from a webhook created by THIS bot.
    if (message.webhookId && message.applicationId === config.DISCORD_BOT_ID) return true;

    return false;
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
  const discordChannelId = config.STOAT_TO_DISCORD_MAPPING[message.channelId];
  const discordChannel = await discordClient.channels.fetch(discordChannelId);
  if (!discordChannel) {
    logger.error(`Could not find Discord channel with ID ${discordChannelId}`);
    return;
  }

  // Send message to Discord
  const sentMessage = await messageHandler.sendMessageToDiscord(message, discordChannel, config);
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
  const discordChannelId = config.STOAT_TO_DISCORD_MAPPING[oldMessage.channelId];
  const discordChannel = await discordClient.channels.fetch(discordChannelId);
  if (!discordChannel) {
    logger.error(`Could not find Discord channel with ID ${discordChannelId}`);
    return;
  }

  await messageHandler.editMessageInDiscord(discordChannel, discordMessageId, oldMessage, config);
});

stoatClient.on("messageDelete", async (message) => {
    if (!shouldMirrorChannel(message.channelId, true)) return;

    // Get the Discord message ID from our mapping
    const discordMessageId = messageHandler.stoatToDiscordMapping.get(message.id);
    if (!discordMessageId) return;

    // Get the Discord channel ID from our mapping
    const discordChannelId = config.STOAT_TO_DISCORD_MAPPING[message.channelId];

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
discordClient.on('clientReady', () => {
    logger.info(`Logged in as ${discordClient.user.tag}`);
});
discordClient.on('messageCreate', discordMessageCreate);
discordClient.on('messageUpdate', discordMessageUpdate);
discordClient.on('messageDelete', discordMessageDelete);


// Login to both clients
await Promise.all([
  stoatClient.loginBot(config.STOAT_BOT_TOKEN),
  discordClient.login(config.DISCORD_TOKEN)
]);