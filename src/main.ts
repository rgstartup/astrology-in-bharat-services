process.env.TZ = 'UTC'; // Force UTC timezone globally

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common/enums/version-type.enum';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { UnknownExceptionFilter } from './common/filters/unknown-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  (app.getHttpAdapter().getInstance() as any).set('trust proxy', true);

  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.ADMIN_FRONTEND_URL,
        process.env.ASTROLOGER_FRONTEND_URL,
        process.env.AGENT_FRONTEND_URL,
        process.env.MERCHANT_FRONTEND_URL,
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3003',
        'http://localhost:3004', // Merchant Hub
        'http://localhost:8000',
        'https://astrology-in-bharat-app-frontend-ad.vercel.app', // Added the reported origin
      ].filter(Boolean);

      // Allow if origin is in the list or is a Vercel preview/deployment
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization, Cookie, Cache-Control, Pragma, Expires',
    credentials: true,
  });

  app.use(cookieParser());
  
  // Increase payload limit for large base64 strings (images)
  // And capture rawBody for webhook signature verification
  const express = require('express');
  app.use(express.json({
    limit: '50mb',
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI, // options: URI | HEADER | MEDIA_TYPE | CUSTOM
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove extra propertie
      forbidNonWhitelisted: true, // throw error if extra properties are present
      transform: true, // automatically transform payloads to DTO instances
      transformOptions: { enableImplicitConversion: true }, // convert types (e.g., string -> number)
    }),
  );

  // Apply global exception filter
  app.useGlobalFilters(
    new UnknownExceptionFilter(), // Bug / crash
    new HttpExceptionFilter(), // Client mistake
    new DomainExceptionFilter(), // Business rule failed
  );

  await app.listen(process.env.PORT!);
}
bootstrap()
  .then(() => console.log(`app started running on port ${process.env.PORT}`))
  .catch((err) => console.error('Something went wrong', err));