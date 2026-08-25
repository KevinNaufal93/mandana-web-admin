import {
  Wind,
  Waves,
  ShieldCheck,
  Video,
  Baby,
  Dumbbell,
  DoorOpen,
  Sofa,
  Microwave,
  Droplets,
  Car,
  Trees,
  Check,
  type LucideIcon,
} from "lucide-react";

/**
 * Ported from mandana-web/lib/amenity-icons.ts (separate repo — copied,
 * not imported). Maps the API's amenity `icon` key (GET /amenities) to a
 * lucide-react icon; the API only serves the key, not an asset. Unknown
 * keys (future amenities added server-side) fall back to `Check`.
 */
const ICONS: Record<string, LucideIcon> = {
  gym: Dumbbell,
  pool: Waves,
  security: ShieldCheck,
  cctv: Video,
  playground: Baby,
  ac: Wind,
  balcony: DoorOpen,
  furniture: Sofa,
  oven: Microwave,
  "water-heater": Droplets,
  carport: Car,
  park: Trees,
};

export function amenityIcon(icon: string | null): LucideIcon {
  return (icon && ICONS[icon]) || Check;
}
