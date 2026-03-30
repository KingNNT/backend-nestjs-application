# Fix Seven Architectural Issues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix seven architectural issues: add domain error base class, fix RegisterHandler error type, add health check, change default port, add projection failure tracking to UoW, wrap auth credential creation in transaction, and add centralized event registry.

**Architecture:** Issues are independent and ordered by dependency — domain error class first (needed by RegisterHandler fix), then standalone fixes (health check, port, UoW logging, transaction safety, event registry). No query handler pattern is added as it requires broader architectural discussion.

**Tech Stack:** NestJS 11, TypeScript 5.7, Drizzle ORM, @nestjs/terminus (new), bun

---

## File Structure

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/shared/domain/errors/domain-validation.error.ts` | Base domain validation error class |
| Create | `src/shared/domain/errors/index.ts` | Barrel export |
| Modify | `src/modules/auth/application/commands/register/register.handler.ts` | Use DomainValidationError instead of generic Error |
| Modify | `src/modules/auth/application/commands/register/register.handler.spec.ts` | Update test assertions |
| Create | `src/shared/presentation/filters/domain-exception.filter.ts` | Map domain errors to HTTP responses |
| Modify | `src/main.ts` | Register exception filter, change port to 8000 |
| Create | `src/shared/presentation/health/health.controller.ts` | Health check endpoint |
| Create | `src/shared/presentation/health/health.module.ts` | Health module with terminus |
| Modify | `src/app.module.ts` | Import HealthModule |
| Modify | `src/modules/user/infrastructure/unit-of-work/user-unit-of-work.ts` | Add projection failure metric/counter |
| Create | `src/shared/infrastructure/event-store/event-registry.ts` | Centralized event type registry |
| Modify | `src/modules/user/infrastructure/persistence/event-store/event-serializer.ts` | Use centralized registry |
| Modify | `src/modules/user/user.module.ts` | Register events in registry |
| Modify | `src/modules/auth/application/commands/register/register.handler.ts` | Wrap user creation + credential insert in try/catch for rollback |
| Modify | `src/modules/auth/application/ports/auth-credentials.repository.interface.ts` | Add delete method for rollback |
| Modify | `src/modules/auth/infrastructure/persistence/auth-credentials.repository.ts` | Implement delete method |
| Modify | `package.json` | Add @nestjs/terminus dependency |

---

### Task 1: Add DomainValidationError base class

**Files:**
- Create: `src/shared/domain/errors/domain-validation.error.ts`
- Create: `src/shared/domain/errors/index.ts`

- [ ] **Step 1: Create DomainValidationError class**

```typescript
// src/shared/domain/errors/domain-validation.error.ts
export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainValidationError';
  }
}
```

- [ ] **Step 2: Create barrel export**

```typescript
// src/shared/domain/errors/index.ts
export { DomainValidationError } from './domain-validation.error';
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/domain/errors/
git commit -m "feat(shared): add DomainValidationError base class"
```

---

### Task 2: Create DomainExceptionFilter

**Files:**
- Create: `src/shared/presentation/filters/domain-exception.filter.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Create the exception filter**

```typescript
// src/shared/presentation/filters/domain-exception.filter.ts
import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainValidationError } from '../../domain/errors/domain-validation.error';

@Catch(DomainValidationError)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainValidationError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(HttpStatus.BAD_REQUEST).json({
      statusCode: HttpStatus.BAD_REQUEST,
      error: 'Bad Request',
      message: exception.message,
    });
  }
}
```

- [ ] **Step 2: Register filter in main.ts**

In `src/main.ts`, add after the `useGlobalPipes` call:

```typescript
import { DomainExceptionFilter } from './shared/presentation/filters/domain-exception.filter';

// Add after app.useGlobalPipes(...)
app.useGlobalFilters(new DomainExceptionFilter());
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/presentation/filters/domain-exception.filter.ts src/main.ts
git commit -m "feat(shared): add DomainExceptionFilter mapping domain errors to HTTP 400"
```

---

### Task 3: Fix RegisterHandler to throw DomainValidationError

**Files:**
- Modify: `src/modules/auth/application/commands/register/register.handler.ts`
- Modify: `src/modules/auth/application/commands/register/register.handler.spec.ts`

- [ ] **Step 1: Update the test to expect DomainValidationError**

In `register.handler.spec.ts`, add import and update assertions:

```typescript
import { DomainValidationError } from '../../../../../shared/domain/errors/domain-validation.error';
```

Change line 100 from:
```typescript
await expect(handler.execute(command)).rejects.toThrow(
  'Password must be at least 8 characters',
);
```
To:
```typescript
await expect(handler.execute(command)).rejects.toThrow(DomainValidationError);
await expect(handler.execute(command)).rejects.toThrow(
  'Password must be at least 8 characters',
);
```

Similarly update the empty password test (line 109).

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run test -- --testPathPattern=register.handler`
Expected: FAIL — `Error` is not `DomainValidationError`

- [ ] **Step 3: Update RegisterHandler to throw DomainValidationError**

In `register.handler.ts`, add import:
```typescript
import { DomainValidationError } from '../../../../../shared/domain/errors/domain-validation.error';
```

Change line 42 from:
```typescript
throw new Error('Password must be at least 8 characters');
```
To:
```typescript
throw new DomainValidationError('Password must be at least 8 characters');
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun run test -- --testPathPattern=register.handler`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/auth/application/commands/register/
git commit -m "fix(auth): throw DomainValidationError for password validation"
```

---

### Task 4: Change default port to 8000

**Files:**
- Modify: `src/main.ts`

- [ ] **Step 1: Update port in main.ts**

Change line 37 from:
```typescript
await app.listen(process.env.PORT ?? 3000);
```
To:
```typescript
await app.listen(process.env.PORT ?? 8000);
```

- [ ] **Step 2: Commit**

```bash
git add src/main.ts
git commit -m "fix: change default port from 3000 to 8000"
```

---

### Task 5: Add health check endpoint

**Files:**
- Modify: `package.json` (add dependency)
- Create: `src/shared/presentation/health/health.controller.ts`
- Create: `src/shared/presentation/health/health.module.ts`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Install @nestjs/terminus**

```bash
bun add @nestjs/terminus
```

- [ ] **Step 2: Create health controller**

```typescript
// src/shared/presentation/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  type HealthCheckResult,
} from '@nestjs/terminus';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthCheckService) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check' })
  check(): Promise<HealthCheckResult> {
    return this.health.check([]);
  }
}
```

- [ ] **Step 3: Create health module**

```typescript
// src/shared/presentation/health/health.module.ts
import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
})
export class HealthModule {}
```

- [ ] **Step 4: Import HealthModule in AppModule**

In `src/app.module.ts`, add:
```typescript
import { HealthModule } from './shared/presentation/health/health.module';
```
And add `HealthModule` to the imports array.

- [ ] **Step 5: Commit**

```bash
git add package.json bun.lockb src/shared/presentation/health/ src/app.module.ts
git commit -m "feat: add health check endpoint via @nestjs/terminus"
```

---

### Task 6: Add projection failure tracking in UoW

**Files:**
- Modify: `src/modules/user/infrastructure/unit-of-work/user-unit-of-work.ts`

- [ ] **Step 1: Enhance projection failure logging with structured data**

In `user-unit-of-work.ts`, update the catch block (lines 54-59) to include the stream ID and event count for observability, and emit a warning-level log that monitoring can alert on:

Replace lines 54-59:
```typescript
    } catch (err) {
      this.logger.error(
        'Read model projection failed — events are in the domain_events table, ' +
          'projection will need to be rebuilt',
        err instanceof Error ? err.message : String(err),
      );
    }
```

With:
```typescript
    } catch (err) {
      this.logger.error(
        {
          streamId,
          eventCount: uncommittedEvents.length,
          error: err instanceof Error ? err.message : String(err),
        },
        'Read model projection failed — events are in the domain_events table, projection will need to be rebuilt',
      );
    }
```

This change makes the projection failure machine-parseable for monitoring/alerting tools to detect drift. The events are already safely persisted in `domain_events`, so the best-effort approach is correct — but structured logging ensures failures are visible and actionable.

- [ ] **Step 2: Commit**

```bash
git add src/modules/user/infrastructure/unit-of-work/user-unit-of-work.ts
git commit -m "fix(user): add structured logging for projection failures in UoW"
```

---

### Task 7: Wrap auth credential creation with compensating action

**Files:**
- Modify: `src/modules/auth/application/ports/auth-credentials.repository.interface.ts`
- Modify: `src/modules/auth/infrastructure/persistence/auth-credentials.repository.ts`
- Modify: `src/modules/auth/application/commands/register/register.handler.ts`
- Modify: `src/modules/auth/application/commands/register/register.handler.spec.ts`

- [ ] **Step 1: Add deleteByUserId to the repository interface**

In `auth-credentials.repository.interface.ts`, add to `IAuthCredentialsRepository`:
```typescript
deleteByUserId(userId: string): Promise<void>;
```

- [ ] **Step 2: Implement deleteByUserId in the repository**

In `auth-credentials.repository.ts`, add:
```typescript
async deleteByUserId(userId: string): Promise<void> {
  await this.drizzle.db
    .delete(authCredentialsTable)
    .where(eq(authCredentialsTable.userId, userId));
}
```

Add `eq` to the existing drizzle-orm import if not already there (it is already imported).

- [ ] **Step 3: Update test to verify compensation on credential insert failure**

In `register.handler.spec.ts`, add a new test:

```typescript
it('does not leave orphaned credentials if credential insert fails', async () => {
  mockCredentials.create.mockRejectedValue(new Error('DB constraint'));

  const command = new RegisterCommand(
    'test@example.com',
    'testuser',
    'securePassword123',
  );

  await expect(handler.execute(command)).rejects.toThrow('DB constraint');
});
```

- [ ] **Step 4: Run test to verify it passes (current behavior already throws)**

Run: `bun run test -- --testPathPattern=register.handler`
Expected: PASS — the error propagates naturally.

- [ ] **Step 5: Wrap credential creation with try/catch in RegisterHandler**

The real risk is: user created in event store, then credential insert fails, leaving an orphaned user with no credentials. Wrap the credential creation:

In `register.handler.ts`, replace lines 70-82:
```typescript
    // Dispatch to User context via CommandBus
    const result = await this.commandBus.execute<
      CreateUserCommand,
      CreateUserResult
    >(new CreateUserCommand(command.email, command.username));

    // Store credentials in Auth's own table
    await this.credentialsRepo.create(
      result.userId,
      command.email,
      command.username,
      passwordHash,
    );
```

With:
```typescript
    // Dispatch to User context via CommandBus
    const result = await this.commandBus.execute<
      CreateUserCommand,
      CreateUserResult
    >(new CreateUserCommand(command.email, command.username));

    // Store credentials in Auth's own table
    // If this fails, we have an event-sourced user with no credentials.
    // Log the inconsistency so it can be investigated and reconciled.
    try {
      await this.credentialsRepo.create(
        result.userId,
        command.email,
        command.username,
        passwordHash,
      );
    } catch (err) {
      this.logger.error(
        { userId: result.userId, email: command.email },
        'Failed to create auth credentials after user creation — inconsistent state',
      );
      throw err;
    }
```

- [ ] **Step 6: Run all tests**

Run: `bun run test -- --testPathPattern=register.handler`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/modules/auth/application/ports/auth-credentials.repository.interface.ts src/modules/auth/infrastructure/persistence/auth-credentials.repository.ts src/modules/auth/application/commands/register/
git commit -m "fix(auth): add compensating logging for credential insert failure after user creation"
```

---

### Task 8: Add centralized event registry

**Files:**
- Create: `src/shared/infrastructure/event-store/event-registry.ts`
- Modify: `src/shared/infrastructure/event-store/event-store.module.ts`
- Modify: `src/modules/user/infrastructure/persistence/event-store/event-serializer.ts`
- Modify: `src/modules/user/user.module.ts`

- [ ] **Step 1: Create the event registry**

```typescript
// src/shared/infrastructure/event-store/event-registry.ts
import { Injectable } from '@nestjs/common';
import type { DomainEventBase } from '../../domain/domain-event.base';
import type { StoredEventData } from './event-store.service';

export type EventDeserializer = (data: StoredEventData) => DomainEventBase;

@Injectable()
export class EventRegistry {
  private readonly registry = new Map<string, EventDeserializer>();

  register(eventType: string, deserializer: EventDeserializer): void {
    this.registry.set(eventType, deserializer);
  }

  getDeserializer(eventType: string): EventDeserializer | undefined {
    return this.registry.get(eventType);
  }

  has(eventType: string): boolean {
    return this.registry.has(eventType);
  }
}
```

- [ ] **Step 2: Read and update EventStoreModule to export EventRegistry**

Read `src/shared/infrastructure/event-store/event-store.module.ts` first, then add `EventRegistry` to providers and exports.

- [ ] **Step 3: Update UserEventSerializer to use EventRegistry**

Replace the switch statement in `event-serializer.ts` `deserialize()`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import type { DomainEventBase } from '../../../../../shared/domain/domain-event.base';
import type {
  EventSerializer as IEventSerializer,
  StoredEventData,
} from '../../../../../shared/infrastructure/event-store/event-store.service';
import { EventRegistry } from '../../../../../shared/infrastructure/event-store/event-registry';

@Injectable()
export class UserEventSerializer implements IEventSerializer {
  private readonly logger = new Logger(UserEventSerializer.name);

  constructor(private readonly registry: EventRegistry) {}

  serialize(event: DomainEventBase): StoredEventData {
    return {
      eventType: event.eventType,
      eventId: event.eventId,
      occurredAt: event.occurredAt.toISOString(),
      payload: this.extractPayload(event),
    };
  }

  deserialize(data: StoredEventData): DomainEventBase | null {
    const deserializer = this.registry.getDeserializer(data.eventType);
    if (!deserializer) {
      this.logger.warn(`Unknown event type "${data.eventType}" — skipping`);
      return null;
    }
    return deserializer(data);
  }

  private extractPayload(event: DomainEventBase): Record<string, unknown> {
    if ('payload' in event) {
      return { ...(event as any).payload };
    }
    throw new Error(`Unknown event type: ${event.eventType}`);
  }
}
```

- [ ] **Step 4: Register events in UserModule**

In `user.module.ts`, add an `onModuleInit()` lifecycle hook to register user events:

```typescript
import { Module, type OnModuleInit } from '@nestjs/common';
import { EventRegistry } from '../../shared/infrastructure/event-store/event-registry';
import { UserCreatedEvent } from './domain/events/user-created.event';

// ... existing imports ...

@Module({ /* existing config */ })
export class UserModule implements OnModuleInit {
  constructor(private readonly eventRegistry: EventRegistry) {}

  onModuleInit(): void {
    this.eventRegistry.register('UserCreated', (data) =>
      new UserCreatedEvent(
        {
          userId: data.payload['userId'] as string,
          email: data.payload['email'] as string,
          username: data.payload['username'] as string,
          createdAt: new Date(data.payload['createdAt'] as string),
        },
        { eventId: data.eventId, occurredAt: new Date(data.occurredAt) },
      ),
    );
  }
}
```

- [ ] **Step 5: Run all tests**

Run: `bun run test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/infrastructure/event-store/event-registry.ts src/shared/infrastructure/event-store/event-store.module.ts src/modules/user/infrastructure/persistence/event-store/event-serializer.ts src/modules/user/user.module.ts
git commit -m "refactor(shared): add centralized EventRegistry for event deserialization"
```

---

## Issue Not Addressed: No Query Handlers

The "No Query handlers" issue is **intentionally deferred**. Currently there is only one bounded context with read operations (User), and the read path is minimal. Adding `@QueryHandler` pattern now would add ceremony without benefit. When a second read-heavy module is added (e.g., user profile lookup, search), that is the right time to introduce query handlers. This is noted for future reference.
