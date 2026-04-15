/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionType, UserRole } from '@prisma/client';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from './transactions.service';

type PrismaMock = {
  account: {
    findUnique: jest.Mock;
    findMany: jest.Mock;
    update: jest.Mock;
  };
  transaction: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
  };
  $transaction: jest.Mock;
};

describe('TransactionsService', () => {
  let transactionsService: TransactionsService;
  let prisma: PrismaMock;

  const customerUser: JwtPayload = {
    sub: 'user-customer-1',
    email: 'customer@example.com',
    role: UserRole.CUSTOMER,
  };

  const adminUser: JwtPayload = {
    sub: 'user-admin-1',
    email: 'admin@example.com',
    role: UserRole.ADMIN,
  };

  const txClient = {
    account: {
      update: jest.fn(),
    },
    transaction: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    prisma = {
      account: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      transaction: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((cb: (tx: typeof txClient) => unknown) =>
        cb(txClient),
      ),
    };

    txClient.account.update.mockReset();
    txClient.transaction.create.mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        TransactionsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    transactionsService = moduleRef.get(TransactionsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deposit', () => {
    it('throws when account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        transactionsService.deposit(customerUser, {
          toAccountId: 'acc1',
          amount: 10,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws forbidden when customer deposits to foreign account', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc1',
        userId: 'other-user',
      });

      await expect(
        transactionsService.deposit(customerUser, {
          toAccountId: 'acc1',
          amount: 10,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('creates deposit transaction in DB transaction', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc1',
        userId: customerUser.sub,
      });
      txClient.transaction.create.mockResolvedValue({
        id: 'tx1',
        type: TransactionType.DEPOSIT,
      });

      const result = await transactionsService.deposit(customerUser, {
        toAccountId: 'acc1',
        amount: 25.5,
        description: 'salary',
      });

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(txClient.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'acc1' },
          data: { balance: { increment: expect.any(Prisma.Decimal) } },
        }),
      );
      expect(txClient.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: TransactionType.DEPOSIT,
            fromAccountId: null,
            toAccountId: 'acc1',
          }),
        }),
      );
      expect(result).toEqual({ id: 'tx1', type: TransactionType.DEPOSIT });
    });
  });

  describe('withdraw', () => {
    it('throws insufficient funds when balance too low', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc1',
        userId: customerUser.sub,
        balance: '10',
      });

      await expect(
        transactionsService.withdraw(customerUser, {
          fromAccountId: 'acc1',
          amount: 25,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates withdraw transaction when funds sufficient', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc1',
        userId: customerUser.sub,
        balance: '50',
      });
      txClient.transaction.create.mockResolvedValue({
        id: 'tx2',
        type: TransactionType.WITHDRAW,
      });

      const result = await transactionsService.withdraw(customerUser, {
        fromAccountId: 'acc1',
        amount: 10,
      });

      expect(txClient.account.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'acc1' },
          data: { balance: { decrement: expect.any(Prisma.Decimal) } },
        }),
      );
      expect(result).toEqual({ id: 'tx2', type: TransactionType.WITHDRAW });
    });
  });

  describe('transfer', () => {
    it('throws when from and to are equal', async () => {
      await expect(
        transactionsService.transfer(customerUser, {
          fromAccountId: 'acc1',
          toAccountId: 'acc1',
          amount: 10,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when destination account not found', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce({
          id: 'acc1',
          userId: customerUser.sub,
          balance: '100',
        })
        .mockResolvedValueOnce(null);

      await expect(
        transactionsService.transfer(customerUser, {
          fromAccountId: 'acc1',
          toAccountId: 'acc2',
          amount: 10,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws insufficient funds for transfer', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce({
          id: 'acc1',
          userId: customerUser.sub,
          balance: '5',
        })
        .mockResolvedValueOnce({
          id: 'acc2',
          userId: 'other-user',
          balance: '0',
        });

      await expect(
        transactionsService.transfer(customerUser, {
          fromAccountId: 'acc1',
          toAccountId: 'acc2',
          amount: 10,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates transfer transaction when valid', async () => {
      prisma.account.findUnique
        .mockResolvedValueOnce({
          id: 'acc1',
          userId: customerUser.sub,
          balance: '100',
        })
        .mockResolvedValueOnce({
          id: 'acc2',
          userId: 'other-user',
          balance: '0',
        });
      txClient.transaction.create.mockResolvedValue({
        id: 'tx3',
        type: TransactionType.TRANSFER,
      });

      const result = await transactionsService.transfer(customerUser, {
        fromAccountId: 'acc1',
        toAccountId: 'acc2',
        amount: 15,
      });

      expect(txClient.account.update).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: { id: 'acc1' },
          data: { balance: { decrement: expect.any(Prisma.Decimal) } },
        }),
      );
      expect(txClient.account.update).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          where: { id: 'acc2' },
          data: { balance: { increment: expect.any(Prisma.Decimal) } },
        }),
      );
      expect(result).toEqual({ id: 'tx3', type: TransactionType.TRANSFER });
    });
  });

  describe('findAll', () => {
    it('admin returns all transactions', async () => {
      prisma.transaction.findMany.mockResolvedValue([{ id: 'tx1' }]);

      const result = await transactionsService.findAll(adminUser);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([{ id: 'tx1' }]);
    });

    it('customer with no accounts returns empty list', async () => {
      prisma.account.findMany.mockResolvedValue([]);

      const result = await transactionsService.findAll(customerUser);
      expect(result).toEqual([]);
    });

    it('customer returns transactions involving owned accounts', async () => {
      prisma.account.findMany.mockResolvedValue([
        { id: 'acc1' },
        { id: 'acc2' },
      ]);
      prisma.transaction.findMany.mockResolvedValue([{ id: 'tx2' }]);

      const result = await transactionsService.findAll(customerUser);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { fromAccountId: { in: ['acc1', 'acc2'] } },
            { toAccountId: { in: ['acc1', 'acc2'] } },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([{ id: 'tx2' }]);
    });
  });

  describe('findOne', () => {
    it('throws when transaction not found', async () => {
      prisma.transaction.findUnique.mockResolvedValue(null);

      await expect(
        transactionsService.findOne(customerUser, 'tx404'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('admin can read any transaction', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx1',
        fromAccountId: 'acc1',
        toAccountId: 'acc2',
      });

      const result = await transactionsService.findOne(adminUser, 'tx1');
      expect(result).toEqual({
        id: 'tx1',
        fromAccountId: 'acc1',
        toAccountId: 'acc2',
      });
    });

    it('customer forbidden when no involved owned accounts', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx1',
        fromAccountId: 'acc1',
        toAccountId: 'acc2',
      });
      prisma.account.findMany.mockResolvedValue([]);

      await expect(
        transactionsService.findOne(customerUser, 'tx1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('customer can read transaction involving owned account', async () => {
      prisma.transaction.findUnique.mockResolvedValue({
        id: 'tx1',
        fromAccountId: 'acc1',
        toAccountId: 'acc2',
      });
      prisma.account.findMany.mockResolvedValue([{ id: 'acc1' }]);

      const result = await transactionsService.findOne(customerUser, 'tx1');
      expect(result).toEqual({
        id: 'tx1',
        fromAccountId: 'acc1',
        toAccountId: 'acc2',
      });
    });
  });
});
