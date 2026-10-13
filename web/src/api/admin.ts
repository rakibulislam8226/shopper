import { type AuthUser } from '@api/auth';
import { type Employee, type MembershipRole } from '@api/memberships';
import { type Shop, type ShopDocument } from '@api/shops';
import { type ApiErrorResponse } from '@lib/apiErrors';
import { axios } from '@plugins/axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ApiResponse, type PaginationMeta } from './types';

export interface AdminShopSummary {
  shop: Shop;
  owner: AuthUser | null;
}

export interface AdminShopDetail extends AdminShopSummary {
  documents: ShopDocument[];
}

interface AdminShopsListData {
  shops: AdminShopSummary[];
}

export interface AdminShopsPage extends AdminShopsListData {
  meta: PaginationMeta;
}

export interface AdminShopsQuery {
  status?: Shop['status'];
  q?: string;
  page?: number;
  limit?: number;
}

const DEFAULT_LIMIT = 10;

function withMeta<T extends object>(
  data: T,
  meta: PaginationMeta | null | undefined,
  page: number,
  limit: number,
) {
  return {
    ...data,
    meta: meta ?? { page, limit, total: 0, total_pages: 0, has_next: false, has_prev: false },
  };
}

export function useAdminShops(query: AdminShopsQuery = {}) {
  const { status, q, page = 1, limit = DEFAULT_LIMIT } = query;

  return useQuery({
    queryKey: ['admin-shops', { status, q, page, limit }],
    queryFn: async (): Promise<AdminShopsPage | null> => {
      const response = await axios.get<ApiResponse<AdminShopsListData>>('/admin/shops', {
        params: { status, q: q || undefined, page, limit },
      });
      if (!response.data.data) return null;
      return withMeta(response.data.data, response.data.meta, page, limit);
    },
    placeholderData: (previous) => previous,
  });
}

export function useAdminShop(shopUid: string | null) {
  return useQuery({
    queryKey: ['admin-shop', shopUid],
    queryFn: async (): Promise<AdminShopDetail | null> => {
      const response = await axios.get<ApiResponse<AdminShopDetail>>(`/admin/shops/${shopUid}`);
      return response.data.data;
    },
    enabled: Boolean(shopUid),
  });
}

interface AdminShopMembersData {
  members: Employee[];
}

/** Read-only staff for any shop — unlike `useEmployees`, needs no membership of the caller's own. */
export function useAdminShopMembers(shopUid: string | null) {
  return useQuery({
    queryKey: ['admin-shop-members', shopUid],
    queryFn: async (): Promise<Employee[]> => {
      const response = await axios.get<ApiResponse<AdminShopMembersData>>(
        `/admin/shops/${shopUid}/members`,
        { params: { limit: 100 } },
      );
      return response.data.data?.members ?? [];
    },
    enabled: Boolean(shopUid),
  });
}

function invalidateShop(queryClient: ReturnType<typeof useQueryClient>, shopUid: string) {
  void queryClient.invalidateQueries({ queryKey: ['admin-shops'] });
  void queryClient.invalidateQueries({ queryKey: ['admin-shop', shopUid] });
  void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
}

export function useApproveShop() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<Shop>, ApiErrorResponse, { shopUid: string }>({
    mutationFn: async ({ shopUid }) => {
      const response = await axios.post<ApiResponse<Shop>>(
        `/admin/shops/${shopUid}/approve`,
        {},
        { toast: { error: 'Unable to approve this shop' } },
      );
      return response.data;
    },
    onSuccess: (_response, { shopUid }) => invalidateShop(queryClient, shopUid),
  });
}

export interface RejectShopPayload {
  shopUid: string;
  reason?: string;
}

export function useRejectShop() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<Shop>, ApiErrorResponse, RejectShopPayload>({
    mutationFn: async ({ shopUid, reason }) => {
      const response = await axios.post<ApiResponse<Shop>>(
        `/admin/shops/${shopUid}/reject`,
        { reason },
        { toast: { error: 'Unable to reject this shop' } },
      );
      return response.data;
    },
    onSuccess: (_response, { shopUid }) => invalidateShop(queryClient, shopUid),
  });
}

function useShopLifecycleAction(action: 'suspend' | 'reactivate' | 'remove', errorFallback: string) {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<Shop>, ApiErrorResponse, { shopUid: string }>({
    mutationFn: async ({ shopUid }) => {
      const response = await axios.post<ApiResponse<Shop>>(
        `/admin/shops/${shopUid}/${action}`,
        {},
        { toast: { error: errorFallback } },
      );
      return response.data;
    },
    onSuccess: (_response, { shopUid }) => invalidateShop(queryClient, shopUid),
  });
}

export const useSuspendShop = () => useShopLifecycleAction('suspend', 'Unable to suspend this shop');
export const useReactivateShop = () =>
  useShopLifecycleAction('reactivate', 'Unable to reactivate this shop');
export const useRemoveShop = () => useShopLifecycleAction('remove', 'Unable to remove this shop');

export interface AdminStats {
  shops_by_status: {
    pending: number;
    active: number;
    suspended: number;
    rejected: number;
    removed: number;
  };
  total_users: number;
  total_superusers: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<AdminStats | null> => {
      const response = await axios.get<ApiResponse<AdminStats>>('/admin/stats');
      return response.data.data;
    },
  });
}

export interface AdminUserOrganization {
  shop: Shop;
  role: MembershipRole;
}

export interface AdminUser {
  uid: string;
  name: string;
  phone: string;
  is_superuser: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  organizations: AdminUserOrganization[];
}

interface AdminUsersListData {
  users: AdminUser[];
}

export interface AdminUsersPageData extends AdminUsersListData {
  meta: PaginationMeta;
}

export interface AdminUsersQuery {
  q?: string;
  page?: number;
  limit?: number;
}

export function useAdminUsers(query: AdminUsersQuery = {}) {
  const { q, page = 1, limit = DEFAULT_LIMIT } = query;

  return useQuery({
    queryKey: ['admin-users', { q, page, limit }],
    queryFn: async (): Promise<AdminUsersPageData | null> => {
      const response = await axios.get<ApiResponse<AdminUsersListData>>('/admin/users', {
        params: { q: q || undefined, page, limit },
      });
      if (!response.data.data) return null;
      return withMeta(response.data.data, response.data.meta, page, limit);
    },
    placeholderData: (previous) => previous,
  });
}

export function useAdminUser(userUid: string | null) {
  return useQuery({
    queryKey: ['admin-user', userUid],
    queryFn: async (): Promise<AdminUser | null> => {
      const response = await axios.get<ApiResponse<AdminUser>>(`/admin/users/${userUid}`);
      return response.data.data;
    },
    enabled: Boolean(userUid),
  });
}

/** Backend 403s a superuser deactivating themselves; surfaced via the usual error toast. */
export function useSetUserActive() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<AdminUser>, ApiErrorResponse, { userUid: string; active: boolean }>({
    mutationFn: async ({ userUid, active }) => {
      const response = await axios.post<ApiResponse<AdminUser>>(
        `/admin/users/${userUid}/${active ? 'activate' : 'deactivate'}`,
        {},
        { toast: { error: `Unable to ${active ? 'activate' : 'deactivate'} this account` } },
      );
      return response.data;
    },
    onSuccess: (_response, { userUid }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-user', userUid] });
    },
  });
}
