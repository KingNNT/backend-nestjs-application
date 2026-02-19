# Backend NestJS Application

Backend API built with NestJS, following Clean Architecture, DDD, CQRS, and Event Sourcing.

## Tech Stack

- **Runtime**: Node.js with [Bun](https://bun.sh/) as package manager
- **Framework**: NestJS v11 / TypeScript 5.7
- **Event Store**: EventStoreDB (source of truth)
- **Read Model**: PostgreSQL via Prisma 6
- **Auth**: JWT (access + refresh tokens), bcrypt
- **Logging**: nestjs-pino (structured JSON in prod, pino-pretty in dev)
- **Linting**: Biome
- **Git Hooks**: Husky + lint-staged + commitlint + gitleaks

## Quick Start (New Project)

Create a new project from this template with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/KingNNT/backend-nestjs-application/develop/install.sh | bash
```

Or with a project name:

```bash
curl -fsSL https://raw.githubusercontent.com/KingNNT/backend-nestjs-application/develop/install.sh | bash -s my-project
```

The installer will prompt for project name, description, and author info, then set everything up automatically.

## Prerequisites

- [Bun](https://bun.sh/) installed
- [Docker](https://www.docker.com/) and Docker Compose (for PostgreSQL and EventStoreDB)

## Getting Started

```bash
# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Start infrastructure (PostgreSQL + EventStoreDB)
docker compose up -d

# Generate Prisma client and push schema
bunx prisma generate
bunx prisma db push

# Start in watch mode
bun run start:dev
```

The API will be available at `http://localhost:3000`. Swagger docs at `http://localhost:3000/docs`.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run start:dev` | Start in watch mode |
| `bun run build` | Compile the project |
| `bun run start:prod` | Run compiled output |
| `bun run check` | Lint + format (Biome) |
| `bun run test` | Unit tests |
| `bun run test:integration` | Integration tests (Docker required) |
| `bun run test:e2e` | End-to-end tests (Docker required) |
| `bun run test:install` | Install script tests (bats) |

## Git Hooks

Git hooks are set up automatically via Husky on `bun install`. On every commit:

1. **gitleaks** — scans staged changes for leaked secrets
2. **lint-staged** — runs Biome check on staged `.ts` files
3. **commitlint** — enforces [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.)

## Architecture

The application follows Clean Architecture with two bounded contexts:

- **User** — Identity aggregate with full event sourcing. Events are persisted to EventStoreDB and projected to a PostgreSQL read model.
- **Auth** — Handles registration, login, password hashing, and JWT token management. Credentials are stored in PostgreSQL (not in the event store, for GDPR compliance).

Cross-context communication uses NestJS CQRS CommandBus (synchronous) and integration events (asynchronous).

```
src/
├── shared/          # Base classes, global modules (EventStore, Prisma)
├── modules/
│   ├── user/        # User bounded context
│   │   ├── domain/          # Aggregate, value objects, events
│   │   ├── application/     # Command handlers, port interfaces
│   │   ├── infrastructure/  # EventStoreDB repo, Prisma read model, UoW
│   │   └── presentation/    # (future controllers)
│   └── auth/        # Auth bounded context
│       ├── domain/          # Domain errors
│       ├── application/     # Register/Login handlers, port interfaces
│       ├── infrastructure/  # bcrypt, JWT, Prisma credentials repo
│       └── presentation/    # Controllers, DTOs, guards
```

## Environment Variables

See [`.env.example`](.env.example) for all required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `EVENTSTORE_CONNECTION_STRING` — EventStoreDB connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — JWT signing secrets
- `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` — Token expiration
- `PORT` — Server port (default: 3000)
- `NODE_ENV` — Environment (`development` or `production`)
- `LOG_LEVEL` — Log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal`, `silent` (default: `debug` in dev, `info` in prod)
