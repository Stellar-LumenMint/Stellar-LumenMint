import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { AuditService, AuditAction } from './audit.service';
import { AuditLog } from './audit-log.entity';

describe('AuditService', () => {
  let service: AuditService;
  let auditLogRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    auditLogRepository = {
      create: jest.fn((draft: Partial<AuditLog>) => draft as AuditLog),
      save: jest.fn(async (log: AuditLog) => log),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(AuditLog), useValue: auditLogRepository },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
  });

  it('requires an adminId', async () => {
    await expect(
      service.logAdminAction(AuditAction.BAN_USER, {
        adminId: '',
        entityType: 'user',
        entityId: 'user-1',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('redacts credentials and secrets from state snapshots', async () => {
    await service.logAdminAction(AuditAction.BAN_USER, {
      adminId: 'admin-1',
      entityType: 'user',
      entityId: 'user-1',
      beforeState: {
        id: 'user-1',
        email: 'victim@example.com',
        passwordHash: 'salt:hash',
        nested: {
          refreshToken: 'abc123',
          publicField: 'visible',
        },
      },
      afterState: {
        id: 'user-1',
        isBanned: true,
        access_token: 'leaked',
      },
    });

    const saved = auditLogRepository.save.mock.calls[0][0];
    expect(saved.beforeState).toEqual({
      id: 'user-1',
      email: 'victim@example.com',
      passwordHash: '[REDACTED]',
      nested: {
        refreshToken: '[REDACTED]',
        publicField: 'visible',
      },
    });
    expect(saved.afterState).toEqual({
      id: 'user-1',
      isBanned: true,
      access_token: '[REDACTED]',
    });
  });

  it('keeps non-sensitive state intact', async () => {
    await service.logAdminAction(AuditAction.COLLECTION_VERIFIED, {
      adminId: 'admin-1',
      entityType: 'collection',
      entityId: 'col-1',
      beforeState: { name: 'Genesis', isVerified: false },
      afterState: { name: 'Genesis', isVerified: true },
    });

    const saved = auditLogRepository.save.mock.calls[0][0];
    expect(saved.beforeState).toEqual({ name: 'Genesis', isVerified: false });
    expect(saved.afterState).toEqual({ name: 'Genesis', isVerified: true });
  });
});
