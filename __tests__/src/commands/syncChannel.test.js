import { execute } from '../../../src/commands/syncChannel.js';
import { addChannelMapping } from '../../../src/config.js';

jest.mock('../../../src/config.js', () => ({
  addChannelMapping: jest.fn()
}));

describe('syncChannel command', () => {
  let interaction;

  beforeEach(() => {
    jest.clearAllMocks();

    interaction = {
      member: {
        permissions: {
            has: jest.fn().mockReturnValue(true)
        }
     },
      options: {
        getString: jest.fn().mockReturnValue('test-stoat-id')
      },
      channelId: 'test-discord-id',
      reply: jest.fn()
    };
  });

  test('should successfully sync channels', async () => {
    addChannelMapping.mockResolvedValueOnce();

    await execute(interaction);

    expect(interaction.options.getString).toHaveBeenCalledWith('stoatid');
    expect(addChannelMapping).toHaveBeenCalledWith('test-discord-id', 'test-stoat-id');
    expect(interaction.reply).toHaveBeenCalledWith({
      content: '✅ Successfully synced this Discord channel with Stoat Channel ID: `test-stoat-id`',
      ephemeral: true
    });
  });

  test('should handle errors when syncing channels', async () => {
    const mockError = new Error('Test error');
    addChannelMapping.mockRejectedValueOnce(mockError);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await execute(interaction);

    expect(consoleSpy).toHaveBeenCalledWith('Error syncing channels:', mockError);
    expect(interaction.reply).toHaveBeenCalledWith({
      content: '❌ Failed to sync channels. Please check the logs.',
      ephemeral: true
    });

    consoleSpy.mockRestore();
  });

  test('should reject non-admin users', async () => {
    // Mock interaction without admin permissions
    const nonAdminInteraction = {
      member: {
        permissions: {
          has: jest.fn().mockReturnValue(false)
        }
      },
      options: {
        getString: jest.fn().mockReturnValue('test-stoat-id')
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
    expect(addChannelMapping).not.toHaveBeenCalled();
  });

  test('should allow admin users', async () => {
    // Mock interaction with admin permissions
    const adminInteraction = {
      member: {
        permissions: {
          has: jest.fn().mockReturnValue(true)
        }
      },
      options: {
        getString: jest.fn().mockReturnValue('test-stoat-id')
      },
      channelId: 'test-discord-id',
      reply: jest.fn()
    };

    addChannelMapping.mockResolvedValueOnce();

    await execute(adminInteraction);

    expect(adminInteraction.member.permissions.has).toHaveBeenCalledWith('Administrator');
    expect(addChannelMapping).toHaveBeenCalledWith('test-discord-id', 'test-stoat-id');
    expect(adminInteraction.reply).toHaveBeenCalledWith({
      content: '✅ Successfully synced this Discord channel with Stoat Channel ID: `test-stoat-id`',
      ephemeral: true
    });
  });
});