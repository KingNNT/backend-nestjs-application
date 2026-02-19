import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers';

let postgresContainer: StartedPostgreSqlContainer;
let eventStoreContainer: StartedTestContainer;

export async function startPostgresContainer(): Promise<StartedPostgreSqlContainer> {
  if (postgresContainer) return postgresContainer;

  postgresContainer = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('test_db')
    .withUsername('test')
    .withPassword('test')
    .start();

  return postgresContainer;
}

export async function startEventStoreContainer(): Promise<StartedTestContainer> {
  if (eventStoreContainer) return eventStoreContainer;

  eventStoreContainer = await new GenericContainer('eventstore/eventstore:lts')
    .withEnvironment({
      EVENTSTORE_CLUSTER_SIZE: '1',
      EVENTSTORE_RUN_PROJECTIONS: 'All',
      EVENTSTORE_START_STANDARD_PROJECTIONS: 'true',
      EVENTSTORE_INSECURE: 'true',
      EVENTSTORE_MEM_DB: 'true',
    })
    .withExposedPorts(2113)
    .withWaitStrategy(Wait.forHttp('/health/live', 2113).forStatusCode(204))
    .start();

  return eventStoreContainer;
}

export function getPostgresConnectionString(): string {
  return postgresContainer.getConnectionUri();
}

export function getEventStoreConnectionString(): string {
  const host = eventStoreContainer.getHost();
  const port = eventStoreContainer.getMappedPort(2113);
  return `esdb://${host}:${port}?tls=false`;
}

export async function stopContainers(): Promise<void> {
  await Promise.all([postgresContainer?.stop(), eventStoreContainer?.stop()]);
}
