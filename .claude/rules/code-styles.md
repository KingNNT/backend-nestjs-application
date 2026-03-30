---
paths:
  - "src/**/*.ts"
---

# Code Styles

## Package Manager

- **bun only** — never use npm, npx, or yarn. Use `bun` / `bun x` / `bunx` instead.

## Formatting

- Single quotes, 2-space indentation, trailing commas (see `biome.json`)
- Use `import type` for type-only imports
- **Exception**: never use `import type` for classes injected via NestJS constructor DI (`emitDecoratorMetadata: true`). TypeScript erases `import type` at runtime, so NestJS sees `Function` instead of the actual class. Use regular `import { ClassName }` for: `CommandBus`, `QueryBus`, `EventBus`, `ConfigService`, `JwtService`, `ClsService`, `DrizzleService`, `EventStoreService`, `AuditableTableService`, and any custom `@Injectable()` classes used in constructors. `import type` is fine for interfaces used with `@Inject()` Symbol tokens.

## Naming

| Concept            | Pattern                          | Example                              |
| ------------------ | -------------------------------- | ------------------------------------ |
| Controller         | `{Domain}Controller`             | `AuthController`, `UserController`   |
| Command            | `{Action}{Entity}Command`        | `CreateUserCommand`, `LoginCommand`  |
| Command Handler    | `{Action}{Entity}Handler`        | `CreateUserHandler`, `RegisterHandler` |
| Query              | `Get{Entity/Entities}Query`      | `GetUsersQuery`, `GetUserByIdQuery`  |
| Query Handler      | `Get{Entity/Entities}Handler`    | `GetUsersHandler`                    |
| Repository         | `{Entity}Repository`             | `AuthCredentialsRepository`          |
| Service impl       | `{Name}Impl` or `{Tech}{Name}`  | `TokenServiceImpl`, `BcryptPasswordHasher` |
| Value Object       | Simple noun, `.vo.ts` suffix     | `Email`, `UserId`                    |
| Aggregate          | `{Entity}Aggregate`              | `UserAggregate`                      |
| Domain Event       | `{Entity}{Action}Event`          | `UserCreatedEvent`                   |
| DTO (request)      | `{Action}RequestDto`             | `LoginRequestDto`                    |
| DTO (response)     | `{Action}ResponseDto`            | `LoginResponseDto`                   |
| Guard              | `Jwt{Type}Guard`                 | `JwtAuthGuard`, `JwtRefreshGuard`    |
| DI Token           | `{NAME}_TOKEN` symbol            | `PASSWORD_HASHER_TOKEN`, `USER_REPOSITORY_TOKEN` |
| Unit of Work       | `{Entity}UnitOfWork`             | `UserUnitOfWork`                     |

## File Naming

- Source: `kebab-case` — `auth-credentials.repository.ts`, `user.aggregate.ts`, `email.vo.ts`
- Unit tests: co-located as `{name}.spec.ts`
- Integration tests: `test/integration/{name}.integration.spec.ts`
- E2E tests: `test/e2e/{name}.e2e-spec.ts`

## DDD Layering

Every domain module follows this structure — do not flatten or merge layers:

```
src/modules/{domain}/
  ├── application/       # Commands, queries, handlers — orchestration only
  │   ├── commands/      # One folder per command (command + handler + spec)
  │   ├── queries/       # One folder per query (query + handler + spec)
  │   └── ports/         # Port interfaces + DI tokens
  ├── domain/            # Aggregates, value objects, events, repository interfaces
  │   ├── aggregates/
  │   ├── events/
  │   ├── repositories/  # Repository interfaces + tokens
  │   └── value-objects/
  ├── infrastructure/    # Repository implementations, external service adapters
  │   ├── persistence/   # Event store repos, read model repos
  │   └── unit-of-work/  # UoW implementations
  └── presentation/      # Controllers, DTOs, guards
      ├── controllers/
      └── dtos/
```

Shared base classes and cross-cutting concerns live in `src/shared/` with similar layering.

## Dependency Injection

- Define interfaces (ports) in `domain/repositories/` or `application/ports/`
- Create Symbol tokens: `export const FOO_TOKEN = Symbol('IFoo')`
- Bind in module with `{ provide: FOO_TOKEN, useExisting: FooImpl }`
- Inject via `@Inject(FOO_TOKEN)`
- Never import infrastructure directly from application or domain layers

## Commands & Handlers

- Commands are plain readonly POJOs — no decorators, no validation logic
- Handlers implement `ICommandHandler<Command, Result>` with a single `execute()` method
- Handler flow: validate preconditions → load aggregate → call domain methods → persist via UnitOfWork
- Return simple result interfaces, not DTOs — controllers transform results to DTOs

## Aggregates & Value Objects

- Aggregates use static `create()` for new instances and `reconstitute(events)` for rebuilding from event store
- Value objects use static `create()` with validation, freeze props in constructor
- Domain events are applied via `apply(event)` on aggregates — never mutate state directly
- Test aggregates by asserting `getUncommittedEvents()` after state transitions

## Unit of Work

- UoW implements `IUnitOfWork` interface with `commit(aggregate)` method
- Commit sequence: append events → update version → projection (best-effort) → clear → publish
- One UoW per aggregate

## Controllers

- One controller per aggregate/domain concept, one method per endpoint
- Flow: receive DTO → execute command/query via `CommandBus`/`QueryBus` → transform result
- Use `@ApiTags()`, `@ApiBearerAuth()`, `@UseGuards(JwtAuthGuard)` for all authenticated endpoints

## Database (Drizzle)

- Schema definitions in `src/shared/infrastructure/database/schema/`
- Every table (except `domain_events`) includes audit columns: `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`
- Soft deletes: always filter `isNull(table.deletedAt)` in repository queries
- Email fields: store as `.toLowerCase().trim()`
- Use `db:generate` for migrations, never `db:push`
