---
paths:
  - "src/**/*.ts"
---

# Security

## JWT Authentication

- **Access token**: short-lived, secret `JWT_ACCESS_SECRET` — used for API authorization
- **Refresh token**: long-lived, secret `JWT_REFRESH_SECRET` — used only to obtain new access tokens
- Each token type has its own Passport strategy (`JwtStrategy`, `JwtRefreshStrategy`) with separate secrets — an access token must never validate as a refresh token
- Token expiry configurable via `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN`
- Extract from `Authorization: Bearer <token>` header only — never from query params or cookies
- JWT payload contains `sub` field for userId

## Input Validation — Dual Layer

1. **DTO layer** (presentation): class-validator decorators — `@IsEmail()`, `@MinLength()`, `@MaxLength()`, `@IsNotEmpty()`
2. **Domain layer**: value object `create()` methods and aggregate validation — enforce business invariants
3. **Global ValidationPipe**: `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true` — strips unknown fields

Both layers must validate independently. DTOs catch malformed requests early; domain objects enforce business invariants.

## Password Security

- Bcrypt hashing via `BcryptPasswordHasher`
- Interface: `IPasswordHasher` with `hash()` and `verify()` — abstracted behind DI token
- Hash stored in `auth_credentials` table, separate from user aggregate and event store (GDPR)

## Auth Error Messages Must Be Vague

- Login failures: always return `"Invalid credentials"` — never reveal whether email or password was wrong
- Log the actual reason server-side via `@InjectPinoLogger()` for security audit trail
- All auth failures return identical 401 responses to prevent user enumeration

## Ownership Authorization

- Every mutation handler must verify ownership before modifying the aggregate
- Combine existence + ownership check into a single `NotFoundException` to avoid leaking resource existence:
  ```typescript
  if (!aggregate || aggregate.userId !== command.userId) {
    throw new NotFoundException('Resource not found');
  }
  ```

## Audit Trail

- Every table (except `domain_events`) includes: `createdAt`, `createdBy`, `updatedAt`, `updatedBy`, `deletedAt`, `deletedBy`
- `AuditableTableService` auto-populates `createdBy`/`updatedBy` from CLS context; provides `softDelete()`/`notDeleted()` helpers
- `ClsUserInterceptor` extracts JWT `sub` claim → stores in CLS at request start
- Never bypass the audit service — all mutations must be audited

## Soft Deletes

- Use `deletedAt` timestamp — never hard-delete user data
- All repository queries must include `isNull(table.deletedAt)` in WHERE clauses

## Duplicate Prevention

- Check for existing email AND username before registration — separate checks
- Database unique constraints as safety net
- Application-level check first (better error messages), DB constraint catches race conditions

## Concurrency Control

- Event store uses optimistic locking via unique constraint on `(stream_id, stream_version)`
- `ConcurrencyError` thrown on version mismatch
- Read model projection failures are logged but non-blocking (eventual consistency)

## Environment & Secrets

- All secrets via environment variables — never hardcoded
- `.env.example` documents required variables — keep updated when adding new ones
- Sensitive fields (passwords, tokens, authorization headers) are automatically redacted by pino logger
- Request IDs correlated via CLS (`X-Request-Id` header or auto-generated UUID)
