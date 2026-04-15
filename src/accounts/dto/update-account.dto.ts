import { AccountType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;
}
