/**
 * @fileoverview Client-side Router module handling URL pattern matching, navigation guards, history synchronization, and state integration.
 * @module router
 */

// @ts-check

import { Module } from './module.js';
import { ROUTER_STATE_NAME } from './constants.js';

/**
 * @import {
 *  StateModule,
 *  ModuleDependencies,
 *  RouterOptions,
 *  Effect,
 *  URLSegments,
 *  EventsModule,
 *  StateProperties,
 *  RouterModule,
 *  MetaModule,
 *  StateContent,
 *  RouteDefinition,
 *  RouteMatch,
 *  URLPatternInstance,
 *  URLPatternConstructor,
 * } from './modules.d.ts';
 */

/**
 * An effect that updates the browser's URL when the router's state properties change.
 * This is triggered by changes to the router's state.
 * @type {Effect<StateProperties>}
 */
const PropertiesUrlEffect = (data, options, dependencies) => {
  const meta =
    /**@type {any} */ (options?.currentModule)?.meta ?? (dependencies?.Meta ? new dependencies.Meta() : undefined);
  meta?.updateCurrentURL?.(data);
};

/**
 * An effect that updates the page's meta data (e.g., title, description) based on the state content.
 * This is triggered by changes to the router's state content.
 * @type {Effect<StateContent>}
 */
const ContentMetaEffect = (data, options, dependencies) => {
  if (typeof data === 'object' && data !== null) {
    const meta =
      /**@type {any} */ (options?.currentModule)?.meta ?? (dependencies?.Meta ? new dependencies.Meta() : undefined);
    meta?.updateMetaData?.(data);
  }
};

/**
 * Manages client-side routing, URL state, and navigation events.
 * @implements {RouterModule}
 */
export class Router extends Module {
  /**
   * The state module instance that holds the router's state.
   * @type {StateModule}
   */
  #state;

  /**
   * Gets the URL-derived route properties.
   * @returns {URLSegments} The router state properties object.
   */
  get stateProperties() {
    return this.#state.properties ?? {};
  }

  /**
   * Sets the router state properties.
   * @param {URLSegments} value
   */
  set stateProperties(value) {
    this.#setState(value);
  }

  /**
   * Updates the router state properties.
   * 2.3: Arrow field — .bind(this) is redundant, removed.
   * @type {(properties: URLSegments) => void}
   */
  #setState = (/**@type {URLSegments}*/ properties) => {
    const parsed = this.#parseURL(properties);
    this.#state?.setProperties?.(parsed);
  };

  /**
   * Sets the router state and optionally updates the view.
   * @param {URLSegments} [state] - The router state to set, representing URL segments.
   * @param {Object} [options] - Options for setting the state.
   * @param {boolean} [options.updateView=true] - Whether to trigger an update after setting the state.
   * @returns {URLSegments} The new router state.
   */
  setState(state = {}, { updateView = true } = {}) {
    const parsed = this.#parseURL(state);
    return (
      /** @type {URLSegments} */ (
        this.executeSetter('properties', /** @type {any} */ (this.#setState), /** @type {any} */ (parsed), {
          updateView,
        })
      ) ??
      this.stateProperties ??
      {}
    );
  }

  /**
   * The meta module instance for interacting with document metadata and URL.
   * @type {MetaModule | undefined}
   */
  #meta;

  /**
   * Gets the meta module instance.
   * @returns {MetaModule | undefined} The meta module.
   */
  get meta() {
    return this.#meta;
  }

  /**
   * The events module instance for handling DOM events.
   * @type {EventsModule | undefined}
   */
  #events;

  /**
   * Gets the events module instance.
   * @returns {EventsModule | undefined} The events module.
   */
  get events() {
    return this.#events;
  }

  /**
   * Gets the scope element of the router, which is the root for its operations.
   * @returns {HTMLElement | undefined} The scope element.
   */
  get scope() {
    return this.options.scope ?? this.#events?.scope;
  }

  /**
   * Sets the scope for the router and its dependent modules.
   * @param {HTMLElement | undefined} scope - The new scope element.
   * @returns {void}
   */
  setScope(scope) {
    if (!scope) {
      return;
    }

    this.options.scope = scope;

    if (this.#events) {
      this.#events.scope = scope;
    }
  }

  /**
   * Sets the scope for the router and initializes link listeners within that scope.
   * @param {HTMLElement | undefined} scope - The new scope element.
   */
  set scope(scope) {
    this.setScope(scope);
    this.#addLinkListeners();
  }

  /**
   * Creates an instance of Router.
   * @param {RouterOptions} [options] - Configuration options for the router.
   * @param {ModuleDependencies} [dependencies] - Dependencies like State, Meta, and Events modules.
   */
  constructor(options = {}, dependencies = {}) {
    super(options, dependencies);

    // Setup dependencies

    if (this.dependencies.Meta) {
      this.#meta = new this.dependencies.Meta();
    }

    if (this.dependencies.Events) {
      this.#events = new this.dependencies.Events({ scope: this.options.scope });
    }

    // Register initial routes
    if (Array.isArray(this.options.routes)) {
      this.options.routes.forEach((route) => {
        this.addRoute(route);
      });
    }

    // Initialize router state

    /**
     * @type {StateModule | undefined}
     */
    const existingRouterState = this.options.parentState?.getState?.(ROUTER_STATE_NAME);
    const initialURL = this.#parseURL(this.meta?.getCurrentURL?.() ?? {});

    /**
     * @type {StateModule}
     */
    const routerState =
      existingRouterState ??
      (this.dependencies?.State
        ? new this.dependencies.State({ name: ROUTER_STATE_NAME, properties: initialURL }, {}, this.dependencies)
        : /** @type {StateModule} */ ({ name: ROUTER_STATE_NAME, properties: initialURL }));

    if (existingRouterState && !existingRouterState.properties?.params) {
      existingRouterState.setProperties?.(initialURL);
    }

    if (!existingRouterState && this.options.parentState && this.options.parentState.setChildren) {
      this.options.parentState?.setChildren?.([routerState]);
    }

    this.#state = routerState;

    // Initalize event listeners

    this.#addLinkListeners();

    this.events?.listen?.({
      target: window,
      event: 'popstate',
      callback: () => {
        this.setState(this.meta?.getCurrentURL?.() ?? {}, { updateView: false });
      },
    });

    // Add effects and pipes
    this.#state?.addEffect?.('properties', PropertiesUrlEffect);
    this.#state?.addEffect?.('content', ContentMetaEffect);
  }

  /**
   * Internal list of registered route entries in registration order.
   * @type {Array<{ route: RouteDefinition, patternInstance: URLPatternInstance | null }>}
   */
  #routes = [];

  /**
   * Gets the list of registered route definitions in registration order.
   * @returns {RouteDefinition[]}
   */
  get routes() {
    return this.#routes.map((entry) => entry.route);
  }

  /**
   * Registers a route definition or pattern string.
   * Routes are matched in the order they are registered (First-Match Wins).
   * @param {RouteDefinition | string} route - The route definition object or pattern string.
   * @returns {RouteDefinition} The registered route definition.
   */
  addRoute(route) {
    /** @type {RouteDefinition} */
    const routeDef = typeof route === 'string' ? { pattern: route } : { ...route };
    /** @type {URLPatternConstructor | undefined} */
    const URLPatternCtor =
      this.dependencies?.polyfills?.URLPattern ?? (typeof URLPattern !== 'undefined' ? URLPattern : undefined);

    /** @type {URLPatternInstance | null} */
    let patternInstance = null;
    if (URLPatternCtor) {
      if (typeof routeDef.pattern === 'string') {
        try {
          patternInstance = new URLPatternCtor({ pathname: routeDef.pattern });
        } catch (err) {
          console.error('Failed to create URLPattern for route:', routeDef.pattern, err);
        }
      } else if (routeDef.pattern && typeof (/** @type {any} */ (routeDef.pattern).exec) === 'function') {
        patternInstance = /** @type {URLPatternInstance} */ (routeDef.pattern);
      }
    }

    this.#routes.push({
      route: routeDef,
      patternInstance,
    });

    return routeDef;
  }

  /**
   * Removes a registered route by its pattern or name.
   * @param {string} patternOrName
   * @returns {boolean} Whether a route was removed.
   */
  removeRoute(patternOrName) {
    const initialLength = this.#routes.length;
    this.#routes = this.#routes.filter(
      (entry) => entry.route.pattern !== patternOrName && entry.route.name !== patternOrName,
    );
    return this.#routes.length < initialLength;
  }

  /**
   * Matches URL segments against registered routes in registration order and evaluates optional canMatch guards.
   * @param {URLSegments} urlSegments
   * @returns {RouteMatch | null}
   */
  #matchRoute(urlSegments) {
    const pathname = urlSegments.pathname ?? '/';
    const origin =
      this.meta?.getURLSegment?.('origin') ??
      (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'http://localhost');
    const href = this.meta?.getURLSegment?.('href', urlSegments) ?? `${origin}${pathname}`;

    for (const entry of this.#routes) {
      const { route, patternInstance } = entry;
      let matched = false;
      /** @type {Record<string, string | undefined>} */
      let params = {};

      if (patternInstance) {
        try {
          const result = patternInstance.exec(href, origin) ?? patternInstance.exec({ pathname });
          if (result) {
            matched = true;
            params = result.pathname?.groups ?? {};
          }
        } catch {
          matched = false;
        }
      } else if (typeof route.pattern === 'string') {
        if (route.pattern === pathname || route.pattern === '*') {
          matched = true;
          params = {};
        }
      }

      if (matched) {
        if (typeof route.canMatch === 'function') {
          const allowed = route.canMatch(params, route, urlSegments);
          if (!allowed) {
            continue;
          }
        }

        return {
          route,
          params,
          url: urlSegments,
        };
      }
    }

    return null;
  }

  /**
   * Tests a URL against registered routes and returns the matching route and parameters without modifying state.
   * @param {string | URLSegments} [url] - The URL to test. Defaults to the current URL.
   * @returns {RouteMatch | null} The match result or null if no route matches.
   */
  match(url) {
    const segments = typeof url === 'string' || !url ? this.#parseURL(url ?? this.meta?.getCurrentURL?.() ?? {}) : url;
    return this.#matchRoute(segments);
  }

  /**
   * Parses a URL string or a URLSegments object into a standardized URLSegments object.
   * Enriches the segments with matched route information and extracted parameters.
   * @param {URLSegments | string} url - The URL to parse.
   * @returns {URLSegments} The parsed URL segments.
   */
  #parseURL(url) {
    /** @type {URLSegments} */
    let segments;

    if (typeof url === 'string') {
      try {
        const { pathname, hostname, search, protocol, port } = new URL(url, this.meta?.getURLSegment?.('origin'));
        segments = { pathname, hostname, search, protocol, port };
      } catch (error) {
        console.error('Tried to parse invalid URL: ', url, error);
        return this.stateProperties ?? {};
      }
    } else if (typeof url === 'object' && url !== null) {
      segments = { ...url };
    } else {
      return this.stateProperties ?? {};
    }

    const matched = this.#matchRoute(segments);
    if (matched) {
      segments.params = matched.params;
      segments.matchedRoute = matched.route;
      segments.route =
        matched.route.name ??
        matched.route.component ??
        (typeof matched.route.pattern === 'string' ? matched.route.pattern : undefined);
    } else {
      segments.params = {};
      segments.matchedRoute = undefined;
      segments.route = undefined;
    }

    return segments;
  }

  /**
   * Adds click event listeners to all links within the scope that have a `data-olo-route` attribute.
   * @returns {void}
   */
  #addLinkListeners() {
    if (this.events?.search && this.events?.listen) {
      const links = this.events.search([{ route: '' }]);

      links.forEach((link) => {
        this.events?.listen?.({
          target: link,
          event: 'click',
          callback: (event) => {
            const route = link.dataset.oloRoute;

            if (route) {
              try {
                const origin =
                  this.meta?.getURLSegment?.('origin') ?? (typeof window !== 'undefined' ? window.location.origin : '');
                const parsed = new URL(route, origin || undefined);
                if (origin && parsed.origin !== origin) {
                  // External link - allow native browser navigation
                  return;
                }
              } catch {
                return;
              }

              this.setState(this.#parseURL(route));
              event.preventDefault();
            }
          },
        });
      });
    }
  }

  /**
   * Cleans up all event listeners created by the router.
   * This should be called when the router is no longer needed to prevent memory leaks.
   * @returns {void}
   */
  unLink() {
    this.#events?.stopAll?.();
  }
}
