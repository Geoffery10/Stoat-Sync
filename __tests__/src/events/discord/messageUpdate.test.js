import { shouldMirrorChannel, isBotMessage } from '../../../../src/utils/channelUtils.js';
import * as messageHandler from '../../../../src/messageHandler.js';
import messageUpdate from '../../../../src/events/discord/messageUpdate.js';

// Mock the dependencies
jest.mock('../../../../src/utils/channelUtils.js');
jest.mock('../../../../src/messageHandler.js');

describe('messageUpdate event handler', () => {
    const mockConfig = {
        CHANNEL_MAPPING: {
            'discord-channel-1': 'stoat-channel-1',
            'discord-channel-2': 'stoat-channel-2'
        }
    };

    const mockMessage = {
        channelId: 'discord-channel-1',
        id: 'message-123',
        author: { bot: false },
        content: 'Updated message content'
    };

    beforeEach(() => {
        // Clear all mocks and reset the mapping before each test
        jest.clearAllMocks();
        messageHandler.discordToStoatMapping.clear();
    });

    it('should return early if channel should not be mirrored', async () => {
        shouldMirrorChannel.mockReturnValue(false);

        await messageUpdate(mockMessage, mockConfig);

        expect(shouldMirrorChannel).toHaveBeenCalledWith(
            mockMessage.channelId,
            mockConfig,
            false
        );
        expect(isBotMessage).not.toHaveBeenCalled();
        expect(messageHandler.editMessageInStoat).not.toHaveBeenCalled();
    });

    it('should return early if message is from a bot', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        isBotMessage.mockReturnValue(true);

        await messageUpdate(mockMessage, mockConfig);

        expect(isBotMessage).toHaveBeenCalledWith(mockMessage, false);
        expect(messageHandler.editMessageInStoat).not.toHaveBeenCalled();
    });

    it('should return early if no mapping exists for the message', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        isBotMessage.mockReturnValue(false);

        // Don't set up any mapping
        await messageUpdate(mockMessage, mockConfig);

        expect(messageHandler.editMessageInStoat).not.toHaveBeenCalled();
    });

    it('should edit message in Stoat when mapping exists', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        isBotMessage.mockReturnValue(false);

        // Set up the mapping
        const channelMap = new Map();
        channelMap.set(mockMessage.id, 'stoat-message-456');
        messageHandler.discordToStoatMapping.set(mockMessage.channelId, channelMap);

        await messageUpdate(mockMessage, mockConfig);

        expect(messageHandler.editMessageInStoat).toHaveBeenCalledWith(
            mockConfig.CHANNEL_MAPPING[mockMessage.channelId],
            'stoat-message-456',
            mockMessage,
            mockConfig
        );
    });

    it('should return early if message ID exists in channel map but no Stoat message ID', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        isBotMessage.mockReturnValue(false);

        // Set up mapping without the specific message
        const channelMap = new Map();
        channelMap.set('other-message-id', 'stoat-message-789');
        messageHandler.discordToStoatMapping.set(mockMessage.channelId, channelMap);

        await messageUpdate(mockMessage, mockConfig);

        expect(messageHandler.editMessageInStoat).not.toHaveBeenCalled();
    });
});