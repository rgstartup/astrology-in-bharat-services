import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { VersioningType } from '@nestjs/common/enums/version-type.enum';
import { ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import * as cookieParser from 'cookie-parser';  // 👈 add this

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import helmet from 'helmet';
import * as compression from 'compression';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.use(cookieParser()); // << IMPORTANT

  // Security & Performance
  app.use(helmet());
  app.use(compression());

  // Enable global exception filter
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  app.use(cookieParser());

  app.enableCors({
    origin: 'http://localhost:3000',

    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',

    allowedHeaders: 'Content-Type, Accept',

    credentials: true,
  });

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
  // Note: `AllExceptionsFilter` is already registered above and will catch and
  // log all exceptions. Avoid re-registering another global filter here which
  // could overwrite or suppress the catch-all logging.

  // Swagger Configuration
  const config = new DocumentBuilder()
    .setTitle('Astrology Service API')
    .setDescription('The Astrology Service API description')
    .setVersion('1.0')
    .addCookieAuth('Authentication')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 4000);
}
bootstrap()
  .then(() => console.log(`app started running on port ${process.env.PORT}`))
  .catch((err) => console.error('Something went wrong', err));
