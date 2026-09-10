"use client";

import { useState, useTransition } from "react";
import { Key, PencilSimple, Plus, Prohibit, UserCheck } from "@phosphor-icons/react";
import type { Role } from "@/generated/prisma/enums";
import {
  changePin,
  createUser,
  setUserActive,
  updateUser,
} from "@/server/actions/users";

export type UserRow = {
  id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  sales: number;
  isMe: boolean;
};

const ROLES: { value: Role; label: string }[] = [
  { value: "VENDEDOR", label: "Vendedor" },
  { value: "ADMINISTRADOR", label: "Administrador" },
];

const input =
  "h-[42px] w-full rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 text-[14px] outline-none placeholder:text-[var(--color-neutral-600)]";
const inputRing = { boxShadow: "inset 0 0 0 1px var(--color-divider)" };
const label = "text-[11px] text-[var(--color-neutral-400)]";

export function UserManager({ rows }: { rows: UserRow[] }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [pinFor, setPinFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    name: "",
    username: "",
    pin: "",
    role: "VENDEDOR" as Role,
  });
  const [edit, setEdit] = useState({ name: "", role: "VENDEDOR" as Role });
  const [pin, setPin] = useState("");

  function closeAll() {
    setAdding(false);
    setEditing(null);
    setPinFor(null);
    setError(null);
    setNotice(null);
  }

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, after: string) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) return setError(result.error);
      closeAll();
      setNotice(after);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[13px] font-medium">Quién entra a la app</h2>
        <button
          type="button"
          onClick={() => {
            const open = adding;
            closeAll();
            if (!open) {
              setAdding(true);
              setForm({ name: "", username: "", pin: "", role: "VENDEDOR" });
            }
          }}
          className="pos-tap flex flex-none items-center gap-[6px] rounded-[var(--radius-md)] border border-[var(--color-accent)] px-[11px] py-[7px] text-[12px] text-[var(--color-accent)]"
        >
          <Plus size={14} />
          Nueva persona
        </button>
      </div>

      {notice ? (
        <p
          className="animate-rise-in rounded-[var(--radius-md)] px-3 py-2 text-[12px]"
          style={{
            color: "var(--color-success)",
            background: "color-mix(in srgb, var(--color-success) 12%, transparent)",
          }}
        >
          {notice}
        </p>
      ) : null}

      {adding ? (
        <div className="animate-rise-in rounded-[var(--radius-md)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-sm)]">
          <label className={label} htmlFor="nuevo-nombre">
            Nombre
          </label>
          <input
            id="nuevo-nombre"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej. Camila"
            className={`mb-2 mt-[4px] ${input}`}
            style={inputRing}
          />

          <label className={label} htmlFor="nuevo-usuario">
            Usuario para entrar
          </label>
          <input
            id="nuevo-usuario"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="camila"
            className={`mb-2 mt-[4px] ${input}`}
            style={inputRing}
          />

          <label className={label} htmlFor="nuevo-pin">
            PIN (4 a 6 dígitos)
          </label>
          <input
            id="nuevo-pin"
            value={form.pin}
            onChange={(e) =>
              setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })
            }
            inputMode="numeric"
            placeholder="1234"
            className={`mb-2 mt-[4px] ${input}`}
            style={inputRing}
          />

          <label className={label} htmlFor="nuevo-rol">
            Rol
          </label>
          <select
            id="nuevo-rol"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as Role })}
            className={`mt-[4px] ${input}`}
            style={inputRing}
          >
            {ROLES.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>

          {error ? (
            <p className="mt-[7px] text-[11.5px] text-[var(--color-danger)]">{error}</p>
          ) : null}

          <div className="mt-3 flex gap-[7px]">
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => createUser(form), `${form.name || "La persona"} ya puede entrar.`)}
              className="pos-tap grid h-[40px] flex-1 place-items-center rounded-[var(--radius-md)] border border-[var(--color-accent)] text-[13px] text-[var(--color-accent)] disabled:opacity-45"
              style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}
            >
              {pending ? "Creando…" : "Crear"}
            </button>
            <button
              type="button"
              onClick={closeAll}
              className="pos-tap grid h-[40px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] px-4 text-[13px]"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {rows.map((row) => (
        <div
          key={row.id}
          className="rounded-[var(--radius-md)] bg-[var(--color-surface)] px-[11px] py-[10px] shadow-[var(--shadow-sm)]"
          style={{ opacity: row.active ? 1 : 0.55 }}
        >
          <div className="flex items-center gap-[9px]">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-[6px] text-[14px]">
                {row.name}
                {row.isMe ? (
                  <span className="text-[10.5px] text-[var(--color-neutral-500)]">
                    (tú)
                  </span>
                ) : null}
                {!row.active ? (
                  <span
                    className="rounded-[var(--radius-sm)] px-[5px] py-px text-[9.5px] font-medium uppercase tracking-[0.08em]"
                    style={{
                      color: "var(--color-danger)",
                      background: "color-mix(in srgb, var(--color-danger) 16%, transparent)",
                    }}
                  >
                    inactivo
                  </span>
                ) : null}
              </div>
              <div className="text-[11px] text-[var(--color-neutral-400)]">
                {row.username} · {row.role === "ADMINISTRADOR" ? "Administrador" : "Vendedor"}
                {row.sales ? ` · ${row.sales} ventas` : ""}
              </div>
            </div>

            <button
              type="button"
              aria-label={`Cambiar el PIN de ${row.name}`}
              onClick={() => {
                const open = pinFor === row.id;
                closeAll();
                if (!open) {
                  setPinFor(row.id);
                  setPin("");
                }
              }}
              className="pos-tap grid size-[32px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] text-[var(--color-neutral-400)]"
            >
              <Key size={15} />
            </button>
            <button
              type="button"
              aria-label={`Editar ${row.name}`}
              onClick={() => {
                const open = editing === row.id;
                closeAll();
                if (!open) {
                  setEditing(row.id);
                  setEdit({ name: row.name, role: row.role });
                }
              }}
              className="pos-tap grid size-[32px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)]"
            >
              <PencilSimple size={15} />
            </button>
            <button
              type="button"
              aria-label={row.active ? `Desactivar a ${row.name}` : `Reactivar a ${row.name}`}
              disabled={pending || (row.isMe && row.active)}
              onClick={() =>
                run(
                  () => setUserActive({ userId: row.id, active: !row.active }),
                  row.active
                    ? `${row.name} ya no puede entrar.`
                    : `${row.name} puede entrar de nuevo.`,
                )
              }
              className="pos-tap grid size-[32px] flex-none place-items-center rounded-[var(--radius-md)] disabled:opacity-30"
              style={{
                color: row.active ? "var(--color-danger)" : "var(--color-success)",
                boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${
                  row.active ? "var(--color-danger)" : "var(--color-success)"
                } 45%, transparent)`,
              }}
            >
              {row.active ? <Prohibit size={15} /> : <UserCheck size={15} />}
            </button>
          </div>

          {editing === row.id ? (
            <div className="animate-rise-in mt-[10px] border-t border-[var(--color-divider)] pt-[10px]">
              <label className={label} htmlFor={`nombre-${row.id}`}>
                Nombre
              </label>
              <input
                id={`nombre-${row.id}`}
                value={edit.name}
                onChange={(e) => setEdit({ ...edit, name: e.target.value })}
                className={`mb-2 mt-[4px] ${input}`}
                style={inputRing}
              />
              <label className={label} htmlFor={`rol-${row.id}`}>
                Rol
              </label>
              <select
                id={`rol-${row.id}`}
                value={edit.role}
                onChange={(e) => setEdit({ ...edit, role: e.target.value as Role })}
                className={`mt-[4px] ${input}`}
                style={inputRing}
              >
                {ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>

              {error ? (
                <p className="mt-[7px] text-[11.5px] text-[var(--color-danger)]">{error}</p>
              ) : null}

              <div className="mt-[10px] flex gap-[7px]">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => updateUser({ userId: row.id, ...edit }),
                      "Los datos quedaron actualizados.",
                    )
                  }
                  className="pos-tap grid h-[38px] flex-1 place-items-center rounded-[var(--radius-md)] border border-[var(--color-accent)] text-[12.5px] text-[var(--color-accent)] disabled:opacity-45"
                  style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}
                >
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={closeAll}
                  className="pos-tap grid h-[38px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] px-3 text-[12.5px]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}

          {pinFor === row.id ? (
            <div className="animate-rise-in mt-[10px] border-t border-[var(--color-divider)] pt-[10px]">
              <label className={label} htmlFor={`pin-${row.id}`}>
                PIN nuevo (4 a 6 dígitos)
              </label>
              <input
                id={`pin-${row.id}`}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                autoComplete="off"
                placeholder="····"
                className={`mt-[4px] ${input}`}
                style={inputRing}
              />
              <p className="mt-[6px] text-[10.5px] leading-relaxed text-[var(--color-neutral-500)]">
                Al cambiarlo, {row.isMe ? "tu sesión" : `la sesión de ${row.name}`} se
                cierra de inmediato en todos los teléfonos donde esté abierta.
              </p>

              {error ? (
                <p className="mt-[7px] text-[11.5px] text-[var(--color-danger)]">{error}</p>
              ) : null}

              <div className="mt-[10px] flex gap-[7px]">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => changePin({ userId: row.id, pin }),
                      `PIN de ${row.name} cambiado.`,
                    )
                  }
                  className="pos-tap grid h-[38px] flex-1 place-items-center rounded-[var(--radius-md)] border border-[var(--color-accent)] text-[12.5px] text-[var(--color-accent)] disabled:opacity-45"
                  style={{ background: "color-mix(in srgb, var(--color-accent) 12%, transparent)" }}
                >
                  Cambiar PIN
                </button>
                <button
                  type="button"
                  onClick={closeAll}
                  className="pos-tap grid h-[38px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-divider)] px-3 text-[12.5px]"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ))}

      <p className="text-[11.5px] leading-relaxed text-[var(--color-neutral-400)]">
        A nadie se le borra: desactivar le quita la entrada y conserva sus ventas.
        Siempre tiene que quedar al menos un administrador activo, y no puedes
        desactivarte a ti mismo.
      </p>
    </div>
  );
}
