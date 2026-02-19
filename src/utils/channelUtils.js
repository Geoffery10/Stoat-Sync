

export function shouldMirrorChannel(channelId, config, isStoatChannel = false) {
  if (isStoatChannel) {
    return config.STOAT_TO_DISCORD_MAPPING[channelId] !== undefined;
  } else {
    return config.CHANNEL_MAPPING[channelId] !== undefined;
  }
}

export function isBotMessage(message, config, isStoatMessage = false) {
  if (isStoatMessage) {
    return message.author.id === config.STOAT_BOT_ID ||
           message.author.id === "01KH706FEP6ZVDTD0Y99W3FVEZ"; // Discord-Restore Bot
  } else {
    // Check if the message is from the bot user itself
    if (message.author.id === config.DISCORD_BOT_ID) return true;

    // Check if the message is from a webhook created by THIS bot.
    if (message.webhookId && message.applicationId === config.DISCORD_BOT_ID) return true;

    return false;
  }
}