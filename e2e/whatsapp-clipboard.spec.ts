import { test, expect } from '@playwright/test';

// Helper reutilizable de autenticación
async function unlockApp(page: any, pin = '12345678') {
  await page.goto('/');
  if (await page.getByRole('button', { name: /Radar/i }).isVisible()) {
    return;
  }
  for (const digit of pin.split('')) {
    await page.getByRole('button', { name: `Dígito ${digit}` }).click();
  }
  await expect(page.getByRole('button', { name: /Radar/i })).toBeVisible();
}

test.describe('E2E Experto - RN-09: WhatsApp y Fallback de Portapapeles con Sonner', () => {
  test.beforeEach(async ({ page }) => {
    await unlockApp(page);
    await page.getByRole('button', { name: /Clientes/i }).click();
    await expect(page.getByRole('heading', { name: /Directorio de Clientes/i })).toBeVisible();
  });

  test('RN-09 (Fallback): Cliente sin teléfono debe copiar cordial mensaje al portapapeles y notificar con Sonner', async ({
    page,
    context,
  }) => {
    // 1. Concedemos permisos al navegador para leer y escribir en el portapapeles
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    const randomSuffix = Math.floor(Math.random() * 10000);
    const clientName = `Empresa Sin Teléfono ${randomSuffix}`;

    // 2. Creamos un cliente intencionalmente SIN teléfono
    await page.getByRole('button', { name: /Nuevo Cliente/i }).click();
    await page.getByPlaceholder('Ej: Estudio Jurídico Morales').fill(clientName);
    await page.getByPlaceholder('Ej: Carlos Morales').fill('Contacto Sin Móvil');
    // Dejamos el campo de teléfono completamente vacío
    await page.getByRole('button', { name: /Guardar Cliente/i }).click();

    // 3. Localizamos la tarjeta específica del nuevo cliente
    const clientCard = page.locator('.rounded-xl', {
      has: page.getByRole('heading', { name: clientName }),
    });
    await expect(clientCard).toBeVisible();

    // 4. Verificación de UI: Al no tener teléfono, el botón debe decir "Copiar Mensaje" (no "Abrir WhatsApp")
    const botonCopiar = clientCard.getByRole('button', { name: 'Copiar Mensaje' });
    await expect(botonCopiar).toBeVisible();

    // 5. El usuario hace clic en "Copiar Mensaje"
    await botonCopiar.click();

    // 6. Verificamos la notificación Toast de Sonner en pantalla
    const toastMensaje = page.getByText(
      /El cliente no tiene teléfono guardado/i
    );
    await expect(toastMensaje).toBeVisible();

    // 7. Inspeccionamos el contenido real del portapapeles del sistema operativo
    const portapapeles = await page.evaluate(() => navigator.clipboard.readText());
    expect(portapapeles).toContain(`Hola ${clientName}, te escribimos de Couvance`);
  });

  test('RN-09 (Directo): Cliente con teléfono debe abrir el enlace de wa.me en una nueva pestaña', async ({
    page,
  }) => {
    const randomSuffix = Math.floor(Math.random() * 10000);
    const clientName = `Empresa Con WhatsApp ${randomSuffix}`;
    const testPhone = '+18095557788';

    // 1. Creamos un cliente con teléfono válido
    await page.getByRole('button', { name: /Nuevo Cliente/i }).click();
    await page.getByPlaceholder('Ej: Estudio Jurídico Morales').fill(clientName);
    await page.getByPlaceholder('Ej: +5491123456789').fill(testPhone);
    await page.getByRole('button', { name: /Guardar Cliente/i }).click();

    // 2. Localizamos la tarjeta individual específica
    const clientCard = page.locator('.rounded-xl', {
      has: page.getByRole('heading', { name: clientName }),
    });
    await expect(clientCard).toBeVisible();

    // 3. Verificamos que el botón ahora diga "Abrir WhatsApp"
    const botonWhatsApp = clientCard.getByRole('button', { name: 'Abrir WhatsApp' });
    await expect(botonWhatsApp).toBeVisible();

    // 4. Preparamos la escucha para la apertura de la nueva pestaña (popup)
    const popupPromise = page.waitForEvent('popup');
    await botonWhatsApp.click();
    const popup = await popupPromise;

    // 5. Verificamos que la URL abierta corresponda a WhatsApp (wa.me o redirigido a api.whatsapp.com)
    const url = popup.url();
    expect(url).toContain('18095557788');
    expect(url).toContain('text=');
    expect(url).toMatch(/(?:wa\.me|whatsapp\.com)/);
  });
});
