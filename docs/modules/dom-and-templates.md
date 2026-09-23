# DOM & Templating (`View` & `Elements`)

`olo-front` avoids the memory and computation overhead of a Virtual DOM. Instead, it offers two high-performance DOM abstractions:
- **`View`**: Low-level scoped querying, boundary enforcement, and selector compilation.
- **`Elements`**: Extends `View` with template cloning, placeholder swapping, safe property/attribute writing, and list insertion.

---

## 1. Scoped Querying with `View`

The `View` class restricts all queries to a specific root element (`scope`). This prevents unwanted collisions when multiple identical components exist on the same page.

```javascript
import { View } from 'olo-front';

const cardElement = document.querySelector('#card-1');
const view = new View(cardElement);

// Queries within #card-1 using data-olo-name
const titleEl = view.get({ name: 'title' });

// Searches for multiple matching elements
const buttons = view.search([{ name: 'action-btn' }]);
```

### Selector Object
Selectors can match on any combination of `olo` metadata:
```javascript
view.get({
  name: 'submitBtn',        // [data-olo-name="submitBtn"]
  component: 'signup-form', // [data-olo-component="signup-form"]
  view: 'compact',          // [data-olo-view="compact"]
});
```

---

## 2. Advanced DOM Mutations with `Elements`

The `Elements` class inherits from `View` and acts as the workhorse for component rendering:

```javascript
import { Elements } from 'olo-front';

const elements = new Elements(document.querySelector('#app'));
```

### Writing Content & Attributes: `update()`
`Elements.update()` safely writes text content and attributes to DOM nodes.

```javascript
// Writes to elements matching data-olo-name="username" and data-olo-name="avatar"
elements.update(
  { name: 'userCard' },
  {
    username: 'Ada Lovelace',          // updates textContent of [data-olo-name="username"]
    'avatar#src': '/assets/ada.png',   // updates "src" attribute of [data-olo-name="avatar"]
    'link#href': 'https://example.com',// updates "href" attribute of [data-olo-name="link"]
  }
);
```

> [!NOTE]
> `olo-front` includes built-in XSS security: assigning inline event handlers (`onclick`) or dangerous URL schemes (`javascript:`, `data:text/html`) is automatically blocked and logged with a warning.

---

## 3. Working with Native `<template>` Elements

`olo-front` uses native `<template>` tags for templating:

```html
<!-- Define a reusable component template in HTML -->
<template data-olo-component="user-card" data-olo-view="default">
  <article data-olo-component="user-card" class="card">
    <img data-olo-name="avatar" alt="Avatar" />
    <h3 data-olo-name="username">Anonymous</h3>
    <p data-olo-name="bio"></p>
  </article>
</template>
```

### Compiling a View
```javascript
const template = document.querySelector('template[data-olo-component="user-card"]');
const clonedNode = elements.compileView(
  { component: 'user-card', view: 'default' },
  { template }
);
```

---

## 4. Placeholders & Dynamic Hydration

When rendering dynamic lists or lazy components, HTML can declare placeholders using:
- `data-olo-static="<name>"`: Static content placeholders (SSR pre-renders).
- `data-olo-dynamic="<name>"`: Dynamic list slots.

### Replacing Elements & Placeholders
```javascript
// Replaces an existing element or placeholder with the new view element
elements.replace(
  { name: 'feed-placeholder' },
  renderedFeedElement
);
```

When all elements in a dynamic list are removed, `Elements.remove(selector, remainingItems)` automatically restores the cached placeholder element so the list can cleanly re-hydrate later.

---

## 5. Slot Content Extraction: `extractContent`

When hydrating server-rendered HTML into an `olo-front` component, you often want to extract existing DOM text into `state.content`:

```javascript
import { COMPONENT_CONTENT_SLOT_VALUE } from 'olo-front';

// Define expected slots with slot markers
const initialContent = {
  title: COMPONENT_CONTENT_SLOT_VALUE,
  description: COMPONENT_CONTENT_SLOT_VALUE,
};

// Extracts current text inside [data-olo-name="title"] and [data-olo-name="description"]
const extracted = elements.extractContent({ component: 'article' }, initialContent);
// extracted => { title: 'Server Rendered Title', description: 'Server text...' }
```

