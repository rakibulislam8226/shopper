import {
  type AddEmployeePayload,
  type Employee,
  type MembershipRole,
  useAddEmployee,
  useEmployees,
} from '@api/memberships';
import { EmptySection } from '@components/dashboard/EmptySection';
import { PageHeader } from '@components/dashboard/PageHeader';
import { Button } from '@components/ui/Button';
import { FieldError } from '@components/ui/FieldError';
import { LockIcon, PhoneIcon, UserIcon, UsersIcon } from '@components/ui/icons';
import { Modal } from '@components/ui/Modal';
import { StatusPill, type StatusTone } from '@components/ui/StatusPill';
import { toFieldErrors } from '@lib/apiErrors';
import { cn } from '@lib/cn';
import { formatCurrency, formatDateTime } from '@lib/format';
import { useAuthStore } from '@stores/auth';
import { type FormEvent, useState } from 'react';

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

export function EmployeesPage() {
  const activeShopUid = useAuthStore((state) => state.activeShopUid);

  return (
    <div className="mx-auto max-w-5xl">
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
  const { data, isLoading, isError } = useEmployees(shopUid);
  const [showAddModal, setShowAddModal] = useState(false);

  if (isLoading) {
    return <p className="text-sm text-text-muted">Loading employees…</p>;
  }

  if (isError || !data) {
    return <p className="text-sm text-rose-400">Unable to load this shop's employees.</p>;
  }

  const canAddEmployees = data.viewer_role === 'owner' || data.viewer_role === 'manager';

  return (
    <div className="flex flex-col gap-4">
      {canAddEmployees && (
        <div className="flex justify-end">
          <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)}>
            Add employee
          </Button>
        </div>
      )}

      <EmployeesTable employees={data.members} />

      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add a manager or staff member"
        description="If this phone number already has an account, it's attached to this shop as-is — the password below only applies to a brand-new account."
        size="lg"
      >
        <AddEmployeeForm
          shopUid={shopUid}
          canAddManager={data.viewer_role === 'owner'}
          onAdded={() => setShowAddModal(false)}
        />
      </Modal>
    </div>
  );
}

function EmployeesTable({ employees }: { employees: Employee[] }) {
  if (employees.length === 0) {
    return (
      <EmptySection
        title="No employees yet"
        description="Add a manager or staff member to get started."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-edge-strong bg-card">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-edge-strong text-xs text-text-muted">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Total sales</th>
            <th className="px-4 py-3 font-medium">Last login</th>
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-muted">Full name</span>
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border bg-inset px-3 py-2 focus-within:ring-4',
            fieldErrors.name
              ? 'border-rose-500/60 focus-within:border-rose-500 focus-within:ring-rose-500/15'
              : 'border-edge-strong focus-within:border-indigo-500 focus-within:ring-brand-ring',
          )}
        >
          <UserIcon className="h-4 w-4 shrink-0 text-text-faint" />
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            className="w-full bg-transparent text-sm text-text-primary outline-none"
          />
        </div>
        <FieldError message={fieldErrors.name} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-muted">Phone</span>
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border bg-inset px-3 py-2 focus-within:ring-4',
            fieldErrors.phone
              ? 'border-rose-500/60 focus-within:border-rose-500 focus-within:ring-rose-500/15'
              : 'border-edge-strong focus-within:border-indigo-500 focus-within:ring-brand-ring',
          )}
        >
          <PhoneIcon className="h-4 w-4 shrink-0 text-text-faint" />
          <input
            type="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="01XXXXXXXXX"
            required
            className="w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-faint"
          />
        </div>
        <FieldError message={fieldErrors.phone} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-muted">Role</span>
        <div className="flex items-center gap-2 rounded-lg border border-edge-strong bg-inset px-3 py-2 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-brand-ring">
          <UsersIcon className="h-4 w-4 shrink-0 text-text-faint" />
          <select
            value={role}
            onChange={(event) => setRole(event.target.value as AddEmployeePayload['role'])}
            className="w-full bg-transparent text-sm text-text-primary outline-none"
          >
            <option value="salesman">Staff (salesman)</option>
            {canAddManager && <option value="manager">Manager</option>}
          </select>
        </div>
        <FieldError message={fieldErrors.role} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-muted">Initial password</span>
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border bg-inset px-3 py-2 focus-within:ring-4',
            fieldErrors.password
              ? 'border-rose-500/60 focus-within:border-rose-500 focus-within:ring-rose-500/15'
              : 'border-edge-strong focus-within:border-indigo-500 focus-within:ring-brand-ring',
          )}
        >
          <LockIcon className="h-4 w-4 shrink-0 text-text-faint" />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={8}
            required
            className="w-full bg-transparent text-sm text-text-primary outline-none"
          />
        </div>
        <FieldError message={fieldErrors.password} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-muted">Confirm password</span>
        <div
          className={cn(
            'flex items-center gap-2 rounded-lg border bg-inset px-3 py-2 focus-within:ring-4',
            passwordsMismatch || fieldErrors.confirm_password
              ? 'border-rose-500/60 focus-within:border-rose-500 focus-within:ring-rose-500/15'
              : 'border-edge-strong focus-within:border-indigo-500 focus-within:ring-brand-ring',
          )}
        >
          <LockIcon className="h-4 w-4 shrink-0 text-text-faint" />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            required
            className="w-full bg-transparent text-sm text-text-primary outline-none"
          />
        </div>
        <FieldError
          message={passwordsMismatch ? "Passwords don't match" : fieldErrors.confirm_password}
        />
      </label>

      <Button
        type="submit"
        size="md"
        isLoading={addEmployee.isPending}
        loadingText="Adding…"
        className="self-start"
      >
        Add employee
      </Button>
    </form>
  );
}
