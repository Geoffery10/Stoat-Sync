import { shouldMirrorChannel, isBotMessage, discordClient } from '../../../../bot.js';
import * as messageHandler from '../../../src/messageHandler.js';
import * as config from '../../../src/config.js';
import { logger } from '../../../src/logger.js';
import messageCreate from '../../../src/events/stoat/messageCreate.js';

// Mock dependencies
jest.mock('../../../../bot.js');
jest.mock('../messageHandler.js');
jest.mock('../config.js');
jest.mock('../logger.js');

describe('messageCreate', () => {
  const mockMessage = {
    channelId: 'test-channel',
    author: { id: 'test-author' },
    id: 'test-message-id',
    content: 'test message'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return early if channel should not be mirrored', async () => {
    shouldMirrorChannel.mockReturnValue(false);
    await messageCreate(mockMessage);
    expect(getDiscordChannel).not.toHaveBeenCalled();
  });

  it('should return early if message is from bot', async () => {
    shouldMirrorChannel.mockReturnValue(true);
    isBotMessage.mockReturnValue(true);
    await messageCreate(mockMessage);
    expect(getDiscordChannel).not.toHaveBeenCalled();
  });

  it('should return early if message is from Discord-Restore Bot', async () => {
    shouldMirrorChannel.mockReturnValue(true);
    isBotMessage.mockReturnValue(false);
    mockMessage.author.id = "01KH706FEP6ZVDTD0Y99W3FVEZ";
    await messageCreate(mockMessage);
    expect(getDiscordChannel).not.toHaveBeenCalled();
  });

  it('should send message to Discord when conditions are met', async () => {
    shouldMirrorChannel.mockReturnValue(true);
    isBotMessage.mockReturnValue(false);
    config.STOAT_TO_DISCORD_MAPPING = { 'test-channel': 'discord-channel-id' };
    discordClient.channels.fetch.mockResolvedValue({ id: 'discord-channel-id' });
    messageHandler.sendMessageToDiscord.mockResolvedValue({ id: 'discord-message-id' });

    await messageCreate(mockMessage);

    expect(discordClient.channels.fetch).toHaveBeenCalledWith('discord-channel-id');
    expect(messageHandler.sendMessageToDiscord).toHaveBeenCalledWith(
      mockMessage,
      { id: 'discord-channel-id' },
      config
    );
    expect(messageHandler.stoatToDiscordMapping.set).toHaveBeenCalledWith(
      'test-message-id',
      'discord-message-id'
    );
  });

  it('should handle errors when fetching Discord channel', async () => {
    shouldMirrorChannel.mockReturnValue(true);
    isBotMessage.mockReturnValue(false);
    config.STOAT_TO_DISCORD_MAPPING = { 'test-channel': 'invalid-channel-id' };
    discordClient.channels.fetch.mockRejectedValue(new Error('Channel not found'));

    await messageCreate(mockMessage);

    expect(logger.error).toHaveBeenCalled();
    expect(messageHandler.sendMessageToDiscord).not.toHaveBeenCalled();
  });
});