"use client";

import { useState, useTransition } from "react";
import { setSetting } from "@/server/actions/settings";
import type { SettingKey } from "@/server/settings";

type Row = {
  key: SettingKey;
  label: string;
  note: string;
  value: boolean;
};

export function SettingsList({ settings }: { settings: Row[] }) {
  const [rows, setRows] = useState(settings);
  const [pending, startTransition] = useTransition();

  function toggle(key: SettingKey) {
    const next = !rows.find((row) => row.key === key)?.value;
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, value: next } : row)),
    );

    startTransition(async () => {
      const result = await setSetting(key, next);
      if (!result.ok) {
        // Revierte si el servidor lo rechaza.
        setRows((current) =>
          current.map((row) =>
            row.key === key ? { ...row, value: !next } : row,
          ),
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-[7px]">
      {rows.map((row) => (
        <div
          key={row.key}
          className="flex items-center gap-[10px] rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 py-[11px] shadow-[var(--shadow-sm)]"
        >
          <div className="flex-1">
            <div className="text-[13px]">{row.label}</div>
            <div className="text-[11px] text-[var(--color-neutral-400)]">
              {row.note}
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={row.value}
            aria-label={row.label}
            disabled={pending}
            onClick={() => toggle(row.key)}
            className="pos-tap flex h-[24px] w-[42px] flex-none rounded-[12px] p-[2px]"
            style={{
              justifyContent: row.value ? "flex-end" : "flex-start",
              background: row.value
                ? "color-mix(in srgb, var(--color-accent) 26%, transparent)"
                : "transparent",
              boxShadow: `inset 0 0 0 1px ${row.value ? "var(--color-accent)" : "var(--color-divider)"}`,
            }}
          >
            <span
              className="size-[20px] rounded-full"
              style={{
                background: row.value
                  ? "var(--color-accent)"
                  : "var(--color-neutral-600)",
              }}
            />
          </button>
        </div>
      ))}

      <p className="mt-1 text-[11.5px] text-[var(--color-neutral-400)]">
        Auditoría: cada cambio de precio, ajuste de inventario y anulación queda
        registrado con usuario, fecha y valor anterior.
      </p>
    </div>
  );
}
