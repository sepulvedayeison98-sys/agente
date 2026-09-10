"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { SignOut } from "@phosphor-icons/react";
import { logout } from "@/server/actions/auth";
import { clear as clearCart } from "@/lib/cart-store";

/**
 * Cierra la sesión. Pide confirmación con un segundo toque: en el mostrador el
 * teléfono se roza todo el tiempo y salir por accidente bota la venta a medias.
 */
export function LogoutButton() {
  const [armed, setArmed] = useState(false);
  const disarm = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (disarm.current) clearTimeout(disarm.current);

    if (!armed) {
      event.preventDefault();
      setArmed(true);
      disarm.current = setTimeout(() => setArmed(false), 4000);
      return;
    }

    // El carrito vive en el navegador: si no se borra, el siguiente turno
    // arranca con la venta a medias del anterior.
    clearCart();
  }

  // Formulario de verdad: salir funciona aunque el JavaScript no haya cargado.
  return (
    <form action={logout} onSubmit={handleSubmit} className="flex-none">
      <SubmitButton armed={armed} />
    </form>
  );
}

function SubmitButton({ armed }: { armed: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={armed ? "Confirmar salida" : "Salir"}
      className="pos-tap flex items-center gap-[6px] rounded-[var(--radius-md)] border px-[10px] py-[5px] text-[11px] disabled:opacity-45"
      style={{
        // Armado: el mismo acento del resto de la app pero relleno, para que
        // se note que el siguiente toque sí hace algo.
        borderColor: armed ? "var(--color-accent)" : "var(--color-divider)",
        background: armed
          ? "color-mix(in srgb, var(--color-accent) 16%, transparent)"
          : undefined,
        color: armed ? "var(--color-accent)" : undefined,
      }}
    >
      <SignOut size={13} className="text-[var(--color-accent)]" />
      {pending ? "Saliendo…" : armed ? "¿Salir?" : "Salir"}
    </button>
  );
}
