/**
 * @fileoverview Events management module and custom OloEvent implementation with lifecycle-aware abort signaling.
 * @module events
 */

// @ts-check

import { View } from './view.js';

/**
 * @import {
 *  EventListenerConfig,
 *  EventsModule,
 *  EventOptions,
 *  EventsOptions,
 *  ModuleDependencies,
 *  ModuleOptions,
 *  StateProperties,
 * } from './modules.d.ts';
 */

/**
 * Represents a custom event used within the application framework.
 * It extends the native Event class to include additional data like action, value, and context.
 * @extends Event
 */
export class OloEvent extends Event {
  /**
   * A string that represents the type of the event (e.g., 'user-login', 'item-added').
   * @type {string}
   */
  #action;

  /**
   * Gets the action of the event.
   * @returns {string} The action string.
   */
  get action() {
    return this.#action;
  }

  /**
   * Optional data that accompanies the event.
   * @type {string | undefined}
   */
  #value;

  /**
   * Gets the value of the event.
   * @returns {string | undefined} The event's value.
   */
  get value() {
    return this.#value;
  }

  /**
   * Additional state information relevant to the event.
   * @type {StateProperties | undefined}

   */
  #context;

  /**
   * Gets the context of the event.
   * @returns {StateProperties | undefined} The event's context object.
   */
  get context() {
    return this.#context;
  }

  /**
   * Creates an instance of OloEvent.
   * @param {string} action - The action of the event.
   * @param {string} [value] - The value associated with the event.
   * @param {StateProperties} [context] - The context or additional data for the event.
   */
  constructor(action,value, context) {
    super("oloEvent", { bubbles: true });
    this.#action = action;
    this.#value = value;
    this.#context = context;
  }
}

/**
 * Manages DOM events, including adding, removing, and dispatching custom events.
 * It extends the View class and uses an AbortController to manage the lifecycle of event listeners.
 * @implements {EventsModule}
 */
export class Events extends View {
  /**
   * The AbortController instance used to manage and clean up event listeners.
   * @type {AbortController}
   */
  #abortController;

  /**
   * Creates an instance of Events.
   * @param {EventsOptions} [options] - The options for configuring the events module, including scope and initial listeners.
   * @param {ModuleDependencies} [dependencies] - The dependencies for the events module.
   */
  constructor({ scope, listeners } = {}, dependencies = {}) {
    super(scope);

    this.#abortController = new AbortController();

    listeners
      ?.map((listener) => {
        if (listener.target instanceof HTMLElement) {
          return listener;
        }

        return {
          ...listener,
          target: this.compileSelector(listener.target),
        };
      })
      .forEach((listener) => { this.listen(listener); });
  }

  /**
   * Compiles an event listener configuration by resolving the target element and setting default values.
   * @param {EventListenerConfig} [config] - The configuration to compile.
   * @returns {{ target: HTMLElement | Window, event: string, callback: (this: Element, ev: Event) => any, options: EventOptions }} The compiled and normalized event listener configuration.
   */
  #compileConfig(config) {
    return {
      target: ((config?.target instanceof HTMLElement || config?.target === window ? /** @type {HTMLElement | Window} */ (config?.target) : this.get(config?.target)) ?? this.scope),
      event: config?.event ?? 'oloEvent',
      callback: config?.callback ?? (() => {}),
      options: config?.options ?? {},
    }
  }

  /**
   * Adds an event listener to a target element.
   * @param {EventListenerConfig} [config] - The configuration for the event listener.
   * @returns {HTMLElement | Window} The target element the listener was attached to.
   */
  listen(config) {
    const eventConfig = this.#compileConfig(config);

    eventConfig.target.addEventListener(
      eventConfig.event,
      eventConfig.callback,
      { once: eventConfig.options?.once ?? false, signal: this.#abortController.signal },
    );

    return eventConfig.target;
  }

  /**
   * Removes an event listener from a target element.
   * @param {EventListenerConfig} [config] - The configuration for the event listener to remove.
   * @returns {HTMLElement | Window} The target element the listener was removed from.
   */
  unlisten(config) {
    const eventConfig = this.#compileConfig(config);

    eventConfig.target.removeEventListener(eventConfig.event, eventConfig.callback);
    return eventConfig.target;
  }

  /**
   * Removes all event listeners that were added through this instance.
   * @returns {void}
   */
  stopAll() {
    this.#abortController.abort();
    this.#abortController = new AbortController();
  }

  /**
   * Dispatches a custom OloEvent from the scope element.
   * @param {string} action - The action of the event.
   * @param {string} [value] - The value of the event.
   * @param {StateProperties} [context] - The context of the event.
   * @returns {HTMLElement} The scope element from which the event was dispatched.
   */
  dispatch(action, value, context) {
    const event = new OloEvent(action, value, context);
    this.scope.dispatchEvent(event);

    return this.scope;
  }
}
