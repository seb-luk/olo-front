/**
 * @fileoverview Type definitions for all olo-front core modules, component lifecycle, reactivity, and routing.
 * @module modules
 */

// ============================================================================
// View Types
// ============================================================================

/**
 * Represents a position or index in a list of elements or child states.
 * - `'FIRST'`: The first position (index 0).
 * - `'LAST'`: The last position (append to the end).
 * - `number`: An explicit zero-based numerical index.
 */
export type Index = 'FIRST' | 'LAST' | number;

/**
 * A selector object used to identify and query components, elements, and views in the DOM.
 */
export interface Selector {
  /** The unique name of the instance (`data-olo-name`). */
  name?: string;
  /** The component identifier or type (`data-olo-component`). */
  component?: string;
  /** The active view or template variant name (`data-olo-view`). */
  view?: string;
}

/**
 * Module responsible for scoped DOM querying, selector compilation, and boundary enforcement.
 */
export interface ViewModule {
  /** The root element for this view scope; queries are relative to this element. */
  scope: HTMLElement;

  /**
   * Queries a single matching element within the view scope.
   * @param selector - Selector criteria or dataset key-value map.
   * @param options - Query options including an alternative scope or tag filter.
   * @returns The first matching element, or null if none found.
   */
  get?: (
    selector: Selector | { [key: string]: string | undefined },
    options?: { scope?: HTMLElement; tag?: string },
  ) => HTMLElement | null;

  /**
   * Searches for all matching elements within the view scope.
   * @param selector - Array of selector criteria to match.
   * @param options - Query options including an alternative scope or tag filter.
   * @returns Array of matched HTML elements.
   */
  search?: (
    selector: (Selector | { [key: string]: string | undefined })[],
    options?: { scope?: HTMLElement; tag?: string },
  ) => HTMLElement[];

  /**
   * Compiles an element or partial selector into a normalized Selector object.
   * @param element - The DOM element or selector to compile.
   * @returns The compiled Selector.
   */
  compileSelector?: (element: HTMLElement | Selector) => Selector;
}

// ============================================================================
// Elements Types
// ============================================================================

/**
 * Module extending ViewModule with higher-level DOM operations including insertions,
 * placeholder swaps, template cloning, and safe attribute/content updates.
 */
export interface ElementsModule extends ViewModule {
  /**
   * Normalizes an Index ('FIRST', 'LAST', or number) to a valid zero-based array index.
   * @param index - Index identifier or position.
   * @param length - Current length of the list.
   * @param options - Options such as whether this is for a newly inserted element.
   * @returns The normalized numerical index.
   */
  normalizeIndex?: (index: Index, length: number, options?: ElementsOptions) => number;

  /**
   * Replaces a placeholder DOM element with a new element or HTML collection.
   * @param placeholder - The placeholder element or selector.
   * @param view - The replacement view element or collection.
   * @returns The inserted element, or null on failure.
   */
  replacePlaceholder?: (placeholder: Selector | HTMLElement, view?: HTMLElement | HTMLCollection) => HTMLElement | null;

  /**
   * Inserts an element into the DOM at the specified index or replacing a dynamic placeholder.
   * @param element - The element to insert.
   * @param parent - Selector for the parent element.
   * @param index - The insertion index ('FIRST', 'LAST', or number).
   * @returns The inserted element, or null on failure.
   */
  insert?: (element: HTMLElement, parent?: Selector, index?: Index) => HTMLElement | null;

  /**
   * Moves an existing DOM element to a new parent or index among siblings.
   * @param selector - Selector of the element to move.
   * @param parent - Selector for the destination parent.
   * @param index - The target index in the new position.
   * @returns The moved element, or null on failure.
   */
  move?: (selector: Selector, parent: Selector, index: Index) => HTMLElement | null;

  /**
   * Removes an element from the DOM, restoring a cached placeholder if remaining items reach zero.
   * @param selector - Selector for the element to remove.
   * @param remainingItems - Number of sibling items remaining after removal.
   * @returns The removed element, or null if not found.
   */
  remove?: (selector: Selector, remainingItems?: number) => HTMLElement | null;

  /**
   * Updates text content or attributes of elements matching the selector.
   * @param selector - Selector for the elements to update.
   * @param content - Content string/number/boolean or a map of element names to values.
   * @param attribute - Default attribute to write ('textContent', 'href', etc.).
   */
  update?: (selector: Selector, content: StateContent, attribute?: string) => void;

  /**
   * Extracts slot content from the DOM to populate state content slots marked with COMPONENT_CONTENT_SLOT_VALUE.
   * @param selector - Component selector.
   * @param content - Initial content structure containing slot markers.
   * @param html - Scope element to extract from.
   * @returns Enriched content object with extracted values.
   */
  extractContent?: (selector: Selector, content: StateContent, html?: HTMLElement) => StateContent;

  /**
   * Searches for an existing rendered view matching the selector (excluding templates and static placeholders).
   * @param selector - Selector for the view to find.
   * @returns The view element or null if not found.
   */
  searchView?: (selector: Selector) => HTMLElement | null;

  /**
   * Compiles an element from a template, annotating it with OLO data attributes.
   * @param selector - Target selector with component and view metadata.
   * @param options - Optional template element to clone from.
   * @returns The compiled element fragment or null.
   */
  compileView?: (selector: Selector, options?: { template?: HTMLTemplateElement }) => HTMLElement | null;
}

/**
 * Options passed to ElementsModule operations.
 */
export interface ElementsOptions extends BaseModuleOptions {
  /** Whether the operation concerns a newly created element being added. */
  newElement?: boolean;
}

// ============================================================================
// Module Types
// ============================================================================

/**
 * A pure transformation function in a property's pipeline that receives data, options, and dependencies,
 * and returns transformed data.
 * @template Data - The type of data being processed.
 */
export type Pipe<Data = any> = (data: Data, options?: ModuleOptions, dependencies?: ModuleDependencies) => Data;

/**
 * A side-effect callback triggered when a property changes, receiving the new value, options, and dependencies.
 * @template Data - The type of data passed to the effect.
 */
export type Effect<Data = any> = (data: Data, options?: ModuleOptions, dependencies?: ModuleDependencies) => void;

/**
 * Supported values for module properties managed by the Module base class.
 */
export type ModulePropertyValue =
  | string
  | number
  | boolean
  | { [key: string | symbol]: string | number | boolean | Record<string, unknown> | unknown };

/**
 * Options controlling setter execution and effect triggering in Module.executeSetter.
 */
export interface SetterOptions {
  /** Forces updates and effects even when diffing detects no changes. */
  forceUpdate?: boolean;
  /** Whether view updates should be executed. */
  updateView?: boolean;
  /** Array of property keys that were changed during the setter call. */
  updatedProperties?: (string | symbol)[];
}

/**
 * Base module interface providing pipeline transformations, side-effects, options, and dependency injection.
 */
export interface Module {
  [key: string]: any;

  /** Map of registered pipe functions keyed by property name. */
  readonly pipes?: { [key: string]: Pipe[] };

  /**
   * Adds a pipe function to a property's transformation pipeline.
   * @param prop - Property name.
   * @param pipe - Pipe function to register.
   * @returns The added pipe function or null if invalid/duplicate.
   */
  addPipe?: (prop: string, pipe?: Pipe) => Pipe | null;

  /**
   * Removes a specific pipe or all pipes from a property.
   * @param prop - Property name.
   * @param pipe - Specific pipe to remove. If omitted, all pipes for the property are cleared.
   * @returns Array of remaining pipes, or null if the property has no pipes.
   */
  removePipe?: (prop: string, pipe?: Pipe) => Pipe[] | null;

  /**
   * Passes data through all registered pipes for a given property.
   * @template Data - Data type.
   * @param prop - Property name.
   * @param data - Initial data.
   * @param options - Additional options merged with module options.
   * @param dependencies - Additional dependencies merged with module dependencies.
   * @returns The final transformed data.
   */
  applyPipes?: <Data = any>(
    prop: string,
    data: Data,
    options?: ModuleOptions,
    dependencies?: ModuleDependencies,
  ) => Data;

  /** Map of registered effect functions keyed by property name. */
  readonly effects?: { [key: string]: Effect[] };

  /**
   * Adds an effect callback to a property and immediately executes it if the property has a value.
   * @param prop - Property name.
   * @param effect - Effect callback to register.
   * @returns The added effect callback or null if invalid/duplicate.
   */
  addEffect?: (prop: string, effect?: Effect) => Effect | null;

  /**
   * Removes a specific effect or all effects from a property.
   * @param prop - Property name.
   * @param effect - Specific effect to remove. If omitted, all effects for the property are cleared.
   * @returns Array of remaining effects, or null if property has no effects.
   */
  removeEffect?: (prop: string, effect?: Effect) => Effect[] | null;

  /**
   * Triggers registered effects for a property or all properties.
   * @param prop - Property name, or omit to trigger effects for all properties.
   * @param data - Data to pass to effects (defaults to current property value).
   * @param options - Options passed to the effect functions.
   * @param dependencies - Dependencies passed to the effect functions.
   */
  triggerEffects?: (prop?: string, data?: any, options?: ModuleOptions, dependencies?: ModuleDependencies) => void;

  /** Module configuration options. */
  options?: ModuleOptions;

  /** Injected module dependencies. */
  dependencies?: ModuleDependencies;
}

/**
 * Base options accepted by all modules in the framework.
 */
export interface BaseModuleOptions {
  /** Selector metadata for the module instance. */
  selector?: Selector;
  /** Root scope DOM element. */
  scope?: HTMLElement;
  /** Reference to the module instance itself. */
  currentModule?: Module;
  /** Property names managed by this module instance. */
  properties?: string[];
  /** Initial pipes to register on initialization. */
  pipes?: { [key: string]: Pipe[] };
  /** Initial effects to register on initialization. */
  effects?: { [key: string]: Effect[] };
  /** Whether changes should automatically propagate to the DOM view. */
  updateView?: boolean;
}

/**
 * Combined options interface extending base and specialized module options.
 */
export interface ModuleOptions
  extends BaseModuleOptions,
    ComponentOptions,
    StateOptions,
    ComponentBuilderOptions,
    EventsOptions,
    ElementsOptions,
    RouterOptions {}

/**
 * Injected dependency constructors and singletons available to modules.
 */
export interface ModuleDependencies {
  /** Constructor for DOM manipulation ElementsModule. */
  Elements?: { new (scope?: HTMLElement | Selector): ElementsModule };
  /** Constructor for event management EventsModule. */
  Events?: { new (options?: EventsOptions, dependencies?: ModuleDependencies): EventsModule };
  /** Constructor for document metadata MetaModule. */
  Meta?: { new (head?: HTMLHeadElement | null): MetaModule };
  /** Constructor for mode management ModeModule. */
  Mode?: {
    new (
      mode:
        | { current?: string[]; modes?: { [key: string]: string[] } | string[] }
        | { [key: string]: string[] }
        | string[],
      options?: ModuleOptions,
      dependencies?: ModuleDependencies,
    ): ModeModule;
  };
  /** Constructor for reactive StateModule. */
  State?: {
    new (
      state?: StateModule | StateConfig | Selector,
      options?: StateOptions,
      dependencies?: ModuleDependencies,
    ): StateModule;
  };
  /** Constructor for children collection ChildrenModule. */
  Children?: {
    new (
      states?: ChildrenModule | (StateModule | StateConfig | Selector)[],
      options?: StateOptions,
      dependencies?: ModuleDependencies,
    ): ChildrenModule;
  };
  /** Constructor for ViewModule. */
  View?: { new (scope?: HTMLElement): ViewModule };
  /** ComponentBuilder module instance. */
  componentBuilder?: ComponentBuilderModule;
  /** Constructor for ComponentBuilderModule. */
  ComponentBuilder?: {
    new (
      components: (ComponentAssets | string)[],
      options?: ComponentBuilderOptions,
      dependencies?: ModuleDependencies,
    ): ComponentBuilderModule;
  };
  /** Base Component constructor. */
  Component?: {
    new (
      component?: StateModule | string,
      options?: ComponentOptions,
      dependencies?: ModuleDependencies,
    ): ComponentModule;
  };
  /** Map of registered component constructors keyed by component name. */
  Components?: {
    [key: string]: {
      new (
        component?: StateModule | string,
        options?: ComponentOptions,
        dependencies?: ModuleDependencies,
      ): ComponentModule;
    };
  };
  /** Constructor for client-side RouterModule. */
  Router?: { new (options?: RouterOptions, dependencies?: ModuleDependencies): RouterModule };
  /** Optional polyfill dependencies such as URLPattern. */
  polyfills?: PolyfillsDependencies;
}

/**
 * Matched components from a URLPattern match on a single URL component (e.g., pathname).
 */
export interface URLPatternComponentResult {
  /** The raw input string matched. */
  input?: string;
  /** Named capture groups extracted from the pattern. */
  groups?: Record<string, string | undefined>;
}

/**
 * Result object returned from executing a URLPattern match.
 */
export interface URLPatternResult {
  /** The input values matched against. */
  inputs?: (string | URLPatternInit | unknown)[];
  /** Matched protocol component. */
  protocol?: URLPatternComponentResult;
  /** Matched username component. */
  username?: URLPatternComponentResult;
  /** Matched password component. */
  password?: URLPatternComponentResult;
  /** Matched hostname component. */
  hostname?: URLPatternComponentResult;
  /** Matched port component. */
  port?: URLPatternComponentResult;
  /** Matched pathname component. */
  pathname?: URLPatternComponentResult;
  /** Matched search (query) component. */
  search?: URLPatternComponentResult;
  /** Matched hash component. */
  hash?: URLPatternComponentResult;
}

/**
 * Input configuration for constructing or matching a URLPattern.
 */
export interface URLPatternInit {
  protocol?: string;
  username?: string;
  password?: string;
  hostname?: string;
  port?: string;
  pathname?: string;
  search?: string;
  hash?: string;
  baseURL?: string;
}

/**
 * A URLPattern input can be a pattern string or a structured URLPatternInit object.
 */
export type URLPatternInput = string | URLPatternInit;

/**
 * Interface representing a URLPattern instance for pattern testing and parameter extraction.
 */
export interface URLPatternInstance {
  readonly pathname?: string;
  /** Matches a URL input against the pattern and extracts component results. */
  exec(input?: URLPatternInput, baseURL?: string): URLPatternResult | null;
  /** Tests whether an input matches the pattern without capturing parameters. */
  test?(input?: URLPatternInput, baseURL?: string): boolean;
}

/**
 * Configuration options for creating a URLPattern.
 */
export interface URLPatternOptions {
  /** Whether matching should ignore case. */
  ignoreCase?: boolean;
}

/**
 * Constructor interface for creating URLPattern instances.
 */
export interface URLPatternConstructor {
  new (input: URLPatternInput, baseURL: string | URL, options?: URLPatternOptions): URLPatternInstance;
  new (input?: URLPatternInput, options?: URLPatternOptions): URLPatternInstance;
}

/**
 * Polyfill container for environments lacking native modern Web APIs.
 */
export interface PolyfillsDependencies {
  /** URLPattern constructor polyfill. */
  URLPattern?: URLPatternConstructor;
  [key: string]: unknown;
}

// ============================================================================
// Component Types
// ============================================================================

/**
 * Options used to configure a Component instance.
 */
export interface ComponentOptions extends BaseModuleOptions {
  /** Active view or template name. */
  view?: string;
  /** Pre-existing root DOM element. */
  rootElement?: HTMLElement;
  /** Placeholder element in the DOM to replace upon mounting. */
  placeholder?: HTMLElement;
  /** Whether locally cached templates should take precedence over remote templates. */
  localFirst?: boolean;
  /** Parent state module in the state hierarchy. */
  parentState?: StateModule;
}

/**
 * Interface representing an active UI Component instance.
 */
export interface ComponentModule extends Selector, Module {
  /** Cached asset definitions for this component. */
  assets?: ComponentAssets;
  /** The root DOM element for the component's rendered view. */
  rootElement?: HTMLElement;
  /** The name of the active view. */
  view?: string;
  /** Promise that resolves when asynchronous initialization completes. */
  readonly initialized: Promise<ComponentModule>;
  /** Promise that resolves when mounting completes and onReady has executed. */
  readonly ready: Promise<ComponentModule>;

  /**
   * Generates a unique, instance-scoped HTML ID.
   * @param suffix - Local identifier suffix.
   * @returns Scoped ID string (`${name}-${suffix}`).
   */
  id?: (suffix: string) => string;

  /**
   * Switches the component's active view to a new template.
   * @param view - View/template name.
   * @param localFirst - Whether local templates take precedence.
   * @returns Promise resolving to the component instance.
   */
  setView?: (view: string, localFirst?: boolean) => Promise<ComponentModule>;

  /**
   * Mounts the component, executing the onReady lifecycle hook.
   * @returns Promise resolving when ready.
   */
  mount: () => Promise<ComponentModule>;

  /** Destroys the component, cleaning up event listeners, router links, child components, and DOM elements. */
  destroy: () => void;

  /** The reactive state module bound to this component. */
  state?: StateModule;
  /** The elements module bound to this component's DOM. */
  elements?: ElementsModule;
  /** The events module bound to this component's scope. */
  events?: EventsModule;

  /** Lifecycle hook invoked after the component is mounted in the DOM. */
  onReady: () => void | Promise<void>;
  /** Lifecycle hook invoked after initial state and view setup. */
  onInit: () => void | Promise<void>;
  /** Lifecycle hook invoked after a view switch occurs. */
  onViewChange?: (context?: { view: string; previousView: string; rootElement?: HTMLElement }) => void | Promise<void>;
  /** Lifecycle hook invoked when a child component is added. */
  onAddChild?: (child?: ComponentModule) => void | Promise<void>;
  /** Lifecycle hook invoked when a child component is removed. */
  onRemoveChild?: (child?: ComponentModule) => void;
  /** Lifecycle hook for handling errors occurred during component operations. */
  onError?: (error: unknown, context?: unknown) => void | Promise<void>;
  /** Lifecycle hook invoked immediately before destruction. */
  onDestroy?: () => void;
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Options for configuring event listeners.
 */
export interface EventOptions {
  /** Whether the listener should fire at most once before removing itself. */
  once?: boolean;
  /** AbortSignal used to cancel the listener. */
  abortSignal?: AbortSignal;
}

/**
 * Configuration object defining a DOM event listener.
 */
export interface EventListenerConfig {
  /** Target element, window, or selector. Defaults to the events module scope. */
  target?: Selector | HTMLElement | Window;
  /** Event type name (e.g. 'click', 'oloEvent'). Defaults to 'oloEvent'. */
  event?: string;
  /** Callback invoked when the event is triggered. */
  callback?: (this: Element, ev: Event) => any;
  /** Additional event options. */
  options?: EventOptions;
}

/**
 * Module responsible for scoped DOM event listening, custom event dispatching, and cleanup.
 */
export interface EventsModule extends ViewModule {
  /**
   * Attaches an event listener to the target element.
   * @param listener - Event listener configuration.
   * @returns The target element or window the listener was attached to.
   */
  listen?: (listener?: EventListenerConfig) => HTMLElement | Window;

  /**
   * Removes an event listener from its target element.
   * @param listener - Event listener configuration to remove.
   * @returns The target element or window the listener was removed from.
   */
  unlisten?: (listener?: EventListenerConfig) => HTMLElement | Window;

  /** Aborts and removes all event listeners registered through this instance. */
  stopAll?: () => void;

  /**
   * Dispatches a custom OloEvent from the module scope.
   * @param action - Action name identifying the event.
   * @param value - Optional string value payload.
   * @param context - Optional structured context data.
   * @returns The scope element that dispatched the event.
   */
  dispatch?: (action: string, value?: string, context?: StateProperties) => HTMLElement;
}

/**
 * Options for initializing an EventsModule instance.
 */
export interface EventsOptions extends BaseModuleOptions {
  /** Initial listeners to register upon creation. */
  listeners?: EventListenerConfig[];
}

// ============================================================================
// Component Builder Types
// ============================================================================

/** Constructor type for Component classes. */
export type ComponentClass = { new (...args: any[]): ComponentModule };

/**
 * Cached asset registry entry for a component including its class, templates, and styles.
 */
export interface ComponentAssets {
  /** Component name identifier. */
  component: string;
  /**
   * The HTML template associated with the component, which can be a single template or multiple named templates for different views. False indicates that no template could be found in the component files.
   */
  views?: { [view: string]: false | HTMLTemplateElement };
  /**
   * Inline style and stylesheet link elements associated with the component. False indicates that no styles could be found in the component files.
   */
  styles?: false | (HTMLLinkElement | HTMLStyleElement)[];
  /** The constructor class for the component, or false if none could be loaded. */
  class?: false | ComponentClass;
}

/**
 * Module responsible for loading, compiling, and instantiating components and templates.
 */
export interface ComponentBuilderModule extends Module {
  /**
   * Resolves and returns an HTMLTemplateElement for a component view.
   * @param component - Component identifier.
   * @param view - View template name.
   * @param options - Builder options.
   * @returns Promise resolving to the HTMLTemplateElement or undefined.
   */
  getView?: (
    component: string,
    view?: string,
    options?: ComponentBuilderOptions,
  ) => Promise<HTMLTemplateElement | undefined>;

  /**
   * Builds and instantiates a component from a template.
   * @param component - Component identifier.
   * @param view - View template name.
   * @param state - Initial state or selector.
   * @param options - Component configuration options.
   * @param dependencies - Injected dependencies.
   * @returns Promise resolving to the built ComponentModule or undefined.
   */
  buildFromTemplate?: (
    component: string,
    view?: string,
    state?: StateModule | Selector,
    options?: ComponentOptions,
    dependencies?: ModuleDependencies,
  ) => Promise<ComponentModule | undefined>;

  /**
   * Builds and instantiates a component from remote or inline HTML content.
   * @param name - Fragment or state name.
   * @param state - State module to populate.
   * @param options - Component configuration options.
   * @param dependencies - Injected dependencies.
   * @returns Promise resolving to the built ComponentModule or undefined.
   */
  buildFromContent?: (
    name: string,
    state?: StateModule,
    options?: ComponentOptions,
    dependencies?: ModuleDependencies,
  ) => Promise<ComponentModule | undefined>;
}

/**
 * Options for configuring ComponentBuilder.
 */
export interface ComponentBuilderOptions extends BaseModuleOptions {
  /** Root directory for component files (defaults to 'components'). */
  componentRootFolder?: string;
  /** Root directory for page/content fragments (defaults to 'pages'). */
  contentRootFolder?: string;
  /** Root DOM element for rendered content. */
  rootElement?: HTMLElement;
  /** Whether to prioritize locally cached templates over remote fetching. */
  localFirst?: boolean;
}

// ============================================================================
// State Types
// ============================================================================

/** Structured key-value property map for state properties. */
export type StateProperties = {
  [key: string]: string | number | boolean | Record<string, unknown> | unknown;
};

/** Primitive or mapped content value representing element content and slot data. */
export type StateContent = string | number | boolean | { [key: string | symbol]: string | number | boolean };

/** Configuration object used to initialize a StateModule instance. */
export interface StateConfig extends Selector {
  /** Content value or slot mappings. */
  content?: StateContent;
  /** Component configuration properties. */
  properties?: StateProperties;
  /** Initial mode(s). */
  mode?: string[];
  /** Pipeline functions for content, properties, or mode. */
  pipes?: { [key: string]: Pipe[] };
  /** Side-effect callbacks for content, properties, or mode. */
  effects?: { [key: string]: Effect[] };
  /** Child states. */
  children?: ChildrenModule | (StateModule | StateConfig | Selector)[];
}

/**
 * Reactive state tree node managing content, properties, mode variations, and child states.
 */
export interface StateModule extends Selector, Module {
  /** Parent state in the hierarchical tree. */
  parent?: StateModule;
  /** Active mode names. */
  mode?: string[];
  /** State content data. */
  content?: StateContent;
  /** Component properties. */
  properties?: StateProperties;
  /** Children module managing child states. */
  children?: ChildrenModule;
  /** Bound ComponentModule instance if this state is attached to a component. */
  readonly componentInstance?: ComponentModule;

  /**
   * Sets the active mode(s) for this state.
   * @param mode - Mode string, array of modes, or mode map.
   * @returns Array of currently active modes.
   */
  setMode?: (mode: { [key: string]: string[] } | string[] | string) => string[];

  /**
   * Sets or merges state content and optionally updates the DOM.
   * @param content - Content string/number/boolean, key-value map, or HTMLElement.
   * @param options - Setter options controlling view updates and forceUpdate.
   * @returns The updated StateContent.
   */
  setContent?: (content?: StateContent | HTMLElement, options?: SetterOptions) => StateContent;

  /**
   * Sets or merges state properties and triggers property effects.
   * @param properties - Properties map or HTMLElement.
   * @param options - Setter options.
   * @returns The updated StateProperties.
   */
  setProperties?: (properties?: StateProperties | HTMLElement, options?: SetterOptions) => StateProperties;

  /**
   * Binds a ComponentModule instance or identifier to this state.
   * @param component - Component instance or string identifier.
   */
  setComponent?: (component?: ComponentModule | string | undefined) => void;

  /**
   * Sets or appends child states.
   * @param states - Array of states, configs, selectors, or a ChildrenModule.
   * @param options - Options for the children module.
   * @returns The ChildrenModule instance.
   */
  setChildren?: (
    states?: ChildrenModule | (StateModule | StateConfig | Selector)[],
    options?: StateOptions,
  ) => ChildrenModule;

  /**
   * Traverses the state tree to find a state by name.
   * @param name - State name identifier.
   * @param options - Traversal direction ('up', 'down', or 'bi').
   * @returns The found StateModule or undefined.
   */
  getState?: (name: string | symbol, options?: { direction: 'up' | 'down' | 'bi' }) => StateModule | undefined;

  /** Detaches and destroys the associated component instance, reverting state to an unrendered state. */
  detachComponent?: () => void;
}

/**
 * Options used to configure a StateModule instance.
 */
export interface StateOptions extends BaseModuleOptions {
  /** Parent state reference. */
  parentState?: StateModule;
  /** Available modes and mode sets. */
  modes?: { [key: string]: string[] } | string[];
  /** Placeholder DOM element. */
  placeholder?: HTMLElement;
  /** Root element for the component. */
  rootElement?: HTMLElement;
  /** Whether this state is a virtual state without DOM representation. */
  virtualElements?: boolean;
  /** Whether the state represents a newly created element. */
  newElement?: boolean;
}

// ============================================================================
// Children Types
// ============================================================================

/**
 * Module managing collections of child states, maintaining both component states and virtual states.
 */
export interface ChildrenModule {
  /** Array of all managed child states (component states followed by virtual states). */
  states?: StateModule[];

  /**
   * Sets the DOM scope for the children elements module.
   * @param scope - Root scope element.
   */
  setElements?: (scope?: HTMLElement) => void;

  /**
   * Finds a child state by its name identifier.
   * @param name - Name to look up.
   * @returns Matched StateModule or undefined.
   */
  findChild?: (name: string | symbol | undefined) => StateModule | undefined;

  /**
   * Inserts a child state into the collection and updates the DOM if applicable.
   * @param state - State module, config, or selector to insert.
   * @param position - Position index ('FIRST', 'LAST', or number).
   * @param options - Insertion options.
   * @returns Promise resolving to the inserted StateModule.
   */
  insert?: (
    state: StateModule | StateConfig | Selector,
    position?: Index,
    options?: ModuleOptions,
  ) => Promise<StateModule | undefined>;

  /**
   * Removes a child state by index or selector.
   * @param target - Target index or selector.
   * @param options - Removal options.
   * @returns The removed StateModule or undefined.
   */
  remove?: (target?: Index | Selector, options?: StateOptions) => StateModule | undefined;

  /**
   * Moves a child state to a new position in the collection and DOM.
   * @param target - Target index or selector to move.
   * @param position - New destination index ('FIRST', 'LAST', 'NEXT', 'PREV', or number).
   * @param options - Move options.
   * @returns The moved StateModule or undefined.
   */
  move?: (
    target?: Index | Selector,
    position?: Index | 'NEXT' | 'PREV',
    options?: StateOptions,
  ) => StateModule | undefined;
}

// ============================================================================
// Mode Types
// ============================================================================

/**
 * Module managing component variations and modes (themes, sizes, visual states).
 */
export interface ModeModule extends Module {
  /** Array of currently active modes across all sets. */
  current?: string[];
  /** Map of mode sets and their available mode names. */
  modes?: { [key: string]: string[] };

  /**
   * Sets active mode(s).
   * @param current - Mode name or array of mode names.
   * @returns Array of currently active modes.
   */
  setCurrent?: (current: string | string[] | undefined) => string[];

  /**
   * Defines the available modes and mode sets.
   * @param modes - Object mapping set names to mode lists, or an array for the default set.
   * @returns The updated modes map.
   */
  setModes?: (modes: { [key: string]: string[] } | string[] | undefined) => { [key: string]: string[] };
}

// ============================================================================
// Router Types
// ============================================================================

/** Standard URL segment keys recognized by the router and meta modules. */
export type URLSegmentKey = 'pathname' | 'hostname' | 'search' | 'protocol' | 'port';

/**
 * Standardized URL segments object representing the current route and location state.
 */
export type URLSegments = {
  [key in URLSegmentKey]?: string;
} & {
  /** Extracted URL pattern parameters. */
  params?: Record<string, string | undefined>;
  /** The matched RouteDefinition, if one matched. */
  matchedRoute?: RouteDefinition;
  /** Route name, component, or pattern string. */
  route?: string;
};

/**
 * Definition of a single route for pattern matching and navigation.
 */
export interface RouteDefinition {
  /** Route pattern string (e.g. '/users/:id') or URLPatternInstance. */
  pattern: string | URLPatternInstance | unknown;
  /** Optional unique route name. */
  name?: string;
  /** Target component name to activate. */
  component?: string;
  /**
   * Optional navigation guard callback. If provided, must return true for the route to match.
   * @param params - Extracted route parameters.
   * @param route - The route definition being tested.
   * @param url - The current URL segments.
   * @returns True if navigation to this route is permitted.
   */
  canMatch?: (params: Record<string, string | undefined>, route: RouteDefinition, url: URLSegments) => boolean;
  /** Optional arbitrary metadata associated with this route. */
  meta?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Match result when a URL successfully matches a registered RouteDefinition.
 */
export interface RouteMatch {
  /** The matched route definition. */
  route: RouteDefinition;
  /** Extracted parameters from the URL pattern. */
  params: Record<string, string | undefined>;
  /** The full URL segments object. */
  url: URLSegments;
}

/**
 * Module managing client-side routing, browser history, route matching, and navigation events.
 */
export interface RouterModule extends Module {
  /** Root scope element for route link listeners. */
  scope?: HTMLElement;
  /** The URL-derived route properties. Replaces the old `state` property. */
  stateProperties?: URLSegments;
  /** List of registered routes in evaluation order. */
  readonly routes?: RouteDefinition[];

  /**
   * Registers a new route definition.
   * @param route - Route definition object or pattern string.
   * @returns The registered RouteDefinition.
   */
  addRoute?: (route: RouteDefinition | string) => RouteDefinition;

  /**
   * Removes a registered route by its pattern or name.
   * @param patternOrName - Route pattern or name to remove.
   * @returns True if a route was found and removed.
   */
  removeRoute?: (patternOrName: string) => boolean;

  /**
   * Tests a URL against registered routes and returns the match result without changing state.
   * @param url - URL string or URLSegments to test.
   * @returns Match result or null if no route matched.
   */
  match?: (url?: string | URLSegments) => RouteMatch | null;

  /** Cleans up all link click and popstate listeners registered by the router. */
  unLink: () => void;
}

/**
 * Configuration options for the Router module.
 */
export interface RouterOptions extends BaseModuleOptions {
  /** Parent state module where router state will be registered. */
  parentState?: StateModule;
  /** Initial routes to register. */
  routes?: (RouteDefinition | string)[];
}

// ============================================================================
// Meta Types
// ============================================================================

/**
 * Module managing document metadata, head elements, OpenGraph/Twitter tags, and browser URL history.
 */
export interface MetaModule {
  /** Document head element. */
  head?: HTMLHeadElement | undefined;

  /**
   * Retrieves the current URL segments from window.location.
   * @returns The current URLSegments.
   */
  getCurrentURL?: () => URLSegments;

  /**
   * Retrieves a specific segment or derived string ('origin', 'href') from a URL.
   * @param key - Segment key or 'origin' | 'href'.
   * @param url - Optional URLSegments object to inspect.
   * @returns Segment value string or undefined.
   */
  getURLSegment?: (key: URLSegmentKey | 'origin' | 'href', url?: URLSegments) => string | undefined;

  /**
   * Updates browser history via history.pushState with the given URL segments.
   * @param url - New URL segments.
   */
  updateCurrentURL?: (url: URLSegments) => void;

  /**
   * Appends meta, link, or script elements to the document head.
   * @param elements - Single element or array of elements.
   */
  addMetaElements?: (elements: Element | Element[]) => void;

  /**
   * Updates or creates document metadata tags based on key-value pairs (title, description, image, etc.).
   * @param data - Key-value metadata object.
   */
  updateMetaData?: (data: { [key: string]: string | number | boolean }) => void;

  /**
   * Extracts metadata from a given HTML element or fragment.
   * @param html - HTML element to inspect.
   * @returns Key-value map of extracted metadata.
   */
  extractMetaData(html: HTMLElement): { [key: string]: string };

  /**
   * Determines whether an HTML fragment represents a root page.
   * @param html - HTML element to inspect.
   * @returns True if the fragment is a root page.
   */
  isRootPage?: (html: HTMLElement) => boolean;
}
