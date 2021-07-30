import { prepareComputed } from './compute';
import { Controller } from './controller';
import { issues } from './issues';
import { LOCAL, Model, Stateful } from './model';
import { Subscriber } from './subscriber';
import { define, defineLazy, defineProperty, getOwnPropertyDescriptor, setAlias } from './util';

import type Public from '../types';

export const Oops = issues({
  DuplicateAction: (key) =>
    `Invoked action ${key} but one is already active.`
})

export const Pending = new Map<symbol, Public.Instruction<any>>();

export function set(
  instruction: Public.Instruction<any>,
  name = "pending"){

  const placeholder = Symbol(`${name} instruction`);
  Pending.set(placeholder, instruction);
  return placeholder as any;
}

export function isInstruction(maybe: any): maybe is symbol {
  return Pending.has(maybe);
}

export function runInstruction
  (on: Controller, key: string, value: symbol){

  const { subject } = on as any;
  const instruction = Pending.get(value)!;

  Pending.delete(value);
  delete subject[key];

  let output = instruction(on, key);

  if(typeof output == "function"){
    const existing = getOwnPropertyDescriptor(subject, key);
    const getter = output as (sub: Subscriber | undefined) => any;

    output = {
      ...existing,
      get(this: Stateful){
        return getter(this[LOCAL]);
      }
    }
  }

  if(output)
    defineProperty(subject, key, output);

  return true;
}

export function ref<T = any>
  (effect?: EffectCallback<Model, any>): { current: T } {

  function refProperty(on: Controller, key: string){
    const refObjectFunction = on.sets(key, effect);

    defineProperty(refObjectFunction, "current", {
      set: refObjectFunction,
      get: () => on.state[key]
    })

    return { value: refObjectFunction };
  }

  return set(refProperty, "ref");
}

export function on<T = any>
  (value: any, effect?: EffectCallback<Model, T>): T {

  function watchProperty(on: Controller, key: string){
    if(!effect){
      effect = value;
      value = undefined;
    }

    on.manage(key, value, effect);
  }

  return set(watchProperty, "on");
}

export function memo
  (factory: () => any, defer?: boolean){

  function memoized(on: Controller, key: string){
    const get = () => factory.call(on.subject);

    if(defer)
      defineLazy(on.subject, key, get);
    else
      define(on.subject, key, get())
  }

  return set(memoized, "memo");
}

export function lazy(value: any){
  function lazyValue(on: Controller, key: string){
    const { state, subject } = on as any;

    subject[key] = value;
    defineProperty(state, key, {
      get: () => subject[key]
    });
  }

  return set(lazyValue, "lazy");
}

export function act(task: Async){
  function asyncFunction(on: Controller, key: string){
    let pending = false;

    function invoke(...args: any[]){
      if(pending)
        return Promise.reject(
          Oops.DuplicateAction(key)
        )

      pending = true;
      on.update(key);

      return new Promise(res => {
        res(task.apply(on.subject, args));
      }).finally(() => {
        pending = false;
        on.update(key);
      })
    };

    setAlias(invoke, `run ${key}`);
    defineProperty(invoke, "active", {
      get: () => pending
    })

    return {
      value: invoke,
      writable: false
    };
  }

  return set(asyncFunction, "act");
}

export function from(fn: (on?: Model) => any){
  function computedProperty(on: Controller, key: string){
    prepareComputed(on, key, fn);
  }

  return set(computedProperty, "from");
}