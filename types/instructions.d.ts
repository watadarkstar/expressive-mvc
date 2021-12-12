import Model from '.';
import { Async, Class, InstanceOf, InterceptCallback } from './types';

/**
 * Run instruction as controller sets itself up.
 * This will specialize the behavior of a given property.
 **/
export function apply <T = any> (instruction: Model.Instruction<T>, name?: string): T;

/**
 * Creates a new child-instance of specified controller.
 *
 * @param Peer - Type of Model to create and apply to host property.
 * @param callback - Fired after controller is created and ready for use.
 */
export function use <T extends Class> (Peer: T, callback: (i?: InstanceOf<T>) => void): InstanceOf<T> | undefined;

/**
 * Creates a new child-instance of specified controller.
 *
 * @param Peer - Type of Model to create and apply to host property.
 * @param required - Property should be non-nullable, will throw if value is set to undefined.
 */
export function use <T extends Class> (Peer: T, required: false): InstanceOf<T> | undefined;
export function use <T extends Class> (Peer: T, required?: true): InstanceOf<T>;

/**
 * Creates a new child-instance of specified controller.
 *
 * @param factory - Generate model for use.
 * @param callback - Fired after controller is created and ready for use.
 */
export function use <T extends Model | undefined> (factory: () => T, callback?: (i: T) => void): T;

/**
 * Create a child-instance relationship with provided model.
 *
 * Note: If `peer` is not already initialized before parent is
 * (created with `new` as opposed to create method), that model will
 * attach this via `parent()` instruction. It will not howerver, if
 * already active.
 *
 * @param factory - Instance of model to attach.
 * @param callback - Fired after controller is attached.
 */
export function use <T extends Model> (peer: T, callback?: (i: T) => void): T;

/**
 * Create a placeholder for specified Model type.
 */
export function use <T extends Model> (): T | undefined;

/**
 * Generate a child controller from specified object. Object's values are be trackable, as would be for a full-model.
 *
 * Note: Child will *not* be same object as one provided.
 */
export function use <T extends {}> (object: T): T;

/**
 * Generic instruction used by `use()` and `tap()` for recursive subscription.
 *
 * @param from - Instruction body is run upon parent create. Return function to fetch current value of field.
 */
export function child <T extends Model> (from: (this: Model.Controller, key: string) => () => T | undefined): T;
 
/**
 * Fetches and assigns the controller which spawned this host.
 * When parent assigns an instance via `use()` directive, it
 * will be made available to child upon this request.
 *
 * @param Expects - Type of controller compatible with this class. 
 * @param required - Throw if controller is created independantly.
 */
export function parent <T extends typeof Model> (Expects: T, required: true): InstanceOf<T>;
export function parent <T extends typeof Model> (Expects: T, required?: false): InstanceOf<T> | undefined;

/**
 * Find and attach most applicable instance of Model via context.
 * 
 * Host controller will search element-hierarchy relative to where it spawned.
 * 
 * @param Type - Type of model to find from context
 * @param callback -
 *  - Invoked after context is scanned, is passed result - either found or undefined.
 *  - If argument is inadequate, but required, your implemention should simply throw.
 *  - If inadequate and not required, conditionally return false.
 */
export function tap <T extends typeof Model> (Type: T, callback?: (instance?: InstanceOf<T>) => void | true): InstanceOf<T>;
export function tap <T extends typeof Model> (Type: T, callback?: (instance?: InstanceOf<T>) => void | false): InstanceOf<T> | undefined;
 
/**
 * Find and attach most applicable instance of Model via context.
 *
 * Expects a `<Provider>` of target controller to exist. 
 * Host controller will search element-hierarchy relative to where it spawned.
 *
 * @param Type - Type of controller to attach to property. 
 * @param required - Throw if instance of Type cannot be found.
 */
export function tap <T extends Class> (Type: T, required?: boolean): InstanceOf<T>;

/**
 * Cause property to synchronously run effect upon update.
 * 
 * Callback may return an effect callback, Promise (ignored), or a boolean.
 * 
 * If a boolean is returned explicitly, new value will be dropped. Useful to override.
 * 
 * - `false` will prevent update.
 * - `true` will emit update (unchanged).
 *
 * @param initialValue - Beginning value of host property.
 * @param onUpdate - Effect-callback fired upon set of host property.
 */
export function on <T> (initialValue: undefined, onUpdate: InterceptCallback<T>): T | undefined;
export function on <T> (initialValue: T, onUpdate: InterceptCallback<T>): T;
export function on <T, S> (initialValue: undefined, onUpdate: InterceptCallback<T, S>): T | undefined;
export function on <T, S> (initialValue: T, onUpdate: InterceptCallback<T, S>): T;

/** Object with references to all managed values of `T`. */
export type Refs <T extends Model> = { [P in Model.Fields<T>]: Model.Ref<T[P]> };

/**
 * Creates an object with references to all managed values.
 * Each property will set value in state when invoked.
 *
 * *Properties are simultaneously a ref-function and ref-object, use as needed.*
 *
 * @param target - Source model from which to reference values.
 */
export function ref <T extends Model> (target: T): Refs<T>;

/**
 * Creates a ref-compatible property.
 * Will persist value, and updates to this are made part of controller event-stream.
 *
 * *Output is simultaneously a ref-function and ref-object, use as needed.*
 *
 * @param callback - Optional callback to synchronously fire when reference is first set or does update.
 */
export function ref <T = HTMLElement> (callback?: InterceptCallback<T>): Model.Ref<T>;
export function ref <T, S> (callback?: InterceptCallback<T, S>): Model.Ref<T>;

/**
 * Sets an exotic method with managed ready-state. Property accepts an async function.
 *
 * When an act-method is invoked, its `active` property to true for duration of call.
 * This is emitted as an update to property, both when called and after returns (or throws).
 *
 * **Note:** Subsequent calls will immediately throw if one is still pending.
 *
 * @param action - Action to fire when resulting property is invoked.
 */
export function act (action: Async): typeof action & { active: boolean };
export function act <S> (action: Async<S>): typeof action & { active: boolean };

/**
 * Implement a computed value; output is returned by function from provided factory.
 *
 * @param compute - Factory function to generate a getter to subscribe dependancies.
 */
export function from <R> (compute: (property: string) => <T>(this: T, state: T) => R): R;
export function from <R, T> (compute: (property: string) => (this: T, state: T) => R): R;

/**
 * Implement a computed value; output will be generated by provided function.
 *
 * @param source - Source Model to find and subscribe to, for input.
 * 
 * @param compute - Compute function. Bound to a subscriber-proxy of source, returns output value.
 * Will update automatically as input values change.
 */
export function from <T extends Class, R> (source: T, compute: (this: InstanceOf<T>, on: InstanceOf<T>) => R): R;

/**
 * Implement a computed value; output will be generated by provided function.
 *
 * @param source - Source model from which computed value will be a subscriber.
 * 
 * @param compute - Compute function. Bound to a subscriber-proxy of source, returns output value.
 * Will update automatically as input values change.
 */
export function from <R, T> (source: T, compute: (this: T, on: T) => R): R;

/**
 * Memoized value. Computes and stores a value returned by provided factory. 
 * Equivalent to a getter, sans the automatic updates.
 *
 * @param compute - Factory for memoized value.
 * @param lazy - Wait until accessed to introduce value.
 */
export function memo <R> (compute: () => R, lazy?: boolean): R;
export function memo <R, T> (compute: (this: T) => R, lazy?: boolean): R;
 
/**
 * Flag property as not to be tracked. Useful if changes often with no real-time impact.
 *
 * @param value - starting value of property.
 */
export function lazy <T> (value?: T): T;

/**
 * Pending value. Will suspend unless value is defined,
 * suspense resolves when a value is aquired. 
 */
export function pending <T = boolean> (): T;

/**
 * Suspend during the execution of given function to obtain value.
 * 
 * @param waitFor - Async function to suspend for.
 */
export function pending (waitFor: () => Promise<void>): undefined;
export function pending <T> (waitFor: (this: T) => Promise<void>): undefined;
export function pending <R> (waitFor: () => Promise<R>): R;
export function pending <R, T> (waitFor: (this: T) => Promise<R>): R;

/**
 * Suspend for a computed value, returned by syncronous function.
 *
 * If accessed while computing to undefined, will throw a promise. Function is subscribed
 * and will re-evaluate anytime used properties change. Once function returns any value,
 * outstanding promises resolve and are not thrown on subsequent access of this property.
 * 
 * Similar to `from`, compute function will only run when inputs change and not upon access.
 *
 * This behavior is recursive. If return value _becomes_ undefined, property
 * access will throw Promises again, awaiting its next value.
 *
 * @param source - Source object, from which computed value will be a subscriber.
 *
 * @param compute - Compute function returns output value. Bound to a subscriber of source.
 * Will re-run automatically as input values change.
 */
 export function pending <R, T> (source: T, compute: (this: T, on: T) => R): R;