// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Dashboard } from '../src/client/src/pages/Dashboard';
import { api } from '../src/client/src/lib/api';

vi.mock('../src/client/src/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}));

describe('UI Testing — Dashboard Radar & Collection History (Historial de Cobros)', () => {
  const mockMetrics = {
    totalInTheStreet: 1500,
    totalCollected: 3500,
    activeProjectsCount: 2,
    totalProjectsCount: 5,
  };

  const mockPendingMilestones = [
    {
      id: 'm-pending-1',
      budgetId: 'b-1',
      projectId: 'p-1',
      milestoneTitle: '50% Anticipo',
      amount: 1500,
      percentage: 50,
      currency: 'USD',
      dueDate: '2026-10-30',
      status: 'PENDING',
      clientName: 'Acme Digital',
      clientPhone: '+5491123456789',
      projectTitle: 'E-commerce B2B',
    },
  ];

  const mockHistoryItems = [
    {
      id: 'm-paid-1',
      milestoneTitle: '50% Anticipo',
      amount: 2000,
      percentage: 50,
      currency: 'USD',
      paidAt: '2026-10-10T14:30:00.000Z',
      dueDate: '2026-10-09',
      projectId: 'p-2',
      projectTitle: 'Landing de Lanzamiento',
      projectCategory: 'LANDING',
      clientId: 'c-2',
      clientName: 'Globex Corp',
    },
    {
      id: 'm-paid-2',
      milestoneTitle: '50% Entrega Final',
      amount: 1500,
      percentage: 50,
      currency: 'USD',
      paidAt: '2026-10-12T18:00:00.000Z',
      dueDate: '2026-10-12',
      projectId: 'p-3',
      projectTitle: 'App Inmobiliaria',
      projectCategory: 'WEBAPP',
      clientId: 'c-3',
      clientName: 'InmoGroup',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/api/finance/metrics') {
        return Promise.resolve(mockMetrics);
      }
      if (url === '/api/finance/radar') {
        return Promise.resolve({
          pendingMilestones: mockPendingMilestones,
          recurringAlerts: [],
        });
      }
      if (url === '/api/finance/history') {
        return Promise.resolve({
          history: mockHistoryItems,
          totalCollected: 3500,
          totalCount: 2,
        });
      }
      return Promise.reject(new Error(`Unhandled URL: ${url}`));
    });
  });

  it('TC-DASH-01: Debe renderizar métricas financieras y vista de pendientes por defecto', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Radar de Cobranzas y Flujo de Caja')).toBeInTheDocument();
    });

    // Verificamos presencia de las métricas clave
    expect(screen.getByText('Total en la Calle (Pendiente)')).toBeInTheDocument();
    expect(screen.getByText('Total Cobrado (Histórico)')).toBeInTheDocument();
    expect(screen.getByText('Proyectos en Progreso')).toBeInTheDocument();

    // Verificamos hito pendiente en la vista inicial
    expect(screen.getByText('Hitos Pendientes de Cobro (1)')).toBeInTheDocument();
    expect(screen.getByText('E-commerce B2B')).toBeInTheDocument();
    expect(screen.getByText('Acme Digital')).toBeInTheDocument();
  });

  it('TC-DASH-02: Clic en métrica "Total Cobrado" cambia a Historial en 1 solo clic y muestra desglose', async () => {
    const mockOnSubTabChange = vi.fn();
    render(<Dashboard onSubTabChange={mockOnSubTabChange} />);

    await waitFor(() => {
      expect(screen.getByText('Total Cobrado (Histórico)')).toBeInTheDocument();
    });

    // Clic en la tarjeta métrica de Total Cobrado
    const totalCobradoCard = screen.getByRole('button', { name: /Ver historial de cobros registrados/i });
    expect(totalCobradoCard).toBeInTheDocument();
    fireEvent.click(totalCobradoCard);

    // Verificamos llamada a onSubTabChange
    expect(mockOnSubTabChange).toHaveBeenCalledWith('history');

    // Verificamos que ahora se muestra el desglose del historial
    await waitFor(() => {
      expect(screen.getByText('Historial de Cobros Registrados (2)')).toBeInTheDocument();
      expect(screen.getByText('Landing de Lanzamiento')).toBeInTheDocument();
      expect(screen.getByText('Globex Corp')).toBeInTheDocument();
      expect(screen.getByText('+$2,000')).toBeInTheDocument();
      expect(screen.getByText('App Inmobiliaria')).toBeInTheDocument();
      expect(screen.getByText('InmoGroup')).toBeInTheDocument();
      expect(screen.getByText('+$1,500')).toBeInTheDocument();
    });
  });

  it('TC-DASH-03: Clic en métrica "Total en la Calle" regresa a los pendientes en 1 solo clic', async () => {
    const mockOnSubTabChange = vi.fn();
    render(<Dashboard initialSubTab="history" onSubTabChange={mockOnSubTabChange} />);

    await waitFor(() => {
      expect(screen.getByText('Historial de Cobros Registrados (2)')).toBeInTheDocument();
    });

    // Clic en la tarjeta de Total en la Calle
    const totalEnCalleCard = screen.getByRole('button', { name: /Ver hitos pendientes en la calle/i });
    expect(totalEnCalleCard).toBeInTheDocument();
    fireEvent.click(totalEnCalleCard);

    expect(mockOnSubTabChange).toHaveBeenCalledWith('pending');

    await waitFor(() => {
      expect(screen.getByText('Hitos Pendientes de Cobro (1)')).toBeInTheDocument();
      expect(screen.getByText('E-commerce B2B')).toBeInTheDocument();
    });
  });

  it('TC-DASH-04: El selector de pestañas (subtabs) permite alternar fluidamente', async () => {
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /Pestaña Historial de Cobros/i })).toBeInTheDocument();
    });

    const historyTabBtn = screen.getByRole('tab', { name: /Pestaña Historial de Cobros/i });
    fireEvent.click(historyTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Historial de Cobros Registrados (2)')).toBeInTheDocument();
    });

    const pendingTabBtn = screen.getByRole('tab', { name: /Pestaña En la calle/i });
    fireEvent.click(pendingTabBtn);

    await waitFor(() => {
      expect(screen.getByText('Hitos Pendientes de Cobro (1)')).toBeInTheDocument();
    });
  });

  it('TC-DASH-05: Buscador filtra cobros por cliente o proyecto en tiempo real', async () => {
    render(<Dashboard initialSubTab="history" />);

    await waitFor(() => {
      expect(screen.getByText('Historial de Cobros Registrados (2)')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Buscar por cliente o proyecto/i);
    expect(searchInput).toBeInTheDocument();

    // Filtramos por "Globex"
    fireEvent.change(searchInput, { target: { value: 'Globex' } });

    await waitFor(() => {
      expect(screen.getByText('Landing de Lanzamiento')).toBeInTheDocument();
      expect(screen.queryByText('App Inmobiliaria')).not.toBeInTheDocument();
      expect(screen.getByText(/Filtrado: \$2,000 \(1 hitos\)/i)).toBeInTheDocument();
    });

    // Limpiamos con botón ✕
    const clearBtn = screen.getByText('✕');
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(screen.getByText('Landing de Lanzamiento')).toBeInTheDocument();
      expect(screen.getByText('App Inmobiliaria')).toBeInTheDocument();
    });
  });
});
