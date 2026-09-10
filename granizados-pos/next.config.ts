import type { NextConfig } from "next";

/**
 * Cabeceras de seguridad. Vercel ya pone HSTS por su cuenta; lo que falta es
 * impedir que el POS se pueda embeber en otra página —un vendedor tocando
 * botones dentro del iframe de alguien más no notaría nada— y cerrar el
 * adivinado de tipos MIME.
 *
 * La CSP permite estilos en línea porque Next los inyecta, y `'unsafe-inline'`
 * en scripts porque el arranque de la app usa scripts en línea sin nonce. Es
 * más floja de lo ideal y aun así corta la carga de código de terceros, que es
 * de donde vendría el problema en una app sin publicidad ni analítica externa.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
