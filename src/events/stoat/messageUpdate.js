import { shouldMirrorChannel } from '../../utils/channelUtils.js';
import * as messageHandler from '../../messageHandler.js';
import { discordClient } from '../../../bot.js';
import { logger } from '../../logger.js';

export default async function(oldMessage, newMessage, config) {
    if (!shouldMirrorChannel(oldMessage.channelId, config, true)) return;

    const discordMessageId = messageHandler.stoatToDiscordMapping.get(newMessage.id);
    if (!discordMessageId) return;

    const discordChannelId = config.STOAT_TO_DISCORD_MAPPING[oldMessage.channelId];
    const discordChannel = await discordClient.channels.fetch(discordChannelId);
    if (!discordChannel) {
        logger.error(`Could not find Discord channel with ID ${discordChannelId}`);
        return;
    }

    await messageHandler.editMessageInDiscord(discordChannel, discordMessageId, oldMessage, config);
}