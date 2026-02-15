import { loadChannelMappings } from '../config';
import fs from 'fs/promises';
import yaml from 'js-yaml';

jest.mock('fs/promises');
jest.mock('js-yaml');

describe('loadChannelMappings', () => {
  const mockYamlContent = {
    'discord1': 'stoat1',
    'discord2': 'stoat2'
  };

  beforeEach(() => {
    fs.readFile.mockResolvedValue('discord1: stoat1\ndiscord2: stoat2');
    yaml.load.mockReturnValue(mockYamlContent);
  });

  it('should load and parse channel mappings correctly', async () => {
    const result = await loadChannelMappings();

    expect(result.CHANNEL_MAPPING).toEqual(mockYamlContent);
    expect(result.STOAT_TO_DISCORD_MAPPING).toEqual({
      'stoat1': 'discord1',
      'stoat2': 'discord2'
    });
  });

  it('should handle empty channel mappings', async () => {
    fs.readFile.mockResolvedValueOnce('');
    yaml.load.mockReturnValueOnce({});

    const result = await loadChannelMappings();
    expect(result.CHANNEL_MAPPING).toEqual({});
    expect(result.STOAT_TO_DISCORD_MAPPING).toEqual({});
  });

  it('should throw error when file cannot be read', async () => {
    fs.readFile.mockRejectedValueOnce(new Error('File not found'));
    await expect(loadChannelMappings()).rejects.toThrow('File not found');
  });
});