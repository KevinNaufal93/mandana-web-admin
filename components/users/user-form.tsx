"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DetailRow } from "@/components/ui/detail-card";
import { createUserAction, updateUserAction } from "@/app/actions/users";
import type { AdminUser, CreateUserInput, UpdateUserInput } from "@/lib/api/users";
import { USER_ROLES, type UserRole } from "@/lib/users/roles";

const ROLE_LABEL: Record<UserRole, string> = { admin: "Admin", editor: "Editor" };

function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

type UserFormProps =
  | { mode: "create" }
  | {
      mode: "edit";
      user: AdminUser;
      currentUserId: string;
      isLastActiveAdmin: boolean;
      onSaved: (fresh: AdminUser) => void;
      onCancel: () => void;
    };

/**
 * One component for create and edit, same pattern as
 * StorageUnitTypeForm. Two structural differences from that template,
 * both driven by the backend contract in lib/api/users.ts:
 *
 *  - `email` only renders as an input in create mode. UpdateUserDto does
 *    not whitelist it -- sending it in a PATCH is a 400 -- so edit mode
 *    renders it as a read-only DetailRow that can never enter the patch
 *    object, rather than a disabled input a future edit could "un-disable"
 *    into a bug.
 *  - Password is optional in edit mode and omitted from the patch
 *    entirely when left blank, rather than always sent.
 */
export function UserForm(props: UserFormProps) {
  const router = useRouter();
  const user = props.mode === "edit" ? props.user : null;
  const isSelf = props.mode === "edit" && props.user.id === props.currentUserId;
  const roleLocked = props.mode === "edit" && (isSelf || props.isLastActiveAdmin);

  const [email, setEmail] = useState("");
  const [name, setName] = useState(user?.name ?? "");
  const [role, setRole] = useState<UserRole>(user?.role ?? "editor");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [title, setTitle] = useState(user?.title ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(user?.whatsapp ?? "");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);

    if (props.mode === "create" && (!email.trim() || !email.includes("@"))) {
      setError("Masukkan alamat email yang valid.");
      return;
    }
    if (name.trim().length < 2 || name.trim().length > 255) {
      setError("Nama harus 2-255 karakter.");
      return;
    }
    if (props.mode === "create") {
      if (password.length < 8 || password.length > 128) {
        setError("Password harus 8-128 karakter.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Konfirmasi password tidak cocok.");
        return;
      }
    } else if (password.trim() !== "") {
      if (password.length < 8 || password.length > 128) {
        setError("Password baru harus 8-128 karakter.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Konfirmasi password tidak cocok.");
        return;
      }
    }
    if (title.trim().length > 100) {
      setError("Jabatan maksimal 100 karakter.");
      return;
    }
    if (phone.trim().length > 30) {
      setError("Nomor telepon maksimal 30 karakter.");
      return;
    }
    if (whatsapp.trim().length > 30) {
      setError("Nomor WhatsApp maksimal 30 karakter.");
      return;
    }

    startTransition(async () => {
      if (props.mode === "edit") {
        const patch: UpdateUserInput = {
          name: name.trim(),
          role: roleLocked ? undefined : role,
          isActive: isSelf ? undefined : isActive,
          password: password.trim() !== "" ? password : undefined,
          title: title.trim() || undefined,
          phone: phone.trim() || undefined,
          whatsapp: whatsapp.trim() || undefined,
        };
        const result = await updateUserAction(props.user.id, patch);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        props.onSaved(result.data);
        return;
      }

      const input: CreateUserInput = {
        email: email.trim(),
        name: name.trim(),
        password,
        role,
        title: title.trim() || undefined,
        phone: phone.trim() || undefined,
        whatsapp: whatsapp.trim() || undefined,
      };
      const result = await createUserAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/users/${result.data.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-primary">Akun</h3>

            {props.mode === "create" ? (
              <Field label="Email" htmlFor="user-email">
                <Input
                  id="user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={pending}
                />
              </Field>
            ) : (
              <DetailRow label="Email" value={props.user.email} />
            )}

            <Field label="Nama" htmlFor="user-name">
              <Input id="user-name" value={name} onChange={(e) => setName(e.target.value)} disabled={pending} />
            </Field>

            <Field
              label="Peran"
              htmlFor="user-role"
              hint={
                roleLocked
                  ? isSelf
                    ? "Anda tidak dapat mengubah peran akun Anda sendiri."
                    : "Ini satu-satunya admin aktif. Buat admin lain sebelum mengubah akun ini."
                  : undefined
              }
            >
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)} disabled={pending || roleLocked}>
                <SelectTrigger id="user-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {props.mode === "edit" && (
              <label className="mt-1 flex items-center gap-2 text-sm text-primary">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={pending || isSelf}
                />
                Aktif
              </label>
            )}
            {isSelf && (
              <p className="text-xs text-muted-foreground">
                Menonaktifkan akun Anda sendiri akan mengakhiri sesi Anda saat ini.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
            <h3 className="text-sm font-semibold text-primary">
              {props.mode === "create" ? "Password" : "Ganti password"}
            </h3>
            <Field
              label={props.mode === "create" ? "Password" : "Password baru (kosongkan bila tidak diubah)"}
              htmlFor="user-password"
            >
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={pending}
              />
            </Field>
            <Field label="Konfirmasi password" htmlFor="user-password-confirm">
              <Input
                id="user-password-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={pending}
              />
            </Field>
            <p className="text-xs text-muted-foreground">
              Mengganti password tidak mengakhiri sesi yang sedang berjalan.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <h3 className="text-sm font-semibold text-primary">Profil agen</h3>
          <p className="text-xs text-muted-foreground">Ditampilkan pada kartu agen di halaman detail properti.</p>
          <Field label="Jabatan (opsional)" htmlFor="user-title">
            <Input
              id="user-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Agen Independen"
              disabled={pending}
            />
          </Field>
          <Field label="Telepon (opsional)" htmlFor="user-phone">
            <Input id="user-phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={pending} />
          </Field>
          <Field label="WhatsApp (opsional)" htmlFor="user-whatsapp">
            <Input id="user-whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} disabled={pending} />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {props.mode === "edit" ? (pending ? "Menyimpan..." : "Simpan perubahan") : pending ? "Membuat..." : "Buat pengguna"}
        </Button>
        <Button
          variant="outlineSecondary"
          onClick={() => (props.mode === "edit" ? props.onCancel() : router.push("/users"))}
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    </div>
  );
}
