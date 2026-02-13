import { Client, GatewayIntentBits } from 'discord.js';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs/promises';
import dotenv from 'dotenv';
import path from 'path';
import yaml from 'js-yaml';
import { formatMessageForDiscord } from './messageFormatter.js';

// Load environment variables
dotenv.config();

// Configuration
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const STOAT_BOT_TOKEN = process.env.STOAT_BOT_TOKEN;
const STOAT_BASE_URL = process.env.STOAT_BASE_URL;
const STOAT_API_URL = `${STOAT_BASE_URL}/api`;
const STOAT_AUTUMN_URL = `${STOAT_BASE_URL}/autumn`;

// Channel mappings
const fileContents = await fs.readFile('channel_mapping.yaml', 'utf8');
const CHANNEL_MAPPING = yaml.load(fileContents);

// Message mapping storage
const messageMapping = new Map();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

async function uploadAttachmentToStoat(filePath) {
    try {
        if (!await fs.access(filePath).then(() => true).catch(() => false)) {
            console.log(`[!] Attachment not found locally: ${filePath}`);
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
        console.error(`[!] Error uploading file: ${error.message}`);
        return null;
    }
}

client.on('clientReady', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    // Ignore messages from the bot itself
    if (message.author.id == 1471564072674791444) return;

    // Check if the message is in a channel we want to mirror
    const stoatChannelId = CHANNEL_MAPPING[message.channelId];
    if (!stoatChannelId) return;

    // Format the message
    const formattedContent = await formatMessageForStoat(message);
    console.log(formattedContent)

    // Handle attachments
    const attachmentIds = [];
    for (const attachment of message.attachments.values()) {
        const filePath = `temp_${attachment.id}_${attachment.name}`;
        try {
            // Download the attachment
            const response = await axios.get(attachment.url, { responseType: 'arraybuffer' });
            await fs.writeFile(filePath, response.data);

            // Upload to Stoat
            const uploadedId = await uploadAttachmentToStoat(filePath);
            if (uploadedId) {
                attachmentIds.push(uploadedId);
            }

            // Clean up
            await fs.unlink(filePath);
        } catch (error) {
            console.error(`Error handling attachment ${attachment.name}: ${error.message}`);
            if (await fs.access(filePath).then(() => true).catch(() => false)) {
                await fs.unlink(filePath);
            }
        }
    }

    // Prepare payload
    const payload = {
        content: formattedContent,
        attachments: attachmentIds
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

        const stoatMessageId = response.data?._id;
        if (stoatMessageId) {
            if (!messageMapping.has(message.channelId)) {
                messageMapping.set(message.channelId, new Map());
            }
            messageMapping.get(message.channelId).set(message.id, stoatMessageId);
            console.log(`Successfully sent message from ${message.author.username} to Stoat (ID: ${stoatMessageId})`);
        } else {
            console.warn("Warning: No message ID returned from Stoat API");
        }
    } catch (error) {
        console.error(`Failed to send message: ${error.response?.status || 'Unknown'} - ${error.message}`);
    }
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    // Ignore if the message is from the bot itself
    if (newMessage.author.bot) return;

    // Check if the message is in a channel we're mirroring
    const stoatChannelId = CHANNEL_MAPPING[newMessage.channelId];
    if (!stoatChannelId) return;

    // Check if we have a mapping for this message
    const channelMap = messageMapping.get(newMessage.channelId);
    if (!channelMap || !channelMap.has(newMessage.id)) return;

    const stoatMessageId = channelMap.get(newMessage.id);

    // Format the edited message
    const formattedContent = await formatMessageForStoat(newMessage);

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
        console.log(`Successfully edited message in Stoat (ID: ${stoatMessageId})`);
    } catch (error) {
        console.error(`Failed to edit message: ${error.response?.status || 'Unknown'} - ${error.message}`);
    }
});

client.on('messageDelete', async (message) => {
    // Check if the message is in a channel we're mirroring
    const stoatChannelId = CHANNEL_MAPPING[message.channelId];
    if (!stoatChannelId) return;

    // Check if we have a mapping for this message
    const channelMap = messageMapping.get(message.channelId);
    if (!channelMap || !channelMap.has(message.id)) return;

    const stoatMessageId = channelMap.get(message.id);

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
        console.log(`Successfully deleted message in Stoat (ID: ${stoatMessageId})`);

        // Remove from our mapping
        channelMap.delete(message.id);
    } catch (error) {
        console.error(`Failed to delete message: ${error.response?.status || 'Unknown'} - ${error.message}`);
    }
});

client.login(DISCORD_TOKEN);