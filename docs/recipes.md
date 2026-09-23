# Recipes & Practical Patterns

Ready-to-use patterns for common real-world frontend tasks using `olo-front`.

---

## 1. Dynamic Lists & Reconciliation with `Children`

Rendering and updating lists of items dynamically using `<template>` cloning and `Children`:

```html
<!-- Container with dynamic placeholder and template -->
<div data-olo-component="todo-app">
  <ul data-olo-dynamic="todo-list">
    <!-- Items will be inserted here -->
  </ul>

  <template data-olo-component="todo-item">
    <li data-olo-component="todo-item">
      <span data-olo-name="title"></span>
      <button data-olo-name="removeBtn">Delete</button>
    </li>
  </template>
</div>
```

```javascript
import { Component, State } from 'olo-front';

class TodoListComponent extends Component {
  async onReady() {
    // Populate list from state
    const initialTasks = [
      { id: 1, title: 'Learn olo-front architecture' },
      { id: 2, title: 'Build lightweight app' },
    ];

    this.state.setChildren(
      initialTasks.map(task => ({
        name: `todo-${task.id}`,
        component: 'todo-item',
        content: { title: task.title },
      }))
    );
  }

  addTask(title) {
    const id = Date.now();
    const newTaskState = new State(
      {
        name: `todo-${id}`,
        component: 'todo-item',
        content: { title },
      }
    );

    // Insert at the end of the list
    this.state.children.insert(newTaskState, 'LAST');
  }

  removeTask(id) {
    this.state.children.remove({ name: `todo-${id}` });
  }
}
```

---

## 2. Form Input Validation with `Pipes`

Using `addPipe` to validate and sanitize user inputs before state changes are committed:

```javascript
import { State } from 'olo-front';

const formState = new State({
  properties: {
    email: '',
    age: 0,
    errors: {},
  },
});

// Validation Pipe for properties
formState.addPipe('properties', (props) => {
  const errors = {};

  if (props.email && !props.email.includes('@')) {
    errors.email = 'Please provide a valid email address';
  }

  if (props.age !== undefined && props.age < 18) {
    errors.age = 'You must be at least 18 years old';
  }

  return {
    ...props,
    email: props.email?.trim().toLowerCase(),
    isValid: Object.keys(errors).length === 0,
    errors,
  };
});

// Update state
formState.setProperties({ email: ' USER@EXAMPLE.COM ', age: 16 });
console.log(formState.properties.isValid); // false
console.log(formState.properties.errors.age); // "You must be at least 18 years old"
console.log(formState.properties.email); // "user@example.com"
```

---

## 3. Asynchronous Data Fetching & UI Modes

Handling loading spinners, error alerts, and successful data states declaratively using `Mode`:

```javascript
import { Component } from 'olo-front';

class ProductView extends Component {
  constructor(rootElement) {
    super(
      {
        name: 'productView',
        component: 'product-view',
        mode: {
          modes: { STATUS: ['IDLE', 'LOADING', 'SUCCESS', 'ERROR'] },
          current: ['IDLE'],
        },
      },
      { rootElement }
    );
  }

  async loadProduct(productId) {
    this.state.setMode('LOADING');

    try {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();

      // Update content and switch to SUCCESS
      this.state.setContent({
        title: data.title,
        price: `$${data.price}`,
      });
      this.state.setMode('SUCCESS');
    } catch (err) {
      this.state.setContent({
        errorMessage: err.message,
      });
      this.state.setMode('ERROR');
    }
  }
}
```

```css
/* UI shows/hides components via data-olo-mode attribute */
[data-olo-component="product-view"] .spinner { display: none; }
[data-olo-component="product-view"] .error-box { display: none; }

[data-olo-component="product-view"][data-olo-mode~="loading"] .spinner {
  display: block;
}
[data-olo-component="product-view"][data-olo-mode~="error"] .error-box {
  display: block;
}
```

---

## 4. Server-Side Rendered (SSR) Progressive Enhancement

Hydrate server-rendered HTML without replacing DOM nodes or causing screen flicker:

```html
<!-- Pre-rendered by Django / Rails / PHP -->
<div data-olo-component="article-card" data-olo-static="article-card">
  <h2 data-olo-name="title">Server Rendered Article Heading</h2>
  <p data-olo-name="author">Jane Doe</p>
  <button data-olo-name="bookmarkBtn">Bookmark</button>
</div>
```

```javascript
import { Component, COMPONENT_CONTENT_SLOT_VALUE } from 'olo-front';

class ArticleCardComponent extends Component {
  constructor(rootElement) {
    super(
      {
        name: 'article-card',
        component: 'article-card',
        // Mark fields to be extracted from the static DOM
        content: {
          title: COMPONENT_CONTENT_SLOT_VALUE,
          author: COMPONENT_CONTENT_SLOT_VALUE,
        },
      },
      { rootElement }
    );
  }

  async onReady() {
    // Elements extracts the existing text from the HTML into this.state.content
    console.log('Hydrated Title:', this.state.content.title);

    // Attach interactive behavior smoothly with automatic teardown
    const btn = this.elements.get({ name: 'bookmarkBtn' });
    if (btn) {
      this.events.listen({
        target: btn,
        event: 'click',
        callback: () => {
          this.bookmark();
        },
      });
    }
  }

  bookmark() {
    alert(`Bookmarked "${this.state.content.title}"`);
  }
}
```

