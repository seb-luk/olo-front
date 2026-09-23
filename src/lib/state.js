/**
 * @fileoverview Reactive State module managing component data, content slots, properties, mode, and child states.
 * @module state
 */

// @ts-check

import { COMPONENT_ROOT_ELEMENT_MARK } from './constants.js';
import { Module } from './module.js';

/**
 * @import {
 *  StateModule,
 *  StateConfig,
 *  StateOptions,
 *  ModuleDependencies,
 *  ModeModule,
 *  Effect,
 *  StateContent,
 *  Selector,
 *  ComponentModule,
 *  ChildrenModule,
 *  StateProperties,
 *  Pipe,
 *  SetterOptions,
 * } from './modules.d.ts';
 */

/**
 * Converts a string value from a placeholder to its appropriate type (string, number, or boolean).
 * This is used to parse data attributes from the DOM.
 * @param {string} value - The string value to convert.
 * @returns {string | number | boolean} The converted value.
 */
const convertPlaceholderData = (value) => {
  const number = Number.parseFloat(value);
  if (!Number.isNaN(number)) {
    return number;
  }

  if (value === 'true' || value === 'false') {
    return value === 'true';
  }

  return value;
}

/**
 * A factory function that creates a pipe for processing datasets from HTML elements.
 * The created pipe extracts data from `dataset` properties of an HTMLElement.
 * @param {string} oloKey - The base key to look for in the element's dataset (e.g., 'oloContent').
 * @returns {Pipe} A pipe function that takes an HTMLElement and returns an object with the extracted data.
 */
const datasetPipeFactory = (oloKey) => (data) => {
  if (typeof HTMLElement === 'undefined' || !(data instanceof HTMLElement)) {
    return data;
  }

  const { dataset } = data;


  const keys = Object.keys(dataset)
    .filter(key => key.includes(oloKey));

  if (keys.length === 0) {
    return {};
  }

  return keys.reduce((acc, key) => {
    const contentKey = key.replace(oloKey, '').toLowerCase();

    if (dataset[key]) {
      acc[contentKey] = convertPlaceholderData(dataset[key]);
    }

    return acc;
  }, /**@type {{[key: string]: string | number | boolean}} */ ({}));
}


/**
 * A pipe that processes content data from an element's dataset.
 * It uses the 'oloContent' key to identify relevant data attributes.
 * @type {Pipe<StateContent>}
 */
export const ContentDatasetPipe = datasetPipeFactory('oloContent');

/**
 * A pipe that processes properties data from an element's dataset.
 * It uses the 'oloProperties' key to identify relevant data attributes.
 * @type {Pipe<StateContent>}
 */
export const PropertiesDatasetPipe = datasetPipeFactory('oloProperties');


/**
 * An effect that updates the view with the current content.
 * This is triggered when the state's content changes.
 * @type {Effect<StateContent>}
 */
export const ContentViewEffect = (data, options, dependencies) => {
  if (options?.updateView && /**@type {any} */ (options?.currentModule)?.component) {
    const currentModule = /**@type {any} */ (options?.currentModule);
    const elements = currentModule?.componentInstance?.elements;
    if (elements?.update) {
      elements.update(/**@type {Selector} */ (options?.currentModule), data);
      return;
    }

    if (dependencies?.Elements) {
      const scope = currentModule?.componentInstance?.rootElement
        ?? (options.scope instanceof HTMLElement ? options.scope : undefined)
        ?? (options.selector && typeof document !== 'undefined' ? new dependencies.Elements(document.body).get?.(options.selector) : undefined);

      if (scope instanceof HTMLElement) {
        new (dependencies.Elements)(scope).update?.(/**@type {Selector} */ (options?.currentModule), data);
      }
    }
  }
}


/**
 * Represents the state of a component, including its name, content, properties, and children.
 * It extends the Module class and provides a structured way to manage component state.
 * @implements {StateModule}
 */
export class State extends Module {
  /**
   * The name of the state, used for identification.
   * @type {string}
   */
  #name = '';

  /**
   * Gets the name of the state.
   * @returns {string} The name of the state.
   */
  get name() {
    return this.#name;
  }

  /**
   * Sets the name of the state. Once set, the name cannot be changed.
   * It also updates the selector in the module's options.
   * @param {string} name - The new name for the state.
   * @returns {void}
   */
  set name(name) {
    this.#name = this.#name || name;
    this.options.selector = { ...this.options.selector, name: this.#name };
    if (this.#mode?.options) {
      this.#mode.options.selector = { ...this.#mode.options.selector, name: this.#name };
    }
  }


  /**
   * The component associated with the state. Can be a string identifier or a ComponentModule instance.
   * @type {string | ComponentModule | undefined}
   */
  #component;

  /**
   * Gets the component identifier associated with the state.
   * @returns {string | undefined} The component's string identifier.
   */
  get component() {
    return typeof this.#component === 'string'
      ? this.#component
      : this.#component?.component;
  }

  /**
   * Gets the component instance associated with this state.
   * @returns {ComponentModule | undefined}
   */
  get componentInstance() {
    return typeof this.#component === 'object' ? this.#component : undefined;
  }

  /**
   * Sets the component for the state. It can be a string or a ComponentModule.
   * @param {string | ComponentModule | undefined} component - The component to set.
   * @returns {void}
   */
  setComponent(component) {
    if (!component || typeof this.#component === 'object') {
      return;
    }

    if (typeof component === 'string') {
      this.#component = this.#component || component;
      this.options.selector = { ...this.options.selector, component: this.#component };
      if (this.#mode?.options) {
        this.#mode.options.selector = { ...this.#mode.options.selector, component: this.#component };
      }
    }

    if (typeof component === 'object') {
      this.#component = component;

      this.options.selector = { ...this.options.selector, component: this.#component.component };
      this.options.scope = component.rootElement;

      this.children?.setElements?.(component.rootElement);
    }
  }

  /**
   * Sets the component for the state.
   * @param {string | ComponentModule | undefined} component - The component to set.
   * @returns {void}
   */
  set component(component) {
    this.setComponent(component);
  }


  /**
   * The mode module that manages different states or variations of the component.
   * @type {ModeModule | undefined}
   */
  #mode;

  /**
   * Gets the current mode of the state.
   * @returns {string[]} The current mode array.
   */
  get mode() {
    return this.#mode?.current ?? [];
  }

  /**
   * Sets the mode for the state. It can be a string, an array of strings, or a mode configuration object.
   * @param {{ current?: string[], modes?: Object<string, string[]> | string[] } | Object<string, string[]> | string[] | string | undefined} mode - The mode to set.
   * @returns {string[]} The new mode.
   */
  setMode(mode) {
    if (!mode) {
      return this.#mode?.current ?? [];
    }

    const pipedMode = this.applyPipes('mode', mode);

    if (!this.#mode && this.dependencies.Mode) {
      const modes = typeof pipedMode === 'string' ? { DEFAULT: [pipedMode] } : pipedMode;
      this.#mode = new this.dependencies.Mode(modes, { selector: this }, this.dependencies);

    } else if (typeof pipedMode === 'string' || Array.isArray(pipedMode)) {
      this.#mode?.setCurrent?.(pipedMode);

    } else {
      this.#mode?.setModes?.(pipedMode.modes ?? /**@type {Object<string, string[]>} */ (pipedMode));
    }

    this.triggerEffects('mode', this.mode);

    return this.#mode?.current ?? [];
  }

  /**
   * Sets the mode for the state.
   * @param {string[]} value - The mode to set.
   * @returns {void}
   */
  set mode(value) {
    this.setMode(value);
  }

  /**
   * The content of the state. Can be a primitive value or a key-value object.
   * @type {StateContent | undefined}
   */
  #content;

  /**
   * Gets the content of the state.
   * @returns {StateContent | undefined} The content of the state.
   */
  get content() {
    return this.#content;
  }

  /**
   * Internal method to set the content of the state. It merges new content with existing content.
   * 2.3: Arrow field — .bind(this) is redundant, removed.
   * @type {(content?: StateContent) => StateContent}
   */
  #setContent = (/**@type {StateContent} */ content = {}) => {
    if (typeof content === 'object'
      && typeof this.#content === 'object') {
      this.#content = {
        ...this.#content,
        ...content,
      };
    }

    if (typeof content !== 'object'
      && typeof this.#content === typeof content) {
      this.#content = content;
    }

    if (typeof this.#content === 'object'
      && typeof content !== 'object') {
      this.#content[COMPONENT_ROOT_ELEMENT_MARK] = content;
    }

    if (this.#content === undefined) {
      this.#content = content;
    }

    return /**@type {StateContent} */ (this.content);
  };

  /**
   * Sets the content for the state and optionally updates the view.
   * @param {StateContent | HTMLElement | { dataset?: Record<string, string | undefined> }} [content] - The content to set.
   * @param {SetterOptions} [options] - Options for setting the content, like whether to update the view.
   * @returns {StateContent} The new content.
   */
  setContent(content = {}, { updateView = true, forceUpdate = false } = {}) {
    const value = /**@type {StateContent} */ (this.executeSetter('content', /**@type {(content: StateContent | HTMLElement | { dataset?: Record<string, string | undefined> }) => StateContent} */ (this.#setContent), content, { updateView, forceUpdate }) ?? this.content ?? {});
    return value;
  }

  /**
   * Sets the content for the state.
   * @param {StateContent | HTMLElement} [content] - The content to set.
   * @returns {void}
   */
  set content(content) {
    this.setContent(content);
  }

  /**
   * The properties of the state, typically used for component configuration.
   * @type {StateProperties | undefined}
   */
  #properties;

  /**
   * Gets the properties of the state.
   * @returns {StateProperties | undefined} The properties of the state.
   */
  get properties() {
    return this.#properties;
  }

  /**
   * Internal method to set the properties of the state. It merges new properties with existing ones.
   * 2.3: Arrow field — .bind(this) is redundant, removed.
   * @param {StateProperties} [properties] - The properties to set.
   * @returns {StateProperties} The new properties.
   */
  #setProperties = (properties = {}) => {
    this.#properties = { ...this.#properties ?? {}, ...properties }

    return /**@type {StateProperties} */ (this.properties);
  };

  /**
   * Sets the properties for the state and optionally triggers effects.
   * @param {StateProperties | HTMLElement | { dataset?: Record<string, string | undefined> }} [properties] - The properties to set.
   * @param {SetterOptions} [options] - Options for setting the properties.
   * @returns {StateProperties} The new properties.
   */
  setProperties(properties = {}, options) {
    if (properties instanceof HTMLElement) {
      return this.properties ?? {};
    }
    const value = /**@type {StateProperties} */ (this.executeSetter('properties', this.#setProperties, properties, options) ?? this.properties ?? {});
    return value;
  }

  /**
   * Sets the properties for the state.
   * @param {StateProperties | undefined} properties - The properties to set.
   */
  set properties(properties) {
    this.setProperties(properties);
  }

  /**
   * A reference to the parent state in the state tree.
   * @type {StateModule | undefined}
   */
  #parent;

  /**
   * Gets the parent of the state.
   * @returns {StateModule | undefined} The parent of the state.
   */
  get parent() {
    return this.#parent;
  }

  /**
   * Sets the parent state for the current state.
   * @param {StateModule | undefined} parent - The parent state to set.
   */
  set parent(parent) {
    if (parent !== undefined && parent !== this) {
      this.#parent = parent;
    }
  }

  /**
   * The children of the current state, managed by a ChildrenModule.
   * @type {ChildrenModule | undefined}
   */
  #children;

  /**
   * Gets the children module of the current state.
   * @returns {ChildrenModule | undefined} The children module.
   */
  get children() {
    return this.#children;
  }

  /**
   * Sets or adds children to the state.
   * @param {ChildrenModule | (StateModule | StateConfig | Selector)[]} [states] - The children states to set or add.
   * @param {StateOptions} [options] - Options for setting the children.
   * @returns {ChildrenModule} The children module.
   */
  setChildren(states = [], options) {
    if (this.#children === undefined) {
      const children = Array.isArray(states) ? states : /**@type {StateModule[]} */ ((states).states ?? states);
      const State = this.dependencies.State;

      this.#children = this.dependencies.Children && State ? new this.dependencies.Children(
        Array.isArray(children) ? children.map(state => new State(
          state,
          { ...this.options, ...options, parentState: this },
          this.dependencies,
        )) : children,
        { ...this.options, ...options, parentState: this,  },
        this.dependencies,
      ) : /** @type {ChildrenModule} */ ({ states: children });

    } else {
      const children = Array.isArray(states) ? states : states.states ?? [];
      children.forEach(
        (state) => {
          this.#children?.insert?.(state, undefined, { ...this.options, ...options, parentState: this });
        }
      );
    }

    return /**@type {ChildrenModule} */ (this.children);
  }

  /**
   * Sets the children for the state.
   * @param {ChildrenModule | (StateModule | StateConfig | Selector)[] | undefined} children - The children to set.
   */
  set children(children) {
    this.setChildren(children);
  }

  /**
   * Creates an instance of the State module.
   * @param {StateModule | StateConfig} [state] - The initial state configuration.
   * @param {StateOptions} [options] - Options for the state module.
   * @param {ModuleDependencies} [dependencies] - Dependencies for the state module, such as other modules.
   */
  constructor(
    state = {},
    options = {},
    dependencies = {},
  ) {
    const { pipes: optionPipes, effects: optionEffects, ...restOptions } = options;

    const builtPipes = {
      content: [ContentDatasetPipe, ...(state?.pipes?.content ?? []), ...(optionPipes?.content ?? [])],
      properties: [PropertiesDatasetPipe, ...(state?.pipes?.properties ?? []), ...(optionPipes?.properties ?? [])],
      mode: [...(state?.pipes?.mode ?? []), ...(optionPipes?.mode ?? [])],
    };

    const builtEffects = {
      content: [ContentViewEffect, ...(state?.effects?.content ?? []), ...(optionEffects?.content ?? [])],
      properties: [...(state?.effects?.properties ?? []), ...(optionEffects?.properties ?? [])],
      mode: [...(state?.effects?.mode ?? []), ...(optionEffects?.mode ?? [])],
    };

    super({
      properties: ['mode', 'content', 'properties'],
      ...restOptions,
      selector: state,
      pipes: builtPipes,
      effects: builtEffects,
    }, dependencies);

    this.#mode?.setModes?.(options.modes);

    this.#name = state?.name ?? '';

    if (state?.component) {
      this.component = state.component;
    }

    if (state?.content) {
      this.content = state.content;
    }

    if (state?.properties) {
      this.properties = state.properties;
    }

    if (state?.mode) {
      this.mode = state.mode;
    }

    if (state?.children) {
      this.children = state.children;
    }

    if (options.parentState) {
      this.#parent = options.parentState;
    }
  }

  /**
   * Gets a state by name, searching up or down the state tree from the current state.
   * @param {string | symbol} name - The name of the state to get.
   * @param {Object} [options] - Options for getting the state.
   * @param {'bi' | 'down' | 'up'} [options.direction] - The direction to search: 'up', 'down', or 'bi' (bidirectional).
   * @returns {StateModule | undefined} The found state module or undefined if not found.
   */
  getState(name, { direction = 'bi'} = {}) {
    if (this.name === name) {
      return this;
    }

    if (this.#parent && (direction === 'bi' || direction === 'up')) {
      return this.#parent.getState?.(name, direction === 'up' ? { direction } : undefined);
    }

    if (direction === 'bi' || direction === 'down') {
      const childStates = this.children?.states;
      if (childStates) {
        for (const state of childStates) {
          const found = state.getState?.(name, { direction: 'down' });
          if (found !== undefined) {
            return found;
          }
        }
      }
    }

    return undefined;
  }

  /**
   * Detaches and destroys the component instance associated with this state,
   * reducing the state back to a plain (unrendered) state.
   * @returns {void}
   */
  detachComponent() {
    if (typeof this.#component !== 'string') {
      this.#component?.destroy?.();
      this.#component = this.component;
    }
  }
}
