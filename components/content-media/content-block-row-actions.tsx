"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowUp, ArrowDown, Eye, EyeOff, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { moveContentBlockAction, toggleContentBlockActiveAction } from "@/app/actions/content-blocks";
import type { AdminContentBlock } from "@/lib/api/content-blocks";

/**
 * Quick actions from the list row: reorder, publish/unpublish, edit.
 * Delete lives on the edit form instead (its danger-zone block) — there
 * is no separate detail-view component in this module to host it, see
 * content-block-form.tsx's header comment.
 */
export function ContentBlockRowActions({
  block,
  type,
  slug,
  isFirst,
  isLast,
}: {
  block: AdminContentBlock;
  type: "hero" | "service_card";
  slug: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function move(direction: "up" | "down") {
    setError(null);
    startTransition(async () => {
      const result = await moveContentBlockAction(type, block.id, direction);
      if (!result.ok) setError(result.error);
    });
  }

  function toggleActive() {
    setError(null);
    startTransition(async () => {
      const result = await toggleContentBlockActiveAction(block.id, !block.isActive);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => move("up")}
          disabled={pending || isFirst}
          aria-label="Naikkan urutan"
        >
          <ArrowUp className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => move("down")}
          disabled={pending || isLast}
          aria-label="Turunkan urutan"
        >
          <ArrowDown className="size-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={toggleActive}
          disabled={pending}
          aria-label={block.isActive ? "Nonaktifkan" : "Aktifkan"}
          title={block.isActive ? "Nonaktifkan" : "Aktifkan"}
        >
          {block.isActive ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
        <Button variant="outlineSecondary" size="sm" asChild>
          <Link href={`/content-media/${slug}/${block.id}`}>
            <Pencil className="size-3.5" />
            Edit
          </Link>
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
