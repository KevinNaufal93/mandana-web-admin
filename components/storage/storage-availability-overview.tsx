import Link from "next/link";
import { Warehouse } from "lucide-react";
import { DetailCard } from "@/components/ui/detail-card";
import { formatIDRShort } from "@/lib/format";
import type { StorageAvailabilityFacility } from "@/lib/api/storage-availability";
import type { AdminStorageUnitType } from "@/lib/api/storage";

/**
 * Per-facility occupancy from the public availability snapshot. Unit-type
 * NAMES aren't on this DTO (only `unitTypeSlug`) — resolved against the
 * unit-types catalog the page fetched alongside it, same join pattern as
 * StorageInventoryTable.
 */
export function StorageAvailabilityOverview({
  facilities,
  unitTypes,
}: {
  facilities: StorageAvailabilityFacility[];
  unitTypes: AdminStorageUnitType[];
}) {
  if (facilities.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-dashed border-border p-8">
        <Warehouse className="size-8 text-muted-foreground" />
        <div>
          <h2 className="text-sm font-semibold text-primary">Belum ada fasilitas dengan unit</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat fasilitas, tipe unit, dan unit terlebih dahulu untuk melihat ketersediaan di sini.
          </p>
        </div>
        <Link href="/storage/facilities/new" className="text-sm font-medium text-primary underline">
          Buat fasilitas
        </Link>
      </div>
    );
  }

  const unitTypeBySlug = new Map(unitTypes.map((t) => [t.slug, t]));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {facilities.map((facility) => (
        <FacilityCard key={facility.facilitySlug} facility={facility} unitTypeBySlug={unitTypeBySlug} />
      ))}
    </div>
  );
}

function FacilityCard({
  facility,
  unitTypeBySlug,
}: {
  facility: StorageAvailabilityFacility;
  unitTypeBySlug: Map<string, AdminStorageUnitType>;
}) {
  const total = facility.units.reduce((sum, u) => sum + u.total, 0);
  const available = facility.units.reduce((sum, u) => sum + u.available, 0);

  return (
    <DetailCard title={facility.facilityName} action={<span className="text-xs text-muted-foreground">{total} unit</span>}>
      {facility.units.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada unit di fasilitas ini.</p>
      ) : (
        <>
          <OccupancyBar units={facility.units} />
          <p className="text-xs text-muted-foreground">{available} dari {total} unit tersedia</p>

          <div className="mt-2 flex flex-col gap-2">
            {facility.units.map((u) => {
              const unitType = unitTypeBySlug.get(u.unitTypeSlug);
              return (
                <div key={u.unitTypeSlug} className="flex items-center justify-between text-sm">
                  <span className="text-primary">{unitType?.name ?? u.unitTypeSlug}</span>
                  <span className="text-muted-foreground">
                    {u.available}/{u.total} tersedia · {formatIDRShort(u.monthlyRate)}/bln
                  </span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </DetailCard>
  );
}

function OccupancyBar({ units }: { units: StorageAvailabilityFacility["units"] }) {
  const available = units.reduce((sum, u) => sum + u.available, 0);
  const occupied = units.reduce((sum, u) => sum + u.occupied, 0);
  const maintenance = units.reduce((sum, u) => sum + u.maintenance, 0);
  const total = available + occupied + maintenance;
  if (total === 0) return null;

  return (
    <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted" role="img" aria-label={`${available} tersedia, ${occupied} terisi, ${maintenance} perawatan`}>
      <div className="h-full bg-primary" style={{ width: `${(available / total) * 100}%` }} />
      <div className="h-full bg-muted-foreground/60" style={{ width: `${(occupied / total) * 100}%` }} />
      <div className="h-full bg-accent" style={{ width: `${(maintenance / total) * 100}%` }} />
    </div>
  );
}
