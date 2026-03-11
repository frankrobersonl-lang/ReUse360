import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger }      from '@nestjs/common';
import { AppModule }   from './app.module';

async function bootstrap() {
  const app  = await NestFactory.create(AppModule);
  const port = process.env.WORKER_PORT ?? 3001;

  await app.listen(port);
  Logger.log(`Worker running on http://localhost:${port}`,    'Bootstrap');
  Logger.log(`Health check: http://localhost:${port}/health`, 'Bootstrap');
}

bootstrap();
