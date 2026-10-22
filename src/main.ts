process.env.TZ = "UTC"; // Force UTC timezone globally

import cookieParser from "cookie-parser";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { VersioningType } from "@nestjs/common/enums/version-type.enum";
import { ValidationPipe, ValidationError } from "@nestjs/common";
import { HttpExceptionFilter } from "./shared/filters/http-exception.filter";
import { DomainExceptionFilter } from "./shared/filters/domain-exception.filter";
import { UnknownExceptionFilter } from "./shared/filters/unknown-exception.filter";
import { ValidationDomainError } from "./shared/errors";
import { formatValidationErrors } from "./shared/utils/validation-error-formatter.util";
import { json, urlencoded } from "express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  (
    app.getHttpAdapter().getInstance() as {
      set: (key: string, value: boolean) => void;
    }
  ).set("trust proxy", true);

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean | string) => void,
    ) => {
      // In dev, echo back ANY origin so mobile LAN, localhost, emulator work with credentials
      if (!origin || process.env.NODE_ENV !== "production") {
        callback(null, origin ?? true);
        return;
      }
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.ADMIN_FRONTEND_URL,
        process.env.ASTROLOGER_FRONTEND_URL,
        process.env.AGENT_FRONTEND_URL,
        process.env.MERCHANT_FRONTEND_URL,
      ].filter(Boolean);

      if (allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, origin);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
    allowedHeaders:
      "Content-Type, Accept, Authorization, Cookie, Cache-Control, Pragma, Expires, X-Requested-With",
    exposedHeaders: "Set-Cookie",
    credentials: true,
  });

  app.use(cookieParser());

  // Increase payload limit for large base64 strings (images)
  // And capture rawBody for webhook signature verification
  app.use(
    json({
      limit: "50mb",
      verify: (
        req: import("express").Request & { rawBody?: Buffer },
        res: import("express").Response,
        buf: Buffer,
      ) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(urlencoded({ limit: "50mb", extended: true }));

  app.setGlobalPrefix("api");

  app.enableVersioning({
    type: VersioningType.URI, // options: URI | HEADER | MEDIA_TYPE | CUSTOM
    defaultVersion: "1",
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove extra propertie
      forbidNonWhitelisted: true, // throw error if extra properties are present
      transform: true, // automatically transform payloads to DTO instances
      transformOptions: { enableImplicitConversion: true }, // convert types (e.g., string -> number)
      exceptionFactory: (errors: ValidationError[]) => {
        const fieldErrors = formatValidationErrors(errors);
        return new ValidationDomainError(fieldErrors);
      },
    }),
  );

  // Apply global exception filter
  app.useGlobalFilters(
    new UnknownExceptionFilter(), // Bug / crash
    new HttpExceptionFilter(), // Client mistake
    new DomainExceptionFilter(), // Business rule failed
  );

  //swagger
  const config = new DocumentBuilder()
    .setTitle("Astrology in Bharat API")
    .setDescription("Astrology in Bharat API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup("docs", app, documentFactory);

  await app.listen(process.env.PORT!);

  // // Set timeout after the server is initialized
  // const server = app.getHttpServer();
  // if (server && typeof server.setTimeout === 'function') {
  //   server.setTimeout(300000); // 5 minutes timeout for large file uploads
  // }
}
bootstrap()
  .then(() => console.log(`app started running on port ${process.env.PORT}`))
  .catch((err) => console.error("Something went wrong", err));
