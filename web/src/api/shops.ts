import { type AuthUser, type TokenPair } from '@api/auth';
import { axios } from '@plugins/axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
  rejection_reason: string | null;
  created_at: string;
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

export interface RegisterShopPayload {
  owner_name: string;
  phone: string;
  password: string;
  confirm_password: string;
  shop_name: string;
  shop_email?: string;
  shop_phone?: string;
  shop_address?: string;
  shopLogo?: File;
  /** Required — registration is rejected without it. */
  ownerNid: File;
  tradeLicense?: File;
  tinCertificate?: File;
  otherDocument?: File;
}

export interface RegisterShopData {
  user: AuthUser;
  shop: Shop;
  tokens: TokenPair;
  documents: ShopDocument[];
}

/**
 * POST /api/shops/register — one multipart request carrying the owner + shop
 * fields together with the owner NID (required) and any optional supporting
 * documents. Issues tokens right away; the shop itself starts PENDING and
 * stays unusable until a superuser approves it.
 */
export function useRegisterShop() {
  return useMutation({
    mutationFn: async (payload: RegisterShopPayload) => {
      const form = new FormData();
      form.append('owner_name', payload.owner_name);
      form.append('phone', payload.phone);
      form.append('password', payload.password);
      form.append('confirm_password', payload.confirm_password);
      form.append('shop_name', payload.shop_name);
      if (payload.shop_email) form.append('shop_email', payload.shop_email);
      if (payload.shop_phone) form.append('shop_phone', payload.shop_phone);
      if (payload.shop_address) form.append('shop_address', payload.shop_address);
      if (payload.shopLogo) form.append('shop_logo', payload.shopLogo);

      form.append('owner_nid', payload.ownerNid);
      if (payload.tradeLicense) form.append('trade_license', payload.tradeLicense);
      if (payload.tinCertificate) form.append('tin_certificate', payload.tinCertificate);
      if (payload.otherDocument) form.append('other_document', payload.otherDocument);

      const response = await axios.post<ApiResponse<RegisterShopData>>(
        '/shops/register',
        form,
        { toast: { error: 'Unable to register shop' } },
      );
      return response.data;
    },
  });
}

export interface UploadShopDocumentPayload {
  shopUid: string;
  type: ShopDocumentType;
  file: File;
}

/**
 * POST /api/shops/{shop_uid}/documents — attaches one more document to an
 * already-registered shop (e.g. adding a trade license later from settings).
 * Owner-only; invalidates the shop-detail query so Settings reflects the new
 * document without a manual refetch.
 */
export function useUploadShopDocument() {
  const queryClient = useQueryClient();

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
    onSuccess: (_data, { shopUid }) => {
      void queryClient.invalidateQueries({ queryKey: ['shop', shopUid] });
    },
  });
}

export interface ShopDetailData {
  shop: Shop;
  documents: ShopDocument[];
}

/** GET /api/shops/{shop_uid}/status — any active member, not owner-only. */
export function useShopStatus(shopUid: string | null | undefined) {
  return useQuery({
    queryKey: ['shop-status', shopUid],
    queryFn: async () => {
      const response = await axios.get<ApiResponse<Shop>>(`/shops/${shopUid}/status`);
      return response.data.data;
    },
    enabled: Boolean(shopUid),
  });
}

/** GET /api/shops/{shop_uid} — shop profile plus its documents. Owner-only. */
export function useShopDetail(shopUid: string | null | undefined) {
  return useQuery({
    queryKey: ['shop', shopUid],
    queryFn: async () => {
      const response = await axios.get<ApiResponse<ShopDetailData>>(`/shops/${shopUid}`);
      return response.data.data;
    },
    enabled: Boolean(shopUid),
  });
}

export interface UpdateShopPayload {
  shopUid: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

/** PATCH /api/shops/{shop_uid} — updates only the fields provided. Owner-only. */
export function useUpdateShop() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shopUid, ...fields }: UpdateShopPayload) => {
      const response = await axios.patch<ApiResponse<Shop>>(`/shops/${shopUid}`, fields, {
        toast: { error: 'Unable to update shop' },
      });
      return response.data;
    },
    onSuccess: (_data, { shopUid }) => {
      void queryClient.invalidateQueries({ queryKey: ['shop', shopUid] });
    },
  });
}

export interface UploadShopLogoPayload {
  shopUid: string;
  file: File;
}

/** POST /api/shops/{shop_uid}/logo — replaces the shop's logo image. Owner-only. */
export function useUploadShopLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ shopUid, file }: UploadShopLogoPayload) => {
      const form = new FormData();
      form.append('file', file);

      const response = await axios.post<ApiResponse<Shop>>(`/shops/${shopUid}/logo`, form, {
        toast: { error: 'Unable to update logo' },
      });
      return response.data;
    },
    onSuccess: (_data, { shopUid }) => {
      void queryClient.invalidateQueries({ queryKey: ['shop', shopUid] });
    },
  });
}
