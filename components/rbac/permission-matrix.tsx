"use client";

import { useMemo, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { updateRolePermissionsAction } from "@/app/actions/rbac";
import type { AccessModuleInfo, RolePermissions } from "@/lib/api/rbac";
import type { AccessModule } from "@/lib/rbac/modules";
import type { UserRole } from "@/lib/users/roles";

const ROLE_LABEL: Partial<Record<UserRole, string>> = { admin: "Admin", editor: "Editor" };

/** One editable role's working set of grantable modules, keyed by role. */
type Draft = Record<string, Set<AccessModule>>;

function grantableSelection(entry: RolePermissions, modules: AccessModuleInfo[]): Set<AccessModule> {
  const grantableKeys = new Set(modules.filter((m) => m.grantable).map((m) => m.key));
  return new Set(entry.modules.filter((m) => grantableKeys.has(m)));
}

function sameSet(a: Set<AccessModule>, b: Set<AccessModule>): boolean {
  return a.size === b.size && [...a].every((m) => b.has(m));
}

/** Added/removed relative to `committed` — the shape both the always-visible
 *  diff line and the revoke-confirmation copy are built from. */
function roleDiff(committed: Set<AccessModule>, draft: Set<AccessModule>) {
  return {
    added: [...draft].filter((m) => !committed.has(m)),
    removed: [...committed].filter((m) => !draft.has(m)),
  };
}

function moduleLabel(modules: AccessModuleInfo[], key: AccessModule): string {
  return modules.find((m) => m.key === key)?.label ?? key;
}

/**
 * Rows are modules (catalog order), columns are roles. A cell means one of
 * three different things depending on (module, role), and each is rendered
 * differently so "unchecked" never gets confused with "cannot be granted":
 *
 *   - admin column, or the alwaysOn 'dashboard' row — a static check mark.
 *     Always true, never a decision: RbacService computes admin's set in
 *     code, and there is no `admin` row in role_module_permissions at all.
 *   - a non-grantable module (users/notifications/rbac) for any other
 *     role — an em dash. The API rejects this with 400 regardless of what
 *     the UI shows, so a *disabled unchecked box* here would lie about
 *     what's actually possible.
 *   - everything else — a real, interactive <Checkbox>.
 *
 * Today that last case is exactly the editor column's 5 grantable modules
 * (see PermissionCell), but nothing here assumes there is exactly one
 * editable role.
 */
export function PermissionMatrix({
  modules,
  initialMatrix,
}: {
  modules: AccessModuleInfo[];
  initialMatrix: RolePermissions[];
}) {
  const baseline = useMemo<Draft>(
    () => Object.fromEntries(initialMatrix.map((r) => [r.role, grantableSelection(r, modules)])),
    [initialMatrix, modules],
  );
  const [draft, setDraft] = useState<Draft>(baseline);
  const [committed, setCommitted] = useState<Draft>(baseline);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const { confirm, dialog } = useConfirmDialog();

  const grantableCount = modules.filter((m) => m.grantable).length;

  const dirty = initialMatrix.some(
    (r) => !r.locked && !sameSet(draft[r.role] ?? new Set(), committed[r.role] ?? new Set()),
  );

  const diffLines = initialMatrix
    .filter((r) => !r.locked)
    .flatMap((r) => {
      const { added, removed } = roleDiff(committed[r.role] ?? new Set(), draft[r.role] ?? new Set());
      if (added.length === 0 && removed.length === 0) return [];
      const roleLabel = ROLE_LABEL[r.role as UserRole] ?? r.role;
      const signed = [
        ...added.map((m) => `+${moduleLabel(modules, m)}`),
        ...removed.map((m) => `−${moduleLabel(modules, m)}`),
      ];
      return [{ role: r.role, text: `${roleLabel}: ${signed.join(", ")}` }];
    });

  function toggle(role: string, moduleKey: AccessModule) {
    setSaved(false);
    setDraft((prev) => {
      const next = new Set(prev[role] ?? []);
      if (next.has(moduleKey)) next.delete(moduleKey);
      else next.add(moduleKey);
      return { ...prev, [role]: next };
    });
  }

  async function handleSave() {
    setError(null);
    setSaved(false);

    const changed = initialMatrix.filter(
      (r) => !r.locked && !sameSet(draft[r.role] ?? new Set(), committed[r.role] ?? new Set()),
    );
    if (changed.length === 0) return;

    // Confirm only when a change would take something away — pure grants
    // save with no friction, and friction on this screen should scale
    // with consequence, not with "any edit at all".
    const revocations = changed
      .map((r) => ({
        role: r.role,
        roleLabel: ROLE_LABEL[r.role as UserRole] ?? r.role,
        removed: roleDiff(committed[r.role] ?? new Set(), draft[r.role] ?? new Set()).removed,
      }))
      .filter((r) => r.removed.length > 0);

    if (revocations.length > 0) {
      const ok = await confirm({
        title:
          revocations.length === 1 ? `Cabut akses ${revocations[0].roleLabel}?` : "Cabut sebagian akses?",
        description: (
          <div className="flex flex-col gap-1 text-left">
            {revocations.map((r) => (
              <p key={r.role}>
                <span className="font-medium text-primary">{r.roleLabel}:</span>{" "}
                {r.removed.map((m) => moduleLabel(modules, m)).join(", ")}
              </p>
            ))}
          </div>
        ),
        confirmLabel: "Cabut & simpan",
        variant: "destructive",
      });
      if (!ok) return;
    }

    // Sequential, not Promise.all: Next.js dispatches Server Actions one
    // at a time per client, so parallelizing from the client doesn't
    // actually run concurrently — see docs/app/guides/server-actions.
    // Committing each role right after its own call succeeds means a
    // failure on one role doesn't discard a success already saved on
    // another.
    startTransition(async () => {
      const errors: string[] = [];
      for (const r of changed) {
        const roleLabel = ROLE_LABEL[r.role as UserRole] ?? r.role;
        const roleModules = [...(draft[r.role] ?? new Set())];
        const result = await updateRolePermissionsAction(r.role as UserRole, roleModules);
        if (!result.ok) {
          errors.push(`${roleLabel}: ${result.error}`);
          continue;
        }
        setCommitted((prev) => ({ ...prev, [r.role]: new Set(roleModules) }));
      }

      if (errors.length > 0) {
        setError(errors.join(" "));
        return;
      }
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    });
  }

  function handleReset() {
    setDraft(committed);
    setError(null);
    setSaved(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <Table className="min-w-130">
        <caption className="sr-only">
          Hak akses modul per peran. Admin memiliki akses penuh dan tidak dapat diubah.
        </caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Modul</TableHead>
            {initialMatrix.map((r) => {
              const roleLabel = ROLE_LABEL[r.role as UserRole] ?? r.role;
              return (
                <TableHead key={r.role} scope="col" className="w-28 text-center">
                  <span className="block">{roleLabel}</span>
                  <span className="mt-0.5 block text-xs font-normal normal-case tracking-normal text-muted-foreground">
                    {r.locked ? "Akses penuh" : `${(draft[r.role] ?? new Set()).size} / ${grantableCount} modul`}
                  </span>
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {modules.map((mod) => (
            <TableRow key={mod.key}>
              <th scope="row" className="px-4 py-3 text-left align-middle">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-primary">{mod.label}</span>
                  {mod.alwaysOn && <Badge variant="outline">Selalu aktif</Badge>}
                  {!mod.grantable && !mod.alwaysOn && <Badge variant="outline">Hanya admin</Badge>}
                </div>
                <p className="text-pretty text-xs text-muted-foreground">{mod.description}</p>
              </th>
              {initialMatrix.map((r) => {
                const roleLabel = ROLE_LABEL[r.role as UserRole] ?? r.role;
                return (
                  <TableCell key={r.role} className="p-0 text-center">
                    <PermissionCell
                      mod={mod}
                      entry={r}
                      roleLabel={roleLabel}
                      checked={(draft[r.role] ?? new Set()).has(mod.key)}
                      onToggle={() => toggle(r.role, mod.key)}
                      pending={pending}
                    />
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {diffLines.length > 0 && (
        // Borrows detail-card.tsx's "readonly" tone (border-border/60 +
        // bg-muted/40) for a neutral preview panel — not an error, not a
        // success, just "here is exactly what Simpan is about to do".
        <div role="status" aria-live="polite" className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm text-primary">
          {diffLines.map((line) => (
            <p key={line.role}>{line.text}</p>
          ))}
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}
      {saved && !dirty && (
        <p role="status" className="text-sm text-primary">
          Perubahan hak akses disimpan.
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleSave} disabled={!dirty || pending}>
          {pending ? "Menyimpan..." : "Simpan perubahan"}
        </Button>
        <Button variant="outlineSecondary" onClick={handleReset} disabled={!dirty || pending}>
          Batal
        </Button>
      </div>

      {dialog}
    </div>
  );
}

/**
 * The three cell states from the component doc comment above, each sized
 * to a uniform h-11 (44px) target regardless of which one renders, so the
 * table's row height doesn't jump between an editable row and a locked
 * one. Only the interactive case gets a <label> — the other two are
 * informational, not controls, and shouldn't imply they're clickable.
 */
function PermissionCell({
  mod,
  entry,
  roleLabel,
  checked,
  onToggle,
  pending,
}: {
  mod: AccessModuleInfo;
  entry: RolePermissions;
  roleLabel: string;
  checked: boolean;
  onToggle: () => void;
  pending: boolean;
}) {
  if (entry.locked || mod.alwaysOn) {
    const reason = entry.locked ? "Akses penuh" : "Selalu aktif";
    return (
      <div className="flex h-11 items-center justify-center">
        <Check className="size-4 text-muted-foreground" aria-hidden="true" />
        <span className="sr-only">{`${mod.label} — ${roleLabel}: ${reason}`}</span>
      </div>
    );
  }

  if (!mod.grantable) {
    return (
      <div className="flex h-11 items-center justify-center">
        <span aria-hidden="true" className="text-sm text-muted-foreground/50">
          —
        </span>
        <span className="sr-only">{`${mod.label} — ${roleLabel}: tidak dapat diberikan`}</span>
      </div>
    );
  }

  return (
    <label className="flex h-11 w-full cursor-pointer items-center justify-center">
      <Checkbox checked={checked} disabled={pending} onChange={onToggle} aria-label={`${mod.label} — ${roleLabel}`} />
    </label>
  );
}
