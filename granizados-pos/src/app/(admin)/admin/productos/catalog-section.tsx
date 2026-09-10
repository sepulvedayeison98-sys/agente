"use client";

import { useState, useTransition } from "react";
import { Eye, EyeSlash, Package, PencilSimple, Plus } from "@phosphor-icons/react";
import { formatCOP } from "@/lib/money";
import { FLAVOR_COLORS } from "@/lib/flavor-colors";
import {
  createCatalogItem,
  toggleCatalogVisibility,
  updateCatalogItem,
  updateCatalogLink,
  type CatalogKind,
} from "@/server/actions/catalog";

export type Recipe = {
  cupItemId: string | null;
  iceItemId: string | null;
  ice: number;
  pulp: number;
};

export type CatalogRow = {
  id: string;
  name: string;
  price: number | null;
  cost?: number;
  visible: boolean;
  inventoryItemId?: string | null;
  useQuantityPerUnit?: number;
  recipe?: Recipe;
  color?: string | null;
  isLiquor?: boolean;
};

export type InventoryOption = { id: string; name: string; unit: string };

type Props = {
  kind: CatalogKind;
  title: string;
  addLabel: string;
  namePlaceholder: string;
  hasPrice?: boolean;
  hasCost?: boolean;
  hasInsumo?: boolean;
  hasConsumo?: boolean;
  hasColor?: boolean;
  hasLiquor?: boolean;
  hasRecipe?: boolean;
  rows: CatalogRow[];
  inventory: InventoryOption[];
};

export function CatalogSection({
  kind,
  title,
  addLabel,
  namePlaceholder,
  hasPrice = false,
  hasCost = false,
  hasInsumo = false,
  hasConsumo = false,
  hasColor = false,
  hasLiquor = false,
  hasRecipe = false,
  rows,
  inventory,
}: Props) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [linking, setLinking] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", price: "", cost: "" });
  const [link, setLink] = useState({
    isLiquor: false,
    color: "",
    inventoryItemId: "",
    useQuantityPerUnit: "",
    cupItemId: "",
    iceItemId: "",
    ice: "",
    pulp: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setForm({ name: "", price: "", cost: "" });
    setError(null);
  }

  function openLink(row: CatalogRow) {
    const next = linking === row.id ? null : row.id;
    setLinking(next);
    setAdding(false);
    setEditing(null);
    setError(null);
    setLink({
      isLiquor: row.isLiquor ?? false,
      color: row.color ?? "",
      inventoryItemId: row.inventoryItemId ?? "",
      useQuantityPerUnit: row.useQuantityPerUnit ? String(row.useQuantityPerUnit) : "",
      cupItemId: row.recipe?.cupItemId ?? "",
      iceItemId: row.recipe?.iceItemId ?? "",
      ice: row.recipe?.ice ? String(row.recipe.ice) : "",
      pulp: row.recipe?.pulp ? String(row.recipe.pulp) : "",
    });
  }

  function saveLink(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await updateCatalogLink(kind, id, {
        color: hasColor ? link.color || null : undefined,
        isLiquor: hasLiquor ? link.isLiquor : undefined,
        inventoryItemId: link.inventoryItemId || null,
        useQuantityPerUnit: Number(link.useQuantityPerUnit || 0),
        recipe: hasRecipe
          ? {
              cupItemId: link.cupItemId || null,
              iceItemId: link.iceItemId || null,
              ice: Number(link.ice || 0),
              pulp: Number(link.pulp || 0),
            }
          : undefined,
      });
      if (!result.ok) return setError(result.error);
      setLinking(null);
    });
  }

  function create() {
    startTransition(async () => {
      const result = await createCatalogItem(kind, {
        name: form.name,
        price: Number(form.price || 0),
        cost: Number(form.cost || 0),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAdding(false);
      reset();
    });
  }

  function save(id: string) {
    startTransition(async () => {
      const result = await updateCatalogItem(kind, id, {
        name: form.name,
        price: hasPrice ? Number(form.price || 0) : undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setEditing(null);
      reset();
    });
  }

  function toggle(id: string) {
    startTransition(async () => {
      await toggleCatalogVisibility(kind, id);
    });
  }

  const input =
    "h-[36px] w-full rounded-[var(--radius-md)] bg-[var(--color-bg)] px-[10px] text-[13px] outline-none";
  const inputRing = { boxShadow: "inset 0 0 0 1px var(--color-divider)" };
  const labelSmall = "text-[11px] text-[var(--color-neutral-400)]";

  // Un renglón sin insumo (o sin receta) se vende sin tocar el inventario.
  const linkedOf = (row: CatalogRow) =>
    hasRecipe ? !!row.recipe?.cupItemId || !!row.recipe?.pulp : !!row.inventoryItemId;

  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <h2 className="flex-1 text-[12px] font-medium text-[var(--color-neutral-400)]">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => {
            setAdding(!adding);
            setEditing(null);
            reset();
          }}
          className="pos-tap flex items-center gap-[5px] rounded-[var(--radius-md)] border border-[var(--color-accent)] px-[10px] py-[6px] text-[11.5px] text-[var(--color-accent)]"
        >
          <Plus size={13} />
          {addLabel}
        </button>
      </div>

      {adding ? (
        <div
          className="animate-rise-in mb-2 rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-[11px]"
          style={{ boxShadow: "inset 0 0 0 1px var(--color-accent-700)" }}
        >
          <label className="text-[11px] text-[var(--color-neutral-400)]">
            Nombre
          </label>
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder={namePlaceholder}
            className={`mt-[4px] mb-2 ${input}`}
            style={inputRing}
          />
          {hasPrice ? (
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] text-[var(--color-neutral-400)]">
                  Precio
                </label>
                <input
                  value={form.price}
                  onChange={(event) =>
                    setForm({ ...form, price: event.target.value })
                  }
                  inputMode="numeric"
                  placeholder="0"
                  className={`mt-[4px] ${input}`}
                  style={inputRing}
                />
              </div>
              {hasCost ? (
                <div className="flex-1">
                  <label className="text-[11px] text-[var(--color-neutral-400)]">
                    Costo
                  </label>
                  <input
                    value={form.cost}
                    onChange={(event) =>
                      setForm({ ...form, cost: event.target.value })
                    }
                    inputMode="numeric"
                    placeholder="0"
                    className={`mt-[4px] ${input}`}
                    style={inputRing}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          {error ? (
            <p className="mt-[6px] text-[11px] text-[var(--color-accent-300)]">
              {error}
            </p>
          ) : null}
          <div className="mt-[10px] flex gap-[7px]">
            <button
              type="button"
              disabled={pending}
              onClick={create}
              className="pos-tap grid h-[38px] flex-1 place-items-center rounded-[var(--radius-md)] border border-[var(--color-accent)] text-[13px] text-[var(--color-accent)] disabled:opacity-45"
              style={{
                background:
                  "color-mix(in srgb, var(--color-accent) 12%, transparent)",
              }}
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                reset();
              }}
              className="pos-tap grid h-[38px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] px-[14px] text-[13px]"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-[6px]">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-[11px] py-[9px] shadow-[var(--shadow-sm)]"
            style={{ opacity: row.visible ? 1 : 0.55 }}
          >
            <div className="flex items-center gap-[9px]">
              <div className="min-w-0 flex-1">
                <div className="text-[13px]">{row.name}</div>
                <div className="text-[11px] text-[var(--color-neutral-400)]">
                  {row.price === null
                    ? "Sin costo adicional"
                    : row.cost !== undefined
                      ? `${formatCOP(row.price)} · costo ${formatCOP(row.cost)}`
                      : formatCOP(row.price)}
                </div>
              </div>

              <span className="rounded-[var(--radius-sm)] bg-[var(--color-neutral-900)] px-[7px] py-[2px] text-[10.5px] text-[var(--color-neutral-300)]">
                {row.visible ? "Visible" : "Oculto"}
              </span>

              <button
                type="button"
                onClick={() => toggle(row.id)}
                disabled={pending}
                title="Mostrar u ocultar al vendedor"
                aria-label={
                  row.visible ? `Ocultar ${row.name}` : `Mostrar ${row.name}`
                }
                className="pos-tap grid size-[32px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] disabled:opacity-45"
                style={{
                  color: row.visible
                    ? "var(--color-accent)"
                    : "var(--color-neutral-500)",
                }}
              >
                {row.visible ? <EyeSlash size={15} /> : <Eye size={15} />}
              </button>

              {hasInsumo || hasRecipe ? (
              <button
                type="button"
                aria-label={`Insumo de ${row.name}`}
                title="Conectar con inventario"
                onClick={() => openLink(row)}
                className="pos-tap grid size-[32px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)]"
                style={{
                  color: linkedOf(row)
                    ? "var(--color-accent)"
                    : "var(--color-neutral-500)",
                }}
              >
                <Package size={15} />
              </button>
              ) : null}

              <button
                type="button"
                aria-label={`Editar ${row.name}`}
                onClick={() => {
                  const next = editing === row.id ? null : row.id;
                  setEditing(next);
                  setAdding(false);
                  setError(null);
                  setForm({
                    name: row.name,
                    price: row.price === null ? "" : String(row.price),
                    cost: row.cost === undefined ? "" : String(row.cost),
                  });
                }}
                className="pos-tap grid size-[32px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)]"
              >
                <PencilSimple size={15} />
              </button>
            </div>

            {linking === row.id ? (
              <div className="animate-rise-in mt-[9px] border-t border-[var(--color-divider)] pt-[9px]">
                {hasRecipe ? (
                  <>
                    <label className={labelSmall}>Vaso que gasta</label>
                    <select
                      value={link.cupItemId}
                      onChange={(e) => setLink({ ...link, cupItemId: e.target.value })}
                      className={`mt-[4px] mb-2 ${input}`}
                      style={inputRing}
                    >
                      <option value="">Sin vaso</option>
                      {inventory.map((i) => (
                        <option key={i.id} value={i.id}>{i.name}</option>
                      ))}
                    </select>

                    <div className="flex gap-2">
                      <div className="flex-[1.4]">
                        <label className={labelSmall}>Hielo</label>
                        <select
                          value={link.iceItemId}
                          onChange={(e) => setLink({ ...link, iceItemId: e.target.value })}
                          className={`mt-[4px] ${input}`}
                          style={inputRing}
                        >
                          <option value="">Sin hielo</option>
                          {inventory.map((i) => (
                            <option key={i.id} value={i.id}>{i.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className={labelSmall}>Cantidad</label>
                        <input
                          value={link.ice}
                          onChange={(e) => setLink({ ...link, ice: e.target.value })}
                          inputMode="decimal"
                          placeholder="0.5"
                          className={`mt-[4px] ${input}`}
                          style={inputRing}
                        />
                      </div>
                    </div>

                    <label className={`mt-2 block ${labelSmall}`}>
                      Pulpa por unidad (usa el insumo del sabor vendido)
                    </label>
                    <input
                      value={link.pulp}
                      onChange={(e) => setLink({ ...link, pulp: e.target.value })}
                      inputMode="decimal"
                      placeholder="0.12"
                      className={`mt-[4px] ${input}`}
                      style={inputRing}
                    />
                  </>
                ) : (
                  <>
                    {hasColor ? (
                      <>
                        <label className={labelSmall}>
                          Color del sabor (para reconocerlo de un vistazo)
                        </label>
                        <div className="mb-2 mt-[5px] flex flex-wrap gap-[6px]">
                          <button
                            type="button"
                            aria-label="Sin color"
                            aria-pressed={!link.color}
                            onClick={() => setLink({ ...link, color: "" })}
                            className="pos-tap grid size-[30px] place-items-center rounded-full text-[15px] text-[var(--color-neutral-500)]"
                            style={{
                              boxShadow: !link.color
                                ? "inset 0 0 0 2px var(--color-accent)"
                                : "inset 0 0 0 1px var(--color-divider)",
                            }}
                          >
                            ×
                          </button>
                          {FLAVOR_COLORS.map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              aria-label={option.label}
                              aria-pressed={link.color === option.value}
                              onClick={() => setLink({ ...link, color: option.value })}
                              className="pos-tap size-[30px] rounded-full"
                              style={{
                                background: option.value,
                                boxShadow:
                                  link.color === option.value
                                    ? "0 0 0 2px var(--color-bg), 0 0 0 4px var(--color-text)"
                                    : "none",
                              }}
                            />
                          ))}
                        </div>
                      </>
                    ) : null}

                    {hasLiquor ? (
                      <button
                        type="button"
                        onClick={() => setLink({ ...link, isLiquor: !link.isLiquor })}
                        aria-pressed={link.isLiquor}
                        className="pos-tap mb-[10px] flex w-full items-center gap-[9px] rounded-[var(--radius-md)] px-[10px] py-[8px] text-left"
                        style={{
                          boxShadow: link.isLiquor
                            ? "inset 0 0 0 1px var(--color-warning)"
                            : "inset 0 0 0 1px var(--color-divider)",
                          background: link.isLiquor
                            ? "color-mix(in srgb, var(--color-warning) 12%, transparent)"
                            : "transparent",
                        }}
                      >
                        <span
                          className="grid size-[18px] flex-none place-items-center rounded-[var(--radius-sm)] text-[11px]"
                          style={{
                            boxShadow: link.isLiquor
                              ? "inset 0 0 0 1px var(--color-warning)"
                              : "inset 0 0 0 1px var(--color-neutral-600)",
                            color: "var(--color-warning)",
                          }}
                        >
                          {link.isLiquor ? "✓" : ""}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span
                            className="block text-[12.5px]"
                            style={{
                              color: link.isLiquor ? "var(--color-warning)" : undefined,
                            }}
                          >
                            Lleva licor
                          </span>
                          <span className="block text-[10.5px] text-[var(--color-neutral-500)]">
                            Va en su propio grupo del POS y la venta queda marcada
                          </span>
                        </span>
                      </button>
                    ) : null}

                    <label className={labelSmall}>Insumo que descuenta</label>
                    <select
                      value={link.inventoryItemId}
                      onChange={(e) => setLink({ ...link, inventoryItemId: e.target.value })}
                      className={`mt-[4px] ${input}`}
                      style={inputRing}
                    >
                      <option value="">Ninguno (no descuenta inventario)</option>
                      {inventory.map((i) => (
                        <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>
                      ))}
                    </select>

                    {hasConsumo ? (
                      <>
                        <label className={`mt-2 block ${labelSmall}`}>
                          Cantidad que gasta por unidad vendida
                        </label>
                        <input
                          value={link.useQuantityPerUnit}
                          onChange={(e) => setLink({ ...link, useQuantityPerUnit: e.target.value })}
                          inputMode="decimal"
                          placeholder="0.05"
                          className={`mt-[4px] ${input}`}
                          style={inputRing}
                        />
                      </>
                    ) : null}
                  </>
                )}

                {error ? (
                  <p className="mt-[6px] text-[11px] text-[var(--color-accent-300)]">{error}</p>
                ) : null}

                <div className="mt-[9px] flex gap-[7px]">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => saveLink(row.id)}
                    className="pos-tap grid h-[36px] flex-1 place-items-center rounded-[var(--radius-md)] border border-[var(--color-accent)] text-[12.5px] text-[var(--color-accent)] disabled:opacity-45"
                    style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}
                  >
                    {pending ? "Guardando…" : "Guardar receta"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinking(null)}
                    className="pos-tap grid h-[36px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] px-3 text-[12.5px]"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : null}

            {editing === row.id ? (
              <div className="animate-rise-in mt-[9px] border-t border-[var(--color-divider)] pt-[9px]">
                <div className="flex gap-2">
                  <div className="flex-[1.4]">
                    <label className="text-[11px] text-[var(--color-neutral-400)]">
                      Nombre
                    </label>
                    <input
                      value={form.name}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                      className={`mt-[4px] ${input}`}
                      style={inputRing}
                    />
                  </div>
                  {hasPrice ? (
                    <div className="flex-1">
                      <label className="text-[11px] text-[var(--color-neutral-400)]">
                        Precio
                      </label>
                      <input
                        value={form.price}
                        onChange={(event) =>
                          setForm({ ...form, price: event.target.value })
                        }
                        inputMode="numeric"
                        className={`mt-[4px] ${input}`}
                        style={inputRing}
                      />
                    </div>
                  ) : null}
                </div>
                {error ? (
                  <p className="mt-[6px] text-[11px] text-[var(--color-accent-300)]">
                    {error}
                  </p>
                ) : null}
                <div className="mt-[9px] flex gap-[7px]">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => save(row.id)}
                    className="pos-tap grid h-[36px] flex-1 place-items-center rounded-[var(--radius-md)] border border-[var(--color-accent)] text-[12.5px] text-[var(--color-accent)] disabled:opacity-45"
                    style={{
                      background:
                        "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                    }}
                  >
                    Guardar cambios
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      reset();
                    }}
                    className="pos-tap grid h-[36px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] px-3 text-[12.5px]"
                  >
                    Cancelar
                  </button>
                </div>
                <p className="mt-[7px] text-[10.5px] text-[var(--color-neutral-400)]">
                  Los cambios de precio aplican solo a ventas nuevas; las ventas
                  históricas conservan su precio.
                </p>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
