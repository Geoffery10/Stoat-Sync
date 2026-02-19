import { uploadAttachmentToStoat } from '../../src/messageHandler.js';
import axios from 'axios';
import fs from 'fs/promises';
import FormData from 'form-data';
import { logger } from '../../src/logger.js';
import { sendMessageToDiscord, editMessageInDiscord, deleteMessageInDiscord,
         sendMessageToStoat, editMessageInStoat, deleteMessageInStoat } from '../../src/messageHandler.js';
import { formatMessageForDiscord, formatMessageForStoat } from '../../src/messageFormatter.js';
import { createOrGetWebhook } from '../../src/webhookHandler.js';

// Mock dependencies
jest.mock('axios');
jest.mock('fs/promises');
jest.mock('form-data');
jest.mock('../../src/logger.js');
jest.mock('../../src/messageFormatter.js');
jest.mock('../../src/webhookHandler.js');

describe('uploadAttachmentToStoat', () => {
  const mockFilePath = '/tmp/test-file.txt';
  const mockStoatAutumnUrl = 'https://autumn.example.com';
  const mockStoatBotToken = 'test-token';
  const mockFileContent = Buffer.from('test content');
  const mockResponseId = 'attachment-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return null when file does not exist', async () => {
    fs.access.mockRejectedValue(new Error('File not found'));

    const result = await uploadAttachmentToStoat(mockFilePath, mockStoatAutumnUrl, mockStoatBotToken);

    expect(result).toBeNull();
    expect(logger.info).toHaveBeenCalledWith(`[!] Attachment not found locally: ${mockFilePath}`);
  });

  it('should successfully upload file and return attachment ID', async () => {
    // Mock file existence
    fs.access.mockResolvedValue();

    // Mock file read
    fs.readFile.mockResolvedValue(mockFileContent);

    // Mock FormData
    const mockForm = {
      append: jest.fn(),
      getHeaders: jest.fn().mockReturnValue({ 'content-type': 'multipart/form-data' })
    };
    FormData.mockReturnValue(mockForm);

    // Mock axios response
    axios.post.mockResolvedValue({
      data: { id: mockResponseId }
    });

    const result = await uploadAttachmentToStoat(mockFilePath, mockStoatAutumnUrl, mockStoatBotToken);

    expect(result).toBe(mockResponseId);
    expect(fs.readFile).toHaveBeenCalledWith(mockFilePath);
    expect(mockForm.append).toHaveBeenCalledWith('file', mockFileContent, {
      filename: 'test-file.txt',
      contentType: 'application/octet-stream'
    });
    expect(axios.post).toHaveBeenCalledWith(
      `${mockStoatAutumnUrl}/attachments`,
      mockForm,
      {
        headers: {
          ...mockForm.getHeaders(),
          'x-bot-token': mockStoatBotToken
        }
      }
    );
  });

  it('should return null and log error when upload fails', async () => {
    const mockError = new Error('Upload failed');
    fs.access.mockResolvedValue();
    fs.readFile.mockResolvedValue(mockFileContent);
    axios.post.mockRejectedValue(mockError);

    const result = await uploadAttachmentToStoat(mockFilePath, mockStoatAutumnUrl, mockStoatBotToken);

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith(`[!] Error uploading file: ${mockError.message}`);
  });

  it('should handle missing response data gracefully', async () => {
    fs.access.mockResolvedValue();
    fs.readFile.mockResolvedValue(mockFileContent);
    axios.post.mockResolvedValue({});

    const result = await uploadAttachmentToStoat(mockFilePath, mockStoatAutumnUrl, mockStoatBotToken);

    expect(result).toBeNull();
  });
});


describe('sendMessageToDiscord', () => {
  const mockMessage = {
    content: 'Test message',
    author: {
      username: 'TestUser',
      avatar: 'avatar.jpg',
      get avatarURL() { return 'avatar.jpg' } // Change to a getter
    },
    attachments: [{ id: 'att1', name: 'file.txt' }]
  };
  const mockDiscordChannel = { id: 'channel123' };
  const mockConfig = {
    STOAT_BASE_URL: 'https://stoat.example.com',
    STOAT_BOT_TOKEN: 'token123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send a message to Discord with attachments', async () => {
    const mockWebhook = { send: jest.fn().mockResolvedValue({ id: 'msg123' }) };
    createOrGetWebhook.mockResolvedValue(mockWebhook);
    formatMessageForDiscord.mockResolvedValue('Formatted message');
    global.fetch = jest.fn().mockResolvedValue({
      arrayBuffer: jest.fn().mockResolvedValue(Buffer.from('file content'))
    });

    const result = await sendMessageToDiscord(mockMessage, mockDiscordChannel, mockConfig);

    expect(formatMessageForDiscord).toHaveBeenCalledWith(mockMessage, mockConfig);
    expect(createOrGetWebhook).toHaveBeenCalledWith(mockDiscordChannel);
    expect(mockWebhook.send).toHaveBeenCalledWith(expect.objectContaining({
      content: 'Formatted message',
      username: 'TestUser',
      avatarURL: 'avatar.jpg' // This will now match
    }));
    expect(result).toEqual({ id: 'msg123' });
  });

  it('should handle errors when sending message', async () => {
    createOrGetWebhook.mockResolvedValue(null);

    const result = await sendMessageToDiscord(mockMessage, mockDiscordChannel, mockConfig);

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalledWith('Failed to get or create webhook');
  });
});


describe('editMessageInDiscord', () => {
  const mockDiscordChannel = {
    messages: {
      fetch: jest.fn()
    }
  };
  const mockDiscordMessage = {
    id: 'msg123',
    webhookId: 'hook123',
    edit: jest.fn()
  };
  const mockMessage = {
    content: 'Updated message',
    author: { username: 'TestUser' }
  };
  const mockConfig = {};

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should edit a webhook message', async () => {
    const mockWebhook = {
      editMessage: jest.fn().mockResolvedValue(true)
    };
    mockDiscordChannel.messages.fetch.mockResolvedValue(mockDiscordMessage);
    createOrGetWebhook.mockResolvedValue(mockWebhook);
    formatMessageForDiscord.mockResolvedValue('Formatted updated message');

    const result = await editMessageInDiscord(mockDiscordChannel, 'msg123', mockMessage, mockConfig);

    expect(mockDiscordChannel.messages.fetch).toHaveBeenCalledWith('msg123');
    expect(mockWebhook.editMessage).toHaveBeenCalledWith('msg123', expect.objectContaining({
      content: 'Formatted updated message'
    }));
    expect(result).toBe(true);
  });

  it('should edit a regular message when not from webhook', async () => {
    mockDiscordMessage.webhookId = null;
    mockDiscordChannel.messages.fetch.mockResolvedValue(mockDiscordMessage);
    formatMessageForDiscord.mockResolvedValue('Formatted updated message');

    const result = await editMessageInDiscord(mockDiscordChannel, 'msg123', mockMessage, mockConfig);

    expect(mockDiscordMessage.edit).toHaveBeenCalledWith('Formatted updated message');
    expect(result).toBe(true);
  });
});


describe('deleteMessageInDiscord', () => {
  const mockDiscordChannel = {
    messages: {
      fetch: jest.fn()
    }
  };
  const mockDiscordMessage = {
    id: 'msg123',
    delete: jest.fn().mockResolvedValue(true)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete a message and remove from mapping', async () => {
    mockDiscordChannel.messages.fetch.mockResolvedValue(mockDiscordMessage);

    const result = await deleteMessageInDiscord(mockDiscordChannel, 'msg123', 'stoatMsg123');

    expect(mockDiscordChannel.messages.fetch).toHaveBeenCalledWith('msg123');
    expect(mockDiscordMessage.delete).toHaveBeenCalled();
    expect(result).toBe(true);
  });
});


describe('sendMessageToStoat', () => {
  const mockMessage = {
    content: 'Test message',
    author: {
      username: 'TestUser',
      avatar: 'author-avatar.jpg',
      avatarURL: jest.fn().mockReturnValue('author-avatar.jpg')
    },
    member: {
      avatar: 'member-avatar.jpg',
      avatarURL: jest.fn().mockReturnValue('member-avatar.jpg')
    },
    attachments: new Map([['att1', { id: 'att1', name: 'file.txt', url: 'https://example.com/file.txt' }]])
  };
  const mockConfig = {
    STOAT_API_URL: 'https://api.stoat.example.com',
    STOAT_AUTUMN_URL: 'https://autumn.stoat.example.com',
    STOAT_BOT_TOKEN: 'token123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send a message to Stoat with attachments', async () => {
    formatMessageForStoat.mockResolvedValue('Formatted message');
    axios.get.mockResolvedValue({ data: Buffer.from('file content') });
    axios.post.mockResolvedValue({ data: { _id: 'stoatMsg123' } });
    fs.writeFile.mockResolvedValue();
    fs.unlink.mockResolvedValue();

    const result = await sendMessageToStoat(mockMessage, 'stoatChannel123', mockConfig);

    expect(formatMessageForStoat).toHaveBeenCalledWith(mockMessage, mockConfig);
    expect(axios.post).toHaveBeenCalledWith(
      'https://api.stoat.example.com/channels/stoatChannel123/messages',
      expect.objectContaining({
        content: 'Formatted message',
        masquerade: {
          name: 'TestUser',
          avatar: 'member-avatar.jpg'
        }
      }),
      expect.any(Object)
    );
    expect(result).toBe('stoatMsg123');
  });
});


describe('editMessageInStoat', () => {
  const mockMessage = {
    content: 'Updated message'
  };
  const mockConfig = {
    STOAT_API_URL: 'https://api.stoat.example.com',
    STOAT_BOT_TOKEN: 'token123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should edit a message in Stoat', async () => {
    formatMessageForStoat.mockResolvedValue('Formatted updated message');
    axios.patch.mockResolvedValue({});

    const result = await editMessageInStoat('stoatChannel123', 'stoatMsg123', mockMessage, mockConfig);

    expect(axios.patch).toHaveBeenCalledWith(
      'https://api.stoat.example.com/channels/stoatChannel123/messages/stoatMsg123',
      { content: 'Formatted updated message' },
      expect.any(Object)
    );
    expect(result).toBe(true);
  });
});


describe('deleteMessageInStoat', () => {
  const mockConfig = {
    STOAT_API_URL: 'https://api.stoat.example.com',
    STOAT_BOT_TOKEN: 'token123'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should delete a message in Stoat', async () => {
    axios.delete.mockResolvedValue({});

    const result = await deleteMessageInStoat('stoatChannel123', 'stoatMsg123', mockConfig);

    expect(axios.delete).toHaveBeenCalledWith(
      'https://api.stoat.example.com/channels/stoatChannel123/messages/stoatMsg123',
      expect.any(Object)
    );
    expect(result).toBe(true);
  });
});