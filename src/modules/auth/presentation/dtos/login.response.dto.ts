import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({ description: 'JWT access token (short-lived)' })
  accessToken!: string;

  @ApiProperty({ description: 'JWT refresh token (long-lived)' })
  refreshToken!: string;
}
