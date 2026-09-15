"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const TITLE_SOFT_LIMIT = 60;
const DESCRIPTION_SOFT_LIMIT = 155;

function CharCount({ value, limit }: { value: string; limit: number }) {
  const over = value.length > limit;
  return (
    <span className={cn("text-xs tabular-nums", over ? "text-amber-600" : "text-muted-foreground")}>
      {value.length}/{limit}
    </span>
  );
}

interface SeoFieldsProps {
  title: string;
  onTitleChange: (value: string) => void;
  /** Shown as the input's placeholder AND as what the preview renders
   *  when `title` is empty — the code-side default this field overrides. */
  titlePlaceholder: string;
  description: string;
  onDescriptionChange: (value: string) => void;
  descriptionPlaceholder: string;
  /** e.g. "mandana.id/layanan/moving" — the green breadcrumb line in the
   *  preview. No protocol, matches how Google actually renders it. */
  previewUrl: string;
  disabled?: boolean;
  idPrefix: string;
}

/**
 * Title + description inputs with character counters and a live "this is
 * how it looks on Google" preview — the one piece of UI every SEO-editable
 * form in this app shares (page-seo-form.tsx today; the plan is for the
 * article and property forms to move onto this too, replacing their own
 * hand-rolled SEO boxes, once this is proven out here).
 *
 * Soft limits only (60/155 chars) — Google doesn't hard-truncate at a
 * fixed character count (it measures rendered pixel width and the cutoff
 * moves with content), so this is guidance, not validation: the amber
 * counter warns, nothing blocks submission.
 */
export function SeoFields({
  title,
  onTitleChange,
  titlePlaceholder,
  description,
  onDescriptionChange,
  descriptionPlaceholder,
  previewUrl,
  disabled,
  idPrefix,
}: SeoFieldsProps) {
  const effectiveTitle = title.trim() || titlePlaceholder;
  const effectiveDescription = description.trim() || descriptionPlaceholder;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor={`${idPrefix}-title`}>Judul (title)</Label>
          <CharCount value={title} limit={TITLE_SOFT_LIMIT} />
        </div>
        <Input
          id={`${idPrefix}-title`}
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={titlePlaceholder}
          disabled={disabled}
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-muted-foreground">Kosongkan untuk memakai judul bawaan.</p>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <Label htmlFor={`${idPrefix}-description`}>Deskripsi (meta description)</Label>
          <CharCount value={description} limit={DESCRIPTION_SOFT_LIMIT} />
        </div>
        <Textarea
          id={`${idPrefix}-description`}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={descriptionPlaceholder}
          disabled={disabled}
          rows={3}
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-muted-foreground">Kosongkan untuk memakai deskripsi bawaan.</p>
      </div>

      <div>
        <Label>Pratinjau Google</Label>
        <div className="mt-1.5 rounded-lg border border-border bg-card p-4">
          <p className="truncate text-xs text-muted-foreground">{previewUrl}</p>
          <p className="mt-0.5 truncate text-lg text-[#1a0dab]">{effectiveTitle}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-[#4d5156]">{effectiveDescription}</p>
        </div>
      </div>
    </div>
  );
}
