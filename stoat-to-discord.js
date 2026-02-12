import { Client } from "stoat.js";
import dotenv from 'dotenv';
import { config } from 'dotenv';
import { Client as DiscordClient, GatewayIntentBits } from 'discord.js';
import fs from 'fs/promises';
import yaml from 'js-yaml';

// Load environment variables
config();

// Initialize Stoat client
let api = process.env.STOAT_BASE_URL + "/api"
let stoatClient = new Client({baseURL: api});

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
const messageMapping = new Map();

stoatClient.on("ready", async () =>
  console.info(`Logged in as ${stoatClient.user.username}!`),
);

stoatClient.on("messageCreate", async (message) => {
  // Check if this Stoat channel should be mirrored
  const discordChannelId = STOAT_TO_DISCORD_MAPPING[message.channelId];
  if (!discordChannelId) return;

  // Check if message is from bot
  if (message.author.id == "01KH9H5Z2PCBD8CFXJ9TTKF8DF") return;

  // Get the Discord channel
  const discordChannel = await discordClient.channels.fetch(discordChannelId);
  if (!discordChannel) {
    console.error(`Could not find Discord channel with ID ${discordChannelId}`);
    return;
  }

  // Format the message
  const formattedContent = `**${message.author.username}**\n ${message.content}`;

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
        console.error(`Error downloading attachment ${attachment.name}: ${error.message}`);
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
    messageMapping.set(message.id, sentMessage.id);

    console.log(`Successfully mirrored message from ${message.author.username} to Discord (Stoat ID: ${message.id} -> Discord ID: ${sentMessage.id})`);
  } catch (error) {
    console.error(`Failed to send message to Discord: ${error.message}`);
  }
});

// Handle message updates
stoatClient.on("messageUpdate", async (oldMessage, newMessage) => {
  // Check if this Stoat channel should be mirrored
  const discordChannelId = STOAT_TO_DISCORD_MAPPING[newMessage.channelId];
  if (!discordChannelId) return;

  // Get the Discord message ID from our mapping
  const discordMessageId = messageMapping.get(newMessage.id);
  if (!discordMessageId) return;

  // Get the Discord channel
  const discordChannel = await discordClient.channels.fetch(discordChannelId);
  if (!discordChannel) {
    console.error(`Could not find Discord channel with ID ${discordChannelId}`);
    return;
  }

  // Format the updated message
  const authorName = oldMessage.author?.username || "Unknown User";
  const formattedContent = `**${authorName}**\n ${oldMessage.content}`;

  try {
    // Get the Discord message and edit it
    const discordMessage = await discordChannel.messages.fetch(discordMessageId);
    await discordMessage.edit(formattedContent);
    console.log(`Successfully updated message in Discord (Stoat ID: ${newMessage.id} -> Discord ID: ${discordMessageId})`);
  } catch (error) {
    console.error(`Failed to update message in Discord: ${error.message}`);
  }
});

// Handle message deletions
stoatClient.on("messageDelete", async (message) => {
  // Get the Discord message ID from our mapping
  const discordMessageId = messageMapping.get(message.id);
  if (!discordMessageId) return;

  // Get the Discord channel ID from our mapping
  const discordChannelId = STOAT_TO_DISCORD_MAPPING[message.channelId];
  if (!discordChannelId) return;

  try {
    // Get the Discord channel and delete the message
    const discordChannel = await discordClient.channels.fetch(discordChannelId);
    const discordMessage = await discordChannel.messages.fetch(discordMessageId);
    await discordMessage.delete();
    console.log(`Successfully deleted message in Discord (Stoat ID: ${message.id} -> Discord ID: ${discordMessageId})`);

    // Remove from our mapping
    messageMapping.delete(message.id);
  } catch (error) {
    console.error(`Failed to delete message in Discord: ${error.message}`);
  }
});

// Login to both clients
await Promise.all([
  stoatClient.loginBot(process.env.STOAT_BOT_TOKEN),
  discordClient.login(process.env.DISCORD_TOKEN)
]);