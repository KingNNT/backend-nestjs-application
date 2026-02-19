# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Package manager: bun (not npm/yarn)
bun install                  # Install dependencies

# Development
bun run start:dev            # Watch mode
bun run build                # Compile via nest build
bun run start:prod           # Run compiled output

# Linting & formatting (Biome — single quotes, 2-space indent, trailing commas)
bun run check                # Lint + format in one pass (--write)
bun run lint                 # Lint only (--write)
bun run format               # Format only (--write)

# Testing
bun run test                 # Unit tests (src/**/*.spec.ts)
bun run test -- --testPathPattern=<pattern>   # Single unit test
bun run test:integration     # Integration tests (Testcontainers — Docker required)
bun run test:e2e             # End-to-end tests (Testcontainers — Docker required)

# Database
bunx prisma generate         # Regenerate Prisma client after schema changes
bunx prisma db push          # Push schema to local DB (dev only)

# Infrastructure
docker compose up -d         # Start PostgreSQL + EventStoreDB (dev ports exposed via override)
```

## Architecture

Clean Architecture + DDD + CQRS + Event Sourcing on NestJS v11 / TypeScript 5.7 (`nodenext` module resolution, CJS output).

**Data stores**: PostgreSQL via Prisma 6 (read model projections) and EventStoreDB (event store / source of truth).

### Bounded Contexts

Two modules under `src/modules/`, communicating via `@nestjs/cqrs` CommandBus (sync) and integration events (async):

| Context | Purpose | Key classes |
|---------|---------|-------------|
| **User** (`src/modules/user/`) | Identity aggregate, event sourcing, read model | `UserAggregate`, `UserUnitOfWork`, `UserEventStoreRepository` |
| **Auth** (`src/modules/auth/`) | Credentials, password hashing, JWT tokens | `RegisterHandler`, `LoginHandler`, `BcryptPasswordHasher`, `TokenServiceImpl` |

Shared base classes live in `src/shared/` (AggregateRootBase, DomainEventBase, ValueObject, EventStoreService, PrismaService). EventStoreModule, PrismaModule, and AppLoggerModule are global.

### Layer Rules

- **Domain** (`domain/`): Zero infrastructure imports. Aggregates, Value Objects, domain events, repository interfaces only.
- **Application** (`application/`): Command/query handlers, port interfaces (using Symbol tokens for DI).
- **Infrastructure** (`infrastructure/`): Adapters implementing ports. Password hashing, persistence, event serialization.
- **Presentation** (`presentation/`): Controllers, DTOs, guards.

### Key Flows

**Register**: `Auth.RegisterHandler` → hash password → `CommandBus.execute(CreateUserCommand)` → `User.CreateUserHandler` → `UserUnitOfWork.commit()` (EventStoreDB → version update → read model projection → clear → publish to EventBus) → return userId → Auth stores credentials in `auth_credentials` table.

**Login**: `Auth.LoginHandler` → lookup `auth_credentials` → verify password → generate JWT pair. No EventStoreDB interaction.

### Unit of Work Commit Sequence

`UserUnitOfWork.commit()` performs these steps in order:
1. Append events to EventStoreDB (source of truth)
2. Update aggregate version
3. Update read model projection (best-effort — failure is logged, not thrown)
4. Clear uncommitted events
5. Publish to NestJS EventBus

### DI Token Pattern

Ports use Symbol tokens, bound in module providers via `useExisting`:
```typescript
export const USER_REPOSITORY_TOKEN = Symbol('IUserRepository');
// In module: { provide: USER_REPOSITORY_TOKEN, useExisting: UserEventStoreRepository }
// In handler: @Inject(USER_REPOSITORY_TOKEN) private readonly repo: IUserRepository
```

### Important Design Decisions

- Password hashes are stored in Auth's `auth_credentials` Prisma table, never in EventStoreDB events (GDPR).
- `EventStoreService.appendToStream()` takes `serializer` as a parameter (not injected) to support multiple bounded contexts with different event types.
- `EventSerializer.deserialize()` returns `null` for unknown event types (forward compatibility).
- `DomainEventBase` constructor accepts optional `eventId`/`occurredAt` for correct deserialization from stored events.
- `ValueObject<T>` generic has no constraint on `T`.
- All auth failures return identical 401 responses to prevent user enumeration.
- Structured logging via `nestjs-pino`. Auth handlers use `@InjectPinoLogger()` for security audit logs. Other services use NestJS built-in `Logger` (auto-delegates to pino). `LOG_LEVEL` env var controls output (default: `debug` in dev, `info` in prod). Sensitive fields (passwords, tokens, authorization headers) are automatically redacted. Request IDs are correlated via CLS (`X-Request-Id` header or auto-generated UUID).

### Prisma Models

Two tables in one schema, owned by different contexts:
- `users` — User read model (no password). Projected from EventStoreDB.
- `auth_credentials` — Auth context. Password hash, login tracking.

### Git Hooks (Husky)

Pre-commit hooks are managed by Husky. On every commit:
1. **gitleaks** — scans staged changes for secrets/credentials (`bin/gitleaks.sh`)
2. **lint-staged** — runs `biome check --write` on staged `.ts` files

Commit messages are validated by **commitlint** (conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, etc.).

### Testing

- **Unit tests** (`*.spec.ts` in `src/`): Pure logic, mocks in `test/helpers/mocks/`, factories in `test/helpers/factories/`.
- **Integration tests** (`test/integration/*.integration.spec.ts`): Use Testcontainers for real PostgreSQL and EventStoreDB. 60s timeout.
- **E2E tests** (`test/e2e/*.e2e-spec.ts`): Full app via `test/helpers/test-app-factory.ts` with Testcontainers. 120s timeout.
