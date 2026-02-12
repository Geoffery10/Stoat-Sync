import discord
import aiohttp
import os
from datetime import datetime
from discord.ext import commands
from collections import defaultdict
from dotenv import load_dotenv

load_dotenv()

# Configuration
DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
STOAT_BOT_TOKEN = os.getenv('STOAT_BOT_TOKEN')
STOAT_BASE_URL = os.getenv('STOAT_BASE_URL')
STOAT_API_URL = f"{STOAT_BASE_URL}/api"
STOAT_AUTUMN_URL = f"{STOAT_BASE_URL}/autumn"

# Channel mappings
CHANNEL_MAPPING = {
    483867465613443082: "01KH742Q7T025TST0JZS5FWFGW",  # memes
    999347555278258268: "01KH73MPGWC22X1B8327NGDJYN",  # art🎨
    444706130338381834: "01KH741AKKGVKKETWM56YMPQHN",   # serious-talk
    435597744258940940: "01KH7AYNQBJXGSAECDP50CPFDZ",  # uncomfortable-corner
    548342217769746432: "01KH7455MSQBQHMR5KFGNETSE2"   # unregulated🐙🈲
}
# Add this global dictionary to track message mappings
message_mapping = defaultdict(dict)

intents = discord.Intents.default()
intents.messages = True
intents.message_content = True

bot = commands.Bot(command_prefix="!", intents=intents)


async def upload_attachment_to_stoat(session, file_path):
    """Uploads a file to Stoat's Autumn server and returns the ID."""
    if not os.path.exists(file_path):
        print(f"[!] Attachment not found locally: {file_path}")
        return None

    try:
        with open(file_path, 'rb') as f:
            data = aiohttp.FormData()
            data.add_field('file', f, filename=os.path.basename(file_path),
                           content_type='application/octet-stream')

            async with session.post(f"{STOAT_AUTUMN_URL}/attachments",
                                    data=data,
                                    headers={"x-bot-token": STOAT_BOT_TOKEN}) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    return result.get('id')
                else:
                    print(f"[!] Failed to upload file: {resp.status} - {await resp.text()}")
                    return None
    except Exception as e:
        print(f"[!] Error uploading file: {e}")
        return None


def format_message(message):
    """Formats the message in the desired Stoat format."""
    content = message.content
    # Handle spoilers and mentions
    content = content.replace("||", "!!").replace("@everyone", "`@everyone`")
    # Format timestamp
    timestamp = int(message.created_at.timestamp())
    return f"**{message.author.name}**\n> {content}\n:clock230: <t:{timestamp}:f>"


@bot.event
async def on_ready():
    print(f'Logged in as {bot.user}')


@bot.event
async def on_message(message):
    # Ignore messages from the bot itself
    if message.author == bot.user:
        return

    # Check if the message is in a channel we want to mirror
    if message.channel.id in CHANNEL_MAPPING:
        stoat_channel_id = CHANNEL_MAPPING[message.channel.id]

        # Format the message
        formatted_content = format_message(message)

        # Handle attachments
        attachment_ids = []
        async with aiohttp.ClientSession() as session:
            for attachment in message.attachments:
                # Download the attachment
                file_path = f"temp_{attachment.id}_{attachment.filename}"
                await attachment.save(file_path)

                try:
                    # Upload to Stoat first
                    uploaded_id = await upload_attachment_to_stoat(session, file_path)
                    if uploaded_id:
                        attachment_ids.append(uploaded_id)

                    # Only delete after successful upload
                    os.remove(file_path)
                except Exception as e:
                    print(
                        f"Error handling attachment {attachment.filename}: {e}")
                    # Clean up even if upload failed
                    if os.path.exists(file_path):
                        os.remove(file_path)

            # Prepare payload
            payload = {
                "content": formatted_content,
                "attachments": attachment_ids
            }

            # Send to Stoat
            headers = {
                "x-bot-token": STOAT_BOT_TOKEN,
                "Content-Type": "application/json"
            }

            async with session.post(
                f"{STOAT_API_URL}/channels/{stoat_channel_id}/messages",
                json=payload,
                headers=headers
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    stoat_message_id = result.get('_id')
                    if stoat_message_id:
                        message_mapping[message.channel.id][message.id] = stoat_message_id
                        print(
                            f"Successfully sent message from {message.author.name} to Stoat (ID: {stoat_message_id})")
                    else:
                        print("Warning: No message ID returned from Stoat API")
                else:
                    print(f"Failed to send message: {resp.status} - {await resp.text()}")

    # Process commands if needed
    await bot.process_commands(message)


@bot.event
async def on_message_edit(before, after):
    # Ignore if the message is from the bot itself
    if after.author == bot.user:
        return

    # Check if the message is in a channel we're mirroring
    if after.channel.id in CHANNEL_MAPPING:
        stoat_channel_id = CHANNEL_MAPPING[after.channel.id]

        # Check if we have a mapping for this message
        if after.id in message_mapping[after.channel.id]:
            stoat_message_id = message_mapping[after.channel.id][after.id]

            # Format the edited message
            formatted_content = format_message(after)

            # Prepare payload
            payload = {
                "content": formatted_content
            }

            # Send the edit to Stoat
            headers = {
                "x-bot-token": STOAT_BOT_TOKEN,
                "Content-Type": "application/json"
            }

            async with aiohttp.ClientSession() as session:
                async with session.patch(
                    f"{STOAT_API_URL}/channels/{stoat_channel_id}/messages/{stoat_message_id}",
                    json=payload,
                    headers=headers
                ) as resp:
                    if resp.status == 200:
                        print(
                            f"Successfully edited message in Stoat (ID: {stoat_message_id})")
                    else:
                        print(f"Failed to edit message: {resp.status} - {await resp.text()}")

# Add message delete handler


@bot.event
async def on_message_delete(message):
    # Check if the message is in a channel we're mirroring
    if message.channel.id in CHANNEL_MAPPING:
        # Check if we have a mapping for this message
        if message.id in message_mapping[message.channel.id]:
            stoat_message_id = message_mapping[message.channel.id][message.id]
            stoat_channel_id = CHANNEL_MAPPING[message.channel.id]

            # Delete the message in Stoat
            headers = {
                "x-bot-token": STOAT_BOT_TOKEN
            }

            async with aiohttp.ClientSession() as session:
                async with session.delete(
                    f"{STOAT_API_URL}/channels/{stoat_channel_id}/messages/{stoat_message_id}",
                    headers=headers
                ) as resp:
                    if resp.status == 200:
                        print(
                            f"Successfully deleted message in Stoat (ID: {stoat_message_id})")
                        # Remove from our mapping
                        del message_mapping[message.channel.id][message.id]
                    else:
                        print(f"Failed to delete message: {resp.status} - {await resp.text()}")
    # Process commands if needed
    await bot.process_commands(message)

bot.run(DISCORD_TOKEN)
