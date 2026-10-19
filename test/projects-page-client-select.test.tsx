// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { ProjectFormDialog } from '../src/client/src/components/ProjectFormDialog';

vi.mock('../src/client/src/lib/api', () => ({ api: { post: vi.fn(), patch: vi.fn(), put: vi.fn() } }));

describe('ProjectFormDialog en modo create', () => {
  it('la etiqueta "Cliente Asociado" nombra al selector de cliente', () => {
    render(
      <ProjectFormDialog
        open={true}
        onOpenChange={vi.fn()}
        mode="create"
        clients={[{ id: 'client-1', name: 'Acme Corporation' }]}
      />,
    );

    const clientSelect = screen.getByLabelText(/Cliente Asociado/i);
    expect(clientSelect.tagName).toBe('SELECT');
    expect(clientSelect).toHaveValue('client-1');
  });
});
