import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Children } from './children.js';
import { State } from './state.js';
import { Component } from './component.js';

describe('Children', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  const getDependencies = (overrides = {}) => ({
    Elements: class MockElements {
      constructor(scope) { this.scope = scope; }
      insert(el, parent, index) {
        const p = this.get(parent);
        if (p && el) p.appendChild(el);
        return el;
      }
      remove(selector) {
        const target = this.get(selector);
        if (target && typeof target.remove === 'function') {
           target.remove();
           return target;
        }
        return { remove: vi.fn() };
      }
      get(selector) {
         if (selector && selector.nodeType === 1) return selector;
         if (selector && selector.options && selector.options.rootElement) return selector.options.rootElement;
         return null;
      }
    },
    State,
    Component,
    componentBuilder: {
      buildFromTemplate: vi.fn(async (compName, view, state, options) => {
        const rootElement = document.createElement('div');
        rootElement.dataset.oloComponent = compName;
        return { component: compName, rootElement, mount: vi.fn(), name: state.name };
      }),
      buildFromContent: vi.fn(async (compName, state, options) => {
        const rootElement = document.createElement('div');
        rootElement.dataset.oloComponent = compName;
        return { component: compName, rootElement, mount: vi.fn(), name: state.name };
      }),
    },
    ...overrides
  });

  it('should get all states (component and virtual)', async () => {
    const parentState = new State({ name: 'parent' });
    const children = new Children([], { parentState }, getDependencies());
    
    const virtualState = new State({ name: 'v1' });
    await children.insert(virtualState, 'LAST', { updateView: false });
    
    expect(children.states.length).toBe(1);
    expect(children.states[0].name).toBe('v1');
  });

  it('should find child by name', async () => {
    const parentState = new State({ name: 'parent' });
    const children = new Children([], { parentState }, getDependencies());
    
    const child = new State({ name: 'child1', component: 'c1' });
    const inserted = await children.insert(child, 'LAST', { updateView: false });
    
    expect(children.findChild('child1')).toBe(inserted);
    expect(children.findChild('non-existent')).toBeUndefined();
  });

  it('should insert child with updateView: true', async () => {
    const parentRoot = document.createElement('div');
    parentRoot.dataset.oloComponent = 'parent';
    document.body.appendChild(parentRoot);

    const parentState = new State({ name: 'parent' }, { rootElement: parentRoot });
    parentState.setComponent({ onAddChild: vi.fn() });

    const deps = getDependencies();
    const children = new Children([], { parentState }, deps);
    
    const childState = new State({ name: 'child1', component: 'c1' });
    
    const result = await children.insert(childState, 'LAST', { updateView: true });
    
    expect(result).toBeDefined();
    expect(result.component).toBe('c1');
    expect(deps.componentBuilder.buildFromTemplate).toHaveBeenCalled();
    expect(children.findChild('child1')).toBe(result);
    expect(parentRoot.children.length).toBe(1);
    expect(parentRoot.firstElementChild.dataset.oloComponent).toBe('c1');
  });

  it('should handle insert with placeholder', async () => {
    const parentRoot = document.createElement('div');
    document.body.appendChild(parentRoot);

    const placeholder = document.createElement('div');
    placeholder.dataset.oloComponent = 'c1';
    placeholder.dataset.oloPlaceholder = 'DYNAMIC';
    parentRoot.appendChild(placeholder);

    const parentState = new State({ name: 'parent' }, { rootElement: parentRoot });
    const deps = getDependencies();
    const children = new Children([], { parentState }, deps);
    
    const childState = new State({ name: 'child1', component: 'c1' });
    
    await children.insert(childState, 'LAST', { updateView: true, placeholder });
    
    expect(deps.componentBuilder.buildFromTemplate).toHaveBeenCalled();
  });

  it('should remove child state and DOM element (updateView: true)', async () => {
    const parentRoot = document.createElement('div');
    parentRoot.dataset.oloComponent = 'parent';
    document.body.appendChild(parentRoot);

    const parentState = new State({ name: 'parent' }, { rootElement: parentRoot });
    const mockOnRemoveChild = vi.fn();
    parentState.setComponent({ onRemoveChild: mockOnRemoveChild });
    
    const deps = getDependencies();
    const children = new Children([], { parentState }, deps);
    
    const childState = new State({ name: 'child1', component: 'c1' });
    const inserted = await children.insert(childState, 'LAST', { updateView: true });
    
    // Inject a dummy component instance so onRemoveChild passes
    inserted.setComponent({});
    
    const removed = children.remove({ name: 'child1' }, { updateView: true });
    
    expect(removed).toBeDefined();
    expect(removed.name).toBe('child1');
    expect(mockOnRemoveChild).toHaveBeenCalled();
  });

  it('should remove child state WITHOUT DOM element (updateView: false)', async () => {
    const parentState = new State({ name: 'parent' });
    const children = new Children([], { parentState }, getDependencies());
    const child = new State({ name: 'child1', component: 'c1' });
    
    await children.insert(child, 'LAST', { updateView: false });
    
    const result = children.remove('LAST', { updateView: false });
    expect(result.name).toBe('child1');
    expect(children.states.length).toBe(0);
  });

  it('should move child state', async () => {
    const parentRoot = document.createElement('div');
    document.body.appendChild(parentRoot);

    const parentState = new State({ name: 'parent' }, { rootElement: parentRoot });
    const children = new Children([], { parentState }, getDependencies());
    
    const child1 = new State({ name: 'child1', component: 'c1' });
    const child2 = new State({ name: 'child2', component: 'c2' });
    
    await children.insert(child1, 'LAST', { updateView: true });
    await children.insert(child2, 'LAST', { updateView: true });
    
    const moved = children.move({ name: 'child1' }, 'LAST', { updateView: true });
    
    expect(moved.name).toBe('child1');
  });

  it('should return the removed state even if DOM element is missing (Option A)', async () => {
    const parentRoot = document.createElement('div');
    const parentState = new State({ name: 'parent' }, { rootElement: parentRoot });
    const children = new Children([], { parentState }, getDependencies());
    const child = new State({ name: 'child2', component: 'c2' });
    
    const inserted = await children.insert(child, 'LAST', { updateView: false });
    
    const result = children.remove({ name: 'child2' }, { updateView: true });
    
    expect(result).toBe(inserted);
    expect(children.findChild('child2')).toBeUndefined();
  });
  it('should support move with NEXT and PREV and call move', async () => {
    const elementsMoveSpy = vi.fn();
    const deps = getDependencies();
    deps.Elements = class {
      insert() { return document.createElement('div'); }
      move = elementsMoveSpy;
      remove() { return { remove: vi.fn() }; }
      get() { return document.createElement('div'); }
    };
    const parentState = new State({ name: 'parent', component: 'p1' });
    const children = new Children([], { parentState }, deps);
    const c1 = new State({ name: 'c1', component: 'c' });
    const c2 = new State({ name: 'c2', component: 'c' });
    const c3 = new State({ name: 'c3', component: 'c' });
    
    await children.insert(c1, 'LAST', { updateView: false });
    await children.insert(c2, 'LAST', { updateView: false });
    await children.insert(c3, 'LAST', { updateView: false });
    
    children.move({ name: 'c1' }, 'NEXT', { updateView: true, parentState });
    children.move({ name: 'c3' }, 'PREV', { updateView: true, parentState });
    
    expect(elementsMoveSpy).toHaveBeenCalledTimes(2);
  });
});
