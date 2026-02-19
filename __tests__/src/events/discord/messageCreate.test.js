import { shouldMirrorChannel, isBotMessage } from '../../../../src/utils/channelUtils.js';
import * as messageHandler from '../../../../src/messageHandler.js';
import messageCreate from '../../../../src/events/discord/messageCreate.js';

// Mock the dependencies
jest.mock('../../../../src/utils/channelUtils.js');
jest.mock('../../../../src/messageHandler.js');

describe('messageCreate event handler', () => {
    const mockConfig = {
        CHANNEL_MAPPING: {
            'discord-channel-1': 'stoat-channel-1',
            'discord-channel-2': 'stoat-channel-2'
        }
    };

    const mockMessage = {
        channelId: 'discord-channel-1',
        id: 'message-123',
        author: { bot: false }
    };

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();
        messageHandler.discordToStoatMapping.clear();
    });

    it('should return early if channel should not be mirrored', async () => {
        shouldMirrorChannel.mockReturnValue(false);

        await messageCreate(mockMessage, mockConfig);

        expect(shouldMirrorChannel).toHaveBeenCalledWith(
            mockMessage.channelId,
            mockConfig,
            false
        );
        expect(isBotMessage).not.toHaveBeenCalled();
        expect(messageHandler.sendMessageToStoat).not.toHaveBeenCalled();
    });

    it('should return early if message is from a bot', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        isBotMessage.mockReturnValue(true);

        await messageCreate(mockMessage, mockConfig);

        expect(isBotMessage).toHaveBeenCalledWith(mockMessage, false);
        expect(messageHandler.sendMessageToStoat).not.toHaveBeenCalled();
    });

    it('should send message to Stoat and store mapping when conditions are met', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        isBotMessage.mockReturnValue(false);
        messageHandler.sendMessageToStoat.mockResolvedValue('stoat-message-456');

        await messageCreate(mockMessage, mockConfig);

        expect(messageHandler.sendMessageToStoat).toHaveBeenCalledWith(
            mockMessage,
            mockConfig.CHANNEL_MAPPING[mockMessage.channelId],
            mockConfig
        );

        // Verify the mapping was stored correctly
        const channelMap = messageHandler.discordToStoatMapping.get(mockMessage.channelId);
        expect(channelMap).toBeDefined();
        expect(channelMap.get(mockMessage.id)).toBe('stoat-message-456');
    });

    it('should not store mapping if sendMessageToStoat returns falsy value', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        isBotMessage.mockReturnValue(false);
        messageHandler.sendMessageToStoat.mockResolvedValue(null);

        await messageCreate(mockMessage, mockConfig);

        expect(messageHandler.discordToStoatMapping.get(mockMessage.channelId)).toBeUndefined();
    });

    it('should initialize channel map if it does not exist', async () => {
        shouldMirrorChannel.mockReturnValue(true);
        isBotMessage.mockReturnValue(false);
        messageHandler.sendMessageToStoat.mockResolvedValue('stoat-message-789');

        // Verify the map is initialized when it doesn't exist
        expect(messageHandler.discordToStoatMapping.has(mockMessage.channelId)).toBe(false);

        await messageCreate(mockMessage, mockConfig);

        expect(messageHandler.discordToStoatMapping.has(mockMessage.channelId)).toBe(true);
    });
});