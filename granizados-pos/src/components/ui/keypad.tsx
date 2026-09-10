"use client";

import { Backspace } from "@phosphor-icons/react";

type KeypadProps = {
  value: string;
  onChange: (next: string) => void;
  maxLength?: number;
  withTripleZero?: boolean;
  keyHeight?: number;
};

export function Keypad({
  value,
  onChange,
  maxLength = 8,
  withTripleZero = true,
  keyHeight = 46,
}: KeypadProps) {
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const bottomKey = withTripleZero ? "000" : "";

  function press(key: string) {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    onChange((value + key).slice(0, maxLength));
  }

  return (
    <div className="grid grid-cols-3 gap-[6px]">
      {[...keys, bottomKey, "0", "⌫"].map((key, index) => (
        <button
          key={`${key}-${index}`}
          type="button"
          disabled={key === ""}
          onClick={() => press(key)}
          style={{ height: keyHeight }}
          className="pos-tap grid place-items-center rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)] font-[family-name:var(--font-heading)] text-[18px] disabled:opacity-0"
        >
          {key === "⌫" ? <Backspace size={20} /> : key}
        </button>
      ))}
    </div>
  );
}
