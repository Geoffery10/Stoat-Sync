import { config } from 'dotenv';
import fs from 'fs/promises';
import yaml from 'js-yaml';

config();

// Load channel mappings immediately when the module is imported
let channelMappings = { CHANNEL_MAPPING: {}, STOAT_TO_DISCORD_MAPPING: {} };

// Try to load the channel mappings file
try {
    const fileContents = await fs.readFile('channel_mapping.yaml', 'utf8');
    const CHANNEL_MAPPING = yaml.load(fileContents) || {};

    const STOAT_TO_DISCORD_MAPPING = {};
    for (const [discordId, stoatId] of Object.entries(CHANNEL_MAPPING)) {
        STOAT_TO_DISCORD_MAPPING[stoatId] = discordId;
    }

    channelMappings = { CHANNEL_MAPPING, STOAT_TO_DISCORD_MAPPING };
} catch (error) {
    console.error('Failed to load channel mappings:', error);
    // Continue with empty mappings if file doesn't exist or can't be read
}

export const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
export const STOAT_BOT_TOKEN = process.env.STOAT_BOT_TOKEN;
export const STOAT_BASE_URL = process.env.STOAT_BASE_URL;
export const STOAT_API_URL = `${STOAT_BASE_URL}/api`;
export const STOAT_AUTUMN_URL = `${STOAT_BASE_URL}/autumn`;
export const STOAT_BOT_ID = process.env.STOAT_BOT_ID;
export const DISCORD_BOT_ID = process.env.DISCORD_BOT_ID;

// Export the channel mappings as part of the config
export const CHANNEL_MAPPING = channelMappings.CHANNEL_MAPPING;
export const STOAT_TO_DISCORD_MAPPING = channelMappings.STOAT_TO_DISCORD_MAPPING;

// Also export the complete config object for convenience
export const CONFIG = {
    DISCORD_TOKEN,
    STOAT_BOT_TOKEN,
    STOAT_BASE_URL,
    STOAT_API_URL,
    STOAT_AUTUMN_URL,
    STOAT_BOT_ID,
    DISCORD_BOT_ID,
    CHANNEL_MAPPING,
    STOAT_TO_DISCORD_MAPPING
};

// Keep the async function for cases where you need to reload mappings
export async function loadChannelMappings() {
    const fileContents = await fs.readFile('channel_mapping.yaml', 'utf8');
    const CHANNEL_MAPPING = yaml.load(fileContents) || {};

    const STOAT_TO_DISCORD_MAPPING = {};
    for (const [discordId, stoatId] of Object.entries(CHANNEL_MAPPING)) {
        STOAT_TO_DISCORD_MAPPING[stoatId] = discordId;
    }

    return { CHANNEL_MAPPING, STOAT_TO_DISCORD_MAPPING };
}