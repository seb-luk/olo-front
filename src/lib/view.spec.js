import { describe, expect, it } from 'vitest';

import { View } from './view.js';

describe('view', () => {
  it('should be defined', async () => {
    const module = await import('./view.js');
    expect(module).toBeDefined();
  });

  it('should convert string input into { name: string } in compileSelector', () => {
    const view = new View();
    expect(view.compileSelector('myButton')).toEqual({ name: 'myButton' });
    expect(view.compileSelector('some-name')).toEqual({ name: 'some-name' });
  });

  it('should resolve elements when passing a string name to get', () => {
    const container = document.createElement('div');
    container.innerHTML = `<button data-olo-name="submitBtn">Submit</button>`;
    const view = new View(container);

    const btn = view.get('submitBtn');
    expect(btn).not.toBeNull();
    expect(btn?.textContent).toBe('Submit');
  });
});
