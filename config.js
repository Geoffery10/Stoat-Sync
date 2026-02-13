import { config } from 'dotenv';
import fs from 'fs/promises';
import yaml from 'js-yaml';

config();

export const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
export const STOAT_BOT_TOKEN = process.env.STOAT_BOT_TOKEN;
export const STOAT_BASE_URL = process.env.STOAT_BASE_URL;
export const STOAT_API_URL = `${STOAT_BASE_URL}/api`;
export const STOAT_AUTUMN_URL = `${STOAT_BASE_URL}/autumn`;

export async function loadChannelMappings() {
    const fileContents = await fs.readFile('channel_mapping.yaml', 'utf8');
    const CHANNEL_MAPPING = yaml.load(fileContents);

    const STOAT_TO_DISCORD_MAPPING = {};
    for (const [discordId, stoatId] of Object.entries(CHANNEL_MAPPING)) {
        STOAT_TO_DISCORD_MAPPING[stoatId] = discordId;
    }

    return { CHANNEL_MAPPING, STOAT_TO_DISCORD_MAPPING };
}