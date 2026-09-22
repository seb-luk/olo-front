# Events & Memory Teardown

Managing event listeners in modern JavaScript Single Page Applications (SPAs) or dynamically mounted components is fraught with memory leak risks. Forgotten listeners hold references to dead DOM nodes, preventing garbage collection.

`olo-front` solves this with the `Events` module and `OloEvent`:
- Automatic attachment to an internal `AbortController`
- Scoped target querying via selectors (`{ name: 'button' }`)
- One-call instant teardown with `stopAll()`
- Custom bubbling events via `OloEvent`

---

## 1. The `Events` Class

`Events` extends `View` and manages listener lifecycles within a given DOM scope.

```javascript
import { Events } from 'olo-front';

const events = new Events({
  scope: document.querySelector('#chat-widget'),
});
```

### Adding Listeners: `listen()`
You can attach listeners by passing raw DOM elements, `window`, or `olo` selector objects:

```javascript
// Target by selector within the scope
events.listen({
  target: { name: 'sendBtn' }, // queries [data-olo-name="sendBtn"] inside scope
  event: 'click',
  callback: (e) => console.log('Send clicked!'),
});

// Target window
events.listen({
  target: window,
  event: 'resize',
  callback: () => console.log('Window resized'),
});
```

All listeners are internally registered with `{ signal: this.#abortController.signal }`.

---

## 2. Instant Teardown: `stopAll()`

To clean up all listeners registered through an `Events` instance, call `stopAll()`:

```javascript
// Instantly detaches every listener bound through this instance
events.stopAll();
```

When a `Component` is destroyed, it calls `this.events.stopAll()` automatically during teardown, guaranteeing zero dangling listeners.

---

## 3. Custom Events: `OloEvent` & `dispatch()`

`OloEvent` extends the native browser `Event` and is pre-configured with `{ bubbles: true }`. It allows components to bubble up semantic business actions:

```javascript
// Dispatches an OloEvent from the component's scope
events.dispatch('ITEM_ADDED', 'sku-12345', { quantity: 2 });
```

### Listening for `OloEvent`
Because `OloEvent` bubbles, parent components or document listeners can catch it:

```javascript
document.addEventListener('oloEvent', (event) => {
  console.log('Action:', event.action);   // "ITEM_ADDED"
  console.log('Value:', event.value);     // "sku-12345"
  console.log('Context:', event.context); // { quantity: 2 }
});
```

---

## 4. Standalone Usage (Outside of Components)

You do not need to use `Component` or `State` to benefit from `Events`. You can use it anywhere in your codebase as a leak-proof event manager:

```javascript
import { Events } from 'olo-front';

function setupModal(modalEl) {
  const events = new Events({ scope: modalEl });

  events.listen({
    target: { name: 'closeBtn' },
    event: 'click',
    callback: () => closeModal(),
  });

  events.listen({
    target: window,
    event: 'keydown',
    callback: (e) => {
      if (e.key === 'Escape') closeModal();
    },
  });

  function closeModal() {
    events.stopAll(); // Completely detaches window keydown and close button click!
    modalEl.remove();
  }
}
```

