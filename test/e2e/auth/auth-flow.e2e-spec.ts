import type { INestApplication } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { StartedTestContainer } from 'testcontainers';
import {
  cleanDatabase,
  disconnectPrisma,
  setupPrismaForTests,
} from '../../helpers/prisma-test-utils';
import { createTestApp } from '../../helpers/test-app-factory';
import {
  getEventStoreConnectionString,
  startEventStoreContainer,
  startPostgresContainer,
} from '../../helpers/testcontainers-setup';

describe('Auth flow (e2e)', () => {
  let app: INestApplication<App>;
  let pgContainer: StartedPostgreSqlContainer;
  let esContainer: StartedTestContainer;
  let prisma: PrismaClient;

  beforeAll(async () => {
    [pgContainer, esContainer] = await Promise.all([
      startPostgresContainer(),
      startEventStoreContainer(),
    ]);

    const dbUrl = pgContainer.getConnectionUri();
    prisma = await setupPrismaForTests(dbUrl);

    app = await createTestApp({
      DATABASE_URL: dbUrl,
      EVENTSTORE_CONNECTION_STRING: getEventStoreConnectionString(),
      JWT_ACCESS_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_ACCESS_EXPIRES_IN: '15m',
      JWT_REFRESH_EXPIRES_IN: '7d',
    });
  }, 120_000);

  afterAll(async () => {
    await app?.close();
    await disconnectPrisma(prisma);
    await Promise.all([pgContainer?.stop(), esContainer?.stop()]);
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  it('register then login with email', async () => {
    // Register
    const registerRes = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        email: 'flow@example.com',
        username: 'flowuser',
        password: 'securePass123',
      });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.userId).toBeDefined();

    // Login with email
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: 'flow@example.com',
        password: 'securePass123',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeDefined();
    expect(loginRes.body.refreshToken).toBeDefined();
  });

  it('register then login with username', async () => {
    // Register
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'flow2@example.com',
      username: 'flow2user',
      password: 'securePass123',
    });

    // Login with username
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: 'flow2user',
        password: 'securePass123',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeDefined();
  });

  it('register then login with email then login with username', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      email: 'multi@example.com',
      username: 'multiuser',
      password: 'securePass123',
    });

    // Login via email
    const loginEmail = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: 'multi@example.com',
        password: 'securePass123',
      });
    expect(loginEmail.status).toBe(200);

    // Login via username
    const loginUsername = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        identifier: 'multiuser',
        password: 'securePass123',
      });
    expect(loginUsername.status).toBe(200);

    // Both should return valid tokens
    expect(loginEmail.body.accessToken).toBeDefined();
    expect(loginUsername.body.accessToken).toBeDefined();
  });
});
