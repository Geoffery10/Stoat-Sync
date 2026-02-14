import Database from 'better-sqlite3';
import { logger } from './logger.js';

// Database file path
const DB_PATH = './message_mappings.db';

// Initialize the database
const db = new Database(DB_PATH);

// Create tables if they don't exist
function initializeDatabase() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS message_mappings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            stoat_message_id TEXT NOT NULL,
            discord_message_id TEXT NOT NULL,
            stoat_channel_id TEXT NOT NULL,
            discord_channel_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

            UNIQUE(stoat_message_id, discord_message_id)
        );

        CREATE INDEX IF NOT EXISTS idx_stoat_message ON message_mappings(stoat_message_id);
        CREATE INDEX IF NOT EXISTS idx_discord_message ON message_mappings(discord_message_id);
        CREATE INDEX IF NOT EXISTS idx_stoat_channel ON message_mappings(stoat_channel_id);
        CREATE INDEX IF NOT EXISTS idx_discord_channel ON message_mappings(discord_channel_id);
    `);

    logger.info('Database initialized successfully');
}

// Message Mapping Functions
export function getDiscordMessageId(stoatMessageId) {
    try {
        const stmt = db.prepare('SELECT discord_message_id FROM message_mappings WHERE stoat_message_id = ?');
        const result = stmt.get(stoatMessageId);
        return result?.discord_message_id || null;
    } catch (error) {
        logger.error(`Error getting Discord message ID: ${error.message}`);
        return null;
    }
}

export function getStoatMessageId(discordMessageId) {
    try {
        const stmt = db.prepare('SELECT stoat_message_id FROM message_mappings WHERE discord_message_id = ?');
        const result = stmt.get(discordMessageId);
        return result?.stoat_message_id || null;
    } catch (error) {
        logger.error(`Error getting Stoat message ID: ${error.message}`);
        return null;
    }
}

export function addMapping(stoatMessageId, discordMessageId, stoatChannelId, discordChannelId) {
    try {
        const stmt = db.prepare(`
            INSERT INTO message_mappings
            (stoat_message_id, discord_message_id, stoat_channel_id, discord_channel_id)
            VALUES (?, ?, ?, ?)
            ON CONFLICT (stoat_message_id, discord_message_id) DO NOTHING
        `);
        stmt.run(stoatMessageId, discordMessageId, stoatChannelId, discordChannelId);
        return true;
    } catch (error) {
        logger.error(`Error adding mapping: ${error.message}`);
        return false;
    }
}

export function removeMapping(stoatMessageId, discordMessageId) {
    try {
        const stmt = db.prepare('DELETE FROM message_mappings WHERE stoat_message_id = ? OR discord_message_id = ?');
        stmt.run(stoatMessageId, discordMessageId);
        return true;
    } catch (error) {
        logger.error(`Error removing mapping: ${error.message}`);
        return false;
    }
}

export function getAllMappings() {
    try {
        const stmt = db.prepare('SELECT * FROM message_mappings');
        return stmt.all();
    } catch (error) {
        logger.error(`Error getting all mappings: ${error.message}`);
        return [];
    }
}

export function cleanupOldMappings(days = 30) {
    try {
        const stmt = db.prepare(`
            DELETE FROM message_mappings
            WHERE created_at < datetime('now', ?)
        `);
        const result = stmt.run(`-${days} days`);
        logger.info(`Cleaned up ${result.changes} old mappings`);
        return result.changes;
    } catch (error) {
        logger.error(`Error cleaning up old mappings: ${error.message}`);
        return 0;
    }
}

// Initialize the database when this module is imported
initializeDatabase();

// Export the database instance for direct access if needed
export { db };