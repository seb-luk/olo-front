// @ts-check

/**
 * @fileoverview Main entry point for olo-front — a lightweight, zero-dependency vanilla JS frontend framework.
 * Exports core modules, state management, DOM utilities, routing, event systems, and constants.
 * @module olo-front
 */

// Core Modules
export { Component } from './lib/component.js';
export { ComponentBuilder } from './lib/component-builder.js';
export { Module } from './lib/module.js';

// DOM & Templating
export { View } from './lib/view.js';
export { Elements } from './lib/elements.js';


// Reactivity & State
export {
  State,
  ContentViewEffect,
  ContentDatasetPipe,
  PropertiesDatasetPipe,
} from './lib/state.js';
export { Mode, CurrentViewEffect } from './lib/mode.js';
export { Children } from './lib/children.js';

// Events
export { Events, OloEvent } from './lib/events.js';

// Routing & Meta & Mode
export { Router } from './lib/router.js';
export { Meta } from './lib/meta.js';


// Constants
export {
  COMPONENT_NAME_FALLBACK,
  COMPONENT_ROOT_ELEMENT_MARK,
  COMPONENT_CONTENT_SLOT_VALUE,
  PLACEHOLDER_STATIC,
  PLACEHOLDER_DYNAMIC,
  DEFAULT_VIEW,
  ROUTER_STATE_NAME,
} from './lib/constants.js';

