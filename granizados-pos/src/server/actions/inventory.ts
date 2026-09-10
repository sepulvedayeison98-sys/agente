"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import {
  createInventoryItem,
  moveInventory,
  updateInventoryItem,
  type ActionResult,
  type MovementKind,
} from "@/server/inventory-admin";

function revalidateInventory() {
  revalidatePath("/admin/inventario");
  revalidatePath("/admin/dashboard");
}

export async function addInventoryItem(input: {
  name: string;
  unit: string;
  quantity: number;
  minimum: number;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const result = await createInventoryItem(session, input);
  if (result.ok) revalidateInventory();
  return result;
}

export async function registerMovement(input: {
  itemId: string;
  kind: MovementKind;
  amount: number;
  reason: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const result = await moveInventory(session, input);
  if (result.ok) revalidateInventory();
  return result;
}

export async function editInventoryItem(input: {
  itemId: string;
  name: string;
  unit: string;
  minimum: number;
}): Promise<ActionResult> {
  const session = await requireAdmin();
  const result = await updateInventoryItem(session, input);
  if (result.ok) revalidateInventory();
  return result;
}
