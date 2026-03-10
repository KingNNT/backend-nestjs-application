import {
  ClassSerializerInterceptor,
  type INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/shared/infrastructure/prisma/prisma.service';

export async function createTestApp(
  envOverrides: Record<string, string>,
): Promise<INestApplication> {
  // Silence pino logs in tests unless explicitly configured
  process.env.LOG_LEVEL = process.env.LOG_LEVEL ?? 'silent';

  // Set env vars so ConfigService and PrismaClient pick them up
  for (const [key, value] of Object.entries(envOverrides)) {
    process.env[key] = value;
  }

  // Create a PrismaClient pointing to the test DB
  const testPrisma = new PrismaClient({
    datasources: { db: { url: envOverrides.DATABASE_URL } },
  });

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue(testPrisma)
    .compile();

  const app = moduleRef.createNestApplication();

  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}
