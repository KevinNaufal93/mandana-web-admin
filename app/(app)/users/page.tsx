import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listUsers } from "@/lib/api/users";
import { UsersTable } from "@/components/users/users-table";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "User Management — Mandana Admin" };

export default async function UsersPage() {
  const me = await getCurrentUser();
  const result = await listUsers();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-primary">User Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola akun admin dan editor yang dapat masuk ke panel ini.
          </p>
        </div>
        <Button variant="secondary" asChild>
          <Link href="/users/new">
            <Plus className="size-4" />
            Tambah pengguna
          </Link>
        </Button>
      </div>

      {!result.ok ? (
        <ErrorPanel message={errorMessage(result.error)} />
      ) : (
        <UsersTable rows={result.data} currentUserId={me.id} />
      )}
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat daftar pengguna.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}
