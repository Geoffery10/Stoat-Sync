import { execute } from '../../../src/commands/isSynced.js';
import * as config from '../../../src/config.js';

jest.mock('../../../src/config.js', () => ({
  CHANNEL_MAPPING: {}
}));

describe('is-synced command', () => {
    let interaction;

    beforeEach(() => {
        interaction = {
            channelId: 'test-discord-channel-id',
            reply: jest.fn().mockResolvedValue(true)
        };

        for (const key in config.CHANNEL_MAPPING) {
            delete config.CHANNEL_MAPPING[key];
        }
        
        jest.clearAllMocks();
    });

    it('should confirm sync status when channel is mapped', async () => {
        config.CHANNEL_MAPPING['test-discord-channel-id'] = 'mapped-stoat-id';

        await execute(interaction);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: '✅ This channel is synced with Stoat Channel ID: `mapped-stoat-id`',
            ephemeral: true
        });
    });

    it('should inform user when channel is not mapped', async () => {
        await execute(interaction);

        expect(interaction.reply).toHaveBeenCalledWith({
            content: 'ℹ️ This channel is not currently synced with any Stoat channel.',
            ephemeral: true
        });
    });

    it('should handle errors gracefully', async () => {
        const simulatedError = new Error('Simulated API failure');
        interaction.reply.mockRejectedValueOnce(simulatedError);
        
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        await execute(interaction);

        expect(consoleSpy).toHaveBeenCalledWith('Error checking sync status:', simulatedError);
        
        expect(interaction.reply).toHaveBeenCalledTimes(2);
        expect(interaction.reply).toHaveBeenLastCalledWith({
            content: '❌ Failed to check sync status. Please check the logs.',
            ephemeral: true
        });

        consoleSpy.mockRestore();
    });
});