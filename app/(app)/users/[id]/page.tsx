import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getUser, listUsers, type AdminUser } from "@/lib/api/users";
import { UserDetailView } from "@/components/users/user-detail-view";
import type { ApiError } from "@/lib/api/errors";

type Params = { id: string };

async function loadUser(id: string): Promise<AdminUser> {
  const result = await getUser(id);
  if (result.ok) return result.data;
  if (result.error.kind === "notFound" || result.error.kind === "validation") notFound();
  throw new Error(errorMessage(result.error));
}

/**
 * There is no server-side guard against demoting/deactivating the sole
 * remaining admin — only self-delete is blocked. This re-fetches the full
 * (unpaginated) list to count active admins, purely to disable that
 * footgun in the UI; a failure here degrades to "guard off" rather than
 * failing the whole page, since it's advisory only.
 */
async function isSoleActiveAdmin(user: AdminUser): Promise<boolean> {
  if (user.role !== "admin" || !user.isActive) return false;
  const result = await listUsers();
  if (!result.ok) return false;
  const activeAdminCount = result.data.filter((u) => u.role === "admin" && u.isActive).length;
  return activeAdminCount <= 1;
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getUser(id);
  return { title: result.ok ? `${result.data.name} — Mandana Admin` : "Pengguna — Mandana Admin" };
}

export default async function UserDetailPage({ params }: { params: Promise<Params> }) {
  const me = await getCurrentUser();
  const { id } = await params;
  const user = await loadUser(id);
  const isLastActiveAdmin = await isSoleActiveAdmin(user);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/users"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar pengguna
      </Link>

      <UserDetailView user={user} currentUserId={me.id} isLastActiveAdmin={isLastActiveAdmin} />
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat detail pengguna.";
}
