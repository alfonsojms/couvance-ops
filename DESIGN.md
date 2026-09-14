---
name: Kodex Ops Design System
description: Utilitarian high-contrast dark design system with 1px hairline borders and zero AI slop
colors:
  background: "#09090b"
  surface: "#121215"
  surface-hover: "#18181b"
  surface-elevated: "#27272a"
  border: "#27272a"
  border-subtle: "#1f1f23"
  text-primary: "#f4f4f5"
  text-secondary: "#a1a1aa"
  text-muted: "#71717a"
  accent-emerald: "#10b981"
  accent-emerald-subtle: "#064e3b"
  accent-amber: "#f59e0b"
  accent-amber-subtle: "#78350f"
  accent-rose: "#f43f5e"
  accent-rose-subtle: "#881337"
  accent-blue: "#3b82f6"
  accent-blue-subtle: "#1e3a8a"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
  title:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  mono:
    fontFamily: "JetBrains Mono, Menlo, Monaco, Courier New, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.text-primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-primary-hover:
    backgroundColor: "{colors.text-secondary}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-whatsapp:
    backgroundColor: "{colors.accent-emerald}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
---

# Design System — Kodex Ops

## Overview

Kodex Ops adopta una filosofía de diseño utilitaria, de autor y estrictamente anti-"AI slop". La herramienta está concebida para la velocidad operativa de 2 socios que gestionan cotizaciones y cobranzas desde escritorio y smartphones. El diseño rechaza sombras difusas excesivas, gradientes llamativos y radios gigantes, favoreciendo la precisión de bordes finos de 1px (`border-neutral-800`), contraste tipográfico alto y feedback táctil inmediato.

## Colors

- **Fondo Base (`background`):** `#09090b` (`bg-neutral-950`). Negro profundo para máxima legibilidad y ahorro de batería en pantallas OLED móviles.
- **Superficies (`surface` / `surface-elevated`):** `#121215` (`bg-neutral-900`) y `#27272a` (`bg-neutral-800`). Empleadas en tarjetas, modales y filas interactivas.
- **Bordes (`border` / `border-subtle`):** `#27272a` (`border-neutral-800`). Bordes geométricos de 1px que articulan la cuadrícula visual.
- **Tipografía Primaria (`text-primary`):** `#f4f4f5` (`text-neutral-100`).
- **Tipografía Secundaria (`text-secondary`):** `#a1a1aa` (`text-neutral-400`).
- **Acentos Semánticos:**
  - **Cobro / Aprobado / Éxito:** Esmeralda (`#10b981`, `bg-emerald-500/10 text-emerald-400 border-emerald-500/20`).
  - **Pendiente / Advertencia:** Ámbar (`#f59e0b`, `bg-amber-500/10 text-amber-400 border-amber-500/20`).
  - **Urgente / Vencido / Error:** Rosa/Rojo (`#f43f5e`, `bg-rose-500/10 text-rose-400 border-rose-500/20`).
  - **Informativo / Enlace:** Azul (`#3b82f6`, `text-blue-400`).

## Typography

- **Fuente Sans:** `Inter, -apple-system, sans-serif`. Usada para navegación, títulos, etiquetas de formularios y descripciones.
- **Fuente Mono:** `JetBrains Mono, Menlo, monospace`. Empleada en montos monetarios, porcentajes, fechas numéricas (YYYY-MM-DD), código y contraseñas numéricas (PIN).
- **Escala:**
  - `Display`: `1.875rem` (`text-3xl`), font-semibold, tracking-tight.
  - `Title`: `1.25rem` (`text-xl`), font-semibold.
  - `Body`: `0.875rem` (`text-sm`), font-normal.
  - `Caption / Mono`: `0.8125rem` (`text-xs`), font-medium.

## Layout

- **Estructura:** Layout denso de una sola columna fluida con ancho máximo `max-w-7xl` centrado, padding responsivo `p-4 sm:p-6`.
- **Navegación:** Barra fija superior `h-14` con borde inferior `border-neutral-800`, pestañas de acceso rápido (`Dashboard`, `Proyectos`, `Showcase`, `Clientes`) y botón de bloqueo.
- **Móvil Primero en Radar:** En pantallas menores a `640px`, las tarjetas del radar se transforman en bloques táctiles verticales donde el botón de cobro de WhatsApp abarca el ancho completo o se ancla al pulgar.

## Elevation & Depth

- **Sin sombras pesadas:** No se utilizan sombras difusas (`shadow-2xl`).
- **Separación Tonal:** La profundidad se logra exclusivamente mediante alternancia de fondo (`#09090b` &rarr; `#121215`), bordes de 1px (`#27272a`) y ligeros overlays traslúcidos en modales (`bg-black/80 backdrop-blur-sm`).

## Shapes

- **Radios:**
  - Botones y campos de entrada: `rounded-md` (`6px`).
  - Tarjetas y paneles: `rounded-lg` (`8px`).
  - Indicadores de estado (pills / badges): `rounded-full` (`9999px`).
  - Teclas del PIN: `rounded-xl` (`12px`) con altura mínima de `56px` para ergonomía táctil.

## Components

1. **NumericKeypad:** Teclado numérico 3x4 de alta respuesta, con teclas grandes $\ge$ 48px, indicador de 6 dígitos mediante puntos luminosos y feedback visual instantáneo.
2. **WhatsAppButton:** Botón verde esmeralda con icono de WhatsApp; genera `wa.me` si existe teléfono, o copia automáticamente el mensaje cordial al portapapeles con toast Sonner si no hay teléfono.
3. **StatusBadge:** Pastillas compactas con fondo al 10% de opacidad y borde fino correspondiente al estado (`PROSPECT`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`).
4. **Cotizador con Presets:** Interfaz de cálculo instantáneo con botones rápidos `[50 / 50]` y `[40 / 30 / 30]`, validación de 100% en tiempo real y botón de copiar resumen para el cliente.
5. **Radix Dialogs:** Modales accesibles con foco atrapado, escape para cerrar y transiciones nativas aceleradas por hardware.

## Do's and Don'ts

### Do's
- Mantener siempre bordes finos de 1px (`border-neutral-800`).
- Usar siempre `font-mono` para cifras monetarias, porcentajes e hitos de pago.
- Garantizar que cualquier botón interactivo en móvil tenga al menos `44x44px` de área de toque.
- Usar notificaciones minimalistas de Sonner para confirmar copias al portapapeles o cobros.

### Don'ts
- **PROHIBIDO usar Framer Motion** ni librerías pesadas de animación que degraden la agilidad móvil.
- No usar degradados multicolores ni sombras flotantes difusas.
- No omitir el fallback de copia al portapapeles cuando un cliente no tiene número de teléfono.
- No mostrar decimales en presupuestos ni en hitos de cobro (excepto recurrente).
