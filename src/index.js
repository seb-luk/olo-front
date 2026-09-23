// @ts-check

/**
 * @fileoverview Main entry point for olo-front — a lightweight, zero-dependency vanilla JS frontend framework.
 * Exports core modules, state management, DOM utilities, routing, event systems, and constants.
 * @module olo-front
 */

// Constants
import {
  COMPONENT_CONTENT_SLOT_VALUE,
  COMPONENT_NAME_FALLBACK,
  COMPONENT_ROOT_ELEMENT_MARK,
  DEFAULT_VIEW,
  PLACEHOLDER_DYNAMIC,
  PLACEHOLDER_STATIC,
  ROUTER_STATE_NAME,
} from './lib/constants.js';
// Reactivity & State
import {
  ContentDatasetPipe,
  ContentViewEffect,
  PropertiesDatasetPipe,
  State,
} from './lib/state.js';
import { CurrentViewEffect, Mode } from './lib/mode.js';
// Events
import { Events, OloEvent } from './lib/events.js';

import { Children } from './lib/children.js';
// Core Modules
import { Component } from './lib/component.js';
import { ComponentBuilder } from './lib/component-builder.js';
import { Elements } from './lib/elements.js';
import { Meta } from './lib/meta.js';
import { Module } from './lib/module.js';
// Routing & Meta & Mode
import { Router } from './lib/router.js';
// DOM & Templating
import { View } from './lib/view.js';

// Register default framework dependencies on Module
Module.dependencies = {
  Component,
  ComponentBuilder,
  Elements,
  View,
  State,
  Mode,
  Children,
  Events,
  Router,
  Meta,
};

// Core Modules
export { Component, ComponentBuilder, Module };

// DOM & Templating
export { View, Elements };

// Reactivity & State
export {
  State,
  ContentViewEffect,
  ContentDatasetPipe,
  PropertiesDatasetPipe,
  Mode,
  CurrentViewEffect,
  Children,
};

// Events
export { Events, OloEvent };

// Routing & Meta & Mode
export { Router, Meta };

// Constants
export {
  COMPONENT_NAME_FALLBACK,
  COMPONENT_ROOT_ELEMENT_MARK,
  COMPONENT_CONTENT_SLOT_VALUE,
  PLACEHOLDER_STATIC,
  PLACEHOLDER_DYNAMIC,
  DEFAULT_VIEW,
  ROUTER_STATE_NAME,
};
