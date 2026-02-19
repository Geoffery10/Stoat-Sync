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
import messageUpdate from '../../../../src/events/stoat/messageUpdate.js';

// Mock the dependencies
jest.mock('../../../../bot.js');
jest.mock('../../../../src/utils/channelUtils.js');
jest.mock('../../../../src/messageHandler.js');
jest.mock('../../../../src/logger.js');

describe('messageUpdate event handler', () => {
    const mockConfig = {
        STOAT_TO_DISCORD_MAPPING: {
            'stoat-channel-1': 'discord-channel-1',
            'stoat-channel-2': 'discord-channel-2'
        }
    };

    const mockOldMessage = {
        channelId: 'stoat-channel-1',
        id: 'stoat-message-123',
        content: 'Original message content'
    };

    const mockNewMessage = {
        channelId: 'stoat-channel-1',
        id: 'stoat-message-123',
        content: 'Updated message content'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        messageHandler.stoatToDiscordMapping.clear();
        discordClient.channels.fetch.mockResolvedValue({ id: 'discord-channel-1' });
    });

    it('should return early if channel should not be mirrored', async () => {
        shouldMirrorChannel.mockReturnValue(false);

        await messageUpdate(mockOldMessage, mockNewMessage, mockConfig);

        expect(shouldMirrorChannel).toHaveBeenCalledWith(
            mockOldMessage.channelId,
            mockConfig,
            true
        );
        expect(messageHandler.editMessageInDiscord).not.toHaveBeenCalled();
    });

    it('should return early if no Discord message ID mapping exists', async () => {
        shouldMirrorChannel.mockReturnValue(true);

        await messageUpdate(mockOldMessage, mockNewMessage, mockConfig);

        expect(messageHandler.editMessageInDiscord).not.toHaveBeenCalled();
    });

    it('should edit message in Discord when mapping exists', async () => {
        shouldMirrorChannel.mockReturnValue(true);

        // Set up the mapping
        messageHandler.stoatToDiscordMapping.set(mockNewMessage.id, 'discord-message-456');

        await messageUpdate(mockOldMessage, mockNewMessage, mockConfig);

        expect(discordClient.channels.fetch).toHaveBeenCalledWith(
            mockConfig.STOAT_TO_DISCORD_MAPPING[mockNewMessage.channelId]
        );
        expect(messageHandler.editMessageInDiscord).toHaveBeenCalledWith(
            expect.objectContaining({ id: 'discord-channel-1' }),
            'discord-message-456',
            mockOldMessage,
            mockConfig
        );
    });

    it('should handle error when Discord channel is not found', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        messageHandler.stoatToDiscordMapping.set(mockNewMessage.id, 'discord-message-456');
        discordClient.channels.fetch.mockResolvedValue(null);

        await messageUpdate(mockOldMessage, mockNewMessage, mockConfig);

        expect(logger.error).toHaveBeenCalledWith(
            `Could not find Discord channel with ID ${mockConfig.STOAT_TO_DISCORD_MAPPING[mockNewMessage.channelId]}`
        );
        expect(messageHandler.editMessageInDiscord).not.toHaveBeenCalled();
    });
});