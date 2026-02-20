import { execute } from '../../../src/commands/unsyncChannel.js';
import { removeChannelMapping } from '../../../src/config.js';

jest.mock('../../../src/config.js', () => ({
  removeChannelMapping: jest.fn()
}));

describe('unsyncChannel command', () => {
  let interaction;

  beforeEach(() => {
    jest.clearAllMocks();

    interaction = {
      member: {
        permissions: {
          has: jest.fn().mockReturnValue(true)
        }
      },
      channelId: 'test-discord-id',
      reply: jest.fn()
    };
  });

  test('should successfully unsync channels', async () => {
    removeChannelMapping.mockResolvedValueOnce();

    await execute(interaction);

    expect(removeChannelMapping).toHaveBeenCalledWith('test-discord-id');
    expect(interaction.reply).toHaveBeenCalledWith({
      content: '✅ Successfully unsynced this Discord channel from its Stoat channel.',
      ephemeral: true
    });
  });

  test('should handle errors when unsyncing channels', async () => {
    const mockError = new Error('Test error');
    removeChannelMapping.mockRejectedValueOnce(mockError);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await execute(interaction);

    expect(consoleSpy).toHaveBeenCalledWith('Error unsyncing channels:', mockError);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: '❌ Failed to unsync channels. Please check the logs.',
      ephemeral: true
    });

    consoleSpy.mockRestore();
  });
test('should reject non-admin users', async () => {
    const nonAdminInteraction = {
      member: {
        permissions: {
          has: jest.fn().mockReturnValue(false)
        }
      },
      channelId: 'test-discord-id',
      reply: jest.fn()
    };

    await execute(nonAdminInteraction);

    expect(nonAdminInteraction.member.permissions.has).toHaveBeenCalledWith('Administrator');
    expect(nonAdminInteraction.reply).toHaveBeenCalledWith({
      content: '❌ You must be an administrator to use this command.',
      ephemeral: true
    });
    expect(removeChannelMapping).not.toHaveBeenCalled();
  });

  test('should allow admin users', async () => {
    const adminInteraction = {
      member: {
        permissions: {
          has: jest.fn().mockReturnValue(true)
        }
      },
      channelId: 'test-discord-id',
      reply: jest.fn()
    };

    removeChannelMapping.mockResolvedValueOnce();

    await execute(adminInteraction);

    expect(adminInteraction.member.permissions.has).toHaveBeenCalledWith('Administrator');
    expect(removeChannelMapping).toHaveBeenCalledWith('test-discord-id');
    expect(adminInteraction.reply).toHaveBeenCalledWith({
      content: '✅ Successfully unsynced this Discord channel from its Stoat channel.',
      ephemeral: true
    });
  });
});