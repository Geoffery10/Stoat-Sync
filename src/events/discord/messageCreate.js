import { shouldMirrorChannel, isBotMessage } from '../../utils/channelUtils.js';
import * as messageHandler from '../../messageHandler.js';
import * as config from '../../config.js';

export default async function(message) {
    if (!shouldMirrorChannel(message.channelId, config, false)) return;
    if (isBotMessage(message, false)) return;

    // Send message to Stoat
    const stoatChannelId = config.CHANNEL_MAPPING[message.channelId];
    const stoatMessageId = await messageHandler.sendMessageToStoat(message, stoatChannelId, config);
    if (stoatMessageId) {
        if (!messageHandler.discordToStoatMapping.has(message.channelId)) {
            messageHandler.discordToStoatMapping.set(message.channelId, new Map());
        }
        messageHandler.discordToStoatMapping.get(message.channelId).set(message.id, stoatMessageId);
    }
}