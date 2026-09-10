"use client";

import { useSyncExternalStore } from "react";
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type CartSnapshot,
} from "@/lib/cart-store";

export {
  addLine,
  clear,
  decrement,
  findLine,
  increment,
  remove,
} from "@/lib/cart-store";

export function useCart(): CartSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
