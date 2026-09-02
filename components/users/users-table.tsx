import Link from "next/link";
import Image from "next/image";
import { UserRound } from "lucide-react";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { AdminUser } from "@/lib/api/users";
import { formatDateID, initials } from "@/lib/format";

const COLUMN_COUNT = 4;

const ROLE_LABEL: Record<AdminUser["role"], string> = { admin: "Admin", editor: "Editor" };

export function UsersTable({ rows, currentUserId }: { rows: AdminUser[]; currentUserId: string }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pengguna</TableHead>
          <TableHead>Peran</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Dibuat</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableEmpty colSpan={COLUMN_COUNT}>
            Belum ada pengguna. Pengguna yang ditambahkan akan muncul di sini.
          </TableEmpty>
        ) : (
          rows.map((row) => <UserRow key={row.id} row={row} isSelf={row.id === currentUserId} />)
        )}
      </TableBody>
    </Table>
  );
}

function UserRow({ row, isSelf }: { row: AdminUser; isSelf: boolean }) {
  return (
    <TableRow>
      <TableCell>
        <Link href={`/users/${row.id}`} className="flex items-center gap-3">
          {row.photo ? (
            <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
              <Image src={row.photo.url} alt={row.photo.alt ?? row.name} fill className="object-cover" sizes="36px" />
            </div>
          ) : row.photoMediaAssetId ? (
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="bg-primary text-xs font-medium text-card">{initials(row.name)}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <UserRound className="size-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 truncate font-medium text-primary hover:underline">
              <span className="truncate">{row.name}</span>
              {isSelf && <Badge variant="outline">Anda</Badge>}
            </div>
            <p className="truncate text-xs text-muted-foreground">{row.email}</p>
          </div>
        </Link>
      </TableCell>
      <TableCell>
        <Badge variant={row.role === "admin" ? "default" : "secondary"}>{ROLE_LABEL[row.role]}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant={row.isActive ? "default" : "secondary"}>{row.isActive ? "Aktif" : "Nonaktif"}</Badge>
      </TableCell>
      <TableCell className="whitespace-nowrap text-right text-sm text-muted-foreground">
        {formatDateID(row.createdAt)}
      </TableCell>
    </TableRow>
  );
}
