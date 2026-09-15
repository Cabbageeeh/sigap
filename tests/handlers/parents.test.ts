import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockRequest, mockResponse, mockUser } from '../helpers/mocks';

vi.mock('@queries/parents', () => ({
  getParentsPaginated: vi.fn(() => ({ data: [], total: 0 })),
  findParentById: vi.fn(),
  findParentByUserId: vi.fn(),
  createParent: vi.fn(),
  updateParent: vi.fn(),
  deleteParent: vi.fn(),
}));
vi.mock('@queries/students', () => ({
  findStudentsByParent: vi.fn(() => []),
  findStudentsForParentSelect: vi.fn(() => []),
  syncStudentsForParent: vi.fn(),
}));
vi.mock('@queries/users', () => ({
  findUsersForParentSelect: vi.fn(() => []),
  isAdmin: vi.fn(() => false),
  hasPermission: vi.fn(() => false),
  hasRole: vi.fn(() => false),
}));
vi.mock('@services/Logger', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));
import { parentsPage, addParent, listParents, parentByUser } from '../../app/handlers/parents';
import { getParentsPaginated, findParentByUserId, createParent } from '@queries/parents';
import { findUsersForParentSelect, hasRole } from '@queries/users';
import { isAdmin } from '@queries/users';

const parent = {
  id: 'parent-1',
  user_id: '00000000-0000-4000-8000-000000000001',
  phone: '08123456789',
  address: 'Jl. Merdeka',
  user_name: 'Andi',
  user_username: 'andi',
};

describe('parents administration', () => {
  beforeEach(() => vi.clearAllMocks());

  it('loads parent rows and account options for an admin', () => {
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(getParentsPaginated).mockReturnValue({ data: [parent], total: 1 });
    vi.mocked(findUsersForParentSelect).mockReturnValue([
      { id: parent.user_id, name: 'Andi', username: 'andi' },
    ]);
    const inertia = vi.fn();
    const req = mockRequest({ user: mockUser({ id: 'admin-1' }) });
    const res = mockResponse({ inertia });

    parentsPage(req, res);

    expect(inertia).toHaveBeenCalledWith('parents', expect.objectContaining({
      parents: [parent],
      users: [{ id: parent.user_id, name: 'Andi', username: 'andi' }],
      meta: expect.objectContaining({ total: 1, page: 1, limit: 10, totalPages: 1 }),
    }));
  });

  it('rejects duplicate parent profiles', () => {
    vi.mocked(isAdmin).mockReturnValue(true);
    vi.mocked(findParentByUserId).mockReturnValue(parent as never);
    const req = mockRequest({
      body: { user_id: parent.user_id, phone: null, address: null },
      user: mockUser({ id: 'admin-1' }),
    });
    const res = mockResponse();

    addParent(req, res);

    expect(res._status).toBe(409);
    expect(createParent).not.toHaveBeenCalled();
  });

  it('denies parent accounts access to parent administration records', () => {
    vi.mocked(hasRole).mockReturnValue(true);
    const req = mockRequest({
      user: mockUser({ id: 'parent-1', roles: ['parent'] }),
      params: { userId: 'other-user' },
    });
    const res = mockResponse();

    listParents(req, res);
    expect(res._status).toBe(403);

    const secondResponse = mockResponse();
    parentByUser(req, secondResponse);
    expect(secondResponse._status).toBe(403);
    expect(findParentByUserId).not.toHaveBeenCalled();
    expect(getParentsPaginated).not.toHaveBeenCalled();
  });
});
