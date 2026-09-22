import { describe, expect, it, vi } from 'vitest';
import { Module } from './module.js';

describe('Module', () => {
  it('should initialize with properties and pipes', () => {
    const pipe1 = vi.fn((val) => val + 1);
    const m = new Module(
      { properties: ['myProp'], pipes: { myProp: [pipe1] } },
      {}
    );
    m.myProp = 0;
    m.executeSetter('myProp', (v) => v, 1);
    expect(pipe1).toHaveBeenCalledWith(1, expect.any(Object), expect.any(Object));
  });

  it('should execute setter and trigger effects', () => {
    const effect = vi.fn();
    const m = new Module({ properties: ['test'], effects: { test: [effect] } });
    m.test = 1;
    m.executeSetter('test', (v) => {
      m.test = v;
      return v;
    }, 2);
    expect(m.test).toBe(2);
    expect(effect).toHaveBeenCalledWith(2, expect.any(Object), expect.any(Object));
  });

  it('should apply pipes manually and return unmodified if no pipes exist', () => {
    const m = new Module({ properties: ['nonExistent', 'hasPipes'] });
    expect(m.applyPipes('nonExistent', 'data')).toBe('data');

    m.pipes.hasPipes = [(d) => d + ' piped'];
    expect(m.applyPipes('hasPipes', 'data', { custom: 1 }, { dep: 2 })).toBe('data piped');
  });

  it('should add and remove effects', () => {
    const m = new Module({ properties: ['count'] });
    m.count = 10;
    const effectFn = vi.fn();
    
    // addEffect triggers immediately if property has a value
    m.addEffect('count', effectFn);
    expect(effectFn).toHaveBeenCalledWith(10, expect.any(Object), expect.any(Object));
    expect(m.effects.count).toContain(effectFn);

    // addEffect shouldn't add the same effect twice
    const result = m.addEffect('count', effectFn);
    expect(result).toBeNull();
    
    // addEffect with invalid function
    expect(m.addEffect('count', 'notAFunction')).toBeNull();

    // remove specific effect
    m.removeEffect('count', effectFn);
    expect(m.effects.count).not.toContain(effectFn);

    // remove all effects
    m.addEffect('count', vi.fn());
    m.removeEffect('count');
    expect(m.effects.count).toEqual([]);

    // removeEffect for non-existent property
    expect(m.removeEffect('unknown')).toBeNull();
  });

  it('should trigger effects manually', () => {
    const effect1 = vi.fn();
    const effect2 = vi.fn();
    const m = new Module({ properties: ['prop1', 'prop2'] });
    m.addEffect('prop1', effect1);
    m.addEffect('prop2', effect2);

    // specific property
    m.triggerEffects('prop1', 'data1', { opt: 1 }, { dep: 1 });
    expect(effect1).toHaveBeenCalledWith('data1', expect.objectContaining({ opt: 1 }), expect.objectContaining({ dep: 1 }));

    // all properties
    m.triggerEffects(undefined, 'dataAll');
    expect(effect1).toHaveBeenCalledWith('dataAll', expect.any(Object), expect.any(Object));
    expect(effect2).toHaveBeenCalledWith('dataAll', expect.any(Object), expect.any(Object));
  });

  it('should re-throw when executeSetter throws', () => {
    const m = new Module({ properties: ['bad'] });
    
    expect(() => {
      m.executeSetter('bad', () => { throw new Error('Bad setter'); }, 'value');
    }).toThrow('Bad setter');
  });
  
  it('should add and remove pipes', () => {
    const m = new Module({ properties: ['score'] });
    const pipeFn = vi.fn(x => x);
    
    m.addPipe('score', pipeFn);
    expect(m.pipes.score).toContain(pipeFn);
    
    // add invalid pipe
    expect(m.addPipe('score', 'notAPipe')).toBeNull();
    // add duplicate
    expect(m.addPipe('score', pipeFn)).toBeNull();
    
    m.removePipe('score', pipeFn);
    expect(m.pipes.score).not.toContain(pipeFn);
    
    m.addPipe('score', pipeFn);
    m.removePipe('score');
    expect(m.pipes.score).toEqual([]);
    
    expect(m.removePipe('unknown')).toBeNull();
  });
});
