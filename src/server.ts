
import mongoose from 'mongoose';
import type { Server } from 'node:http';

import app from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';

const startServer = async (): Promise<void> => {
  await connectDatabase();

  const server: Server = app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });

  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.log(`${signal} received. Shutting down gracefully.`);

    const forceShutdown = setTimeout(() => {
      console.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10_000);

    try {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });

      console.log('HTTP server closed.');

      await mongoose.connection.close();

      console.log('MongoDB connection closed.');
      clearTimeout(forceShutdown);
      process.exit(0);
    } catch (error: unknown) {
      console.error('Error during graceful shutdown:', error);
      clearTimeout(forceShutdown);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });
};

void startServer().catch((error: unknown) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
