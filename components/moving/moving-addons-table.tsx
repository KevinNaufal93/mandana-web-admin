import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { AdminMovingAddon } from "@/lib/api/moving";
import { formatIDRShort } from "@/lib/format";

const COLUMN_COUNT = 5;

const KIND_LABEL: Record<string, string> = {
  helper: "Helper",
  packaging: "Packaging",
  waiting: "Waiting",
  insurance: "Insurance",
  toll: "Toll",
  other: "Lainnya",
};

const PRICING_MODEL_LABEL: Record<string, string> = {
  flat: "Flat",
  per_unit: "Per unit",
  percent: "Persen",
};

export function MovingAddonsTable({ rows, hasActiveFilters }: { rows: AdminMovingAddon[]; hasActiveFilters: boolean }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Add-on</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Jenis</TableHead>
          <TableHead>Model harga</TableHead>
          <TableHead className="text-right">Harga</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty colSpan={COLUMN_COUNT}>
            {hasActiveFilters
              ? "Tidak ada add-on yang cocok dengan filter ini."
              : "Belum ada add-on. Add-on yang ditambahkan akan muncul di sini."}
          </TableEmpty>
        ) : (
          rows.map((row) => <AddonRow key={row.id} row={row} />)
        )}
      </TableBody>
    </Table>
  );
}

function AddonRow({ row }: { row: AdminMovingAddon }) {
  return (
    <TableRow>
      <TableCell>
        <Link href={`/moving/addons/${row.id}`} className="flex items-center gap-3">
          <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
            {row.image ? (
              <Image src={row.image.url} alt={row.image.alt ?? row.name} fill className="object-cover" sizes="64px" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <ImageOff className="size-4" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-primary hover:underline">{row.name}</p>
            <p className="truncate text-xs text-muted-foreground">{row.slug}</p>
          </div>
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Aktif" : "Nonaktif"}</Badge>
      </TableCell>
      <TableCell className="text-sm text-primary">{KIND_LABEL[row.kind] ?? row.kind}</TableCell>
      <TableCell className="text-sm text-primary">{PRICING_MODEL_LABEL[row.pricingModel] ?? row.pricingModel}</TableCell>
      <TableCell className="whitespace-nowrap text-right font-medium text-primary">
        {row.pricingModel === "percent"
          ? `${((row.percentBps ?? 0) / 100).toFixed(2)}%`
          : formatIDRShort(row.unitPrice)}
      </TableCell>
    </TableRow>
  );
}
