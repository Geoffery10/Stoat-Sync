import { shouldMirrorChannel, isBotMessage } from '../../utils/channelUtils.js';
import * as messageHandler from '../../messageHandler.js';

export default async function(message, config) {
    if (!shouldMirrorChannel(message.channelId, config, false)) return;
    if (isBotMessage(message, false)) return;

    // Check if we have a mapping for this message
    const stoatChannelId = config.CHANNEL_MAPPING[message.channelId];
    const channelMap = messageHandler.discordToStoatMapping.get(message.channelId);
    if (!channelMap || !channelMap.has(message.id)) return;

    const stoatMessageId = channelMap.get(message.id);

    await messageHandler.editMessageInStoat(stoatChannelId, stoatMessageId, message, config);
}