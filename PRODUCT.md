# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Los 2 socios/operadores de la agencia digital **Couvance**. No es un software multi-inquilino ni corporativo, sino una herramienta interna privada utilizada en dos escenarios clave: frente a la computadora (gestión de proyectos y cotizaciones) y en la calle desde el smartphone (cobranza inmediata por WhatsApp y consulta de tesorería).

## Product Purpose

Reemplazar notas dispersas, chats de mensajería y hojas de cálculo desactualizadas centralizando en tiempo real 4 necesidades críticas del día a día:
1. **Control de Proyectos y Clientes:** Acceso rápido a repositorios, enlaces de producción y carpetas de recursos.
2. **Presupuestación Ágil:** Cotizaciones en segundos con presets automáticos [50/50] y [40/30/30] con conciliación matemática exacta de residuos.
3. **Flujo de Caja y Cobranza Express:** Radar de cobros con botón WhatsApp (`wa.me`) y fallback al portapapeles, cobro total en 1 clic (*Pay-All*) y alertas de renovación de servicios recurrentes a 30 días.
4. **Showcase de Ventas:** Catálogo centralizado de proyectos terminados con enlaces activos para demostraciones instantáneas a prospectos.

## Positioning

Micro-ERP de alta velocidad y cero burocracia diseñado específicamente para la operativa de 2 socios, con costo de infraestructura $0 (Cloudflare Edge Serverless / SQLite WAL local), sin login engorroso de usuario/contraseña (PIN maestro de 6 dígitos recordado en dispositivo) y optimizado para la cobranza móvil con una sola mano.

## Operating Context

- **Entornos:** Escritorio (Chrome/Firefox/Safari) y smartphone móvil (navegadores móviles y apertura de enlaces compartidos desde WhatsApp).
- **Herramientas integradas:** WhatsApp Web / App (`wa.me`), portapapeles del sistema, enlaces a GitHub/GitLab y Google Drive/Dropbox.
- **Rituales:** Creación rápida de presupuestos en reuniones con clientes, cobranza de hitos en la calle al recibir transferencias bancarias, revisión preventiva de vencimientos de hosting/mantenimiento.

## Capabilities and Constraints

- **Acceso por PIN:** PIN numérico de 6 dígitos con teclado virtual y soporte de teclado físico; recuperación segura mediante 2 preguntas secretas. Sesión duradera (30 días, `SameSite=Lax`).
- **Reglas de Oro Contables:**
  - Presupuestos e hitos estrictamente enteros sin decimales; el último hito absorbe cualquier residuo fraccionario.
  - Suma de porcentajes de hitos exactamente 100%.
  - Aprobación en 1 clic atómica (Presupuesto &rarr; `APPROVED`, Proyecto &rarr; `IN_PROGRESS`, Hitos &rarr; `PENDING`).
  - Cobro express "Cobrar Todo" en un solo paso.
  - Cancelación no destructiva de proyectos: anula hitos pendientes pero preserva intactos los hitos pagados.
  - Clientes protegidos contra borrado accidental si tienen proyectos asociados (`409 Conflict`).
- **Restricciones Técnicas:** Prohibidas librerías pesadas de animación (sin Framer Motion); transiciones aceleradas por hardware en CSS nativo y Tailwind; bundle liviano y rendimiento < 1s.

## Brand Commitments

- **Estética de Autor Anti-"AI Slop":** Interfaz sobria, utilitaria y de alto contraste inspirada en herramientas de ingeniería y diseño contemporáneo.
- **Paleta Neutra y Bordes Finos:** Fondos oscuros (`neutral-950`), superficies elevadas (`neutral-900`/`neutral-850`), texto de alto contraste (`neutral-100`/`neutral-400`) y bordes nítidos de 1px (`border-neutral-800`).
- **Tipografía Limpia:** Sans-serif moderna y fuentes monospace para montos, porcentajes, fechas y códigos.
- **Feedback Minimalista:** Notificaciones discretas con Sonner y modales accesibles sin estilos prefabricados mediante Radix UI Primitives.

## Evidence on Hand

- `couvance-ops-functional-spec.md` (Especificación funcional completa del MVP).
- `couvance-ops-tech-spec.md` (Arquitectura técnica y modelo de datos relacional).
- `AGENTS.md` (Directrices del repositorio y reglas de negocio RN-01 a RN-10).
- Backend API totalmente funcional y testeado (Fases 1 y 2 completadas con paridad SQLite/D1 y 66 pruebas exitosas).

## Product Principles

1. **Cero Fricción Burocrática:** Sin formularios extensos ni campos fiscales obligatorios innecesarios; registrar un cliente o cotizar toma segundos.
2. **Cobro Directo y Móvil Primero:** El radar de cobros debe ser utilizable con una sola mano desde un smartphone en la calle, con apertura inmediata de WhatsApp o copia automática al portapapeles.
3. **Integridad y Verdad Contable:** Los números nunca mienten; ni un solo centavo de desfase ni pérdida de pagos históricos ante cancelaciones.
4. **Velocidad y Ligereza:** Sin pantallas de carga eternas ni efectos visuales innecesarios; cada acción responde al instante.

## Accessibility & Inclusion

- **Contraste:** Relación de contraste $\ge$ 4.5:1 en textos e indicadores de estado.
- **Objetivos Táctiles:** Teclas numéricas del PIN y botones de acción rápida con áreas táctiles mínimas de 44x44px en pantallas táctiles.
- **Navegación por Teclado:** Foco visible en inputs, modales Radix con trampa de foco y navegación accesible con teclado físico en el desbloqueo por PIN.
