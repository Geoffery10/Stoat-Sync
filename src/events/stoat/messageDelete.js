import { shouldMirrorChannel } from '../../../bot.js';
import * as messageHandler from '../../messageHandler.js';
import * as config from '../../config.js';
import { discordClient } from '../../../bot.js';
import { logger } from '../../logger.js';

export default async function(message) {
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
}