/**
 * Hand-rolled login validation. No zod, no react-hook-form — same
 * discriminated-union parser + Indonesian error-code-map idiom as
 * mandana-web/lib/storage/booking-form.ts and lib/moving/geo.ts.
 *
 * Login validation is deliberately thinner than a signup form's would be:
 * enforcing a password policy here would (a) leak the policy to anyone
 * probing the login page and (b) reject a legitimate legacy password that
 * the API still accepts. Required + a length ceiling to bound the request
 * body, and nothing else.
 */

export interface LoginFormValues {
  email: string;
  password: string;
}

export type LoginFieldError =
  | "EMAIL_REQUIRED"
  | "EMAIL_INVALID"
  | "EMAIL_TOO_LONG"
  | "PASSWORD_REQUIRED"
  | "PASSWORD_TOO_LONG";

/** Failures that belong to the form as a whole, not to one field. */
export type LoginFormError =
  | "INVALID_CREDENTIALS"
  | "NOT_ADMIN"
  | "RATE_LIMITED"
  | "NETWORK"
  | "SERVER";

export type LoginFieldErrors = Partial<Record<keyof LoginFormValues, LoginFieldError>>;

export type LoginParseResult =
  | { ok: true; value: LoginFormValues }
  | { ok: false; errors: LoginFieldErrors };

/** Components never hand-write error copy — same rule as BOOKING_ERROR_MESSAGES. */
export const LOGIN_FIELD_MESSAGES: Record<LoginFieldError, string> = {
  EMAIL_REQUIRED: "Email wajib diisi.",
  EMAIL_INVALID: "Format email tidak valid.",
  EMAIL_TOO_LONG: "Email terlalu panjang.",
  PASSWORD_REQUIRED: "Kata sandi wajib diisi.",
  PASSWORD_TOO_LONG: "Kata sandi terlalu panjang.",
};

export const LOGIN_FORM_MESSAGES: Record<LoginFormError, string> = {
  // Intentionally identical for unknown email, wrong password, and
  // inactive user — mirrors the API, which returns "Invalid credentials"
  // for all three.
  INVALID_CREDENTIALS: "Email atau kata sandi salah.",
  NOT_ADMIN: "Akun ini tidak memiliki akses ke panel admin.",
  RATE_LIMITED: "Terlalu banyak percobaan masuk. Coba lagi dalam beberapa menit.",
  NETWORK: "Tidak dapat terhubung ke server. Periksa koneksi lalu coba lagi.",
  SERVER: "Terjadi kesalahan pada server. Coba lagi nanti.",
};

/** Same deliberately-loose regex as booking-form.ts: the backend is
 *  authoritative and an over-strict client regex rejects real addresses. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 200;

export function parseLoginForm(values: LoginFormValues): LoginParseResult {
  const errors: LoginFieldErrors = {};

  const email = values.email.trim().toLowerCase();
  if (!email) errors.email = "EMAIL_REQUIRED";
  else if (email.length > MAX_EMAIL_LENGTH) errors.email = "EMAIL_TOO_LONG";
  else if (!EMAIL_RE.test(email)) errors.email = "EMAIL_INVALID";

  // Not trimmed: a leading/trailing space may be part of the password.
  const password = values.password;
  if (!password) errors.password = "PASSWORD_REQUIRED";
  else if (password.length > MAX_PASSWORD_LENGTH) errors.password = "PASSWORD_TOO_LONG";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { email, password } };
}
