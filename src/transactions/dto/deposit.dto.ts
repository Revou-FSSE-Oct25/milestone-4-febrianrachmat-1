import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class DepositDto {
  @IsUUID()
  toAccountId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
