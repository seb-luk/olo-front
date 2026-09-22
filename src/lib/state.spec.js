import { describe, expect, it, vi, beforeEach } from 'vitest';
import { State, ContentViewEffect, ContentDatasetPipe, PropertiesDatasetPipe } from './state.js';
import { Mode } from './mode.js';

describe('State', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize completely with config', () => {
    class MockChildren { constructor() { this.states = [{name: 'child1'}]; } }
    const dependencies = { Mode, Children: MockChildren, State };
    const state = new State({
      name: 'root',
      component: 'my-comp',
      content: { text: 'hello' },
      properties: { theme: 'dark' },
      mode: { modes: { DEFAULT: ['active', 'inactive'] }, current: ['active'] },
      children: [{ name: 'child1' }]
    }, {}, dependencies);

    expect(state.name).toBe('root');
    expect(state.component).toBe('my-comp');
    expect(state.content).toEqual({ text: 'hello' });
    expect(state.properties).toEqual({ theme: 'dark' });
    expect(state.mode).toEqual(['active']);
    expect(state.children).toBeDefined();
  });

  it('should allow modifying componentInstance', () => {
    const state = new State({ name: 'initial' });
    const compInstance = { component: 'my-comp', rootElement: document.createElement('div') };
    
    state.setComponent(compInstance);
    expect(state.componentInstance).toBe(compInstance);
    expect(state.component).toBe('my-comp');
  });

  it('should set mode through setMode and setter', () => {
    const state = new State({}, {}, { Mode });
    
    // First, set the available modes
    state.setMode({ modes: { DEFAULT: ['visible', 'hidden'] } });
    
    // Then set the current mode
    state.setMode('visible');
    expect(state.mode).toEqual(['visible']);
    
    state.setMode('hidden');
    expect(state.mode).toEqual(['hidden']);
    
    state.mode = 'visible';
    expect(state.mode).toEqual(['visible']);
  });

  it('should manage content updates', () => {
    const state = new State();
    state.content = { a: 1 };
    expect(state.content).toEqual({ a: 1 });
    
    state.setContent({ b: 2 });
    expect(state.content).toEqual({ a: 1, b: 2 });
    
    const el = document.createElement('div');
    expect(state.setContent(el)).toEqual({ a: 1, b: 2 });
  });

  it('should manage properties updates', () => {
    const state = new State();
    state.properties = { p1: 'val1' };
    expect(state.properties).toEqual({ p1: 'val1' });
    
    state.setProperties({ p2: 'val2' });
    expect(state.properties).toEqual({ p1: 'val1', p2: 'val2' });
    
    const el = document.createElement('div');
    expect(state.setProperties(el)).toEqual({ p1: 'val1', p2: 'val2' });
  });

  it('should traverse up and down using getState', () => {
    class MockChildren {
      constructor(states) { this.states = states; }
      insert(s) { this.states.push(s); }
    }
    const dependencies = { Children: MockChildren, State };
    const rootState = new State({ name: 'root' }, {}, dependencies);
    const childState = new State({ name: 'child' }, { parentState: rootState }, dependencies);
    
    rootState.setChildren([childState]);

    expect(rootState.getState('root').name).toBe('root');
    expect(rootState.getState('child').name).toBe('child');
    
    expect(childState.getState('root', { direction: 'up' }).name).toBe('root');
    expect(childState.getState('root', { direction: 'bi' }).name).toBe('root');
    
    expect(rootState.getState('non-existent')).toBeUndefined();
    expect(childState.getState('non-existent')).toBeUndefined();
  });

  it('should prevent setting itself as parent', () => {
    const state = new State();
    state.parent = state;
    expect(state.parent).toBeUndefined();
  });

  it('should detach component', () => {
    const state = new State({ component: 'test-comp' });
    const destroySpy = vi.fn();
    const compInstance = { component: 'test-comp', destroy: destroySpy, rootElement: document.createElement('div') };
    
    state.setComponent(compInstance);
    
    state.detachComponent();
    expect(destroySpy).toHaveBeenCalled();
    expect(state.componentInstance).toBeUndefined();
    expect(state.component).toBe('test-comp');
  });

  it('should not throw when detaching unrendered string component', () => {
    const state = new State({ component: 'test-comp' });
    state.detachComponent();
    expect(state.componentInstance).toBeUndefined();
  });

  describe('Effects and Pipes', () => {
    it('ContentDatasetPipe should extract from HTMLElement', () => {
      const element = document.createElement('div');
      element.dataset.oloContentValue = '123';
      element.dataset.oloContentIstrue = 'true';
      element.dataset.oloContentText = 'hello';
      
      const res = ContentDatasetPipe(element);
      expect(res.value).toBe(123);
      expect(res.istrue).toBe(true);
      expect(res.text).toBe('hello');
      
      expect(ContentDatasetPipe({ a: 1 })).toEqual({ a: 1 });
    });

    it('PropertiesDatasetPipe should extract from HTMLElement', () => {
      const element = document.createElement('div');
      element.dataset.oloPropertiesConfig = '123';
      
      const res = PropertiesDatasetPipe(element);
      expect(res.config).toBe(123);
    });

    it('ContentViewEffect should call elements.update', () => {
      const elementsMock = { update: vi.fn() };
      const currentModule = { component: 'comp', componentInstance: { elements: elementsMock } };
      
      ContentViewEffect({ a: 1 }, { updateView: true, currentModule }, {});
      expect(elementsMock.update).toHaveBeenCalledWith(currentModule, { a: 1 });
    });
  });
});
