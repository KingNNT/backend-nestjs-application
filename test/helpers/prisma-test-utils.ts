import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

let prisma: PrismaClient;

export async function setupPrismaForTests(
  databaseUrl: string,
): Promise<PrismaClient> {
  // Run migrations against the test database
  execSync('bunx prisma db push --force-reset --skip-generate', {
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      // This targets an ephemeral Testcontainers DB, not production
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: 'yes',
    },
    stdio: 'pipe',
  });

  prisma = new PrismaClient({
    datasources: { db: { url: databaseUrl } },
  });
  await prisma.$connect();

  return prisma;
}

export async function cleanDatabase(client?: PrismaClient): Promise<void> {
  const p = client ?? prisma;
  await p.$transaction([
    p.domainEvent.deleteMany(),
    p.authCredential.deleteMany(),
    p.user.deleteMany(),
  ]);
}

export async function disconnectPrisma(client?: PrismaClient): Promise<void> {
  const p = client ?? prisma;
  await p.$disconnect();
}
