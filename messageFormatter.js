
export function formatMessageForDiscord(message) {
    let content = message.content;
    // Handle spoilers and mentions
    content = content.replace("!!", /\|\|/g).replace(/@everyone/g, "`@everyone`");
    
    return `**${message.author.username}**\n ${content}`;
}

export function formatMessageForStoat(message) {
    let content = message.content;

    // Replace user mentions with usernames
    message.mentions.users.forEach(user => {
        const mentionRegex = new RegExp(`<@!?${user.id}>`, 'g');
        content = content.replace(mentionRegex, `@${user.username}`);
    });

    // Replace role mentions with role names
    message.mentions.roles.forEach(role => {
        const mentionRegex = new RegExp(`<@&${role.id}>`, 'g');
        content = content.replace(mentionRegex, `@${role.name}`);
    });

    // Handle spoilers and mentions
    content = content.replace(/\|\|/g, "!!").replace(/@everyone/g, "`@everyone`");

    return `**${message.author.username}**\n ${content}`;
}