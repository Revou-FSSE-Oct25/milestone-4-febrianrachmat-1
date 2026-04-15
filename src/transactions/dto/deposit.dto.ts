import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class DepositDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  toAccountId!: string;

  @ApiProperty({ example: 100.5, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({ example: 'Salary' })
  @IsOptional()
  @IsString()
  description?: string;
}
