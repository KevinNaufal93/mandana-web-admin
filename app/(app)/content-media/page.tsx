import { redirect } from "next/navigation";
import { CONTENT_BLOCK_TYPES } from "@/lib/content-blocks/types";

// No getCurrentUser() here, unlike every other (app) page: this route
// renders nothing and reads nothing — the redirect target enforces the
// render-time security boundary itself. Copy of
// app/(app)/event-support/page.tsx's pattern.
export default function ContentMediaIndexPage() {
  redirect(`/content-media/${CONTENT_BLOCK_TYPES[0].slug}`);
}
