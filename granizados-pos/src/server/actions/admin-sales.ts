"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { executeVoid, type ActionResult } from "@/server/admin-sales";

export async function voidSale(
  saleNumber: number,
  reason: string,
): Promise<ActionResult> {
  const session = await requireAdmin();
  const result = await executeVoid(session, saleNumber, reason);

  if (result.ok) {
    revalidatePath("/admin/ventas");
    revalidatePath("/admin/inventario");
    revalidatePath("/mis-ventas");
  }

  return result;
}
