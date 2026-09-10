"use client";

import { useActionState, useState, startTransition } from "react";
import { LockSimple, SignIn } from "@phosphor-icons/react";
import { Keypad } from "@/components/ui/keypad";
import { login, type LoginState } from "@/server/actions/auth";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  function submit() {
    const data = new FormData();
    data.set("username", username);
    data.set("pin", pin);
    startTransition(() => formAction(data));
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-8 pt-16">
      <div className="mb-8 text-center">
        <div
          className="mx-auto grid size-[68px] place-items-center rounded-full border border-[var(--color-accent)]"
          style={{
            background: "color-mix(in srgb, var(--color-accent) 14%, transparent)",
          }}
        >
          <LockSimple size={28} className="text-[var(--color-accent)]" />
        </div>
        <h1 className="mt-4 font-[family-name:var(--font-heading)] text-[22px] font-medium">
          Granizados Oasis
        </h1>
        <p className="text-[12px] text-[var(--color-neutral-400)]">
          Ingresa con tu usuario y PIN
        </p>
      </div>

      <label className="mb-1 block text-[11px] text-[var(--color-neutral-400)]">
        Usuario
      </label>
      <input
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
        placeholder="tu usuario"
        className="mb-4 h-[46px] w-full rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 text-[15px] shadow-[var(--shadow-sm)] outline-none placeholder:text-[var(--color-neutral-600)]"
      />

      <label className="mb-1 block text-[11px] text-[var(--color-neutral-400)]">
        PIN
      </label>
      <div className="mb-4 flex h-[54px] items-center justify-center gap-3 rounded-[var(--radius-md)] bg-[var(--color-surface)] shadow-[var(--shadow-sm)]">
        {pin.length === 0 ? (
          <span className="text-[13px] text-[var(--color-neutral-600)]">
            Marca tu PIN
          </span>
        ) : (
          Array.from(pin).map((_, index) => (
            <span
              key={index}
              className="size-[10px] rounded-full bg-[var(--color-accent)]"
            />
          ))
        )}
      </div>

      <Keypad
        value={pin}
        onChange={setPin}
        maxLength={6}
        withTripleZero={false}
      />

      {state.error ? (
        <p className="animate-rise-in mt-4 rounded-[var(--radius-md)] bg-[var(--color-neutral-900)] px-3 py-2 text-center text-[12.5px]">
          {state.error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="pos-tap mt-5 flex h-[54px] items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-accent)] font-[family-name:var(--font-heading)] text-[16px] font-medium tracking-[0.03em] text-[var(--color-accent)] disabled:opacity-45"
        style={{
          background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
        }}
      >
        <SignIn size={19} />
        {pending ? "ENTRANDO…" : "ENTRAR"}
      </button>
    </div>
  );
}
