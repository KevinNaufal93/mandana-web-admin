"use server";

import { revalidatePath } from "next/cache";
import { updateMovingLead, type AdminMovingLead, type MovingLeadUpdateInput } from "@/lib/api/moving-leads";
import type { ApiError } from "@/lib/api/errors";
import { createLogger } from "@/lib/logger";

const log = createLogger("moving-leads");

function errorMessage(error: ApiError): string {
  if (error.kind === "network") return "Tidak dapat terhubung ke server.";
  if (error.messages.length > 0) return error.messages.join(" ");
  return "Gagal menyimpan perubahan lead.";
}

// No `conflict` case, unlike storage/event-support booking transition
// results — UpdateMovingLeadDto is `{ status?, adminNote? }` with no
// transition rules to violate, so a 409 is not reachable here. Kept as a
// plain two-branch result type rather than carrying a dead `conflict?`
// flag (see docs/moving-admin-integration-plan.md's contract-delta note).
export type MovingLeadResult = { ok: true; data: AdminMovingLead } | { ok: false; error: string };

// One PATCH, not four transition functions like Storage/Event bookings —
// there's no state machine to drive. The PATCH response goes through the
// same mapper as GET (verified against moving-leads.controller.ts), so it
// can be returned directly — same convention as
// confirmStorageBookingAction, which also skips a re-read.
export async function updateMovingLeadAction(id: string, patch: MovingLeadUpdateInput): Promise<MovingLeadResult> {
  const result = await updateMovingLead(id, patch);
  if (!result.ok) {
    log.warn("Update moving lead failed", { id, kind: result.error.kind });
    return { ok: false, error: errorMessage(result.error) };
  }
  revalidatePath(`/moving/leads/${id}`);
  revalidatePath("/moving/leads");
  return { ok: true, data: result.data };
}
