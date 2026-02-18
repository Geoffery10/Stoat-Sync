import { shouldMirrorChannel, isBotMessage } from '../../../bot.js';
import * as messageHandler from '../../messageHandler.js';
import * as config from '../../config.js';
import { discordClient } from '../../../bot.js';
import { logger } from '../../logger.js';

async function getDiscordChannel(channelId) {
    try {
        const discordChannel = await discordClient.channels.fetch(channelId);
        if (!discordChannel) {
            logger.error(`Could not find Discord channel with ID ${channelId}`);
            return null;
        }
        return discordChannel;
    } catch (error) {
        logger.error(`Error fetching Discord channel: ${error.message}`);
        return null;
    }
}

async function sendMessageToDiscord(message, discordChannel) {
    const sentMessage = await messageHandler.sendMessageToDiscord(message, discordChannel, config);
    if (sentMessage) {
        messageHandler.stoatToDiscordMapping.set(message.id, sentMessage.id);
    }
    return sentMessage;
}

export default async function(message) {
    if (!shouldMirrorChannel(message.channelId, true)) return;
    if (isBotMessage(message, true)) return;
    if (message.author.id == "01KH706FEP6ZVDTD0Y99W3FVEZ") return; // Ignore Discord-Restore Bot

    const discordChannelId = config.STOAT_TO_DISCORD_MAPPING[message.channelId];
    const discordChannel = await getDiscordChannel(discordChannelId);
    if (!discordChannel) return;

    await sendMessageToDiscord(message, discordChannel);
}