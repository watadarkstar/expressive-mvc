import { Controller } from './controller';
import { issues } from './issues';
import { Subscriber } from './subscriber';
import { defineProperty, getOwnPropertyDescriptor, setAlias } from './util';

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
const ComputedUsed = new WeakMap<Controller, Map<string, GetterInfo>>();
const ComputedKeys = new WeakMap<Controller, Callback[]>();

export function prepare(
  parent: Controller,
  key: string,
  source: () => Controller,
  setter: (on?: any) => any,
  getter?: (value: any, key: string) => any){

  let sub: Subscriber;

  const { state, subject } = parent;
  const info: GetterInfo = { key, parent, priority: 1 };

  const current = getter
    ? () => getter.call(subject, state[key], key)
    : () => state[key];

  const prioritize = register(parent, key, info);

  function compute(initial?: boolean){
    try {
      return setter.call(sub.proxy, sub.proxy);
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
        parent.update(key, value);
        return value;
      }
    }
  }

  function create(early?: boolean){
    sub = new Subscriber(source(), update);

    defineProperty(state, key, {
      value: undefined,
      writable: true
    })

    defineProperty(subject, key, {
      enumerable: true,
      configurable: true,
      get: current
    });

    try {
      state[key] = compute(true);
    }
    catch(e){
      if(early)
        Oops.ComputedEarly(key).warn();

      throw e;
    }
    finally {
      sub.commit();

      for(const key in sub.follows)
        prioritize(key);
    }

    return current();
  }

  setAlias(update, `try ${key}`);
  setAlias(create, `new ${key}`);
  setAlias(setter, `run ${key}`);

  ComputedInit.add(create);
  ComputedInfo.set(update, info);

  for(const on of [state, subject])
    defineProperty(on, key, {
      get: create,
      configurable: true,
      enumerable: true
    })
}

function register(
  on: Controller,
  key: string,
  info: GetterInfo){

  let register = ComputedUsed.get(on)!;

  if(!register)
    ComputedUsed.set(on, 
      register = new Map<string, GetterInfo>()
    );

  register.set(key, info);

  return (key: string) => {
    const peer = register.get(key);

    if(peer && peer.priority >= info.priority)
      info.priority = peer.priority + 1;
  }
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
  const callback = request as Callback;

  if(!compute)
    return;

  let pending = ComputedKeys.get(on);

  if(!pending)
    ComputedKeys.set(on, pending = []);

  if(compute.parent !== on)
    callback();
  else {
    const queue = pending.findIndex(peer =>
      compute.priority > ComputedInfo.get(peer)!.priority
    );

    pending.splice(queue + 1, 0, callback);
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