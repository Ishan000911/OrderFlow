import { describe, expect, it } from 'vitest';
describe('client foundation',()=>{it('uses a DOM test environment',()=>expect(document.createElement('div')).toBeTruthy())});
