import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Children } from './children.js';
import { Component } from './component.js';
import { Elements } from './elements.js';
import { Events } from './events.js';
import { Meta } from './meta.js';
import { Mode } from './mode.js';
import { Router } from './router.js';
import { State } from './state.js';

describe('Component', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const getDependencies = () => ({
    Elements,
    State,
    Mode,
    Children,
    Meta,
    Events,
    Router,
    componentBuilder: {
      buildFromTemplate: vi.fn(async (compName, view, state, options) => {
        const rootElement = document.createElement('div');
        rootElement.dataset.oloComponent = compName;
        rootElement.textContent = 'Child';
        return { component: compName, rootElement };
      }),
      buildFromContent: vi.fn(async (compName, state, options) => {
        const rootElement = document.createElement('div');
        rootElement.dataset.oloComponent = compName;
        rootElement.textContent = 'Child';
        return { component: compName, rootElement };
      })
    }
  });

  it('should initialize basic component with state and elements', async () => {
    class MyComponent extends Component {
      onInit() { this.inited = true; }
    }
    const root = document.createElement('div');
    const comp = new MyComponent({ component: 'my-comp', name: 'my-name', properties: {} }, { rootElement: root }, getDependencies());
    await comp.initialized;
    expect(comp.inited).toBe(true);
    expect(comp.component).toBe('my-comp');
    comp.ready.catch(() => {});
    comp.destroy();
  });
  
  it('should compile view when rootElement is omitted', async () => {
    const template = document.createElement('template');
    template.dataset.oloComponent = 'test-comp';
    template.content.appendChild(document.createElement('div'));
    template.content.firstElementChild.textContent = 'New View';
    document.body.appendChild(template);
    const comp = new Component({ component: 'test-comp' }, {}, getDependencies());
    await comp.initialized;
    expect(comp.rootElement.textContent).toBe('New View');
    comp.ready.catch(() => {});
    comp.destroy();
  });

  it('should setView and trigger lifecycle hooks', async () => {
    const template = document.createElement('template');
    template.dataset.oloComponent = 'test-comp';
    template.dataset.oloView = 'new-view';
    template.content.appendChild(document.createElement('div'));
    template.content.firstElementChild.textContent = 'New';
    document.body.appendChild(template);
    
    class TestComp extends Component {
      onViewChange(context) { this.viewChanged = context; }
    }
    const comp = new TestComp({ component: 'test-comp', properties: {} }, { rootElement: document.createElement('div') }, getDependencies());
    await comp.initialized;
    await comp.setView('new-view');
    expect(comp.view).toBe('new-view');
    expect(comp.viewChanged.view).toBe('new-view');
    comp.ready.catch(() => {});
    comp.destroy();
  });

  it('should handle setView errors gracefully and trigger onError', async () => {
    class TestComp extends Component {
      onError(err, context) { this.errorCaught = err; }
    }
    const comp = new TestComp({ component: 'test-comp' }, { rootElement: document.createElement('div') }, getDependencies());
    await comp.initialized;
    await comp.setView('non-existent');
    expect(comp.errorCaught).toBeDefined();
    comp.ready.catch(() => {});
    comp.destroy();
  });

  it('should build child components from placeholders', async () => {
    const root = document.createElement('div');
    root.dataset.oloComponent = 'parent-comp';
    root.dataset.oloName = 'parent-name';
    
    const staticPlaceholder = document.createElement('div');
    staticPlaceholder.dataset.oloComponent = 'child-static';
    staticPlaceholder.dataset.oloPlaceholder = 'STATIC';
    root.appendChild(staticPlaceholder);

    const inlineContent = document.createElement('div');
    inlineContent.dataset.oloComponent = 'child-inline';
    // No placeholder means it's treated as inline content
    root.appendChild(inlineContent);

    document.body.appendChild(root);

    const deps = getDependencies();
    const comp = new Component(
      { component: 'parent-comp', name: 'parent-name' },
      { rootElement: root },
      deps
    );

    await comp.initialized;

    expect(deps.componentBuilder.buildFromTemplate).toHaveBeenCalledTimes(1);
    expect(deps.componentBuilder.buildFromTemplate).toHaveBeenCalledWith('child-static', undefined, expect.anything(), expect.anything(), expect.anything());

    expect(deps.componentBuilder.buildFromContent).toHaveBeenCalledTimes(1);
    expect(deps.componentBuilder.buildFromContent).toHaveBeenCalledWith('', expect.anything(), expect.anything(), expect.anything());

    comp.ready.catch(() => {});
    comp.destroy();
  });

  it('should mount and trigger onReady', async () => {
    class TestComp extends Component {
      onReady() { this.isReady = true; }
    }
    const comp = new TestComp({ component: 'test-comp' }, { rootElement: document.createElement('div') }, getDependencies());
    await comp.mount();
    await comp.ready;
    expect(comp.isReady).toBe(true);
    comp.destroy();
  });

  it('should resolve and use mode property', async () => {
    const comp = new Component(
      { component: 'test-comp', mode: ['active'] },
      { rootElement: document.createElement('div'), modes: { DEFAULT: ['active', 'inactive'] } },
      getDependencies()
    );
    await comp.initialized;
    expect(comp.state.mode).toEqual(['active']);
    comp.ready.catch(() => {});
    comp.destroy();
  });

  it('should proxy events.listen and unlisten via on() and off()', async () => {
    const root = document.createElement('div');
    const btn = document.createElement('button');
    btn.dataset.oloName = 'actionBtn';
    root.appendChild(btn);

    const comp = new Component({ component: 'test-comp' }, { rootElement: root }, getDependencies());
    await comp.initialized;

    const btnCallback = vi.fn();
    const rootCallback = vi.fn();

    // Listen with string target name
    comp.on('actionBtn', 'click', btnCallback);
    // Listen directly on scope/root
    comp.on('click', rootCallback);

    btn.click();
    expect(btnCallback).toHaveBeenCalledTimes(1);
    expect(rootCallback).toHaveBeenCalledTimes(1);

    // Unlisten using off()
    comp.off('actionBtn', 'click', btnCallback);
    btn.click();
    expect(btnCallback).toHaveBeenCalledTimes(1);
    expect(rootCallback).toHaveBeenCalledTimes(2);

    comp.ready.catch(() => {});
    comp.destroy();

    // After destroy, listeners should be stopped via AbortController
    btn.click();
    expect(rootCallback).toHaveBeenCalledTimes(2);
  });
});
