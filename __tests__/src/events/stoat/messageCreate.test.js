jest.mock('../../../../bot.js', () => ({
  discordClient: {
    channels: {
      fetch: jest.fn()
    }
  }
}));

import { shouldMirrorChannel, isBotMessage } from '../../../../src/utils/channelUtils.js';
import * as messageHandler from '../../../../src/messageHandler.js';
import { discordClient } from '../../../../bot.js';
import { logger } from '../../../../src/logger.js';
import messageCreate from '../../../../src/events/stoat/messageCreate.js';

// Mock the dependencies
jest.mock('../../../../bot.js');
jest.mock('../../../../src/utils/channelUtils.js');
jest.mock('../../../../src/messageHandler.js');
jest.mock('../../../../src/logger.js');

describe('Stoat messageCreate event handler', () => {
    const mockConfig = {
        STOAT_TO_DISCORD_MAPPING: {
            'stoat-channel-1': 'discord-channel-1',
            'stoat-channel-2': 'discord-channel-2'
        }
    };

    const mockMessage = {
        channelId: 'stoat-channel-1',
        id: 'stoat-message-123',
        author: { id: 'user-456' },
        content: 'Test message'
    };

    const mockDiscordChannel = {
        id: 'discord-channel-1',
        send: jest.fn()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        messageHandler.stoatToDiscordMapping.clear();
        discordClient.channels.fetch.mockResolvedValue(mockDiscordChannel);
    });

    it('should return early if channel should not be mirrored', async () => {
        shouldMirrorChannel.mockReturnValue(false);

        await messageCreate(mockMessage, mockConfig);

        expect(shouldMirrorChannel).toHaveBeenCalledWith(
            mockMessage.channelId,
            mockConfig,
            true
        );
        expect(isBotMessage).not.toHaveBeenCalled();
        expect(discordClient.channels.fetch).not.toHaveBeenCalled();
    });

    it('should return early if message is from a bot', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        isBotMessage.mockReturnValue(true);

        await messageCreate(mockMessage, mockConfig);

        expect(isBotMessage).toHaveBeenCalledWith(mockMessage, mockConfig, true);
        expect(discordClient.channels.fetch).not.toHaveBeenCalled();
    });

    it('should ignore messages from Discord-Restore Bot', async () => {
        const restoreBotMessage = {
            ...mockMessage,
            author: { id: "01KH706FEP6ZVDTD0Y99W3FVEZ" }
        };

        await messageCreate(restoreBotMessage, mockConfig);

        expect(discordClient.channels.fetch).not.toHaveBeenCalled();
    });

    it('should return early if Discord channel cannot be fetched', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        isBotMessage.mockReturnValue(false);
        discordClient.channels.fetch.mockResolvedValue(null);

        await messageCreate(mockMessage, mockConfig);

        expect(discordClient.channels.fetch).toHaveBeenCalledWith(
            mockConfig.STOAT_TO_DISCORD_MAPPING[mockMessage.channelId]
        );
        expect(messageHandler.sendMessageToDiscord).not.toHaveBeenCalled();
    });

    it('should log error when Discord channel fetch fails', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        isBotMessage.mockReturnValue(false);
        const error = new Error('Fetch failed');
        discordClient.channels.fetch.mockRejectedValue(error);

        await messageCreate(mockMessage, mockConfig);

        expect(logger.error).toHaveBeenCalledWith(
            `Error fetching Discord channel: ${error.message}`
        );
    });

    it('should send message to Discord and store mapping when successful', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        isBotMessage.mockReturnValue(false);
        const mockSentMessage = { id: 'discord-message-789' };
        messageHandler.sendMessageToDiscord.mockResolvedValue(mockSentMessage);

        await messageCreate(mockMessage, mockConfig);

        expect(messageHandler.sendMessageToDiscord).toHaveBeenCalledWith(
            mockMessage,
            mockDiscordChannel,
            mockConfig
        );
        expect(messageHandler.stoatToDiscordMapping.get(mockMessage.id)).toBe(mockSentMessage.id);
    });

    it('should not store mapping if sendMessageToDiscord returns null', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        isBotMessage.mockReturnValue(false);
        messageHandler.sendMessageToDiscord.mockResolvedValue(null);

        await messageCreate(mockMessage, mockConfig);

        expect(messageHandler.stoatToDiscordMapping.get(mockMessage.id)).toBeUndefined();
    });
});