import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mockRequest, mockResponse, mockUser } from '../helpers/mocks';

const { appSettings, isAdmin } = vi.hoisted(() => ({
  appSettings: {
    findSettingNumber: vi.fn(() => 5),
    findTeacherPresenceMode: vi.fn(() => 'qr' as 'qr' | 'off'),
    isTeacherPresenceEnabled: vi.fn(() => true),
    upsertSetting: vi.fn(),
  },
  isAdmin: vi.fn(() => true),
}));
vi.mock('@queries/appSettings', () => appSettings);
vi.mock('@queries/users', () => ({ isAdmin }));
vi.mock('@queries/schoolLocations', () => ({ findActiveSchoolLocation: vi.fn(() => null) }));
vi.mock('@services/QrCode', () => ({ generateQrCodeData: vi.fn(async () => ({ payload: 'signed' })) }));
vi.mock('@services/Logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  qrCodeData,
  qrDisplayPage,
  saveTeacherPresenceSettings,
  teacherPresencePage,
} from '../../app/handlers/teacherPresence';

const asAdmin = () => mockRequest({ user: mockUser({ id: 'admin-1' }) });

describe('teacherPresencePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appSettings.findTeacherPresenceMode.mockReturnValue('qr');
  });

  it('hands the stored mode to the settings page', () => {
    appSettings.findTeacherPresenceMode.mockReturnValue('off');
    const inertia = vi.fn();
    teacherPresencePage(asAdmin(), { inertia } as never);
    expect(inertia).toHaveBeenCalledWith('teacherPresence', expect.objectContaining({ mode: 'off' }));
  });
});

describe('saveTeacherPresenceSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAdmin.mockReturnValue(true);
  });

  it('stores the mode together with the QR interval', () => {
    const response = mockResponse();
    saveTeacherPresenceSettings(
      mockRequest({ user: mockUser({ id: 'admin-1' }), body: { mode: 'off', qr_refresh_interval: 3 } }),
      response as never,
    );
    expect(appSettings.upsertSetting).toHaveBeenCalledWith('teacher_presence_mode', 'off');
    expect(appSettings.upsertSetting).toHaveBeenCalledWith('qr_refresh_interval', '3');
    expect(response._status).toBe(200);
  });

  it('refuses a non-admin', () => {
    isAdmin.mockReturnValue(false);
    const response = mockResponse();
    saveTeacherPresenceSettings(
      mockRequest({ user: mockUser({ id: 'guru-1' }), body: { mode: 'off', qr_refresh_interval: 5 } }),
      response as never,
    );
    expect(response._status).toBe(403);
    expect(appSettings.upsertSetting).not.toHaveBeenCalled();
  });

  it('rejects an unknown mode', () => {
    const response = mockResponse();
    saveTeacherPresenceSettings(
      mockRequest({ user: mockUser({ id: 'admin-1' }), body: { mode: 'manual', qr_refresh_interval: 5 } }),
      response as never,
    );
    expect(response._status).toBe(422);
    expect(appSettings.upsertSetting).not.toHaveBeenCalled();
  });
});

describe('qr endpoints while presence is disabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    appSettings.isTeacherPresenceEnabled.mockReturnValue(false);
  });

  it('refuses to hand out a QR token', async () => {
    const response = mockResponse();
    await qrCodeData(asAdmin(), response as never);
    expect(response._body).toMatchObject({ code: 'TEACHER_PRESENCE_DISABLED' });
  });

  it('redirects the QR display page to the dashboard', () => {
    const response = mockResponse();
    qrDisplayPage(asAdmin(), response as never);
    expect(response._redirectUrl).toBe('/dashboard');
  });
});
