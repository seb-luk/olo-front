# State & Reactivity

The reactive foundation of `olo-front` consists of three core classes:
- **`Module`**: The base reactivity primitive providing property registration, pipes, and effects.
- **`State`**: The component-level state node managing `content`, `properties`, `mode`, and DOM effects.
- **`Children`**: Manages collections of sub-states and tree reconciliation.

---

## 1. The `Module` Base Class

Every reactive object in `olo-front` extends `Module`. It provides a clean, predictable Pipeline & Effect pattern instead of hidden proxies or dirty checking.

```javascript
import { Module } from 'olo-front';

class CounterStore extends Module {
  constructor() {
    super({
      // 1. Declare which properties this module manages
      properties: ['count', 'step'],
    });

    // 2. Register Pipes (run BEFORE property is written)
    this.addPipe('count', (newVal) => Math.max(0, Number(newVal)));

    // 3. Register Effects (run AFTER property is written)
    this.addEffect('count', (val) => {
      console.log('Count changed to:', val);
    });
  }
}

const counter = new CounterStore();
counter.step = 1;
counter.count = -5; // Pipe clamps to 0!
console.log(counter.count); // 0
```

### Pipes vs. Effects
- **Pipes** (`this.addPipe(property, (data, options, deps) => transformedData)`):
  Pure transformations. Use them to sanitize input, parse strings to numbers, normalize emails, or calculate derived values.
- **Effects** (`this.addEffect(property, (data, options, deps) => { ... })`):
  Impure side effects. Use them to trigger DOM updates, log metrics, dispatch events, or persist to `localStorage`.

---

## 2. The `State` Class

`State` extends `Module` and specializes it for UI components. A `State` instance manages:
1. `content`: Values intended for display in the view (e.g. text for slots or named elements).
2. `properties`: Configuration or business state (e.g. filter values, IDs, flags).
3. `mode`: Active UI states (e.g. `['LOADING', 'DISABLED']`), coordinated with the `Mode` FSM.
4. `parent` & `children`: Hierarchical tree links.

### Instantiation

```javascript
import { State } from 'olo-front';

const userState = new State(
  {
    name: 'userCard',
    component: 'user-profile',
    content: {
      username: 'Ada Lovelace',
      role: 'Engineer',
    },
    properties: {
      isOnline: true,
      lastLogin: 1726998000000,
    },
    mode: ['ACTIVE'],
  }
);
```

### Updating Content & Declarative DOM Synchronization

In `olo-front`, `State` automatically registers `ContentViewEffect` on `content`. When `setContent` is called on a component state:

```javascript
// Automatically locates [data-olo-name="role"] and updates its textContent
userState.setContent({ role: 'Lead Architect' });

// You can also target attributes using the 'name#attr' syntax:
userState.setContent({ 'avatar#src': '/images/ada.jpg', 'saveBtn#disabled': 'false' });

// Updates properties through registered pipes and effects (business logic)
userState.setProperties({ isOnline: false });
```

Because `setContent` synchronizes directly with matching `data-olo-name` elements in the Light DOM, you don't need manual element querying or an imperative `render()` method!

### Automatic Dataset Extraction Pipes
`olo-front` exports built-in pipes that can automatically populate state directly from an HTML element's `data-olo-*` attributes:
- `ContentDatasetPipe`: Extracts `data-olo-content-*` into `state.content`.
- `PropertiesDatasetPipe`: Extracts `data-olo-properties-*` into `state.properties`.

---

## 3. Tree Traversal with `getState`

States form a hierarchical tree. You can query any state anywhere in the tree using `getState(name, options)`:

```javascript
// Search bidirectionally (up through parents, then down through children)
const cartState = orderState.getState('shoppingCart', { direction: 'bi' });

// Search only upwards towards root
const appState = buttonState.getState('appShell', { direction: 'up' });

// Search only downwards through descendants
const itemState = listState.getState('item-42', { direction: 'down' });
```

---

## 4. The `Children` Module

`Children` manages ordered lists of child `State` objects. It is responsible for inserting, reordering, and removing items in the state tree while delegating DOM movements to `Elements`.

```javascript
import { State, Children } from 'olo-front';

const parentState = new State({ name: 'todoList' });

// Add child items
parentState.setChildren([
  { name: 'task-1', content: { title: 'Buy milk' } },
  { name: 'task-2', content: { title: 'Write tests' } },
]);

// Insert at specific index ('FIRST', 'LAST', or 0-based number)
parentState.children.insert(
  new State({ name: 'task-3', content: { title: 'Deploy app' } }),
  'FIRST'
);

// Remove child
parentState.children.remove({ name: 'task-1' });
```

---

## API Quick Reference

### `State` Methods
| Method | Description |
| :--- | :--- |
| `setContent(content, options)` | Sets content and triggers `ContentViewEffect` |
| `setProperties(props, options)` | Sets properties running registered pipes and effects |
| `setMode(mode)` | Updates active UI modes |
| `setChildren(states, options)` | Attaches or updates child states |
| `getState(name, { direction })` | Searches tree for a named state (`'bi'`, `'up'`, `'down'`) |
| `detachComponent()` | Destroys the attached component instance and frees memory |

