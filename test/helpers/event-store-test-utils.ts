import { EventStoreDBClient } from '@eventstore/db-client';

let client: EventStoreDBClient;

export function createEventStoreClient(
  connectionString: string,
): EventStoreDBClient {
  client = EventStoreDBClient.connectionString(connectionString);
  return client;
}

export async function disposeEventStoreClient(
  c?: EventStoreDBClient,
): Promise<void> {
  const cl = c ?? client;
  await cl?.dispose();
}
