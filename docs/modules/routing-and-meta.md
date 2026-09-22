# Routing & Meta Management

`olo-front` provides a client-side routing solution built directly on modern browser standards (the standard `URLPattern` API and the HTML5 History API) paired with dynamic document `<head>` management via `Meta`.

---

## 1. The `Router` Module

The `Router` handles URL matching, route parameters, navigation guards (`canMatch`), and automatic interception of internal `<a>` clicks.

```javascript
import { Router, Meta, Events, State } from 'olo-front';

const router = new Router(
  {
    routes: [
      { pattern: '/', name: 'home' },
      { pattern: '/users/:id', name: 'user-detail' },
      {
        pattern: '/admin',
        name: 'admin',
        canMatch: () => authStore.isAuthenticated(), // Navigation guard
      },
    ],
  },
  { Meta, Events, State }
);
```

### Route Pattern Syntax
`Router` uses the web standard `URLPattern` specification:
- Named parameters: `/posts/:category/:slug`
- Wildcards: `/docs/*`
- Optional segments: `/items{/:id}?`

---

## 2. Navigating & Intercepting Links

### Declarative Links in HTML
Any `<a>` tag inside the router's scope is automatically intercepted if it points to the same origin:

```html
<!-- Clicks are intercepted; calls pushState without page reload -->
<a href="/users/42">View User 42</a>
```

### Programmatic Navigation
You can change routes by updating the router's state properties or calling `setState()`:

```javascript
router.setState({
  pathname: '/users/99',
  search: '?tab=settings',
});
```

---

## 3. Dynamic Head Management with `Meta`

The `Meta` module updates `<title>` and `<meta>` tags in the document `<head>` dynamically:

```javascript
import { Meta } from 'olo-front';

const meta = new Meta();

// Updates <title> and meta description
meta.updateMetaData({
  title: 'User Profile - Ada Lovelace',
  description: 'View Ada Lovelace profile and contributions',
  'og:title': 'Ada Lovelace on Olo',
});
```

When connected to `Router`, changes in the router's `state.content` automatically trigger `ContentMetaEffect`, ensuring search engines, browser tabs, and social graph scrapers always see the correct title and metadata.

---

## 4. Inspecting Current Route & Params

The current route parameters and URL segments are kept in reactive state:

```javascript
console.log(router.stateProperties.pathname); // "/users/42"
console.log(router.stateProperties.params);   // { id: "42" }
console.log(router.stateProperties.search);   // "?tab=settings"
```

