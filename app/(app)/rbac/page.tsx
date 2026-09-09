import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/dal";
import { getAccessModules, getRbacMatrix } from "@/lib/api/rbac";
import { PermissionMatrix } from "@/components/rbac/permission-matrix";
import type { ApiError } from "@/lib/api/errors";

export const metadata: Metadata = { title: "Roles & Permissions — Mandana Admin" };

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat hak akses.";
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
      {message}
    </div>
  );
}

/**
 * Admin-only, hard-role-gated (requireAdmin(), mirroring the API's own
 * @Roles(UserRole.ADMIN) on RbacController) rather than RBAC-grantable —
 * this page manages the very matrix that would otherwise have to grant
 * access to itself.
 */
export default async function RbacPage() {
  await requireAdmin();
  const modulesResult = await getAccessModules();
  const matrixResult = await getRbacMatrix();

  let body: React.ReactNode;
  if (!modulesResult.ok) {
    body = <ErrorPanel message={errorMessage(modulesResult.error)} />;
  } else if (!matrixResult.ok) {
    body = <ErrorPanel message={errorMessage(matrixResult.error)} />;
  } else {
    body = <PermissionMatrix modules={modulesResult.data} initialMatrix={matrixResult.data} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-primary">Roles & Permissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atur modul yang dapat diakses oleh setiap peran. Admin selalu memiliki akses penuh.
        </p>
      </div>
      {body}
    </div>
  );
}
