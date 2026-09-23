/**
 * @fileoverview Base Module class providing options, dependencies, and a pipeline/effect system for reactive data flow.
 * @module module
 */

// @ts-check

import { COMPONENT_ROOT_ELEMENT_MARK } from './constants.js';

/**
 * @import {
 *   Effect,
 *   ModuleDependencies,
 *   ModuleOptions,
 *   ModulePropertyValue,
 *   Pipe,
 *   SetterOptions,
 * } from './modules.d.ts';
 */

/**
 * Provides a base class for front-end modules that can manage properties with pipes and effects.
 * It encapsulates common functionalities like handling options, dependencies, and a middleware-like system (pipes and effects).
 * @implements {Module}
 */
export class Module {
  /**
   * The configuration options for the module instance.
   * @type {ModuleOptions}
   */
  #moduleOptions = {};

  /**
   * Gets the module's configuration options.
   * @returns {ModuleOptions} The current options.
   */
  get options() {
    return this.#moduleOptions;
  }

  /**
   * Sets or merges new options into the module's existing options.
   * @param {ModuleOptions | undefined} options - The options to set or merge.
   * @returns {void}
   */
  set options(options) {
    this.#moduleOptions = { ...this.#moduleOptions, ...options ?? {} };
  }

  /**
   * Default dependencies shared across all module instances.
   * @type {ModuleDependencies}
   */
  static #defaultDependencies = {};

  /**
   * Gets the static default dependencies.
   * @returns {ModuleDependencies} The current default dependencies.
   */
  static get dependencies() {
    return Module.#defaultDependencies;
  }

  /**
   * Sets or merges static default dependencies for all module instances.
   * @param {ModuleDependencies | undefined} dependencies - The dependencies to set or merge.
   * @returns {void}
   */
  static set dependencies(dependencies) {
    Module.#defaultDependencies = { ...Module.#defaultDependencies, ...dependencies ?? {} };
  }

  /**
   * Dependencies available to this module instance.
   * @type {ModuleDependencies}
   */
  #moduleDependencies = {};

  /**
   * Gets the module dependencies.
   * @returns {ModuleDependencies} The current dependencies.
   */
  get dependencies() {
    return this.#moduleDependencies;
  }

  /**
   * Sets or merges new dependencies into the module dependencies.
   * @param {ModuleDependencies | undefined} dependencies - The dependencies to set or merge.
   * @returns {void}
   */
  set dependencies(dependencies) {
    this.#moduleDependencies = { ...this.#moduleDependencies, ...dependencies ?? {} };
  }

  /**
   * Creates an instance of Module.
   * @param {ModuleOptions} [options] - Configuration options for the module.
   * @param {ModuleDependencies} [dependencies] - Shared dependencies for the module.
   */
  constructor(options, dependencies) {
    // 2.1: #moduleOptions starts as {}, so spreading it first is redundant.
    this.#moduleOptions = { ...options, selector: { name: options?.selector?.name, component: options?.selector?.component }, currentModule: this };
    this.dependencies = dependencies;
    this.dependencies = { ...Module.dependencies, ...dependencies ?? {} };

    const types = [...options?.properties ?? []];
    types.forEach((prop) => {
      this.#pipes[prop] = options?.pipes?.[prop] ?? [];
      this.#effects[prop] = options?.effects?.[prop] ?? [];
    });
  }

  /**
   * A repository for pipe functions, organized by property name.
   * @type {Object<string, Pipe[]>}
   */
  #pipes = {}

  /**
   * Gets the pipes repository.
   * @returns {Object<string, Pipe[]>} The pipes object.
   */
  get pipes() {
    return this.#pipes;
  }

  /**
   * Appends a pipe function to a specific property's pipeline.
   * @param {string} prop - The name of the property to add the pipe to.
   * @param {Pipe} [pipe] - The pipe function to add.
   * @returns {Pipe | null} The added pipe function or null if the operation failed.
   */
  addPipe(prop, pipe) {
    if (typeof pipe === 'function' && this.#pipes[prop] !== undefined && !this.#pipes[prop].includes(pipe)) {
      this.#pipes[prop].push(pipe);
      return pipe;
    }
    return null;
  }

  /**
   * Removes a specific pipe or all pipes from a property.
   * @param {string} prop - The name of the property.
   * @param {Pipe} [pipe] - The specific pipe function to remove. If not provided, all pipes for the property are removed.
   * @returns {Pipe[] | null} The remaining pipes for the property, or null if the property doesn't exist.
   */
  removePipe(prop, pipe) {
    if (this.#pipes[prop] !== undefined) {
      if (typeof pipe === 'function') {
        const index = this.#pipes[prop].indexOf(pipe);
        if (index !== -1) {
          this.#pipes[prop].splice(index, 1);
        }
      } else {
        this.#pipes[prop] = [];
      }
    }
    return this.#pipes[prop] ?? null;
  }

  /**
   * Applies all registered pipes for a property to a given data object.
   * @template [Data=any]
   * @param {string} prop - The name of the property.
   * @param {Data} data - The initial data to be processed by the pipes.
   * @param {Object<string, any>} [options] - Additional options to pass to the pipes.
   * @param {Object<string, any>} [dependencies] - Additional dependencies to pass to the pipes.
   * @returns {Data} The processed data after applying all pipes.
   */
  applyPipes(prop, data, options, dependencies) {
    const pipes = this.pipes[prop];
    if (!pipes || pipes.length === 0) {
      return data;
    }

    const mergedOptions = options ? { ...this.options, ...options } : this.options;
    const mergedDependencies = dependencies ? { ...this.dependencies, ...dependencies } : this.dependencies;

    return pipes.reduce(
      (cur, pipe) => /**@type {Pipe<Data>} */ (pipe)(cur, mergedOptions, mergedDependencies),
      data,
    );
  }

  /**
   * A repository for effect functions, organized by property name.
   * @type {Object<string, Effect[]>}
   */
  #effects = {};

  /**
   * Gets the effects repository.
   * @returns {Object<string, Effect[]>} The effects object.
   */
  get effects() {
    return this.#effects;
  }

  /**
   * Appends an effect function to a specific property. The effect is executed immediately with the property's current value.
   * @param {string} prop - The name of the property to add the effect to.
   * @param {Effect} [effect] - The effect function to add.
   * @returns {Effect | null} The added effect function or null if the operation failed.
   */
  addEffect(prop, effect) {
    if (typeof effect === 'function' && this.#effects[prop] !== undefined && !this.#effects[prop].includes(effect)) {
      this.#effects[prop].push(effect);

      if (this[/**@type {keyof Module} */ (prop)]) {
        effect(this[/**@type {keyof Module} */ (prop)], this.options, this.dependencies);
      }

      return effect;
    }
    return null;
  }

  /**
   * Removes a specific effect or all effects from a property.
   * @param {string} prop - The name of the property.
   * @param {Effect} [effect] - The specific effect function to remove. If not provided, all effects for the property are removed.
   * @returns {Effect[] | null} The remaining effects for the property, or null if the property doesn't exist.
   */
  removeEffect(prop, effect) {
    if (this.#effects[prop] !== undefined) {
      if (typeof effect === 'function') {
        const index = this.#effects[prop].indexOf(effect);
        if (index !== -1) {
          this.#effects[prop].splice(index, 1);
        }
      } else {
        this.#effects[prop] = [];
      }
    }
    return this.effects[prop] ?? null;
  }

  /**
   * Executes all registered effects for a single property.
   * @template [Data=any]
   * @param {string} prop - The name of the property.
   * @param {Data} [data] - The data to pass to the effects. If not provided, the property's current value is used.
   * @param {Object<string, any>} [options] - Additional options to pass to the effects.
   * @param {Object<string, any>} [dependencies] - Additional dependencies to pass to the effects.
   * @returns {void}
   */
  #executeEffect(prop, data, options, dependencies) {
    const effects = this.#effects[prop];
    if (!effects || effects.length === 0) {
      return;
    }

    const effectData = data ?? /**@type {Data} */ (this[/**@type {keyof Module} */ (prop)]);
    const mergedOptions = options ? { ...this.options, ...options } : this.options;
    const mergedDependencies = dependencies ? { ...this.dependencies, ...dependencies } : this.dependencies;

    effects.forEach((effect) => {
      /**@type {Effect<Data>} */ (effect)(
        effectData,
        mergedOptions,
        mergedDependencies,
      );
    });
  }

  /**
   * Triggers the effects for a specific property, or for all properties if none is specified.
   * @template [Data=any]
   * @param {string} [prop] - The name of the property to trigger effects for. If omitted, effects for all properties are triggered.
   * @param {Data} [data] - The data to pass to the effects.
   * @param {Object<string, any>} [options] - Additional options for the effects.
   * @param {Object<string, any>} [dependencies] - Additional dependencies for the effects.
   * @returns {void}
   */
  triggerEffects(prop, data, options, dependencies) {
    if (prop) {
      this.#executeEffect(prop, data, options, dependencies);
    } else {
      for (const key in this.effects) {
        this.#executeEffect(key, data, options, dependencies);
      }
    }
  }

  /**
   * Calculates the difference between an old and a new value, returning the keys that have changed.
   * @param {ModulePropertyValue} oldValue - The previous value.
   * @param {ModulePropertyValue} newValue - The new value.
   * @returns {(string | symbol)[]} An array of keys that have different values.
   */
  #getDiff(oldValue, newValue) {
    const rootMark = COMPONENT_ROOT_ELEMENT_MARK;
    // 2.6: short-circuit for the common primitive case — no need to box into objects.
    const isObjA = oldValue !== null && typeof oldValue === 'object';
    const isObjB = newValue !== null && typeof newValue === 'object';

    if (!isObjA && !isObjB) {
      return oldValue !== newValue ? [rootMark] : [];
    }

    const valA = isObjA ? oldValue : { [rootMark]: oldValue };
    const valB = isObjB ? newValue : { [rootMark]: newValue };
    const diff = [];

    const keys = new Set([...Reflect.ownKeys(valA), ...Reflect.ownKeys(valB)]);

    for (const key of keys) {
      if (Reflect.get(valA, key) !== Reflect.get(valB, key)) {
        diff.push(key);
      }
    }

    return diff;
  }

  /**
   * Executes a setter function for a property, applying pipes and effects in the process.
   * This is a generic method to handle property updates in a structured way.
   * @template {ModulePropertyValue | HTMLElement} Value
   * @param {string} property - The name of the property being set.
   * @param {(value: Value, options?: SetterOptions) => Value} setter - The actual function that sets the property's value.
   * @param {Value} [value] - The new value for the property.
   * @param {SetterOptions} [options] - Options for the setter, like forcing an update.
   * @returns {Value | undefined} The final value after piping and setting, or undefined if no value was provided.
   */
  executeSetter(property, setter, value, options) {
    const currentValue = /**@type {Value} */ (this[/**@type {keyof Module} */ (property)]);
    if (value === undefined) {
      return currentValue;
    }

    const pipedValue = this.applyPipes(property, value, options);

    if (typeof Element !== 'undefined' && pipedValue instanceof Element) {
      return currentValue;
    }

    const diff = this.#getDiff(/**@type {ModulePropertyValue}*/ (currentValue), /**@type {ModulePropertyValue}*/ (pipedValue));

    if (!options?.forceUpdate && diff.length === 0) {
      return currentValue;
    }

    const enrichedOptions = { ...options ?? {}, updatedProperties: diff };
    const newValue = setter(pipedValue, enrichedOptions);

    this.triggerEffects(property, newValue, enrichedOptions);

    return newValue;
  }
}
