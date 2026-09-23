# Standalone Module Usage

One of the greatest strengths of `olo-front` is its **modular micro-architecture**. You are not required to adopt the entire framework or rewrite your site as a Single Page Application (SPA).

Several primitives offer tremendous value when used completely standalone in:
- Plain Vanilla JavaScript scripts
- Server-rendered frameworks (Django, Ruby on Rails, Laravel, ASP.NET)
- Modern lightweight stacks (HTMX, Alpine.js, Astro, 11ty)

> [!TIP]
> In buildless setups, HTML templates, or server-rendered apps, you can import standalone modules directly via CDN:
> ```html
> <script type="module">
>   import { Events, Mode, Elements } from 'https://esm.sh/olo-front';
> </script>
> ```

---

## 1. Standalone `Events`: Leak-Free Listener Management

Adding event listeners to DOM elements or the `window` often causes subtle memory leaks when elements are removed dynamically (e.g. by HTMX swapping or custom dialogs).

With `Events`, you get a single cleanup switch:

```javascript
import { Events } from 'olo-front';

function mountDropdown(dropdownEl) {
  const events = new Events({ scope: dropdownEl });

  // Listen to scoped button click
  events.listen({
    target: dropdownEl.querySelector('.trigger'),
    event: 'click',
    callback: () => dropdownEl.classList.toggle('is-open'),
  });

  // Listen to outside clicks on document/window
  events.listen({
    target: window,
    event: 'click',
    callback: (e) => {
      if (!dropdownEl.contains(e.target)) {
        dropdownEl.classList.remove('is-open');
      }
    },
  });

  // Whenever HTMX or your router replaces this DOM element:
  dropdownEl.addEventListener('htmx:beforeCleanupElement', () => {
    events.stopAll(); // Detaches all listeners at once!
  });
}
```

---

## 2. Standalone `Mode`: Declarative CSS State Controller

Instead of littering your code with `classList.add('loading')`, `classList.remove('loading')`, and worrying about out-of-sync class combinations, drop `Mode` into any UI widget:

```javascript
import { Mode } from 'olo-front';

const card = document.querySelector('#pricing-card');

// Configure states for billing cycle and currency (Elements is auto-wired!)
const pricingMode = new Mode(
  {
    modes: {
      CYCLE: ['MONTHLY', 'ANNUAL'],
      CURRENCY: ['USD', 'EUR', 'GBP'],
    },
    current: ['MONTHLY', 'USD'],
  },
  { selector: card }
);

// Toggle between states
document.querySelector('#billing-toggle').addEventListener('change', (e) => {
  pricingMode.setCurrent(e.target.checked ? 'ANNUAL' : 'MONTHLY');
  // Directly writes: data-olo-mode="annual usd" to #pricing-card
});
```

Now you style purely in CSS:

```css
#pricing-card[data-olo-mode~="annual"] .price-discount {
  display: block;
}
#pricing-card[data-olo-mode~="monthly"] .price-discount {
  display: none;
}
```

---

## 3. Standalone `Module`: Predictable Business State Flows

If your application needs state management with data validation and side effects, but you don't want the weight of Redux, Zustand, or complex signal graphs:

```javascript
import { Module } from 'olo-front';

class ShoppingCartStore extends Module {
  constructor() {
    super({
      properties: ['items', 'discountCode'],
    });

    // Pipeline: calculate total or sanitize input whenever items are set
    this.addPipe('items', (items = []) => {
      return items.filter(item => item.quantity > 0);
    });

    // Side Effect: persist to localStorage on every change
    this.addEffect('items', (items) => {
      localStorage.setItem('cart', JSON.stringify(items));
    });
  }

  addItem(product) {
    const current = this.items ?? [];
    this.items = [...current, product];
  }
}

export const cartStore = new ShoppingCartStore();
```

---

## 4. Standalone `Elements`: Safe DOM Updates with XSS Protection

`Elements.update` gives you targeted, batch DOM updates without Virtual DOM diffing overhead:

```javascript
import { Elements } from 'olo-front';

const elements = new Elements(document.querySelector('#profile'));

// Update multiple text and attribute slots safely in one step
elements.update(
  {},
  {
    displayName: 'Grace Hopper',
    'avatar#src': 'https://example.com/grace.jpg',
    'badge#class': 'badge badge-primary',
  }
);
```
Unsafe scripts (e.g. `javascript:alert(1)`) in attributes are automatically sanitized and blocked.

