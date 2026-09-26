import { describe, it, expect } from 'vitest';
import {
  calculateMilestonesAmounts,
  budgetCreateSchema,
} from '../src/server/modules/budgets';

describe('QA - Módulo de Presupuestos (Budgets)', () => {
  describe('RN-01: Cálculo de montos sin decimales y absorción de residuo', () => {
    it('debe repartir los montos exactamente y el último hito debe absorber el residuo', () => {
      // Escenario: Presupuesto de $1,000 dividido en 33%, 33% y 34%
      const totalAmount = 1000;
      const hitos = [
        { title: 'Anticipo', percentage: 33 },
        { title: 'Entrega diseño', percentage: 33 },
        { title: 'Liquidación final', percentage: 34 },
      ];

      const resultado = calculateMilestonesAmounts(totalAmount, hitos);

      // Verificamos montos individuales
      expect(resultado[0].amount).toBe(330);
      expect(resultado[1].amount).toBe(330);
      expect(resultado[2].amount).toBe(340);

      // La suma de todos los hitos debe ser IDÉNTICA al monto total del presupuesto
      const sumaHitos = resultado.reduce((acc, h) => acc + h.amount, 0);
      expect(sumaHitos).toBe(totalAmount);
    });

    it('debe cuadrar con precisión matemática en montos impares con divisiones difíciles', () => {
      // Escenario: $100 dividido en 3 hitos
      const totalAmount = 100;
      const hitos = [
        { title: 'Fase 1', percentage: 33 },
        { title: 'Fase 2', percentage: 33 },
        { title: 'Fase 3', percentage: 34 },
      ];

      const resultado = calculateMilestonesAmounts(totalAmount, hitos);
      const sumaHitos = resultado.reduce((acc, h) => acc + h.amount, 0);

      expect(sumaHitos).toBe(100);
      expect(Number.isInteger(resultado[0].amount)).toBe(true);
      expect(Number.isInteger(resultado[1].amount)).toBe(true);
      expect(Number.isInteger(resultado[2].amount)).toBe(true);
    });
  });

  describe('RN-02: Regla de Oro del 100% y enteros en presupuestos', () => {
    it('debe APROBAR cuando los hitos suman exactamente 100%', () => {
      const payloadValido = {
        title: 'Desarrollo Web Couvance',
        totalAmount: 1500,
        currency: 'USD',
        milestones: [
          { title: '50% Anticipo', percentage: 50 },
          { title: '50% Entrega', percentage: 50 },
        ],
      };

      const resultado = budgetCreateSchema.safeParse(payloadValido);
      expect(resultado.success).toBe(true);
    });

    it('debe RECHAZAR cuando la suma de porcentajes es menor a 100% (ej: 80%)', () => {
      const payloadInvalido = {
        title: 'Presupuesto incompleto',
        totalAmount: 1000,
        currency: 'USD',
        milestones: [
          { title: '30% Anticipo', percentage: 30 },
          { title: '50% Entrega', percentage: 50 },
        ], // Suma 80%
      };

      const resultado = budgetCreateSchema.safeParse(payloadInvalido);
      expect(resultado.success).toBe(false);

      if (!resultado.success) {
        const errorMsg = resultado.error.issues[0].message;
        expect(errorMsg).toContain('exactamente 100%');
      }
    });

    it('debe RECHAZAR cuando la suma de porcentajes supera el 100% (ej: 110%)', () => {
      const payloadInvalido = {
        title: 'Presupuesto con exceso',
        totalAmount: 1000,
        currency: 'USD',
        milestones: [
          { title: '60% Anticipo', percentage: 60 },
          { title: '50% Entrega', percentage: 50 },
        ], // Suma 110%
      };

      const resultado = budgetCreateSchema.safeParse(payloadInvalido);
      expect(resultado.success).toBe(false);
    });

    it('debe RECHAZAR si el totalAmount contiene decimales (RN-01)', () => {
      const payloadConDecimales = {
        title: 'Presupuesto con centavos',
        totalAmount: 1250.75, // Decimal no permitido en presupuestos
        currency: 'USD',
        milestones: [
          { title: '100% Total', percentage: 100 },
        ],
      };

      const resultado = budgetCreateSchema.safeParse(payloadConDecimales);
      expect(resultado.success).toBe(false);
    });
  });
});
