import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArticleStatusBadge } from "@/components/articles/article-status-badge";
import type { AdminArticleCard } from "@/lib/api/articles";
import { formatDateID } from "@/lib/format";

const COLUMN_COUNT = 5;

export function ArticlesTable({ rows, hasActiveFilters }: { rows: AdminArticleCard[]; hasActiveFilters: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Artikel</TableHead>
          <TableHead>Kategori</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Penulis</TableHead>
          <TableHead>Terbit</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty colSpan={COLUMN_COUNT}>
            {hasActiveFilters
              ? "Tidak ada artikel yang cocok dengan filter ini."
              : "Belum ada artikel. Artikel yang ditambahkan akan muncul di sini."}
          </TableEmpty>
        ) : (
          rows.map((row) => <ArticleRow key={row.id} row={row} />)
        )}
      </TableBody>
    </Table>
  );
}

function ArticleRow({ row }: { row: AdminArticleCard }) {
  return (
    <TableRow>
      <TableCell>
        <Link href={`/articles/posts/${row.id}`} className="flex items-center gap-3">
          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            {row.coverImage ? (
              <Image
                src={row.coverImage.url}
                alt={row.coverImage.alt ?? row.title}
                fill
                className="object-cover"
                sizes="64px"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageOff className="size-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-primary hover:underline">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.slug}</p>
          </div>
        </Link>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.category.name}</TableCell>
      <TableCell>
        <ArticleStatusBadge status={row.status} />
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">{row.author.name}</TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
        {row.publishedAt ? formatDateID(row.publishedAt) : "—"}
      </TableCell>
    </TableRow>
  );
}
