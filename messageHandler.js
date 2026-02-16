import { logger } from './logger.js';
import axios from 'axios';
import fs from 'fs/promises';
import { formatMessageForDiscord } from './messageFormatter.js';
import { formatMessageForStoat } from './messageFormatter.js';
import path from 'path';
import FormData from 'form-data';
import { createOrGetWebhook } from './webhookHandler.js';

// Message mapping storage (Stoat message ID -> Discord message ID)
export const stoatToDiscordMapping = new Map();
// Message mapping storage (Discord channel ID -> Map of Discord message ID -> Stoat message ID)
export const discordToStoatMapping = new Map();

export async function uploadAttachmentToStoat(filePath, STOAT_AUTUMN_URL, STOAT_BOT_TOKEN) {
    try {
        if (!await fs.access(filePath).then(() => true).catch(() => false)) {
            logger.info(`[!] Attachment not found locally: ${filePath}`);
            return null;
        }

        const form = new FormData();
        form.append('file', await fs.readFile(filePath), {
            filename: path.basename(filePath),
            contentType: 'application/octet-stream'
        });

        const response = await axios.post(`${STOAT_AUTUMN_URL}/attachments`, form, {
            headers: {
                ...form.getHeaders(),
                'x-bot-token': STOAT_BOT_TOKEN
            }
        });

        return response.data?.id || null;
    } catch (error) {
        logger.error(`[!] Error uploading file: ${error.message}`);
        return null;
    }
}

export async function sendMessageToDiscord(message, discordChannel, STOAT_BASE_URL) {
    // Format the message
    const formattedContent = await formatMessageForDiscord(message);

    // Handle attachments
    const attachmentFiles = [];
    if (message.attachments && typeof message.attachments === 'object') {
        const attachments = Array.isArray(message.attachments) ? message.attachments : [message.attachments];
        for (const attachment of attachments) {
            try {
                const response = await fetch(`${STOAT_BASE_URL}/autumn/attachments/${attachment.id}`);
                const buffer = await response.arrayBuffer();
                attachmentFiles.push({
                    attachment: Buffer.from(buffer),
                    name: attachment.name
                });
            } catch (error) {
                logger.error(`Error downloading attachment ${attachment.name}: ${error.message}`);
            }
        }
    }

    // Get or create webhook
    const webhook = await createOrGetWebhook(discordChannel);
    if (!webhook) {
        logger.error('Failed to get or create webhook');
        return null;
    }

    // Prepare webhook message options
    const webhookOptions = {
        content: formattedContent,
        username: message.author?.username || 'Stoat User',
        avatarURL: message.author?.avatar
            ? `${message.author.avatarURL}`
            : 'https://i.imgur.com/ykjd3JO.jpeg', // Default Stoat avatar
        files: attachmentFiles
    };

    // Send the message via webhook
    try {
        const sentMessage = await webhook.send(webhookOptions);
        return sentMessage;
    } catch (error) {
        logger.error(`Failed to send message via webhook to Discord: ${error.message}`);
        return null;
    }
}

export async function editMessageInDiscord(discordChannel, discordMessageId, message, STOAT_BASE_URL) {
    // Format the updated message
    const formattedContent = await formatMessageForDiscord(message);

    try {
        // Get the Discord message
        const discordMessage = await discordChannel.messages.fetch(discordMessageId);

        // Check if the message is from a webhook
        if (discordMessage.webhookId) {
            // Get the webhook
            const webhook = await createOrGetWebhook(discordChannel);
            if (!webhook) {
                logger.error('Failed to get webhook for editing message');
                return false;
            }

            // Edit the webhook message
            await webhook.editMessage(discordMessageId, {
                content: formattedContent,
                username: message.author?.username || 'Stoat User',
                avatarURL: message.author?.avatar
                    ? `${message.author.avatarURL}`
                    : 'https://i.imgur.com/ykjd3JO.jpeg'
            });
        } else {
            // Edit regular message if not from webhook
            await discordMessage.edit(formattedContent);
        }

        return true;
    } catch (error) {
        logger.error(`Failed to update message in Discord: ${error.message}`);
        return false;
    }
}

export async function deleteMessageInDiscord(discordChannel, discordMessageId, messageId) {
    try {
        // Get the Discord channel and delete the message
        const discordMessage = await discordChannel.messages.fetch(discordMessageId);
        await discordMessage.delete();

        // Remove from our mapping
        stoatToDiscordMapping.delete(messageId);
        return true;
    } catch (error) {
        logger.error(`Failed to delete message in Discord: ${error.message}`);
        return false;
    }
}

export async function sendMessageToStoat(message, stoatChannelId, STOAT_API_URL, STOAT_BOT_TOKEN, STOAT_AUTUMN_URL, STOAT_BASE_URL) {
    // Format the message
    const formattedContent = await formatMessageForStoat(message);

    // Handle attachments
    const attachmentIds = [];
    for (const attachment of message.attachments.values()) {
        const filePath = `temp_${attachment.id}_${attachment.name}`;
        try {
            // Download the attachment
            const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
            await fs.writeFile(filePath, response.data);

            // Upload to Stoat
            const uploadedId = await uploadAttachmentToStoat(filePath, STOAT_AUTUMN_URL, STOAT_BOT_TOKEN);
            if (uploadedId) {
                attachmentIds.push(uploadedId);
            }

            // Clean up
            await fs.unlink(filePath);
        } catch (error) {
            logger.error(`[!] Error uploading file: ${error.message} (File): ${attachment.name}`);
            if (await fs.access(filePath).then(() => true).catch(() => false)) {
                await fs.unlink(filePath);
            }
        }
    }

    // Get the best available avatar URL
    let avatarUrl;
    if (message.member && message.member.avatar) {
        // Use server-specific avatar if available
        avatarUrl = message.member.avatarURL({ dynamic: true, size: 256 });
    } else if (message.author && message.author.avatar) {
        // Fall back to global avatar
        avatarUrl = message.author.avatarURL({ dynamic: true, size: 256 });
    }

    // Prepare payload with masquerade
    const payload = {
        content: formattedContent,
        attachments: attachmentIds,
        masquerade: {
            name: message.author?.username || 'Unknown User',
            avatar: avatarUrl || undefined
        }
    };

    // Send to Stoat
    try {
        const response = await axios.post(
            `${STOAT_API_URL}/channels/${stoatChannelId}/messages`,
            payload,
            {
                headers: {
                    'x-bot-token': STOAT_BOT_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data?._id;
    } catch (error) {
        logger.error(`Failed to send message: ${error.response?.status || 'Unknown'} - ${error.message}`);
        return null;
    }
}

export async function editMessageInStoat(stoatChannelId, stoatMessageId, message, STOAT_API_URL, STOAT_BOT_TOKEN) {
    // Format the edited message
    const formattedContent = await formatMessageForStoat(message);

    // Prepare payload
    const payload = {
        content: formattedContent
    };

    // Send the edit to Stoat
    try {
        await axios.patch(
            `${STOAT_API_URL}/channels/${stoatChannelId}/messages/${stoatMessageId}`,
            payload,
            {
                headers: {
                    'x-bot-token': STOAT_BOT_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
        return true;
    } catch (error) {
        logger.error(`Failed to edit message: ${error.response?.status || 'Unknown'} - ${error.message}`);
        return false;
    }
}

export async function deleteMessageInStoat(stoatChannelId, stoatMessageId, STOAT_API_URL, STOAT_BOT_TOKEN) {
    // Delete the message in Stoat
    try {
        await axios.delete(
            `${STOAT_API_URL}/channels/${stoatChannelId}/messages/${stoatMessageId}`,
            {
                headers: {
                    'x-bot-token': STOAT_BOT_TOKEN
                }
            }
        );
        return true;
    } catch (error) {
        logger.error(`Failed to delete message: ${error.response?.status || 'Unknown'} - ${error.message}`);
        return false;
    }
}