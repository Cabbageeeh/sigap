import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse, mockUser } from '../helpers/mocks';

vi.mock('@queries/schoolLocations', () => ({
  findSchoolLocationById: vi.fn(),
  findActiveSchoolLocation: vi.fn(),
  createSchoolLocation: vi.fn(),
  updateSchoolLocation: vi.fn(),
}));
vi.mock('@queries/users', () => ({
  isAdmin: vi.fn(),
  hasPermission: vi.fn(() => false),
}));
vi.mock('@services/Logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { schoolLocationsPage, saveSchoolProfile } from '../../app/handlers/schoolLocations';
import { findActiveSchoolLocation, createSchoolLocation, updateSchoolLocation } from '@queries/schoolLocations';
import { isAdmin, hasPermission } from '@queries/users';

const locationId = '00000000-0000-4000-8000-000000000001';

const validBody = {
  name: 'SMA Negeri 1 Jakarta',
  npsn: '20100001',
  headmaster_name: 'Drs. H. Ahmad Hidayat',
  phone: '(021) 3846259',
  email: 'info@sman1jakarta.sch.id',
  address: 'Jl. Budi Utomo No. 7',
  latitude: -6.2,
  longitude: 106.8,
  radius_meters: 200,
  start_time: '07:00',
};

describe('schoolLocations handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(hasPermission).mockReturnValue(false);
    vi.mocked(findActiveSchoolLocation).mockReturnValue({ id: locationId } as never);
    vi.mocked(createSchoolLocation).mockReturnValue({ id: locationId } as never);
    vi.mocked(updateSchoolLocation).mockReturnValue({ id: locationId } as never);
  });
  describe('schoolLocationsPage', () => {
    it('passes the active profile to the page', () => {
      const inertia = vi.fn();
      const res = mockResponse({ inertia });
      schoolLocationsPage(mockRequest({ user: mockUser() }), res);
      expect(inertia).toHaveBeenCalledWith('schoolLocations', {
        permissions: { canView: true, canEdit: true },
        profile: { id: locationId },
      });
    });

    it('hides the profile from viewers without access', () => {
      vi.mocked(isAdmin).mockReturnValue(false);
      const inertia = vi.fn();
      const res = mockResponse({ inertia });
      schoolLocationsPage(mockRequest({ user: mockUser() }), res);
      expect(inertia).toHaveBeenCalledWith('schoolLocations', {
        permissions: { canView: false, canEdit: false },
        profile: null,
      });
      expect(findActiveSchoolLocation).not.toHaveBeenCalled();
    });
  });

  describe('saveSchoolProfile', () => {
    it('returns 401 when unauthenticated', () => {
      const res = mockResponse();
      saveSchoolProfile(mockRequest({ body: validBody }), res);
      expect(res._status).toBe(401);
      expect(createSchoolLocation).not.toHaveBeenCalled();
      expect(updateSchoolLocation).not.toHaveBeenCalled();
    });

    it('returns 403 when the user cannot edit', () => {
      vi.mocked(isAdmin).mockReturnValue(false);
      const res = mockResponse();
      saveSchoolProfile(mockRequest({ user: mockUser(), body: validBody }), res);
      expect(res._status).toBe(403);
      expect(createSchoolLocation).not.toHaveBeenCalled();
      expect(updateSchoolLocation).not.toHaveBeenCalled();
    });

    it('returns 422 for an invalid email', () => {
      const res = mockResponse();
      saveSchoolProfile(mockRequest({ user: mockUser(), body: { ...validBody, email: 'bukan-email' } }), res);
      expect(res._status).toBe(422);
      expect(res._body.errors).toHaveProperty('email');
      expect(updateSchoolLocation).not.toHaveBeenCalled();
    });

    it('returns 422 when only part of the geofence is filled', () => {
      const res = mockResponse();
      saveSchoolProfile(mockRequest({ user: mockUser(), body: { name: 'SMA 1', latitude: -6.2 } }), res);
      expect(res._status).toBe(422);
      expect(res._body.errors).toHaveProperty('radius_meters');
      expect(updateSchoolLocation).not.toHaveBeenCalled();
    });

    it('updates the active profile when one exists', () => {
      const res = mockResponse();
      saveSchoolProfile(mockRequest({ user: mockUser(), body: validBody }), res);

      expect(res._status).toBe(200);
      expect(updateSchoolLocation).toHaveBeenCalledWith(locationId, validBody);
      expect(createSchoolLocation).not.toHaveBeenCalled();
      expect(res._body).toMatchObject({ success: true });
    });

    it('creates an active profile when none exists', () => {
      vi.mocked(findActiveSchoolLocation).mockReturnValue(undefined);
      const res = mockResponse();
      saveSchoolProfile(mockRequest({ user: mockUser(), body: validBody }), res);

      expect(res._status).toBe(200);
      expect(createSchoolLocation).toHaveBeenCalledWith({ ...validBody, is_active: 1 });
      expect(updateSchoolLocation).not.toHaveBeenCalled();
    });

    it('returns 500 when the query throws', () => {
      vi.mocked(updateSchoolLocation).mockImplementation(() => { throw new Error('db down'); });
      const res = mockResponse();
      saveSchoolProfile(mockRequest({ user: mockUser(), body: validBody }), res);
      expect(res._status).toBe(500);
    });
  });
});
