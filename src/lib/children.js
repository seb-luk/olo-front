// @ts-check
 
/**
 * @fileoverview Manages collections of child states, coordinating component instances, virtual states, and DOM ordering.
 * @module children
 */

import { COMPONENT_CONTENT_SLOT_VALUE } from './constants.js';
import { Module } from './module.js';
/**
 * @import {
 *  ChildrenModule,
 *  ElementsModule,
 *  Index,
 *  ModuleDependencies,
 *  ModuleOptions,
 *  Selector,
 *  StateConfig,
 *  StateModule,
 *  StateOptions,
 * } from './modules.d.ts';
 */


/**
 * Manages a collection of child states, including both component and virtual states.
 * @implements {ChildrenModule}
 */
export class Children extends Module {
  /**
   * An array of states associated with components (have a DOM representation).
   * @type {StateModule[]}
   */
  #componentStates = [];

  /**
   * An array of virtual states not associated with components (no DOM element).
   * @type {StateModule[]}
   */
  #virtualStates = [];

  /**
   * Gets all states, component states first followed by virtual states.
   * @type {StateModule[]}
   */
  get states() {
    return this.#componentStates.concat(this.#virtualStates);
  }

  /**
   * The elements module for DOM manipulation.
   * @type {ElementsModule | undefined}
   */
  #elements;

  /**
   * Sets the scope for the elements module.
   * @param {HTMLElement} [scope] - The new scope.
   * @return {void}
   */
  setElements(scope) {
    if (this.#elements && scope) {
      this.#elements.scope = scope;
    }
  }

  /**
   * Creates an instance of Children.
   * @param {ChildrenModule | (StateModule | StateConfig | Selector)[]} [states] - The initial states.
   * @param {StateOptions} [options] - The options for the module.
   * @param {ModuleDependencies} [dependencies] - The dependencies for the module.
   */
  constructor(states = [], options, dependencies) {
    super(options, dependencies);

    if (this.dependencies?.Elements) {
      this.#elements = new this.dependencies.Elements(options?.scope ?? options?.selector);
    }

    const children = Array.isArray(states) ? states : states.states ?? [];

    children.forEach((state) => {
      this.insert(state, undefined, this.options);
    });
  }

  /**
   * Finds a child state by name.
   * @param {string | symbol} [name] - The name of the child to find.
   * @param {StateOptions} [options] - Pass `virtualElements: true` to search only virtual states,
   *   `false` to search only component states, or omit to search both.
   * @returns {StateModule | undefined} The found state or undefined.
   */
  findChild(name, { virtualElements } = {}) {
    if (name === undefined) return undefined;

    if (virtualElements === true) {
      return this.#virtualStates.find(s => s.name === name);
    }

    const comp = this.#componentStates.find(s => s.name === name);
    if (comp !== undefined || virtualElements === false) return comp;

    return this.#virtualStates.find(s => s.name === name);
  }

  /**
   * Resolves `target` to a numeric index within `list`.
   * Handles 'FIRST' / 'LAST' / number positional targets and selector (name-based) targets.
   * @param {Index | Selector} target
   * @param {StateModule[]} list
   * @param {{ newElement?: boolean }} [options]
   * @returns {number} The resolved index, or -1 if a name-based target was not found.
   */
  #indexInList(target, list, { newElement = false } = {}) {
    if (typeof target === 'number' || typeof target === 'string') {
      return this.#elements?.normalizeIndex?.(target, list.length, { newElement }) ?? 0;
    }
    return list.findIndex(s => s.name === (/**@type {Selector}*/ (target)).name);
  }

  /**
   * Returns the list (#componentStates or #virtualStates) that should own `target`.
   * When `virtualElements` is undefined, auto-detects by name lookup for selector targets
   * and defaults to component states for positional targets.
   * @param {Index | Selector} target
   * @param {boolean | undefined} virtualElements
   * @returns {StateModule[]}
   */
  #resolveList(target, virtualElements) {
    if (virtualElements === true) return this.#virtualStates;
    if (virtualElements === false) return this.#componentStates;

    // Auto-detect from selector target
    if (typeof target === 'object' && target !== null && 'name' in target) {
      const inVirtual = this.#virtualStates.some(s => s.name === target.name);
      return inVirtual ? this.#virtualStates : this.#componentStates;
    }

    // Positional targets default to component states
    return this.#componentStates;
  }

  /**
   * Inserts a state into the collection.
   * @param {StateModule | Selector | StateConfig} state - The state to insert.
   * @param {Index} [position] - The position to insert the state at.
   * @param {ModuleOptions} [options] - The options for the insertion.
   * @returns {Promise<StateModule | undefined>} The inserted state or undefined.
   */
  async insert(state, position = 'LAST', { updateView = true, parentState, scope, placeholder, rootElement, view, localFirst, pipes, effects } = {}) {
    if (state.name) {
      const existingChild = this.findChild(state.name);
      if (existingChild) {
        return existingChild;
      }
    }

    /**
     * @type {StateModule}
     */
    const componentState = this.dependencies?.State && /**@type {StateModule} */ (state).setComponent === undefined
      ? new this.dependencies.State(
        state,
        { parentState: parentState ?? this.options.parentState, scope, placeholder, rootElement, pipes, effects },
        this.dependencies,
      )
      : state;

    const resolvedParentState = parentState ?? this.options.parentState;
    componentState.parent = resolvedParentState;

    const isVirtual = componentState.component === undefined;

    if (isVirtual) {
      // Virtual states have no DOM representation — just append to the virtual list.
      this.#virtualStates.push(componentState);
    } else {
      const index = this.#indexInList(position, this.#componentStates, { newElement: true });
      this.#componentStates.splice(Math.max(0, index), 0, componentState);

      if (updateView && componentState.component) {
        let component;
        try {
          const childView = view ?? placeholder?.dataset?.oloView ?? componentState.view;

          const hasContentSlot = typeof componentState.content === 'object' && componentState.content !== null &&
            Object.values(componentState.content).some(val => val === COMPONENT_CONTENT_SLOT_VALUE);

          if (hasContentSlot && componentState.name && this.dependencies.componentBuilder?.buildFromContent) {
            component = await this.dependencies.componentBuilder.buildFromContent(
              componentState.name,
              componentState,
              { parentState: resolvedParentState, placeholder, rootElement, view: childView, localFirst, pipes, effects },
              this.dependencies,
            );
          }

          if (!component) {
            component = await this.dependencies.componentBuilder?.buildFromTemplate?.(
              componentState.component,
              childView,
              componentState,
              { parentState: resolvedParentState, placeholder, rootElement, view: childView, localFirst, pipes, effects },
              this.dependencies,
            );
          }

          if (
            !component?.rootElement
            || !this.#elements?.insert?.(component.rootElement, resolvedParentState, position)
          ) {
            throw new Error(`Component "${String(componentState.name)}" could not be inserted.`);
          }

          component.state?.setContent?.({}, { forceUpdate: true });
          component.state?.setProperties?.({}, { forceUpdate: true });

          await component.mount?.();
          await resolvedParentState?.componentInstance?.onAddChild?.(component);
        } catch (error) {
          const stateIndex = this.#componentStates.indexOf(componentState);
          if (stateIndex !== -1) {
            this.#componentStates.splice(stateIndex, 1);
          }
          component?.destroy?.();
          throw error;
        }
      }
    }

    return componentState;
  }

  /**
   * Removes a state from the collection.
   * @param {Index | Selector} [target] - The target state to remove.
   * @param {StateOptions} [options] - The options for the removal.
   * @returns {StateModule | undefined} The removed state or undefined.
   */
  remove(target = 'LAST', { updateView = true, virtualElements } = {}) {
    const list = this.#resolveList(target, virtualElements);
    const index = this.#indexInList(target, list);

    if (index === -1) return undefined;

    const isVirtual = list === this.#virtualStates;
    const [state] = list.splice(index, 1);

    if (updateView && !isVirtual && state) {
      this.#elements?.remove?.(state, this.#componentStates.length);
      const childComponent = state.componentInstance;
      state.detachComponent?.();
      if (childComponent) {
        state.parent?.componentInstance?.onRemoveChild?.(childComponent);
      }
      return state;
    }

    return state;
  }

  /**
   * Moves a state to a new position in the collection.
   * @param {Index | Selector} [target] - The target state to move.
   * @param {Index | 'NEXT' | 'PREV'} [position] - The new position for the state.
   * @param {StateOptions} [options] - The options for the move.
   * @returns {StateModule | undefined} The moved state or undefined.
   */
  move(target = 'LAST', position = 'LAST', { updateView = true, parentState, virtualElements } = {}) {
    const list = this.#resolveList(target, virtualElements);
    const targetIndex = this.#indexInList(target, list);

    if (targetIndex === -1) return undefined;

    // Compute destination before removing (splice shifts remaining indices).
    let newPos;
    if (position === 'NEXT') {
      newPos = targetIndex + 1;
    } else if (position === 'PREV') {
      newPos = targetIndex - 1;
    } else {
      newPos = this.#indexInList(position, list);
    }

    const state = this.remove(target, { updateView: false });

    if (state) {
      this.insert(state, newPos, { updateView: false, parentState });

      if (updateView && newPos !== undefined && parentState) {
        this.#elements?.move?.(state, parentState, newPos);
      }
    }

    return state;
  }
}
