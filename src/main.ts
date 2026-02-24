import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common/enums/version-type.enum';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { UnknownExceptionFilter } from './common/filters/unknown-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      process.env.FRONTEND_URL ?? 'http://localhost:3000',
      process.env.ADMIN_FRONTEND_URL ?? 'http://localhost:3001',
      process.env.ASTROLOGER_FRONTEND_URL ?? 'http://localhost:3003',
      process.env.AGENT_FRONTEND_URL ?? 'http://localhost:8000',
    ],

    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',

    // Authorization header is needed for Bearer token auth,
    // Cookie header is needed for cookie-based auth
    allowedHeaders: 'Content-Type, Accept, Authorization, Cookie',

    // Required for cookies to be sent cross-origin
    credentials: true,
  });

  app.use(cookieParser());

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
