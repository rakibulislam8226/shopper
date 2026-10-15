import {
  type CreateProductPayload,
  type Product,
  type ProductFormFields,
  useCategories,
  useCreateCategory,
  useCreateProduct,
  useProducts,
  useSetProductActive,
  useUpdateProduct,
  useUploadProductImage,
} from '@api/products';
import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';
import { Button } from '@components/ui/Button';
import { Combobox } from '@components/ui/Combobox';
import { FieldError } from '@components/ui/FieldError';
import { FieldLabel } from '@components/ui/FieldLabel';
import { BoxIcon, ImageIcon, SearchIcon } from '@components/ui/icons';
import { Modal } from '@components/ui/Modal';
import { Pagination } from '@components/ui/Pagination';
import { Select, type SelectOption } from '@components/ui/Select';
import { StatusPill } from '@components/ui/StatusPill';
import { toFieldErrors } from '@lib/apiErrors';
import { formatCurrency } from '@lib/format';
import { useDebouncedValue } from '@lib/useDebouncedValue';
import { useAuthStore } from '@stores/auth';
import { type FormEvent, useRef, useState } from 'react';

const PAGE_SIZE = 10;
const MIN_SEARCH_LENGTH = 2;
const NO_CATEGORY = 'none';

const STATUS_FILTER_OPTIONS: SelectOption<'active' | 'inactive' | 'all'>[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'all', label: 'All' },
];

export function ProductsPage() {
  const activeShopUid = useAuthStore((state) => state.activeShopUid);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader title="Products" description="The catalogue for your organization." />
      {activeShopUid ? (
        <ProductsSection shopUid={activeShopUid} />
      ) : (
        <EmptySection
          title="No active shop"
          description="Select a shop from the switcher to manage its products."
        />
      )}
    </div>
  );
}

function ProductsSection({ shopUid }: { shopUid: string }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(searchInput.trim());
  const q = debouncedSearch.length >= MIN_SEARCH_LENGTH ? debouncedSearch : '';

  const categories = useCategories(shopUid);
  const { data, isLoading, isError } = useProducts(shopUid, {
    q,
    categoryUid: categoryFilter === 'all' ? undefined : categoryFilter,
    status: statusFilter,
    page,
    limit: PAGE_SIZE,
  });
  const setActive = useSetProductActive();

  const canManage = data?.viewer_role === 'owner' || data?.viewer_role === 'manager';

  const categoryOptions: SelectOption<string>[] = [
    { value: 'all', label: 'All categories' },
    ...(categories.data ?? []).map((category) => ({ value: category.uid, label: category.name })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 rounded-lg border border-edge-strong bg-inset px-3 py-2 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-brand-ring">
            <SearchIcon className="h-4 w-4 shrink-0 text-text-faint" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => {
                setSearchInput(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name or SKU"
              className="w-full bg-transparent text-lg text-text-primary outline-none placeholder:text-text-faint"
            />
          </div>
        </div>

        <div className="w-44 shrink-0">
          <Select
            size="md"
            value={categoryFilter}
            onChange={(value) => {
              setCategoryFilter(value);
              setPage(1);
            }}
            options={categoryOptions}
          />
        </div>

        <div className="w-32 shrink-0">
          <Select
            size="md"
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              setPage(1);
            }}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>

        {canManage && (
          <Button variant="primary" size="lg" onClick={() => setShowAddModal(true)}>
            Add product
          </Button>
        )}
      </div>

      {isError ? (
        <p className="text-sm text-rose-400">Unable to load products.</p>
      ) : isLoading && !data ? (
        <p className="text-sm text-text-muted">Loading products…</p>
      ) : (
        <>
          <ProductsTable
            products={data?.products ?? []}
            canManage={canManage}
            onEdit={setEditingProduct}
            onToggleActive={(product) =>
              setActive.mutate({ shopUid, productUid: product.uid, active: !product.is_active })
            }
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add a product"
        size="xl"
      >
        <ProductForm shopUid={shopUid} onDone={() => setShowAddModal(false)} />
      </Modal>

      <Modal
        open={editingProduct !== null}
        onClose={() => setEditingProduct(null)}
        title="Edit product"
        size="xl"
      >
        {editingProduct && (
          <ProductForm
            shopUid={shopUid}
            product={editingProduct}
            onDone={() => setEditingProduct(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function ProductsTable({
  products,
  canManage,
  onEdit,
  onToggleActive,
}: {
  products: Product[];
  canManage: boolean;
  onEdit: (product: Product) => void;
  onToggleActive: (product: Product) => void;
}) {
  if (products.length === 0) {
    return (
      <EmptySection
        title="No products found"
        description="Try a different search or filter, or add a product to get started."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-edge-strong bg-card">
      <table className="w-full min-w-170 text-left text-sm">
        <thead>
          <tr className="border-b border-edge-strong text-xs text-text-muted">
            <th className="px-4 py-3 font-medium">Product</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Stock</th>
            <th className="px-4 py-3 font-medium">Min. price</th>
            <th className="px-4 py-3 font-medium">Status</th>
            {canManage && (
              <th className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.uid} className="border-b border-edge-strong last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-elevated text-text-muted">
                    {product.image ? (
                      <img src={product.image} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <BoxIcon className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-text-secondary">{product.name}</p>
                    <p className="truncate text-xs text-text-muted">{product.sku ?? '—'}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3 text-text-secondary">{product.category?.name ?? '—'}</td>
              <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                {product.stock_quantity} {product.unit}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                {product.min_price ? formatCurrency(product.min_price) : '—'}
              </td>
              <td className="px-4 py-3">
                <StatusPill
                  label={product.is_active ? 'Active' : 'Inactive'}
                  tone={product.is_active ? 'positive' : 'negative'}
                />
              </td>
              {canManage && (
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" size="sm" onClick={() => onEdit(product)}>
                      Edit
                    </Button>
                    <Button
                      variant={product.is_active ? 'danger' : 'secondary'}
                      size="sm"
                      onClick={() => onToggleActive(product)}
                    >
                      {product.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ProductForm({
  shopUid,
  product,
  onDone,
}: {
  shopUid: string;
  product?: Product;
  onDone: () => void;
}) {
  const categories = useCategories(shopUid);
  const createCategory = useCreateCategory();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const uploadImage = useUploadProductImage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = product ? updateProduct : createProduct;
  const fieldErrors = toFieldErrors(mutation.error);

  const [name, setName] = useState(product?.name ?? '');
  const [sku, setSku] = useState(product?.sku ?? '');
  const [unit, setUnit] = useState(product?.unit ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [minPrice, setMinPrice] = useState(product?.min_price ?? '');
  const [categoryUid, setCategoryUid] = useState(product?.category?.uid ?? NO_CATEGORY);

  const categoryOptions = [
    { value: NO_CATEGORY, label: 'No category' },
    ...(categories.data ?? []).map((category) => ({ value: category.uid, label: category.name })),
  ];

  const handleCreateCategory = (categoryName: string) => {
    createCategory.mutate(
      { shopUid, name: categoryName },
      {
        onSuccess: (response) => {
          if (response.data) setCategoryUid(response.data.uid);
        },
      },
    );
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const fields: ProductFormFields = {
      name,
      sku: sku || undefined,
      unit,
      description: description || undefined,
      min_price: minPrice || undefined,
      category_uid: categoryUid === NO_CATEGORY ? null : categoryUid,
    };

    const onSuccess = (response: { status: boolean; data: Product | null }) => {
      if (!response.status || !response.data) return;
      const file = fileInputRef.current?.files?.[0];
      if (file) {
        uploadImage.mutate({ shopUid, productUid: response.data.uid, file });
      }
      onDone();
    };

    if (product) {
      updateProduct.mutate({ shopUid, productUid: product.uid, ...fields }, { onSuccess });
    } else {
      const payload: CreateProductPayload = { shopUid, ...fields };
      createProduct.mutate(payload, { onSuccess });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <FieldLabel required hint="The product's display name, shown throughout the dashboard and on receipts.">
            Name
          </FieldLabel>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="rounded-lg border border-edge-strong bg-inset px-3.5 py-3 text-base text-text-primary outline-none focus:border-indigo-500 focus:ring-4 focus:ring-brand-ring"
          />
          <FieldError message={fieldErrors.name} />
        </label>

        <label className="flex flex-col gap-1.5">
          <FieldLabel hint="A unique code for this product, if you track one. Leave blank if you don't use SKUs.">
            SKU
          </FieldLabel>
          <input
            type="text"
            value={sku}
            onChange={(event) => setSku(event.target.value)}
            className="rounded-lg border border-edge-strong bg-inset px-3.5 py-3 text-base text-text-primary outline-none focus:border-indigo-500 focus:ring-4 focus:ring-brand-ring"
          />
          <FieldError message={fieldErrors.sku} />
        </label>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <FieldLabel required hint="How this product is counted or measured when sold, e.g. pcs, kg, bottle.">
            Unit
          </FieldLabel>
          <input
            type="text"
            value={unit}
            onChange={(event) => setUnit(event.target.value)}
            placeholder="pcs, kg, bottle…"
            required
            className="rounded-lg border border-edge-strong bg-inset px-3.5 py-3 text-base text-text-primary outline-none focus:border-indigo-500 focus:ring-4 focus:ring-brand-ring"
          />
          <FieldError message={fieldErrors.unit} />
        </label>

        <label className="flex flex-col gap-1.5">
          <FieldLabel hint="The lowest price per unit this product can be sold for. The actual sale price is set per batch and may be higher. Leave blank to allow any price.">
            Minimum price (per unit)
          </FieldLabel>
          <input
            type="number"
            min="0"
            step="0.01"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            className="rounded-lg border border-edge-strong bg-inset px-3.5 py-3 text-base text-text-primary outline-none focus:border-indigo-500 focus:ring-4 focus:ring-brand-ring"
          />
          <FieldError message={fieldErrors.min_price} />
        </label>
      </div>

      <Combobox
        label="Category"
        hint="Groups similar products together for filtering and reporting. Search for one, or type a new name to create it."
        value={categoryUid}
        onChange={setCategoryUid}
        options={categoryOptions}
        placeholder="Search or create a category…"
        onCreate={handleCreateCategory}
        creating={createCategory.isPending}
      />

      <label className="flex flex-col gap-1.5">
        <FieldLabel hint="Extra details about this product, visible to staff when selling.">
          Description
        </FieldLabel>
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className="rounded-lg border border-edge-strong bg-inset px-3.5 py-3 text-base text-text-primary outline-none focus:border-indigo-500 focus:ring-4 focus:ring-brand-ring"
        />
        <FieldError message={fieldErrors.description} />
      </label>

      <label className="flex flex-col gap-1.5">
        <FieldLabel hint="A photo shown in the product list and on the point-of-sale screen.">Image</FieldLabel>
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-elevated text-text-muted">
            {product?.image ? (
              <img src={product.image} alt="" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon className="h-5 w-5" />
            )}
          </span>
          <input ref={fileInputRef} type="file" accept="image/*" className="text-sm text-text-muted" />
        </div>
      </label>

      <Button
        type="submit"
        size="lg"
        isLoading={mutation.isPending || uploadImage.isPending}
        loadingText="Saving…"
        className="mt-1 self-end"
      >
        {product ? 'Save changes' : 'Add product'}
      </Button>
    </form>
  );
}

