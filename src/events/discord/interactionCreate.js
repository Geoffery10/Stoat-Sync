import { logger } from '../../logger.js';
import * as syncChannelCommand from '../../commands/syncChannel.js';
import * as unsyncChannelCommand from '../../commands/unsyncChannel.js';
import * as isSyncedCommand from '../../commands/isSynced.js';

const commands = {
  [syncChannelCommand.data.name]: syncChannelCommand,
  [unsyncChannelCommand.data.name]: unsyncChannelCommand,
  [isSyncedCommand.data.name]: isSyncedCommand,
};

export default async function interactionCreate(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const command = commands[interaction.commandName];
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error(error);
        const response = {
            content: 'There was an error while executing this command!',
            ephemeral: true
        };

        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(response);
        } else {
            await interaction.reply(response);
        }
    }
}