import { describe, expect, it, vi } from 'vitest';
import { Mode, CurrentViewEffect } from './mode.js';

describe('Mode', () => {
  it('should initialize and set modes correctly with array', () => {
    const mode = new Mode(['light', 'dark']);
    expect(mode.modes).toEqual({ DEFAULT: ['light', 'dark'] });
    expect(mode.current).toEqual(['light']); // defaults to first mode in set
  });

  it('should initialize and set modes correctly with object', () => {
    const mode = new Mode({
      modes: {
        theme: ['light', 'dark'],
        size: ['sm', 'md', 'lg']
      },
      current: ['dark', 'lg']
    });
    
    expect(mode.modes).toEqual({
      theme: ['light', 'dark'],
      size: ['sm', 'md', 'lg']
    });
    
    // Check if the current modes are applied correctly
    expect(mode.current.includes('dark')).toBe(true);
    expect(mode.current.includes('lg')).toBe(true);
  });

  it('should update current mode', () => {
    const mode = new Mode({
      theme: ['light', 'dark']
    });
    
    expect(mode.current).toEqual(['light']);
    mode.setCurrent('dark');
    expect(mode.current).toEqual(['dark']);
    
    // Setting via setter
    mode.current = 'light';
    expect(mode.current).toEqual(['light']);
  });

  it('should update modes via setter', () => {
    const mode = new Mode(['light', 'dark']);
    mode.setModes({ color: ['red', 'blue'] });
    expect(mode.modes).toEqual({ color: ['red', 'blue'] }); // DEFAULT is deleted
    
    // Setting via setter adds to the sets
    mode.modes = { size: ['big', 'small'] };
    expect(mode.modes).toEqual({ color: ['red', 'blue'], size: ['big', 'small'] });
  });

  it('should handle undefined modes and current', () => {
    const mode = new Mode(['test']);
    expect(mode.setCurrent()).toEqual(['test']);
    expect(mode.setModes()).toEqual({ DEFAULT: ['test'] });
  });

  it('should apply CurrentViewEffect correctly', () => {
    const element = { dataset: {} };
    class MockElements {
      constructor() {
        this.get = vi.fn().mockReturnValue(element);
      }
    }
    const dependencies = { Elements: MockElements };
    const options = { selector: { name: 'test' } };
    
    CurrentViewEffect(['Dark', 'LG'], options, dependencies);
    expect(element.dataset.oloMode).toBe('dark lg');
    
    // Test early returns
    CurrentViewEffect(['Dark'], null, dependencies);
    CurrentViewEffect(['Dark'], options, null);
  });
});
