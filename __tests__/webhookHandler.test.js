import { createOrGetWebhook } from '../webhookHandler.js';
import { logger } from '../logger.js';

// Mock dependencies
jest.mock('../logger.js');

describe('createOrGetWebhook', () => {
  const mockChannelName = 'test-channel';
  const mockWebhookName = 'stoat-test-channel';
  const mockWebhook = {
    name: mockWebhookName,
    id: 'webhook-123',
    url: 'https://discord.com/api/webhooks/123/abc'
  };

  const mockChannel = {
    name: mockChannelName,
    fetchWebhooks: jest.fn(),
    createWebhook: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return existing webhook if one exists with the prefix', async () => {
    mockChannel.fetchWebhooks.mockResolvedValue([mockWebhook]);

    const result = await createOrGetWebhook(mockChannel);

    expect(result).toBe(mockWebhook);
    expect(mockChannel.fetchWebhooks).toHaveBeenCalled();
    expect(mockChannel.createWebhook).not.toHaveBeenCalled();
  });

  it('should create a new webhook if none exists with the prefix', async () => {
    mockChannel.fetchWebhooks.mockResolvedValue([]);
    mockChannel.createWebhook.mockResolvedValue(mockWebhook);

    const result = await createOrGetWebhook(mockChannel);

    expect(result).toBe(mockWebhook);
    expect(mockChannel.fetchWebhooks).toHaveBeenCalled();
    expect(mockChannel.createWebhook).toHaveBeenCalledWith({
      name: mockWebhookName,
      avatar: 'https://i.imgur.com/ykjd3JO.jpeg'
    });
  });

  it('should handle errors gracefully and return null', async () => {
    const mockError = new Error('Failed to fetch webhooks');
    mockChannel.fetchWebhooks.mockRejectedValue(mockError);

    const result = await createOrGetWebhook(mockChannel);

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(`Failed to create/get webhook: ${mockError.message}`);
  });
});