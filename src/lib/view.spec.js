import { describe, expect, it } from 'vitest';

describe('view', () => {
  it('should be defined', async () => {
    const module = await import('./view.js');
    expect(module).toBeDefined();
  });
});
