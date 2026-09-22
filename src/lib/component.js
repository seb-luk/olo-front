// @ts-check

import { COMPONENT_NAME_FALLBACK, DEFAULT_VIEW, PLACEHOLDER_DYNAMIC, PLACEHOLDER_STATIC } from './constants.js';

import { Module } from './module.js';

/**
 * @import {
 *  ComponentModule,
 *  ComponentOptions,
 *  ElementsModule,
 *  EventsModule,
 *  ModuleDependencies,
 *  RouterModule,
 *  StateModule,
 * } from './modules.d.ts'
 */

/**
 * @fileoverview Component base class coordinating state, elements, events, routing, and lifecycle hooks.
 * @module component
 */

/**
 * A base class for creating UI components. It encapsulates the component's name, state, view (rootElement), and dependencies.
 * It orchestrates the lifecycle of the component, from creation to destruction.
 * @implements {ComponentModule}
 */
export class Component extends Module {
  /**
   * Resolves when the component has been initialized and mounted.
   * @type {Promise<ComponentModule>}
   */
  ready;

  /**
   * Resolves the public ready promise when mounted.
   * @type {((component: ComponentModule) => void) | undefined}
   */
  #resolveReady;

  /**
   * Rejects the public ready promise if initialization or mounting fails.
   * @type {((error: unknown) => void) | undefined}
   */
  #rejectReady;

  /**
   * Tracks whether mounting has been happened.
   * @type {boolean}
   */
  #mounted = false;

  /**
   * Tracks whether this component has been destroyed.
   * @type {boolean}
   */
  #destroyed = false;

  /**
   * Prevents recursive error handling when onError calls setView.
   * @type {boolean}
   */
  #handlingViewError = false;

  /**
   * The asynchronous initialization of this component.
  * @type {Promise<ComponentModule>}
   */
  initialized;

  /**
   * The unique name of the component instance.
   * @type {string}
   */
  #name;

  /**
   * Gets the name of the component instance.
   * @returns {string} The component's name.
   */
  get name() {
    return this.#name;
  }

  /**
   * Generates a unique, instance-scoped identifier (e.g. for HTML IDREFs, ARIA relationships, or form associations).
   * @param {string} suffix - The local identifier suffix.
   * @returns {string} The scoped ID in the format `${this.name}-${suffix}`.
   */
  id(suffix) {
    return `${this.#name}-${suffix}`;
  }

  /**
   * The type or identifier of the component.
   * @type {string}
   */
  #component;

  /**
   * Gets the component's type/identifier.
   * @returns {string} The component's type.
   */
  get component() {
    return this.#component;
  }

  /**
   * The name of the currently active view.
   * @type {string}
   */
  #view = DEFAULT_VIEW;

  /**
   * Gets the active view name.
   * @returns {string}
   */
  get view() {
    return this.#view;
  }

  /**
   * Sets the active view name.
   * Note: setView is asynchronous. Setting this property triggers setView without awaiting.
   * @param {string} value
   */
  set view(value) {
    this.setView(value);
  }

  /**
   * The root HTML element of the component's view.
   * @type {HTMLElement | undefined}
   */
  #rootElement;

  /**
   * Gets the component's root HTML element.
   * @returns {HTMLElement | undefined} The root element.
   */
  get rootElement() {
    return this.#rootElement;
  }

  /**
   * Sets the component's root HTML element and initializes its dependencies.
   * @param {HTMLElement | undefined} value - The new root element.
   * @returns {void}
   */
  set rootElement(value) {
    if (!(value instanceof HTMLElement) || this.#rootElement === value) {
      return;
    }

    if (this.#rootElement) {
      this.#events?.stopAll?.();
      this.#router?.unLink?.();
      this.state?.children?.states?.forEach((child) =>  this.state?.children?.remove?.(child));
      this.#rootElement.replaceWith(value);
    }

    this.#rootElement = value;
    this.options.scope = value;

    if (this.dependencies.Events) {
      this.#events = this.#events ?? new this.dependencies.Events(this.options, this.dependencies);
      this.#events.scope = value;
    }

    if (this.dependencies.Elements) {
      this.#elements = this.#elements ?? new this.dependencies.Elements(value);
      this.#elements.scope = value;
    }

    if (this.dependencies.Router) {
      this.#router = this.#router ?? new this.dependencies.Router({ ...this.options, parentState: this.state }, this.dependencies);
      this.#router.scope = value;
    }

    if (this.state) {
      this.state.children?.setElements?.(value);
      if (this.state.options) {
        this.state.options.scope = value;
      }
    }
  }

  /**
   * The state module associated with the component.
   * @type {StateModule | undefined}
   */
  #state;

  /**
   * Gets the component's state module.
   * @returns {StateModule | undefined} The state module.
   */
  get state() {
    return this.#state;
  }

  /**
   * The elements module for DOM manipulation within the component.
   * @type {ElementsModule | undefined}
   */
  #elements;

  /**
   * Gets the component's elements module.
   * @returns {ElementsModule | undefined} The elements module.
   */
  get elements() {
    return this.#elements;
  }

  /**
   * The events module for handling events within the component.
   * @type {EventsModule | undefined}
   */
  #events;

  /**
   * Gets the component's events module.
   * @returns {EventsModule | undefined} The events module.
   */
  get events() {
    return this.#events;
  }

  /**
   * The router module for handling routing within the component.
   * @type {RouterModule | undefined}
   */
  #router;

  /**
   * Gets the component's router module.
   * @returns {RouterModule | undefined} The router module.
   */
  get router() {
    return this.#router;
  }

  /**
   * Discovers and builds all child components declared by STATIC placeholders within a given root element.
   * Shared between the constructor and setView to avoid duplication (2.9).
   * @param {HTMLElement} root - The root element to scan for placeholders.
   * @param {StateModule | undefined} parentState
   * @param {ModuleDependencies} dependencies
   * @returns {Promise<ComponentModule | undefined>[]}
   */
  #buildChildComponents(root, parentState, dependencies) {
    const comps = this.#elements?.search?.([{ component: '' }], { scope: root }) ?? [];

    return comps
      .map((componentItem) => {
        if (componentItem.dataset?.oloName === this.#name) {
          return;
        }

        if (componentItem.dataset?.oloPlaceholder === PLACEHOLDER_STATIC) {
          return this.dependencies.componentBuilder?.buildFromTemplate?.(
            componentItem.dataset?.oloComponent ?? COMPONENT_NAME_FALLBACK,
            componentItem.dataset?.oloView,
            this.elements?.compileSelector?.(componentItem),
            { ...this.options, parentState, placeholder: componentItem },
            this.dependencies,
          );
        }

        if (componentItem.dataset?.oloPlaceholder !== PLACEHOLDER_DYNAMIC) {
          return this.dependencies.componentBuilder?.buildFromContent?.(
            componentItem.dataset.oloName ?? '',
            this.elements?.compileSelector?.(componentItem),
            {...this.options, parentState, rootElement: componentItem },
            this.dependencies,
          );
        }
      })
      .filter(promise => promise !== undefined);
  }

  /**
   * @param {string} [view] - The view name to load.
   * @param {Object} [options] - Additional options.
   * @param {boolean} [options.localFirst] - Whether local templates should precede remote templates.
   * @returns {Promise<HTMLElement | undefined>}
   */
  async #getView(view = this.view, { localFirst } = {}) {
    const selector = { name: this.name, component: this.component, view };
    const existingView = this.#elements?.searchView?.(selector);

    if (existingView) {
      return existingView;
    }

    const template = await this.dependencies.componentBuilder?.getView?.(
      this.component,
      view,
      { localFirst },
    ) ?? undefined;

    return this.#elements?.compileView?.(selector, { template }) ?? undefined;
  }

  /**
   * Creates an instance of Component.
   * @param {StateModule | string} [state] - The initial state of the component or a string identifier.
   * @param {ComponentOptions} [options] - Configuration options for the component.
   * @param {ModuleDependencies} [dependencies] - Shared dependencies for the component.
   */
  constructor(
    state = {},
    options = {},
    dependencies = {},
  ) {
    super({ properties: ['view'], ...options }, dependencies);

    this.ready = new Promise((resolve, reject) => {
      this.#resolveReady = resolve;
      this.#rejectReady = reject;
    });

    if (this.dependencies.Elements) {
      this.#elements = new this.dependencies.Elements();
    }

    const { parentState, placeholder, rootElement } = options;

    // define component identifiers
    const component = typeof state === 'string' ? { component: state } : state;

    this.#name = component.name || `${component.component}_${Math.random().toString(36).slice(2)}`;
    this.#component = component.component ?? COMPONENT_NAME_FALLBACK;

    const rawView = options.view ?? placeholder?.dataset?.oloView ?? rootElement?.dataset?.oloView ?? component.view ?? DEFAULT_VIEW;
    this.#view = this.applyPipes('view', rawView);

    if (component.content || component.properties || component.mode || component.children || component.setComponent) {
      if (component.setComponent) {
        this.#state = /** @type {StateModule} */ (component);

        this.#state.name = this.#name;
        this.#state.component = this.#component;
        this.#state.view = this.#view;
      } else if (this.dependencies.State) {
        this.#state = new this.dependencies.State(
          /** @type {StateModule} */ (component),
          {},
          this.dependencies,
        );
      }
    }

    /**
     * @type {Promise<StateModule | undefined> | undefined}
     */
    let statePromise

    if (this.state && parentState && !parentState.children?.findChild?.(this.#name)) {
      parentState.setChildren?.();

      statePromise = parentState.children?.insert?.(this.state, undefined, {
        updateView: false,
        placeholder,
        rootElement,
      });

      statePromise?.then(
        (state) => {
          this.#state = state ?? this.#state;
        }
      );
    }

    if (this.state && rootElement) {
      this.state.options = this.state.options ?? {};
      this.state.options.rootElement = rootElement;
    }

    // setup root element
    if (rootElement) {
      this.rootElement = rootElement;
    }
    /**
     * @type {Promise<HTMLElement | undefined> | undefined}
     */
    let rootPromise
    if (!this.rootElement) {
      rootPromise = this.#getView(this.view, { localFirst: options.localFirst });
    }

    this.initialized = Promise.all([rootPromise, statePromise])
      .then(async (results) => {
        if (this.#destroyed) {
          return /** @type {ComponentModule} */ (/** @type {unknown} */ (this));
        }

        const promiseState = results[1]
        if (this.state?.setComponent === undefined) {
          this.#state = promiseState ?? this.#state;
        }

        this.#state?.setComponent?.(/** @type {ComponentModule} */ (/** @type {unknown} */ (this)));

        const rootElem = results[0];

        if (rootElem) {
          if (placeholder) {
            this.rootElement = this.#elements?.replacePlaceholder?.(placeholder, rootElem) ?? rootElem;
          } else {
            this.rootElement = rootElem;
          }
        }

        if (this.state?.content) {
          this.state?.setContent?.(this.elements?.extractContent?.(this, this.state.content, this.rootElement) ?? {}, { updateView: false });
        }

        const dataset = { ...placeholder?.dataset ?? {}, ...this.rootElement?.dataset ?? {} };

        if (this.state?.content || Object.keys(dataset).some(key => key.includes('oloContent'))) {
          this.state?.setContent?.(placeholder ?? this.rootElement, { forceUpdate: true });
        }

        if (this.state?.properties || Object.keys(dataset).some(key => key.includes('oloProperties'))) {
          this.state?.setProperties?.(placeholder ?? this.rootElement, { forceUpdate: true });
        }

        if (this.rootElement) {
          await Promise.all(this.#buildChildComponents(this.rootElement, this.state ?? parentState, dependencies));
        }

        await this.onInit();

        if (placeholder || this.rootElement?.parentElement) {
          this.mount();
        }

        return /** @type {ComponentModule} */ (/** @type {unknown} */ (this));
      });

    this.initialized
      .catch((error) => {
        this.#rejectReady?.(error);
      });
  }

  /**
   * Resolves and activates an independent view template.
   * @param {string} view - The view name chosen by the component user.
   * @param {boolean} [localFirst] - Whether local templates should precede remote templates.
   * @returns {Promise<ComponentModule>}
   */
  async setView(view, localFirst = this.options.localFirst ?? false) {
    if (this.#destroyed) {
      return /** @type {ComponentModule} */ (this);
    }

    const pipedView = this.applyPipes('view', view);

    const previousView = this.#view;
    const previousRoot = this.#rootElement;

    try {
      const nextRoot = await this.#getView(pipedView, { localFirst });

      if (!nextRoot) {
        throw new Error(`View "${pipedView}" for component "${this.component}" could not be found or compiled.`);
      }

      this.rootElement = nextRoot;
      this.#view = pipedView;
      if (this.state) {
        this.state.view = pipedView;
      }

      await Promise.all(this.#buildChildComponents(nextRoot, this.state, this.dependencies));

      if (this.state?.content) {
        this.state.setContent?.(this.state.content, { forceUpdate: true });
      }

      if (this.state?.properties) {
        this.state.setProperties?.(this.state.properties, { forceUpdate: true });
      }

      if (this.state?.mode) {
        this.state?.setMode?.(this.state.mode);
      }

      this.triggerEffects('view', pipedView, { previousView, rootElement: nextRoot });

      await this.onViewChange({ view: pipedView, previousView, rootElement: nextRoot });

      return /** @type {ComponentModule} */ (/** @type {unknown} */ (this));
    } catch (error) {
      if (this.#rootElement !== previousRoot) {
        this.rootElement = previousRoot;
      }

      this.#view = previousView;
      if (this.state) {
        this.state.view = previousView;
      }

      if (!this.#handlingViewError) {
        this.#handlingViewError = true;
        try {
          await this.onError(error, { phase: 'setView', view: pipedView, previousView });
        } finally {
          this.#handlingViewError = false;
        }
      }

      return /** @type {ComponentModule} */ (/** @type {unknown} */ (this));
    }
  }

  /**
   * Marks the component as mounted and resolves its ready lifecycle once initialization has finished.
   * @returns {Promise<ComponentModule>} A promise that resolves after `onReady` has run.
   */
  mount() {
    if (this.#mounted) {
      return this.ready;
    }

    this.#mounted = true;

    this.initialized.then(async () => {
      if (this.#destroyed) {
        return;
      }

      await this.onReady();
      this.#resolveReady?.(/** @type {ComponentModule} */ (/** @type {unknown} */ (this)));
    }).catch((error) => {
      this.#rejectReady?.(error);
    });

    return this.ready;
  }

  /**
   * Destroys the component and releases its resources.
   * @returns {void}
   */
  destroy() {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.#rejectReady?.(new Error(`Component "${String(this.name)}" was destroyed before it became ready.`));

    try {
      this.onDestroy();
    } finally {
      this.#events?.stopAll?.();
      this.#router?.unLink?.();

      this.state?.children?.states?.forEach((child) => {
        child.detachComponent?.();
      });

      this.#rootElement?.remove();
    }
  }

  /**
   * A lifecycle hook that is called after the component is ready and its rootElement is in the DOM.
   * Can be overridden by subclasses to perform initialization tasks.
   * @returns {void | Promise<void>}
   */
  onReady() {};

  /**
   * A lifecycle hook called after initial state and view setup.
   * @returns {void | Promise<void>}
   */
  onInit() {};

  /**
   * A lifecycle hook called after a component view has changed.
   * @param {{ view: string, previousView: string, rootElement?: HTMLElement }} [context]
   * @returns {void | Promise<void>}
   */
  onViewChange(context) {};

  /**
   * A lifecycle hook called after a child component is added.
   * @param {ComponentModule} [child] - The child component that was added.
   * @returns {void | Promise<void>}
   */
  onAddChild(child) {};

  /**
   * A lifecycle hook called after a child component is removed.
   * @param {ComponentModule} [child] - The child component that was removed.
   * @returns {void}
   */
  onRemoveChild(child) {};

  /**
   * A lifecycle hook for errors handled by the component user.
   * @param {unknown} error
   * @param {unknown} [context]
   * @returns {void | Promise<void>}
   */
  onError(error, context) {};

  /**
   * A lifecycle hook that is called when the component is about to be destroyed.
   * It should be used to clean up resources, like event listeners or timers.
   * @returns {void}
   */
  onDestroy() {}
}
