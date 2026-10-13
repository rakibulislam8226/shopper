import { type ApiErrorResponse } from '@lib/apiErrors';
import { axios } from '@plugins/axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ApiResponse, type PaginationMeta } from './types';

/** Mirrors `MembershipRole` in `app/db/enums.py`. */
export type MembershipRole = 'owner' | 'manager' | 'salesman';

/** Mirrors `MembershipStatus`. Listing only ever returns ACTIVE rows. */
export type MembershipStatus = 'active' | 'invited' | 'removed' | 'resigned';

/**
 * One person with access to the shop — mirrors `MemberPublic` in
 * `app/modules/memberships/schemas.py`. Covers every role (owner, manager,
 * salesman), not just rank-and-file staff — "employee" here means anyone
 * listed on the Employees screen.
 *
 * `total_sales` is a decimal string, never a `number` — see the schema's
 * docstring for why (display only, so nothing here is tempted to do float
 * math on it). Format it with `formatCurrency` from `lib/format`.
 */
export interface Employee {
  user_uid: string;
  name: string;
  phone: string;
  role: MembershipRole;
  status: MembershipStatus;
  joined_at: string;
  last_login_at: string | null;
  total_sales: string;
}

interface EmployeesListData {
  members: Employee[];
  /** The caller's own role on this shop — gates the "add manager" option. */
  viewer_role: MembershipRole;
}

export interface EmployeesPage extends EmployeesListData {
  meta: PaginationMeta;
}

/** Query/filter/pagination state for `GET /api/shops/{shop_uid}/members`. */
export interface EmployeesQuery {
  /** Matches a substring of the employee's name or phone. */
  q?: string;
  role?: MembershipRole;
  page?: number;
  limit?: number;
}

const DEFAULT_LIMIT = 10;

const employeesQueryKey = (shopUid: string | null | undefined, query: EmployeesQuery) =>
  ['employees', shopUid, query] as const;

/**
 * GET /api/shops/{shop_uid}/members — one page of active employees,
 * optionally filtered by `q` (name/phone search) and/or `role`. Any member
 * can view. Pagination follows the standard `PaginationMeta` envelope —
 * see `components/ui/Pagination`.
 */
export function useEmployees(shopUid: string | null | undefined, query: EmployeesQuery = {}) {
  const { q, role, page = 1, limit = DEFAULT_LIMIT } = query;

  return useQuery({
    queryKey: employeesQueryKey(shopUid, { q, role, page, limit }),
    queryFn: async (): Promise<EmployeesPage | null> => {
      const response = await axios.get<ApiResponse<EmployeesListData>>(
        `/shops/${shopUid}/members`,
        { params: { q: q || undefined, role, page, limit } },
      );
      if (!response.data.data) return null;
      return {
        ...response.data.data,
        meta: response.data.meta ?? {
          page,
          limit,
          total: 0,
          total_pages: 0,
          has_next: false,
          has_prev: false,
        },
      };
    },
    enabled: Boolean(shopUid),
    // Keeps the current page's rows on screen while the next page loads,
    // instead of flashing back to a loading state on every click.
    placeholderData: (previous) => previous,
  });
}

export interface AddEmployeePayload {
  shopUid: string;
  name: string;
  phone: string;
  password: string;
  confirm_password: string;
  role: 'manager' | 'salesman';
}

export interface AddEmployeeData {
  member: Employee;
  /** False when an existing account was attached instead of a new one created. */
  created_new_account: boolean;
}

/**
 * POST /api/shops/{shop_uid}/members — adds a manager or salesman. Owners can
 * add either role; managers can only add salesmen (enforced server-side).
 *
 * Invalidates every `employees` query for this shop on success — one for
 * each open search/filter/page combination — so whichever view the caller
 * lands back on reflects the new employee without a manual reload. A
 * targeted cache write isn't attempted here: which page and filter the new
 * row would land on depends on the current sort/search/role state, so a
 * refetch is the only version that's actually correct.
 */
export function useAddEmployee() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<AddEmployeeData>, ApiErrorResponse, AddEmployeePayload>({
    mutationFn: async ({ shopUid, ...body }: AddEmployeePayload) => {
      const response = await axios.post<ApiResponse<AddEmployeeData>>(
        `/shops/${shopUid}/members`,
        body,
        { toast: { error: 'Unable to add employee' } },
      );
      return response.data;
    },
    onSuccess: (_response, { shopUid }) => {
      void queryClient.invalidateQueries({ queryKey: ['employees', shopUid] });
    },
  });
}

export interface UpdateMemberRolePayload {
  shopUid: string;
  userUid: string;
  role: 'manager' | 'salesman';
}

/**
 * PATCH /api/shops/{shop_uid}/members/{user_uid} — promotes/demotes between
 * manager and salesman. Only the owner can hand out or take away the
 * manager role; the owner itself is never a valid target (enforced
 * server-side either way).
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<Employee>, ApiErrorResponse, UpdateMemberRolePayload>({
    mutationFn: async ({ shopUid, userUid, role }: UpdateMemberRolePayload) => {
      const response = await axios.patch<ApiResponse<Employee>>(
        `/shops/${shopUid}/members/${userUid}`,
        { role },
        { toast: { error: 'Unable to update role' } },
      );
      return response.data;
    },
    onSuccess: (_response, { shopUid }) => {
      void queryClient.invalidateQueries({ queryKey: ['employees', shopUid] });
    },
  });
}

export interface RemoveMemberPayload {
  shopUid: string;
  userUid: string;
}

/**
 * DELETE /api/shops/{shop_uid}/members/{user_uid} — removes a manager or
 * salesman from the shop (soft: the membership row is marked REMOVED, never
 * deleted). The owner can't be removed this way, and nobody can remove
 * themselves.
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<null>, ApiErrorResponse, RemoveMemberPayload>({
    mutationFn: async ({ shopUid, userUid }: RemoveMemberPayload) => {
      const response = await axios.delete<ApiResponse<null>>(
        `/shops/${shopUid}/members/${userUid}`,
        { toast: { error: 'Unable to remove member' } },
      );
      return response.data;
    },
    onSuccess: (_response, { shopUid }) => {
      void queryClient.invalidateQueries({ queryKey: ['employees', shopUid] });
    },
  });
}
