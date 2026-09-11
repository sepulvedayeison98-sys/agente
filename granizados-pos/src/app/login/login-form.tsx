"use client";

import { useActionState, useState } from "react";
import Image from "next/image";
import { SignIn } from "@phosphor-icons/react";
import { Keypad } from "@/components/ui/keypad";
import { useHydrated } from "@/lib/use-hydrated";
import { login, type LoginState } from "@/server/actions/auth";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");

  /**
   * Salían los dos teclados a la vez: el de la pantalla y el del teléfono
   * encima, tapando media página.
   *
   * El campo del PIN es un input de verdad a propósito —así se puede entrar
   * aunque el JavaScript no alcance a cargar—, y al tocarlo el teléfono abre
   * el suyo. No se puede quitar en el HTML que llega del servidor sin perder
   * ese camino de respaldo, así que se quita solo cuando el teclado de la
   * pantalla ya está funcionando: hasta que el componente no monta en el
   * navegador, el campo se comporta como siempre.
   *
   * `readOnly` es lo que de verdad impide que el teléfono abra su teclado, y
   * no estorba el envío del formulario —a diferencia de `disabled`, un campo
   * de solo lectura sí manda su valor—. `inputMode="none"` va además porque
   * es lo que el estándar define para esto, pero no dependo solo de él.
   */
  const teclaPropia = useHydrated();
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    {},
  );

  return (
    // Formulario real con action del servidor: si el JavaScript no alcanza a
    // cargar en el teléfono, el navegador igual puede enviar usuario y PIN.
    <form
      action={formAction}
      // La puerta de entrada lleva el fondo y el cristal: es lo primero que se
      // ve del negocio, y de aquí sale tanto el vendedor como el administrador.
      className="oasis-glass mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-4 pb-8 pt-16"
    >
      <div aria-hidden className="oasis-ambient" />
      <div className="mb-7 text-center">
        {/* El logo es el neón de la marca: ya trae su propio resplandor, así
            que no lleva marco ni fondo que compitan con él. */}
        <Image
          src="/logo-oasis.png"
          alt="Granizados Oasis"
          width={440}
          height={469}
          priority
          className="mx-auto h-auto w-[186px]"
        />
        <p className="mt-3 text-[12px] text-[var(--color-neutral-400)]">
          Ingresa con tu usuario y PIN
        </p>
      </div>

      <label
        htmlFor="username"
        className="mb-1 block text-[11px] text-[var(--color-neutral-400)]"
      >
        Usuario
      </label>
      <input
        id="username"
        name="username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        autoCapitalize="none"
        autoCorrect="off"
        autoComplete="username"
        enterKeyHint="next"
        placeholder="tu usuario"
        className="mb-4 h-[46px] w-full rounded-[var(--radius-md)] bg-[var(--color-surface)] px-3 text-[15px] shadow-[var(--shadow-sm)] outline-none placeholder:text-[var(--color-neutral-600)]"
      />

      <label
        htmlFor="pin"
        className="mb-1 block text-[11px] text-[var(--color-neutral-400)]"
      >
        PIN
      </label>
      {/* Campo de verdad, no un div con puntitos: se puede marcar con el
          teclado del teléfono además de con el teclado de la pantalla. */}
      <input
        id="pin"
        name="pin"
        type="password"
        inputMode={teclaPropia ? "none" : "numeric"}
        readOnly={teclaPropia}
        autoComplete="current-password"
        enterKeyHint="go"
        maxLength={6}
        value={pin}
        onChange={(event) =>
          setPin(event.target.value.replace(/\D/g, "").slice(0, 6))
        }
        placeholder="Marca tu PIN"
        className="mb-4 h-[54px] w-full rounded-[var(--radius-md)] bg-[var(--color-surface)] text-center text-[20px] tracking-[0.4em] text-[var(--color-accent)] shadow-[var(--shadow-sm)] outline-none [text-indent:0.4em] placeholder:text-[13px] placeholder:tracking-normal placeholder:[text-indent:0] placeholder:text-[var(--color-neutral-600)]"
      />

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
        type="submit"
        disabled={pending}
        className="pos-tap mt-5 flex h-[54px] items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-accent)] font-[family-name:var(--font-heading)] text-[16px] font-medium tracking-[0.03em] text-[var(--color-accent)] disabled:opacity-45"
        style={{
          background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
        }}
      >
        <SignIn size={19} />
        {pending ? "ENTRANDO…" : "ENTRAR"}
      </button>
    </form>
  );
}
