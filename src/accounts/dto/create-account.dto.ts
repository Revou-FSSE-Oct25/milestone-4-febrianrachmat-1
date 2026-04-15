import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AccountType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ enum: AccountType, example: AccountType.SAVINGS })
  @IsEnum(AccountType)
  type!: AccountType;

  @ApiPropertyOptional({
    description: 'ADMIN only: create account for another user',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Optional custom number; otherwise auto-generated',
  })
  @IsOptional()
  @IsString()
  accountNumber?: string;
}
