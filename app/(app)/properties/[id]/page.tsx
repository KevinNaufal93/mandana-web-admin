import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { getAdminProperty, listPropertyTypes, listAmenities, type AdminPropertyDetail } from "@/lib/api/properties";
import { PropertyDetailView } from "@/components/properties/property-detail-view";
import type { ApiError } from "@/lib/api/errors";

type Params = { id: string };

/**
 * 404 covers both a real "not found" (id doesn't exist) and a malformed id
 * (ParseUUIDPipe 400s on a non-UUID) — either way there is no property
 * page to render. Every other failure (network, 401/403, 5xx) falls
 * through to error.tsx via the thrown Error below.
 */
async function loadProperty(id: string): Promise<AdminPropertyDetail> {
  const result = await getAdminProperty(id);
  if (result.ok) return result.data;
  if (result.error.kind === "notFound" || result.error.kind === "validation") notFound();
  throw new Error(errorMessage(result.error));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getAdminProperty(id);
  return { title: result.ok ? `${result.data.title} — Mandana Admin` : "Properti — Mandana Admin" };
}

// Every page under (app) opens with getCurrentUser() — the render-time
// security boundary; see app/(app)/page.tsx.
export default async function PropertyDetailPage({ params }: { params: Promise<Params> }) {
  await getCurrentUser();
  const { id } = await params;

  // The property is the page — a failure there 404s/throws. The edit
  // form's lookup lists (property types, amenities) are supporting data;
  // if either fails to load, the form still works with an empty picker
  // rather than taking the whole page down.
  const [property, typesResult, amenitiesResult] = await Promise.all([
    loadProperty(id),
    listPropertyTypes(),
    listAmenities(),
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

      <PropertyDetailView
        property={property}
        propertyTypes={typesResult.ok ? typesResult.data : []}
        amenities={amenitiesResult.ok ? amenitiesResult.data : []}
      />
    </div>
  );
}

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal memuat detail properti.";
}
