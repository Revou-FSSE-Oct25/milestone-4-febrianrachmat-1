import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class WithdrawDto {
  @IsUUID()
  fromAccountId!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsOptional()
  @IsString()
  description?: string;
}
