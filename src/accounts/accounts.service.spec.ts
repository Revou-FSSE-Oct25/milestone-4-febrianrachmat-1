/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AccountType, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/types/jwt-payload';
import { AccountsService } from './accounts.service';

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
  };
  account: {
    create: jest.Mock;
    findMany: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
};

describe('AccountsService', () => {
  let accountsService: AccountsService;
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

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      account: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AccountsService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    accountsService = moduleRef.get(AccountsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('customer creates account for self', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: customerUser.sub });
      prisma.account.create.mockResolvedValue({
        id: 'acc1',
        accountNumber: '123456789012',
        type: AccountType.SAVINGS,
        balance: '0',
        userId: customerUser.sub,
      });

      const result = await accountsService.create(customerUser, {
        type: AccountType.SAVINGS,
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: customerUser.sub },
        select: { id: true },
      });
      expect(prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: AccountType.SAVINGS,
            userId: customerUser.sub,
            balance: 0,
          }),
        }),
      );
      expect(result).toEqual(expect.objectContaining({ id: 'acc1' }));
    });

    it('admin can create account for another user', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'target-user-1' });
      prisma.account.create.mockResolvedValue({
        id: 'acc2',
        accountNumber: '555555111111',
        type: AccountType.CHECKING,
        balance: '0',
        userId: 'target-user-1',
      });

      await accountsService.create(adminUser, {
        type: AccountType.CHECKING,
        userId: 'target-user-1',
      });

      expect(prisma.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'target-user-1',
            type: AccountType.CHECKING,
          }),
        }),
      );
    });

    it('throws when target user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        accountsService.create(customerUser, { type: AccountType.SAVINGS }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws bad request when account create fails', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: customerUser.sub });
      prisma.account.create.mockRejectedValue(
        new Error('duplicate accountNumber'),
      );

      await expect(
        accountsService.create(customerUser, {
          type: AccountType.SAVINGS,
          accountNumber: '111111111111',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('customer only sees own accounts', async () => {
      prisma.account.findMany.mockResolvedValue([]);

      await accountsService.findAll(customerUser);

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId: customerUser.sub },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('admin sees all accounts', async () => {
      prisma.account.findMany.mockResolvedValue([]);

      await accountsService.findAll(adminUser);

      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('throws when account not found', async () => {
      prisma.account.findUnique.mockResolvedValue(null);

      await expect(
        accountsService.findOne(customerUser, 'acc404'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws forbidden when customer accesses another user account', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'accX',
        userId: 'other-user',
      });

      await expect(
        accountsService.findOne(customerUser, 'accX'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns account when customer owns it', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'accOwn',
        userId: customerUser.sub,
      });

      const result = await accountsService.findOne(customerUser, 'accOwn');
      expect(result).toEqual({ id: 'accOwn', userId: customerUser.sub });
    });
  });

  describe('update', () => {
    it('updates account type after ownership check', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc1',
        userId: customerUser.sub,
      });
      prisma.account.update.mockResolvedValue({
        id: 'acc1',
        type: AccountType.CHECKING,
      });

      const result = await accountsService.update(customerUser, 'acc1', {
        type: AccountType.CHECKING,
      });

      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: 'acc1' },
        data: { type: AccountType.CHECKING },
      });
      expect(result).toEqual({ id: 'acc1', type: AccountType.CHECKING });
    });
  });

  describe('remove', () => {
    it('throws when balance is not zero', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc1',
        userId: customerUser.sub,
        balance: '100.50',
      });

      await expect(
        accountsService.remove(customerUser, 'acc1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('deletes account when balance is zero', async () => {
      prisma.account.findUnique.mockResolvedValue({
        id: 'acc1',
        userId: customerUser.sub,
        balance: '0',
      });
      prisma.account.delete.mockResolvedValue({ id: 'acc1' });

      const result = await accountsService.remove(customerUser, 'acc1');

      expect(prisma.account.delete).toHaveBeenCalledWith({
        where: { id: 'acc1' },
      });
      expect(result).toEqual({ message: 'account deleted' });
    });
  });
});
