import { Controller } from './controller';
import { issues } from './issues';
import { Model } from './model';
import { Subscriber } from './subscriber';
import { defineProperty, entriesIn, getOwnPropertyDescriptor, getPrototypeOf, setAlias } from './util';

export const Oops = issues({
  ComputeFailed: (parent, property, initial) =>
    `An exception was thrown while ${initial ? "initializing" : "refreshing"} [${parent}.${property}].`,

  ComputedEarly: (property) => 
    `Note: Computed values don't run until accessed, except when subscribed to. '${property}' getter may have run earlier than intended.`
})

type GetterInfo = {
  key: string;
  parent: Controller;
  priority: number;
}

const ComputedInit = new WeakSet<Function>();
const ComputedInfo = new WeakMap<Function, GetterInfo>();
const ComputedFor = new WeakMap<Controller, Map<string, GetterInfo>>();
const ComputedKeys = new WeakMap<Controller, RequestCallback[]>();

export function bootstrap(on: Controller){
  const defined = new Map<string, GetterInfo>();
  let scan = on.subject;

  ComputedFor.set(on, defined);

  while(scan !== Model && scan.constructor !== Model){
    for(let [key, { get, set }] of entriesIn(scan))
      if(get && !defined.has(key))
        defined.set(key, 
          prepare(on, key, get, set)
        );

    scan = getPrototypeOf(scan)
  }
}

export function prepare(
  on: Controller,
  key: string,
  getter: (on?: any) => any,
  setter?: (to: any) => void){

  const { state, subject } = on;
  const info: GetterInfo = {
    key, parent: on, priority: 1
  };

  let sub: Subscriber;

  function compute(initial?: boolean){
    try {
      return getter.call(sub.proxy, sub.proxy);
    }
    catch(err){
      Oops.ComputeFailed(subject, key, !!initial).warn();
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
      if(state[key] !== value){
        on.update(key);
        return state[key] = value;
      }
    }
  }

  function create(early?: boolean){
    sub = new Subscriber(on, update);

    ComputedInfo.set(update, info);

    defineProperty(state, key, {
      value: undefined,
      writable: true
    })

    defineProperty(subject, key, {
      enumerable: true,
      configurable: true,
      get: () => state[key],
      set: setter
    });

    try {
      return state[key] = compute(true);
    }
    catch(e){
      if(early)
        Oops.ComputedEarly(key).warn();

      throw e;
    }
    finally {
      let defined = ComputedFor.get(on)!;

      sub.commit();

      for(const key in sub.follows){
        const compute = defined.get(key);

        if(compute && compute.priority >= info.priority)
          info.priority = compute.priority + 1;
      }
    }
  }

  function revert(value: any){
    delete state[key];
    defineProperty(subject, key, {
      enumerable: true,
      configurable: true,
      value
    });
  }

  setAlias(update, `try ${key}`);
  setAlias(create, `new ${key}`);
  setAlias(getter, `run ${key}`);

  ComputedInit.add(create);

  for(const on of [state, subject])
    defineProperty(on, key, {
      get: create,
      set: setter || revert,
      configurable: true,
      enumerable: true
    })

  return info;
}

export function ensure(on: Controller, keys: string[]){
  type Initial = (early?: boolean) => void;

  for(const key of keys){
    const desc = getOwnPropertyDescriptor(on.subject, key);
    const getter = desc && desc.get;
  
    if(ComputedInit.has(getter!))
      (getter as Initial)(true);
  }
}

export function capture(on: Controller, request: RequestCallback){

  const compute = ComputedInfo.get(request);

  if(!compute)
    return;

  let pending = ComputedKeys.get(on);

  if(!pending)
    ComputedKeys.set(on, pending = []);

  if(compute.parent !== on)
    request();
  else {
    const byPriorty = (sib: Function) =>
      compute.priority > ComputedInfo.get(sib)!.priority;

    pending.splice(pending.findIndex(byPriorty) + 1, 0, request);
  }

  return true;
}

export function flush(on: Controller){
  const handled = on.frame!;
  let pending = ComputedKeys.get(on);

  if(pending){
    while(pending.length){
      const compute = pending.shift()!;
      const { key } = ComputedInfo.get(compute)!;

      if(!handled.has(key))
        compute();
    }
  
    ComputedKeys.delete(on);
  }
}