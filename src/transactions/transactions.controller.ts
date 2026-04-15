import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@ApiBearerAuth('JWT-auth')
@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('deposit')
  @ApiOperation({ summary: 'Deposit to an account you own' })
  async deposit(@CurrentUser() user: JwtPayload, @Body() dto: DepositDto) {
    return await this.transactionsService.deposit(user, dto);
  }

  @Post('withdraw')
  @ApiOperation({ summary: 'Withdraw from an account you own' })
  async withdraw(@CurrentUser() user: JwtPayload, @Body() dto: WithdrawDto) {
    return await this.transactionsService.withdraw(user, dto);
  }

  @Post('transfer')
  @ApiOperation({
    summary: 'Transfer from your account to another account',
  })
  async transfer(@CurrentUser() user: JwtPayload, @Body() dto: TransferDto) {
    return await this.transactionsService.transfer(user, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'List transactions (involving your accounts; ADMIN sees all)',
  })
  async findAll(@CurrentUser() user: JwtPayload) {
    return await this.transactionsService.findAll(user);
  }

  @Get(':id')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOperation({ summary: 'Get one transaction by id' })
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return await this.transactionsService.findOne(user, id);
  }
}
