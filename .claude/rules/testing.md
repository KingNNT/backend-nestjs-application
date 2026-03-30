---
paths:
  - "src/**/*.spec.ts"
  - "src/**/*.ts"
  - "test/**"
---

# Testing (Jest)

## Test Types & Location

| Type        | Location                                          | Naming                        |
| ----------- | ------------------------------------------------- | ----------------------------- |
| Unit        | Co-located in `src/` next to source               | `{name}.spec.ts`              |
| Integration | `test/integration/`                               | `{name}.integration.spec.ts`  |
| E2E         | `test/e2e/`                                       | `{name}.e2e-spec.ts`          |

## Unit Tests

Test domain logic in isolation — aggregates, value objects, handlers.

**Aggregates**: create via `create()` or `reconstitute()`, call methods, assert via `getUncommittedEvents()`:

```typescript
it('should emit UserCreatedEvent on create', () => {
  const aggregate = UserAggregate.create({ ... });
  const events = aggregate.getUncommittedEvents();
  expect(events).toHaveLength(1);
  expect(events[0]).toBeInstanceOf(UserCreatedEvent);
});
```

**Value Objects**: test validation in `create()` — valid inputs return instances, invalid inputs throw:

```typescript
it('should reject invalid email', () => {
  expect(() => Email.create('not-an-email')).toThrow();
});
```

**Handlers**: mock all dependencies using factories from `test/helpers/mocks/`:

```typescript
const mockRepo = createMockUserRepository();
const mockUoW = createMockUnitOfWork();
const handler = new CreateUserHandler(mockRepo, mockUoW);
// Call execute(), assert interactions and results
```

**Unit of Work**: mock EventStoreService, read model repo, and EventBus. Test the 3 scenarios: no events (no-op), full commit flow, and read model projection failure (continues without throwing).

## Mock Factories

- Location: `test/helpers/mocks/{name}.mock.ts`
- Return `jest.Mocked<IInterface>` types
- Use `jest.fn()` for all methods — configure per-test with `.mockResolvedValue()` / `.mockRejectedValue()`
- Name pattern: `createMock{Name}()` — e.g., `createMockPasswordHasher()`, `createMockUnitOfWork()`

## Test Data Factories

- Location: `test/helpers/factories/{domain}.factory.ts`
- Use overrides pattern with defaults:

```typescript
export function createUserAggregate(overrides?: Partial<UserProps>) {
  return UserAggregate.create({
    userId: overrides?.userId ?? 'user-123',
    email: overrides?.email ?? 'test@example.com',
    ...overrides,
  });
}
```

## Integration Tests (TestContainers)

Real PostgreSQL via TestContainers — no mocking the database. 60s timeout.

```typescript
const container = new PostgreSqlContainer('postgres:16-alpine')
  .withDatabase('test_db')
  .withUsername('test')
  .withPassword('test');

// beforeEach: clean database
await cleanDatabase(db);

// afterAll: stop container
await container.stop();
```

- Query the database directly with Drizzle to assert side effects
- Always clean database in `beforeEach`, not `afterEach`

## E2E Tests

Full NestJS app via `test/helpers/test-app-factory.ts` with TestContainers. 120s timeout.

```typescript
const { app } = await createTestApp();
await request(app.getHttpServer())
  .post('/auth/login')
  .send({ email, password })
  .expect(200);
```

- Seed test data via API requests in `beforeEach`
- Override environment variables (DATABASE_URL, JWT secrets) — never use real secrets
- Assert both HTTP response shape and database side effects

## General Rules

- One assertion concept per test (multiple `expect` calls fine if they assert one logical thing)
- Test names describe behavior: `it('should reject invalid email')` not `it('test email validation')`
- When adding a new aggregate, create the corresponding test helper factories and mock factories before writing tests
- Run tests with: `bun run test` (unit), `bun run test:integration`, `bun run test:e2e`
- Single test: `bun run test -- --testPathPattern=<pattern>`
