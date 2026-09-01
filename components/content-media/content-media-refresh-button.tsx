"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Every POST/PATCH/DELETE on /admin/content-blocks is already live on the
 * public site by the time its response comes back — the API busts the
 * homepage's Redis cache server-side, in the same request as the write
 * (see docs/web-admin-integration-guide.md §5). There is no publish step
 * for a button in this admin panel to trigger, so this one makes no
 * request at all: it is a plain client-side refresh of this screen's own
 * data — useful after a teammate's concurrent edit, without a manual
 * page reload. Formerly wired to POST /admin/homepage/cache/bust as a
 * "make my edits show up now" action, which the integration guide
 * flagged as implying a staged-draft workflow that does not exist here.
 */
export function ContentMediaRefreshButton() {
  const router = useRouter();
  const [justRefreshed, setJustRefreshed] = useState(false);

  function handleClick() {
    router.refresh();
    setJustRefreshed(true);
    setTimeout(() => setJustRefreshed(false), 2000);
  }

  return (
    <div className="flex items-center gap-3">
      {justRefreshed && <p className="text-sm text-muted-foreground">Diperbarui.</p>}
      <Button variant="outlineSecondary" onClick={handleClick}>
        <RefreshCw className="size-4" />
        Segarkan
      </Button>
    </div>
  );
}
