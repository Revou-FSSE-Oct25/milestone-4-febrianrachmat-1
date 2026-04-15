/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Test } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

jest.mock('bcrypt', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(),
    compare: jest.fn(),
  },
}));

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
  };
};

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: PrismaMock;
  let jwtService: { signAsync: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };

    jwtService = {
      signAsync: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    authService = moduleRef.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('throws when email already registered', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1' });

      await expect(
        authService.register({
          name: 'Jane',
          email: 'jane@example.com',
          password: 'Password123',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('hashes password and creates user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as unknown as jest.Mock).mockResolvedValue('hashed');

      prisma.user.create.mockResolvedValue({
        id: 'u1',
        name: 'Jane',
        email: 'jane@example.com',
        role: UserRole.CUSTOMER,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      const result = await authService.register({
        name: 'Jane',
        email: 'jane@example.com',
        password: 'Password123',
      });

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'jane@example.com',
            password: 'hashed',
            role: UserRole.CUSTOMER,
          }),
        }),
      );
      expect(result).toEqual(
        expect.objectContaining({
          id: 'u1',
          email: 'jane@example.com',
          role: UserRole.CUSTOMER,
        }),
      );
    });
  });

  describe('login', () => {
    it('throws when user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'jane@example.com', password: 'x' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws when password mismatch', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'jane@example.com',
        password: 'hashed',
        role: UserRole.CUSTOMER,
      });
      (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: 'jane@example.com', password: 'wrong' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('returns accessToken when credentials valid', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'jane@example.com',
        password: 'hashed',
        role: UserRole.CUSTOMER,
      });
      (bcrypt.compare as unknown as jest.Mock).mockResolvedValue(true);
      jwtService.signAsync.mockResolvedValue('token');

      const result = await authService.login({
        email: 'jane@example.com',
        password: 'Password123',
      });

      expect(bcrypt.compare).toHaveBeenCalledWith('Password123', 'hashed');
      expect(jwtService.signAsync).toHaveBeenCalledWith({
        sub: 'u1',
        email: 'jane@example.com',
        role: UserRole.CUSTOMER,
      });
      expect(result).toEqual({ accessToken: 'token' });
    });
  });
});
