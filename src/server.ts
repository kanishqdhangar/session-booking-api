
import app from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';

const startServer = async (): Promise<void> => {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.log(`Server listening on port ${env.PORT}`);
  });

  const shutdown = (signal: string): void => {
    console.log(`${signal} received. Shutting down gracefully.`);

    server.close(() => {
      console.log('HTTP server closed.');

      void import('mongoose').then(async (mongoose) => {
        await mongoose.default.connection.close();
        process.exit(0);
      });
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

void startServer().catch((error: unknown) => {
  console.error('Failed to start server:', error);
  process.exitCode = 1;
});
