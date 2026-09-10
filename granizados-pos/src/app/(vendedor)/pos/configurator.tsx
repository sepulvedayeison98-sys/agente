"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ListChecks,
  Plus,
  PlusCircle,
  ShoppingCartSimple,
} from "@phosphor-icons/react";
import { addLine, useCart } from "@/components/vendedor/use-cart";
import { useToast } from "@/components/vendedor/toast";
import { cartCount, cartTotal, lineTitle } from "@/lib/cart";
import { formatCOP } from "@/lib/money";

export type CatalogSize = { id: string; name: string; price: number };
export type CatalogFlavor = { id: string; name: string; color: string | null };
export type CatalogAddon = { id: string; name: string; price: number };

export type Favorite = {
  sizeId: string;
  flavorId: string;
  addonIds: string[];
};

export type PromoOffer = Favorite & { name: string; discount: number };

type ConfiguratorProps = {
  sizes: CatalogSize[];
  flavors: CatalogFlavor[];
  addons: CatalogAddon[];
  favorites: Favorite[];
  promo: PromoOffer | null;
  // Selección precargada al editar una línea del carrito.
  initial: Favorite | null;
};

export function Configurator({
  sizes,
  flavors,
  addons,
  favorites,
  promo,
  initial,
}: ConfiguratorProps) {
  const router = useRouter();
  const { lines } = useCart();
  const toast = useToast();

  const [sizeId, setSizeId] = useState(initial?.sizeId ?? sizes[0]?.id ?? "");
  const [flavorId, setFlavorId] = useState(
    initial?.flavorId ?? flavors[0]?.id ?? "",
  );
  const [addonIds, setAddonIds] = useState<string[]>(initial?.addonIds ?? []);

  const size = sizes.find((s) => s.id === sizeId) ?? sizes[0];
  const flavor = flavors.find((f) => f.id === flavorId) ?? flavors[0];
  const selectedAddons = useMemo(
    () => addons.filter((a) => addonIds.includes(a.id)),
    [addons, addonIds],
  );

  const draftPrice = size
    ? size.price + selectedAddons.reduce((total, a) => total + a.price, 0)
    : 0;

  function describe(fav: Favorite) {
    const s = sizes.find((x) => x.id === fav.sizeId);
    const f = flavors.find((x) => x.id === fav.flavorId);
    const a = addons.filter((x) => fav.addonIds.includes(x.id));
    if (!s || !f) return null;
    return {
      size: s,
      flavor: f,
      addons: a,
      price: s.price + a.reduce((total, x) => total + x.price, 0),
    };
  }

  function add(fav: Favorite) {
    const detail = describe(fav);
    if (!detail) return;
    addLine({
      sizeId: detail.size.id,
      sizeName: detail.size.name,
      sizePrice: detail.size.price,
      flavorId: detail.flavor.id,
      flavorName: detail.flavor.name,
      addons: detail.addons.map((a) => ({
        id: a.id,
        name: a.name,
        price: a.price,
      })),
    });
    toast(
      "Agregado: " +
        lineTitle({
          id: "",
          sizeId: detail.size.id,
          sizeName: detail.size.name,
          sizePrice: detail.size.price,
          flavorId: detail.flavor.id,
          flavorName: detail.flavor.name,
          addons: [],
          quantity: 1,
        }),
    );
  }

  const promoDetail = promo ? describe(promo) : null;
  const count = cartCount(lines);
  const total = cartTotal(lines);

  // Lo seleccionado llevaba solo un borde tenue del color del acento: con sol
  // en el mostrador y el brillo bajo, no se distinguía de lo no seleccionado.
  // Relleno, borde y halo dicen lo mismo tres veces.
  const ring = (on: boolean) =>
    on
      ? "inset 0 0 0 1px var(--color-accent), 0 0 0 3px color-mix(in srgb, var(--color-accent) 20%, transparent)"
      : "inset 0 0 0 1px var(--color-divider)";
  const fg = (on: boolean) => (on ? "#ffffff" : "var(--color-text)");
  const bg = (on: boolean) =>
    on
      ? "color-mix(in srgb, var(--color-accent) 24%, var(--color-surface))"
      : "var(--color-surface)";

  // Poner las cinco adiciones era cinco toques. El botón las pone o las quita
  // de una, y cambia de nombre para que se sepa qué va a hacer al tocarlo.
  const allAddonsOn = addons.length > 0 && addonIds.length === addons.length;
  const addonsTotal = addons.reduce((total, option) => total + option.price, 0);

  return (
    // flex-1 para que el resumen, con mt-auto, caiga al pie de la pantalla en
    // vez de quedarse donde termine el contenido.
    <div className="flex flex-1 flex-col gap-[14px]">
      {promoDetail ? (
        <div
          className="flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-[11px]"
          style={{
            background:
              "linear-gradient(100deg, color-mix(in srgb, var(--color-brand-green) 16%, transparent), color-mix(in srgb, var(--color-accent) 20%, transparent) 62%, color-mix(in srgb, var(--color-brand-cyan) 16%, transparent))",
            boxShadow: "inset 0 0 0 1px var(--color-accent-700)",
          }}
        >
          {/* El emblema de la marca en vez de una estrella genérica: la promo
              del día es de la casa y se ve de quién es. */}
          <Image
            src="/logo-oasis-sm.png"
            alt=""
            width={132}
            height={98}
            className="h-[30px] w-auto flex-none"
          />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-[0.1em] text-[var(--color-brand-cyan)]">
              Promo del día
            </div>
            <div className="font-[family-name:var(--font-heading)] text-[15px] font-medium">
              {promo!.name}
            </div>
          </div>
          <div className="text-right">
            <div className="font-[family-name:var(--font-heading)] text-[16px]">
              {formatCOP(Math.max(0, promoDetail.price - promo!.discount))}
            </div>
            <div className="text-[10px] text-[var(--color-neutral-400)] line-through">
              {formatCOP(promoDetail.price)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => add(promo!)}
            aria-label="Agregar promo al carrito"
            className="pos-tap grid size-[38px] flex-none place-items-center rounded-[var(--radius-md)] border border-[var(--color-accent)] text-[var(--color-accent)]"
          >
            <Plus size={17} />
          </button>
        </div>
      ) : null}

      {favorites.length ? (
        <section>
          <h2 className="mb-2 text-[12px] font-medium text-[var(--color-neutral-400)]">
            Los más vendidos · un toque
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {favorites.map((fav, index) => {
              const detail = describe(fav);
              if (!detail) return null;
              return (
                <button
                  key={`${fav.sizeId}-${fav.flavorId}-${index}`}
                  type="button"
                  onClick={() => add(fav)}
                  className="pos-tap flex min-h-[64px] flex-col justify-between rounded-[var(--radius-md)] bg-[var(--color-surface)] px-[11px] py-[10px] text-left shadow-[var(--shadow-sm)]"
                >
                  <div className="font-[family-name:var(--font-heading)] text-[14px] font-medium leading-[1.15]">
                    {detail.flavor.name} {detail.size.name.toLowerCase()}
                  </div>
                  <div className="flex items-baseline justify-between gap-[6px]">
                    <span className="text-[10.5px] text-[var(--color-neutral-400)]">
                      {detail.addons.length
                        ? detail.addons.map((a) => a.name).join(" + ")
                        : "Sin adiciones"}
                    </span>
                    <span className="text-[13px] text-[var(--color-accent-300)]">
                      {formatCOP(detail.price)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="mb-2 text-[12px] font-medium text-[var(--color-neutral-400)]">
          Armar granizado
        </h2>

        <div className="grid grid-cols-4 gap-[6px]">
          {sizes.map((option) => {
            const on = option.id === sizeId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSizeId(option.id)}
                className="pos-tap rounded-[var(--radius-md)] px-1 py-[9px] text-center"
                style={{ boxShadow: ring(on), background: bg(on) }}
              >
                <div className="text-[11.5px]" style={{ color: fg(on) }}>
                  {option.name}
                </div>
                <div
                  className="mt-[2px] font-[family-name:var(--font-heading)] text-[13.5px]"
                  style={{ fontWeight: on ? 600 : 400 }}
                >
                  {formatCOP(option.price)}
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-2 grid grid-cols-3 gap-[6px]">
          {flavors.map((option) => {
            const on = option.id === flavorId;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setFlavorId(option.id)}
                className="pos-tap flex h-[50px] items-center justify-center gap-[7px] rounded-[var(--radius-md)] text-[13px]"
                style={{
                  boxShadow: ring(on),
                  color: fg(on),
                  background: bg(on),
                  fontWeight: on ? 600 : 400,
                }}
              >
                {/* El punto identifica el sabor de un vistazo cuando hay fila;
                    nunca indica estado, así que no compite con el acento. */}
                {option.color ? (
                  <span
                    aria-hidden
                    className="size-[9px] flex-none rounded-full"
                    style={{ background: option.color }}
                  />
                ) : null}
                {option.name}
              </button>
            );
          })}
        </div>

        {addons.length ? (
          <div className="mb-[6px] mt-[10px] flex items-center justify-between gap-3">
            <h3 className="text-[12px] font-medium text-[var(--color-neutral-400)]">
              Adiciones
            </h3>
            {addons.length > 1 ? (
              <button
                type="button"
                onClick={() =>
                  setAddonIds(allAddonsOn ? [] : addons.map((a) => a.id))
                }
                className="pos-tap flex flex-none items-center gap-[5px] rounded-[var(--radius-md)] px-[10px] py-[5px] text-[11.5px]"
                style={{
                  boxShadow: ring(allAddonsOn),
                  color: fg(allAddonsOn),
                  background: bg(allAddonsOn),
                  fontWeight: allAddonsOn ? 600 : 400,
                }}
              >
                <ListChecks size={14} />
                {allAddonsOn ? "Quitar todas" : "Todas"}
                {allAddonsOn ? null : (
                  <span className="text-[var(--color-neutral-400)]">
                    +{formatCOP(addonsTotal)}
                  </span>
                )}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-[6px]">
          {addons.map((option) => {
            const on = addonIds.includes(option.id);
            return (
              <button
                key={option.id}
                type="button"
                onClick={() =>
                  setAddonIds((current) =>
                    on
                      ? current.filter((id) => id !== option.id)
                      : [...current, option.id],
                  )
                }
                className="pos-tap flex items-center gap-[6px] rounded-[var(--radius-md)] px-[11px] py-2 text-[12.5px]"
                style={{
                  boxShadow: ring(on),
                  color: fg(on),
                  background: bg(on),
                  fontWeight: on ? 600 : 400,
                }}
              >
                {option.name}
                <span className="text-[11px] text-[var(--color-neutral-400)]">
                  +{formatCOP(option.price)}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {size && flavor ? (
        <div className="sticky bottom-0 -mx-4 mt-auto rounded-t-[var(--radius-lg)] border-t border-[var(--color-divider)] bg-[var(--color-surface)] px-4 pb-[11px] pt-[11px] shadow-[var(--shadow-lg)]">
          <div className="flex items-baseline justify-between gap-[10px]">
            <span className="text-[13px]">
              Granizado {size.name.toLowerCase()} · {flavor.name}
              {selectedAddons.length
                ? ` · ${selectedAddons.map((a) => a.name).join(" + ")}`
                : ""}
            </span>
            <span className="font-[family-name:var(--font-heading)] text-[19px]">
              {formatCOP(draftPrice)}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              add({ sizeId: size.id, flavorId: flavor.id, addonIds });
              setAddonIds([]);
            }}
            className="pos-tap mt-[10px] flex h-[50px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-accent)] font-[family-name:var(--font-heading)] text-[15px] font-medium tracking-[0.02em] text-[var(--color-accent)]"
            style={{
              background:
                "color-mix(in srgb, var(--color-accent) 12%, transparent)",
            }}
          >
            <PlusCircle size={18} />
            AGREGAR AL CARRITO
          </button>
        </div>
      ) : (
        <p className="text-[13px] text-[var(--color-neutral-400)]">
          No hay productos visibles. El administrador debe activar al menos un
          tamaño y un sabor.
        </p>
      )}

      {count > 0 ? (
        <button
          type="button"
          onClick={() => router.push("/carrito")}
          className="animate-rise-in pos-tap flex items-center gap-[10px] rounded-[var(--radius-md)] border border-[var(--color-accent)] px-[14px] py-3"
          style={{
            background: "color-mix(in srgb, var(--color-accent) 14%, transparent)",
          }}
        >
          <ShoppingCartSimple size={18} weight="fill" className="text-[var(--color-accent)]" />
          <span className="text-[13px]">{count} ítems</span>
          <span className="ml-auto font-[family-name:var(--font-heading)] text-[18px]">
            {formatCOP(total)}
          </span>
          <ArrowRight size={16} className="text-[var(--color-accent)]" />
        </button>
      ) : null}
    </div>
  );
}
