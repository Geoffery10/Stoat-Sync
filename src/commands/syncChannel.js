import { SlashCommandBuilder } from 'discord.js';
import { addChannelMapping } from '../config.js';

export const data = new SlashCommandBuilder()
	.setName('sync-channel')
	.setDescription('Syncs a Stoat channel with a Discord channel')
	.addStringOption((option) => option.setName('stoatid').setDescription('The Stoat channel ID to sync').setRequired(true));

export async function execute(interaction) {
    if (!interaction.member.permissions.has('Administrator')) {
        await interaction.reply({
            content: '❌ You must be an administrator to use this command.',
            ephemeral: true
        });
        return;
    }
    
    const stoatId = interaction.options.getString('stoatid');
    const discordId = interaction.channelId;

    try {
        await addChannelMapping(discordId, stoatId);
        
        await interaction.reply({ 
            content: `✅ Successfully synced this Discord channel with Stoat Channel ID: \`${stoatId}\``, 
            ephemeral: true 
        });
    } catch (error) {
        console.error('Error syncing channels:', error);
        await interaction.reply({ 
            content: `❌ Failed to sync channels. Please check the logs.`, 
            ephemeral: true 
        });
    }
}