import { Global, Module } from '@nestjs/common';
import { AuditableTableService } from './auditable-table.service';
import { DrizzleService } from './drizzle.service';

@Global()
@Module({
  providers: [DrizzleService, AuditableTableService],
  exports: [DrizzleService, AuditableTableService],
})
export class DrizzleModule {}
