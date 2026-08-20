import { LoginForm } from "@/components/auth/login-form";
import { sanitizeNextPath } from "@/lib/auth/next-path";

const REASON_MESSAGES: Record<string, string> = {
  unauthenticated: "Silakan masuk untuk melanjutkan.",
  session_ended: "Sesi Anda telah berakhir. Silakan masuk kembali.",
  not_admin: "Akun ini tidak memiliki akses ke panel admin.",
  signed_out: "Anda telah keluar.",
};

// searchParams is a Promise in Next 16.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const reasonParam = typeof params.reason === "string" ? params.reason : undefined;
  const next = sanitizeNextPath(typeof params.next === "string" ? params.next : null);
  const notice = reasonParam ? REASON_MESSAGES[reasonParam] : undefined;
  return <LoginForm next={next} notice={notice} />;
}
