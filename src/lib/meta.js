/**
 * @fileoverview Meta module for managing document metadata (title, meta tags, OpenGraph, Twitter cards, URL/history).
 * @module meta
 */

// @ts-check

/**
 * @import { MetaModule, URLSegments, URLSegmentKey } from './modules.d.ts';
 */

/**
 * Manages document metadata, including the title, meta tags, and browser history.
 * Operates directly on the document head and does not depend on scoped component views.
 * @implements {MetaModule}
 */
export class Meta {
  /**
   * Creates an instance of Meta.
   * @param {HTMLHeadElement | null} [head] - The head element to operate on. Defaults to `document.querySelector('head')`.
   */
  constructor(head = typeof document !== 'undefined' ? document.querySelector('head') : undefined) {
    this.head = head ?? undefined;
  }

  /**
   * The head element of the document.
   * @type {HTMLHeadElement | undefined}
   */
  head;

  /**
   * A list of HTTP headers that are supported for meta tags.
   * @type {string[]}
   */
  static #HTTP_HEADERS = ['content-language'];

  /**
   * A mapping of standardized meta keys to their corresponding HTML tag selectors.
   * This allows for a unified way to update different types of meta tags.
   * @type {Object<string, string[]>}
   */
  static #KEY_TAG_MAP = {
    title: ['title', 'meta og:title', 'meta twitter:title'],
    type: ['meta og:type'],
    description: ['meta description', 'meta og:description', 'meta twitter:description'],
    keywords: ['meta keywords'],
    author: ['meta author'],
    rating: ['meta rating'],
    image: ['meta og:image', 'meta twitter:image'],
    twitterHandle: ['meta twitter:site'],
    canonicalUrl: ['link canonical', 'meta og:url'],
    language: ['meta content-language'],
  }

  /**
   * Retrieves the current URL segments (pathname, hostname, etc.) from the window location.
   * @returns {URLSegments} An object containing the current URL segments.
   */
  getCurrentURL() {
    const { pathname, hostname, search, protocol, port } = window.location;
    return { pathname, hostname, search, protocol, port };
  }

  /**
   * Retrieves a specific segment or a derived value from a URL.
   * @param {URLSegmentKey | 'origin' | 'href'} key - The key of the URL segment to retrieve.
   * @param {URLSegments} [url] - The URL segments to use. Defaults to the current URL.
   * @returns {string | undefined} The value of the specified URL segment or derived value.
   */
  getURLSegment(key, url) {
    const current = this.getCurrentURL();
    const resolved = url ? { ...current, ...url } : current;
    if (key === 'origin') {
      return `${resolved.protocol}//${resolved.hostname}${resolved.port ? `:${resolved.port}` : ''}`;
    }
    if (key === 'href') {
      return `${resolved.protocol}//${resolved.hostname}${resolved.port ? `:${resolved.port}` : ''}${resolved.pathname ?? ''}${resolved.search ?? ''}`;
    }

    return resolved[key];
  }

  /**
   * Updates the current URL in the browser's history using the History API.
   * @param {URLSegments} url - The URL segments to update the history with.
   * @returns {void}
   */
  updateCurrentURL(url) {
    const href = this.getURLSegment('href', url);

    if (href && href !== this.getURLSegment('href')) {
      try {
        const targetURL = new URL(href, typeof window !== 'undefined' ? window.location.origin : undefined);
        if (typeof window !== 'undefined' && targetURL.origin !== window.location.origin) {
          window.location.assign(href);
          return;
        }
        history.pushState(null, '', targetURL.pathname + targetURL.search + targetURL.hash);
      } catch (err) {
        console.error('Failed to update URL history:', err);
      }
    }
  }

  /**
   * Adds one or more meta elements to the document's head.
   * @param {Element | Element[]} elements - The element or elements to add.
   * @returns {void}
   */
  addMetaElements(elements) {
    const tags = Array.isArray(elements) ? elements : [elements];

    tags.forEach((tag) => {
      this.head?.appendChild(tag);
    });
  }

  /**
   * Updates the document's meta data (title, meta tags) based on a content object.
   * It creates or updates tags as needed.
   * @param {Object<string, string | number | boolean>} content - A key-value object with the meta data to update.
   * @returns {void}
   */
  updateMetaData(content) {
    for (const key in Meta.#KEY_TAG_MAP) {

        const tags = Meta.#KEY_TAG_MAP[key];

        tags.forEach((selector) => {
          const [tag, attr] = selector.split(' ');

          let tagELement = this.head?.querySelector(`${tag}${attr ? `[name="${attr}"]` : ''}`)
            ?? this.head?.querySelector(`${tag}${attr ? `[property="${attr}"]` : ''}`)
            ?? this.head?.querySelector(`${tag}${attr ? `[http-equiv="${attr}"]` : ''}`);

          const tagExists = !!tagELement;

          if (content[key] !== undefined) {
             tagELement = tagELement || document.createElement(tag);

            switch (tag) {
              case 'title':
                tagELement.textContent = `${content[key]}`;
                break;
              case 'link':
                tagELement.setAttribute('rel', attr);
                tagELement.setAttribute('href', `${content[key]}`);
                break;
              case 'meta':
                if (Meta.#HTTP_HEADERS.includes(attr)) {
                  tagELement.setAttribute('http-equiv', attr);
                } else {
                  tagELement.setAttribute('name', attr);
                  tagELement.setAttribute('property', attr);
                }
                tagELement.setAttribute('content', `${content[key]}`);
                break;
            }

            if (!tagExists) {
              this.addMetaElements(tagELement);
            }
          } else if (tagELement) {
            tagELement.remove();
          }
        });
    }
  }

  /**
   * Extracts meta data from a given HTML element (e.g., a document fragment).
   * Uses native DOM queries — no dependency on View or OLO selectors.
   * @param {HTMLElement} html - The HTML element to extract meta data from.
   * @returns {{ [key: string]: string }} A key-value object of the extracted meta data.
   */
  extractMetaData(html) {
    const title = html?.querySelector?.('title');
    const metaTags = Array.from(html?.querySelectorAll?.('meta, link') ?? []);

    /**
     * @type {{ [key: string]: string }}
     */
    const metaData = {};

    if (title?.textContent) {
      metaData.title = title.textContent;
    }

    metaTags.forEach((metaTag) => {
      const property = metaTag.getAttribute('name') ?? metaTag.getAttribute('property') ?? metaTag.getAttribute('http-equiv') ?? metaTag.getAttribute('rel');

      if (property) {
        const propKey = Object.keys(Meta.#KEY_TAG_MAP).find(key => Meta.#KEY_TAG_MAP[key].includes(`${metaTag.tagName.toLowerCase()} ${property}`));

        if (propKey) {
          const content = metaTag.getAttribute('content') ?? metaTag.getAttribute('href');

          if (content) {
            metaData[propKey] = content;
          }
        }
      }
    });

    return metaData;
  }

  /**
   * Checks if a given HTML element represents the root page by looking for a specific meta tag.
   * Uses native querySelector — no dependency on View or OLO selectors.
   * @param {HTMLElement} html - The HTML element to check.
   * @returns {boolean} True if the element is identified as the root page, otherwise false.
   */
  isRootPage(html) {
    return !!html?.querySelector?.('meta[name="root"][content="true"]');
  }
}
