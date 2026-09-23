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

  it('should auto-wire default dependencies on Module and Component without manual injection', async () => {
    expect(Module.dependencies.Elements).toBe(Elements);
    expect(Module.dependencies.State).toBe(State);
    expect(Module.dependencies.Events).toBe(Events);
    expect(Module.dependencies.Router).toBe(Router);
    expect(Module.dependencies.Meta).toBe(Meta);

    const root = document.createElement('div');
    root.innerHTML = `<button data-olo-name="btn">Click</button>`;
    document.body.appendChild(root);

    class TestComponent extends Component {
      constructor(el) {
        super({ name: 'test', component: 'test', properties: { count: 0 } }, { rootElement: el });
      }
    }

    const comp = new TestComponent(root);
    await comp.ready;

    expect(comp.elements).toBeInstanceOf(Elements);
    expect(comp.state).toBeInstanceOf(State);
    expect(comp.events).toBeInstanceOf(Events);
    expect(comp.elements.get({ name: 'btn' })).not.toBeNull();

    comp.destroy();
    root.remove();
  });

  it('should automatically update DOM elements matching data-olo-name when state.setContent is called', async () => {
    const root = document.createElement('section');
    root.setAttribute('data-olo-component', 'counter');
    root.innerHTML = `
      <strong data-olo-name="countDisplay">0</strong>
      <strong data-olo-name="doubleDisplay">0</strong>
      <button data-olo-name="incrementBtn">+1</button>
    `;
    document.body.appendChild(root);

    class CounterComponent extends Component {
      constructor(rootElement) {
        super(
          {
            name: 'counter',
            component: 'counter',
            content: { countDisplay: 0, doubleDisplay: 0 },
          },
          { rootElement }
        );

        this.state.addPipe('content', (content) => ({
          ...content,
          doubleDisplay: Number(content?.countDisplay ?? 0) * 2,
        }));

        this.elements.get({ name: 'incrementBtn' })?.addEventListener('click', () => {
          const current = Number(this.state.content?.countDisplay ?? 0);
          this.state.setContent({ countDisplay: current + 1 });
        });
      }
    }

    const counter = new CounterComponent(root);
    await counter.ready;

    const countDisplay = root.querySelector('[data-olo-name="countDisplay"]');
    const doubleDisplay = root.querySelector('[data-olo-name="doubleDisplay"]');
    const btn = root.querySelector('[data-olo-name="incrementBtn"]');

    expect(countDisplay?.textContent).toBe('0');
    expect(doubleDisplay?.textContent).toBe('0');

    btn?.dispatchEvent(new MouseEvent('click'));

    expect(countDisplay?.textContent).toBe('1');
    expect(doubleDisplay?.textContent).toBe('2');

    btn?.dispatchEvent(new MouseEvent('click'));

    expect(countDisplay?.textContent).toBe('2');
    expect(doubleDisplay?.textContent).toBe('4');

    counter.destroy();
    root.remove();
  });
});

