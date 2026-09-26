---
name: Couvance Ops Design System
description: Utilitarian high-contrast dark monochrome design system with Couvance Electric Blue (#004BFF) and Electric Lime (#BDEF00) surgical brand highlights
colors:
  background: "#09090b"
  surface: "#111115"
  surface-hover: "#18181d"
  surface-elevated: "#222228"
  border: "#27272a"
  border-subtle: "#1f1f23"
  text-primary: "#ffffff"
  text-secondary: "#a1a1aa"
  text-muted: "#71717a"
  couvance-blue: "#004BFF"
  couvance-blue-subtle: "rgba(0, 75, 255, 0.15)"
  couvance-blue-border: "rgba(0, 75, 255, 0.35)"
  couvance-lime: "#BDEF00"
  couvance-lime-subtle: "rgba(189, 239, 0, 0.15)"
  couvance-lime-border: "rgba(189, 239, 0, 0.35)"
  accent-amber: "#f59e0b"
  accent-amber-subtle: "#78350f"
  accent-rose: "#f43f5e"
  accent-rose-subtle: "#881337"
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
  xl: "12px"
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
  button-couvance:
    backgroundColor: "{colors.couvance-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-lime:
    backgroundColor: "{colors.couvance-lime}"
    textColor: "#000000"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-whatsapp:
    backgroundColor: "#25D366"
    textColor: "#000000"
    rounded: "{rounded.md}"
    padding: "8px 16px"
---

# Design System — Couvance Ops (Redesign)

## Overview

Couvance Ops implementa un rediseño de autor sobrio, utilitario y de altísima fidelidad visual. Ante el desafío de incorporar los colores vibrantes de marca de Couvance —**Azul Eléctrico Real (`#004BFF`)** y **Lima Eléctrico (`#BDEF00`)**— la arquitectura visual establece un lienzo base **monocromático en blanco y negro** (negro profundo OLED, superficies de carbón templado, bordes nítidos de 1px y tipografía en blanco puro). Sobre este cimiento sobrio y elegante, los dos colores de marca intervienen de forma quirúrgica para destacar estados operativos, jerarquía financiera y presencia de marca sin generar fatiga visual ni saturación tipo "arcoíris".

## Identity & Brand Assets

- **Logotipo Oficial (`/logo-couvance.png`):** Emblema geométrico de 800x800px compuesto por un campo azul eléctrico `#004BFF` y una cruz central de 4 ángulos dinámicos en `#BDEF00`.
- **Favicon & Web App Icon:** Integrado en la cabecera HTML y visible en pestañas de navegador y accesos directos en smartphones.
- **Navbar & Unlock Badge:** Presentado en contenedor con radio curvado de 12px, borde eléctrico de 1px y sutil halo ambiental azul (`shadow-[0_0_15px_rgba(0,75,255,0.3)]`).

## Colors

- **Fondo Base (`background`):** `#09090b` (`bg-neutral-950`). Negro profundo para máxima legibilidad y eficiencia en pantallas OLED móviles.
- **Superficies (`surface` / `surface-elevated`):** `#111115` y `#18181d`. Empleadas en tarjetas, modales y filas interactivas.
- **Bordes Hairline (`border`):** `#27272a` (`border-neutral-800`). Cuadrícula visual nítida de 1px sin difuminados pesados.
- **Tipografía Primaria (`text-primary`):** `#ffffff` (`text-white`).
- **Tipografía Secundaria (`text-secondary`):** `#a1a1aa` (`text-neutral-400`).
- **Acentos de Marca Quirúrgicos:**
  - **Couvance Electric Blue (`#004BFF`):**
    - Pestaña de navegación activa en el Navbar (borde y resplandor sutil).
    - Proyectos en estado `IN_PROGRESS` (badge e indicador).
    - Anillos de foco accesible (`focus-visible:ring-[#004BFF]`).
    - Enlaces de producción y repositorios en el catálogo de Showcase.
  - **Couvance Electric Lime (`#BDEF00`):**
    - Indicador "EN VIVO" con punto pulsante en el Radar de Tesorería.
    - Indicadores luminosos del teclado numérico PIN de 8 dígitos al ingresar números.
    - Cifra y métrica de "Total Cobrado (Histórico)".
    - Estados `COMPLETED`, `PAID` y `ACTIVE`.
    - Botones de aprobación inmediata de presupuestos y confirmación de cobros.
  - **Tesorería / Alertas:**
    - **Total en la Calle / Pendiente:** Ámbar (`#f59e0b`, `bg-amber-500/10 text-amber-300 border-amber-500/20`).
    - **Urgente / Vencido / Error:** Rosa/Rojo (`#f43f5e`, `bg-rose-500/10 text-rose-300 border-rose-500/20`).
  - **WhatsApp Oficial:** `#25D366` para el botón de cobro express y apertura de `wa.me`.

## Typography

- **Fuente Sans:** `Inter, -apple-system, sans-serif`. Usada para navegación, títulos, etiquetas de formularios y descripciones.
- **Fuente Mono:** `JetBrains Mono, Menlo, monospace`. Empleada en cifras monetarias, porcentajes, fechas numéricas (YYYY-MM-DD), código y contraseñas numéricas (PIN).

## Layout & Ergonomía Móvil

- **Estructura:** Layout denso con ancho máximo `max-w-7xl` centrado, padding responsivo `p-4 sm:p-6`.
- **Navegación Fija:** Barra superior `h-14` con borde inferior `border-neutral-800`, pestañas de acceso rápido (`Radar`, `Proyectos`, `Showcase`, `Clientes`), botón de descarga de respaldo JSON y bloqueo rápido.
- **Móvil Primero en Radar:** En pantallas menores a `640px`, las tarjetas del radar se transforman en bloques táctiles verticales donde el botón de cobro de WhatsApp abarca el ancho completo o se ancla al pulgar ($\ge 44\text{px}$).

## Components

1. **Brand Navbar:** Logo oficial Couvance en alta resolución con borde eléctrico `#004BFF`, tipografía en blanco de alto contraste y pestañas activas destacadas con precisión geométrica.
2. **PIN Unlock Screen:** Emblema Couvance de 64x64px con indicador de candado en lima eléctrico `#BDEF00`.
3. **NumericKeypad:** Teclado táctil 3x4 donde los 8 dígitos iluminan pastillas en verde lima eléctrico `#BDEF00` con resplandor neón sutil, brindando retroalimentación táctil de grado militar.
4. **Treasury Radar:** Tarjeta reina de "Total en la Calle", panel de "Total Cobrado" en verde lima y "Proyectos Activos" en azul eléctrico, con botón de WhatsApp y fallback al portapapeles.
5. **Cotizador con Presets:** Interfaz de cálculo instantáneo con botones rápidos `[50 / 50]`, `[40 / 30 / 30]` y `[100%]`, validación de 100% en tiempo real y aprobación en 1 clic.
