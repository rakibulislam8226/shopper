import { type ApiResponse } from '@api/types';

/**
 * What every failed `axios` call in this app rejects with — the backend's
 * envelope, normalised by the toast plugin (`plugins/toast.ts`) even for a
 * network-level failure that never reached the server. Safe to type a
 * mutation's `TError` as this.
 *
 * ``httpStatus`` is not part of the wire envelope (the backend doesn't repeat
 * its own status code in the body) — the toast plugin attaches it from the
 * transport layer purely for client-side decisions like retry policy
 * (`app/queryClient.ts`). ``0`` means the request never got a response at all.
 */
export interface ApiErrorResponse extends ApiResponse {
  httpStatus: number;
}

/**
 * Turns the backend's `error: [{ field, msg }]` list into a `field -> msg`
 * map a form can index straight into (`fieldErrors.phone`) and hand to an
 * input's `error` prop (e.g. `AuthInput`). The first message wins when a
 * field appears more than once; entries with no `field` (whole-submission
 * errors) are dropped here — they have nothing to attach to, and are
 * already covered by the toasted `message`.
 *
 * The overall `message` is always shown via the axios `toast` option
 * already configured on the call — this only ever adds the inline,
 * per-field layer on top of it.
 */
export function toFieldErrors(error: ApiErrorResponse | null | undefined): Record<string, string> {
  const fieldErrors: Record<string, string> = {};
  for (const entry of error?.error ?? []) {
    if (entry.field && !(entry.field in fieldErrors)) {
      fieldErrors[entry.field] = entry.msg;
    }
  }
  return fieldErrors;
}
