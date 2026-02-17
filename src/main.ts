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

  // --- CORS Configuration ---
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    process.env.ASTROLOGER_FRONTEND_URL,
    process.env.ADMIN_FRONTEND_URL,
    'https://astrology-in-bharat-app-frontend-ad.vercel.app/',
    'https://astrology-in-bharat-app-frontend.vercel.app/',
    'https://astrology-in-bharat-app-frontend-ad-six.vercel.app/',
  ].filter(Boolean) as string[];

  // Support comma-separated origins in env vars and remove trailing slashes
  const expandedOrigins = allowedOrigins.flatMap(o =>
    o.split(',').map(s => s.trim().replace(/\/+$/, ""))
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      const isAllowed = expandedOrigins.some(allowed => {
        // Exact match
        if (allowed === origin) return true;
        // Match Vercel preview domains if they contain the project name
        if (origin.includes('vercel.app') && allowed.includes('vercel.app')) {
          // This is a bit loose but helps with preview deployments
          return true;
        }
        return false;
      });

      if (isAllowed || process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        console.warn(`[CORS] Request from origin ${origin} blocked.`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, Authorization, X-Requested-With, Cache-Control, Pragma, Expires, If-Modified-Since',
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
