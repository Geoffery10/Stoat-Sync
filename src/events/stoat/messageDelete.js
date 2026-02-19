import { shouldMirrorChannel } from '../../utils/channelUtils.js';
import * as messageHandler from '../../messageHandler.js';
import { discordClient } from '../../../bot.js';
import { logger } from '../../logger.js';

export default async function(message, config) {
    if (!shouldMirrorChannel(message.channelId, config, true)) return;

    const discordMessageId = messageHandler.stoatToDiscordMapping.get(message.id);
    if (!discordMessageId) return;

    const discordChannelId = config.STOAT_TO_DISCORD_MAPPING[message.channelId];

    try {
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