"use client";

import { useSyncExternalStore } from "react";

/**
 * Si el componente ya está andando en el navegador.
 *
 * Sirve para lo que solo puede hacerse cuando el JavaScript cargó de verdad,
 * sin romper lo que el servidor mandó: el HTML llega con el comportamiento de
 * respaldo y, en cuanto monta, se cambia al bueno.
 *
 * Va con `useSyncExternalStore` —el mismo patrón del carrito— y no con un
 * efecto que llame a `setState`: React avisa de renders en cascada, y aquí no
 * hay nada externo a lo que suscribirse, solo dos respuestas distintas según
 * quién pregunte.
 */
const sinSuscripcion = () => () => {};
const enElNavegador = () => true;
const enElServidor = () => false;

export function useHydrated(): boolean {
  return useSyncExternalStore(sinSuscripcion, enElNavegador, enElServidor);
}
