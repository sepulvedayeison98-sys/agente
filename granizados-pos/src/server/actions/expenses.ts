"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import type { PaymentMethod } from "@/generated/prisma/enums";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createExpense(input: {
  concept: string;
  categoryId: string;
  value: number;
  date: string;
  method: PaymentMethod;
  note: string;
}): Promise<ActionResult> {
  const session = await requireAdmin();

  const concept = input.concept.trim();
  if (!concept) return { ok: false, error: "Escribe el concepto del gasto." };
  if (!Number.isFinite(input.value) || input.value <= 0) {
    return { ok: false, error: "El valor del gasto no es válido." };
  }

  const category = await prisma.expenseCategory.findUnique({
    where: { id: input.categoryId },
  });
  if (!category) return { ok: false, error: "Elige una categoría." };

  const date = input.date ? new Date(input.date) : new Date();
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "La fecha no es válida." };
  }

  const expense = await prisma.expense.create({
    data: {
      concept,
      categoryId: category.id,
      value: Math.round(input.value),
      date,
      method: input.method,
      note: input.note.trim() || null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.userId,
      action: "registro_gasto",
      entity: "Expense",
      entityId: expense.id,
      newValue: {
        concepto: concept,
        categoria: category.name,
        valor: expense.value,
      },
    },
  });

  revalidatePath("/admin/finanzas");
  revalidatePath("/admin/dashboard");
  return { ok: true };
}
