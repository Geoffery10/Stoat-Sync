import { shouldMirrorChannel, isBotMessage } from '../../../bot.js';
import * as messageHandler from '../../messageHandler.js';
import * as config from '../../config.js';
import { discordClient } from '../../../bot.js';
import { logger } from '../../logger.js';

export default async function(message) {
    if (!shouldMirrorChannel(message.channelId, true)) return;
    if (isBotMessage(message, true)) return;
    if (message.author.id == "01KH706FEP6ZVDTD0Y99W3FVEZ") return; // Ignore Discord-Restore Bot

    // Get the Discord channel
    const discordChannelId = config.STOAT_TO_DISCORD_MAPPING[message.channelId];
    const discordChannel = await discordClient.channels.fetch(discordChannelId);
    if (!discordChannel) {
        logger.error(`Could not find Discord channel with ID ${discordChannelId}`);
        return;
    }

    // Send message to Discord
    const sentMessage = await messageHandler.sendMessageToDiscord(message, discordChannel, config);
    if (sentMessage) {
        // Store the mapping (Stoat message ID -> Discord message ID)
        messageHandler.stoatToDiscordMapping.set(message.id, sentMessage.id);
    }
}