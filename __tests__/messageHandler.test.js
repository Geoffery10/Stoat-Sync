import { uploadAttachmentToStoat, createOrGetWebhook } from '../messageHandler.js';
import axios from 'axios';
import fs from 'fs/promises';
import FormData from 'form-data';
import { logger } from '../logger.js';

// Mock dependencies
jest.mock('axios');
jest.mock('fs/promises');
jest.mock('form-data');
jest.mock('../logger.js');

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