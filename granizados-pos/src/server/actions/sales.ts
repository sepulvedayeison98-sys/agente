"use server";

import { verifySession } from "@/lib/dal";
import { registerSale, type SaleRequest, type SaleResult } from "@/server/sales";

export async function confirmSale(request: SaleRequest): Promise<SaleResult> {
  const session = await verifySession();
  return registerSale(session, request);
}
