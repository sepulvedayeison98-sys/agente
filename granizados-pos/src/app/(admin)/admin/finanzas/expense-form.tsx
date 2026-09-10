"use client";

import { useState, useTransition } from "react";
import { Plus } from "@phosphor-icons/react";
import { createExpense } from "@/server/actions/expenses";
import type { PaymentMethod } from "@/generated/prisma/enums";

const METHODS: { id: PaymentMethod; label: string }[] = [
  { id: "EFECTIVO", label: "Efectivo" },
  { id: "TRANSFERENCIA", label: "Transferencia" },
  { id: "TARJETA", label: "Tarjeta" },
  { id: "OTRO", label: "Otro" },
];

function today() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function ExpenseForm({
  categories,
}: {
  categories: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState({
    concept: "",
    categoryId: categories[0]?.id ?? "",
    value: "",
    date: today(),
    method: "EFECTIVO" as PaymentMethod,
    note: "",
  });

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await createExpense({
        concept: form.concept,
        categoryId: form.categoryId,
        value: Number(form.value || 0),
        date: form.date,
        method: form.method,
        note: form.note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      setForm({ ...form, concept: "", value: "", note: "" });
    });
  }

  const field =
    "h-[36px] w-full rounded-[var(--radius-md)] bg-[var(--color-bg)] px-[10px] text-[13px] outline-none";
  const ring = { boxShadow: "inset 0 0 0 1px var(--color-divider)" };
  const label = "text-[11px] text-[var(--color-neutral-400)]";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="pos-tap flex items-center gap-[5px] rounded-[var(--radius-md)] border border-[var(--color-accent)] px-[10px] py-[6px] text-[11.5px] text-[var(--color-accent)]"
      >
        <Plus size={13} />
        Nuevo gasto
      </button>
    );
  }

  return (
    <div
      className="animate-rise-in rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-[11px]"
      style={{ boxShadow: "inset 0 0 0 1px var(--color-accent-700)" }}
    >
      <label className={label}>Concepto</label>
      <input
        value={form.concept}
        onChange={(event) => setForm({ ...form, concept: event.target.value })}
        placeholder="Ej. Hielo (2 bultos)"
        className={`mt-[4px] mb-2 ${field}`}
        style={ring}
      />

      <div className="flex gap-2">
        <div className="flex-1">
          <label className={label}>Categoría</label>
          <select
            value={form.categoryId}
            onChange={(event) =>
              setForm({ ...form, categoryId: event.target.value })
            }
            className={`mt-[4px] ${field}`}
            style={ring}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className={label}>Valor</label>
          <input
            value={form.value}
            onChange={(event) => setForm({ ...form, value: event.target.value })}
            inputMode="numeric"
            placeholder="0"
            className={`mt-[4px] ${field}`}
            style={ring}
          />
        </div>
      </div>

      <div className="mt-2 flex gap-2">
        <div className="flex-1">
          <label className={label}>Fecha</label>
          <input
            type="date"
            value={form.date}
            onChange={(event) => setForm({ ...form, date: event.target.value })}
            className={`mt-[4px] ${field}`}
            style={ring}
          />
        </div>
        <div className="flex-1">
          <label className={label}>Método</label>
          <select
            value={form.method}
            onChange={(event) =>
              setForm({ ...form, method: event.target.value as PaymentMethod })
            }
            className={`mt-[4px] ${field}`}
            style={ring}
          >
            {METHODS.map((method) => (
              <option key={method.id} value={method.id}>
                {method.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className={`mt-2 block ${label}`}>Nota</label>
      <input
        value={form.note}
        onChange={(event) => setForm({ ...form, note: event.target.value })}
        placeholder="Opcional"
        className={`mt-[4px] ${field}`}
        style={ring}
      />

      {error ? (
        <p className="mt-[6px] text-[11px] text-[var(--color-accent-300)]">
          {error}
        </p>
      ) : null}

      <div className="mt-[10px] flex gap-[7px]">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="pos-tap grid h-[38px] flex-1 place-items-center rounded-[var(--radius-md)] border border-[var(--color-accent)] text-[13px] text-[var(--color-accent)] disabled:opacity-45"
          style={{
            background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
          }}
        >
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="pos-tap grid h-[38px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] px-[14px] text-[13px]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
