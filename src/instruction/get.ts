import { getRecursive } from '../children';
import { Control, control } from '../control';
import { issues } from '../helper/issues';
import { Callback } from '../helper/types';
import { Model } from '../model';
import { Subscriber } from '../subscriber';
import { add } from './add';

export const Oops = issues({
  Required: (expects, child) => 
    `New ${child} created standalone but requires parent of type ${expects}. Did you remember to create via use(${child})?`,

  PeerNotAllowed: (model, property) =>
    `Attempted to use an instruction result (probably use or get) as computed source for ${model}.${property}. This is not allowed.`,

  Failed: (parent, property, initial) =>
    `An exception was thrown while ${initial ? "initializing" : "refreshing"} [${parent}.${property}].`
});

declare namespace get {
  type Function<T, S = any> = (this: S, on: S) => T;
  type Factory<R, T> = (this: T, property: string, on: T) => Function<R, T>;
}

/**
 * Fetches and assigns the controller which spawned this host.
 * When parent assigns an instance via `use()` directive, it
 * will be made available to child upon this request.
 *
 * @param Type - Type of controller compatible with this class. 
 * @param required - Throw if controller is created independantly.
 */
function get <T extends Model> (Type: Model.Type<T>, required?: true): T;
function get <T extends Model> (Type: Model.Type<T>, required: boolean): T | undefined;

function get <R, T extends Model> (Type: Model.Type<T>, compute: (this: T, on: T) => R): Exclude<R, undefined>;
function get <R, T extends Model> (Type: Model.Type<T>, compute: (this: T, on: T) => R): R;

/**
 * Implement a computed value; output will be generated by provided function.
 *
 * @param source - Source model from which computed value will be a subscriber.
 * @param compute - Compute function. Bound to a subscriber-proxy of source, returns output value. Will update automatically as input values change.
 */
function get <R, T> (source: T, compute: (this: T, on: T) => R): Exclude<R, undefined>;
function get <R, T> (source: T, compute: (this: T, on: T) => R): R;

/**
 * Implement a computed value; output is returned by function from provided factory.
 *
 * @param compute - Factory function to generate a getter to subscribe dependancies.
 */
function get <R, T> (compute: (property: string, on: T) => (this: T, state: T) => R): Exclude<R, undefined>;
function get <R, T> (compute: (property: string, on: T) => (this: T, state: T) => R): R;
 
function get<R, T extends Model>(
  arg0: get.Factory<R, T> | Model.Type<T> | T,
  arg1?: get.Function<R, T> | boolean): R {

  return add(
    function get(key){
      const { subject, state } = this;

      // Easy mistake, using a peer, will always be unresolved.
      if(typeof arg0 == "symbol")
        throw Oops.PeerNotAllowed(subject, key);

      let source: Model | undefined;
      const sourceRequired = arg1 !== false;

      if(Model.isTypeof(arg0))
        arg0.findForGetInstruction(subject, got => {
          if(got){
            // TODO: remove
            if(typeof arg1 !== "function"){
              state.set(key, got);
              this.update(key);
            }

            source = got;
          }
          else if(sourceRequired)
            throw Oops.Required(arg0.name, subject);
        });
      else if(typeof arg0 == "function"){
        arg1 = arg0.call(subject, key, subject);
        source = subject;
      }
      else if(typeof arg1 == "function"){
        source = arg0;
      }
      else
        throw new Error(`Factory argument cannot be ${arg1}`);

      if(typeof arg1 == "function")
        return getComputed(key, this, () => source, arg1);
      else {
        // TODO: remove fixes suspense test
        if(arg1 === false)
          state.set(key, source);

        return getRecursive(key, this);
      }
    }
  )
}

function getComputed<T>(
  key: string,
  parent: Control,
  source: () => Model | undefined,
  setter: get.Function<T, any>){

  const { state } = parent;

  let sub: Subscriber;
  let order = ORDER.get(parent)!;
  let pending = KEYS.get(parent)!;
  let instance: Model;

  if(!order)
    ORDER.set(parent, order = new Map());

  if(!pending)
    KEYS.set(parent, pending = new Set());

  const compute = (initial: boolean) => {
    try {
      return setter.call(sub.proxy, sub.proxy);
    }
    catch(err){
      Oops.Failed(instance, key, initial).warn();
      throw err;
    }
  }

  const create = () => {
    const got = source();

    if(!got)
      throw new Error("TODO: Implement suspense.")

    instance = got;

    sub = new Subscriber(control(instance), (_, control) => {
      if(control !== parent)
        refresh();
      else
        pending.add(refresh);
    });

    sub.watch.set(key, false);

    try {
      const value = compute(true);
      state.set(key, value);
      return value;
    }
    finally {
      sub.commit();
      order.set(refresh, order.size);
    }
  }

  const refresh = () => {
    let value;

    try {
      value = compute(false);
    }
    catch(e){
      console.error(e);
    }
    finally {
      if(state.get(key) !== value){
        state.set(key, value);
        parent.update(key);
        return value;
      }
    }
  }

  INFO.set(refresh, key);

  return () => {
    if(pending.has(refresh)){
      pending.delete(refresh)
      refresh();
    }

    return sub ? state.get(key) : create();
  }
}

const INFO = new WeakMap<Callback, string>();
const KEYS = new WeakMap<Control, Set<Callback>>();
const ORDER = new WeakMap<Control, Map<Callback, number>>();

export function flush(control: Control){
  const pending = KEYS.get(control);

  if(!pending || !pending.size)
    return;

  const priority = ORDER.get(control)!;

  while(pending.size){
    let compute!: Callback;

    for(const item of pending)
      if(!compute || priority.get(item)! < priority.get(compute)!)
        compute = item;

    pending.delete(compute);

    const key = INFO.get(compute)!;

    if(!control.frame.has(key))
      compute();
  }

  pending.clear();
}

export { get }