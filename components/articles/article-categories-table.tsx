import Link from "next/link";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminArticleCategory } from "@/lib/api/articles";
import { formatDateID } from "@/lib/format";

const COLUMN_COUNT = 3;

/**
 * No thumbnail column, unlike EventCategoriesTable — ArticleCategory has
 * no image field at all (CreateArticleCategoryDto/entity carry only
 * name/slug), and no article count — ArticleCategoriesAdminController
 * returns bare entities, no itemCount-equivalent. The delete-409 message
 * names the count when it actually matters (see
 * deleteArticleCategoryAction).
 */
export function ArticleCategoriesTable({
  rows,
}: {
  rows: AdminArticleCategory[];
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Kategori</TableHead>
          <TableHead>Dibuat</TableHead>
          <TableHead>Diperbarui</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty colSpan={COLUMN_COUNT}>Belum ada kategori. Kategori yang ditambahkan akan muncul di sini.</TableEmpty>
        ) : (
          rows.map((row) => <CategoryRow key={row.id} row={row} />)
        )}
      </TableBody>
    </Table>
  );
}

function CategoryRow({ row }: { row: AdminArticleCategory }) {
  return (
    <TableRow>
      <TableCell>
        <Link href={`/articles/categories/${row.id}`} className="hover:underline">
          <p className="font-medium text-primary">{row.name}</p>
          <p className="text-xs text-muted-foreground">{row.slug}</p>
        </Link>
      </TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateID(row.createdAt)}</TableCell>
      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateID(row.updatedAt)}</TableCell>
    </TableRow>
  );
}
