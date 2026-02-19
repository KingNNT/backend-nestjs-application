import { ApiProperty } from '@nestjs/swagger';

export class RegisterResponseDto {
  @ApiProperty({ description: 'The created user ID' })
  userId!: string;
}
