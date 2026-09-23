# Getting Started with olo-front

Welcome to **olo-front**! This guide walks you through building your first interactive application in under five minutes.

`olo-front` is an object-oriented, buildless-ready micro-framework for the browser. It gives you reactive state management, modular components, DOM abstraction, and clean memory lifecycle management with **zero runtime dependencies**.

---

## 1. Installation & Setup

You can use `olo-front` in any web project using one of three workflows:

### Option A: Bundler / npm (Vite, Webpack, Nx)

```bash
npm install olo-front
```

Then import the needed modules in your JavaScript / TypeScript files:

```javascript
import { Component, State, Elements, Events } from 'olo-front';
```

---

### Option B: Native Browser ESM (Buildless CDN)

Because `olo-front` is written in standard ES modules, you can import it directly from a CDN in any modern browser without a bundler or node_modules:

```html
<script type="module">
  import { Component, State, Elements, Events } from 'https://esm.sh/olo-front';
  // or via jsDelivr:
  // import { Component, State, Elements, Events } from 'https://cdn.jsdelivr.net/npm/olo-front/+esm';
</script>
```

---

### Option C: Standalone UMD Script Tag (CDN)

If you prefer classic script tags (for CMS templates, static HTML, or legacy setups), include the UMD bundle from a CDN. Everything is attached to `window.OloFront`:

```html
<script src="https://cdn.jsdelivr.net/npm/olo-front/dist/index.umd.cjs"></script>
<!-- or via unpkg: <script src="https://unpkg.com/olo-front/dist/index.umd.cjs"></script> -->
<script>
  const { Component, State, Elements, Events } = window.OloFront;
</script>
```

---

## 2. Your First Component: Interactive Counter

Let's build an interactive counter with reactive state and computed properties.

### Step 1: Define the HTML Structure

In `olo-front`, the DOM is the single source of truth for the structure. We annotate elements using `data-olo-*` attributes:
- `data-olo-component="counter"`: Scopes the component boundary.
- `data-olo-name="countDisplay"`: Identifies target elements for the component's internal DOM queries.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>olo-front Quickstart</title>
</head>
<body>
  <!-- Component Template in Light DOM -->
  <section data-olo-component="counter">
    <h2>Counter</h2>
    <p>Current count: <strong data-olo-name="countDisplay">0</strong></p>
    <p>Doubled: <strong data-olo-name="doubleDisplay">0</strong></p>
    <button data-olo-name="incrementBtn">+1</button>
  </section>

  <script type="module" src="./app.js"></script>
</body>
</html>
```

---

### Step 2: Implement the Component Class (`app.js`)

Extend `Component` and configure state, data transformations (pipes), and events:

```javascript
import { Component } from 'olo-front';

class CounterComponent extends Component {
  constructor(rootElement) {
    // 1. Initialize component with state content and scope (dependencies are auto-wired)
    // Keys in `content` automatically map to elements with matching `data-olo-name`!
    super(
      {
        name: 'counter',
        component: 'counter',
        content: { countDisplay: 0, doubleDisplay: 0 },
      },
      { rootElement }
    );

    // 2. Register a Pipe to transform content before it is committed to state and the DOM
    this.state.addPipe('content', (content) => ({
      ...content,
      doubleDisplay: Number(content?.countDisplay ?? 0) * 2,
    }));

    // 3. Bind events — calling setContent automatically synchronizes with matching DOM elements!
    const incrementBtn = this.elements.get({ name: 'incrementBtn' });
    incrementBtn?.addEventListener('click', () => {
      const current = Number(this.state.content?.countDisplay ?? 0);
      this.state.setContent({ countDisplay: current + 1 });
    });
  }
}

// Bootstrap when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-olo-component="counter"]');
  if (root) {
    new CounterComponent(root);
  }
});
```

---

## 3. Key Concepts in this Example

1. **Automatic Content Synchronization**: Notice `content: { countDisplay: 0, doubleDisplay: 0 }`. In `olo-front`, keys in `state.content` automatically synchronize with DOM elements possessing the matching `data-olo-name` attribute whenever `state.setContent()` is called. No manual `render()` method or imperative `textContent` assignments are needed!
2. **Explicit Reactivity via Pipes**: Notice `state.addPipe('content', ...)`. When `setContent` is called, `olo-front` runs your pipeline functions to compute or sanitize values before committing them to the state and rendering them to the DOM.
3. **Light-DOM Scoping & Zero Virtual DOM**: Updates are directed straight to real DOM nodes without virtual DOM diffing, keeping memory usage minimal and performance fast.

---

## Next Steps

- Explore [Core Concepts](./core-concepts.md) to understand Pipes, Effects, and the Light DOM philosophy.
- Read [State & Reactivity](./modules/state-and-reactivity.md) for hierarchical state trees and traversal.
- Learn about [UI State Machines](./modules/mode-fsm.md) to manage loading, pending, and error states cleanly with `data-olo-mode`.

