// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Unlock } from '../src/client/src/pages/Unlock';
import { api } from '../src/client/src/lib/api';

describe('QA - Nivel 4: UI & Interaction Testing (Pantalla de Desbloqueo)', () => {
  const mockOnUnlockSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-UI-01: Debe renderizar la pantalla inicial con el título, indicadores en 0 y botones numéricos', () => {
    render(<Unlock onUnlockSuccess={mockOnUnlockSuccess} />);

    // 1. Verificamos elementos clave de la interfaz desde los ojos del usuario
    expect(screen.getByText('Couvance Ops')).toBeInTheDocument();
    expect(
      screen.getByText(/Ingresa el PIN maestro de 8 dígitos/i)
    ).toBeInTheDocument();

    // 2. Verificamos que los 8 dígitos inicien vacíos (0 de 8)
    expect(screen.getByLabelText('0 de 8 dígitos ingresados')).toBeInTheDocument();

    // 3. Verificamos que los botones del 0 al 9 estén presentes en el DOM
    for (let i = 0; i <= 9; i++) {
      expect(
        screen.getByRole('button', { name: new RegExp(`Dígito ${i}`, 'i') })
      ).toBeInTheDocument();
    }
  });

  it('TC-UI-02: Debe reflejar el progreso de los dígitos al hacer clic en el teclado numérico', () => {
    render(<Unlock onUnlockSuccess={mockOnUnlockSuccess} />);

    // Hacemos clic en los dígitos '1', '2', '3'
    fireEvent.click(screen.getByRole('button', { name: /Dígito 1/i }));
    fireEvent.click(screen.getByRole('button', { name: /Dígito 2/i }));
    fireEvent.click(screen.getByRole('button', { name: /Dígito 3/i }));

    // El contador de accesibilidad y estado visual debe indicar 3 dígitos ingresados
    expect(screen.getByLabelText('3 de 8 dígitos ingresados')).toBeInTheDocument();
  });

  it('TC-UI-03: Debe permitir borrar el último dígito o limpiar todo el PIN', () => {
    render(<Unlock onUnlockSuccess={mockOnUnlockSuccess} />);

    const botonUno = screen.getByRole('button', { name: /Dígito 1/i });
    const botonRetroceso = screen.getByRole('button', {
      name: /Retroceso \/ Borrar último dígito/i,
    });
    const botonLimpiar = screen.getByRole('button', {
      name: /Borrar todo el PIN/i,
    });

    // Ingresamos 2 dígitos
    fireEvent.click(botonUno);
    fireEvent.click(botonUno);
    expect(screen.getByLabelText('2 de 8 dígitos ingresados')).toBeInTheDocument();

    // Borramos 1 dígito con retroceso
    fireEvent.click(botonRetroceso);
    expect(screen.getByLabelText('1 de 8 dígitos ingresados')).toBeInTheDocument();

    // Limpiamos todo
    fireEvent.click(botonLimpiar);
    expect(screen.getByLabelText('0 de 8 dígitos ingresados')).toBeInTheDocument();
  });

  it('TC-UI-04 (Negativo): Debe mostrar alerta visual de error en pantalla si el PIN es incorrecto', async () => {
    // Simulamos que el backend rechaza el PIN con un error 401
    vi.spyOn(api, 'post').mockRejectedValueOnce(new Error('PIN incorrecto. Intente nuevamente.'));

    render(<Unlock onUnlockSuccess={mockOnUnlockSuccess} />);

    // El usuario teclea 8 ceros '00000000'
    const botonCero = screen.getByRole('button', { name: /Dígito 0/i });
    for (let i = 0; i < 8; i++) {
      fireEvent.click(botonCero);
    }

    // Esperamos a que la UI procese la respuesta asíncrona y pinte el error
    await waitFor(() => {
      expect(
        screen.getByText(/PIN incorrecto. Intente nuevamente./i)
      ).toBeInTheDocument();
    });

    // Verificamos que NO se haya llamado a onUnlockSuccess
    expect(mockOnUnlockSuccess).not.toHaveBeenCalled();

    // La interfaz debe resetear los dígitos tras el fallo
    expect(screen.getByLabelText('0 de 8 dígitos ingresados')).toBeInTheDocument();
  });

  it('TC-UI-05 (Positivo): Debe llamar a onUnlockSuccess cuando se ingresa el PIN correcto', async () => {
    // Simulamos que el backend responde exitosamente
    vi.spyOn(api, 'post').mockResolvedValueOnce({ ok: true, message: 'Acceso autorizado.' });

    render(<Unlock onUnlockSuccess={mockOnUnlockSuccess} />);

    // El usuario teclea '12345678'
    const digitos = ['1', '2', '3', '4', '5', '6', '7', '8'];
    for (const d of digitos) {
      fireEvent.click(screen.getByRole('button', { name: new RegExp(`Dígito ${d}`, 'i') }));
    }

    // Verificamos que la API haya sido llamada con el PIN exacto
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/api/auth/unlock', {
        pin: '12345678',
      });
    });

    // Verificamos que la función de éxito de desbloqueo haya sido ejecutada
    expect(mockOnUnlockSuccess).toHaveBeenCalledTimes(1);
  });
});
