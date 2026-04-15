import { AccountType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateAccountDto {
  @IsEnum(AccountType)
  type!: AccountType;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;
}
