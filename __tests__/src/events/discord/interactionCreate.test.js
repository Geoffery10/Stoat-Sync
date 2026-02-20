import interactionCreate from '../../../../src/events/discord/interactionCreate.js';
import { logger } from '../../../../src/logger.js';
import * as syncChannelCommand from '../../../../src/commands/syncChannel.js';
import * as unsyncChannelCommand from '../../../../src/commands/unsyncChannel.js';
import * as isSyncedCommand from '../../../../src/commands/isSynced.js';

// Mock the logger
jest.mock('../../../../src/logger.js');

// Mock the command modules
jest.mock('../../../../src/commands/syncChannel.js', () => ({
    data: { name: 'sync-channel' },
    execute: jest.fn()
}));

jest.mock('../../../../src/commands/unsyncChannel.js', () => ({
    data: { name: 'unsync-channel' },
    execute: jest.fn()
}));

jest.mock('../../../../src/commands/isSynced.js', () => ({
    data: { name: 'is-synced' },
    execute: jest.fn()
}));

describe('interactionCreate event', () => {
    let interaction;

    beforeEach(() => {
        jest.clearAllMocks();

        interaction = {
            isChatInputCommand: jest.fn(),
            commandName: '',
            replied: false,
            deferred: false,
            reply: jest.fn(),
            followUp: jest.fn()
        };
    });

    it('should ignore non-chat input commands', async () => {
        interaction.isChatInputCommand.mockReturnValue(false);

        await interactionCreate(interaction);

        expect(syncChannelCommand.execute).not.toHaveBeenCalled();
        expect(unsyncChannelCommand.execute).not.toHaveBeenCalled();
        expect(isSyncedCommand.execute).not.toHaveBeenCalled();
    });

    it('should ignore unknown commands', async () => {
        interaction.isChatInputCommand.mockReturnValue(true);
        interaction.commandName = 'unknown-command';

        await interactionCreate(interaction);

        expect(syncChannelCommand.execute).not.toHaveBeenCalled();
    });

    it('should execute the correct command (sync-channel)', async () => {
        interaction.isChatInputCommand.mockReturnValue(true);
        interaction.commandName = 'sync-channel';

        await interactionCreate(interaction);

        expect(syncChannelCommand.execute).toHaveBeenCalledWith(interaction);
        expect(unsyncChannelCommand.execute).not.toHaveBeenCalled();
    });

    it('should execute the correct command (is-synced)', async () => {
        interaction.isChatInputCommand.mockReturnValue(true);
        interaction.commandName = 'is-synced';

        await interactionCreate(interaction);

        expect(isSyncedCommand.execute).toHaveBeenCalledWith(interaction);
    });

    describe('Error Handling', () => {
        beforeEach(() => {
            interaction.isChatInputCommand.mockReturnValue(true);
            interaction.commandName = 'sync-channel';

            syncChannelCommand.execute.mockRejectedValue(new Error('Test Error'));
        });

        it('should log the error and reply if not already replied/deferred', async () => {
            interaction.replied = false;
            interaction.deferred = false;

            await interactionCreate(interaction);

            expect(logger.error).toHaveBeenCalled();
            expect(interaction.reply).toHaveBeenCalledWith(expect.objectContaining({
                content: 'There was an error while executing this command!',
                ephemeral: true
            }));
            expect(interaction.followUp).not.toHaveBeenCalled();
        });

        it('should log the error and followUp if already replied', async () => {
            interaction.replied = true;
            interaction.deferred = false;

            await interactionCreate(interaction);

            expect(logger.error).toHaveBeenCalled();
            expect(interaction.followUp).toHaveBeenCalledWith(expect.objectContaining({
                content: 'There was an error while executing this command!',
                ephemeral: true
            }));
            expect(interaction.reply).not.toHaveBeenCalled();
        });

        it('should log the error and followUp if already deferred', async () => {
            interaction.replied = false;
            interaction.deferred = true;

            await interactionCreate(interaction);

            expect(logger.error).toHaveBeenCalled();
            expect(interaction.followUp).toHaveBeenCalledWith(expect.objectContaining({
                content: 'There was an error while executing this command!',
                ephemeral: true
            }));
            expect(interaction.reply).not.toHaveBeenCalled();
        });
    });
});
