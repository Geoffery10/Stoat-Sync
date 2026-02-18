import { formatMessageForDiscord, formatMessageForStoat, convertChannelId } from '../../src/messageFormatter';

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

describe('formatMessageForDiscord with channel mentions', () => {
  const config = {
    CHANNEL_MAPPING: {
      '254779349352448001': '01KH73FVZKAYM9J6SZ5W8CVD7Z',
      '254779349352448002': '01KH73FVZKAYM9J6SZ5W8CVD7Y'
    },
    STOAT_TO_DISCORD_MAPPING: {
      '01KH73FVZKAYM9J6SZ5W8CVD7Z': '254779349352448001',
      '01KH73FVZKAYM9J6SZ5W8CVD7Y': '254779349352448002'
    }
  };

  it('should convert multiple Discord channel mentions to Stoat format', () => {
    const message = {
      content: 'Check out <#254779349352448001> and <#254779349352448002>!'
    };
    expect(formatMessageForStoat(message, config))
      .toBe('Check out <#01KH73FVZKAYM9J6SZ5W8CVD7Z> and <#01KH73FVZKAYM9J6SZ5W8CVD7Y>!');
  });

  it('should handle mixed mapped and unmapped channel mentions', () => {
    const message = {
      content: 'Check out <#254779349352448001> and <#999999999999999999>!'
    };
    expect(formatMessageForStoat(message, config))
      .toBe('Check out <#01KH73FVZKAYM9J6SZ5W8CVD7Z> and <#999999999999999999>!');
  });
});

describe('formatMessageForStoat with channel mentions', () => {
  const config = {
    CHANNEL_MAPPING: {
      '254779349352448001': '01KH73FVZKAYM9J6SZ5W8CVD7Z',
      '254779349352448002': '01KH73FVZKAYM9J6SZ5W8CVD7Y'
    },
    STOAT_TO_DISCORD_MAPPING: {
      '01KH73FVZKAYM9J6SZ5W8CVD7Z': '254779349352448001',
      '01KH73FVZKAYM9J6SZ5W8CVD7Y': '254779349352448002'
    }
  };

  it('should convert multiple Stoat channel mentions to Discord format', () => {
    const message = {
      content: 'Check out <#01KH73FVZKAYM9J6SZ5W8CVD7Z> and <#01KH73FVZKAYM9J6SZ5W8CVD7Y>!',
      mentions: { users: [], roles: [] }
    };
    expect(formatMessageForDiscord(message, config))
      .toBe('Check out <#254779349352448001> and <#254779349352448002>!');
  });

  it('should handle mixed mapped and unmapped Stoat channel mentions', () => {
    const message = {
      content: 'Check out <#01KH73FVZKAYM9J6SZ5W8CVD7Z> and <#01KH73FVZKAYM9J6SZ5W8CVD7X>!',
      mentions: { users: [], roles: [] }
    };
    expect(formatMessageForDiscord(message, config))
      .toBe('Check out <#254779349352448001> and <#01KH73FVZKAYM9J6SZ5W8CVD7X>!');
  });
});

describe('formatMessageForStoat', () => {
  it('should format a simple message', () => {
    const message = {
      author: { username: 'TestUser' },
      content: 'Hello world',
      mentions: { users: [], roles: [] }
    };
    expect(formatMessageForDiscord(message)).toBe('Hello world');
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
    expect(formatMessageForStoat(message)).toBe('Hello @MentionedUser!');
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
    expect(formatMessageForStoat(message)).toBe('Hello @TestRole!');
  });

  it('should handle spoilers', () => {
    const message = {
      author: { username: 'TestUser' },
      content: 'This is a spoiler ||secret||',
      mentions: { users: [], roles: [] }
    };
    expect(formatMessageForStoat(message)).toBe('This is a spoiler !!secret!!');
  });

  it('should handle @everyone mentions', () => {
    const message = {
      author: { username: 'TestUser' },
      content: 'Hey @everyone!',
      mentions: { users: [], roles: [] }
    };
    expect(formatMessageForStoat(message)).toBe('Hey `@everyone`!');
  });
});


describe('convertChannelId', () => {
  const config = {
    CHANNEL_MAPPING: {
      '254779349352448001': '01KH73FVZKAYM9J6SZ5W8CVD7Z'
    },
    STOAT_TO_DISCORD_MAPPING: {
      '01KH73FVZKAYM9J6SZ5W8CVD7Z': '254779349352448001'
    }
  };

  it('should convert Discord channel ID to Stoat channel ID', () => {
    expect(convertChannelId('254779349352448001', config))
      .toBe('01KH73FVZKAYM9J6SZ5W8CVD7Z');
  });

  it('should convert Stoat channel ID to Discord channel ID', () => {
    expect(convertChannelId('01KH73FVZKAYM9J6SZ5W8CVD7Z', config))
      .toBe('254779349352448001');
  });

  it('should return original ID if no mapping exists for Discord ID', () => {
    expect(convertChannelId('999999999999999999', config))
      .toBe('999999999999999999');
  });

  it('should return original ID if no mapping exists for Stoat ID', () => {
    expect(convertChannelId('01KH73FVZKAYM9J6SZ5W8CVD7X', config))
      .toBe('01KH73FVZKAYM9J6SZ5W8CVD7X');
  });

  it('should return original ID if format is not recognized', () => {
    expect(convertChannelId('invalid-id', config))
      .toBe('invalid-id');
  });
});

describe('formatMessageForDiscord with channel mentions', () => {
  const config = {
    CHANNEL_MAPPING: {
      '254779349352448001': '01KH73FVZKAYM9J6SZ5W8CVD7Z'
    },
    STOAT_TO_DISCORD_MAPPING: {
      '01KH73FVZKAYM9J6SZ5W8CVD7Z': '254779349352448001'
    }
  };

  it('should convert Discord channel mentions to Stoat format', () => {
    const message = {
      content: 'Check out <#254779349352448001>!'
    };
    expect(formatMessageForStoat(message, config))
      .toBe('Check out <#01KH73FVZKAYM9J6SZ5W8CVD7Z>!');
  });

  it('should leave unmapped channel mentions unchanged', () => {
    const message = {
      content: 'Check out <#999999999999999999>!'
    };
    expect(formatMessageForDiscord(message, config))
      .toBe('Check out <#999999999999999999>!');
  });
});

describe('formatMessageForStoat with channel mentions', () => {
  const config = {
    CHANNEL_MAPPING: {
      '254779349352448001': '01KH73FVZKAYM9J6SZ5W8CVD7Z'
    },
    STOAT_TO_DISCORD_MAPPING: {
      '01KH73FVZKAYM9J6SZ5W8CVD7Z': '254779349352448001'
    }
  };

  it('should convert Stoat channel mentions to Discord format', () => {
    const message = {
      content: 'Check out <#01KH73FVZKAYM9J6SZ5W8CVD7Z>!',
      mentions: { users: [], roles: [] }
    };
    expect(formatMessageForDiscord(message, config))
      .toBe('Check out <#254779349352448001>!');
  });

  it('should leave unmapped channel mentions unchanged', () => {
    const message = {
      content: 'Check out <#01KH73FVZKAYM9J6SZ5W8CVD7X>!',
      mentions: { users: [], roles: [] }
    };
    expect(formatMessageForDiscord(message, config))
      .toBe('Check out <#01KH73FVZKAYM9J6SZ5W8CVD7X>!');
  });
});