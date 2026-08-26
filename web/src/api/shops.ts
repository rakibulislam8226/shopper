import { type AuthUser, type TokenPair } from '@api/auth';
import { axios } from '@plugins/axios';
import { useMutation } from '@tanstack/react-query';

import { type ApiResponse } from './types';

/** Mirrors `ShopPublic` in `app/modules/shops/schemas.py`. */
export interface Shop {
  uid: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo: string | null;
  status: 'pending' | 'active' | 'suspended' | 'rejected' | 'removed';
  created_at: string;
}

export interface RegisterShopPayload {
  owner_name: string;
  phone: string;
  password: string;
  shop_name: string;
  shop_email?: string;
  shop_phone?: string;
  shop_address?: string;
  shop_logo?: string;
}

export interface RegisterShopData {
  user: AuthUser;
  shop: Shop;
  tokens: TokenPair;
}

/**
 * POST /api/shops/register — creates the owner (or reuses one by phone) and
 * their shop, and issues tokens right away. The shop itself starts PENDING
 * and stays unusable until a superuser approves the documents submitted for
 * it (`useUploadShopDocument`).
 */
export function useRegisterShop() {
  return useMutation({
    mutationFn: async (payload: RegisterShopPayload) => {
      const response = await axios.post<ApiResponse<RegisterShopData>>(
        '/shops/register',
        payload,
        { toast: { error: 'Unable to register shop' } },
      );
      return response.data;
    },
  });
}

/** Mirrors `ShopDocumentType` in `app/db/enums.py`. */
export type ShopDocumentType = 'owner_nid' | 'trade_license' | 'tin_certificate' | 'other';

/** Mirrors `ShopDocumentPublic`. */
export interface ShopDocument {
  uid: string;
  type: ShopDocumentType;
  file_url: string;
  created_at: string;
}

export interface UploadShopDocumentPayload {
  shopUid: string;
  type: ShopDocumentType;
  file: File;
}

/** POST /api/shops/{shop_uid}/documents — submits one document for shop approval. */
export function useUploadShopDocument() {
  return useMutation({
    mutationFn: async ({ shopUid, type, file }: UploadShopDocumentPayload) => {
      const form = new FormData();
      form.append('type', type);
      form.append('file', file);

      const response = await axios.post<ApiResponse<ShopDocument>>(
        `/shops/${shopUid}/documents`,
        form,
        { toast: { error: 'Unable to upload document' } },
      );
      return response.data;
    },
  });
}
