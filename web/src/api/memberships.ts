import { type ApiErrorResponse } from '@lib/apiErrors';
import { axios } from '@plugins/axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ApiResponse } from './types';

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

export interface EmployeesListData {
  members: Employee[];
  /** The caller's own role on this shop — gates the "add manager" option. */
  viewer_role: MembershipRole;
}

const employeesQueryKey = (shopUid: string | null | undefined) => ['employees', shopUid] as const;

/** GET /api/shops/{shop_uid}/members — every active employee. Any member can view. */
export function useEmployees(shopUid: string | null | undefined) {
  return useQuery({
    queryKey: employeesQueryKey(shopUid),
    queryFn: async () => {
      const response = await axios.get<ApiResponse<EmployeesListData>>(`/shops/${shopUid}/members`);
      return response.data.data;
    },
    enabled: Boolean(shopUid),
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
 * The new employee is written straight into the `employees` cache on
 * success — the list updates the instant the request resolves, with no
 * second round trip for the caller to wait on — and a background
 * `invalidateQueries` follows to reconcile with the server's own ordering
 * and any stats (e.g. total sales) this response doesn't carry.
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
    onSuccess: (response, { shopUid }) => {
      const added = response.data?.member;
      const queryKey = employeesQueryKey(shopUid);

      if (added) {
        queryClient.setQueryData<EmployeesListData>(queryKey, (current) =>
          current
            ? { ...current, members: [...current.members, added] }
            : { members: [added], viewer_role: added.role },
        );
      }
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}
