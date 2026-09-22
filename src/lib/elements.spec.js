import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Elements } from './elements.js';

describe('Elements', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should compose selector correctly', () => {
    const scope = document.createElement('div');
    const elements = new Elements(scope);
    
    const compiled = elements.compileSelector({ name: 'test-name', component: 'test-comp' });
    expect(compiled).toEqual({ name: 'test-name', component: 'test-comp', view: undefined, tag: undefined });
  });

  it('should set and get scope', () => {
    const elements = new Elements();
    const div = document.createElement('div');
    elements.scope = div;
    expect(elements.scope).toBe(div);
  });

  it('should search for elements by component name', () => {
    const scope = document.createElement('div');
    scope.innerHTML = '<div data-olo-component="test-comp" data-olo-name="test-name"></div>';
    document.body.appendChild(scope);

    const elements = new Elements(scope);
    const results = elements.search([{ component: 'test-comp' }]);
    
    expect(results.length).toBe(1);
    expect(results[0].dataset.oloName).toBe('test-name');
    
    document.body.removeChild(scope);
  });

  it('should insert element and replace placeholder', () => {
    const scope = document.createElement('div');
    scope.dataset.oloComponent = 'parent';
    const placeholder = document.createElement('div');
    placeholder.dataset.oloPlaceholder = 'DYNAMIC';
    placeholder.dataset.oloComponent = 'test-comp';
    scope.appendChild(placeholder);
    document.body.appendChild(scope);
    
    const elements = new Elements(document.body);
    
    const newElement = document.createElement('span');
    newElement.dataset.oloComponent = 'test-comp';
    
    elements.insert(newElement, { component: 'parent' });
    
    expect(scope.contains(newElement)).toBe(true);
    expect(scope.contains(placeholder)).toBe(false);
    
    document.body.removeChild(scope);
  });

  it('should insert into siblings with specific index', () => {
    const scope = document.createElement('div');
    const parent = document.createElement('div');
    parent.dataset.oloComponent = 'parent-comp';
    scope.appendChild(parent);
    
    const child1 = document.createElement('span');
    child1.dataset.oloComponent = 'child-comp';
    const child2 = document.createElement('span');
    child2.dataset.oloComponent = 'child-comp';
    parent.appendChild(child1);
    parent.appendChild(child2);
    
    document.body.appendChild(scope);
    const elements = new Elements(scope);
    
    const newElement = document.createElement('span');
    newElement.dataset.oloComponent = 'child-comp';
    newElement.dataset.oloName = 'new-child';
    
    elements.insert(newElement, { component: 'parent-comp' }, 1);
    
    expect(parent.childNodes[1]).toBe(newElement);
    
    document.body.removeChild(scope);
  });

  it('should move element to new index', () => {
    const scope = document.createElement('div');
    scope.innerHTML = `
      <div data-olo-component="parent-comp">
        <span data-olo-component="child-comp" data-olo-name="child1"></span>
        <span data-olo-component="child-comp" data-olo-name="child2"></span>
        <span data-olo-component="child-comp" data-olo-name="child3"></span>
      </div>
    `;
    document.body.appendChild(scope);
    const elements = new Elements(scope);
    
    elements.move({ name: 'child1' }, { component: 'parent-comp' }, 2);
    
    const parent = scope.querySelector('[data-olo-component="parent-comp"]');
    expect(parent.children[2].dataset.oloName).toBe('child1');
    
    document.body.removeChild(scope);
  });

  it('should update textContent and attributes securely', () => {
    const scope = document.createElement('div');
    scope.innerHTML = `
      <div data-olo-component="comp">
        <a data-olo-name="link"></a>
        <span data-olo-name="text"></span>
      </div>
    `;
    document.body.appendChild(scope);
    const elements = new Elements(scope);
    
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    elements.update({ component: 'comp' }, {
      'text': 'Hello World',
      'link#href': 'https://safe.com',
      'link#onclick': 'alert(1)', 
      'link#href2': 'javascript:alert(1)' 
    });

    const link = scope.querySelector('[data-olo-name="link"]');
    const text = scope.querySelector('[data-olo-name="text"]');
    
    expect(text.textContent).toBe('Hello World');
    expect(link.getAttribute('onclick')).toBeNull(); // Blocked by startsWith('on')
    expect(link.getAttribute('href')).toBe('https://safe.com'); // Safe URL
    expect(link.getAttribute('href2')).toBeNull(); // Blocked by universal URL scheme check
    
    expect(warnSpy).toHaveBeenCalled();
    
    elements.update({ name: 'text' }, 'Updated Single Text');
    expect(text.textContent).toBe('Updated Single Text');
    
    document.body.removeChild(scope);
  });

  it('should extract content correctly', () => {
    const scope = document.createElement('div');
    scope.dataset.oloComponent = 'comp';
    scope.dataset.oloName = 'comp-root';
    scope.innerHTML = `
      <span data-olo-name="child1">Extracted Text</span>
      <a data-olo-name="child2" href="https://example.com">Link</a>
    `;
    document.body.appendChild(scope); // scope is now the component root itself
    
    const elements = new Elements(scope);
    
    const request = {
      'child1': 'OLO-SLOT',
      'child2#href': 'OLO-SLOT',
      'ROOT#data-olo-component': 'OLO-SLOT',
      'missing': 'OLO-SLOT',
      'normal': 'keep'
    };
    
    const res = elements.extractContent({ name: 'comp-root' }, request, scope);
    expect(res.child1).toBe('Extracted Text');
    expect(res['child2#href']).toBe('https://example.com');
    expect(res['ROOT#data-olo-component']).toBe('comp');
    expect(res.missing).toBeUndefined();
    expect(res.normal).toBe('keep');
    
    document.body.removeChild(scope);
  });

  it('should compileView from template', () => {
    const scope = document.createElement('div');
    scope.innerHTML = `
      <template data-olo-component="comp" data-olo-view="custom">
        <div>Compiled!</div>
      </template>
    `;
    document.body.appendChild(scope);
    
    const elements = new Elements(scope);
    const fragment = elements.compileView({ component: 'comp', name: 'instance1', view: 'custom' });
    
    expect(fragment.dataset.oloName).toBe('instance1');
    expect(fragment.dataset.oloComponent).toBe('comp');
    expect(fragment.dataset.oloView).toBe('custom');
    expect(fragment.textContent.trim()).toBe('Compiled!');
    
    document.body.removeChild(scope);
  });
});
