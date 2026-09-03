import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { listPropertyTypes, listAmenities } from "@/lib/api/properties";
import { listUsers } from "@/lib/api/users";
import { PropertyCreateForm } from "@/components/properties/property-create-form";

export const metadata: Metadata = { title: "Properti Baru — Mandana Admin" };

// Every page under (app) opens with getCurrentUser() — the render-time
// security boundary; see app/(app)/page.tsx.
export default async function NewPropertyPage() {
  const currentUser = await getCurrentUser();

  // Every one of these is a supporting lookup list, not the page itself —
  // if any fails to load, the form still works with an empty picker
  // rather than taking the whole page down (same rationale as the detail
  // page's Promise.all).
  const [typesResult, amenitiesResult, usersResult] = await Promise.all([
    listPropertyTypes(),
    listAmenities(),
    listUsers(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/properties"
        className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-4" />
        Kembali ke daftar properti
      </Link>

      <h1 className="text-2xl font-semibold text-primary">Properti baru</h1>

      <PropertyCreateForm
        propertyTypes={typesResult.ok ? typesResult.data : []}
        amenities={amenitiesResult.ok ? amenitiesResult.data : []}
        agents={usersResult.ok ? usersResult.data : []}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
