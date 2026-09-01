"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DetailCard, DetailRow } from "@/components/ui/detail-card";
import { UserForm } from "@/components/users/user-form";
import { UserPhotoCard } from "@/components/users/user-photo-card";
import { deleteUserAction } from "@/app/actions/users";
import { formatDateID } from "@/lib/format";
import type { AdminUser, UserRole } from "@/lib/api/users";

const ROLE_LABEL: Record<UserRole, string> = { admin: "Admin", editor: "Editor" };

export function UserDetailView({
  user: initialUser,
  currentUserId,
  isLastActiveAdmin,
}: {
  user: AdminUser;
  currentUserId: string;
  isLastActiveAdmin: boolean;
}) {
  const router = useRouter();
  const [user, setUser] = useState(initialUser);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [deletePending, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isSelf = user.id === currentUserId;

  function handleSaved(fresh: AdminUser) {
    setUser(fresh);
    setMode("view");
  }

  function handlePhotoSaved(fresh: AdminUser) {
    setUser(fresh);
  }

  function handleDelete() {
    if (!window.confirm(`Hapus pengguna "${user.name}"? Tindakan ini tidak dapat dibatalkan.`)) return;
    setDeleteError(null);
    startDeleteTransition(async () => {
      const result = await deleteUserAction(user.id);
      if (!result.ok) {
        setDeleteError(result.error);
        return;
      }
      router.push("/users");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold text-primary">
            {user.name}
            {isSelf && <Badge variant="outline">Anda</Badge>}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={user.role === "admin" ? "default" : "secondary"}>{ROLE_LABEL[user.role]}</Badge>
          <Badge variant={user.isActive ? "default" : "secondary"}>{user.isActive ? "Aktif" : "Nonaktif"}</Badge>
          {mode === "view" && (
            <Button variant="secondary" onClick={() => setMode("edit")}>
              <Pencil className="size-4" />
              Edit
            </Button>
          )}
        </div>
      </div>

      {deleteError && (
        <p role="alert" className="text-sm text-destructive">
          {deleteError}
        </p>
      )}

      {mode === "edit" ? (
        <UserForm
          mode="edit"
          user={user}
          currentUserId={currentUserId}
          isLastActiveAdmin={isLastActiveAdmin}
          onSaved={handleSaved}
          onCancel={() => setMode("view")}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            <DetailCard title="Profil agen">
              <DetailRow label="Jabatan" value={user.title ?? "-"} />
              <DetailRow label="Telepon" value={user.phone ?? "-"} />
              <DetailRow label="WhatsApp" value={user.whatsapp ?? "-"} />
              <p className="mt-2 text-xs text-muted-foreground">
                Ditampilkan pada kartu agen di halaman detail properti, bila akun ini ditetapkan sebagai agen.
              </p>
            </DetailCard>

            <UserPhotoCard user={user} onSaved={handlePhotoSaved} />
          </div>

          <div className="flex flex-col gap-6">
            <DetailCard title="Akun">
              <DetailRow label="Dibuat" value={formatDateID(user.createdAt)} />
              <DetailRow label="Diperbarui" value={formatDateID(user.updatedAt)} />
            </DetailCard>

            {!isSelf && (
              <div className="rounded-lg border border-destructive/30 p-4">
                <h2 className="text-sm font-semibold text-destructive">Hapus pengguna</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Penghapusan bersifat permanen. Bila akun ini ditetapkan sebagai agen properti, kartu agen pada
                  listing terkait akan hilang -- tidak ada peringatan dari server untuk kasus ini.
                </p>
                <Button
                  variant="outlineSecondary"
                  className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={handleDelete}
                  disabled={deletePending}
                >
                  <Trash2 className="size-4" />
                  {deletePending ? "Menghapus..." : "Hapus pengguna"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
