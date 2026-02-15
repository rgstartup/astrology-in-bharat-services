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
    // Only allow requests from your frontend's exact origin
    origin: process.env.FRONTEND_URL ?? 'http://localhost:3000',

    // Specify the allowed methods (GET and POST are essential for registration)
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',

    // Allow headers like Content-Type (important for sending JSON)
    allowedHeaders: 'Content-Type, Accept',

    // Set to true if your frontend needs to send cookies or authorization headers
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
      whitelist: true, // remove extra properties
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
