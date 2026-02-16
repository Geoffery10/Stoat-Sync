import console from "console";
import { logger } from './logger.js';

export function formatMessageForDiscord(message, config) {
    let content = message.content;

    // Handle channel mentions
    const channelMentionRegex = /<#([0-9A-z]{26})>/g;
    content = content.replace(channelMentionRegex, (match, channelId) => {
        const stoatChannelId = convertChannelId(channelId, config);
        return `<#${stoatChannelId}>`;
    });

    // Handle spoilers and mentions
    content = content.replaceAll("!!", "||").replaceAll(/@everyone/g, "`@everyone`");
    
    return `${content}`;
}

export function formatMessageForStoat(message, config) {
    let content = message.content;

    // Replace user mentions with usernames
    if (message.mentions && message.mentions.users) {
        message.mentions.users.forEach(user => {
            const mentionRegex = new RegExp(`<@!?${user.id}>`, 'g');
            content = content.replace(mentionRegex, `@${user.username}`);
        });
    }

    // Replace role mentions with role names
    if (message.mentions && message.mentions.roles) {
        message.mentions.roles.forEach(role => {
            const mentionRegex = new RegExp(`<@&${role.id}>`, 'g');
            content = content.replace(mentionRegex, `@${role.name}`);
        });
    }

    // Handle channel mentions
    const channelMentionRegex = /<#(\d+)>/g;
    content = content.replace(channelMentionRegex, (match, channelId) => {
        const discordChannelId = convertChannelId(channelId, config);
        return `<#${discordChannelId}>`;
    });

    // Handle spoilers and mentions
    content = content.replaceAll("||", "!!").replaceAll(/@everyone/g, "`@everyone`");

    return `${content}`;
}

export function convertChannelId(channelId, config) {
    // Check if it's a Discord channel ID (numeric)
    if (/^\d+$/.test(channelId)) {
        // Convert Discord → Stoat using CHANNEL_MAPPING
        return config.CHANNEL_MAPPING[channelId] || channelId;
    }
    // Check if it's a Stoat channel ID (UUID-like)
    else if (/^[0-9A-z]{26}/.test(channelId)) {
        // Convert Stoat → Discord using STOAT_TO_DISCORD_MAPPING
        return config.STOAT_TO_DISCORD_MAPPING[channelId] || channelId;
    }
    // Return original if no match
    return channelId;
}