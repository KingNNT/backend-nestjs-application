import { Global, Module } from '@nestjs/common';
import { EventRegistry } from './event-registry';
import { EventStoreService } from './event-store.service';

@Global()
@Module({
  providers: [EventStoreService, EventRegistry],
  exports: [EventStoreService, EventRegistry],
})
export class EventStoreModule {}
