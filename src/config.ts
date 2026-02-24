import { config } from 'dotenv';
import { loadChannelMappings, addChannelMapping, removeChannelMapping, getStoatIdForDiscord, getDiscordIdForStoat } from './utils/channelMappingUtils.js';

config();

// Define types for channel mappings
interface ChannelMappings {
    CHANNEL_MAPPING: Record<string, string>;
    STOAT_TO_DISCORD_MAPPING: Record<string, string>;
}

// Initialize channel mappings
let channelMappings: ChannelMappings = {
    CHANNEL_MAPPING: {},
    STOAT_TO_DISCORD_MAPPING: {}
};

// Try to load the channel mappings file
try {
    const loadedMappings = await loadChannelMappings();
    channelMappings = loadedMappings as ChannelMappings;
} catch (error) {
    console.error('Failed to load channel mappings:', error);
}


export const DISCORD_TOKEN: string = process.env.DISCORD_TOKEN || '';
export const STOAT_BOT_TOKEN: string = process.env.STOAT_BOT_TOKEN || '';
export const STOAT_BASE_URL: string = process.env.STOAT_BASE_URL || '';
export const STOAT_API_URL: string = `${STOAT_BASE_URL}/api`;
export const STOAT_AUTUMN_URL: string = `${STOAT_BASE_URL}/autumn`;
export const STOAT_BOT_ID: string = process.env.STOAT_BOT_ID || '';
export const DISCORD_BOT_ID: string = process.env.DISCORD_BOT_ID || '';

export const CHANNEL_MAPPING: Record<string, string> = channelMappings.CHANNEL_MAPPING;
export const STOAT_TO_DISCORD_MAPPING: Record<string, string> = channelMappings.STOAT_TO_DISCORD_MAPPING;

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

export {
    loadChannelMappings,
    addChannelMapping,
    removeChannelMapping,
    getStoatIdForDiscord,
    getDiscordIdForStoat
};