import type { PropertyStatus, ListingType } from "@/lib/properties/query";
import type { AdminPropertyDetail, AdminPropertyUpdateInput, CreatePropertyInput, ConstructionStatus } from "@/lib/api/properties";

/** Radix Select reserves the empty string for "no value", and a plain
 *  HTML select needs *some* value to represent "nothing chosen" — so
 *  every optional lookup field (category, construction status) uses this
 *  same sentinel rather than the empty string. Shared here so the create
 *  form, the edit form, and both drafts hooks agree on one spelling. */
export const NONE = "none";

/**
 * The one field-state shape shared by the property create form and the
 * property detail page's edit mode — every value held as a string (even
 * numbers/dates), coerced at submit time, matching the house form
 * convention (see lib/auth/login-form.ts: no zod, no react-hook-form).
 */
export interface DraftFields {
  title: string;
  description: string;
  listingType: ListingType;
  status: PropertyStatus;
  /** Only meaningful (and only sent) while listingType is "new". */
  handoverDate: string;
  /** NONE sentinel, or "ready" | "under_construction". Only meaningful
   *  (and only sent) while listingType is "new". */
  constructionStatus: string;
  price: string;
  currency: string;
  bedrooms: string;
  bathrooms: string;
  areaSqm: string;
  address: string;
  area: string;
  city: string;
  province: string;
  latitude: string;
  longitude: string;
  isFeatured: boolean;
  propertyTypeId: string; // NONE sentinel, or a real id
  agentId: string; // NONE sentinel, or a real user id
  amenityIds: Set<string>;
}

/** Starting point for the create form: the server's own defaults
 *  (sale/draft/IDR/not featured), agent left unset (server defaults it
 *  to the creating admin). */
export function emptyDraftFields(): DraftFields {
  return {
    title: "",
    description: "",
    listingType: "sale",
    status: "draft",
    handoverDate: "",
    constructionStatus: NONE,
    price: "",
    currency: "IDR",
    bedrooms: "",
    bathrooms: "",
    areaSqm: "",
    address: "",
    area: "",
    city: "",
    province: "",
    latitude: "",
    longitude: "",
    isFeatured: false,
    propertyTypeId: NONE,
    agentId: NONE,
    amenityIds: new Set(),
  };
}

export function fieldsFromProperty(property: AdminPropertyDetail): DraftFields {
  return {
    title: property.title,
    description: property.description ?? "",
    listingType: property.listingType,
    status: property.status,
    handoverDate: property.handoverDate ?? "",
    constructionStatus: property.constructionStatus ?? NONE,
    price: property.price !== null ? String(property.price) : "",
    currency: property.currency,
    bedrooms: property.bedrooms !== null ? String(property.bedrooms) : "",
    bathrooms: property.bathrooms !== null ? String(property.bathrooms) : "",
    areaSqm: property.areaSqm !== null ? String(property.areaSqm) : "",
    address: property.address ?? "",
    area: property.area ?? "",
    city: property.city ?? "",
    province: property.province ?? "",
    latitude: property.latitude !== null ? String(property.latitude) : "",
    longitude: property.longitude !== null ? String(property.longitude) : "",
    isFeatured: property.isFeatured,
    propertyTypeId: property.propertyType?.id ?? NONE,
    agentId: property.agent?.id ?? NONE,
    amenityIds: new Set(property.amenities.map((a) => a.id)),
  };
}

export function toNullableNumber(v: string): number | null {
  return v.trim() === "" ? null : Number(v);
}

function toOptionalNumber(v: string): number | undefined {
  return v.trim() === "" ? undefined : Number(v);
}

export function validateFields(fields: DraftFields): string | null {
  if (fields.title.trim().length < 2) return "Judul minimal 2 karakter.";
  const priceNumber = Number(fields.price);
  if (fields.price.trim() === "" || Number.isNaN(priceNumber) || priceNumber < 0) {
    return "Harga wajib diisi dengan angka yang valid.";
  }
  return null;
}

export function isFieldsDirty(fields: DraftFields, baseline: DraftFields): boolean {
  if (
    fields.title !== baseline.title ||
    fields.description !== baseline.description ||
    fields.listingType !== baseline.listingType ||
    fields.status !== baseline.status ||
    fields.handoverDate !== baseline.handoverDate ||
    fields.constructionStatus !== baseline.constructionStatus ||
    fields.price !== baseline.price ||
    fields.currency !== baseline.currency ||
    fields.bedrooms !== baseline.bedrooms ||
    fields.bathrooms !== baseline.bathrooms ||
    fields.areaSqm !== baseline.areaSqm ||
    fields.address !== baseline.address ||
    fields.area !== baseline.area ||
    fields.city !== baseline.city ||
    fields.province !== baseline.province ||
    fields.latitude !== baseline.latitude ||
    fields.longitude !== baseline.longitude ||
    fields.isFeatured !== baseline.isFeatured ||
    fields.propertyTypeId !== baseline.propertyTypeId ||
    fields.agentId !== baseline.agentId
  ) {
    return true;
  }
  if (fields.amenityIds.size !== baseline.amenityIds.size) return true;
  for (const id of fields.amenityIds) if (!baseline.amenityIds.has(id)) return true;
  return false;
}

/** handoverDate/constructionStatus are the one place these fields differ
 *  between create and update: the server 400s (assertNewOnlyFields) if
 *  either is sent while the effective listingType isn't "new", so both
 *  builders below omit the keys entirely outside that case rather than
 *  send empty/null. */
function newOnlyFields(fields: DraftFields): Pick<AdminPropertyUpdateInput, "handoverDate" | "constructionStatus"> {
  if (fields.listingType !== "new") return {};
  return {
    ...(fields.handoverDate.trim() && { handoverDate: fields.handoverDate.trim() }),
    ...(fields.constructionStatus !== NONE && {
      constructionStatus: fields.constructionStatus as ConstructionStatus,
    }),
  };
}

export function buildUpdatePatch(fields: DraftFields): AdminPropertyUpdateInput {
  return {
    title: fields.title.trim(),
    description: fields.description || null,
    listingType: fields.listingType,
    ...newOnlyFields(fields),
    status: fields.status,
    price: Number(fields.price),
    currency: fields.currency.trim() || "IDR",
    bedrooms: toNullableNumber(fields.bedrooms),
    bathrooms: toNullableNumber(fields.bathrooms),
    areaSqm: toNullableNumber(fields.areaSqm),
    address: fields.address.trim() || null,
    area: fields.area.trim() || null,
    city: fields.city.trim() || null,
    province: fields.province.trim() || null,
    latitude: toNullableNumber(fields.latitude),
    longitude: toNullableNumber(fields.longitude),
    isFeatured: fields.isFeatured,
    propertyTypeId: fields.propertyTypeId === NONE ? null : fields.propertyTypeId,
    agentId: fields.agentId === NONE ? undefined : fields.agentId,
    amenityIds: [...fields.amenityIds],
  };
}

export function buildCreateInput(fields: DraftFields): CreatePropertyInput {
  return {
    title: fields.title.trim(),
    price: Number(fields.price),
    description: fields.description || undefined,
    listingType: fields.listingType,
    ...(fields.listingType === "new" && {
      handoverDate: fields.handoverDate.trim() || undefined,
      constructionStatus:
        fields.constructionStatus === NONE ? undefined : (fields.constructionStatus as ConstructionStatus),
    }),
    status: fields.status,
    currency: fields.currency.trim() || "IDR",
    bedrooms: toOptionalNumber(fields.bedrooms),
    bathrooms: toOptionalNumber(fields.bathrooms),
    areaSqm: toOptionalNumber(fields.areaSqm),
    address: fields.address.trim() || undefined,
    area: fields.area.trim() || undefined,
    city: fields.city.trim() || undefined,
    province: fields.province.trim() || undefined,
    latitude: toOptionalNumber(fields.latitude),
    longitude: toOptionalNumber(fields.longitude),
    isFeatured: fields.isFeatured,
    propertyTypeId: fields.propertyTypeId === NONE ? undefined : fields.propertyTypeId,
    agentId: fields.agentId === NONE ? undefined : fields.agentId,
    amenityIds: fields.amenityIds.size > 0 ? [...fields.amenityIds] : undefined,
  };
}
