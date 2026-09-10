import { combinationKey, lineKey, type CartLine } from "@/lib/cart";

const STORAGE_KEY = "granizados_cart";

export type CartSnapshot = {
  lines: CartLine[];
  hydrated: boolean;
};

const EMPTY: CartSnapshot = { lines: [], hydrated: false };

let snapshot: CartSnapshot = EMPTY;
let hydrationStarted = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function commit(lines: CartLine[]) {
  snapshot = { lines, hydrated: true };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Sin almacenamiento el carrito sigue vivo en memoria.
  }
  emit();
}

function hydrate() {
  let stored: CartLine[] = [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) stored = JSON.parse(raw) as CartLine[];
  } catch {
    // Un carrito ilegible no debe impedir vender.
  }
  snapshot = { lines: stored, hydrated: true };
  emit();
}

export function subscribe(listener: () => void) {
  if (!hydrationStarted) {
    hydrationStarted = true;
    // Diferido: el primer render del cliente debe coincidir con el del servidor.
    queueMicrotask(hydrate);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): CartSnapshot {
  return snapshot;
}

export function getServerSnapshot(): CartSnapshot {
  return EMPTY;
}

export function addLine(line: Omit<CartLine, "id" | "quantity">) {
  const key = combinationKey(
    line.sizeId,
    line.flavorId,
    line.addons.map((a) => a.id),
  );
  const current = snapshot.lines;
  const index = current.findIndex((l) => lineKey(l) === key);

  // La misma combinación sube cantidad en vez de abrir otra línea.
  if (index > -1) {
    commit(
      current.map((l, i) =>
        i === index ? { ...l, quantity: l.quantity + 1 } : l,
      ),
    );
    return;
  }

  commit([...current, { ...line, id: crypto.randomUUID(), quantity: 1 }]);
}

export function increment(id: string) {
  commit(
    snapshot.lines.map((l) =>
      l.id === id ? { ...l, quantity: l.quantity + 1 } : l,
    ),
  );
}

export function decrement(id: string) {
  commit(
    snapshot.lines.map((l) =>
      l.id === id ? { ...l, quantity: Math.max(1, l.quantity - 1) } : l,
    ),
  );
}

export function remove(id: string) {
  commit(snapshot.lines.filter((l) => l.id !== id));
}

export function clear() {
  commit([]);
}

export function findLine(id: string) {
  return snapshot.lines.find((l) => l.id === id) ?? null;
}
