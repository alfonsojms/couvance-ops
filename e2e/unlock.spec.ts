import { test, expect } from '@playwright/test';

test.describe('E2E - Flujo Crítico de Desbloqueo y Acceso al Sistema', () => {
  test('Debe cargar la pantalla de bloqueo y mostrar el teclado numérico', async ({ page }) => {
    // 1. Navegar a la página principal
    await page.goto('/');

    // 2. Comprobar que aparece el encabezado de Couvance Ops
    await expect(page.getByRole('heading', { name: 'Couvance Ops' })).toBeVisible();
    await expect(page.getByText(/Ingresa el PIN maestro de 8 dígitos/i)).toBeVisible();

    // 3. Comprobar que los botones del teclado numérico están listos
    await expect(page.getByRole('button', { name: 'Dígito 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dígito 0' })).toBeVisible();
  });

  test('Debe mostrar error si se ingresa un PIN incorrecto', async ({ page }) => {
    await page.goto('/');

    // Ingresar un PIN incorrecto (8 ceros)
    const botonCero = page.getByRole('button', { name: 'Dígito 0' });
    for (let i = 0; i < 8; i++) {
      await botonCero.click();
    }

    // Comprobar que la interfaz muestra el banner de error
    await expect(page.getByText(/PIN incorrecto/i)).toBeVisible();
  });

  test('Debe desbloquear la aplicación con el PIN maestro y permitir navegar', async ({ page }) => {
    await page.goto('/');

    // Ingresar el PIN maestro por defecto: 12345678
    const digitos = ['1', '2', '3', '4', '5', '6', '7', '8'];
    for (const d of digitos) {
      await page.getByRole('button', { name: `Dígito ${d}` }).click();
    }

    // Comprobar que la pantalla de bloqueo desaparece y se muestra la barra de navegación principal
    await expect(page.getByRole('button', { name: /Radar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Proyectos/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Clientes/i })).toBeVisible();

    // Simular que el usuario hace clic en la pestaña "Clientes"
    await page.getByRole('button', { name: /Clientes/i }).click();

    // Verificar que estamos en la sección de Clientes
    await expect(page.getByRole('heading', { name: /Directorio de Clientes/i })).toBeVisible();
  });
});
