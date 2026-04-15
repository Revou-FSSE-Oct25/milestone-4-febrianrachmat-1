import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { TransactionsService } from './transactions.service';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post('deposit')
  async deposit(@CurrentUser() user: JwtPayload, @Body() dto: DepositDto) {
    return await this.transactionsService.deposit(user, dto);
  }

  @Post('withdraw')
  async withdraw(@CurrentUser() user: JwtPayload, @Body() dto: WithdrawDto) {
    return await this.transactionsService.withdraw(user, dto);
  }

  @Post('transfer')
  async transfer(@CurrentUser() user: JwtPayload, @Body() dto: TransferDto) {
    return await this.transactionsService.transfer(user, dto);
  }

  @Get()
  async findAll(@CurrentUser() user: JwtPayload) {
    return await this.transactionsService.findAll(user);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return await this.transactionsService.findOne(user, id);
  }
}
