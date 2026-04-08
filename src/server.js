import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { connectDatabase, disconnectDatabase } from './utils/database.js';
import { validateStartupEnv } from './utils/validateStartupEnv.js';

validateStartupEnv();

const PORT = Number(process.env.PORT) || 3000;

let server;

async function shutdown() {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
  await disconnectDatabase();
  process.exit(0);
}

async function bootstrap() {
  try {
    await connectDatabase(process.env.MONGODB_URI);
    server = http.createServer(app);
    server.listen(PORT, () => {
      console.log(`Listening on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    });

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

bootstrap();
