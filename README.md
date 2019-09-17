
<h1 align="center">
  react-use-controller
</h1>

<p align="center">
  Turning plain-old classes into react super-hooks.
</p>
 
<p align="center">
  <a href="https://www.npmjs.com/package/react-use-controller"><img alt="NPM" src="https://img.shields.io/npm/v/@gabeklein/use-controller.svg"></a>
  <a href=""><img alt="Build" src="https://shields-staging.herokuapp.com/npm/types/react-use-controller.svg"></a>
</p>

<br/>

<p align="center">
  <b>Use any class as a hook-based model,</b><br/>
  with values, actions, and lifecycle methods  to control your components.
  <p align="center">
  Controller hooks will trigger renders, as needed, for any data.<br/>
  When values change your components will too.<br/>
</p>

### Contents 

• **[Overview](#overview-section)** <br/>
• **[Install and Import](#install-section)**

**[`use`](#started-section) hook (Simple)**
  - [Basics](#concept-basic)
  - [Methods](#concept-method)
  - [Lifecycle](#concept-lifecycle)
  - [Destructuring](#concept-destruct)
  - [Basic Composing](#concept-compose)
  - [Auto Debounce](#concept-debounce)
  - [Lazy Updating](#concept-lazy)

**[`Controller`](#controller-section) (Advanced)**
  - [Constructor Arguments](#concept-constructor)
  - [Context](#concept-context)
  - [TypeScript](#concept-typescript)

• **[Versus normal hooks](#compare-section)** <br/>
• **[Property API](#property-api)** <br/>
• **[Subscriber API](#subscribe-api)**

<br/>

<h2 id="overview-section">Overview</h2>

Seamlessly create and apply ES6 classes as the model [(of MVC fame)](https://en.wikipedia.org/wiki/Model–view–controller) for [React function-components](https://www.robinwieruch.de/react-function-component). The basic idea is pretty simple, to watch all properties in an instance of some class, and dispatch renders wherever those changes might be visible. This is done with the help of [accessors (`get` & `set`)](https://www.w3schools.com/js/js_object_accessors.asp) and `useReducer` behind the scenes.

For this, you have the general-purpose hook `use()`, which can take a class, and `Controller`, an inheritable abstract-class with more specialized hooks as static methods.

When any of these hooks are called in a function, a controller reference is returned, bound to the given component. It contains all the current state, used for rendering. Changes to that object are then reflected by triggering _another_ render, where deemed necessary. 

This "live-state" combines with actions, computed properties, some lifecycle hooks, and the component itself to create what is effectively a model-view-controller.

<br/>

<h2 id="install-section">Installation</h2>

Install with your preferred package manager
```bash
npm install --save react-use-controller
```

Import and use in your react apps.

```js
import { use, Controller } from "react-use-controller";
```

> **Note:** `Controller` may also be imported as default

<br/>

<h1 id="started-section">Getting Started</h1>

There are two ways to use a controller, supply any class to the `use` hook or [extend one with `Controller`](#controller-section). <br/>
Both ways behave pretty much the same, though extending has some key benefits.

> It is generally recommended you extend but, for simple models, `use` is best for its brevity.

<br/>

<h2 id="concept-simple">Simplest use-case</h2>

Let's make a stateful counter.

```jsx
import { use } from "react-use-controller";

// Make a class with some properties. They will be tracked for updates. 
class CountControl {
  number = 1
}

const KitchenCounter = () => {
  /* Pass your class to use(); it will create and return a new instance, 
   * bound to your component's instance as its model or "state". */
  const state = use(CountControl);

  // Setting new values to its properties will trigger a render in order
  // to remain synced.   ⌄               ⌄
  return (
    <Row>
      <Button
        onClick={() => { state.number -= 1 }}>
        {"-"}
      </Button>
      <Box>{state.number}</Box>
      <Button 
        onClick={() => { state.number += 1 }}>
        {"+"}
      </Button>
    </Row>
  )
}
```

<br/>

<h2 id="concept-method">Adding methods</h2>

What's a view controller without its methods? Add some ["actions"](https://mobx.js.org/refguide/action.html) to easily abstract changes to the state.

```jsx
class CountControl {
  number = 1

  /* We can edit state directly using `this`.
   * Notice these are arrow functions, and thus are bound. */
  increment = () => this.number++;
  decrement = () => this.number--;
}
```

```jsx
const KitchenCounter = () => {
  /* You can use destructuring too, */
  const { number, decrement, increment } = use(CountControl);

  // and pass bound callbacks directly from the controller
  //                   ⌄       ⌄
  return (
    <Row>
      <Button onClick={decrement}>{"-"}</Button>
      <Box>{number}</Box>
      <Button onClick={increment}>{"+"}</Button>
    </Row>
  )
}
```

> With this you can write even deeply stateful functional-components while keeping the benefits of stateless. 😍

<br/>

<h2 id="concept-lifecycle">Lifecycle methods</h2>

The `use()` hook can automatically call defined [lifecycle hooks](#lifecycle-list) when appropriate.
```jsx
import React from "react";

class TimerControl {
  elapsed = 1;

  /* Automatically called during an internal `useEffect()` step. */
  didMount(){
    this.timer = 
      setInterval(
        () => this.elapsed++, 
        1000
      )
  }

  willUnmount(){
    /* oh and remember to cleanup too ♻ */
    clearInterval(this.timer);
  }
}
```

```jsx
const KitchenTimer = () => {
  const state = use(TimerControl);

  return <Box>{state.elapsed}</Box>;
}
```

<br />

<h2 id="concept-destruct">Destructuring</h2>

While destructuring, with two reserved keys `get` and `set`, we can still retrieve and update values after doing so.

> Not to be confused with keywords. As named properties, they are both are the same, just a circular reference to `state`. Use whatever makes the most sense semantically.

```jsx
const AboutMe = () => {
  const {
    set, // ⬅ a proxy for `state`
    name
  } = use(AboutYou);

  return (
    <div onClick = {() => {
      set.name = window.prompt("What is your name?", "John Doe");
    }}>
      My name is {name}.
    </div>
  )
}
```

> See what we did there? 😎

<br/>

<h2 id="concept-compose">Basic composition</h2>

Generally the goal of this library is to enable the use of only one hook on a per-component basis. However, it's good to know, there is nothing preventing you from calling `use` more than once, or making use of other hooks at the same time. There's are better ways to do it, but calling multiple controllers can be a great way to separate concerns. 

```js
  class PingController {
    value = 1
  }
  
  class PongController {
    value = 2
  }
```

```jsx
  const ControllerAgnostic = () => {
    const ping = use(PingController);
    const pong = use(PongController);

    return (
      <div>
        <div
          onClick={() => { ping.value += pong.value }}>
          Ping's value is ${ping.value}, click me to add in pong!
        </div>
        <div
          onClick={() => { pong.value += pong.value }}>
          Pong's value is ${pong.value}, click me to add in ping!
        </div>
      </div>
    )
  }
```

<br/>

<h2 id="concept-debounce">Automatic debouncing</h2>

Rest assured. Updates you make synchronously will be batched together as a single rendered update.

```jsx
class ZeroStakesGame {
  foo = "bar"
  bar = "baz"
  baz = "foo"

  shuffle = () => {
    this.foo = "???"
    this.bar = "foo"
    this.baz = "bar"

    setTimeout(() => {
      this.foo = "baz"
    }, 1000)
  }
}
```

```jsx
const MusicalChairs = () => {
  const { foo, bar, baz, shuffle } = use(ZeroStakesGame);

  <span>Foo is {foo}'s chair!</span>
  <span>Bar is {bar}'s chair!</span>
  <span>Baz is {baz}'s chair!</span>

  <div onClick={shuffle}>🎶🥁🎶🎷🎶</div>
}
```

> Even though we're ultimately making four updates, `use()` only needs to re-render twice. It does so once for everybody (being on the same tick), resets when finished, and again wakes for `foo` when settled all in.

<br/>

<h2 id="concept-lazy">Subscription based "lazy" updating</h2>

Controllers use a subscription model to decide when to render. Through automatic subscription, components will **only** update for changes to values which are actually accessed.

> Here `LazyComponent` will not update when `bar` does change, because it *seems* to only access `foo` here. 

```jsx
class FooBar {
  foo = "bar"
  bar = "foo"
}

const LazyComponent = () => {
  const { set, foo } = use(FooBar);

  return (
    <h1 
      onClick={() => set.bar = "baz" }>
      Foo is {foo} but click here to update bar!
    </h1>
  )
}
```

### Automatic inference 

Instances of a controller can figure out what to subscribe to automatically. They do it by spying on what's **accessed on the initial render** of a component they hook into.

> **Recommended**: While `use` cannot read your functions, destructuring by default is a good way to get consistent behavior. If a property is not accessed on initial render render (being within an `if` statement or ternary), it could fail to update as expected. Destructuring pulls out properties no matter what, so helps in this regard.

<!-- ### Explicit subscription

There are also a number of helper methods you can call to specify which properties you wish to watch. <br/>
Check them out in [Subscription API](#subscription-api) section. -->

<br/>

<h1 id="controller-section">The <code>Controller</code> superclass</h1>

While you get a lot from `use()` and standard (or otherwise extended) classes, there are a few key benefits to extending `Controller`.

- You can pass arguments to the constructor
- Type are maintained, making inference a lot better
- Explicit subscription based rendering
- Ability to create a provider, making state accessible anywhere.
- An optional error-boundary with the use of provider.

<br/>

> To hook this way, rather than passing a class to `use`, extend `Controller` and call the attached `.use()` method.

```jsx
import Controller from "react-use-controller"

class Control extends Controller {
  value = 1;
}
```
```jsx
const Component = () => {
  const { value } = Control.use();

  return <div>{value}</div>;
}
```
> `.use` will hook to your component and construct state only once per mount, same as a standard `use` would.

<br/>

<h2 id="concept-constructor">Passing arguments to your constructor</h2>

Method `use(...)` will pass its own arguments to the constructor while creating a new instance. 

```typescript
/* typescript */

class Control extends Controller {
  value: number;

  constructor(props: MyComponentProps){
    this.value = props.startWith;
  }
}
```
```jsx
const MyComponent = (props) => {
  const { value } = Control.use(props);

  return <div>{value}</div>;
}
```

<br/>

<h2 id="concept-context">Access state anywhere <sup>(with context!)</sup></h2>

One of the best features of `Controller` classes is [using Context](https://frontarm.com/james-k-nelson/usecontext-react-hook/), to create and consume the same state from anywhere in your app. 

Of the available static methods, `.create()` will produce a [Provider](https://reactjs.org/docs/context.html#contextprovider) to wrap child-components with. Components nested can call the static-method `.get()` on the same constructor to access the nearest instance of that class.

Thanks to [lazy-updating](#lazy-concept), only properties used by a consumer will trigger a render for that particular component. Plus, actions are made available anywhere in your hierarchy, letting distant components cleanly "update" each other via a shared controller.

<br/>

```jsx
export class Central extends Controller {
  foo = 0;
  bar = 0;

  fooUp = () => this.foo++ 
};

export const App = () => {
  /* An alternative to use(), create() will directly return a <Provider> with a new live-state. 
   * If you want values too, you can get { Provider } from use() as well. */
  const Control = Central.create();

  return (
    <Control>
      <InnerFoo/>
      <InnerBar/>
    </Control>
  )
}
```

```jsx
const InnerFoo = () => {
  /* .get, rather than making a new `Central` controller, 
   * will find the nearest one (in this case from `App`). */
  const { fooUp, bar } = Central.get();

  return (
    <div onClick={(fooUp)}>
      <pre>Foo</pre>
      <small>Bar was clicked {bar} times!</small>
    </div>
  )
}
```

```jsx
const InnerBar = () => {
  /* Controller knows this component needs to update only when foo changes.
   * Lazy refreshing ensures only properties accessed here are watched here.
   * They're also completely agnostic, as to how they're actually updated. */
  const { set, foo } = Central.get();

  return (
    <div onClick={() => set.bar++}>
      <pre>Bar</pre> 
      <small>Foo was clicked {foo} times!</small>
    </div>
  )
}
```

> This makes context kind of easy a little bit.

<br/>

<h2 id="concept-typescript">Using with typescript</h2>

Importing and extending `default` (`Controller`), as whatever you like, will allow type definitions to pass to your controllers definitions. This hooks you up (pun intended) with autocomplete, hints, and warnings about potential errors.<br/>

> For class `T` the static method `.use()` returns `InstanceType<T>` thus provides full type inference within the component too.

```tsx
/* typescript */

import Controller from "react-use-controller";

class FunActivity extends Controller {
  secondsSofar: number;
  interval: number;

  constructor(alreadyMinutes: number = 0){
    this.secondsSofar = 
      alreadyMinutes * 60;

    this.interval = 
      setInterval(() => {
        this.secondsSofar++;
      }, 1000)
  }

  /* JSDocs on the Controller class will provide descriptors and 
   * autocomplete, making it easier to avoid weird behavior over typos. */
  willUnmount(){
    clearInterval(this.interval)
  }
}
```

```jsx
const PaintDrying = ({ alreadyMinutes }) => {
  /* Your IDE might even know secondsSofar is supposed to be a number 👌 */
  const { secondsSofar } = FunActivity.use(alreadyMinutes);

  return (
    <div>
      I've been staring for like, { secondsSofar } seconds now, 
      and I'm starting to see what this is all about! 👀
    </div>
  )
}
```

<br/>

<h2 id="concept-async">Working with events, callbacks, and <code>async</code> code</h2>

```jsx
class StickySituation extends Control {
  remaining = 60;
  surname = "bond";

  didMount(){
    this.timer = setInterval(this.tickTock, 1000);
  }

  willUnmount(){
    this.cutTheDrama()
  }

  tickTock = () => {
    if(--this.remaining == 0)
      cutTheDrama();
  }

  cutTheDrama(){
    clearInterval(this.timer);
  }

  getSomebodyElse = async () => {
    const res = await fetch("https://randomuser.me/api/");
    const data = await res.json();
    const recruit = data.results[0];

    this.surname = recruit.name.last;
  }
}
```

```jsx
const ActionSequence = () => {
  const { remaining, surname, getSomebodyElse } = StickySituation.use();

  if(remaining == 0)
    return <h1>🙀💥</h1>

  return (
    <div>
      <div>Agent <b>{surname}</b> we need you to diffuse the bomb!</div>
      <div>
        If you can't diffuse it in {remaining} seconds, the cat may or may not die!
      </div>
      <div>
        But there is time! 
        <u onClick={getSomebodyElse}>
          Tap another agent
        </u> 
        if you think they can do it.
      </div>
    </div>
  )
}
```

<br/>
<br/>

### (Besides all that)
<h1 id="compare-section">How is this better than regular hooks?</h1>

Here is an example where we have multiple values to track, showing the main rational here. <br/>

```jsx
const EmotionalState = () => {
  const [name, setName] = useState("John Doe");
  const [emotion, setEmotion] = useState("meh");
  const [reason, setReason] = useState("reasons.");

  return (
    <div>
      <div onClick = {() => {
        const name = prompt("What is your name?", name);
        setName(name);
      }}>
        My name is {name}.
      </div>
      <div>
        <span onClick = {() => {
          setEmotion("sad");
        }}>
          I am currently {emotion}
        </span>
        <span onClick = {() => {
          setReason("hooks are still not hipster enough.")
        }}>
          , because {reason}.
        </span>
      </div>
    </div>
  )
}
```
> Here is heck-ton of vars, inherently hard to scale or modify.

### So how can we fix that?

Simple, make a class containing state (*the model*) and supply it to the `use()` hook.

```jsx
class EmotionalState {
  name = "John Doe"
  emotion = "meh"
  reason = "reasons"
}

const HappyTown = () => {
  const state = use(EmotionalState);

  return (
    <div>
      <div onClick = {() => {
        state.name = prompt("What is your name?", "John Doe");
      }}>
        My name is {state.name}.
      </div>
      <div>
        <span onClick = {() => {
          state.emotion = "doing better"
        }}>
          I am currently {state.emotion} 
        </span>
        <span onClick = {() => {
          state.reason = "hooks are cooler than my cold-brew coffee! 👓"
        }}>
          , because {state.reason}.
        </span>
      </div>
    </div>
  )
}
```

> With a controller, we can do a lot better on scope. Here we've separated out our model (state) from the view (component) which is pretty nice.

Add as many values as you like, and they'll stay clean and _relatively_ organized in your code. (You'll still need good design!)

<br/>

<h1 id="property-api">Property API</h1>

Set behavior for certain methods on classes consumed by `use()` or extending `Controller`.

While standard practice is for `use` to take all methods (and bind them), all properties (and watch them), there are special circumstances to be aware of. <br /><br />


### Properties

#### `set` & `get`
- Not to be confused with setters / getters.
- `state.set` returns a circular reference to `state`
- this is useful to access your state object while destructuring

#### `Arrays`
- if a property is an array, it will be forwarded to your components as a special `ReactiveArray` which can also trigger renders on mutate.


#### `_anything`
- if a key starts with an underscore it will not trigger a refresh when overwritten (or carry any overhead to do so). No special conversions will happen. It's a shorthand for "private" keys which don't interact with the component.

#### `Anything defined post-constructor`
- important to notice that `use()` can only detect properties which exist (and are enumerable) at time of creation. If you create them after, they're effectively ignored.

<br />

### Reserved methods (`use` will define them)

#### `refresh(): void`
- requests a render without requiring that a value has changed. 
- Helpful when working with getters, async and random-number-generators.

#### `export<T>(this: T): { [P in keyof T]: T[P] }`
- takes a snapshot of live state you can pass along, without unintended side effects.
- this will only output the values which were enumerable in the source object.

#### `add(key: string, value?: any): boolean`
- adds a new tracked value to the live-state. 
- this will return `true` if adding the key succeeded, `false` if did not (because it exists).
- setting value is optional, if absent, `key` simply begins watching.
> Not really recommended after initializing, but could come in handy in a pinch.

<br />

<h3 id="lifecycle-list">LifeCycle Methods (<code>use</code> will call them)</h3>

#### `didMount(): void`
- `use()` will call this while internally running `useEffect(fn, [])` for itself.

#### `willUnmount(): void`
- `use()` will call this before starting to clean up.

#### `didHook(): void`
- Called every render. A way to pipe data in from other hooks.

#### `willHook(): void`
- Called every render. However `this` references actual state only on first render, otherwise is a dummy. <br/>
  Useful for grabbing data without re-evaluating the properties you set in this callback every render. <br/> 
  (e.g. things from `useContext`)

#### `willRender(): void`
- Called before 

<br/> 

<h1 id="subscribe-api">Subscription API</h1>

Chain after `use(...)` or `get()` to control what values explicitly will trigger a new render if-changed.

> if you have constructor arguments chain after `use(...)`, <br />
> if not you can also call a `"useX"` / `"getX"` for brevity.

<br/>

#### `.use().once()` / `.useOnce()` / `.getOnce()`

Will disable all but explicit `.refresh()` from this particular controller.

```js
const View = () => {
  const { foo, bar } = Controller.useOnce("bar");

  return false;
}
```
> This generates state, but never automatically updates.

<br/>

#### `.use().on()` / `.useOn()` / `.getOn()`

Declare properties you want to do want to watch, in addition to any inferred properties.

```js
const View = (props) => {
  const state = Controller.use(props).on("bar");

  return state.foo && (
    <span>{state.bar}</span>
  );
}
```
> This will refresh when either `foo` or `bar` change, even if `foo` starts out false.

<br/>

#### `.use().only()` / `.useOnly()` / `.getOnly()`

Declare the properties you wish to renew for. This will skip automatic inference.

```js
const View = () => {
  const control = Controller.useOnly("foo", "bar");
  // ...
}
```

<br/>

#### `.use().not()` / `.useExcept()` / `.getExcept()`

Declare properties you want to exclude. *May also be chained with `on()`*

```js
const View = () => {
  const { foo, bar } = Controller.useExcept("bar");

  return <span>{foo}</span>;
}
```
> This will only update when `foo` is updated, even though `bar` is definitely accessed.

<br/>
<br/>

# Live demos

<br/>

Try it for yourself! Demo project is in the `/examples` directory with a series of examples you can launch, browse through and modify.

```bash
git clone https://github.com/gabeklein/use-controller.git
cd use-controller
npm install
npm start
```

<br/>

### 🚧 More ideas are currently under construction, so stay tuned! 🏗

<br/>

# License

MIT license. <br/>