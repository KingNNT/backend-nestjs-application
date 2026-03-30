import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ClsService } from 'nestjs-cls';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { ClsUserInterceptor } from './shared/infrastructure/cls/cls-user.interceptor';
import { DomainExceptionFilter } from './shared/presentation/filters/domain-exception.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const cls = app.get(ClsService);
  app.useGlobalInterceptors(
    new ClsUserInterceptor(cls),
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new DomainExceptionFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Inviduality API')
    .setDescription('Event-sourced NestJS API with DDD + CQRS')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT ?? 8000);
}

bootstrap();
