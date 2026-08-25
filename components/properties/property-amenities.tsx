import { amenityIcon } from "@/lib/properties/amenity-icons";
import type { AdminPropertyAmenity } from "@/lib/api/properties";

export function PropertyAmenities({ amenities }: { amenities: AdminPropertyAmenity[] }) {
  if (amenities.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada fasilitas ditambahkan.</p>;
  }

  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {amenities.map((a) => {
        const Icon = amenityIcon(a.icon);
        return (
          <li
            key={a.id}
            className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-primary"
          >
            <Icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{a.name}</span>
          </li>
        );
      })}
    </ul>
  );
}
