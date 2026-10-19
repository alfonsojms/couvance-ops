import { test, expect, type Page } from '@playwright/test';

async function unlockApp(page: Page, pin = '12345678') {
  await page.goto('/');
  if (await page.getByRole('button', { name: /Radar/i }).isVisible()) {
    return;
  }
  for (const digit of pin.split('')) {
    await page.getByRole('button', { name: `Dígito ${digit}` }).click();
  }
  await expect(page.getByRole('button', { name: /Radar/i })).toBeVisible();
}

test.describe('E2E — Workflow de Alta Inline, Soft Edit y Cotización Encadenada', () => {
  test.beforeEach(async ({ page }) => {
    await unlockApp(page);
  });

  test('Debe permitir editar un cliente existente desde su tarjeta', async ({ page }) => {
    await page.getByRole('button', { name: /Clientes/i }).click();
    await expect(page.getByRole('heading', { name: /Directorio de Clientes/i })).toBeVisible();

    const randomSuffix = Math.floor(Math.random() * 10000);
    const initialName = `Cliente Test ${randomSuffix}`;

    // Creamos cliente si no existe ninguno
    await page.getByRole('button', { name: /Nuevo Cliente/i }).click();
    await page.getByPlaceholder('Ej: Estudio Jurídico Morales').fill(initialName);
    await page.getByPlaceholder('Ej: +5491123456789').fill('+18095551111');
    await page.getByRole('button', { name: /Guardar Cliente/i }).click();

    // El botón lleva aria-label "Editar cliente <nombre>", así que se identifica de forma exacta.
    const clientHeading = page.getByRole('heading', { name: initialName, exact: true });
    const editButton = page.getByRole('button', { name: `Editar cliente ${initialName}`, exact: true });
    await expect(clientHeading).toBeVisible();

    await editButton.click();

    // Verificamos modal de edición
    const editModal = page.getByRole('dialog');
    await expect(editModal).toBeVisible();
    await expect(page.getByRole('heading', { name: /Editar Cliente/i })).toBeVisible();

    // Actualizamos teléfono
    const phoneInput = page.getByPlaceholder('Ej: +5491123456789');
    await phoneInput.fill('+18095552222');
    await page.getByRole('button', { name: /Guardar Cambios/i }).click();

    await expect(editModal).not.toBeVisible();
    // El contenedor más interno con el nombre del cliente y el teléfono nuevo es su tarjeta.
    const updatedCard = page.locator('div').filter({ has: clientHeading }).filter({ hasText: '+18095552222' }).last();
    await expect(updatedCard).toBeVisible();
    await expect(updatedCard).not.toContainText('+18095551111');
  });

  test('Flujo completo: Crear cliente inline -> Crear proyecto -> Encadenar cotización desde Toast -> Soft edit', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Proyectos/i }).click();
    await expect(page.getByRole('heading', { name: /Control de Proyectos/i })).toBeVisible();

    const randomSuffix = Math.floor(Math.random() * 10000);
    const inlineClientName = `Cliente Inline ${randomSuffix}`;
    const projectTitle = `Web Corporativa E2E ${randomSuffix}`;

    // 1. Abrimos el modal de Nuevo Proyecto
    await page.getByRole('button', { name: /Nuevo Proyecto/i }).click();
    const projectModal = page.getByRole('dialog');
    await expect(projectModal).toBeVisible();

    // 2. Usamos "Crear cliente inline"
    await page.getByRole('button', { name: /Crear cliente inline/i }).click();

    // El modal de cliente aparece
    const clientModal = page.getByRole('dialog').filter({ hasText: /Alta Rápida de Cliente/i });
    await expect(clientModal).toBeVisible();

    await clientModal.getByPlaceholder('Ej: Estudio Jurídico Morales').fill(inlineClientName);
    await clientModal.getByRole('button', { name: /Guardar Cliente/i }).click();

    // El modal de cliente se cierra y volvemos al de proyecto
    await expect(clientModal).not.toBeVisible();

    // 3. Completamos datos del proyecto
    await page.getByPlaceholder('Ej: Rediseño Web Corporativa').fill(projectTitle);
    await page.getByPlaceholder('https://ejemplo.com').fill('https://couvance-test.com');
    await page.getByRole('button', { name: /Crear Proyecto/i }).click();

    // 4. El modal de proyecto se cierra y aparece el Toast con "Crear cotización"
    await expect(projectModal).not.toBeVisible();
    const toastAction = page.getByRole('button', { name: /Crear cotización/i });
    await expect(toastAction).toBeVisible();

    // 5. Pulsamos "Crear cotización" desde el Toast
    await toastAction.click();

    // Se abre el modal de cotizaciones para el proyecto creado
    const budgetModal = page.getByRole('dialog').filter({ hasText: new RegExp(`Cotizaciones — ${projectTitle}`, 'i') });
    await expect(budgetModal).toBeVisible();

    // Cerramos el modal de cotizaciones
    await page.keyboard.press('Escape');
    await expect(budgetModal).not.toBeVisible();

    // 6. Probamos Soft Edit desde la tarjeta del proyecto
    const editProjectButton = page.getByRole('button', { name: `Editar proyecto ${projectTitle}`, exact: true });
    await expect(editProjectButton).toBeVisible();

    await editProjectButton.click();

    const editProjModal = page.getByRole('dialog').filter({ hasText: /Editar Proyecto/i });
    await expect(editProjModal).toBeVisible();

    // Cliente debe estar deshabilitado
    const clientDisabledInput = editProjModal.getByLabel(/Cliente Asociado/i);
    await expect(clientDisabledInput).toBeDisabled();

    // Modificamos URL de producción
    const prodInput = editProjModal.getByPlaceholder('https://ejemplo.com');
    await prodInput.fill('https://couvance-updated.com');

    await editProjModal.getByRole('button', { name: /Guardar Cambios/i }).click();
    await expect(editProjModal).not.toBeVisible();
  });
});
