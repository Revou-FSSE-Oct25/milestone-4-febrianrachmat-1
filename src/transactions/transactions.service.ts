import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionType, UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { PrismaService } from '../prisma/prisma.service';
import { DepositDto } from './dto/deposit.dto';
import { TransferDto } from './dto/transfer.dto';
import { WithdrawDto } from './dto/withdraw.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prismaService: PrismaService) {}

  private isAdmin(user: JwtPayload) {
    return user.role === UserRole.ADMIN;
  }

  private toDecimal(amount: number) {
    return new Prisma.Decimal(amount.toFixed(2));
  }

  private async assertAccountOwnedForCustomer(
    currentUser: JwtPayload,
    accountId: string,
  ) {
    const account = await this.prismaService.account.findUnique({
      where: { id: accountId },
    });
    if (!account) throw new NotFoundException('account not found');
    if (!this.isAdmin(currentUser) && account.userId !== currentUser.sub) {
      throw new ForbiddenException('access denied');
    }
    return account;
  }

  private async getUserAccountIds(userId: string) {
    const rows = await this.prismaService.account.findMany({
      where: { userId },
      select: { id: true },
    });
    return rows.map((r) => r.id);
  }

  async deposit(currentUser: JwtPayload, dto: DepositDto) {
    await this.assertAccountOwnedForCustomer(currentUser, dto.toAccountId);
    const amount = this.toDecimal(dto.amount);

    return await this.prismaService.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: dto.toAccountId },
        data: { balance: { increment: amount } },
      });

      return await tx.transaction.create({
        data: {
          amount,
          type: TransactionType.DEPOSIT,
          fromAccountId: null,
          toAccountId: dto.toAccountId,
          description: dto.description,
        },
      });
    });
  }

  async withdraw(currentUser: JwtPayload, dto: WithdrawDto) {
    const account = await this.assertAccountOwnedForCustomer(
      currentUser,
      dto.fromAccountId,
    );
    const amount = this.toDecimal(dto.amount);
    const balance = new Prisma.Decimal(account.balance);

    if (balance.lessThan(amount)) {
      throw new BadRequestException('insufficient funds');
    }

    return await this.prismaService.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: dto.fromAccountId },
        data: { balance: { decrement: amount } },
      });

      return await tx.transaction.create({
        data: {
          amount,
          type: TransactionType.WITHDRAW,
          fromAccountId: dto.fromAccountId,
          toAccountId: null,
          description: dto.description,
        },
      });
    });
  }

  async transfer(currentUser: JwtPayload, dto: TransferDto) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('from and to accounts must differ');
    }

    const from = await this.assertAccountOwnedForCustomer(
      currentUser,
      dto.fromAccountId,
    );

    const to = await this.prismaService.account.findUnique({
      where: { id: dto.toAccountId },
    });
    if (!to) throw new NotFoundException('destination account not found');

    const amount = this.toDecimal(dto.amount);
    const balance = new Prisma.Decimal(from.balance);

    if (balance.lessThan(amount)) {
      throw new BadRequestException('insufficient funds');
    }

    return await this.prismaService.$transaction(async (tx) => {
      await tx.account.update({
        where: { id: dto.fromAccountId },
        data: { balance: { decrement: amount } },
      });
      await tx.account.update({
        where: { id: dto.toAccountId },
        data: { balance: { increment: amount } },
      });

      return await tx.transaction.create({
        data: {
          amount,
          type: TransactionType.TRANSFER,
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          description: dto.description,
        },
      });
    });
  }

  async findAll(currentUser: JwtPayload) {
    if (this.isAdmin(currentUser)) {
      return await this.prismaService.transaction.findMany({
        orderBy: { createdAt: 'desc' },
      });
    }

    const ids = await this.getUserAccountIds(currentUser.sub);
    if (ids.length === 0) return [];

    return await this.prismaService.transaction.findMany({
      where: {
        OR: [{ fromAccountId: { in: ids } }, { toAccountId: { in: ids } }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(currentUser: JwtPayload, id: string) {
    const txRow = await this.prismaService.transaction.findUnique({
      where: { id },
    });

    if (!txRow) throw new NotFoundException('transaction not found');

    if (this.isAdmin(currentUser)) {
      return txRow;
    }

    const accountIds = [txRow.fromAccountId, txRow.toAccountId].filter(
      (v): v is string => Boolean(v),
    );

    if (accountIds.length === 0) {
      throw new ForbiddenException('access denied');
    }

    const ownerRows = await this.prismaService.account.findMany({
      where: { id: { in: accountIds }, userId: currentUser.sub },
      select: { id: true },
    });

    if (ownerRows.length === 0) {
      throw new ForbiddenException('access denied');
    }

    return txRow;
  }
}
