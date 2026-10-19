// @vitest-environment jsdom
import { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { toast } from 'sonner';
import { errorMessage } from '../src/client/src/lib/errors';
import { ApiError } from '../src/client/src/lib/api';
import { useAsyncData } from '../src/client/src/hooks/useAsyncData';
import { useChanged } from '../src/client/src/hooks/useChanged';

vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

describe('errorMessage', () => {
  it('usa el mensaje del Error (incluido ApiError) y si no hay, el fallback', () => {
    expect(errorMessage(new ApiError(409, 'Cliente con proyectos'), 'fallback')).toBe('Cliente con proyectos');
    expect(errorMessage(new Error(''), 'fallback')).toBe('fallback');
    expect(errorMessage('texto suelto', 'fallback')).toBe('fallback');
    expect(errorMessage(undefined, 'fallback')).toBe('fallback');
  });
});

describe('useAsyncData', () => {
  beforeEach(() => vi.mocked(toast.error).mockClear());

  it('arranca cargando con el valor inicial y publica los datos al resolver', async () => {
    const load = vi.fn().mockResolvedValue(['a', 'b']);
    const { result } = renderHook(() => useAsyncData(load, [] as string[], 'Error al cargar'));

    expect(result.current.loading).toBe(true);
    expect(result.current.data).toEqual([]);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(['a', 'b']);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('reload devuelve una promesa que resuelve con los datos frescos ya publicados', async () => {
    const load = vi.fn().mockResolvedValueOnce(['viejo']).mockResolvedValueOnce(['nuevo']);
    const { result } = renderHook(() => useAsyncData(load, [] as string[], 'Error al cargar'));
    await waitFor(() => expect(result.current.data).toEqual(['viejo']));

    await act(() => result.current.reload());

    expect(result.current.data).toEqual(['nuevo']);
    expect(result.current.loading).toBe(false);
  });

  it('si la carga falla avisa con toast, conserva los datos y deja de cargar', async () => {
    const load = vi.fn().mockRejectedValue(new ApiError(500, 'Servidor caído'));
    const { result } = renderHook(() => useAsyncData(load, ['inicial'], 'Error al cargar'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(['inicial']);
    expect(toast.error).toHaveBeenCalledWith('Servidor caído');
  });
});

describe('useChanged', () => {
  // Mismo uso que los formularios: al abrir se precarga `initial`; mientras sigue abierto, se respeta lo editado.
  function useResettableField({ open, initial }: { open: boolean; initial: string }) {
    const [value, setValue] = useState('');
    const inputsChanged = useChanged([open, initial]);
    if (inputsChanged && open) setValue(initial);
    return { value, setValue };
  }

  it('reinicia el estado al abrir o al cambiar las props, y no pisa lo editado en otros renders', () => {
    const { result, rerender } = renderHook(useResettableField, { initialProps: { open: true, initial: 'a' } });
    expect(result.current.value).toBe('a');

    act(() => result.current.setValue('editado'));
    rerender({ open: true, initial: 'a' });
    expect(result.current.value).toBe('editado');

    rerender({ open: false, initial: 'a' });
    expect(result.current.value).toBe('editado');

    rerender({ open: true, initial: 'a' });
    expect(result.current.value).toBe('a');

    rerender({ open: true, initial: 'b' });
    expect(result.current.value).toBe('b');
  });
});
