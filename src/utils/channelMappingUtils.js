import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';

const DEFAULT_CHANNEL_MAPPING_FILE = 'channel_mapping.yaml';

/**
 * Ensures the channel mapping file exists, creates it if missing
 * @param {string} [filePath] - Path to the channel mapping file
 * @returns {Promise<void>}
 */
export async function ensureChannelMappingFileExists(filePath = DEFAULT_CHANNEL_MAPPING_FILE) {
    try {
        await fs.access(filePath);
    } catch {
        await fs.writeFile(filePath, '');
    }
}

/**
 * Loads channel mappings from file
 * @param {string} [filePath] - Path to the channel mapping file
 * @returns {Promise<{CHANNEL_MAPPING: Object, STOAT_TO_DISCORD_MAPPING: Object}>}
 */
export async function loadChannelMappings(filePath = DEFAULT_CHANNEL_MAPPING_FILE) {
    await ensureChannelMappingFileExists(filePath);

    try {
        const fileContents = await fs.readFile(filePath, 'utf8');
        const CHANNEL_MAPPING = yaml.load(fileContents) || {};

        const STOAT_TO_DISCORD_MAPPING = {};
        for (const [discordId, stoatId] of Object.entries(CHANNEL_MAPPING)) {
            STOAT_TO_DISCORD_MAPPING[stoatId] = discordId;
        }

        return { CHANNEL_MAPPING, STOAT_TO_DISCORD_MAPPING };
    } catch (error) {
        console.error('Failed to load channel mappings:', error);
        return { CHANNEL_MAPPING: {}, STOAT_TO_DISCORD_MAPPING: {} };
    }
}

/**
 * Saves channel mappings to file
 * @param {Object} mappings - The channel mappings to save
 * @param {string} [filePath] - Path to the channel mapping file
 * @returns {Promise<void>}
 */
export async function saveChannelMappings(mappings, filePath = DEFAULT_CHANNEL_MAPPING_FILE) {
    const yamlContent = yaml.dump(mappings);
    await fs.writeFile(filePath, yamlContent);
}

/**
 * Adds or updates a channel mapping
 * @param {string} discordId - Discord channel ID
 * @param {string} stoatId - Stoat channel ID
 * @param {string} [filePath] - Path to the channel mapping file
 * @returns {Promise<{CHANNEL_MAPPING: Object, STOAT_TO_DISCORD_MAPPING: Object}>}
 */
export async function addChannelMapping(discordId, stoatId, filePath = DEFAULT_CHANNEL_MAPPING_FILE) {
    const { CHANNEL_MAPPING, STOAT_TO_DISCORD_MAPPING } = await loadChannelMappings(filePath);

    // Remove any existing mapping for this stoatId to avoid duplicates
    if (STOAT_TO_DISCORD_MAPPING[stoatId]) {
        delete CHANNEL_MAPPING[STOAT_TO_DISCORD_MAPPING[stoatId]];
    }

    // Add/update the new mapping
    CHANNEL_MAPPING[discordId] = stoatId;
    STOAT_TO_DISCORD_MAPPING[stoatId] = discordId;

    await saveChannelMappings(CHANNEL_MAPPING, filePath);
    return { CHANNEL_MAPPING, STOAT_TO_DISCORD_MAPPING };
}

/**
 * Removes a channel mapping by Discord ID
 * @param {string} discordId - Discord channel ID to remove
 * @param {string} [filePath] - Path to the channel mapping file
 * @returns {Promise<{CHANNEL_MAPPING: Object, STOAT_TO_DISCORD_MAPPING: Object}>}
 */
export async function removeChannelMapping(discordId, filePath = DEFAULT_CHANNEL_MAPPING_FILE) {
    const { CHANNEL_MAPPING, STOAT_TO_DISCORD_MAPPING } = await loadChannelMappings(filePath);

    if (CHANNEL_MAPPING[discordId]) {
        const stoatId = CHANNEL_MAPPING[discordId];
        delete CHANNEL_MAPPING[discordId];
        delete STOAT_TO_DISCORD_MAPPING[stoatId];

        await saveChannelMappings(CHANNEL_MAPPING, filePath);
    }

    return { CHANNEL_MAPPING, STOAT_TO_DISCORD_MAPPING };
}

/**
 * Gets the Stoat channel ID for a given Discord channel ID
 * @param {string} discordId - Discord channel ID
 * @param {string} [filePath] - Path to the channel mapping file
 * @returns {Promise<string|null>} - Stoat channel ID or null if not found
 */
export async function getStoatIdForDiscord(discordId, filePath = DEFAULT_CHANNEL_MAPPING_FILE) {
    const { CHANNEL_MAPPING } = await loadChannelMappings(filePath);
    return CHANNEL_MAPPING[discordId] || null;
}

/**
 * Gets the Discord channel ID for a given Stoat channel ID
 * @param {string} stoatId - Stoat channel ID
 * @param {string} [filePath] - Path to the channel mapping file
 * @returns {Promise<string|null>} - Discord channel ID or null if not found
 */
export async function getDiscordIdForStoat(stoatId, filePath = DEFAULT_CHANNEL_MAPPING_FILE) {
    const { STOAT_TO_DISCORD_MAPPING } = await loadChannelMappings(filePath);
    return STOAT_TO_DISCORD_MAPPING[stoatId] || null;
}