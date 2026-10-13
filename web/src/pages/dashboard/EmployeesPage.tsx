import {
  type AddEmployeePayload,
  type Employee,
  type MembershipRole,
  useAddEmployee,
  useEmployees,
  useRemoveMember,
  useUpdateMemberRole,
} from '@api/memberships';
import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';
import { Button } from '@components/ui/Button';
import { FieldError } from '@components/ui/FieldError';
import { LockIcon, PhoneIcon, SearchIcon, UserIcon, UsersIcon } from '@components/ui/icons';
import { Modal } from '@components/ui/Modal';
import { Pagination } from '@components/ui/Pagination';
import { Select, type SelectOption } from '@components/ui/Select';
import { StatusPill, type StatusTone } from '@components/ui/StatusPill';
import { toFieldErrors } from '@lib/apiErrors';
import { cn } from '@lib/cn';
import { formatCurrency, formatDateTime } from '@lib/format';
import { useDebouncedValue } from '@lib/useDebouncedValue';
import { useAuthStore } from '@stores/auth';
import { type FormEvent, useState } from 'react';

const PAGE_SIZE = 10;
/** Below this many characters, a search is too broad to be worth sending. */
const MIN_SEARCH_LENGTH = 2;

const ROLE_FILTER_OPTIONS: SelectOption<MembershipRole | 'all'>[] = [
  { value: 'all', label: 'All roles' },
  { value: 'owner', label: 'Owner' },
  { value: 'manager', label: 'Manager' },
  { value: 'salesman', label: 'Staff' },
];

const ROLE_COPY: Record<MembershipRole, { label: string; tone: StatusTone }> = {
  owner: { label: 'Owner', tone: 'positive' },
  manager: { label: 'Manager', tone: 'neutral' },
  salesman: { label: 'Staff', tone: 'neutral' },
};

const STATUS_COPY: Record<Employee['status'], { label: string; tone: StatusTone }> = {
  active: { label: 'Active', tone: 'positive' },
  invited: { label: 'Invited', tone: 'neutral' },
  removed: { label: 'Removed', tone: 'negative' },
  resigned: { label: 'Resigned', tone: 'negative' },
};

const ROLE_OPTIONS: { value: AddEmployeePayload['role']; label: string; description: string }[] = [
  {
    value: 'salesman',
    label: 'Staff (salesman)',
    description: 'Sells and records transactions',
  },
  { value: 'manager', label: 'Manager', description: 'Can also add staff and manage the shop' },
];

export function EmployeesPage() {
  const activeShopUid = useAuthStore((state) => state.activeShopUid);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader
        title="Employees"
        description="Everyone with access to your organization — owners, managers, and staff."
      />
      {activeShopUid ? (
        <EmployeesSection shopUid={activeShopUid} />
      ) : (
        <EmptySection
          title="No active shop"
          description="Select a shop from the switcher to manage its employees."
        />
      )}
    </div>
  );
}

function EmployeesSection({ shopUid }: { shopUid: string }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [removingEmployee, setRemovingEmployee] = useState<Employee | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState<MembershipRole | 'all'>('all');
  const [page, setPage] = useState(1);

  const debouncedSearch = useDebouncedValue(searchInput.trim());
  // A 1-character query is too broad to be worth a backend round trip — wait
  // for at least 2 before it's sent as a filter at all.
  const q = debouncedSearch.length >= MIN_SEARCH_LENGTH ? debouncedSearch : '';

  const { data, isLoading, isError } = useEmployees(shopUid, {
    q,
    role: roleFilter === 'all' ? undefined : roleFilter,
    page,
    limit: PAGE_SIZE,
  });

  if (isError) {
    return <p className="text-sm text-rose-400">Unable to load this shop's employees.</p>;
  }

  const viewerRole = data?.viewer_role;
  const canAddEmployees = viewerRole === 'owner' || viewerRole === 'manager';

  /** Whether the viewer may change this member's role or remove them. */
  const canManage = (employee: Employee) => {
    if (viewerRole !== 'owner' && viewerRole !== 'manager') return false;
    if (employee.role === 'owner') return false;
    if (employee.role === 'manager' && viewerRole !== 'owner') return false;
    return true;
  };

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
              placeholder="Search by name or phone"
              className="w-full bg-transparent text-lg text-text-primary outline-none placeholder:text-text-faint"
            />
          </div>
          {searchInput.trim().length > 0 && searchInput.trim().length < MIN_SEARCH_LENGTH && (
            <p className="mt-1 text-xs text-text-faint">
              Type at least {MIN_SEARCH_LENGTH} characters to search.
            </p>
          )}
        </div>

        <div className="w-40 shrink-0">
          <Select
            className="cursor-pointer"
            size="md"
            value={roleFilter}
            onChange={(value) => {
              setRoleFilter(value);
              setPage(1);
            }}
            options={ROLE_FILTER_OPTIONS}
          />
        </div>

        {canAddEmployees && (
          <Button variant="primary" size="lg" onClick={() => setShowAddModal(true)}>
            Add employee
          </Button>
        )}
      </div>

      {isLoading && !data ? (
        <p className="text-sm text-text-muted">Loading employees…</p>
      ) : (
        <>
          <EmployeesTable
            employees={data?.members ?? []}
            canManage={canManage}
            onEditRole={setEditingEmployee}
            onRemove={setRemovingEmployee}
          />
          {data && <Pagination meta={data.meta} onPageChange={setPage} />}
        </>
      )}

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add a manager or staff member"
        description="If this phone number already has an account, it's attached to this shop as-is."
        size="xl"
      >
        <AddEmployeeForm
          shopUid={shopUid}
          canAddManager={data?.viewer_role === 'owner'}
          onAdded={() => setShowAddModal(false)}
        />
      </Modal>

      <Modal
        open={editingEmployee !== null}
        onClose={() => setEditingEmployee(null)}
        title="Change role"
        description={editingEmployee ? `Update ${editingEmployee.name}'s access level.` : undefined}
        size="sm"
      >
        {editingEmployee && (
          <EditRoleForm
            shopUid={shopUid}
            employee={editingEmployee}
            canAssignManager={viewerRole === 'owner'}
            onDone={() => setEditingEmployee(null)}
          />
        )}
      </Modal>

      <Modal
        open={removingEmployee !== null}
        onClose={() => setRemovingEmployee(null)}
        title="Remove this member?"
        description={
          removingEmployee
            ? `${removingEmployee.name} will lose access to this shop immediately. This can't be undone from here.`
            : undefined
        }
        size="sm"
      >
        {removingEmployee && (
          <RemoveMemberConfirm
            shopUid={shopUid}
            employee={removingEmployee}
            onDone={() => setRemovingEmployee(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function EmployeesTable({
  employees,
  canManage,
  onEditRole,
  onRemove,
}: {
  employees: Employee[];
  canManage: (employee: Employee) => boolean;
  onEditRole: (employee: Employee) => void;
  onRemove: (employee: Employee) => void;
}) {
  if (employees.length === 0) {
    return (
      <EmptySection
        title="No employees found"
        description="Try a different search or filter, or add a manager or staff member to get started."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-edge-strong bg-card">
      <table className="w-full min-w-170 text-left text-sm">
        <thead>
          <tr className="border-b border-edge-strong text-xs text-text-muted">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Total sales</th>
            <th className="px-4 py-3 font-medium">Last login</th>
            <th className="px-4 py-3 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {employees.map((employee) => {
            const role = ROLE_COPY[employee.role];
            const status = STATUS_COPY[employee.status];
            return (
              <tr key={employee.user_uid} className="border-b border-edge-strong last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-text-muted">
                      <UserIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-text-secondary">{employee.name}</p>
                      <p className="truncate text-xs text-text-muted">{employee.phone}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusPill label={role.label} tone={role.tone} />
                </td>
                <td className="px-4 py-3">
                  <StatusPill label={status.label} tone={status.tone} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-text-secondary">
                  {formatCurrency(employee.total_sales)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-text-muted">
                  {formatDateTime(employee.last_login_at)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {canManage(employee) && (
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" size="sm" onClick={() => onEditRole(employee)}>
                        Change role
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => onRemove(employee)}>
                        Remove
                      </Button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AddEmployeeForm({
  shopUid,
  canAddManager,
  onAdded,
}: {
  shopUid: string;
  canAddManager: boolean;
  onAdded: () => void;
}) {
  const addEmployee = useAddEmployee();
  const fieldErrors = toFieldErrors(addEmployee.error);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<AddEmployeePayload['role']>('salesman');

  const roleOptions = canAddManager
    ? ROLE_OPTIONS
    : ROLE_OPTIONS.filter((option) => option.value !== 'manager');

  // Only nag once the visitor has actually typed a confirmation — see
  // SignUpForm for the same rule on the registration form.
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (passwordsMismatch) return;

    addEmployee.mutate(
      { shopUid, name, phone, password, confirm_password: confirmPassword, role },
      {
        onSuccess: (response) => {
          if (!response.status) return;
          setName('');
          setPhone('');
          setPassword('');
          setConfirmPassword('');
          setRole('salesman');
          onAdded();
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-muted">Full name</span>
          <div
            className={cn(
              'flex items-start gap-2.5 rounded-lg border bg-inset px-3.5 py-3 focus-within:ring-4',
              fieldErrors.name
                ? 'border-rose-500/60 focus-within:border-rose-500 focus-within:ring-rose-500/15'
                : 'border-edge-strong focus-within:border-indigo-500 focus-within:ring-brand-ring',
            )}
          >
            <UserIcon className="h-5 w-5 shrink-0 text-text-faint" />
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-full bg-transparent text-base text-text-primary outline-none"
            />
          </div>
          <FieldError message={fieldErrors.name} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-muted">Phone</span>
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-lg border bg-inset px-3.5 py-3 focus-within:ring-4',
              fieldErrors.phone
                ? 'border-rose-500/60 focus-within:border-rose-500 focus-within:ring-rose-500/15'
                : 'border-edge-strong focus-within:border-indigo-500 focus-within:ring-brand-ring',
            )}
          >
            <PhoneIcon className="h-5 w-5 shrink-0 text-text-faint" />
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="01XXXXXXXXX"
              required
              className="w-full bg-transparent text-base text-text-primary outline-none placeholder:text-text-faint"
            />
          </div>
          <FieldError message={fieldErrors.phone} />
        </label>
      </div>

      <Select
        label="Role"
        icon={<UsersIcon className="h-5 w-5" />}
        value={role}
        onChange={setRole}
        options={roleOptions}
        error={fieldErrors.role}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-muted">Initial password</span>
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-lg border bg-inset px-3.5 py-3 focus-within:ring-4',
              fieldErrors.password
                ? 'border-rose-500/60 focus-within:border-rose-500 focus-within:ring-rose-500/15'
                : 'border-edge-strong focus-within:border-indigo-500 focus-within:ring-brand-ring',
            )}
          >
            <LockIcon className="h-5 w-5 shrink-0 text-text-faint" />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              className="w-full bg-transparent text-base text-text-primary outline-none"
            />
          </div>
          <FieldError message={fieldErrors.password} />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-text-muted">Confirm password</span>
          <div
            className={cn(
              'flex items-center gap-2.5 rounded-lg border bg-inset px-3.5 py-3 focus-within:ring-4',
              passwordsMismatch || fieldErrors.confirm_password
                ? 'border-rose-500/60 focus-within:border-rose-500 focus-within:ring-rose-500/15'
                : 'border-edge-strong focus-within:border-indigo-500 focus-within:ring-brand-ring',
            )}
          >
            <LockIcon className="h-5 w-5 shrink-0 text-text-faint" />
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              className="w-full bg-transparent text-base text-text-primary outline-none"
            />
          </div>
          <FieldError
            message={passwordsMismatch ? "Passwords don't match" : fieldErrors.confirm_password}
          />
        </label>
      </div>

      <Button
        type="submit"
        size="lg"
        isLoading={addEmployee.isPending}
        loadingText="Adding…"
        className="mt-1 self-end"
      >
        Add employee
      </Button>
    </form>
  );
}

const EDIT_ROLE_OPTIONS: { value: 'manager' | 'salesman'; label: string; description: string }[] =
  [
    { value: 'salesman', label: 'Staff (salesman)', description: 'Sells and records transactions' },
    { value: 'manager', label: 'Manager', description: 'Can also add staff and manage the shop' },
  ];

function EditRoleForm({
  shopUid,
  employee,
  canAssignManager,
  onDone,
}: {
  shopUid: string;
  employee: Employee;
  canAssignManager: boolean;
  onDone: () => void;
}) {
  const updateRole = useUpdateMemberRole();
  const [role, setRole] = useState<'manager' | 'salesman'>(
    employee.role === 'manager' ? 'manager' : 'salesman',
  );

  const roleOptions = canAssignManager
    ? EDIT_ROLE_OPTIONS
    : EDIT_ROLE_OPTIONS.filter((option) => option.value !== 'manager');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateRole.mutate(
      { shopUid, userUid: employee.user_uid, role },
      { onSuccess: (response) => response.status && onDone() },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Select
        label="Role"
        icon={<UsersIcon className="h-5 w-5" />}
        value={role}
        onChange={setRole}
        options={roleOptions}
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="lg" onClick={onDone}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="lg"
          isLoading={updateRole.isPending}
          loadingText="Saving…"
          disabled={role === employee.role}
        >
          Save
        </Button>
      </div>
    </form>
  );
}

function RemoveMemberConfirm({
  shopUid,
  employee,
  onDone,
}: {
  shopUid: string;
  employee: Employee;
  onDone: () => void;
}) {
  const removeMember = useRemoveMember();

  const handleRemove = () => {
    removeMember.mutate(
      { shopUid, userUid: employee.user_uid },
      { onSuccess: (response) => response.status && onDone() },
    );
  };

  return (
    <div className="flex justify-end gap-2">
      <Button variant="secondary" size="lg" onClick={onDone}>
        Cancel
      </Button>
      <Button
        variant="danger"
        size="lg"
        isLoading={removeMember.isPending}
        loadingText="Removing…"
        onClick={handleRemove}
      >
        Remove
      </Button>
    </div>
  );
}
