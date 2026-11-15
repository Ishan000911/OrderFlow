import { describe, expect, it } from 'vitest';
const transitions = { PENDING: ['CONFIRMED', 'CANCELLED'], CONFIRMED: ['SHIPPED', 'CANCELLED'], SHIPPED: ['DELIVERED'], DELIVERED: [], CANCELLED: [] };
describe('order lifecycle', () => {
  it('permits only forward operational transitions', () => { expect(transitions.PENDING).toContain('CONFIRMED'); expect(transitions.CONFIRMED).toContain('SHIPPED'); expect(transitions.SHIPPED).not.toContain('CANCELLED'); });
});
