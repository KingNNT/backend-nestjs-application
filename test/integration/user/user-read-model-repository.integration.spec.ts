import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { UserCreatedEvent } from '../../../src/modules/user/domain/events/user-created.event';
import { UserReadModelRepository } from '../../../src/modules/user/infrastructure/persistence/read-model/user-read-model.repository';
import {
  cleanDatabase,
  disconnectPrisma,
  setupPrismaForTests,
} from '../../helpers/prisma-test-utils';
import { startPostgresContainer } from '../../helpers/testcontainers-setup';

describe('UserReadModelRepository (integration)', () => {
  let container: StartedPostgreSqlContainer;
  let prisma: PrismaClient;
  let repository: UserReadModelRepository;

  beforeAll(async () => {
    container = await startPostgresContainer();
    prisma = await setupPrismaForTests(container.getConnectionUri());
    // UserReadModelRepository expects a PrismaService (which extends PrismaClient)
    repository = new UserReadModelRepository(prisma as any);
  }, 60_000);

  afterAll(async () => {
    await disconnectPrisma(prisma);
    await container.stop();
  });

  beforeEach(async () => {
    await cleanDatabase(prisma);
  });

  it('applyProjection() inserts a row into users table for UserCreatedEvent', async () => {
    const userId = randomUUID();
    const createdAt = new Date();
    const event = new UserCreatedEvent({
      userId,
      email: 'test@example.com',
      username: 'testuser',
      createdAt,
    });

    await repository.applyProjection([event]);

    const user = await (prisma as any).user.findUnique({
      where: { id: userId },
    });
    expect(user).toBeDefined();
    expect(user.email).toBe('test@example.com');
    expect(user.username).toBe('testuser');
    expect(user.isActive).toBe(true);
  });

  it('throws on duplicate email', async () => {
    const createdAt = new Date();
    const event1 = new UserCreatedEvent({
      userId: randomUUID(),
      email: 'dup@example.com',
      username: 'user1',
      createdAt,
    });
    const event2 = new UserCreatedEvent({
      userId: randomUUID(),
      email: 'dup@example.com',
      username: 'user2',
      createdAt,
    });

    await repository.applyProjection([event1]);

    await expect(repository.applyProjection([event2])).rejects.toThrow();
  });

  it('throws on duplicate username', async () => {
    const createdAt = new Date();
    const event1 = new UserCreatedEvent({
      userId: randomUUID(),
      email: 'a@example.com',
      username: 'sameuser',
      createdAt,
    });
    const event2 = new UserCreatedEvent({
      userId: randomUUID(),
      email: 'b@example.com',
      username: 'sameuser',
      createdAt,
    });

    await repository.applyProjection([event1]);

    await expect(repository.applyProjection([event2])).rejects.toThrow();
  });
});
