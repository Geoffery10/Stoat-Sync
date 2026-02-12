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

stoatClient.on("ready", async () =>
  console.info(`Logged in as ${stoatClient.user.username}!`),
);

stoatClient.on("messageCreate", async (message) => {
  // Check if this Stoat channel should be mirrored
  const discordChannelId = STOAT_TO_DISCORD_MAPPING[message.channelId];
  if (!discordChannelId) return;

  // Get the Discord channel
  const discordChannel = await discordClient.channels.fetch(discordChannelId);
  if (!discordChannel) {
    console.error(`Could not find Discord channel with ID ${discordChannelId}`);
    return;
  }

  // Format the message
  const timestamp = Math.floor(new Date(message.createdAt).getTime() / 1000);
  const formattedContent = `**${message.author.username}**\n> ${message.content}\n:clock230: <t:${timestamp}:f>`;

  // Handle attachments - check if attachments exist and are iterable
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
    await discordChannel.send({
      content: formattedContent,
      files: attachmentFiles
    });
    console.log(`Successfully mirrored message from ${message.author.username} to Discord`);
  } catch (error) {
    console.error(`Failed to send message to Discord: ${error.message}`);
  }
});

// Login to both clients
await Promise.all([
  stoatClient.loginBot(process.env.STOAT_BOT_TOKEN),
  discordClient.login(process.env.DISCORD_TOKEN)
]);