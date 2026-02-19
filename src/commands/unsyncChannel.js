import { SlashCommandBuilder } from 'discord.js';
import { removeChannelMapping } from '../config.js';

export const data = new SlashCommandBuilder()
	.setName('unsync-channel')
	.setDescription('Unsyncs a Stoat channel from a Discord channel');

export async function execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
        await interaction.reply({
            content: '❌ You must be an administrator to use this command.',
            ephemeral: true
        });
        return;
    }
    
    const discordId = interaction.channelId;

    try {
        await removeChannelMapping(discordId);
        
        await interaction.reply({
            content: `✅ Successfully unsynced this Discord channel from its Stoat channel.`,
            ephemeral: true
        });
    } catch (error) {
        console.error('Error unsyncing channels:', error);
        await interaction.reply({
            content: `❌ Failed to unsync channels. Please check the logs.`,
            ephemeral: true
        });
    }
}