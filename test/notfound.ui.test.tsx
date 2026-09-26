// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { NotFound } from '../src/client/src/pages/NotFound';

describe('UI & Interaction Testing - Interfaz Página 404 (NotFound)', () => {
  const mockOnNavigate = vi.fn();
  const mockOnGoToUnlock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockImplementation(() => Promise.resolve()),
      },
    });
  });

  it('TC-404-01: Debe renderizar elementos clave de la interfaz 404', () => {
    render(
      <NotFound
        onNavigate={mockOnNavigate}
        requestedPath="/cotizaciones/inexistente-123"
      />
    );

    // 1. Badge HTTP 404
    expect(screen.getByText(/HTTP 404 · RECURSO NO ENCONTRADO/i)).toBeInTheDocument();

    // 2. Número 404 grande y título
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Página o recurso inexistente')).toBeInTheDocument();

    // 3. Ruta solicitada en el panel terminal
    expect(screen.getByText('/cotizaciones/inexistente-123')).toBeInTheDocument();

    // 4. Botones de acción principales
    expect(screen.getByText('Radar de Cobros')).toBeInTheDocument();
    expect(screen.getByText('Proyectos')).toBeInTheDocument();
    expect(screen.getByText('Clientes')).toBeInTheDocument();
    expect(screen.getByText('Showcase')).toBeInTheDocument();
  });

  it('TC-404-02: Debe llamar a onNavigate al pulsar las opciones de navegación', () => {
    render(<NotFound onNavigate={mockOnNavigate} />);

    // Clic en Radar de Cobros
    fireEvent.click(screen.getByText('Radar de Cobros'));
    expect(mockOnNavigate).toHaveBeenCalledWith('dashboard');

    // Clic en Proyectos
    fireEvent.click(screen.getByText('Proyectos'));
    expect(mockOnNavigate).toHaveBeenCalledWith('projects');

    // Clic en Clientes
    fireEvent.click(screen.getByText('Clientes'));
    expect(mockOnNavigate).toHaveBeenCalledWith('clients');

    // Clic en Showcase
    fireEvent.click(screen.getByText('Showcase'));
    expect(mockOnNavigate).toHaveBeenCalledWith('showcase');
  });

  it('TC-404-03: Debe copiar la ruta al portapapeles al pulsar el botón Copiar', async () => {
    render(<NotFound requestedPath="/test-broken-url" />);

    const copyBtn = screen.getByTitle('Copiar ruta');
    expect(copyBtn).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(copyBtn);
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });

  it('TC-404-04: Debe alternar la visualización del panel de detalles técnicos', () => {
    render(<NotFound requestedPath="/diagnostico-test" />);

    const toggleBtn = screen.getByText('Detalles técnicos del error');
    expect(toggleBtn).toBeInTheDocument();

    // Inicialmente los detalles no se muestran
    expect(screen.queryByText(/Status:/i)).not.toBeInTheDocument();

    // Al hacer clic, se despliega el diagnóstico
    fireEvent.click(toggleBtn);
    expect(screen.getByText(/Status:/i)).toBeInTheDocument();
    expect(screen.getByText('404 Not Found')).toBeInTheDocument();

    // Al hacer clic nuevamente, se oculta
    fireEvent.click(toggleBtn);
    expect(screen.queryByText(/Status:/i)).not.toBeInTheDocument();
  });

  it('TC-404-05: En modo standalone con onGoToUnlock, debe mostrar botón para acceder con PIN', () => {
    render(
      <NotFound
        isStandalone={true}
        onGoToUnlock={mockOnGoToUnlock}
        requestedPath="/ruta-privada"
      />
    );

    const unlockBtn = screen.getByRole('button', {
      name: /Acceder a Couvance Ops \(Ingresar PIN\)/i,
    });
    expect(unlockBtn).toBeInTheDocument();

    fireEvent.click(unlockBtn);
    expect(mockOnGoToUnlock).toHaveBeenCalledTimes(1);
  });
});
