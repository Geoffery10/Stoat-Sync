import { shouldMirrorChannel } from '../../../../src/utils/channelUtils.js';
import * as messageHandler from '../../../../src/messageHandler.js';
import messageDelete from '../../../../src/events/discord/messageDelete.js';

// Mock the dependencies
jest.mock('../../../../src/utils/channelUtils.js');
jest.mock('../../../../src/messageHandler.js');

describe('messageDelete event handler', () => {
    const mockConfig = {
        CHANNEL_MAPPING: {
            'discord-channel-1': 'stoat-channel-1',
            'discord-channel-2': 'stoat-channel-2'
        }
    };

    const mockMessage = {
        channelId: 'discord-channel-1',
        id: 'message-123'
    };

    beforeEach(() => {
        jest.clearAllMocks();
        // Initialize a real Map for testing
        messageHandler.discordToStoatMapping = new Map();
    });

    it('should return early if channel should not be mirrored', async () => {
        shouldMirrorChannel.mockReturnValue(false);

        await messageDelete(mockMessage, mockConfig);

        expect(shouldMirrorChannel).toHaveBeenCalledWith(
            mockMessage.channelId,
            mockConfig,
            false
        );
        expect(messageHandler.deleteMessageInStoat).not.toHaveBeenCalled();
    });

    it('should return early if no mapping exists for the message', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        // Don't add anything to the mapping

        await messageDelete(mockMessage, mockConfig);

        expect(messageHandler.deleteMessageInStoat).not.toHaveBeenCalled();
    });

    it('should return early if message ID is not in the channel mapping', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        // Add a different message to the mapping
        const mockChannelMap = new Map([['other-message', 'stoat-message-123']]);
        messageHandler.discordToStoatMapping.set(mockMessage.channelId, mockChannelMap);

        await messageDelete(mockMessage, mockConfig);

        expect(messageHandler.deleteMessageInStoat).not.toHaveBeenCalled();
    });

    it('should delete message in Stoat and remove from mapping when successful', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        const mockChannelMap = new Map([['message-123', 'stoat-message-456']]);
        messageHandler.discordToStoatMapping.set(mockMessage.channelId, mockChannelMap);
        messageHandler.deleteMessageInStoat.mockResolvedValue(true);

        await messageDelete(mockMessage, mockConfig);

        expect(messageHandler.deleteMessageInStoat).toHaveBeenCalledWith(
            mockConfig.CHANNEL_MAPPING[mockMessage.channelId],
            'stoat-message-456',
            mockConfig
        );
        expect(mockChannelMap.has(mockMessage.id)).toBe(false);
    });

    it('should not remove from mapping if deletion in Stoat fails', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        const mockChannelMap = new Map([['message-123', 'stoat-message-456']]);
        messageHandler.discordToStoatMapping.set(mockMessage.channelId, mockChannelMap);
        messageHandler.deleteMessageInStoat.mockResolvedValue(false);

        await messageDelete(mockMessage, mockConfig);

        expect(mockChannelMap.has(mockMessage.id)).toBe(true);
    });
});