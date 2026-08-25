import { redirect } from "next/navigation";

// No getCurrentUser() here, unlike every other (app) page: this route
// renders nothing and reads nothing — the redirect target enforces the
// render-time security boundary itself.
export default function EventSupportIndexPage() {
  redirect("/event-support/items");
}
