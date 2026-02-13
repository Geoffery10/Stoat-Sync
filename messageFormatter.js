
export function formatMessageForDiscord(message) {
    let content = message.content;
    // Handle spoilers and mentions
    content = content.replace("!!", /\|\|/g).replace(/@everyone/g, "`@everyone`");
    return `**${message.author.username}**\n ${content}`;
}

export function formatMessageForStoat(message) {
    let content = message.content;
    // Handle spoilers and mentions
    content = content.replace(/\|\|/g, "!!").replace(/@everyone/g, "`@everyone`");
    return `**${message.author.username}**\n ${content}`;
}