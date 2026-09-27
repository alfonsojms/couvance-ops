// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Navbar, NavTab } from '../src/client/src/components/Navbar';

describe('UI & Responsive Testing - Navbar & Mobile Navigation', () => {
  const mockOnTabChange = vi.fn();
  const mockOnLock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('TC-RESP-01: Debe renderizar tanto la barra principal como la navegación móvil accesible con una sola mano', () => {
    render(
      <Navbar currentTab="dashboard" onTabChange={mockOnTabChange} onLock={mockOnLock} />
    );

    // 1. Verificamos presencia de marca
    expect(screen.getByText('Couvance')).toBeInTheDocument();
    expect(screen.getByText('Ops')).toBeInTheDocument();

    // 2. Verificamos la navegación principal (desktop) y la móvil
    const mainNav = screen.getByRole('navigation', { name: /Navegación principal/i });
    const mobileNav = screen.getByRole('navigation', { name: /Navegación móvil/i });
    expect(mainNav).toBeInTheDocument();
    expect(mobileNav).toBeInTheDocument();

    // 3. Verificamos que contengan los 4 accesos: Radar, Proyectos, Showcase, Clientes
    const radarButtons = screen.getAllByRole('button', { name: /Radar/i });
    expect(radarButtons.length).toBeGreaterThanOrEqual(2); // desktop + mobile

    const projectsButtons = screen.getAllByRole('button', { name: /Proyectos/i });
    expect(projectsButtons.length).toBeGreaterThanOrEqual(2);

    const showcaseButtons = screen.getAllByRole('button', { name: /Showcase/i });
    expect(showcaseButtons.length).toBeGreaterThanOrEqual(2);

    const clientsButtons = screen.getAllByRole('button', { name: /Clientes/i });
    expect(clientsButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('TC-RESP-02: Debe llamar a onTabChange al seleccionar un ítem en móvil o desktop', () => {
    render(
      <Navbar currentTab="dashboard" onTabChange={mockOnTabChange} onLock={mockOnLock} />
    );

    const mobileNav = screen.getByRole('navigation', { name: /Navegación móvil/i });
    const proyectosBtn = mobileNav.querySelector('button:nth-child(2)');
    expect(proyectosBtn).not.toBeNull();

    if (proyectosBtn) {
      fireEvent.click(proyectosBtn);
      expect(mockOnTabChange).toHaveBeenCalledWith('projects');
    }
  });

  it('TC-RESP-03: Botones de acción rápida poseen accesibilidad y touch targets', () => {
    render(
      <Navbar currentTab="dashboard" onTabChange={mockOnTabChange} onLock={mockOnLock} />
    );

    const backupBtn = screen.getByRole('button', { name: /Descargar respaldo JSON/i });
    const securityBtn = screen.getByRole('button', { name: /Seguridad y PIN maestro/i });
    const lockBtn = screen.getByRole('button', { name: /Bloquear sesión/i });

    expect(backupBtn).toBeInTheDocument();
    expect(securityBtn).toBeInTheDocument();
    expect(lockBtn).toBeInTheDocument();

    // Disparar bloqueo
    fireEvent.click(lockBtn);
    expect(mockOnLock).toHaveBeenCalled();
  });

  it('TC-RESP-04: Al pulsar Seguridad, abre el modal cargado dinámicamente', async () => {
    render(
      <Navbar currentTab="dashboard" onTabChange={mockOnTabChange} onLock={mockOnLock} />
    );

    const securityBtn = screen.getByRole('button', { name: /Seguridad y PIN maestro/i });
    fireEvent.click(securityBtn);

    await waitFor(() => {
      expect(screen.getByText('Seguridad & Credenciales')).toBeInTheDocument();
      expect(screen.getByText('Cambiar PIN')).toBeInTheDocument();
      expect(screen.getByText('Preguntas Secretas')).toBeInTheDocument();
    });
  });
});
