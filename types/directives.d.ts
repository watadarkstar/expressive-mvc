import Controller from '.';

declare namespace Directives {
  /**
   * Creates a new child-instance of specified controller.
   * 
   * @param Peer - Type of Controller to create and apply to host property.
   * @param callback - Fired after controller is created and ready for use.
   */
  export function setChild <T extends typeof Controller> (Peer: T, callback?: (i: InstanceOf<T>) => void): InstanceOf<T> 

  /**
   * Fetches and assigns the controller which spawned this host.
   * When parent assigns an instance via `use()` directive, it
   * will be made available to child upon this request.
   * 
   * @param Expects - Type of controller compatible with this class. 
   * @param required - Throw if controller is created independantly.
   */
  export function setParent <T extends typeof Controller> (Expects: T, required: true): InstanceOf<T>;
  export function setParent <T extends typeof Controller> (Expects: T, required?: false): InstanceOf<T> | undefined;
  
  /**
   * Find and attach most applicable instance of Controller via context.
   * 
   * Expects a `<Provider>` of target controller to exist. 
   * Host controller will search element-hierarchy relative to where it spawned.
   */
  export function setPeer <T extends Class> (type: T): InstanceOf<T>;
  
  /**
   * Sets property to synchronously call an effect upon update (much like a setter).
   * 
   * **Note:** Use generic-type to specifiy property signature. 
   * Value will always start off as undefined. 
   * 
   * @param callback - Effect-callback fired upon update of host property.
   */
  export function setEffect <T = any> (callback: EffectCallback<T>): T | undefined;

  /**
   * Sets property to synchronously call effect upon update.
   * 
   * @param starting - Beginning value of host property.
   * @param callback - Effect-callback fired upon set of host property.
   */
  export function setEffect <T = any> (starting: T, callback: EffectCallback<T>): T;
  
  /**
   * Creates a ref-object for use with components.
   * Will persist value, and updates to this ref are part of controller event-stream.
   * 
   * @param callback - Optional callback to synchronously fire when reference is first set or does update.
   */
  export function setReference <T = HTMLElement> (callback?: EffectCallback<T>): { current: T | null };
  
  /**
   * Sets an exotic method with provided logic. Property accepts an async function.
   * 
   * When set method is invoked, it is set to undefined (and `allowed` property to false), for duration of call.
   * The update is broadcast to event-stream, respectively when function is called and then returns (or throws).
   * 
   * The result of this behavior is managed ready-state.
   * If key-value is undefined, you know method is in-progress. Same if `allowed === false`.
   * 
   * **Important:** - Subsequent calls (where may be closured) will immediately throw if one is still pending.
   * 
   * @param action - Action to fire when resulting property is invoked.
   */
  export function setAction <T extends Async>(action: T): T & { allowed: boolean } | undefined;
  
  /**
   * Assigns a shortcut to trigger host-property event.
   * Calls to function will invoke optional callback,
   * then force-emit key, emulating a normal update.
   * 
   * @param callback - Effect callback when event is triggered.
   */
  export function setEvent (callback?: EffectCallback<any>): Callback;
  
  /**
   * Memoized value. Computes and stores a value returned by provided factory. 
   * Equivalent to a getter, sans the automatic updates.
   * 
   * @param compute - Factory for memoized value.
   * @param lazy - Wait until accessed to introduce value.
   */
  export function setMemo <T> (compute: () => T, lazy?: boolean): T;
  
  /**
   * Spawns read-only array/object of specified shape.
   * 
   * Updates to property are compared to existing value.
   * Will squash update if all fields are strict-equal, or either old-new values are undefined.
   * 
   * @param initial - Starting value of property. May be an object or array.
   */
  export function setTuple <T extends readonly any[] = []> (): Readonly<T> | undefined;
  export function setTuple <T extends readonly any[]> (initial: T): Readonly<T>;
  export function setTuple <T extends {}> (initial: T): Readonly<T>;

  /**
   * Spawns read-only array/object of specified shape.
   * 
   * Updates to property are compared to existing value.
   * Will squash update if all fields are strict-equal, or either old-new values are undefined.
   * 
   * @param values - Arguments are set to initial array's values.
   */
  export function setTuple <T extends readonly any[]> (...values: T): Readonly<T>;
  
  /**
   * Default value of property.
   * 
   * This, unlike naked instance-properties, allows an inheritor's getter to override this value.
   * 
   * @param value
   */
  export function setValue <T> (value: T): T; 
  
  /**
   * Flag property as not to be tracked. Useful if changes often with no real-time impact.
   * 
   * @param value - starting value of property.
   */
  export function setIgnored <T> (value?: T): T;
  
  /**
   * Generate custom HOC to which host controller is provided.
   * 
   * @param component - Component which may recieve host controller as context parameter.
   */
  export function setComponent <T extends Controller, P> (component: Controller.Component<P, T>): React.ComponentType<P>;
  
  /**
   * Generates custom `Provider` using specified component.
   * Component receives instance of host under its context parameter.
   * 
   * **Note:** Props forwarded rather than sent to host controller, as with built-in.
   * 
   * @param component - Component which defines body of custom provider.
   */
  export function setParentComponent <T extends Controller, P> (component: Controller.Component<P, T>): React.ComponentType<P>;
  
  /**
   * Generates a bound component useable within FC's, using hooked instance of host controller.
   * 
   * Updates to property will *directly affect resulting element in real-time*,
   * and ***does not trigger a render*** of the component where used.
   * 
   * This makes it easy to present data points which may change extremely often,
   * while also avoiding an expensive render-cycle.
   * 
   * @param Component - Compatible component to which a forwarded ref is accepted.
   * @param to - Property which bound component shall bind to.
   */
  export function setBoundComponent <P, T = HTMLElement> (Component: Controller.Component<P, T>, to: string): React.ComponentType<P>;
}

export = Directives;