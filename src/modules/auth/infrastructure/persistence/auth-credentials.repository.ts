import { Injectable } from '@nestjs/common';
import type { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import type {
  AuthCredentialRecord,
  IAuthCredentialsRepository,
} from '../../application/ports/auth-credentials.repository.interface';

@Injectable()
export class AuthCredentialsRepository implements IAuthCredentialsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailOrUsername(
    identifier: string,
  ): Promise<AuthCredentialRecord | null> {
    return this.prisma.authCredential.findFirst({
      where: {
        OR: [{ email: identifier.toLowerCase() }, { username: identifier }],
      },
      select: {
        userId: true,
        email: true,
        username: true,
        passwordHash: true,
        isActive: true,
      },
    });
  }

  async create(
    userId: string,
    email: string,
    username: string,
    passwordHash: string,
  ): Promise<void> {
    await this.prisma.authCredential.create({
      data: {
        userId,
        email: email.toLowerCase().trim(),
        username,
        passwordHash,
        isActive: true,
      },
    });
  }

  async updateLastLogin(userId: string, at: Date): Promise<void> {
    await this.prisma.authCredential.update({
      where: { userId },
      data: { lastLoginAt: at },
    });
  }
}
