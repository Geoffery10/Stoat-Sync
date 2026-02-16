import { logger } from './logger.js';

export async function createOrGetWebhook(discordChannel) {
    const webhookNamePrefix = 'stoat';
    try {
        // Get existing webhooks for this channel
        const webhooks = await discordChannel.fetchWebhooks();
        const existingWebhook = webhooks.find(wh => wh.name.startsWith(webhookNamePrefix));

        if (existingWebhook) {
            return existingWebhook;
        }

        // Create a new webhook if none exists
        const channelName = discordChannel.name.replace(/\s+/g, '-').toLowerCase();
        const webhookName = `${webhookNamePrefix}-${channelName}`;

        const newWebhook = await discordChannel.createWebhook({
            name: webhookName,
            avatar: 'https://i.imgur.com/ykjd3JO.jpeg'
        });

        return newWebhook;
    } catch (error) {
        logger.error(`Failed to create/get webhook: ${error.message}`);
        return null;
    }
}