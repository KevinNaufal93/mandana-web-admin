import { redirect } from "next/navigation";

// No getCurrentUser() here, unlike every other (app) page: this route
// renders nothing and reads nothing — the redirect target enforces the
// render-time security boundary itself. Copy of
// app/(app)/event-support/page.tsx's pattern.
export default function ArticlesIndexPage() {
  redirect("/articles/posts");
}
