import 'urlpattern-polyfill';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Elements } from './elements.js';
import { Events } from './events.js';
import { Meta } from './meta.js';
import { Router } from './router.js';
import { State } from './state.js';
import { View } from './view.js';

describe('Router', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize router with state, meta, and events', () => {
    const scope = document.createElement('div');
    const router = new Router({ scope }, { Meta, Events, State, Elements, View });

    expect(router.meta).toBeDefined();
    expect(router.events).toBeDefined();
    expect(router.scope).toBe(scope);
    expect(router.stateProperties).toBeDefined();
  });

  it('should handle stateProperties getter and setter', () => {
    const router = new Router({}, { Meta, Events, State });
    const pushStateSpy = vi.spyOn(window.history, 'pushState');

    router.stateProperties = { pathname: '/test' };
    expect(router.stateProperties.pathname).toBe('/test');

    // PropertiesUrlEffect should trigger meta to update URL
    expect(pushStateSpy).toHaveBeenCalled();
  });

  it('should update scope and add link listeners', () => {
    const router = new Router({}, { Meta, Events, State, View, Elements });
    const scope = document.createElement('div');
    const link = document.createElement('a');
    link.dataset.oloRoute = '/foo';
    scope.appendChild(link);

    document.body.appendChild(scope);

    router.scope = scope; // trigger setter

    const setStateSpy = vi.spyOn(router, 'setState');
    link.click();

    expect(setStateSpy).toHaveBeenCalled();
    const callArg = setStateSpy.mock.calls[0][0];
    expect(callArg.pathname).toBe('/foo');

    document.body.removeChild(scope);
  });

  it('should not intercept external links', () => {
    const router = new Router({}, { Meta, Events, State, View, Elements });
    const scope = document.createElement('div');
    const link = document.createElement('a');
    link.dataset.oloRoute = 'https://google.com';
    scope.appendChild(link);
    document.body.appendChild(scope);

    router.scope = scope;
    const setStateSpy = vi.spyOn(router, 'setState');

    const clickEvent = new Event('click', { cancelable: true });
    link.dispatchEvent(clickEvent);

    expect(setStateSpy).not.toHaveBeenCalled();
    expect(clickEvent.defaultPrevented).toBe(false); // External navigation allowed

    document.body.removeChild(scope);
  });

  it('should handle unparseable route gracefully', () => {
    const router = new Router({}, { Meta, Events, State, View, Elements });
    const scope = document.createElement('div');
    const link = document.createElement('a');
    link.dataset.oloRoute = 'http://:80';
    scope.appendChild(link);
    document.body.appendChild(scope);

    router.scope = scope;
    const clickEvent = new Event('click', { cancelable: true });
    link.dispatchEvent(clickEvent);

    document.body.removeChild(scope);
  });

  it('should unLink and stop all events', () => {
    const router = new Router({}, { Meta, Events, State });
    const stopAllSpy = vi.spyOn(router.events, 'stopAll');
    router.unLink();
    expect(stopAllSpy).toHaveBeenCalled();
  });

  it('should listen to popstate on window', () => {
    const router = new Router({}, { Meta, Events, State });
    const setStateSpy = vi.spyOn(router, 'setState');

    window.dispatchEvent(new Event('popstate'));
    expect(setStateSpy).toHaveBeenCalled();
  });

  it('should handle ContentMetaEffect and PropertiesUrlEffect via manual trigger', () => {
    let mockStateInstance;
    class MockState {
      constructor() {
        this.addEffect = vi.fn((key, effect) => {
          if (key === 'content') this.contentEffect = effect;
          if (key === 'properties') this.propertiesEffect = effect;
        });
        mockStateInstance = this;
      }
    }

    const router = new Router({}, { Meta, Events, State: MockState });
    const metaSpy = vi.spyOn(router.meta, 'updateMetaData');
    const updateUrlSpy = vi.spyOn(router.meta, 'updateCurrentURL');

    mockStateInstance.contentEffect({ title: 'New Title' }, { currentModule: router });
    expect(metaSpy).toHaveBeenCalledWith({ title: 'New Title' });

    mockStateInstance.propertiesEffect({ pathname: '/path' }, { currentModule: router });
    expect(updateUrlSpy).toHaveBeenCalledWith({ pathname: '/path' });
  });

  describe('URLPattern & Route Matching', () => {
    it('should extract single and multiple dynamic parameters from pathname', () => {
      const router = new Router(
        {
          routes: [
            { pattern: '/users/:id', name: 'user-detail' },
            { pattern: '/posts/:category/:slug', name: 'post-detail' },
          ],
        },
        { Meta, Events, State },
      );

      router.setState({ pathname: '/users/42' });
      expect(router.stateProperties.params).toEqual({ id: '42' });
      expect(router.stateProperties.route).toBe('user-detail');
      expect(router.stateProperties.matchedRoute?.name).toBe('user-detail');

      router.setState({ pathname: '/posts/tech/modern-web' });
      expect(router.stateProperties.params).toEqual({ category: 'tech', slug: 'modern-web' });
      expect(router.stateProperties.route).toBe('post-detail');
    });

    // LEVEL 1: Native URLPattern regex constraints
    it('Level 1: should resolve collisions between /:order/:id and /:user/:id using regex constraints', () => {
      const router = new Router(
        {
          routes: [
            { pattern: '/:order(orders?)/:id(\\d+)', name: 'orders' },
            { pattern: '/:user(users?)/:id([a-z]+)', name: 'users' },
          ],
        },
        { Meta, Events, State },
      );

      const orderMatch = router.match('/orders/123');
      expect(orderMatch).not.toBeNull();
      expect(orderMatch?.route.name).toBe('orders');
      expect(orderMatch?.params).toEqual({ order: 'orders', id: '123' });

      const userMatch = router.match('/users/alice');
      expect(userMatch).not.toBeNull();
      expect(userMatch?.route.name).toBe('users');
      expect(userMatch?.params).toEqual({ user: 'users', id: 'alice' });
    });

    // LEVEL 2: Registration order (First-Match Wins)
    it('Level 2: should prioritize routes based strictly on registration order (first-match wins)', () => {
      // Scenario A: Static route registered before dynamic route -> static route matches
      const routerWithStaticFirst = new Router(
        {
          routes: [
            { pattern: '/users/new', name: 'user-new' },
            { pattern: '/users/:id', name: 'user-detail' },
          ],
        },
        { Meta, Events, State },
      );

      const matchA = routerWithStaticFirst.match('/users/new');
      expect(matchA?.route.name).toBe('user-new');

      // Scenario B: If dynamic route is registered first, it matches first (pure first-match without magic scoring)
      const routerWithDynamicFirst = new Router(
        {
          routes: [
            { pattern: '/users/:id', name: 'user-detail' },
            { pattern: '/users/new', name: 'user-new' },
          ],
        },
        { Meta, Events, State },
      );

      const matchB = routerWithDynamicFirst.match('/users/new');
      expect(matchB?.route.name).toBe('user-detail');
      expect(matchB?.params).toEqual({ id: 'new' });
    });

    // LEVEL 3: Runtime canMatch guard predicate
    it('Level 3: should resolve collisions using canMatch guard predicate', () => {
      const router = new Router(
        {
          routes: [
            {
              pattern: '/:section/:id',
              name: 'order-route',
              canMatch: (params) => ['order', 'checkout'].includes(params.section ?? ''),
            },
            {
              pattern: '/:section/:id',
              name: 'user-route',
            },
          ],
        },
        { Meta, Events, State },
      );

      const checkoutMatch = router.match('/checkout/500');
      expect(checkoutMatch?.route.name).toBe('order-route');

      const profileMatch = router.match('/profile/500');
      expect(profileMatch?.route.name).toBe('user-route');
    });

    it('should support adding and removing routes dynamically', () => {
      const router = new Router({}, { Meta, Events, State });
      expect(router.routes).toHaveLength(0);

      router.addRoute({ pattern: '/docs/:page', name: 'docs' });
      expect(router.routes).toHaveLength(1);

      const matchBefore = router.match('/docs/getting-started');
      expect(matchBefore?.params.page).toBe('getting-started');

      const removed = router.removeRoute('docs');
      expect(removed).toBe(true);
      expect(router.routes).toHaveLength(0);

      const matchAfter = router.match('/docs/getting-started');
      expect(matchAfter).toBeNull();
    });

    it('should match URLs without mutating state via match()', () => {
      const router = new Router(
        {
          routes: [{ pattern: '/test/:val', name: 'test-route' }],
        },
        { Meta, Events, State },
      );

      const result = router.match('/test/hello');
      expect(result?.params.val).toBe('hello');
      expect(router.stateProperties.params).toEqual({});
    });

    it('should handle routes without matches gracefully', () => {
      const router = new Router(
        {
          routes: [{ pattern: '/known', name: 'known' }],
        },
        { Meta, Events, State },
      );

      router.setState({ pathname: '/unknown' });
      expect(router.stateProperties.params).toEqual({});
      expect(router.stateProperties.route).toBeUndefined();
      expect(router.stateProperties.matchedRoute).toBeUndefined();
    });

    it('should support injecting URLPattern via dependencies.polyfills', () => {
      const mockExec = vi.fn().mockReturnValue({ pathname: { groups: { id: 'mocked-id' } } });
      class MockURLPattern {
        exec = mockExec;
      }

      const router = new Router(
        {
          routes: [{ pattern: '/mock/:id', name: 'mock' }],
        },
        {
          Meta,
          Events,
          State,
          polyfills: {
            URLPattern: MockURLPattern,
          },
        },
      );

      const match = router.match('/mock/123');
      expect(mockExec).toHaveBeenCalled();
      expect(match?.params.id).toBe('mocked-id');
    });
  });
});
