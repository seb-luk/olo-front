# olo-front

> **Object-oriented, buildless-ready micro-framework for the modern Light DOM — with zero runtime dependencies.**

`olo-front` bridges the gap between raw vanilla JavaScript and heavy SPA frameworks. It provides reactive state management, modular components, DOM querying, UI state machines, and routing using **100% native Web APIs**.

> [!NOTE]
> This repository is a public distribution mirror of `olo-front`. Core development takes place in a private monorepo; commits here correspond to tagged releases and verified syncs.

[![Zero Dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](#features)
[![Module Format](https://img.shields.io/badge/format-ESM%20%7C%20UMD-blue.svg)](#installation--delivery)
[![Testing](https://img.shields.io/badge/tests-Vitest%20%2B%20happy--dom-purple.svg)](#testing--development)

---

## Highlights & Features

- 🌿 **Zero Runtime Dependencies**: Pure ECMAScript and native DOM APIs. No polyfill bloat.
- ⚡ **Buildless Ready**: Native ES modules with `.js` imports. Run directly in modern browsers without Webpack, Vite, or node_modules.
- 🎯 **Declarative Light DOM Sync**: Avoids Shadow DOM overhead. State `content` properties automatically synchronize to matching `data-olo-name` elements without manual DOM queries or virtual DOM diffing.
- 🔄 **Explicit Reactivity (Pipes & Effects)**: No hidden proxies or dirty checking. Transform inputs with **Pipes** and apply updates with **Effects**.
- 🧹 **Automatic Teardown via `AbortController`**: Event listeners bound through `Events` are aborted automatically on `destroy()`, preventing memory leaks.
- 🚦 **UI Finite State Machine (`Mode`)**: Reflects UI states (e.g. `loading`, `disabled`, `dark`) straight to `data-olo-mode` for clean, classless CSS styling.
- 📦 **Dual Output**: ESM (`index.js`) for bundlers, native ESM for browsers, and UMD (`index.umd.cjs`) for `<script>` tags.

---

## 60-Second Quickstart

Copy and paste this snippet into an `index.html` file and serve it with any HTTP server (or your local IDE live server):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>olo-front Quickstart</title>
  <style>
    [data-olo-component="counter"] { font-family: system-ui, sans-serif; padding: 1.5rem; }
    button { padding: 0.5rem 1rem; cursor: pointer; }
  </style>
</head>
<body>
  <!-- Light DOM Component Structure -->
  <section data-olo-component="counter">
    <h2>Counter</h2>
    <p>Current count: <strong data-olo-name="countDisplay">0</strong></p>
    <p>Doubled: <strong data-olo-name="doubleDisplay">0</strong></p>
    <button data-olo-name="incrementBtn">+1</button>
  </section>

  <!-- Import directly via native ESM from CDN (or from 'olo-front' if using a bundler) -->
  <script type="module">
    import { Component } from 'https://esm.sh/olo-front';

    class CounterComponent extends Component {
      constructor(rootElement) {
        super(
          {
            name: 'counter',
            component: 'counter',
            content: { countDisplay: 0, doubleDisplay: 0 },
          },
          { rootElement }
        );

        // Add a Pipe to automatically compute double the count before state commit
        this.state.addPipe('content', (content) => ({
          ...content,
          doubleDisplay: Number(content?.countDisplay ?? 0) * 2,
        }));

        // Listen to events with automatic teardown on destroy
        this.on('incrementBtn', 'click', () => {
          const current = Number(this.state.content?.countDisplay ?? 0);
          this.state.setContent({ countDisplay: current + 1 });
        });
      }
    }

    // Bootstrap
    const root = document.querySelector('[data-olo-component="counter"]');
    if (root) new CounterComponent(root);
  </script>
</body>
</html>
```

---

## Installation & Delivery

### 1. NPM Package (Bundlers & Modern Toolchains)
```bash
npm install olo-front
```
```javascript
import { Component, State, Elements, Events } from 'olo-front';
```

### 2. Native Browser ESM (Buildless CDN)
```html
<script type="module">
  import { Component, State, Elements, Events } from 'https://esm.sh/olo-front';
  // Or via jsDelivr:
  // import { Component, State, Elements, Events } from 'https://cdn.jsdelivr.net/npm/olo-front/+esm';
</script>
```

### 3. Direct Script Tag (UMD CDN)
```html
<script src="https://cdn.jsdelivr.net/npm/olo-front/dist/index.umd.cjs"></script>
<!-- Or via unpkg: -->
<!-- <script src="https://unpkg.com/olo-front/dist/index.umd.cjs"></script> -->
<script>
  const { Component, State, Elements, Events } = window.OloFront;
</script>
```

---

## Module Ecosystem

Every module in `olo-front` is designed to be composable. Several primitives can be used **standalone** in vanilla JS or paired with HTMX and Alpine.js:

| Module | Purpose | Standalone Value | Docs |
| :--- | :--- | :---: | :--- |
| **`Module`** | Base reactivity primitive with **Pipes** and **Effects** | ⭐⭐⭐ | [Guide](./docs/modules/state-and-reactivity.md) |
| **`State`** | Hierarchical state node with content slots, properties, and tree queries (`getState`) | ⭐⭐ | [Guide](./docs/modules/state-and-reactivity.md) |
| **`Children`** | List management and state tree reconciliation | ⭐⭐ | [Guide](./docs/modules/state-and-reactivity.md) |
| **`Component`** | Orchestrator wiring State, Elements, Events, and lifecycle hooks (`onReady`, `destroy`) | ⭐⭐⭐ | [Guide](./docs/modules/component.md) |
| **`ComponentBuilder`** | Dynamic template fetching with exponential backoff and lazy component loading | ⭐⭐ | [Guide](./docs/modules/component.md) |
| **`Elements`** | Scoped DOM queries, `<template>` cloning, placeholder swapping, safe content writing | ⭐⭐⭐ | [Guide](./docs/modules/dom-and-templates.md) |
| **`View`** | Lightweight scoped element querying by `data-olo-*` selectors | ⭐⭐⭐ | [Guide](./docs/modules/dom-and-templates.md) |
| **`Mode`** | Finite State Machine synchronizing UI states to `data-olo-mode` attribute | ⭐⭐⭐ | [Guide](./docs/modules/mode-fsm.md) |
| **`Events`** | Scoped event manager with automatic `AbortController` teardown | ⭐⭐⭐ | [Guide](./docs/modules/events.md) |
| **`Router`** | Client-side routing powered by the standard `URLPattern` API and link interception | ⭐⭐ | [Guide](./docs/modules/routing-and-meta.md) |
| **`Meta`** | Dynamic document `<head>` manager (title, description, OpenGraph tags) | ⭐⭐ | [Guide](./docs/modules/routing-and-meta.md) |

---

## HTML Conventions Cheat Sheet

`olo-front` uses standard HTML attributes for deterministic scoping:

| Attribute | Role | Example |
| :--- | :--- | :--- |
| `data-olo-component` | Component scope root or template identifier | `<div data-olo-component="user-profile">` |
| `data-olo-name` | Identifies a named queryable element inside a scope | `<button data-olo-name="saveBtn">Save</button>` |
| `data-olo-mode` | Reflects active UI states (space-separated) | `<div data-olo-mode="loading dark">` |
| `data-olo-view` | Template or variant name | `<template data-olo-view="compact">` |
| `data-olo-static` | Placeholder marker for pre-rendered SSR HTML | `<div data-olo-static="post-feed">` |
| `data-olo-dynamic` | Placeholder marker for dynamic list insertions | `<ul data-olo-dynamic="todo-items">` |

---

## Documentation Index

Explore the comprehensive guides in the [`docs/`](./docs/) directory:

- 🚀 [**Getting Started Guide**](./docs/getting-started.md) — Step-by-step tutorial from raw HTML to interactive UI.
- 💡 [**Core Concepts & Philosophy**](./docs/core-concepts.md) — Deep dive into Light DOM, Pipes & Effects, and memory management.
- 🧩 [**Standalone Module Usage**](./docs/standalone-usage.md) — Using `Events`, `Mode`, and `Module` in Vanilla JS, HTMX, or server-rendered apps.
- 🍳 [**Recipes & Practical Patterns**](./docs/recipes.md) — Dynamic lists, form validation pipes, async loading states, and SSR hydration.

---

## Testing & Development

Unit tests run in an isolated DOM environment via [Vitest](https://vitest.dev/) and `happy-dom`:

```bash
# Run all tests with coverage
npm test -- --coverage

# Run in watch mode
npm run test:watch

# Build package outputs (ESM + UMD)
npm run build
```

---

## License

MIT © [Sebastian Luksic](https://github.com/seb-luk)
