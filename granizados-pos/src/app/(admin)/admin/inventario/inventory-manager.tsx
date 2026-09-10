"use client";

import { useState, useTransition } from "react";
import {
  ArrowDown,
  ArrowUp,
  ClockCounterClockwise,
  PencilSimple,
  Plus,
  Scales,
} from "@phosphor-icons/react";
import { formatQuantity } from "@/lib/money";
import {
  addInventoryItem,
  editInventoryItem,
  registerMovement,
} from "@/server/actions/inventory";
import type { MovementKind } from "@/server/inventory-admin";

type Movement = {
  id: string;
  type: string;
  quantity: number;
  reason: string;
  user: string;
  date: string;
};

export type InventoryRow = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  minimum: number;
  movements: Movement[];
};

const MOVEMENT_LABELS: Record<string, string> = {
  ENTRADA: "Entrada",
  SALIDA: "Salida",
  AJUSTE: "Ajuste",
  VENTA: "Venta",
};

const KINDS: { id: MovementKind; label: string; Icon: typeof ArrowUp; hint: string }[] = [
  { id: "ENTRADA", label: "Agregar", Icon: ArrowUp, hint: "Ej. compra de 2 bultos" },
  { id: "SALIDA", label: "Retirar", Icon: ArrowDown, hint: "Ej. se dañó el producto" },
  { id: "AJUSTE", label: "Ajustar", Icon: Scales, hint: "Ej. recuento físico" },
];

const field =
  "h-[36px] w-full rounded-[var(--radius-md)] bg-[var(--color-bg)] px-[10px] text-[13px] outline-none";
const ring = { boxShadow: "inset 0 0 0 1px var(--color-divider)" };
const labelClass = "text-[11px] text-[var(--color-neutral-400)]";

export function InventoryManager({ rows }: { rows: InventoryRow[] }) {
  const [creating, setCreating] = useState(false);
  const [openMovement, setOpenMovement] = useState<string | null>(null);
  const [openHistory, setOpenHistory] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [newItem, setNewItem] = useState({ name: "", unit: "kg", quantity: "", minimum: "" });
  const [move, setMove] = useState({ kind: "ENTRADA" as MovementKind, amount: "", reason: "" });
  const [edit, setEdit] = useState({ name: "", unit: "", minimum: "" });

  function create() {
    setError(null);
    startTransition(async () => {
      const result = await addInventoryItem({
        name: newItem.name,
        unit: newItem.unit,
        quantity: Number(newItem.quantity || 0),
        minimum: Number(newItem.minimum || 0),
      });
      if (!result.ok) return setError(result.error);
      setCreating(false);
      setNewItem({ name: "", unit: "kg", quantity: "", minimum: "" });
    });
  }

  function submitMovement(itemId: string) {
    setError(null);
    startTransition(async () => {
      const result = await registerMovement({
        itemId,
        kind: move.kind,
        amount: Number(move.amount || 0),
        reason: move.reason,
      });
      if (!result.ok) return setError(result.error);
      setOpenMovement(null);
      setMove({ kind: "ENTRADA", amount: "", reason: "" });
    });
  }

  function saveEdit(itemId: string) {
    setError(null);
    startTransition(async () => {
      const result = await editInventoryItem({
        itemId,
        name: edit.name,
        unit: edit.unit,
        minimum: Number(edit.minimum || 0),
      });
      if (!result.ok) return setError(result.error);
      setEditing(null);
    });
  }

  const activeKind = KINDS.find((k) => k.id === move.kind)!;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-[12px] font-medium text-[var(--color-neutral-400)]">
          Insumos
        </h2>
        <button
          type="button"
          onClick={() => {
            setCreating(!creating);
            setError(null);
          }}
          className="pos-tap flex items-center gap-[5px] rounded-[var(--radius-md)] border border-[var(--color-accent)] px-[10px] py-[6px] text-[11.5px] text-[var(--color-accent)]"
        >
          <Plus size={13} />
          Nuevo insumo
        </button>
      </div>

      {creating ? (
        <div
          className="animate-rise-in rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-[11px]"
          style={{ boxShadow: "inset 0 0 0 1px var(--color-accent-700)" }}
        >
          <label className={labelClass}>Nombre</label>
          <input
            value={newItem.name}
            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
            placeholder="Ej. Pulpa de coco"
            className={`mt-[4px] mb-2 ${field}`}
            style={ring}
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Unidad</label>
              <input
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                placeholder="kg"
                className={`mt-[4px] ${field}`}
                style={ring}
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Existencia</label>
              <input
                value={newItem.quantity}
                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                inputMode="decimal"
                placeholder="0"
                className={`mt-[4px] ${field}`}
                style={ring}
              />
            </div>
            <div className="flex-1">
              <label className={labelClass}>Mínimo</label>
              <input
                value={newItem.minimum}
                onChange={(e) => setNewItem({ ...newItem, minimum: e.target.value })}
                inputMode="decimal"
                placeholder="0"
                className={`mt-[4px] ${field}`}
                style={ring}
              />
            </div>
          </div>
          {error ? <p className="mt-[6px] text-[11px] text-[var(--color-accent-300)]">{error}</p> : null}
          <div className="mt-[10px] flex gap-[7px]">
            <button
              type="button"
              disabled={pending}
              onClick={create}
              className="pos-tap grid h-[38px] flex-1 place-items-center rounded-[var(--radius-md)] border border-[var(--color-accent)] text-[13px] text-[var(--color-accent)] disabled:opacity-45"
              style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="pos-tap grid h-[38px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] px-[14px] text-[13px]"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <p className="py-8 text-center text-[13px] text-[var(--color-neutral-400)]">
          Todavía no hay insumos. Crea el primero para que las ventas puedan
          descontar existencias.
        </p>
      ) : null}

      {rows.map((row) => {
        const isLow = row.quantity <= row.minimum;
        return (
          <div
            key={row.id}
            className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-[11px] py-[9px] shadow-[var(--shadow-sm)]"
          >
            <div className="flex items-center gap-[9px]">
              <div className="min-w-0 flex-1">
                <div className="text-[13px]">
                  {row.name}
                  {isLow ? (
                    <span className="text-[11px] text-[var(--color-accent-300)]">
                      {"  "}⚠ bajo
                    </span>
                  ) : null}
                </div>
                <div className="text-[11px] text-[var(--color-neutral-400)]">
                  {formatQuantity(row.quantity)} {row.unit} · mínimo{" "}
                  {formatQuantity(row.minimum)}
                </div>
              </div>

              <button
                type="button"
                aria-label={`Movimientos de ${row.name}`}
                onClick={() => {
                  setOpenHistory(openHistory === row.id ? null : row.id);
                  setOpenMovement(null);
                  setEditing(null);
                }}
                className="pos-tap grid size-[32px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] text-[var(--color-neutral-400)]"
              >
                <ClockCounterClockwise size={15} />
              </button>
              <button
                type="button"
                aria-label={`Editar ${row.name}`}
                onClick={() => {
                  setEditing(editing === row.id ? null : row.id);
                  setOpenMovement(null);
                  setOpenHistory(null);
                  setError(null);
                  setEdit({ name: row.name, unit: row.unit, minimum: String(row.minimum) });
                }}
                className="pos-tap grid size-[32px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)]"
              >
                <PencilSimple size={15} />
              </button>
              <button
                type="button"
                aria-label={`Mover existencias de ${row.name}`}
                onClick={() => {
                  setOpenMovement(openMovement === row.id ? null : row.id);
                  setOpenHistory(null);
                  setEditing(null);
                  setError(null);
                  setMove({ kind: "ENTRADA", amount: "", reason: "" });
                }}
                className="pos-tap flex-none rounded-[var(--radius-md)] border border-[var(--color-accent)] px-[10px] py-[6px] text-[11.5px] text-[var(--color-accent)]"
              >
                Mover
              </button>
            </div>

            {openMovement === row.id ? (
              <div className="animate-rise-in mt-[9px] border-t border-[var(--color-divider)] pt-[9px]">
                <div className="flex gap-[6px]">
                  {KINDS.map(({ id, label, Icon }) => {
                    const on = move.kind === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setMove({ ...move, kind: id })}
                        className="pos-tap flex h-[36px] flex-1 items-center justify-center gap-[5px] rounded-[var(--radius-md)] bg-[var(--color-bg)] text-[12.5px]"
                        style={{
                          boxShadow: on
                            ? "inset 0 0 0 1px var(--color-accent)"
                            : "inset 0 0 0 1px var(--color-divider)",
                          color: on ? "var(--color-accent)" : "var(--color-text)",
                        }}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    );
                  })}
                </div>

                <label className={`mt-2 block ${labelClass}`}>
                  {move.kind === "AJUSTE"
                    ? `Existencia contada (${row.unit})`
                    : `Cantidad (${row.unit})`}
                </label>
                <input
                  value={move.amount}
                  onChange={(e) => setMove({ ...move, amount: e.target.value })}
                  inputMode="decimal"
                  placeholder="0"
                  className={`mt-[4px] ${field}`}
                  style={ring}
                />

                <label className={`mt-2 block ${labelClass}`}>Motivo</label>
                <input
                  value={move.reason}
                  onChange={(e) => setMove({ ...move, reason: e.target.value })}
                  placeholder={activeKind.hint}
                  className={`mt-[4px] ${field}`}
                  style={ring}
                />

                {move.kind === "AJUSTE" && move.amount !== "" ? (
                  <p className="mt-[6px] text-[10.5px] text-[var(--color-neutral-400)]">
                    Registrado: {formatQuantity(row.quantity)} → {formatQuantity(Number(move.amount))} {row.unit}
                  </p>
                ) : null}

                {error ? (
                  <p className="mt-[6px] text-[11px] text-[var(--color-accent-300)]">{error}</p>
                ) : null}

                <div className="mt-[9px] flex gap-[7px]">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => submitMovement(row.id)}
                    className="pos-tap grid h-[36px] flex-1 place-items-center rounded-[var(--radius-md)] border border-[var(--color-accent)] text-[12.5px] text-[var(--color-accent)] disabled:opacity-45"
                    style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}
                  >
                    {pending ? "Guardando…" : "Confirmar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenMovement(null)}
                    className="pos-tap grid h-[36px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] px-3 text-[12.5px]"
                  >
                    Cancelar
                  </button>
                </div>
                <p className="mt-[7px] text-[10.5px] text-[var(--color-neutral-400)]">
                  Todo movimiento queda registrado con tu usuario y el motivo.
                </p>
              </div>
            ) : null}

            {editing === row.id ? (
              <div className="animate-rise-in mt-[9px] border-t border-[var(--color-divider)] pt-[9px]">
                <div className="flex gap-2">
                  <div className="flex-[1.4]">
                    <label className={labelClass}>Nombre</label>
                    <input
                      value={edit.name}
                      onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                      className={`mt-[4px] ${field}`}
                      style={ring}
                    />
                  </div>
                  <div className="flex-1">
                    <label className={labelClass}>Unidad</label>
                    <input
                      value={edit.unit}
                      onChange={(e) => setEdit({ ...edit, unit: e.target.value })}
                      className={`mt-[4px] ${field}`}
                      style={ring}
                    />
                  </div>
                  <div className="flex-1">
                    <label className={labelClass}>Mínimo</label>
                    <input
                      value={edit.minimum}
                      onChange={(e) => setEdit({ ...edit, minimum: e.target.value })}
                      inputMode="decimal"
                      className={`mt-[4px] ${field}`}
                      style={ring}
                    />
                  </div>
                </div>
                {error ? (
                  <p className="mt-[6px] text-[11px] text-[var(--color-accent-300)]">{error}</p>
                ) : null}
                <div className="mt-[9px] flex gap-[7px]">
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => saveEdit(row.id)}
                    className="pos-tap grid h-[36px] flex-1 place-items-center rounded-[var(--radius-md)] border border-[var(--color-accent)] text-[12.5px] text-[var(--color-accent)] disabled:opacity-45"
                    style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}
                  >
                    Guardar cambios
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditing(null)}
                    className="pos-tap grid h-[36px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] px-3 text-[12.5px]"
                  >
                    Cancelar
                  </button>
                </div>
                <p className="mt-[7px] text-[10.5px] text-[var(--color-neutral-400)]">
                  La existencia no se edita aquí: usa Ajustar, que deja motivo y
                  movimiento.
                </p>
              </div>
            ) : null}

            {openHistory === row.id ? (
              <div className="animate-rise-in mt-[9px] border-t border-[var(--color-divider)] pt-[9px]">
                {row.movements.length === 0 ? (
                  <p className="text-[11.5px] text-[var(--color-neutral-400)]">
                    Sin movimientos registrados.
                  </p>
                ) : (
                  <div className="flex flex-col gap-[6px]">
                    {row.movements.map((movement) => {
                      const adds =
                        movement.type === "ENTRADA" ||
                        (movement.type === "AJUSTE" && movement.quantity > 0);
                      const sign = adds ? "+" : "−";
                      return (
                        <div key={movement.id} className="flex items-baseline gap-2">
                          <span
                            className="text-[11.5px]"
                            style={{
                              color: adds
                                ? "var(--color-accent-300)"
                                : "var(--color-neutral-300)",
                            }}
                          >
                            {sign}
                            {formatQuantity(Math.abs(movement.quantity))}
                          </span>
                          <span className="text-[11.5px]">
                            {MOVEMENT_LABELS[movement.type] ?? movement.type}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--color-neutral-400)]">
                            {movement.reason}
                          </span>
                          <span className="text-[10.5px] text-[var(--color-neutral-400)]">
                            {movement.date} · {movement.user}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        );
      })}

      <p className="text-[11.5px] text-[var(--color-neutral-400)]">
        Cada venta descuenta vaso, hielo, pulpa y adiciones según la receta
        configurada en Productos y precios.
      </p>
    </div>
  );
}
