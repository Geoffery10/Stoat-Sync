import { shouldMirrorChannel, isBotMessage } from '../../../src/utils/channelUtils.js';

describe('shouldMirrorChannel', () => {
  const mockConfig = {
    STOAT_TO_DISCORD_MAPPING: {
      'stoat-channel-1': 'discord-channel-1',
      'stoat-channel-2': 'discord-channel-2'
    },
    CHANNEL_MAPPING: {
      'discord-channel-1': 'stoat-channel-1',
      'discord-channel-2': 'stoat-channel-2'
    }
  };

  test('returns true for mapped Stoat channel', () => {
    expect(shouldMirrorChannel('stoat-channel-1', mockConfig, true)).toBe(true);
  });

  test('returns false for unmapped Stoat channel', () => {
    expect(shouldMirrorChannel('stoat-channel-3', mockConfig, true)).toBe(false);
  });

  test('returns true for mapped Discord channel', () => {
    expect(shouldMirrorChannel('discord-channel-1', mockConfig, false)).toBe(true);
  });

  test('returns false for unmapped Discord channel', () => {
    expect(shouldMirrorChannel('discord-channel-3', mockConfig, false)).toBe(false);
  });
});

describe('isBotMessage', () => {
  const mockConfig = {
    STOAT_BOT_ID: 'stoat-bot-123',
    DISCORD_BOT_ID: 'discord-bot-456'
  };

  const mockMessage = (authorId, webhookId = null, applicationId = null) => ({
    author: { id: authorId },
    webhookId,
    applicationId
  });

  test('returns true for Stoat bot message', () => {
    expect(isBotMessage(mockMessage('stoat-bot-123'), mockConfig, true)).toBe(true);
  });

  test('returns true for Discord-Restore bot message', () => {
    expect(isBotMessage(mockMessage('01KH706FEP6ZVDTD0Y99W3FVEZ'), mockConfig, true)).toBe(true);
  });

  test('returns false for non-bot Stoat message', () => {
    expect(isBotMessage(mockMessage('user-123'), mockConfig, true)).toBe(false);
  });

  test('returns true for Discord bot user message', () => {
    expect(isBotMessage(mockMessage('discord-bot-456'), mockConfig, false)).toBe(true);
  });

  test('returns true for webhook message from this bot', () => {
    expect(isBotMessage(mockMessage('user-123', 'webhook-123', 'discord-bot-456'), mockConfig, false)).toBe(true);
  });

  test('returns false for webhook message from other bot', () => {
    expect(isBotMessage(mockMessage('user-123', 'webhook-123', 'other-bot-789'), mockConfig, false)).toBe(false);
  });

  test('returns false for regular user message', () => {
    expect(isBotMessage(mockMessage('user-123'), mockConfig, false)).toBe(false);
  });
});