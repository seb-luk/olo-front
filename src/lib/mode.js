/**
 * @fileoverview Mode module for managing component variations, themes, and states.
 * @module mode
 */

// @ts-check

import { Module } from './module.js';

/**
 * @import { Effect, ModeModule, ModuleDependencies, ModuleOptions } from './modules.d.ts';
 */

/**
 * An effect that updates the view by setting the `data-olo-mode` attribute on the
 * component element to a space-joined list of all currently active modes.
 * Use `[data-olo-mode~="modeName"]` in CSS to target a specific mode.
 * @type {Effect<string[]>}
 */
export const CurrentViewEffect = (data, options, dependencies) => {
  if (!options?.selector || !dependencies?.Elements) return;
  const element = new (dependencies.Elements)(options.selector).get?.(options.selector);
  if (element) element.dataset.oloMode = data.map(mode => mode.toLowerCase()).join(' ');
}

/**
 * Manages different modes of a component and their effects on the view.
 * A mode can be thought of as a state that affects the component's appearance or behavior.
 * @implements {ModeModule}
 */
export class Mode extends Module {
  /**
   * A map that stores the relationship from a single mode to its corresponding mode set.
   * @type {Map<string, string>}
   */
  #modeSetMap = new Map();

  /**
   * A map of mode sets, where each set is a collection of related modes.
   * @type {Map<string, string[]>}
   */
  #modes = new Map();

  /**
   * Gets the current modes as an object.
   * @returns {Object<string, string[]>} An object representing the mode sets and their modes.
   */
  get modes() {
    return Object.fromEntries(this.#modes);
  }

  /**
   * Sets the available modes for the component.
   * Modes can be grouped into sets.
   * @param {Object<string, string[]> | string[] | undefined} modes - The modes to set, can be an object of mode sets or an array of modes for the default set.
   * @returns {Object<string, string[]>} The new modes object.
   */
  setModes(modes) {
    if (!modes) {
      return this.modes;
    }

    /**
     * @type {Object<string, string[]>}
     */
    const modeMap = Array.isArray(modes)
      ? { DEFAULT: modes }
      : modes ?? {};

    const pipedModes = this.applyPipes('modes', modeMap);

    const sets = Object.keys(pipedModes);

    if (sets.length > 0) {
      this.#modes.delete('DEFAULT');
    }

    sets.forEach(set => {
      pipedModes[set].forEach(mode => {
        this.#modeSetMap.set(mode, set);
      });
      this.#modes.set(set, pipedModes[set]);

      if (this.#current[set] === undefined) {
        delete this.#current['DEFAULT'];
        this.#current[set] = pipedModes[set][0];
      }
    });

    this.triggerEffects('modes', this.modes);

    return this.modes;
  }

  /**
   * Sets the available modes for the component.
   * @param {Object<string, string[]> | string[] | undefined} modes - The modes to set.
   */
  set modes(modes) {
    this.setModes(modes);
  }


  /**
   * An object that holds the current active mode for each mode set.
   * @type {Object<string, string>}
   */
  #current = {};

  /**
   * Gets the current active modes from all mode sets.
   * @returns {string[]} An array of the current active modes.
   */
  get current() {
    return Object.values(this.#current);
  }

  /**
   * Sets the current active modes.
   * @param {string | string[] | undefined} mode - The mode or modes to set as current.
   * @returns {string[]} The new array of current active modes.
   */
  setCurrent(mode) {
    if (!mode) {
      return this.current;
    }

    /**
     * @type {string[]}
     */
    const modes = Array.isArray(mode)
      ? mode
      : [mode];

    const pipedModes = this.applyPipes('current', modes);

    pipedModes.forEach(mode => {
      if (this.#modeSetMap.has(mode)) {
        this.#current[/** @type {string} */ (this.#modeSetMap.get(mode))] = mode;
      }
    });

    this.triggerEffects('current', this.current);

    return this.current;
  }

  /**
   * Sets the current active modes.
   * @param {string | string[] | undefined} mode - The mode or modes to set as current.
   */
  set current(mode) {
    this.setCurrent(mode);
  }


  /**
   * Creates an instance of the Mode class.
   * @param {{ current?: string[], modes?: Object<string, string[]> | string[] } | Object<string, string[]> | string[]} mode - The initial modes and/or current modes.
   * @param {ModuleOptions} [options] - The options for the module.
   * @param {ModuleDependencies} [dependencies] - The dependencies for the module.
   */
  constructor(
    mode,
    options = {},
    dependencies = {},
  ) {
    // 3.6: pass the built-in effect directly to super() so Module initialises it in one step.
    super({
      properties: ['current', 'modes'],
      ...options,
      effects: {
        ...options.effects,
        current: [CurrentViewEffect, ...(options.effects?.current ?? [])],
      },
    }, dependencies);

    const modeMap = Array.isArray(mode) ?  { DEFAULT: mode } : mode;

    const { current, modes } = modeMap;

    this.setModes(modes ?? /**@type {Object<string, string[]>} */ (modeMap));
    this.setCurrent(current);
  }
}
