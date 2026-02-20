import { REST, Routes } from 'discord.js';
import { logger } from '../../logger.js';
import * as config from '../../config.js';
import * as syncChannelCommand from '../../commands/syncChannel.js';
import * as unsyncChannelCommand from '../../commands/unsyncChannel.js';
import * as isSyncedCommand from '../../commands/isSynced.js';

export default async function clientReady(discordClient) {
    logger.info(`Logged in as ${discordClient.user.tag}`);

    // Register Commands
    const rest = new REST({ version: '10' }).setToken(config.DISCORD_TOKEN);
    try {
        logger.info('Started refreshing application (/) commands.');

        // Sync to specific test guild
        await rest.put(
            Routes.applicationGuildCommands(discordClient.user.id, '254779349352448001'),
            { body:
              [
                syncChannelCommand.data.toJSON(),
                unsyncChannelCommand.data.toJSON(),
                isSyncedCommand.data.toJSON()
              ]
            },
        );

        logger.info('Successfully reloaded application (/) commands.');
    } catch (error) {
        logger.error(error);
    }
}