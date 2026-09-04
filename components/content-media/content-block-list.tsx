import { ContentBlockPreview } from "@/components/content-media/content-block-preview";
import { ContentBlockRowActions } from "@/components/content-media/content-block-row-actions";
import { ListingTypeBadge } from "@/components/properties/property-status-badge";
import type { AdminContentBlock } from "@/lib/api/content-blocks";
import type { ContentBlockTypeDef } from "@/lib/content-blocks/types";

const LAYOUT_CLASS: Record<ContentBlockTypeDef["layout"], string> = {
  stack: "flex flex-col gap-4",
  grid: "grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
  // Narrower columns than the service-card grid — a promo card is sized
  // for the property-detail sidebar (see content-block-preview.tsx's
  // max-w-[380px]), not a full-width strip.
  sidebar: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
};

/** Admin-only chrome, not part of the visitor-facing preview — which
 *  listing type(s) a promo card targets. Kept out of <ContentBlockPreview>
 *  on purpose (see that component's header comment: it renders only what
 *  a visitor would see). */
function ScopeCaption({ scope }: { scope: AdminContentBlock["listingTypeScope"] }) {
  if (!scope || scope.length === 0) {
    return <p className="text-xs text-muted-foreground">Semua tipe listing</p>;
  }
  return (
    <div className="flex flex-wrap gap-1">
      {scope.map((listingType) => (
        <ListingTypeBadge key={listingType} listingType={listingType} />
      ))}
    </div>
  );
}

/**
 * This module's list IS the preview — there is no separate table. Stack
 * layout (hero) renders a vertical carousel-order list; grid layout
 * (service cards) renders the same sm:grid-cols-2 lg:grid-cols-4 strip
 * the public homepage uses, matching the screenshot in the integration
 * doc; sidebar layout (promo cards) renders a narrower grid sized for the
 * property-detail sidebar. Server Component, same as
 * storage-unit-types-table.tsx — no fetching or hooks here, so it
 * composes fine under the (server) list page.
 */
export function ContentBlockList({ typeDef, rows }: { typeDef: ContentBlockTypeDef; rows: AdminContentBlock[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Belum ada {typeDef.label.toLowerCase()}. Yang ditambahkan akan tampil di sini.
      </div>
    );
  }

  return (
    <div className={LAYOUT_CLASS[typeDef.layout]}>
      {rows.map((block, index) => (
        <div key={block.id} className="flex flex-col gap-2">
          <ContentBlockPreview
            typeDef={typeDef}
            data={{
              title: block.title,
              subtitle: block.subtitle,
              ctaText: block.ctaText,
              isActive: block.isActive,
              imageOnly: block.imageOnly,
              image: block.image ? { url: block.image.url, alt: block.image.alt } : null,
            }}
          />
          {typeDef.supportsListingTypeScope && <ScopeCaption scope={block.listingTypeScope} />}
          <ContentBlockRowActions
            block={block}
            type={typeDef.type}
            slug={typeDef.slug}
            isFirst={index === 0}
            isLast={index === rows.length - 1}
          />
        </div>
      ))}
    </div>
  );
}
