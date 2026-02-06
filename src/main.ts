import { ValidationPipe } from '@nestjs/common';
import { VersioningType } from '@nestjs/common/enums/version-type.enum';
import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/interfaces/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.use(cookieParser());

  // Security & Performance
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(compression());

  // Enable global exception filter
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  app.enableCors({
    // Only allow requests from your frontend's exact origin
    origin: [
      process.env.FRONTEND_URL,
      process.env.ASTROLOGER_FRONTEND_URL,
      process.env.ADMIN_FRONTEND_URL,
    ].filter(Boolean) as string[],

    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',

    allowedHeaders: 'Content-Type, Accept, Authorization',

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
