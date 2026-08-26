import { type Shop } from '@api/shops';
import { axios } from '@plugins/axios';
import { useMutation } from '@tanstack/react-query';

import { type ApiResponse } from './types';

/** Mirrors `UserPublic` in `app/modules/users/schemas.py`. */
export interface AuthUser {
  uid: string;
  name: string;
  phone: string;
  is_superuser: boolean;
  is_active: boolean;
  must_change_password: boolean;
  active_shop: Shop | null;
  last_login_at: string | null;
  created_at: string;
}

/** Mirrors `TokenPair`. `expires_in` is the *access* token's lifetime, in seconds. */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginPayload {
  phone: string;
  password: string;
}

export interface LoginData {
  user: AuthUser;
  tokens: TokenPair;
}

export interface RefreshData {
  tokens: TokenPair;
}

/** POST /api/users/login — phone + password, returns the user and a token pair. */
export function useLogin() {
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const response = await axios.post<ApiResponse<LoginData>>('/users/login', payload, {
        toast: { error: 'Unable to sign in' },
      });
      return response.data;
    },
  });
}

export interface SwitchActiveShopPayload {
  shop_uid: string;
}

export interface SwitchActiveShopData {
  user: AuthUser;
}

/**
 * POST /api/users/active-shop — selects which shop the caller operates in.
 * Only an ACTIVE shop can be selected; a PENDING/REJECTED/SUSPENDED/REMOVED
 * shop is refused with a message explaining why.
 */
export function useSwitchActiveShop() {
  return useMutation({
    mutationFn: async (payload: SwitchActiveShopPayload) => {
      const response = await axios.post<ApiResponse<SwitchActiveShopData>>(
        '/users/active-shop',
        payload,
        { toast: { error: 'Unable to switch shop' } },
      );
      return response.data;
    },
  });
}
