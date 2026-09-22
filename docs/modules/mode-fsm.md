# Mode: UI Finite State Machine

In traditional frontend development, toggling UI states (e.g. `is-loading`, `is-disabled`, `has-error`, `theme-dark`) usually results in messy imperative `classList.add()` and `classList.remove()` calls scattered across event handlers.

The `Mode` module solves this by providing an explicit, declarative **Finite State Machine (FSM)** that automatically synchronizes active states directly to the `data-olo-mode` DOM attribute.

---

## 1. Why `data-olo-mode`?

Instead of mutating individual CSS classes, `olo-front` writes active modes as a space-separated string on the component's root element:

```html
<article data-olo-component="checkout-btn" data-olo-mode="loading dark">
  <span data-olo-name="label">Submit</span>
</article>
```

In your CSS, you can target specific modes cleanly using the standard CSS attribute-contains selector `~=`:

```css
/* Base styles */
[data-olo-component="checkout-btn"] {
  background: #007bff;
  color: white;
}

/* Loading mode */
[data-olo-component="checkout-btn"][data-olo-mode~="loading"] {
  opacity: 0.7;
  pointer-events: none;
  cursor: wait;
}

/* Disabled mode */
[data-olo-component="checkout-btn"][data-olo-mode~="disabled"] {
  background: #cccccc;
  cursor: not-allowed;
}

/* Dark theme variation */
[data-olo-component="checkout-btn"][data-olo-mode~="dark"] {
  background: #222222;
}
```

---

## 2. Defining Mode Sets

Modes are organized into **orthogonal mode sets**. Switching a mode inside one set leaves modes in other sets untouched:

```javascript
import { Mode, Elements } from 'olo-front';

const buttonMode = new Mode(
  {
    // Define independent sets
    modes: {
      STATUS: ['IDLE', 'LOADING', 'SUCCESS', 'ERROR'],
      THEME: ['LIGHT', 'DARK'],
    },
    // Initial active modes for each set
    current: ['IDLE', 'LIGHT'],
  },
  { selector: { component: 'checkout-btn' } },
  { Elements }
);

console.log(buttonMode.current); // ['IDLE', 'LIGHT']
// DOM: data-olo-mode="idle light"
```

### Transitioning Modes

Setting a mode automatically finds which set it belongs to and updates it:

```javascript
// Switches STATUS to LOADING; THEME remains LIGHT
buttonMode.setCurrent('LOADING');
console.log(buttonMode.current); // ['LOADING', 'LIGHT']
// DOM: data-olo-mode="loading light"

// Transition multiple sets simultaneously
buttonMode.setCurrent(['SUCCESS', 'DARK']);
// DOM: data-olo-mode="success dark"
```

---

## 3. Integration with `State` & `Component`

In a standard `Component`, `Mode` is wired directly into `State`:

```javascript
class UploadComponent extends Component {
  async handleUpload(file) {
    // 1. Enter LOADING mode
    this.state.setMode('LOADING');

    try {
      await api.uploadFile(file);
      // 2. Transition to SUCCESS
      this.state.setMode('SUCCESS');
    } catch (err) {
      // 3. Transition to ERROR
      this.state.setMode('ERROR');
    }
  }
}
```

Because `Mode` is a subclass of `Module`, you can attach custom pipes or effects to intercept mode changes:

```javascript
buttonMode.addEffect('current', (currentModes) => {
  if (currentModes.includes('ERROR')) {
    console.warn('Button entered error state!');
  }
});
```

---

## 4. Standalone Usage

`Mode` requires zero framework buy-in. You can use it in any vanilla JavaScript, Alpine.js, or HTMX project to manage UI states:

```javascript
import { Mode, Elements } from 'olo-front';

const dialogMode = new Mode(['CLOSED', 'OPENING', 'OPEN', 'CLOSING'], {
  selector: { name: 'myDialog' },
}, { Elements });

// Open dialog
dialogMode.setCurrent('OPEN');
```

