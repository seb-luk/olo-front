// @ts-check

/**
 * @fileoverview Shared constants used across multiple olo-front modules to prevent circular import coupling.
 * @module constants
 */

/**
 * Serves as the default component name fallback.
 * @type {string}
 */
export const COMPONENT_NAME_FALLBACK = 'DEFAULT';

/**
 * A constant used to mark the root element of a component for content updates.
 * @type {string}
 */
export const COMPONENT_ROOT_ELEMENT_MARK = 'ROOT';

/**
 * A placeholder value in the initial state content that is meant to be replaced with the text node from the corresponding HTML element.
 * @type {string}
 */
export const COMPONENT_CONTENT_SLOT_VALUE = 'OLO-SLOT';

/**
 * A placeholder for a component that is always present in the DOM.
 * @type {string}
 */
export const PLACEHOLDER_STATIC = 'STATIC';

/**
 * A placeholder for a component that is added and removed dynamically.
 * @type {string}
 */
export const PLACEHOLDER_DYNAMIC = 'DYNAMIC';

/**
 * The fallback key used when a template has no explicit data-olo-view.
 * @type {string}
 */
export const DEFAULT_VIEW = 'default';

/**
 * The name used for the router's state in the application's state tree.
 * @type {string}
 */
export const ROUTER_STATE_NAME = 'OLO-LOCATION';

