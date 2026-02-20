import { Client } from "stoat.js";
import { Client as DiscordClient, GatewayIntentBits, REST, Routes } from 'discord.js';
import { logger } from './src/logger.js';
import * as config from './src/config.js';

// Import Stoat event handlers
import stoatMessageCreate from './src/events/stoat/messageCreate.js';
import stoatMessageUpdate from './src/events/stoat/messageUpdate.js';
import stoatMessageDelete from './src/events/stoat/messageDelete.js';

// Import Discord event handlers
import discordClientReady from './src/events/discord/clientReady.js';
import discordInteractionCreate from './src/events/discord/interactionCreate.js';
import discordMessageCreate from './src/events/discord/messageCreate.js';
import discordMessageUpdate from './src/events/discord/messageUpdate.js';
import discordMessageDelete from './src/events/discord/messageDelete.js';

// Initialize Stoat client
let stoatClient = new Client({baseURL: config.STOAT_API_URL});

// Initialize Discord client
export const discordClient = new DiscordClient({
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
stoatClient.on("messageCreate", (message) => stoatMessageCreate(message, config));
stoatClient.on("messageUpdate", (oldMessage, newMessage) => stoatMessageUpdate(oldMessage, newMessage, config));
stoatClient.on("messageDelete", (message) => stoatMessageDelete(message, config));


// Discord Event Handlers
discordClient.on('clientReady', () => discordClientReady(discordClient));
discordClient.on('interactionCreate', (interaction) => discordInteractionCreate(interaction));
discordClient.on('messageCreate', (message) => discordMessageCreate(message, config));
discordClient.on('messageUpdate', (oldMessage, newMessage) => discordMessageUpdate(oldMessage, newMessage, config));
discordClient.on('messageDelete', (message) => discordMessageDelete(message, config));


// Login to both clients
await Promise.all([
  stoatClient.loginBot(config.STOAT_BOT_TOKEN),
  discordClient.login(config.DISCORD_TOKEN)
]);