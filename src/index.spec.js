import {
  Children,
  Component,
  ComponentBuilder,
  Elements,
  Events,
  Meta,
  Mode,
  Module,
  OloEvent,
  Router,
  State,
  View,
} from './index.js';
import { describe, expect, it } from 'vitest';

describe('olo-front exports', () => {
  it('should export all primary framework classes and modules', () => {
    expect(Component).toBeDefined();
    expect(ComponentBuilder).toBeDefined();
    expect(Module).toBeDefined();
    expect(View).toBeDefined();
    expect(Elements).toBeDefined();
    expect(Children).toBeDefined();
    expect(State).toBeDefined();
    expect(Events).toBeDefined();
    expect(OloEvent).toBeDefined();
    expect(Router).toBeDefined();
    expect(Meta).toBeDefined();
    expect(Mode).toBeDefined();
  });
});

describe('olo-front in DOM environment (happy-dom)', () => {
  it('should manipulate and query DOM elements via View', () => {
    const container = document.createElement('div');
    container.innerHTML = `
      <section data-olo-component="test-comp">
        <h1 data-olo-name="title">Hello World</h1>
      </section>
    `;
    document.body.appendChild(container);

    const view = new View(container);
    expect(view.scope).toBe(container);

    const titleEl = view.get({ name: 'title' });
    expect(titleEl).not.toBeNull();
    expect(titleEl?.textContent).toBe('Hello World');

    document.body.removeChild(container);
  });

  it('should manage reactive state and pipes in State module', () => {
    const state = new State({ properties: { count: 1 } });
    expect(state.properties?.count).toBe(1);

    state.addPipe('properties', (props) => ({
      ...props,
      count: Number(props?.count ?? 0) * 2,
    }));
    state.setProperties({ count: 5 });
    expect(state.properties?.count).toBe(10);
  });
});

