/**
 * @fileoverview Scoped DOM query and selector compilation utility for olo-front components.
 * @module view
 */

// @ts-check

import { COMPONENT_NAME_FALLBACK, DEFAULT_VIEW } from './constants.js';

/**
 * @import { Selector, ViewModule } from './modules.d.ts';
 */

/**
 * A utility for DOM manipulation and element selection within a defined scope.
 * It provides methods to get and search for elements using a specific selector syntax,
 * and to compile selectors from elements.
 * @implements {ViewModule}
 */
export class View {
  /**
   * The root element for this view, all selections are relative to this scope.
   * @type {HTMLElement}
   */
  #scope;

  /**
   * Gets the current root element of the view.
   * @returns {HTMLElement} The scope element.
   */
  get scope() {
    return this.#scope;
  }

  /**
   * Sets the root element of the view.
   * @param {HTMLElement} scope - The new scope element.
   * @returns {void}
   */
  set scope(scope) {
    this.#scope = scope;
  }

  /**
   * Creates an instance of View.
   * The scope can be an HTMLElement or a selector object. If no scope is provided, it defaults to the document body.
   * @param {HTMLElement | Selector} [scope] - The initial scope of the view.
   */
  constructor(
    scope
  ) {
    this.#scope = scope instanceof HTMLElement
      ? scope
      : /**@type {HTMLHtmlElement}*/ (document.querySelector('html'))
  }

  /**
   * Compiles a selector object from an element or an existing selector object.
   * This is useful for creating a reusable selector from a DOM element.
   * @param {HTMLElement | Selector} [element] - The element or selector to compile.
   * @param {Object} [options] - Additional options.
   * @param {boolean} [options.includeTag=false] - Whether to include the tag name in the compiled selector.
   * @returns {Selector} The compiled selector object.
   */
  compileSelector(element, { includeTag = false } = {}) {
    const selector = element instanceof HTMLElement
      ? {
      name: element?.dataset.oloName,
      component: element?.dataset.oloComponent === COMPONENT_NAME_FALLBACK ? undefined : element?.dataset.oloComponent,
      view: element?.dataset.oloView === DEFAULT_VIEW ? undefined : element?.dataset.oloView,
      tag: includeTag ? element?.tagName.toLowerCase() : undefined,
    } : {
      name: element?.name,
      component: element?.component,
      view: element?.view === DEFAULT_VIEW ? undefined : element?.view,
      tag: includeTag ? /**@type {{ [key: string]: string }} */ (element)?.tag : undefined,
    };

    return selector;
  }

  /**
   * Escapes a string for safe use in a CSS selector.
   * @param {string} value
   * @returns {string}
   */
  #escapeCSS = (value) => {
    if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
      return CSS.escape(value);
    }
    return value.replace(/(["\\])/g, '\\$1');
  };

  /**
   * Composes a CSS selector string from a properties object.
   * This is a private method.
   * @param {Object<string, string | undefined> | Selector} properties - The properties to compose the selector from.
   * @returns {string} The composed CSS selector string.
   */
  #composeSelector(properties) {
    let tag = '';

    const compiled = this.compileSelector(properties, { includeTag: true });
    const attributes = Object.keys(compiled).reduce(
      (selector, key) => {
        if (!/^[a-zA-Z0-9_:-]+$/.test(key)) {
          return selector;
        }

        if (key === 'tag') {
          const rawTag = /**@type {Object<string, string | undefined>} */ (compiled)[key] ?? '';
          tag = /^[a-zA-Z0-9_-]+$/.test(rawTag) ? rawTag : '';
          return selector;
        }

        if (typeof /**@type {Object<string, string | undefined>} */ (compiled)[key] === 'string') {
          const rawValue = /**@type {Object<string, string | undefined>} */ (compiled)[key];
          const valueString = rawValue !== undefined && rawValue !== ''
            ? `=${this.#escapeCSS(rawValue)}`
            : '';

          if (key === 'name' || key === 'component' || key === 'route' || key === 'placeholder' || key === 'view') {
            return `${selector}[data-olo-${key}${valueString}]`;
          }

          return `${selector}[${key}${valueString}]`;
        }

        return selector;
      },
      '',
    );

    return tag || attributes ? `${tag}${attributes}` : '*';
  }

  /**
   * Checks if an element belongs to the current scope and is not nested inside a child component.
   * @param {HTMLElement} element - The matched element to check.
   * @param {HTMLElement | null} [scope] - The root scope element of the current component.
   * @returns {boolean} True if the element belongs to scope or scope is unbounded; false if inside a child component.
   */
  #isWithinBoundary(element, scope) {
    if (!scope || typeof scope.closest !== 'function') {
      return true;
    }
    const scopeComponent = scope.closest('[data-olo-component]');
    if (!scopeComponent) {
      return true;
    }
    return element.parentElement?.closest('[data-olo-component]') === scopeComponent;
  }

  /**
   * Checks if the current scope element matches the given selector.
   * This is a private method.
   * @param {Selector} [selector] - The selector to check against.
   * @param {Object} [options] - Additional options.
   * @param {HTMLElement} [options.scope] - The scope to check within. Defaults to the view's scope.
   * @returns {HTMLElement | null} The scope element if it matches, otherwise null.
   */
  #checkScope({ name, component } = {}, { scope = this.scope } = {}) {
    const nameCheck = !name || scope.dataset?.oloName === name;
    const componentCheck = !component || scope.dataset?.oloComponent === component;

    if (nameCheck && componentCheck && !(!name && !component)) {
      return scope;
    }

    return null;
  }

  /**
   * Gets a single element that matches the given selector within the view's scope.
   * @param {Object<string, string | undefined> | Selector} [selector] - The selector to search for.
   * @param {Object} [options] - Additional options.
   * @param {HTMLElement | null} [options.scope] - The scope to search within. Defaults to the view's scope.
   *
   * @returns {HTMLElement | null} The first matching element, or null if no match is found.
   */
  get(selector, { scope = this.scope } = {}) {
    if (selector === undefined || !scope) {
      return null;
    }

    const compiled = this.#composeSelector(selector);
    const children = /**@type {NodeListOf<HTMLElement>} */ (/**@type {HTMLElement} */ (scope).querySelectorAll(compiled));

    for (const child of children) {
      if (this.#isWithinBoundary(child, scope)) {
        return child;
      }
    }

    const scopeCheck = this.#checkScope(
      selector,
      { scope: /**@type {HTMLElement} */ (scope) },
    );

    if (scopeCheck) {
      return scopeCheck;
    }

    return null;
  }

  /**
   * Searches for all elements that match the given selector within the view's scope.
   * @param {(Object<string, string | undefined> | Selector)[]} selectors - The selector to search for.
   * @param {Object} [options] - Additional options.
   * @param {HTMLElement | null} [options.scope] - The scope to search within. Defaults to the view's scope.
   * @param {string} [options.tag] - The tag to search for.
   * @returns {HTMLElement[]} An array of matching elements.
   */
  search(selectors, { scope } = {}) {
    if (selectors === undefined) {
      return [];
    }

    const targetScope = scope ?? this.scope;
    if (!targetScope) {
      return [];
    }

    const query = selectors.map((selector) => this.#composeSelector(selector)).join(', ');

    const children = /**@type {NodeListOf<HTMLElement>} */ (/**@type {HTMLElement} */ (targetScope).querySelectorAll(query));
    const results = [];

    for (const child of children) {
      if (this.#isWithinBoundary(child, targetScope)) {
        results.push(child);
      }
    }

    selectors.forEach((selector) => {
      const scopeCheck = this.#checkScope(selector, { scope: targetScope });
      if (scopeCheck) {
        results.unshift(scopeCheck);
      }
    });

    return results;
  }
}
