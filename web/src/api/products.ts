import { type ApiErrorResponse } from '@lib/apiErrors';
import { axios } from '@plugins/axios';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type MembershipRole } from './memberships';
import { type ApiResponse, type PaginationMeta } from './types';

export interface ProductCategory {
  uid: string;
  name: string;
}

export interface Product {
  uid: string;
  name: string;
  sku: string | null;
  unit: string;
  description: string | null;
  image: string | null;
  category: ProductCategory | null;
  stock_quantity: string;
  min_price: string | null;
  is_active: boolean;
  created_at: string;
}

const DEFAULT_LIMIT = 10;

function categoriesKey(shopUid: string | null) {
  return ['product-categories', shopUid] as const;
}

export function useCategories(shopUid: string | null) {
  return useQuery({
    queryKey: categoriesKey(shopUid),
    queryFn: async (): Promise<ProductCategory[]> => {
      const response = await axios.get<ApiResponse<{ categories: ProductCategory[] }>>(
        `/shops/${shopUid}/products/categories`,
      );
      return response.data.data?.categories ?? [];
    },
    enabled: Boolean(shopUid),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<ProductCategory>, ApiErrorResponse, { shopUid: string; name: string }>({
    mutationFn: async ({ shopUid, name }) => {
      const response = await axios.post<ApiResponse<ProductCategory>>(
        `/shops/${shopUid}/products/categories`,
        { name },
        { toast: { error: 'Unable to create category' } },
      );
      return response.data;
    },
    onSuccess: (_response, { shopUid }) => {
      void queryClient.invalidateQueries({ queryKey: categoriesKey(shopUid) });
    },
  });
}

interface ProductsListData {
  products: Product[];
  viewer_role: MembershipRole;
}

export interface ProductsPageData extends ProductsListData {
  meta: PaginationMeta;
}

export interface ProductsQuery {
  q?: string;
  categoryUid?: string;
  status?: 'active' | 'inactive' | 'all';
  page?: number;
  limit?: number;
}

export function useProducts(shopUid: string | null, query: ProductsQuery = {}) {
  const { q, categoryUid, status = 'active', page = 1, limit = DEFAULT_LIMIT } = query;

  return useQuery({
    queryKey: ['products', shopUid, { q, categoryUid, status, page, limit }],
    queryFn: async (): Promise<ProductsPageData | null> => {
      const response = await axios.get<ApiResponse<ProductsListData>>(`/shops/${shopUid}/products`, {
        params: { q: q || undefined, category_uid: categoryUid, status, page, limit },
      });
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
    placeholderData: (previous) => previous,
  });
}

export function useProduct(shopUid: string | null, productUid: string | null) {
  return useQuery({
    queryKey: ['product', shopUid, productUid],
    queryFn: async (): Promise<Product | null> => {
      const response = await axios.get<ApiResponse<Product>>(
        `/shops/${shopUid}/products/${productUid}`,
      );
      return response.data.data;
    },
    enabled: Boolean(shopUid) && Boolean(productUid),
  });
}

function invalidateProducts(queryClient: ReturnType<typeof useQueryClient>, shopUid: string) {
  void queryClient.invalidateQueries({ queryKey: ['products', shopUid] });
}

export interface ProductFormFields {
  name: string;
  sku?: string;
  unit: string;
  description?: string;
  min_price?: string;
  category_uid?: string | null;
}

export interface CreateProductPayload extends ProductFormFields {
  shopUid: string;
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<Product>, ApiErrorResponse, CreateProductPayload>({
    mutationFn: async ({ shopUid, ...body }) => {
      const response = await axios.post<ApiResponse<Product>>(`/shops/${shopUid}/products`, body, {
        toast: { error: 'Unable to create product' },
      });
      return response.data;
    },
    onSuccess: (_response, { shopUid }) => invalidateProducts(queryClient, shopUid),
  });
}

export interface UpdateProductPayload extends Partial<ProductFormFields> {
  shopUid: string;
  productUid: string;
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation<ApiResponse<Product>, ApiErrorResponse, UpdateProductPayload>({
    mutationFn: async ({ shopUid, productUid, ...body }) => {
      const response = await axios.patch<ApiResponse<Product>>(
        `/shops/${shopUid}/products/${productUid}`,
        body,
        { toast: { error: 'Unable to update product' } },
      );
      return response.data;
    },
    onSuccess: (_response, { shopUid, productUid }) => {
      invalidateProducts(queryClient, shopUid);
      void queryClient.invalidateQueries({ queryKey: ['product', shopUid, productUid] });
    },
  });
}

export function useSetProductActive() {
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<Product>,
    ApiErrorResponse,
    { shopUid: string; productUid: string; active: boolean }
  >({
    mutationFn: async ({ shopUid, productUid, active }) => {
      const response = await axios.post<ApiResponse<Product>>(
        `/shops/${shopUid}/products/${productUid}/${active ? 'activate' : 'deactivate'}`,
        {},
        { toast: { error: `Unable to ${active ? 'activate' : 'deactivate'} this product` } },
      );
      return response.data;
    },
    onSuccess: (_response, { shopUid, productUid }) => {
      invalidateProducts(queryClient, shopUid);
      void queryClient.invalidateQueries({ queryKey: ['product', shopUid, productUid] });
    },
  });
}

export function useUploadProductImage() {
  const queryClient = useQueryClient();

  return useMutation<
    ApiResponse<Product>,
    ApiErrorResponse,
    { shopUid: string; productUid: string; file: File }
  >({
    mutationFn: async ({ shopUid, productUid, file }) => {
      const form = new FormData();
      form.append('file', file);
      const response = await axios.post<ApiResponse<Product>>(
        `/shops/${shopUid}/products/${productUid}/image`,
        form,
        { toast: { error: 'Unable to upload image' } },
      );
      return response.data;
    },
    onSuccess: (_response, { shopUid, productUid }) => {
      invalidateProducts(queryClient, shopUid);
      void queryClient.invalidateQueries({ queryKey: ['product', shopUid, productUid] });
    },
  });
}
