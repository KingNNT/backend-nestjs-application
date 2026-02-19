import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import type { ClsService } from 'nestjs-cls';
import { CLS_USER_ID } from '../cls/cls.constants';

function createExtendedClient(cls: ClsService) {
  const baseClient = new PrismaClient();

  return baseClient.$extends({
    query: {
      $allModels: {
        async create({ args, query, model }) {
          const userId = cls.isActive() ? cls.get(CLS_USER_ID) : undefined;
          args.data = {
            ...args.data,
            createdBy: args.data.createdBy ?? userId ?? null,
            updatedBy: args.data.updatedBy ?? userId ?? null,
          };
          return query(args);
        },

        async createMany({ args, query }) {
          const userId = cls.isActive() ? cls.get(CLS_USER_ID) : undefined;
          const records = Array.isArray(args.data) ? args.data : [args.data];
          args.data = records.map((record: Record<string, unknown>) => ({
            ...record,
            createdBy: record.createdBy ?? userId ?? null,
            updatedBy: record.updatedBy ?? userId ?? null,
          })) as typeof args.data;
          return query(args);
        },

        async createManyAndReturn({ args, query }) {
          const userId = cls.isActive() ? cls.get(CLS_USER_ID) : undefined;
          const records = Array.isArray(args.data) ? args.data : [args.data];
          args.data = records.map((record: Record<string, unknown>) => ({
            ...record,
            createdBy: record.createdBy ?? userId ?? null,
            updatedBy: record.updatedBy ?? userId ?? null,
          })) as typeof args.data;
          return query(args);
        },

        async update({ args, query }) {
          const userId = cls.isActive() ? cls.get(CLS_USER_ID) : undefined;
          args.data = {
            ...args.data,
            updatedBy: args.data.updatedBy ?? userId ?? null,
          };
          return query(args);
        },

        async updateMany({ args, query }) {
          const userId = cls.isActive() ? cls.get(CLS_USER_ID) : undefined;
          args.data = {
            ...args.data,
            updatedBy: args.data.updatedBy ?? userId ?? null,
          };
          return query(args);
        },

        async upsert({ args, query }) {
          const userId = cls.isActive() ? cls.get(CLS_USER_ID) : undefined;
          args.create = {
            ...args.create,
            createdBy: args.create.createdBy ?? userId ?? null,
            updatedBy: args.create.updatedBy ?? userId ?? null,
          };
          args.update = {
            ...args.update,
            updatedBy: args.update.updatedBy ?? userId ?? null,
          };
          return query(args);
        },

        async delete({ args, model }) {
          const userId = cls.isActive() ? cls.get(CLS_USER_ID) : undefined;
          const now = new Date();
          const delegate = Reflect.get(baseClient, lowerFirst(model)) as {
            update: (args: unknown) => Promise<unknown>;
          };
          return delegate.update({
            where: args.where,
            data: {
              deletedAt: now,
              deletedBy: userId ?? null,
              updatedBy: userId ?? null,
            },
          });
        },

        async deleteMany({ args, model }) {
          const userId = cls.isActive() ? cls.get(CLS_USER_ID) : undefined;
          const now = new Date();
          const delegate = Reflect.get(baseClient, lowerFirst(model)) as {
            updateMany: (args: unknown) => Promise<unknown>;
          };
          return delegate.updateMany({
            where: args.where,
            data: {
              deletedAt: now,
              deletedBy: userId ?? null,
              updatedBy: userId ?? null,
            },
          });
        },

        async findFirst({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },

        async findMany({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },

        async findUnique({ args, query }) {
          const result = await query(args);
          if (result && (result as Record<string, unknown>).deletedAt != null) {
            return null;
          }
          return result;
        },

        async findUniqueOrThrow({ args, query, model }) {
          const result = await query(args);
          if (result && (result as Record<string, unknown>).deletedAt != null) {
            throw new Prisma.PrismaClientKnownRequestError(
              `No ${model} found`,
              { code: 'P2025', clientVersion: Prisma.prismaVersion.client },
            );
          }
          return result;
        },

        async count({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },

        async aggregate({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },

        async groupBy({ args, query }) {
          args.where = { ...args.where, deletedAt: null };
          return query(args);
        },
      },
    },
  });
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

type ExtendedClient = ReturnType<typeof createExtendedClient>;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);
  private readonly _client: ExtendedClient;

  constructor(cls: ClsService) {
    this._client = createExtendedClient(cls);
  }

  async onModuleInit(): Promise<void> {
    await this._client.$connect();
    this.logger.log('Prisma connected to PostgreSQL');
  }

  async onModuleDestroy(): Promise<void> {
    await this._client.$disconnect();
  }

  get user() {
    return this._client.user;
  }

  get authCredential() {
    return this._client.authCredential;
  }

  get $transaction() {
    return this._client.$transaction.bind(this._client);
  }
}
