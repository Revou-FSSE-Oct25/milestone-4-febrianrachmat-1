import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class TransferDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  fromAccountId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  toAccountId!: string;

  @ApiProperty({ example: 25, minimum: 0.01 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
