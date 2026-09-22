/**
 * @fileoverview ComponentBuilder class responsible for dynamically loading, caching,
 * compiling templates, and instantiating components from templates and fragments.
 * @module componentBuilder
 */

// @ts-check

import { COMPONENT_NAME_FALLBACK, DEFAULT_VIEW, ROUTER_STATE_NAME } from './constants.js';

import { Module } from './module.js';

/**
 * @import {
 *  ComponentAssets,
 *  ComponentBuilderModule,
 *  ComponentBuilderOptions,
 *  ComponentClass,
 *  ComponentModule,
 *  ComponentOptions,
 *  ElementsModule,
 *  MetaModule,
 *  ModuleDependencies,
 *  Selector,
 *  StateModule,
 * } from './modules.d.ts'
 */

/**
 * Loads and builds components from templates and remote content.
 * @implements {ComponentBuilderModule}
 */
export class ComponentBuilder extends Module {
  /**
   * @type {Object<string, ComponentAssets>}
   */
  #components = {};

  /**
   * The meta module for managing document head metadata.
   * @type {MetaModule | undefined}
   */
  #meta;

  /**
   * The elements module used for template compilation.
   * @type {ElementsModule | undefined}
   */
  #elements;

  /**
   * Creates an instance of ComponentBuilder.
   *
   * @param {(ComponentAssets | string)[]} components - An array of component assets to be managed by the builder.
   * @param {ComponentBuilderOptions} [options] - Options for the component builder.
   * @param {ModuleDependencies} [dependencies] - Dependencies for the module.
   */
  constructor(components, options = {}, dependencies = {}) {
    super(options, dependencies);

    if (this.dependencies?.Meta) {
      this.#meta = new this.dependencies.Meta(options.scope);
    }

    if (this.dependencies?.Elements) {
      this.#elements = new this.dependencies.Elements(options.scope);
    }

    components.forEach(componentItem => {
      if (typeof componentItem === 'string') {
        this.#components[componentItem] = { component: componentItem };
      } else if (typeof componentItem === 'object') {
        const { component } = componentItem;

        if (component) {
          this.#components[component] = componentItem;
        }
      }
    });

    const head = this.#elements?.get?.({ tag: 'head' });
    if (head) {
      this.#extractStyles(head, undefined, { mount: false });
    }

    const body = this.#elements?.get?.({ tag: 'body' });
    if (body) {
      this.#extractTemplates(body);
    }
  }

  /**
   * Dynamically imports and caches the class for a given component if it has
   * not been loaded yet. The path to the component's module is constructed
   * based on the `componentRootFolder` option.
   *
   * @param {string} component - The name of the component whose class is to be loaded.
   * @param {number} [retries=3] - The maximum number of retry attempts.
   * @param {number} [delay=1000] - The initial delay between retries in milliseconds.
   *
   * @returns {Promise<ComponentClass | undefined>} - A promise that resolves when the class is loaded.
   * @throws {Error} - Throws an error if fetching fails after all retries.
   */
  async #loadClass(component, retries = 3, delay = 1000) {
    const url = `../${this.options?.componentRootFolder ?? 'components'}/${this.#components[component].component}/${this.#components[component].component}.component.js`;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const componentClass = await import(url).then(module => module.default);

        if (componentClass) {
          return componentClass;
        }

        throw new Error(`${component} class could not be importet.`);

      } catch (error) {
        if (attempt < retries) {
          const time = Math.pow(2, attempt) * delay
          await new Promise((resolve) => setTimeout(resolve, time))
        }
      }
    }

    throw new Error(`Failed to fetch ${url} after ${retries} retries`);
  }

  /**
   * Fetches HTML content from a given URL with a specified number of retries.
   * It uses an exponential backoff strategy in case of failures. If all
   * retries are exhausted, it throws the last recorded error.
   *
   * @param {string} url - The url of the html file.
   * @param {number} [retries=3] - The maximum number of retry attempts.
   * @param {number} [delay=1000] - The initial delay between retries in milliseconds.
   *
   * @returns {Promise<HTMLElement>} - A promise that resolves to the fetched HTML element.
   * @throws {Error} - Throws an error if fetching fails after all retries.
   */
  async #loadHTML(url, retries = 3, delay = 1000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(
          url,
          { signal: AbortSignal.timeout(5000) },
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(await response.text(), "text/html");
        return doc.documentElement;

      } catch (error) {
        if (attempt < retries) {
          const time = Math.pow(2, attempt) * delay
          await new Promise((resolve) => setTimeout(resolve, time))
        }
      }
    }
    throw new Error(`Failed to fetch ${url} after ${retries} retries`);
  }

  /**
   * Extracts styles from a component's template and injects them into the document head.
   *
   * @param {HTMLElement} html - The head element of the component template file that contains the stylesheet link or inline styles.
   * @param {string} [component] - The name of the component whose styles are being extracted.
   * @param {object} [options] - Extraction options.
   * @param {boolean} [options.mount=true] - Whether to immediately mount the extracted styles into the document head.
   *
   * @returns {void}
   */
  #extractStyles(html, component, { mount = true } = {}) {
    /**
     * @type {(HTMLLinkElement | HTMLStyleElement)[] | undefined}
     */
    let styles = /**@type {(HTMLLinkElement | HTMLStyleElement)[]}*/ (this.#elements?.search?.(
      [
        { tag: 'link', rel: 'stylesheet', component: '' },
        { tag: 'link', rel: 'stylesheet', view: '' },
        { tag: 'style', component: '' },
        { tag: 'style', view: '' },
      ],
      { scope: html }
    ));

    if (styles && styles.length > 0) {
      if (mount) {
        this.#meta?.addMetaElements?.(styles);
      }

      styles.forEach((style) => {
        const component = style.getAttribute('data-olo-component') ?? COMPONENT_NAME_FALLBACK;

        this.#components[component] = this.#components[component] ?? { component };
        this.#components[component].styles = this.#components[component].styles || [];
        this.#components[component].styles.push(style);
      });
    }

    if (component && !this.#components[component]?.styles) {
      this.#components[component] = this.#components[component] ?? { component };
      this.#components[component].styles = false;
    }
  }

  /**
   * Extracts view templates from a component's template and stores them.
   *
   * @param {HTMLElement} html - The html element of the component template file that contains the stylesheet link or inline styles.
   * @param {string} [component] - The name of the component whose templates are being extracted.
   * @param {string} [view] - The view name to extract. Defaults to the default view.
   *
   * @returns {void}
   */
  #extractTemplates(html, component, view = DEFAULT_VIEW) {
    const templates = /**@type {HTMLTemplateElement[]} */ (this.#elements?.search?.(
      [{ tag: 'template', component: '' }, { tag: 'template', view: '' }],
      { scope: html },
    ));

    templates?.forEach((template) => {
      const component = template.getAttribute('data-olo-component') ?? COMPONENT_NAME_FALLBACK;
      const view = template.getAttribute('data-olo-view') ?? DEFAULT_VIEW;

      this.#components[component] = this.#components[component] ?? { component };
      this.#components[component].views = this.#components[component].views ?? {};

      this.#components[component].views[view] = template;
    });

    if (component && !this.#components[component]?.views?.[view]) {
      this.#components[component] = this.#components[component] ?? { component };
      this.#components[component].views = this.#components[component].views ?? {};

      this.#components[component].views[view] = false;
    }
  }

  /**
   * Extracts component and view declarations from an HTML template or fragment.
   * Scans for child elements with `data-olo-component` attributes.
   *
   * @param {HTMLElement | DocumentFragment} html - The root element or template fragment to scan.
   *
   * @returns {string[]} - An array of formatted identifiers (`component:view`) found in the HTML.
   */
  #extractComponents(html) {
    const scope = /**@type {HTMLElement | undefined} */ ((html instanceof HTMLTemplateElement) ? html.content.firstElementChild ?? undefined : html);

    return /**@type {string[]} */ (this.#elements?.search?.([{ component: ''}], { scope })
      .filter((el) => el.tagName.toLocaleLowerCase() !== 'template')
      .map((el) => `${el.getAttribute('data-olo-component') ?? ''}:${el.getAttribute('data-olo-view') ?? ''}`)
      .filter((name) => name !== ':'));
  }

  /**
   * Loads and caches assets (component class, styles, and template views) for a specified component.
   *
   * @param {string} component - The name of the required component.
   * @param {string} [view] - The required view. Defaults to the default view.
   * @param {object} [options] - Asset loading options.
   * @param {boolean} [options.localFirst=false] - Whether to prioritize locally cached templates over remote fetching.
   *
   * @returns {Promise<void>}
   */
  async #loadAssets(component, view = DEFAULT_VIEW, { localFirst = false } = {}) {
    if (component === COMPONENT_NAME_FALLBACK) {
      return;
    }

    this.#components[component] = this.#components[component] ?? { component }
    const assets = this.#components[component];

    if (assets.class === undefined) {
      try {
        assets.class = this.dependencies?.Components?.[component] ?? await this.#loadClass(component);
      } catch (error) {
        console.error(error);

        assets.class = false;
      }
    }

    if (assets.views?.[DEFAULT_VIEW] !== false
        && assets.views?.[view] === undefined
        && !localFirst
      ) {
      try {
        const html = await this.#loadHTML(`${this.options?.componentRootFolder ?? 'components'}/${component}/${component}.component.html`);

        const head = this.#elements?.get?.({ tag: 'head' }, { scope: html });
        if (head) {
          this.#extractStyles(head, component);
        }

        const body = this.#elements?.get?.({ tag: 'body' }, { scope: html });
        if (body) {
          this.#extractTemplates(body, component, view);
        }
      } catch (error) {
        console.error(error);

        assets.views = assets.views ?? {};
        assets.views[DEFAULT_VIEW] = false;
        assets.views[view] = false;

        assets.styles = false;
      }
    }
  }

  /**
   * Fetches an HTML fragment, extracts its templates and component declarations,
   * and loads all required dependencies. It also updates the router state with
   * any extracted metadata.
   *
   * @param {string} name - The name of the content to load, corresponding to the HTML fragment file.
   * @param {StateModule} [state] - The state module, used to update router state with metadata.
   *
   * @return {Promise<HTMLElement | undefined>} - A promise that resolves to the loaded content as an `HTMLElement`.
   */
  async loadContent(name, state) {
    try {
      const html = await this.#loadHTML(`${this.options?.contentRootFolder ?? 'pages'}/${name}.fragment.html`);

      if (this.#meta?.isRootPage?.(html)) {
        throw new Error(`Content ${name} could not been loaded.`);
      }

      const head = this.#elements?.get?.({ tag: 'head'}, { scope: html }) ?? html;
      this.#extractStyles(head);
      this.#extractTemplates(html);

      const locationState = state?.getState?.(ROUTER_STATE_NAME ?? 'locationHead');
      if (locationState) {
        locationState.content = this.#meta?.extractMetaData?.(head) ?? {};
      }

      this.#extractComponents(html).forEach((identifier) => {
        const [component, view] = identifier.split(':');
        this.#loadAssets(component, view);
      });

      return this.#elements?.get?.({ name }, { scope: html }) ?? undefined;

    } catch (error) {
      console.error(error);
      return undefined;
    }
  }

  /**
   * Resolves and returns the HTMLTemplateElement for a component view from cached assets, local DOM, or remote files.
   *
   * @param {string} component - The name of the required component.
   * @param {string} [view] - The required view. Defaults to the default view.
   * @param {ComponentBuilderOptions} [options] - Options controlling lookup and local-first behavior.
   *
   * @returns {Promise<HTMLTemplateElement | undefined>}
   */
  async getView(component, view = DEFAULT_VIEW, { localFirst = false } = {}) {
    this.#components[component];

    // the component class needs to be available in any case
    await this.#loadAssets(component, view, { localFirst });
    if (!this.#components[component] || !this.#components[component].class) {
      return undefined;
    }

    /**
     * @type {HTMLTemplateElement | undefined}
     */
    let template = undefined;

    if (this.#components[component].views?.[view]) {
      // check of the view is localy available

      template = this.#components[component].views?.[view];
    } else if (localFirst && this.#components[COMPONENT_NAME_FALLBACK]?.views?.[view]) {
      // if localfirst, check of the fallback view is available

      template = this.#components[COMPONENT_NAME_FALLBACK]?.views?.[view];
    } else {
      // loading assets from remote

      await this.#loadAssets(component, view);
      template = this.#components[component].views?.[view] || this.#components[COMPONENT_NAME_FALLBACK]?.views?.[view] || undefined;
    }

    if (template) {
      await Promise.all(this.#extractComponents(template).map(async (id) => {
        const [component, view] = id.split(':');
        await this.#loadAssets(component ? component : COMPONENT_NAME_FALLBACK, view ? view : DEFAULT_VIEW);
      }));
    }

    return template;
  }

  /**
   * Instantiates a component from an already-resolved template.
   * @param {StateModule | undefined} state
   * @param {ComponentOptions} [options] - Build options.
   * @param {ModuleDependencies} [dependencies] - Build dependencies.
   * @returns {Promise<ComponentModule | undefined>}
   */
  async #instantiateComponent(state, options, dependencies) {
    const componentClass = this.#components[state?.component ?? COMPONENT_NAME_FALLBACK]?.class || this.dependencies?.Component;

    if (!componentClass) {
      return undefined;
    }

    return new componentClass(state, { ...this.options, ...options }, { ...this.dependencies, ...dependencies }).initialized;
  }

  /**
   * Builds a component instance without fetching external content. It loads
   * the component's assets and, if successful, returns a new instance of the
   * component class. If the component fails to load, it returns an error
   * component instead.
   *
   * @param {string} component - The name of the component to build.
   * @param {string} [view] - The view of the component to build.
   * @param {StateModule} [state] - The state to be passed to the component.
   * @param {ComponentOptions} [options] - Optional configuration for the component.
   * @param {ModuleDependencies} [dependencies] - Optional dependencies for the component.
   *
   * @returns {Promise<ComponentModule | undefined>} - A promise that resolves to the component instance or an error component.
   */
  async buildFromTemplate(component, view, state, options = {}, dependencies = {}) {
    await this.getView(component, view);
    if (state) {
      state.component = state?.component ?? component;
    }

    return this.#instantiateComponent(state, { ...options, view }, dependencies);
  }

  /**
   * Fetches remote content, injects it into the component template, and builds the component.
   *
   * @param {string} name - The state name.
   * @param {StateModule | undefined} [state] - The parent state.
   * @param {ComponentOptions} [options] - Build options.
   * @param {ModuleDependencies} [dependencies] - Build dependencies.
   * @returns {Promise<ComponentModule | undefined>}
   */
  async buildFromContent(name, state, options = {}, dependencies = {}) {
    const content = options.rootElement ?? await this.loadContent(name, state);

    return this.#instantiateComponent(state, { ...options, rootElement: content }, dependencies);
  }
}
