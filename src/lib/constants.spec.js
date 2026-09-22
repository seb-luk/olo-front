import { describe, expect, it } from 'vitest';

describe('constants', () => {
  it('should be defined', async () => {
    const module = await import('./constants.js');
    expect(module).toBeDefined();
  });
});
