import { test, expect } from '@playwright/test';

// Helper reutilizable de autenticación para no repetir el tecleo de PIN en cada test
async function unlockApp(page: any, pin = '12345678') {
  await page.goto('/');
  // Si la app ya está desbloqueada en esta sesión, no re-teclear
  if (await page.getByRole('button', { name: /Radar/i }).isVisible()) {
    return;
  }
  for (const digit of pin.split('')) {
    await page.getByRole('button', { name: `Dígito ${digit}` }).click();
  }
  await expect(page.getByRole('button', { name: /Radar/i })).toBeVisible();
}

test.describe('E2E Avanzado - Formularios y Gestión de Clientes', () => {
  test.beforeEach(async ({ page }) => {
    // Antes de cada prueba, desbloqueamos y navegamos a la pestaña Clientes
    await unlockApp(page);
    await page.getByRole('button', { name: /Clientes/i }).click();
    await expect(page.getByRole('heading', { name: /Directorio de Clientes/i })).toBeVisible();
  });

  test('Debe abrir el modal, validar campos y crear un cliente exitosamente', async ({ page }) => {
    const randomSuffix = Math.floor(Math.random() * 10000);
    const clientName = `Bufete García & Asoc. ${randomSuffix}`;

    // 1. Abrir el modal de alta rápida
    await page.getByRole('button', { name: /Nuevo Cliente/i }).click();

    // 2. Verificar que el modal es visible y tiene su título accesible
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();
    await expect(page.getByRole('heading', { name: /Alta Rápida de Cliente/i })).toBeVisible();

    // 3. Llenar los campos del formulario usando selectores orientados al usuario (Placeholders)
    await page.getByPlaceholder('Ej: Estudio Jurídico Morales').fill(clientName);
    await page.getByPlaceholder('Ej: Carlos Morales').fill('Lic. Roberto García');
    await page.getByPlaceholder('Ej: +5491123456789').fill('+18095558899');
    await page.getByPlaceholder('contacto@empresa.com').fill(`contacto@garcia${randomSuffix}.com`);
    await page.getByPlaceholder('Observaciones de pago, horarios o requerimientos...').fill('Cliente corporativo preferencial para QA');

    // 4. Enviar el formulario haciendo clic en "Guardar Cliente"
    await page.getByRole('button', { name: /Guardar Cliente/i }).click();

    // 5. Aserción de interfaz: El modal debe cerrarse
    await expect(modal).not.toBeVisible();

    // 6. Aserción de datos: La nueva tarjeta del cliente debe aparecer en el directorio
    const clienteCard = page.locator('div', { hasText: clientName }).first();
    await expect(clienteCard).toBeVisible();
    await expect(page.getByText('Contacto: Lic. Roberto García')).toBeVisible();
    await expect(page.getByText('+18095558899')).toBeVisible();

    // 7. Aserción de componentes interactivos: El botón de WhatsApp debe estar listo
    await expect(page.getByRole('button', { name: /Abrir WhatsApp/i }).first()).toBeVisible();
  });

  test('Validación de Formulario: No debe permitir enviar si el nombre está vacío', async ({ page }) => {
    // 1. Abrir el modal
    await page.getByRole('button', { name: /Nuevo Cliente/i }).click();

    const inputNombre = page.getByPlaceholder('Ej: Estudio Jurídico Morales');
    
    // Verificamos que el input tiene el atributo HTML5 'required'
    await expect(inputNombre).toHaveAttribute('required', '');

    // 2. Intentar guardar sin haber ingresado nombre
    await page.getByRole('button', { name: /Guardar Cliente/i }).click();

    // 3. El modal NO debe cerrarse porque la validación del navegador / React bloquea el submit
    await expect(page.getByRole('dialog')).toBeVisible();

    // 4. Cancelar y cerrar el modal limpiamente
    await page.getByRole('button', { name: /Cancelar/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});
