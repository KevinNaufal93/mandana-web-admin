"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createArticleCategoryAction, updateArticleCategoryAction } from "@/app/actions/articles";
import type { AdminArticleCategory, ArticleCategoryInput } from "@/lib/api/articles";

function Field({
  label,
  htmlFor,
  children,
  hint,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

type ArticleCategoryFormProps =
  | { mode: "create" }
  | { mode: "edit"; category: AdminArticleCategory; onSaved: (fresh: AdminArticleCategory) => void; onCancel: () => void };

/**
 * name + slug only — CreateArticleCategoryDto/UpdateArticleCategoryDto
 * carry nothing else (no description, no image, no isActive, no
 * sortOrder, unlike EventCategoryForm). One component for create and
 * edit; mode branching stays confined to the initial seed and
 * handleSubmit.
 */
export function ArticleCategoryForm(props: ArticleCategoryFormProps) {
  const router = useRouter();
  const category = props.mode === "edit" ? props.category : null;

  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);

    if (name.trim().length < 2) {
      setError("Nama minimal 2 karakter.");
      return;
    }
    if (slug.trim() && !/^[a-z0-9-]+$/.test(slug.trim())) {
      setError("Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung.");
      return;
    }

    const input: ArticleCategoryInput = {
      name: name.trim(),
      slug: slug.trim() || undefined,
    };

    startTransition(async () => {
      if (props.mode === "edit") {
        const result = await updateArticleCategoryAction(props.category.id, input);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        props.onSaved(result.data);
        return;
      }
      const result = await createArticleCategoryAction(input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/articles/categories/${result.data.id}`);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex max-w-md flex-col gap-3 rounded-lg border border-border p-4">
        <Field label="Nama" htmlFor="article-category-name">
          <Input id="article-category-name" value={name} onChange={(e) => setName(e.target.value)} disabled={pending} />
        </Field>
        <Field label="Slug (opsional)" htmlFor="article-category-slug" hint="Dibuat otomatis dari nama bila dikosongkan.">
          <Input
            id="article-category-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            disabled={pending}
          />
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={handleSubmit} disabled={pending}>
          {props.mode === "edit" ? (pending ? "Menyimpan…" : "Simpan perubahan") : pending ? "Membuat…" : "Buat kategori"}
        </Button>
        <Button
          variant="outlineSecondary"
          onClick={() => (props.mode === "edit" ? props.onCancel() : router.push("/articles/categories"))}
          disabled={pending}
        >
          Batal
        </Button>
      </div>
    </div>
  );
}
