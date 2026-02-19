import { shouldMirrorChannel, isBotMessage } from '../../utils/channelUtils.js';
import * as messageHandler from '../../messageHandler.js';

export default async function(oldMessage, newMessage, config) {
    if (!shouldMirrorChannel(newMessage.channelId, config, false)) return;
    if (isBotMessage(newMessage, config, false)) return;

    // Check if we have a mapping for this message
    const stoatChannelId = config.CHANNEL_MAPPING[newMessage.channelId];
    const channelMap = messageHandler.discordToStoatMapping.get(newMessage.channelId);
    if (!channelMap || !channelMap.has(newMessage.id)) return;

    const stoatMessageId = channelMap.get(newMessage.id);

    await messageHandler.editMessageInStoat(stoatChannelId, stoatMessageId, newMessage, config);
}