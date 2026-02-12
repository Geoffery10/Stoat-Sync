import { Client } from "stoat.js";
import dotenv from 'dotenv';
import { config } from 'dotenv';

// Load environment variables
config();

let api = process.env.STOAT_BASE_URL + "/api"
let client = new Client({baseURL: api});

client.on("ready", async () =>
  console.info(`Logged in as ${client.user.username}!`),
);

client.on("messageCreate", async (message) => {
  if (message.content === "hello") {
    message.channel.sendMessage("world");
  }
});

client.loginBot(process.env.STOAT_BOT_TOKEN);