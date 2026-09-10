"use client";

import { useState, useTransition } from "react";
import { Eye, EyeSlash, PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import { formatCOP } from "@/lib/money";
import {
  createPromo,
  deletePromo,
  togglePromo,
  updatePromo,
} from "@/server/actions/promo";

type Option = { id: string; name: string; price?: number };

export type PromoRow = {
  id: string;
  name: string;
  sizeId: string;
  flavorId: string;
  addonIds: string[];
  discount: number;
  active: boolean;
  basePrice: number;
  missing: string[];
};

type Props = {
  promos: PromoRow[];
  sizes: Option[];
  flavors: Option[];
  addons: Option[];
};

const EMPTY = { name: "", sizeId: "", flavorId: "", addonIds: [] as string[], discount: "" };

export function PromoManager({ promos, sizes, flavors, addons }: Props) {
  const [editing, setEditing] = useState<string | "nuevo" | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openNew() {
    setEditing("nuevo");
    setError(null);
    setForm({
      ...EMPTY,
      sizeId: sizes[0]?.id ?? "",
      flavorId: flavors[0]?.id ?? "",
    });
  }

  function openEdit(promo: PromoRow) {
    setEditing(promo.id);
    setError(null);
    setForm({
      name: promo.name,
      sizeId: promo.sizeId,
      flavorId: promo.flavorId,
      addonIds: promo.addonIds,
      discount: String(promo.discount),
    });
  }

  function submit() {
    setError(null);
    const input = {
      name: form.name,
      sizeId: form.sizeId,
      flavorId: form.flavorId,
      addonIds: form.addonIds,
      discount: Number(form.discount || 0),
    };

    startTransition(async () => {
      const result =
        editing === "nuevo"
          ? await createPromo(input)
          : await updatePromo(editing as string, input);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(null);
      setForm({ ...EMPTY });
    });
  }

  const previewBase =
    (sizes.find((s) => s.id === form.sizeId)?.price ?? 0) +
    addons
      .filter((a) => form.addonIds.includes(a.id))
      .reduce((total, a) => total + (a.price ?? 0), 0);
  const previewFinal = Math.max(0, previewBase - Number(form.discount || 0));

  const field =
    "h-[36px] w-full rounded-[var(--radius-md)] bg-[var(--color-bg)] px-[10px] text-[13px] outline-none";
  const ring = { boxShadow: "inset 0 0 0 1px var(--color-divider)" };
  const label = "text-[11px] text-[var(--color-neutral-400)]";

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[12px] font-medium text-[var(--color-neutral-400)]">
          Promo del día
        </h2>
        <button
          type="button"
          onClick={() => (editing === "nuevo" ? setEditing(null) : openNew())}
          className="pos-tap flex items-center gap-[5px] rounded-[var(--radius-md)] border border-[var(--color-accent)] px-[10px] py-[6px] text-[11.5px] text-[var(--color-accent)]"
        >
          <Plus size={13} />
          Nueva promo
        </button>
      </div>

      {editing ? (
        <div
          className="animate-rise-in rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-[11px]"
          style={{ boxShadow: "inset 0 0 0 1px var(--color-accent-700)" }}
        >
          <label className={label}>Nombre que ve el vendedor</label>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Ej. Piña mediano + fruta"
            className={`mt-[4px] mb-2 ${field}`}
            style={ring}
          />

          <div className="flex gap-2">
            <div className="flex-1">
              <label className={label}>Tamaño</label>
              <select
                value={form.sizeId}
                onChange={(event) =>
                  setForm({ ...form, sizeId: event.target.value })
                }
                className={`mt-[4px] ${field}`}
                style={ring}
              >
                {sizes.map((size) => (
                  <option key={size.id} value={size.id}>
                    {size.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className={label}>Sabor</label>
              <select
                value={form.flavorId}
                onChange={(event) =>
                  setForm({ ...form, flavorId: event.target.value })
                }
                className={`mt-[4px] ${field}`}
                style={ring}
              >
                {flavors.map((flavor) => (
                  <option key={flavor.id} value={flavor.id}>
                    {flavor.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className={`mt-2 block ${label}`}>Adiciones incluidas</label>
          <div className="mt-[4px] flex flex-wrap gap-[6px]">
            {addons.map((addon) => {
              const on = form.addonIds.includes(addon.id);
              return (
                <button
                  key={addon.id}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      addonIds: on
                        ? form.addonIds.filter((id) => id !== addon.id)
                        : [...form.addonIds, addon.id],
                    })
                  }
                  className="pos-tap rounded-[var(--radius-md)] bg-[var(--color-bg)] px-[11px] py-[7px] text-[12.5px]"
                  style={{
                    boxShadow: on
                      ? "inset 0 0 0 1px var(--color-accent)"
                      : "inset 0 0 0 1px var(--color-divider)",
                    color: on ? "var(--color-accent)" : "var(--color-text)",
                  }}
                >
                  {addon.name}
                </button>
              );
            })}
          </div>

          <label className={`mt-2 block ${label}`}>Descuento</label>
          <input
            value={form.discount}
            onChange={(event) =>
              setForm({ ...form, discount: event.target.value })
            }
            inputMode="numeric"
            placeholder="0"
            className={`mt-[4px] ${field}`}
            style={ring}
          />

          <div className="mt-2 flex items-baseline justify-between rounded-[var(--radius-md)] bg-[var(--color-bg)] px-[10px] py-2">
            <span className="text-[11.5px] text-[var(--color-neutral-400)]">
              Queda en
            </span>
            <span>
              <span className="font-[family-name:var(--font-heading)] text-[16px]">
                {formatCOP(previewFinal)}
              </span>
              <span className="ml-2 text-[11px] text-[var(--color-neutral-400)] line-through">
                {formatCOP(previewBase)}
              </span>
            </span>
          </div>

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
                background:
                  "color-mix(in srgb, var(--color-accent) 12%, transparent)",
              }}
            >
              {pending ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setError(null);
              }}
              className="pos-tap grid h-[38px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] px-[14px] text-[13px]"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {promos.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[var(--color-neutral-400)]">
          No hay promos creadas. El vendedor no verá la tarjeta de promo.
        </p>
      ) : null}

      {promos.map((promo) => (
        <div
          key={promo.id}
          className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-[11px] py-[9px] shadow-[var(--shadow-sm)]"
          style={{ opacity: promo.active ? 1 : 0.55 }}
        >
          <div className="flex items-center gap-[9px]">
            <div className="min-w-0 flex-1">
              <div className="text-[13px]">{promo.name}</div>
              <div className="text-[11px] text-[var(--color-neutral-400)]">
                {formatCOP(promo.basePrice - promo.discount)} · antes{" "}
                {formatCOP(promo.basePrice)}
              </div>
            </div>

            <span className="rounded-[var(--radius-sm)] bg-[var(--color-neutral-900)] px-[7px] py-[2px] text-[10.5px] text-[var(--color-neutral-300)]">
              {promo.active ? "Activa" : "Inactiva"}
            </span>

            <button
              type="button"
              aria-label={promo.active ? `Desactivar ${promo.name}` : `Activar ${promo.name}`}
              disabled={pending}
              onClick={() => startTransition(async () => void (await togglePromo(promo.id)))}
              className="pos-tap grid size-[32px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] disabled:opacity-45"
              style={{
                color: promo.active
                  ? "var(--color-accent)"
                  : "var(--color-neutral-500)",
              }}
            >
              {promo.active ? <EyeSlash size={15} /> : <Eye size={15} />}
            </button>

            <button
              type="button"
              aria-label={`Editar ${promo.name}`}
              onClick={() => openEdit(promo)}
              className="pos-tap grid size-[32px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)]"
            >
              <PencilSimple size={15} />
            </button>

            <button
              type="button"
              aria-label={`Eliminar ${promo.name}`}
              disabled={pending}
              onClick={() => startTransition(async () => void (await deletePromo(promo.id)))}
              className="pos-tap grid size-[32px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] text-[var(--color-neutral-400)] disabled:opacity-45"
            >
              <Trash size={15} />
            </button>
          </div>

          {promo.active && promo.missing.length ? (
            <div
              className="mt-[8px] rounded-[var(--radius-md)] px-[9px] py-[7px]"
              style={{
                background:
                  "color-mix(in srgb, var(--color-warning) 12%, transparent)",
              }}
            >
              <p
                className="text-[11px] font-medium"
                style={{ color: "var(--color-warning)" }}
              >
                No se está mostrando en el POS
              </p>
              <ul className="mt-[3px] list-disc pl-[15px] text-[10.5px] leading-relaxed text-[var(--color-neutral-400)]">
                {promo.missing.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ))}

      <p className="text-[11.5px] text-[var(--color-neutral-400)]">
        El vendedor ve la promo activa más reciente. Si ocultas o eliminas su
        tamaño, su sabor o alguna de sus adiciones, la tarjeta desaparece del
        POS y aquí se avisa cuál falta.
      </p>
    </div>
  );
}
