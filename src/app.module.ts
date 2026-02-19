import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { AppClsModule } from './shared/infrastructure/cls/cls.module';
import { EventStoreModule } from './shared/infrastructure/event-store/event-store.module';
import { AppLoggerModule } from './shared/infrastructure/logger/logger.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    AppClsModule,
    AppLoggerModule,
    PrismaModule,
    EventStoreModule,
    UserModule,
    AuthModule,
  ],
})
export class AppModule {}
