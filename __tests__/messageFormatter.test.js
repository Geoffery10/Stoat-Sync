import { formatMessageForDiscord, formatMessageForStoat } from '../messageFormatter';

describe('formatMessageForDiscord', () => {
  it('should format a simple message', () => {
    const message = {
      author: { username: 'TestUser' },
      content: 'Hello world'
    };
    expect(formatMessageForDiscord(message)).toBe('Hello world');
  });

  it('should handle spoilers', () => {
    const message = {
      author: { username: 'TestUser' },
      content: 'This is a spoiler !!secret!!'
    };
    expect(formatMessageForDiscord(message)).toBe('This is a spoiler ||secret||');
  });

  it('should handle @everyone mentions', () => {
    const message = {
      author: { username: 'TestUser' },
      content: 'Hey @everyone!'
    };
    expect(formatMessageForDiscord(message)).toBe('Hey `@everyone`!');
  });
});

describe('formatMessageForStoat', () => {
  it('should format a simple message', () => {
    const message = {
      author: { username: 'TestUser' },
      content: 'Hello world',
      mentions: { users: [], roles: [] }
    };
    expect(formatMessageForStoat(message)).toBe('**TestUser**\nHello world');
  });

  it('should replace user mentions', () => {
    const message = {
      author: { username: 'TestUser' },
      content: 'Hello <@123456789>!',
      mentions: {
        users: [{ id: '123456789', username: 'MentionedUser' }],
        roles: []
      }
    };
    expect(formatMessageForStoat(message)).toBe('**TestUser**\nHello @MentionedUser!');
  });

  it('should replace role mentions', () => {
    const message = {
      author: { username: 'TestUser' },
      content: 'Hello <@&987654321>!',
      mentions: {
        users: [],
        roles: [{ id: '987654321', name: 'TestRole' }]
      }
    };
    expect(formatMessageForStoat(message)).toBe('**TestUser**\nHello @TestRole!');
  });

  it('should handle spoilers', () => {
    const message = {
      author: { username: 'TestUser' },
      content: 'This is a spoiler ||secret||',
      mentions: { users: [], roles: [] }
    };
    expect(formatMessageForStoat(message)).toBe('**TestUser**\nThis is a spoiler !!secret!!');
  });

  it('should handle @everyone mentions', () => {
    const message = {
      author: { username: 'TestUser' },
      content: 'Hey @everyone!',
      mentions: { users: [], roles: [] }
    };
    expect(formatMessageForStoat(message)).toBe('**TestUser**\nHey `@everyone`!');
  });
});