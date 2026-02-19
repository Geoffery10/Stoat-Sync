import { Client } from "stoat.js";
import { Client as DiscordClient, GatewayIntentBits, REST, Routes } from 'discord.js';
import { logger } from './src/logger.js';
import * as config from './src/config.js';

// Import Stoat event handlers
import stoatMessageCreate from './src/events/stoat/messageCreate.js';
import stoatMessageUpdate from './src/events/stoat/messageUpdate.js';
import stoatMessageDelete from './src/events/stoat/messageDelete.js';

// Import Discord event handlers
import discordMessageCreate from './src/events/discord/messageCreate.js';
import discordMessageUpdate from './src/events/discord/messageUpdate.js';
import discordMessageDelete from './src/events/discord/messageDelete.js';

// Import Commands
import * as syncChannelCommand from './src/commands/syncChannel.js';

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
discordClient.on('clientReady', async () => {
    logger.info(`Logged in as ${discordClient.user.tag}`);

    // Register Commands
    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
    try {
        logger.info('Started refreshing application (/) commands.');
        
        // Sync to specific test guild
        await rest.put(
            Routes.applicationGuildCommands(discordClient.user.id, '254779349352448001'),
            { body: [syncChannelCommand.data.toJSON()] },
        );

        logger.info('Successfully reloaded application (/) commands.');
    } catch (error) {
        logger.error(error);
    }
});

discordClient.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === syncChannelCommand.data.name) {
        try {
            await syncChannelCommand.execute(interaction);
        } catch (error) {
            logger.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        }
    }
});

discordClient.on('messageCreate', (message) => discordMessageCreate(message, config));
discordClient.on('messageUpdate', (oldMessage, newMessage) => discordMessageUpdate(oldMessage, newMessage, config));
discordClient.on('messageDelete', (message) => discordMessageDelete(message, config));


// Login to both clients
await Promise.all([
  stoatClient.loginBot(config.STOAT_BOT_TOKEN),
  discordClient.login(config.DISCORD_TOKEN)
]);