import { shouldMirrorChannel } from '../../utils/channelUtils.js';
import * as messageHandler from '../../messageHandler.js';

export default async function(message, config) {
    if (!shouldMirrorChannel(message.channelId, config, false)) return;

    // Check if we have a mapping for this message
    const channelMap = messageHandler.discordToStoatMapping.get(message.channelId);
    if (!channelMap || !channelMap.has(message.id)) return;

    const stoatMessageId = channelMap.get(message.id);
    const stoatChannelId = config.CHANNEL_MAPPING[message.channelId];

    const success = await messageHandler.deleteMessageInStoat(stoatChannelId, stoatMessageId, config);
    if (success) {
        // Remove from our mapping
        channelMap.delete(message.id);
    }
}