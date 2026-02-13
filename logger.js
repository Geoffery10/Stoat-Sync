import { Client } from "stoat.js";
import dotenv from 'dotenv';
import axios from 'axios';

// Load environment variables
dotenv.config();

// Initialize Stoat client for logging
let api = process.env.STOAT_BASE_URL + "/api";
let stoatClient = new Client({baseURL: api});
let isLoggedIn = false;

// Configuration
const STOAT_BASE_URL = process.env.STOAT_BASE_URL;
const STOAT_API_URL = `${STOAT_BASE_URL}/api`;
const LOGGING_CHANNEL_ID = "01KHCB6JREB6D845SE8C532X96";
const STOAT_BOT_TOKEN = process.env.STOAT_BOT_TOKEN;

// Queue for messages when not connected
const messageQueue = [];

// Login to Stoat for logging
async function loginToStoat() {
    try {
        await stoatClient.loginBot(STOAT_BOT_TOKEN);
        isLoggedIn = true;
        console.log("[Logger] Connected to Stoat for logging");

        // Process any queued messages
        while (messageQueue.length > 0) {
            const message = messageQueue.shift();
            await sendToStoat(message);
        }
    } catch (error) {
        console.error("[Logger] Failed to connect to Stoat for logging:", error.message);
        setTimeout(loginToStoat, 5000); // Retry after 5 seconds
    }
}

// Send message to Stoat logging channel
async function sendToStoat(message) {
    if (!isLoggedIn) {
        messageQueue.push(message);
        return;
    }

    try {
        await axios.post(
            `${STOAT_API_URL}/channels/${LOGGING_CHANNEL_ID}/messages`,
            { content: message },
            {
                headers: {
                    'x-bot-token': STOAT_BOT_TOKEN,
                    'Content-Type': 'application/json'
                }
            }
        );
    } catch (error) {
        console.error("[Logger] Failed to send log to Stoat:", error.message);
    }
}

// Logger function
function log(level, message, error = null) {
    const logMessage = `[${level.toUpperCase()}] ${message}`;

    // Log to console
    if (level === 'error') {
        console.error(logMessage);
        if (error) {
            console.error(error);
        }
    } else {
        console.log(logMessage);
    }

    // Send to Stoat logging channel
    sendToStoat(logMessage);
}

// Initialize logger
loginToStoat();

// Export logger functions
export const logger = {
    info: (message) => log('info', message),
    warn: (message) => log('warn', message),
    error: (message, error = null) => log('error', message, error),
    debug: (message) => log('debug', message)
};