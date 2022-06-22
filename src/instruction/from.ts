import { Controller } from '../controller';
import { issues } from '../issues';
import { Stateful } from '../model';
import { ensure } from '../stateful';
import { Subscriber } from '../subscriber';
import { suspend } from '../suspense';
import { Callback } from '../types';
import { apply } from './apply';

export const Oops = issues({
  BadSource: (model, property, got) =>
    `Bad from-instruction provided to ${model}.${property}. Expects an arrow-function or a Model as source. Got ${got}.`,

  PeerNotAllowed: (model, property) =>
    `Attempted to use an instruction result (probably use or tap) as computed source for ${model}.${property}. This is not possible.`,

  Failed: (parent, property, initial) =>
    `An exception was thrown while ${initial ? "initializing" : "refreshing"} [${parent}.${property}].`,

  Early: (property) => 
    `Note: Computed values don't run until accessed, except when subscribed to. '${property}' getter may have run earlier than intended.`
});

type GetterInfo = {
  key: string;
  parent: Controller;
  priority: number;
}

const EARLY = new WeakSet<Controller>();
const INFO = new WeakMap<Function, GetterInfo>();
const USED = new WeakMap<Controller, Map<string, GetterInfo>>();
const KEYS = new WeakMap<Set<string>, Callback[]>();

declare namespace from {
  type Function<T, O=any> = (this: O, on: O) => T;
  type Factory<T, O=any> = (key: string) => Function<T, O>;
  type Getter = (controller: Controller, key: string) => any;
}

/**
 * Implement a computed value; output will be generated by provided function.
 *
 * @param source - Source model from which computed value will be a subscriber.
 * @param compute - Compute function. Bound to a subscriber-proxy of source, returns output value. Will update automatically as input values change.
 * @param suspend - Value will throw suspense when evaulating to undefined.
 */
function from <R, T> (source: T, compute: (this: T, on: T) => R, suspend: true): Exclude<R, undefined>;
function from <R, T> (source: T, compute: (this: T, on: T) => R, suspend?: boolean): R;

/**
 * Implement a computed value; output is returned by function from provided factory.
 *
 * @param compute - Factory function to generate a getter to subscribe dependancies.
 * @param suspend - Value will throw suspense when evaulating to undefined.
 */
function from <R, T> (compute: (property: string) => (this: T, state: T) => R, suspend: true): Exclude<R, undefined>;
function from <R, T> (compute: (property: string) => (this: T, state: T) => R, suspend?: boolean): R;

function from<R, T>(
  source: from.Factory<T> | Stateful,
  arg1?: from.Function<T> | boolean,
  arg2?: boolean): R {

  return apply(
    function from(key){
      const parent = this;
      const { subject, state } = this;

      let getSource: () => Controller;
      let required = arg2 === true || arg1 === true;

      if(typeof arg1 == "boolean")
        arg1 = undefined;

      // Easy mistake, using a peer, will always be unresolved.
      if(typeof source == "symbol")
        throw Oops.PeerNotAllowed(subject, key);

      // replace source controller in-case it is different
      if(typeof source == "object")
        getSource = () => ensure(source);

      // specifically an arrow function (getter factory)
      else if(!source.prototype){
        arg1 = source.call(subject, key);
        getSource = () => this;
      }

      // Regular function is too ambiguous so not allowed.
      else
        throw Oops.BadSource(subject, key, source);

      let sub: Subscriber;

      const setter = arg1;
      const info: GetterInfo = { key, parent, priority: 1 };

      let register = USED.get(parent)!;

      if(!register){
        register = new Map<string, GetterInfo>();
        USED.set(parent, register);
      }

      register.set(key, info);
      state.set(key, undefined);

      function compute(initial?: boolean){
        try {
          return setter!.call(sub.proxy, sub.proxy);
        }
        catch(err){
          Oops.Failed(subject, key, !!initial).warn();
          throw err;
        }
      }

      function update(){
        let value;

        try {
          value = compute(false);
        }
        catch(e){
          console.error(e);
        }
        finally {
          if(state.get(key) !== value){
            parent.update(key, value);
            return value;
          }
        }
      }

      function defer(_key: string | null, from: Controller){
        let pending = KEYS.get(from.frame!);

        if(!pending)
          KEYS.set(from.frame!, pending = []);

        if(info.parent !== from)
          update();
        else {
          const after = pending.findIndex(peer => (
            info.priority > INFO.get(peer)!.priority
          ));

          pending.splice(after + 1, 0, update);
        }
      }

      function create(){
        sub = new Subscriber(getSource(), defer);

        try {
          const value = compute(true);
          state.set(key, value);
          return value;
        }
        catch(e){
          if(EARLY.has(parent))
            Oops.Early(key).warn();

          throw e;
        }
        finally {
          sub.commit();

          for(const key in sub.watch){
            const peer = register.get(key);

            if(peer && peer.priority >= info.priority)
              info.priority = peer.priority + 1;
          }
        }
      }

      INFO.set(update, info);

      return () => {
        const value = sub ? state.get(key) : create();

        if(value === undefined && required)
          throw suspend(this, key);

        return value;
      }
    }
  )
}

export function evaluate(on: Controller, keys: string[]){
  EARLY.add(on);

  for(const key of keys)
    try {
      void on.subject[key];
    }
    catch(e){}

  EARLY.delete(on);
}

export function flush(frame: Set<string>){
  const pending = KEYS.get(frame);

  if(!pending)
    return;

  while(pending.length){
    const compute = pending.shift()!;
    const { key } = INFO.get(compute)!;

    if(!frame.has(key))
      compute();
  }

  KEYS.delete(frame);
}

export { from }