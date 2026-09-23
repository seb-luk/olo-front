/**
 * @fileoverview Elements class for DOM tree manipulation, placeholder swapping, template compilation, and safe content updates.
 * @module elements
 */

// @ts-check

import { COMPONENT_CONTENT_SLOT_VALUE, COMPONENT_NAME_FALLBACK, COMPONENT_ROOT_ELEMENT_MARK, DEFAULT_VIEW, PLACEHOLDER_DYNAMIC, PLACEHOLDER_STATIC } from './constants.js';

import { View } from './view.js';

/**
 * @import {
 *  ElementsModule,
 *  ElementsOptions,
 *  Index,
 *  ModuleOptions,
 *  Selector,
 *  StateContent,
 * } from './modules.d.ts';
 */


/**
 * Manages DOM elements, including creation, manipulation, and template compilation.
 * It provides a higher-level API for interacting with the DOM in a structured way.
 * @implements {ElementsModule}
 */
export class Elements extends View {
  /**
   * A cache for placeholder elements, keyed by component name.
   * This is used to restore placeholders when components are removed.
   * @type {{ [key: string]: HTMLElement }}
   */
  #placeholders = {};

  /**
   * Creates an instance of Elements.
   * @param {HTMLElement | Selector} [scope] - The scope to operate within. Defaults to the document body.
   */
  constructor(
    scope,
  ) {
    super(scope);
  }

  /**
   * Checks if the given index is the last index in a list.
   * @param {Index} index - The index to check.
   * @param {number} length - The total length of the list.
   * @returns {boolean} - True if the index is the last one, false otherwise.
   */
  #isLastIndex(index, length) {
    return (typeof index === 'number' && index >= length) || index === 'LAST';
  }

  /**
   * Normalizes a given index ('FIRST', 'LAST', or a number) to a valid array index.
   * @param {Index} index - The index to normalize.
   * @param {number} length - The total length of the array or list.
   * @param {ElementsOptions} [options] - Additional options, like for a new element.
   * @returns {number} - The normalized numerical index.
   */
  normalizeIndex(index, length, { newElement = false } = {}) {
    if (length === 0) {
      return 0;
    }

    const last = this.#isLastIndex(index, length);
    const first = (typeof index === 'number' && index <= 0) || index === 'FIRST';

    const rangeIndex = /**@type {number} */ (first ? 0 : last ? length - 1 : index);

    return newElement && last ? rangeIndex + 1 : rangeIndex;
  }

  /**
   * Replaces an existing element or placeholder in the DOM with a new element or view.
   * @param {Selector | HTMLElement} target - The target element or its selector to replace.
   * @param {HTMLElement | HTMLCollection} [replacement] - The view to insert in place of the target.
   * @returns {HTMLElement | null} - The inserted element, or null if the operation failed.
   */
  replace(target, replacement) {
    if (!replacement) {
      return null;
    }

    const targetEl = target instanceof HTMLElement ? target : this.get(target);
    const element = /**@type {HTMLElement} */ (replacement instanceof HTMLCollection ? replacement[0] : replacement);

    if (targetEl) {
      targetEl.replaceWith(element);
      return element;
    }

    return this.get(element instanceof HTMLElement ? this.compileSelector(element) : element);
  }

  /**
   * Inserts an element into a list of sibling elements at a specified index.
   * @param {Selector} selector - The selector for the element, used to identify siblings.
   * @param {HTMLElement | null} [element] - The element to insert.
   * @param {HTMLElement | null} [parent] - The parent element containing the siblings.
   * @param {Index} [index] - The index at which to insert the element ('FIRST', 'LAST', or a number).
   * @returns {HTMLElement | null} - The inserted element, or null if the operation failed.
   */
  #insertIntoSiblings(selector, element, parent, index = 'LAST') {
    if (parent && element) {
      const siblings = [
        ...parent.querySelectorAll(`[data-olo-component="${selector.component}"]`) ?? []
      ].filter(sibling => sibling !== element);

      if (siblings.length === 0) {
        parent.appendChild(element);
        return element;
      }

      const siblingElement = siblings[this.normalizeIndex(index, siblings.length)];

      if (siblingElement) {
        if (this.#isLastIndex(index, siblings.length)) {
          siblingElement.after(element);
        } else {
          siblingElement.before(element);
        }
        return element;
      }
    }

    return null;
  }

  /**
   * Inserts an element into the DOM at a specified location.
   * It can replace a dynamic placeholder or be inserted among siblings.
   * @param {HTMLElement} element - The element to insert.
   * @param {Selector} [parent] - The selector for the parent element.
   * @param {Index} [index] - The index at which to insert the element.
   * @returns {HTMLElement | null} - The inserted element, or null if the operation failed.
   */
  insert(element, parent, index = 'LAST') {
    const parentNode = this.get(parent);
    if (parentNode) {
      const selector = this.compileSelector(element);
      const placeholder =/**@type {HTMLElement} */ (
        parentNode.querySelector(`[data-olo-placeholder="${PLACEHOLDER_DYNAMIC}"][data-olo-component="${selector.component ?? COMPONENT_NAME_FALLBACK}"]`)
      );

      if (placeholder) {
        this.#placeholders[selector.component ?? COMPONENT_NAME_FALLBACK] = placeholder;
        return this.replace(placeholder, element);
      }

      return this.#insertIntoSiblings(selector, element, parentNode, index);
    }

    return null;
  }

  /**
   * Moves an existing element to a new parent and/or index.
   * @param {Selector} selector - The selector for the element to move.
   * @param {Selector} parent - The selector for the new parent element.
   * @param {Index} index - The new index for the element within its siblings.
   * @returns {HTMLElement | null} - The moved element, or null if the operation failed.
   */
  move(selector, parent, index) {
    const element = this.get(selector);
    const parentNode = this.get(parent);

    return this.#insertIntoSiblings(selector, element, parentNode, index);
  }

  /**
   * Removes an element from the DOM. If it's the last element of its type, it might be replaced by a placeholder.
   * @param {Selector | HTMLElement} selector - The element or selector to remove.
   * @param {number} [remainingItems] - The number of similar items remaining in the DOM.
   * @returns {HTMLElement | null} - The removed element, or null if it was not found.
   */
  remove(selector, remainingItems) {
    const target = selector instanceof HTMLElement ? selector : this.get(selector);

    if (target) {
      const componentName = selector instanceof HTMLElement
        ? selector.dataset?.oloComponent ?? COMPONENT_NAME_FALLBACK
        : selector?.component ?? COMPONENT_NAME_FALLBACK;

      if (remainingItems === 0 && this.#placeholders[componentName]) {
        this.replace(target, this.#placeholders[componentName]);
      } else {
        target.remove();
      }

      return target;
    }

    return null;
  }

  /**
   * Validates whether an attribute name and value are safe to write to a DOM node.
   * @param {string} attribute
   * @param {string} value
   * @returns {boolean}
   */
  #isSafeAttribute = (attribute, value) => {
    const attrLower = attribute.toLowerCase();

    // Deny inline event handlers and dangerous embedding attributes
    if (attrLower.startsWith('on') || attrLower === 'srcdoc') {
      console.warn(`Blocked unsafe attribute assignment: "${attribute}"`);
      return false;
    }

    // Deny dangerous URL schemes in ANY attribute to prevent bypasses via data-* or custom attributes
    const trimmed = value.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:text/html')) {
      console.warn(`Blocked unsafe URL scheme in attribute "${attribute}": "${value}"`);
      return false;
    }

    return true;
  }

  /**
   * Writes content to one or more DOM elements, either as text content or by setting an attribute.
   * @param {string} name - The `data-olo-name` of the element.
   * @param {string | number | boolean} content - The content to write.
   * @param {string} attribute - The attribute to write to (e.g., 'textContent', 'href').
   * @param {HTMLElement} [scope] - The scope element to write within. Defaults to the view's scope.
   */
  #writeContent(name, content, attribute, scope = this.scope) {
    const strContent = content + '';

    if (attribute !== 'textContent' && !this.#isSafeAttribute(attribute, strContent)) {
      return;
    }

    const nodes = this.search([{ name }], { scope });

    nodes.forEach((node) => {
      if (attribute === 'textContent') {
        node.textContent = strContent;
      } else {
        node.setAttribute(attribute, strContent);
      }
    });
  }

  /**
   * Compiles the arguments for the `writeContent` method from a key-value pair.
   * @param {string} name - The base name of the element.
   * @param {string | number | boolean} content - The content to write.
   * @param {string} key - The key, which may contain an attribute selector (e.g., 'my-element#href').
   * @returns {[string, string | number | boolean, string]} - The compiled arguments for `writeContent`.
   */
  #compileWriteArgs(name, content, key) {
    const [additionSelector, attribute] = key.split('#');

    return [
      additionSelector && additionSelector !== 'ROOT' ? additionSelector : name,
      content,
      attribute ? attribute : 'textContent',
    ];
  }

  /**
   * Updates the content of one or more DOM elements based on a selector and content object.
   * @param {Selector} selector - The selector for the elements to update.
   * @param {string | number | boolean | Object<string | symbol, string | number | boolean>} content - The content to write.
   * @param {string} [attribute='textContent'] - The default attribute to write to if not specified in the content keys.
   * @returns {void}
   */
  update(
    selector,
    content,
    attribute = 'textContent',
  ) {
    const baseName = selector?.name ?? '';
    if (typeof content === 'object' && content !== null) {
      Object.keys(content).forEach(key => {
        this.#writeContent(...this.#compileWriteArgs(baseName, content[key], key));
      });
    } else {
      this.#writeContent(baseName, content, attribute);
    }
  }

  /**
   * Extracts content from HTML elements and populates a content object.
   * This is used for extracting data from slots.
   * @param {Selector} selector - The selector for the component.
   * @param {StateContent} content - The content object to be populated.
   * @param {HTMLElement} [html] - The HTML scope to search within.
   * @returns {StateContent} The content object enriched with data from the DOM.
   */
  extractContent(selector, content, html) {
    if (typeof content !== 'object' || content === null) {
      return {};
    }

    const targetScope = html ?? this.scope;
    const enrichedContent = { ...content };
    const relevantKeys = /** @type {string[]} */ (Object.keys(content).filter(key => content[key] === COMPONENT_CONTENT_SLOT_VALUE));

    relevantKeys.forEach((key) => {
      let [name, attribute] = key.split('#');

      const isRoot = name === COMPONENT_ROOT_ELEMENT_MARK;
      name = isRoot ? selector.name ?? name : name;

      const node = (isRoot && targetScope) ? targetScope : this.get({ name }, { scope: targetScope });

      if (node) {
        if (!attribute || attribute === 'textContent') {
          enrichedContent[key] = node.textContent ?? '';
        } else {
          enrichedContent[key] = node.getAttribute(attribute) ?? '';
        }
      }

      if (enrichedContent[key] === COMPONENT_CONTENT_SLOT_VALUE) {
        delete enrichedContent[key];
      }
    });

    return enrichedContent;
  }

  /**
   * Searches for an existing view in the DOM.
   * @param {Selector} selector - The selector for the view.
   * @returns {HTMLElement | null} - The found view element, or null if it could not be found.
   */
  searchView(selector) {
    return this.search([selector])
      .find(elem => {
        if (elem.getAttribute('data-olo-placeholder') === 'STATIC' || elem.tagName.toLowerCase() === 'template') {
          return false;
        }
        return true;
      }) ?? null
  }

  /**
   * Compiles view from a template.
   * @param {Selector} selector - The selector for the view.
   * @param {Object} [options] - Additional options for compiling the view.
   * @param {HTMLTemplateElement} [options.template] - An optional template element to use.
   * @returns {HTMLElement | null} - The compiled view element, or null if it could not be created.
   */
  compileView(selector, { template } = {}) {
    const templateNode = template
        ?? /** @type {HTMLTemplateElement | null} */ (this.get?.({ component: selector.component, view: selector.view, tag: 'template' }, { scope: document.body }))
        ?? /** @type {HTMLTemplateElement | null} */ (this.get?.({ view: selector.view ?? DEFAULT_VIEW, tag: 'template' }, { scope: document.body }))

    let fragment = /** @type {HTMLElement | null} */ (templateNode?.content.firstElementChild?.cloneNode(true) ?? null);

    if(!fragment) {
      return fragment;
    }

    if(selector.name) {
      fragment.setAttribute('data-olo-name', selector.name);
    }
    if(selector.component) {
      fragment.setAttribute('data-olo-component', selector.component);
    }
    if(selector.view && selector.view !== DEFAULT_VIEW) {
      fragment.setAttribute('data-olo-view', selector.view);
    }

    return fragment;
  }
}
