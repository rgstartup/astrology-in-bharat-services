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

  app.use(helmet());

  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ limit: '50mb', extended: true }));

  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  app.use(cookieParser());
  app.use(compression());

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
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3003',
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

  app.setGlobalPrefix('api');

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Astrology Service API')
    .setDescription('The Astrology Service API description')
    .setVersion('1.0')
    .addCookieAuth('Authentication')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Force IPv4 and Port
  const port = process.env.PORT || 7000;
  await app.listen(port, '0.0.0.0');
  console.log(`Backend is listening on http://0.0.0.0:${port}`);
}

bootstrap()
  .then(() => {
    // const port = process.env.PORT || 6543;
    console.log(`Successfully started`);
  })
  .catch((err) => console.error('Bootstrap error', err));
