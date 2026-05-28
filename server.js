const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { Client, GatewayIntentBits } = require('discord.js');

const app = express();
const server = http.createServer(app);

// Open WebSocket access configurations
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Initialize Discord bot setup client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ENVIRONMENT CONFIGURATIONS
// Using process.env prevents credentials from being hardcoded into the repo
const DISCORD_CHANNEL_ID = process.env.CHANNEL_ID;
const DISCORD_BOT_TOKEN = process.env.BOT_TOKEN;

// LISTENING TO DISCORD -> BROADCASTING TO WEB
client.on('messageCreate', (message) => {
    if (message.author.bot) return; // Drop loop triggers from itself

    if (message.channel.id === DISCORD_CHANNEL_ID) {
        io.emit('discord-to-web', {
            username: message.author.username,
            avatar: message.author.displayAvatarURL(),
            text: message.content
        });
    }
});

// LISTENING TO WEB -> FORWARDING TO DISCORD CHANNEL
io.on('connection', (socket) => {
    socket.on('web-to-discord', async (data) => {
        try {
            const channel = await client.channels.fetch(DISCORD_CHANNEL_ID);
            if (!channel) return;

            // Formats how the text drop layouts look inside the channel screen
            const formattedMessage = `**[Web] ${data.username}:** ${data.text}`;
            await channel.send(formattedMessage);

            // Reflect the message to all other connected browsers viewing the site
            socket.broadcast.emit('discord-to-web', {
                username: data.username,
                avatar: data.avatar,
                text: data.text
            });
        } catch (err) {
            console.error("Error forwarding text:", err);
        }
    });
});

// Spin up connections
client.login(DISCORD_BOT_TOKEN);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Cross-platform server operating on port ${PORT}`));
