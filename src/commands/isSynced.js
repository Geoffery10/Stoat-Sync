import { SlashCommandBuilder } from 'discord.js';
import * as config from '../config.js';

export const data = new SlashCommandBuilder()
    .setName('is-synced')
    .setDescription('Checks if this Discord channel is synced with a Stoat channel');

export async function execute(interaction) {
    const discordId = interaction.channelId;

    try {
        const stoatId = config.CHANNEL_MAPPING[discordId];

        if (stoatId) {
            await interaction.reply({
                content: `✅ This channel is synced with Stoat Channel ID: \`${stoatId}\``,
                ephemeral: true
            });
        } else {
            await interaction.reply({
                content: 'ℹ️ This channel is not currently synced with any Stoat channel.',
                ephemeral: true
            });
        }
    } catch (error) {
        console.error('Error checking sync status:', error);
        await interaction.reply({
            content: '❌ Failed to check sync status. Please check the logs.',
            ephemeral: true
        });
    }
}