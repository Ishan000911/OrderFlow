import 'dotenv/config';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { configureSockets } from './sockets/index.js';

// The HTTP and Socket.IO server share one lifecycle and one listening port.
const app = createApp(); const httpServer = createServer(app); const io = new Server(httpServer, { cors: { origin: env.CLIENT_URL, credentials: true } }); configureSockets(io, app);
httpServer.listen(env.PORT, () => console.log(`OrderFlow API listening on http://localhost:${env.PORT}`));
const shutdown = async (signal) => { console.log(`${signal} received, shutting down`); io.close(); httpServer.close(async () => { await prisma.$disconnect(); process.exit(0); }); };
process.on('SIGTERM', () => shutdown('SIGTERM')); process.on('SIGINT', () => shutdown('SIGINT'));
