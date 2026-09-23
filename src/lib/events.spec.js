import { Events, OloEvent } from './events.js';
import { describe, expect, it, vi } from 'vitest';

describe('OloEvent', () => {
  it('should create an OloEvent with action, value, and context', () => {
    const context = { myProp: 123 };
    const ev = new OloEvent('my-action', 'my-val', context);
    expect(ev.action).toBe('my-action');
    expect(ev.value).toBe('my-val');
    expect(ev.context).toBe(context);
    expect(ev.bubbles).toBe(true);
    expect(ev.type).toBe('oloEvent');
  });
});

describe('Events', () => {
  it('should initialize with listeners array in constructor', () => {
    const scope = document.createElement('div');
    const child = document.createElement('button');
    child.dataset.oloName = 'my-btn';
    scope.appendChild(child);

    const callback = vi.fn();
    // Providing a target that requires this.get() compilation (Selector)
    const events = new Events({ 
      scope, 
      listeners: [{ target: { name: 'my-btn' }, event: 'click', callback }] 
    });

    child.click();
    expect(callback).toHaveBeenCalled();
  });

  it('should listen and unlisten using direct HTMLElement target', () => {
    const scope = document.createElement('div');
    const events = new Events({ scope });
    const callback = vi.fn();

    events.listen({ target: scope, event: 'click', callback });
    scope.click();
    expect(callback).toHaveBeenCalled();

    callback.mockClear();
    events.unlisten({ target: scope, event: 'click', callback });
    scope.click();
    expect(callback).not.toHaveBeenCalled();
  });

  it('should use scope as default target and oloEvent as default event', () => {
    const scope = document.createElement('div');
    const events = new Events({ scope });
    const callback = vi.fn();

    events.listen({ callback }); // fallback to scope and 'oloEvent'
    scope.dispatchEvent(new Event('oloEvent'));
    expect(callback).toHaveBeenCalled();
  });

  it('should stopAll listeners via AbortController', () => {
    const scope = document.createElement('div');
    const events = new Events({ scope });
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    events.listen({ target: scope, event: 'click', callback: callback1 });
    events.listen({ target: scope, event: 'hover', callback: callback2 });
    
    events.stopAll();
    
    scope.click();
    scope.dispatchEvent(new Event('hover'));
    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).not.toHaveBeenCalled();
  });

  it('should dispatch custom OloEvent', () => {
    const scope = document.createElement('div');
    const events = new Events({ scope });
    const callback = vi.fn();

    scope.addEventListener('oloEvent', callback);
    events.dispatch('my-action', 'my-val', { contextProp: true });
    
    expect(callback).toHaveBeenCalled();
    const dispatchedEvent = callback.mock.calls[0][0];
    expect(dispatchedEvent.action).toBe('my-action');
    expect(dispatchedEvent.value).toBe('my-val');
    expect(dispatchedEvent.context.contextProp).toBe(true);
  });

  it('should support positional arguments ("name", "click", fn) and unlisten', () => {
    const scope = document.createElement('div');
    const child = document.createElement('button');
    child.dataset.oloName = 'actionBtn';
    scope.appendChild(child);

    const events = new Events({ scope });
    const callback = vi.fn();

    events.listen('actionBtn', 'click', callback);
    child.click();
    expect(callback).toHaveBeenCalledTimes(1);

    events.unlisten('actionBtn', 'click', callback);
    child.click();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should support positional arguments ("click", fn) to listen directly on scope', () => {
    const scope = document.createElement('div');
    const events = new Events({ scope });
    const callback = vi.fn();

    events.listen('click', callback);
    scope.click();
    expect(callback).toHaveBeenCalledTimes(1);

    events.unlisten('click', callback);
    scope.click();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
