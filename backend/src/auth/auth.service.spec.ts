import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { hash } from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    employee: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
  let jwtService: {
    signAsync: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      employee: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
    };

    jwtService = {
      signAsync: vi.fn().mockResolvedValue('mocked-jwt-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('determineRegistrationRole', () => {
    it('should strictly throw ForbiddenException when attempting privilege escalation to SUPER_ADMIN', () => {
      expect(() => service.determineRegistrationRole('SUPER_ADMIN')).toThrow(ForbiddenException);
      expect(() => service.determineRegistrationRole('super_admin')).toThrow(ForbiddenException);
      expect(() => service.determineRegistrationRole('SUPERADMIN')).toThrow(ForbiddenException);
      expect(() => service.determineRegistrationRole('ADMIN')).toThrow(ForbiddenException);
      expect(() => service.determineRegistrationRole('super admin')).toThrow(ForbiddenException);
      expect(() => service.determineRegistrationRole('super-admin')).toThrow(ForbiddenException);
      expect(() => service.determineRegistrationRole('ADMINISTRATOR')).toThrow(ForbiddenException);
      expect(() => service.determineRegistrationRole('root')).toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when an invalid role is provided', () => {
      expect(() => service.determineRegistrationRole('INVALID_ROLE')).toThrow(BadRequestException);
    });

    it('should return HR when role is explicitly HR', () => {
      expect(service.determineRegistrationRole('HR')).toBe('HR');
      expect(service.determineRegistrationRole('hr')).toBe('HR');
    });

    it('should return MANAGER when role is explicitly MANAGER', () => {
      expect(service.determineRegistrationRole('MANAGER')).toBe('MANAGER');
      expect(service.determineRegistrationRole('manager')).toBe('MANAGER');
    });

    it('should return HR when department is HR even if role is not supplied', () => {
      expect(service.determineRegistrationRole(undefined, 'HR')).toBe('HR');
      expect(service.determineRegistrationRole(undefined, 'hr')).toBe('HR');
      expect(service.determineRegistrationRole(undefined, 'Human Resources')).toBe('HR');
    });

    it('should return HR when role is EMPLOYEE but department is HR', () => {
      expect(service.determineRegistrationRole('EMPLOYEE', 'HR')).toBe('HR');
      expect(service.determineRegistrationRole('EMPLOYEE', 'Human Resources')).toBe('HR');
    });

    it('should return EMPLOYEE when role is EMPLOYEE and department is Engineering', () => {
      expect(service.determineRegistrationRole('EMPLOYEE', 'Engineering')).toBe('EMPLOYEE');
    });

    it('should default to EMPLOYEE when neither role nor HR department is provided', () => {
      expect(service.determineRegistrationRole(undefined, 'Engineering')).toBe('EMPLOYEE');
      expect(service.determineRegistrationRole(undefined, undefined)).toBe('EMPLOYEE');
    });
  });

  describe('register', () => {
    it('should reject registration if email is already in use', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'existing-id', email: 'topik@gmail.com' });

      await expect(
        service.register({
          name: 'Topik',
          email: 'topik@gmail.com',
          password: 'password123',
          department: 'HR',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject registration if role is SUPER_ADMIN', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.register({
          name: 'Attacker',
          email: 'attacker@gmail.com',
          password: 'password123',
          role: 'SUPER_ADMIN',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should register a new HR user when department is HR', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.employee.findMany.mockResolvedValue([{ nik: 'KRB-0005' }]);
      prisma.employee.findFirst.mockResolvedValue({ id: 'manager-1' });

      prisma.user.create.mockImplementation(async ({ data }) => ({
        id: 'new-user-id',
        name: data.name,
        email: data.email,
        role: data.role,
        employee: {
          id: 'emp-1',
          nik: 'KRB-0006',
          department: { name: 'HR' },
          position: { name: 'HR Specialist' },
        },
      }));

      const result = await service.register({
        name: 'Topik Baru',
        email: 'topikbaru@gmail.com',
        password: 'password123',
        department: 'HR',
      });

      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.user.role).toBe('HR');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'HR',
            email: 'topikbaru@gmail.com',
          }),
        }),
      );
    });

    it('should register a new HR user when role is explicitly HR', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.employee.findMany.mockResolvedValue([]);
      prisma.employee.findFirst.mockResolvedValue({ id: 'manager-1' });

      prisma.user.create.mockImplementation(async ({ data }) => ({
        id: 'new-user-id',
        name: data.name,
        email: data.email,
        role: data.role,
        employee: {
          id: 'emp-1',
          nik: 'KRB-0001',
          department: { name: 'HR' },
          position: { name: 'HR Specialist' },
        },
      }));

      const result = await service.register({
        name: 'Topik HR',
        email: 'topikhr@gmail.com',
        password: 'password123',
        role: 'HR',
      });

      expect(result.user.role).toBe('HR');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'HR',
          }),
        }),
      );
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'unknown@kerabat.id',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const hashedPassword = await hash('realpassword', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        email: 'topik@gmail.com',
        password: hashedPassword,
        role: 'HR',
      });

      await expect(
        service.login({
          email: 'topik@gmail.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return token and user with role HR when credentials match', async () => {
      const hashedPassword = await hash('correctpassword', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        name: 'Topik',
        email: 'topik@gmail.com',
        password: hashedPassword,
        role: 'HR',
      });

      const result = await service.login({
        email: 'topik@gmail.com',
        password: 'correctpassword',
      });

      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.user.role).toBe('HR');
    });
  });
});
