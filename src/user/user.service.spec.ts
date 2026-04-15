/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user.service';

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
  },
}));

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    update: jest.Mock;
  };
};

describe('UserService', () => {
  let userService: UserService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        UserService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    userService = moduleRef.get(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getProfile', () => {
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(userService.getProfile('u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('returns profile when user exists', async () => {
      const profile = {
        id: 'u1',
        name: 'Jane',
        email: 'jane@example.com',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      };
      prisma.user.findUnique.mockResolvedValue(profile);

      const result = await userService.getProfile('u1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'u1' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(profile);
    });
  });

  describe('updateProfile', () => {
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        userService.updateProfile('u1', { name: 'New Name' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('updates only name when password not provided', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        name: 'New Name',
        email: 'jane@example.com',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      });

      const result = await userService.updateProfile('u1', {
        name: 'New Name',
      });

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { name: 'New Name' },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(
        expect.objectContaining({
          id: 'u1',
          name: 'New Name',
        }),
      );
    });

    it('hashes password when password provided', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      (bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hashed-pass');
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        name: 'Jane',
        email: 'jane@example.com',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      });

      await userService.updateProfile('u1', { password: 'NewPassword123' });

      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123', 10);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { password: 'hashed-pass' },
        }),
      );
    });

    it('updates both name and password when both provided', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      (bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hashed-pass');
      prisma.user.update.mockResolvedValue({
        id: 'u1',
        name: 'Jane Updated',
        email: 'jane@example.com',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-02T00:00:00.000Z'),
      });

      await userService.updateProfile('u1', {
        name: 'Jane Updated',
        password: 'NewPassword123',
      });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            name: 'Jane Updated',
            password: 'hashed-pass',
          },
        }),
      );
    });
  });
});
