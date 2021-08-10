import * as Computed from './compute';
import { Controller } from './controller';
import { issues } from './issues';
import { LOCAL, Model, Stateful } from './model';
import { Subscriber } from './subscriber';
import { define, defineLazy, defineProperty, getOwnPropertyDescriptor, setAlias } from './util';

export const Oops = issues({
  DuplicateAction: (key) =>
    `Invoked action ${key} but one is already active.`
})

type Instruction<T> = (on: Controller, key: string) =>
    void | ((within?: Subscriber) => T) | PropertyDescriptor;

export const Pending = new Map<symbol, Instruction<any>>();

export function run<T = any>(
  instruction: Instruction<any>,
  name = "pending"){

  const placeholder = Symbol(`${name} instruction`);
  Pending.set(placeholder, instruction);
  return placeholder as unknown as T;
}

export function set<T>(instruction: Instruction<T>, name?: string){
  const memo = new WeakMap<Subscriber, any>();

  return run((on, key) => {
    const output = instruction(on, key);

    if(typeof output == "function")
      return sub => {
        if(!sub)
          return output();
        
        if(!memo.has(sub))
          memo.set(sub, output(sub));

        return memo.get(sub);
      }
    else
      return output;
  }, name);
}

export function apply(
  on: Controller, key: string, value: symbol){

  const instruction = Pending.get(value);

  if(instruction){
    const { subject } = on as any;

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
}

export function ref<T = any>(
  effect?: EffectCallback<Model, any>): { current: T } {

  return run((on, key) => {
    const refObjectFunction = on.sets(key, effect);

    defineProperty(refObjectFunction, "current", {
      set: refObjectFunction,
      get: () => on.state[key]
    })

    return { value: refObjectFunction };
  }, "ref");
}

export function on<T = any>(
  value: any, effect?: EffectCallback<Model, T>): T {

  return run((on, key) => {
    if(!effect){
      effect = value;
      value = undefined;
    }

    on.manage(key, value, effect);
  }, "on");
}

export function memo<T>(factory: () => T, defer?: boolean): T {
  return run((on, key) => {
    const get = () => factory.call(on.subject);

    if(defer)
      defineLazy(on.subject, key, get);
    else
      define(on.subject, key, get())
  }, "memo");
}

export function lazy<T>(value: T): T {
  return run((on, key) => {
    const { state, subject } = on as any;

    subject[key] = value;
    defineProperty(state, key, {
      get: () => subject[key]
    });
  }, "lazy");
}

export function act<T extends Async>(task: T): T {
  return run((on, key) => {
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
  }, "act");
}

export function from<T>(getter: (on?: Model) => T): T {
  return run((on, key) => {
    Computed.prepare(on, key, getter);
  }, "from");
}