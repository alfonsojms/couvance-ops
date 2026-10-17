// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { Clients } from '../src/client/src/pages/Clients';
import { Showcase } from '../src/client/src/pages/Showcase';
import { Unlock } from '../src/client/src/pages/Unlock';
import { SecuritySettingsModal } from '../src/client/src/components/SecuritySettingsModal';
import { api } from '../src/client/src/lib/api';

// Caracterización de las páginas divididas en hooks + componentes (T11): mismo flujo y mismas llamadas HTTP.
vi.mock('../src/client/src/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn() },
}));

const getMock = vi.mocked(api.get);
const postMock = vi.mocked(api.post);
const delMock = vi.mocked(api.del);

const client = (id: string, name: string, projectsCount: number) => ({
  id,
  name,
  contactName: null,
  phone: null,
  email: null,
  notes: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  projectsCount,
  totalPaid: 0,
  totalPending: 0,
});

describe('UI — páginas restantes tras la división container/presentational', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Clients: bloquea eliminar con proyectos y elimina y recarga si no tiene', async () => {
    getMock.mockResolvedValue([client('c1', 'Acme', 2), client('c2', 'Globex', 0)]);
    delMock.mockResolvedValue({ ok: true, message: 'ok' });

    render(<Clients />);
    expect(await screen.findByText('Acme')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/api/clients');

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar cliente Acme' }));
    const blocked = await screen.findByRole('dialog');
    expect(within(blocked).getByText('Cliente con proyectos activos (2)')).toBeInTheDocument();
    expect(within(blocked).queryByRole('button', { name: 'Eliminar Cliente' })).toBeNull();
    fireEvent.click(within(blocked).getByRole('button', { name: 'Cerrar' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Eliminar cliente Globex' }));
    const dialog = await screen.findByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Eliminar Cliente' }));

    await waitFor(() => expect(delMock).toHaveBeenCalledWith('/api/clients/c2'));
    await waitFor(() => expect(getMock).toHaveBeenCalledTimes(2));
  });

  it('Showcase: filtra por categoría', async () => {
    getMock.mockResolvedValue([
      { id: 'p1', title: 'Landing Uno', category: 'LANDING', clientName: 'Acme', productionUrl: 'https://uno.test' },
      { id: 'p2', title: 'Tienda Dos', category: 'ECOMMERCE', clientName: 'Globex', productionUrl: 'https://dos.test' },
    ]);

    render(<Showcase />);
    expect(await screen.findByText('Landing Uno')).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/api/showcase');

    fireEvent.click(screen.getByRole('button', { name: 'E-commerce' }));
    expect(screen.queryByText('Landing Uno')).toBeNull();
    expect(screen.getByText('Tienda Dos')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Web Apps' }));
    expect(screen.getByText('No hay proyectos terminados en esta categoría')).toBeInTheDocument();
  });

  it('SecuritySettingsModal: carga preguntas y envía el cambio de PIN', async () => {
    getMock.mockResolvedValue({ q1: 'Mascota?', q2: 'Ciudad?', updatedAt: null });
    postMock.mockResolvedValue({ ok: true, message: 'ok' });
    const onClose = vi.fn();

    render(<SecuritySettingsModal isOpen onClose={onClose} />);
    expect(getMock).toHaveBeenCalledWith('/api/auth/settings');

    const [current, next, confirm] = screen.getAllByPlaceholderText('••••••••');
    fireEvent.change(current, { target: { value: '1234abcd5678' } });
    fireEvent.change(next, { target: { value: '87654321' } });
    fireEvent.change(confirm, { target: { value: '87654321' } });
    fireEvent.click(screen.getByRole('button', { name: /Actualizar PIN/ }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/api/auth/change-pin', {
        currentPin: '12345678',
        newPin: '87654321',
      })
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: /Preguntas Secretas/ }));
    expect(screen.getByDisplayValue('Mascota?')).toBeInTheDocument();
  });

  it('Unlock: recupera el PIN con preguntas y nuevo PIN', async () => {
    getMock.mockResolvedValue({ q1: 'Mascota?', q2: 'Ciudad?' });
    postMock
      .mockResolvedValueOnce({ resetToken: 'tok' })
      .mockResolvedValueOnce({ ok: true, message: 'ok' });
    const onUnlockSuccess = vi.fn();

    render(<Unlock onUnlockSuccess={onUnlockSuccess} />);
    fireEvent.click(screen.getByRole('button', { name: '¿Olvidaste el PIN de acceso?' }));

    expect(await screen.findByLabelText(/Mascota\?/)).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledWith('/api/auth/questions');
    fireEvent.change(screen.getByLabelText(/Mascota\?/), { target: { value: ' Firulais ' } });
    fireEvent.change(screen.getByLabelText(/Ciudad\?/), { target: { value: 'Lima' } });
    fireEvent.click(screen.getByRole('button', { name: /Validar respuestas/ }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/api/auth/recover', { a1: 'Firulais', a2: 'Lima' })
    );

    fireEvent.change(await screen.findByLabelText(/Nuevo PIN \(8 dígitos/), { target: { value: '11223344' } });
    fireEvent.change(screen.getByLabelText(/Confirmar Nuevo PIN/), { target: { value: '11223344' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar y Entrar/ }));

    await waitFor(() =>
      expect(postMock).toHaveBeenCalledWith('/api/auth/reset-pin', { token: 'tok', newPin: '11223344' })
    );
    expect(onUnlockSuccess).toHaveBeenCalledTimes(1);
  });
});
