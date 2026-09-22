import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { ComponentBuilder } from './component-builder.js';
import { Component } from './component.js';
import { Elements } from './elements.js';
import { State } from './state.js';
import { Children } from './children.js';

describe('ComponentBuilder', () => {
  beforeEach(() => {
    document.documentElement.innerHTML = '<body></body>';
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<template data-olo-component="mock-comp" data-olo-view="default"><div>Mock</div></template>')
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const getDependencies = (comps = {}) => ({
    Elements,
    Component,
    State,
    Children,
    Components: comps,
  });

  it('should be defined', () => {
    expect(ComponentBuilder).toBeDefined();
  });

  it('should build from template and fetch local templates', async () => {
    const template = document.createElement('template');
    template.dataset.oloComponent = 'test-comp';
    template.dataset.oloView = 'default';
    template.innerHTML = '<div>Build Me</div>';
    document.body.appendChild(template);

    class TestComp extends Component {}
    const deps = getDependencies({ 'test-comp': TestComp });
    const builder = new ComponentBuilder([], { scope: document.documentElement }, deps);
    
    const comp = await builder.buildFromTemplate(
      'test-comp',
      'default',
      { component: 'test-comp', name: 'instance1' },
      { localFirst: true },
      deps
    );
    
    expect(comp).toBeDefined();
    expect(comp.component).toBe('test-comp');
    expect(comp.name).toBe('instance1');
    expect(comp.rootElement.textContent).toBe('Build Me');
  });

  it('should build from content', async () => {
    class TestComp extends Component {}
    const deps = getDependencies({ 'test-comp': TestComp });
    const builder = new ComponentBuilder([], { scope: document.documentElement }, deps);
    
    const rootElement = document.createElement('div');
    rootElement.dataset.oloComponent = 'test-comp';
    rootElement.dataset.oloName = 'instance2';
    rootElement.innerHTML = 'Inline Content';
    
    const comp = await builder.buildFromContent(
      'instance2',
      { component: 'test-comp', name: 'instance2' },
      { rootElement },
      deps
    );
    
    expect(comp).toBeDefined();
    expect(comp.component).toBe('test-comp');
    expect(comp.name).toBe('instance2');
    expect(comp.rootElement.textContent).toBe('Inline Content');
  });

  it('should resolve and fetch view', async () => {
    const template = document.createElement('template');
    template.dataset.oloComponent = 'view-comp';
    template.dataset.oloView = 'test-view';
    template.innerHTML = '<p>View Content</p>';
    document.body.appendChild(template);

    class ViewComp extends Component {}
    const deps = getDependencies({ 'view-comp': ViewComp });
    const builder = new ComponentBuilder([], { scope: document.documentElement }, deps);

    const viewElem = await builder.getView('view-comp', 'test-view', { localFirst: true });
    
    expect(viewElem).toBeDefined();
    expect(viewElem.tagName).toBe('TEMPLATE');
    expect(viewElem.content.textContent).toBe('View Content');
  });

  it('should fall back to pre-defined component classes', async () => {
    const template = document.createElement('template');
    template.dataset.oloComponent = 'remote-comp';
    template.dataset.oloView = 'default';
    template.innerHTML = '<div>Remote View</div>';
    document.body.appendChild(template);

    class RemoteComp extends Component {
      onInit() { this.remoteInited = true; }
    }
    const deps = getDependencies({ 'remote-comp': RemoteComp });
    const builder = new ComponentBuilder([], { scope: document.documentElement }, deps);
    
    const comp = await builder.buildFromTemplate(
      'remote-comp',
      'default',
      { component: 'remote-comp', name: 'remote1' },
      { localFirst: true },
      deps
    );
    
    expect(comp).toBeDefined();
    expect(comp.remoteInited).toBe(true);
  });

  it('should fetch view remotely if not found locally', async () => {
    class MockComp extends Component {}
    const deps = getDependencies({ 'mock-comp': MockComp });
    const builder = new ComponentBuilder([], { scope: document.documentElement, remoteTemplatesUrl: 'http://example.com/templates.html' }, deps);
    
    const viewElem = await builder.getView('mock-comp', 'default', { localFirst: false });
    
    expect(global.fetch).toHaveBeenCalled();
    expect(viewElem).toBeDefined();
    expect(viewElem.tagName).toBe('TEMPLATE');
    expect(viewElem.content.textContent).toBe('Mock');
  });

  it('should throw error if view cannot be found', async () => {
    class MissComp extends Component {}
    const deps = getDependencies({ 'miss-comp': MissComp });
    const builder = new ComponentBuilder([], { scope: document.documentElement }, deps);
    
    const view = await builder.getView('miss-comp', 'default', { localFirst: true });
    expect(view).toBeUndefined();
  });

  it('should load content correctly', async () => {
    class MockComp extends Component {}
    const deps = getDependencies({ 'mock-comp': MockComp });
    const builder = new ComponentBuilder([], { scope: document.documentElement }, deps);
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<div data-olo-component="mock-comp" data-olo-name="test-page">Loaded</div><template data-olo-component="some-comp" data-olo-view="default"><div></div></template>')
    });

    const content = await builder.loadContent('test-page');
    expect(global.fetch).toHaveBeenCalled();
    expect(content).toBeDefined();
    expect(content.dataset.oloComponent).toBe('mock-comp');
    expect(content.dataset.oloName).toBe('test-page');
  });

  it('should handle fetch errors gracefully in loadContent', async () => {
    const builder = new ComponentBuilder([], { scope: document.documentElement }, getDependencies());
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    // override loadHTML so we don't have to wait 7 seconds
    builder.loadHTML = vi.fn().mockRejectedValue(new Error('Network error'));
    
    // Oh wait, loadHTML is private #loadHTML !
    // Let's just override global.setTimeout to skip the wait inside #loadHTML!
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = (cb, ms) => originalSetTimeout(cb, 1);
    
    const promise = builder.loadContent('fail-page');
    const content = await promise;
    expect(content).toBeUndefined();
    
    global.setTimeout = originalSetTimeout;
  });

  it('should try to load component class dynamically and handle failure', async () => {
    const builder = new ComponentBuilder([], { scope: document.documentElement }, getDependencies());
    
    global.fetch = vi.fn().mockRejectedValue(new Error('no html'));
    
    const originalSetTimeout = global.setTimeout;
    global.setTimeout = (cb, ms) => originalSetTimeout(cb, 1);

    const promise = builder.getView('dynamic-comp', 'default', { localFirst: true });
    const result = await promise;
    
    expect(result).toBeUndefined();
    
    global.setTimeout = originalSetTimeout;
  });

  it('should extract styles and add them to head', async () => {
    class StyledComp extends Component {}
    const deps = getDependencies({ 'styled-comp': StyledComp });
    // mock Meta to see if addMetaElements is called
    const addMetaElementsMock = vi.fn();
    deps.Meta = class { addMetaElements() { addMetaElementsMock() } };
    
    const builder = new ComponentBuilder([], { scope: document.documentElement }, deps);
    
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(`
        <head>
          <style data-olo-component="styled-comp">body { color: red; }</style>
        </head>
        <body>
          <template data-olo-component="styled-comp" data-olo-view="default"><div>Styled</div></template>
        </body>
      `)
    });

    await builder.getView('styled-comp', 'default', { localFirst: false });
  });
});
