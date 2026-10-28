import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';

async function bootstrap() {
  try {
    console.log('[AgriConnect Server] Initializing database connection...');
    await connectDB();

    const app = createApp();

    const server = app.listen(env.port, '0.0.0.0', () => {
      console.log(`[AgriConnect Server] HTTP server actively listening on port ${env.port}`);
      console.log(`[AgriConnect Server] API Base: http://localhost:${env.port}/api`);
      console.log(`[AgriConnect Server] Health check: http://localhost:${env.port}/health`);
    });

    const shutdown = async (signal) => {
      console.log(`\n[AgriConnect Server] Received ${signal}. Gracefully terminating...`);
      server.close(() => {
        console.log('[AgriConnect Server] HTTP closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (error) {
    console.error('[AgriConnect Server Fatal] Startup failed:', error);
    process.exit(1);
  }
}

bootstrap();
