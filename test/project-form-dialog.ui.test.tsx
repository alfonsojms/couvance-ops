// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ProjectFormDialog, ProjectFormData } from '../src/client/src/components/ProjectFormDialog';
import { ClientFormDialog } from '../src/client/src/components/ClientFormDialog';
import { api } from '../src/client/src/lib/api';

vi.mock('../src/client/src/lib/api', () => ({
  api: {
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
  },
}));

describe('UI Testing — ProjectFormDialog & ClientFormDialog', () => {
  const mockClients = [
    { id: 'client-1', name: 'Acme Corporation' },
    { id: 'client-2', name: 'Globex Inc' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ProjectFormDialog en modo edit', () => {
    const initialProject: ProjectFormData = {
      id: 'proj-123',
      clientId: 'client-1',
      title: 'Rediseño Web Corporativa',
      category: 'CORPORATE',
      status: 'IN_PROGRESS',
      productionUrl: 'https://acme.com',
      productionStatus: 'ACTIVE',
      codeRepoUrl: 'https://github.com/acme/web',
      resourcesUrl: 'https://drive.google.com/acme',
      hasRecurring: 0,
      client: { id: 'client-1', name: 'Acme Corporation' },
    };

    it('TC-PFD-01: Debe precargar los valores existentes y deshabilitar el selector de cliente', () => {
      render(
        <ProjectFormDialog
          open={true}
          onOpenChange={vi.fn()}
          mode="edit"
          initial={initialProject}
          clients={mockClients}
        />
      );

      // Verificamos precarga del título
      const titleInput = screen.getByLabelText(/Nombre del Proyecto/i);
      expect(titleInput).toHaveValue('Rediseño Web Corporativa');

      // Verificamos que el cliente esté deshabilitado en edición
      const clientInput = screen.getByLabelText(/Cliente Asociado/i);
      expect(clientInput).toBeDisabled();
      expect(clientInput).toHaveValue('Acme Corporation');

      // Verificamos precarga de URLs
      expect(screen.getByLabelText(/URL de Producción/i)).toHaveValue('https://acme.com');
      expect(screen.getByLabelText(/Repositorio de Código/i)).toHaveValue('https://github.com/acme/web');
      expect(screen.getByLabelText(/Carpeta de Recursos/i)).toHaveValue('https://drive.google.com/acme');
    });

    it('TC-PFD-02: Debe enviar solo los campos modificados (diff) vía PATCH al guardar', async () => {
      const mockSuccess = vi.fn();
      const mockOpenChange = vi.fn();

      (api.patch as any).mockResolvedValue({
        ...initialProject,
        productionUrl: 'https://nueva-acme.com',
      });

      render(
        <ProjectFormDialog
          open={true}
          onOpenChange={mockOpenChange}
          mode="edit"
          initial={initialProject}
          clients={mockClients}
          onSuccess={mockSuccess}
        />
      );

      // Modificamos únicamente la URL de producción
      const prodUrlInput = screen.getByLabelText(/URL de Producción/i);
      fireEvent.change(prodUrlInput, { target: { value: 'https://nueva-acme.com' } });

      // Enviamos el formulario
      const saveButton = screen.getByRole('button', { name: /Guardar Cambios/i });
      fireEvent.click(saveButton);

      await waitFor(() => {
        // api.patch debe haberse llamado con el ID y ÚNICAMENTE el campo modificado
        expect(api.patch).toHaveBeenCalledTimes(1);
        expect(api.patch).toHaveBeenCalledWith('/api/projects/proj-123', {
          productionUrl: 'https://nueva-acme.com',
        });
        expect(mockSuccess).toHaveBeenCalled();
        expect(mockOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('ClientFormDialog en modo edit', () => {
    it('TC-CFD-01: Debe precargar datos de cliente y llamar a api.put al editar', async () => {
      const mockSuccess = vi.fn();
      const mockOpenChange = vi.fn();

      const initialClient = {
        id: 'client-1',
        name: 'Carlos Gómez',
        contactName: 'Carlos',
        phone: '+18095551234',
        email: 'carlos@acme.com',
        notes: 'Cliente preferencial',
      };

      (api.put as any).mockResolvedValue({
        ...initialClient,
        phone: '+18095559999',
      });

      render(
        <ClientFormDialog
          open={true}
          onOpenChange={mockOpenChange}
          mode="edit"
          initial={initialClient}
          onSuccess={mockSuccess}
        />
      );

      expect(screen.getByLabelText(/Nombre o Empresa/i)).toHaveValue('Carlos Gómez');
      const phoneInput = screen.getByLabelText(/Teléfono \/ WhatsApp/i);
      expect(phoneInput).toHaveValue('+18095551234');

      // Modificamos teléfono
      fireEvent.change(phoneInput, { target: { value: '+18095559999' } });

      const submitButton = screen.getByRole('button', { name: /Guardar Cambios/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.put).toHaveBeenCalledWith('/api/clients/client-1', {
          name: 'Carlos Gómez',
          contactName: 'Carlos',
          phone: '+18095559999',
          email: 'carlos@acme.com',
          notes: 'Cliente preferencial',
        });
        expect(mockSuccess).toHaveBeenCalled();
        expect(mockOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });
});
