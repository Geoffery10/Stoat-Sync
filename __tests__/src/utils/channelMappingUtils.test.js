import fs from 'fs/promises';
import yaml from 'js-yaml';
import {
    ensureChannelMappingFileExists,
    loadChannelMappings,
    saveChannelMappings,
    addChannelMapping,
    removeChannelMapping,
    getStoatIdForDiscord,
    getDiscordIdForStoat
} from '../../../src/utils/channelMappingUtils';

jest.mock('fs/promises');
jest.mock('js-yaml');

const TEST_FILE = 'data/test_channel_mapping.yaml';

describe('channelMappingUtils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        
        // Setup default successful mock resolutions for the fs and yaml methods
        fs.access.mockResolvedValue(undefined);
        fs.readFile.mockResolvedValue('mocked_yaml_content');
        fs.writeFile.mockResolvedValue(undefined);
        
        yaml.load.mockReturnValue({});
        yaml.dump.mockReturnValue('mocked_dumped_content');
    });

    describe('ensureChannelMappingFileExists', () => {
        it('should do nothing if the mapping file exists', async () => {
            await ensureChannelMappingFileExists(TEST_FILE);
            
            expect(fs.access).toHaveBeenCalledWith(TEST_FILE);
            expect(fs.writeFile).not.toHaveBeenCalled();
        });

        it('should create an empty file if the mapping file does not exist', async () => {
            fs.access.mockRejectedValueOnce(new Error('ENOENT'));
            
            await ensureChannelMappingFileExists(TEST_FILE);
            
            expect(fs.access).toHaveBeenCalledWith(TEST_FILE);
            expect(fs.writeFile).toHaveBeenCalledWith(TEST_FILE, '');
        });

        it('should use default filename if none provided', async () => {
             await ensureChannelMappingFileExists();
             expect(fs.access).toHaveBeenCalledWith('data/channel_mapping.yaml');
        });
    });

    describe('loadChannelMappings', () => {
        it('should load mappings and create a reverse lookup mapping', async () => {
            yaml.load.mockReturnValueOnce({
                discord1: 'stoat1',
                discord2: 'stoat2'
            });

            const result = await loadChannelMappings(TEST_FILE);

            expect(fs.readFile).toHaveBeenCalledWith(TEST_FILE, 'utf8');
            expect(yaml.load).toHaveBeenCalledWith('mocked_yaml_content');
            expect(result.CHANNEL_MAPPING).toEqual({ discord1: 'stoat1', discord2: 'stoat2' });
            expect(result.STOAT_TO_DISCORD_MAPPING).toEqual({ stoat1: 'discord1', stoat2: 'discord2' });
        });

        it('should return empty mappings if yaml returns null or undefined', async () => {
            yaml.load.mockReturnValueOnce(null);

            const result = await loadChannelMappings(TEST_FILE);

            expect(result.CHANNEL_MAPPING).toEqual({});
            expect(result.STOAT_TO_DISCORD_MAPPING).toEqual({});
        });

        it('should catch errors, log them, and return empty mappings', async () => {
            const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            fs.readFile.mockRejectedValueOnce(new Error('Read failed'));

            const result = await loadChannelMappings(TEST_FILE);

            expect(consoleSpy).toHaveBeenCalledWith('Failed to load channel mappings:', expect.any(Error));
            expect(result.CHANNEL_MAPPING).toEqual({});
            expect(result.STOAT_TO_DISCORD_MAPPING).toEqual({});

            consoleSpy.mockRestore();
        });
    });

    describe('saveChannelMappings', () => {
        it('should dump yaml and write it to the file', async () => {
            const mappings = { discord1: 'stoat1' };
            yaml.dump.mockReturnValueOnce('discord1: stoat1\n');

            await saveChannelMappings(mappings, TEST_FILE);

            expect(yaml.dump).toHaveBeenCalledWith(mappings);
            expect(fs.writeFile).toHaveBeenCalledWith(TEST_FILE, 'discord1: stoat1\n');
        });
    });

    describe('addChannelMapping', () => {
        it('should add a new mapping and save to file', async () => {
            yaml.load.mockReturnValueOnce({ discord1: 'stoat1' });

            const result = await addChannelMapping('discord2', 'stoat2', TEST_FILE);

            expect(yaml.dump).toHaveBeenCalledWith({ discord1: 'stoat1', discord2: 'stoat2' });
            expect(fs.writeFile).toHaveBeenCalledWith(TEST_FILE, expect.any(String));
            expect(result.CHANNEL_MAPPING).toEqual({ discord1: 'stoat1', discord2: 'stoat2' });
            expect(result.STOAT_TO_DISCORD_MAPPING).toEqual({ stoat1: 'discord1', stoat2: 'discord2' });
        });

        it('should remove the old discord mapping if the stoatId already exists (prevent duplicates)', async () => {
            yaml.load.mockReturnValueOnce({ discord1: 'stoat1' });

            const result = await addChannelMapping('discord2', 'stoat1', TEST_FILE);

            expect(yaml.dump).toHaveBeenCalledWith({ discord2: 'stoat1' });
            expect(result.CHANNEL_MAPPING).toEqual({ discord2: 'stoat1' });
            expect(result.CHANNEL_MAPPING.discord1).toBeUndefined();
            expect(result.STOAT_TO_DISCORD_MAPPING).toEqual({ stoat1: 'discord2' });
        });
    });

    describe('removeChannelMapping', () => {
        it('should remove an existing mapping and save to file', async () => {
            yaml.load.mockReturnValueOnce({ discord1: 'stoat1', discord2: 'stoat2' });

            const result = await removeChannelMapping('discord1', TEST_FILE);

            expect(yaml.dump).toHaveBeenCalledWith({ discord2: 'stoat2' });
            expect(fs.writeFile).toHaveBeenCalledWith(TEST_FILE, expect.any(String));
            expect(result.CHANNEL_MAPPING).toEqual({ discord2: 'stoat2' });
            expect(result.STOAT_TO_DISCORD_MAPPING).toEqual({ stoat2: 'discord2' });
        });

        it('should do nothing and not save if discordId is not found', async () => {
            yaml.load.mockReturnValueOnce({ discord1: 'stoat1' });

            const result = await removeChannelMapping('discord99', TEST_FILE);

            expect(fs.writeFile).not.toHaveBeenCalled();
            expect(result.CHANNEL_MAPPING).toEqual({ discord1: 'stoat1' });
            expect(result.STOAT_TO_DISCORD_MAPPING).toEqual({ stoat1: 'discord1' });
        });
    });

    describe('getStoatIdForDiscord', () => {
        it('should return the correct stoatId for a given discordId', async () => {
            yaml.load.mockReturnValueOnce({ discord1: 'stoat1' });

            const result = await getStoatIdForDiscord('discord1', TEST_FILE);
            expect(result).toBe('stoat1');
        });

        it('should return null if the discordId does not exist', async () => {
            yaml.load.mockReturnValueOnce({ discord1: 'stoat1' });

            const result = await getStoatIdForDiscord('discord99', TEST_FILE);
            expect(result).toBeNull();
        });
    });

    describe('getDiscordIdForStoat', () => {
        it('should return the correct discordId for a given stoatId', async () => {
            yaml.load.mockReturnValueOnce({ discord1: 'stoat1' });

            const result = await getDiscordIdForStoat('stoat1', TEST_FILE);
            expect(result).toBe('discord1');
        });

        it('should return null if the stoatId does not exist', async () => {
            yaml.load.mockReturnValueOnce({ discord1: 'stoat1' });

            const result = await getDiscordIdForStoat('stoat99', TEST_FILE);
            expect(result).toBeNull();
        });
    });
});