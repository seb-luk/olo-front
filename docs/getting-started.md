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

### Option B: Native Browser ESM (No Build Step Required)

Because `olo-front` is written in standard ES modules, you can serve or import it directly in any modern browser without a bundler or node_modules:

```html
<script type="module">
  import { Component, State, Elements } from './packages/olo-front/src/index.js';
  // Directly runnable code
</script>
```

---

### Option C: Standalone UMD Script Tag

If you prefer classic script tags (for CMS templates, static HTML, or legacy setups), include the UMD bundle. Everything is attached to `window.OloFront`:

```html
<script src="https://unpkg.com/olo-front/dist/index.umd.cjs"></script>
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
import { Component, Elements, State } from 'olo-front';

class CounterComponent extends Component {
  constructor(rootElement) {
    // 1. Initialize component with state and inject dependencies
    super(
      { name: 'counter', component: 'counter', properties: { count: 0 } },
      { rootElement },
      { Elements, State }
    );

    // 2. Query scoped DOM elements via this.elements
    this.countDisplay = this.elements.get({ name: 'countDisplay' });
    this.doubleDisplay = this.elements.get({ name: 'doubleDisplay' });
    this.incrementBtn = this.elements.get({ name: 'incrementBtn' });

    // 3. Register a Pipe to transform state properties before commit
    this.state.addPipe('properties', (props) => ({
      ...props,
      doubleCount: Number(props?.count ?? 0) * 2,
    }));

    // 4. Bind events (tied automatically to component lifecycle)
    if (this.incrementBtn) {
      this.incrementBtn.addEventListener('click', () => {
        const currentCount = this.state.properties?.count ?? 0;
        this.state.setProperties({ count: currentCount + 1 });
        this.render();
      });
    }

    // Initial render
    this.render();
  }

  render() {
    if (this.countDisplay) {
      this.countDisplay.textContent = this.state.properties?.count ?? '0';
    }
    if (this.doubleDisplay) {
      this.doubleDisplay.textContent = this.state.properties?.doubleCount ?? '0';
    }
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

1. **Explicit Reactivity via Pipes**: Notice `state.addPipe('properties', ...)`. When `setProperties` is called, `olo-front` runs your pipeline functions to compute or sanitize values before updating state.
2. **Light-DOM Scoping**: `this.elements.get({ name: 'countDisplay' })` only searches within `rootElement`, completely avoiding accidental clashes with other elements on the page.
3. **Zero Virtual DOM**: Updates are directed straight to real DOM nodes (`textContent`), keeping memory usage minimal and avoiding any reconciliation overhead.

---

## Next Steps

- Explore [Core Concepts](./core-concepts.md) to understand Pipes, Effects, and the Light DOM philosophy.
- Read [State & Reactivity](./modules/state-and-reactivity.md) for hierarchical state trees and traversal.
- Learn about [UI State Machines](./modules/mode-fsm.md) to manage loading, pending, and error states cleanly with `data-olo-mode`.

