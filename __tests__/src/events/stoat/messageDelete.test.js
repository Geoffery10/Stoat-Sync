jest.mock('../../../../bot.js', () => ({
  discordClient: {
    channels: {
      fetch: jest.fn()
    }
  }
}));

import { shouldMirrorChannel } from '../../../../src/utils/channelUtils.js';
import * as messageHandler from '../../../../src/messageHandler.js';
import { discordClient } from '../../../../bot.js';
import { logger } from '../../../../src/logger.js';
import messageDelete from '../../../../src/events/stoat/messageDelete.js';

// Mock the dependencies
jest.mock('../../../../bot.js');
jest.mock('../../../../src/utils/channelUtils.js');
jest.mock('../../../../src/messageHandler.js');
jest.mock('../../../../src/logger.js');

describe('Stoat messageDelete event handler', () => {
    const mockConfig = {
        STOAT_TO_DISCORD_MAPPING: {
            'stoat-channel-1': 'discord-channel-1',
            'stoat-channel-2': 'discord-channel-2'
        }
    };

    const mockMessage = {
        channelId: 'stoat-channel-1',
        id: 'stoat-message-123'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Initialize a real Map for testing
        messageHandler.stoatToDiscordMapping = new Map();
    });

    it('should return early if channel should not be mirrored', async () => {
        shouldMirrorChannel.mockReturnValue(false);

        await messageDelete(mockMessage, mockConfig);

        expect(shouldMirrorChannel).toHaveBeenCalledWith(
            mockMessage.channelId,
            mockConfig,
            true
        );
        expect(discordClient.channels.fetch).not.toHaveBeenCalled();
        expect(messageHandler.deleteMessageInDiscord).not.toHaveBeenCalled();
    });

    it('should return early if no Discord message ID mapping exists', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        // Don't add anything to the mapping

        await messageDelete(mockMessage, mockConfig);

        expect(discordClient.channels.fetch).not.toHaveBeenCalled();
        expect(messageHandler.deleteMessageInDiscord).not.toHaveBeenCalled();
    });

    it('should return early if Discord channel fetch fails', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        messageHandler.stoatToDiscordMapping.set(mockMessage.id, 'discord-message-456');
        discordClient.channels.fetch.mockResolvedValue(null);

        await messageDelete(mockMessage, mockConfig);

        expect(discordClient.channels.fetch).toHaveBeenCalledWith(
            mockConfig.STOAT_TO_DISCORD_MAPPING[mockMessage.channelId]
        );
        expect(messageHandler.deleteMessageInDiscord).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
            `Could not find Discord channel with ID ${mockConfig.STOAT_TO_DISCORD_MAPPING[mockMessage.channelId]}`
        );
    });

    it('should delete message in Discord when all conditions are met', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        messageHandler.stoatToDiscordMapping.set(mockMessage.id, 'discord-message-456');
        const mockDiscordChannel = { id: 'discord-channel-1' };
        discordClient.channels.fetch.mockResolvedValue(mockDiscordChannel);
        messageHandler.deleteMessageInDiscord.mockResolvedValue(true);

        await messageDelete(mockMessage, mockConfig);

        expect(discordClient.channels.fetch).toHaveBeenCalledWith(
            mockConfig.STOAT_TO_DISCORD_MAPPING[mockMessage.channelId]
        );
        expect(messageHandler.deleteMessageInDiscord).toHaveBeenCalledWith(
            mockDiscordChannel,
            'discord-message-456',
            mockMessage.id
        );
    });

    it('should log error if Discord message deletion fails', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        messageHandler.stoatToDiscordMapping.set(mockMessage.id, 'discord-message-456');
        const mockDiscordChannel = { id: 'discord-channel-1' };
        discordClient.channels.fetch.mockResolvedValue(mockDiscordChannel);
        const mockError = new Error('Deletion failed');
        messageHandler.deleteMessageInDiscord.mockRejectedValue(mockError);

        await messageDelete(mockMessage, mockConfig);

        expect(logger.error).toHaveBeenCalledWith(
            `Failed to delete message in Discord: ${mockError.message}`
        );
    });
});