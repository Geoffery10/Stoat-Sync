import { shouldMirrorChannel, isBotMessage } from '../../../bot.js';
import * as messageHandler from '../../messageHandler.js';
import * as config from '../../config.js';

export default async function(oldMessage, newMessage) {
    if (!shouldMirrorChannel(newMessage.channelId, false)) return;
    if (isBotMessage(newMessage, false)) return;

    // Check if we have a mapping for this message
    const stoatChannelId = config.CHANNEL_MAPPING[newMessage.channelId];
    const channelMap = messageHandler.discordToStoatMapping.get(newMessage.channelId);
    if (!channelMap || !channelMap.has(newMessage.id)) return;

    const stoatMessageId = channelMap.get(newMessage.id);

    await messageHandler.editMessageInStoat(stoatChannelId, stoatMessageId, newMessage, config);
}