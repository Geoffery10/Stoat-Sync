import { shouldMirrorChannel } from '../../utils/channelUtils.js';
import * as messageHandler from '../../messageHandler.js';
import { discordClient } from '../../../bot.js';
import { logger } from '../../logger.js';

export default async function(oldMessage, newMessage, config) {
    if (!shouldMirrorChannel(oldMessage.channelId, config, true)) return;

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
}