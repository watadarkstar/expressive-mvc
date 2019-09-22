import {
  useEffect,
  useRef,
  MutableRefObject,
} from 'react';

import { Controller, ModelController } from './controller';
import { applyDispatch } from './subscription';
import { Lifecycle, Class } from './types.d';
import { useSubscriber } from './subscriber';

const {
  create,
  defineProperty: define,
  getOwnPropertyDescriptor: describe,
  getOwnPropertyNames: keysIn,
  getPrototypeOf: proto
} = Object;

const RESERVED = [ 
  "add",
  "constructor", 
  "didMount", 
  "didHook",
  "export",
  "not",
  "on",
  "only",
  "once",
  "Provider",
  "refresh",
  "set",
  "willUnmount", 
  "willHook"
];

export function useModelController(init: any, ...args: any[]){
  const control = useController(init, args, Object.prototype);
  return useSubscriber(control);
}

export function useController( 
  model: Class | Function,
  args: any[] = [],
  superType: any = Controller.prototype
): ModelController {

  const cache = useRef(null) as MutableRefObject<any>
  let instance = cache.current;

  if(instance === null){
    if(model.prototype)
      instance = new (model as Class)(...args);
    else if(typeof instance == "function")
      instance = (model as Function)(...args)
    else 
      instance = model;

    if(instance.didHook)
      instance.didHook.apply(instance)
      
    applyDispatch(instance);
    instance = bindMethods(instance, model.prototype, superType);

    cache.current = instance;
  }
  else if(instance.didHook)
    instance.didHook.apply({})

  if(instance.willHook){
    instance.hold = true;
    instance.willHook();
    instance.hold = false;
  }

  useEffect(() => {
    const state = proto(instance);
    const methods: Lifecycle = model.prototype || {}
    return invokeLifecycle(
      state, 
      state.didMount || methods.didMount, 
      state.willUnmount || methods.willUnmount
    );
  }, [])

  return instance;
}

function bindMethods(
  instance: any, 
  prototype: any, 
  stopAt: any = Object.prototype){

  const boundLayer = create(instance);
  const chain = [];

  while(prototype !== stopAt){
    chain.push(prototype);
    prototype = proto(prototype);
  }

  prototype = {};
  for(const methods of chain){
    for(const key of keysIn(methods)){
      if(RESERVED.indexOf(key) >= 0)
        continue;
      const { value } = describe(methods, key)!;
      if(typeof value === "function")
        prototype[key] = value
    }
  } 

  for(const key in prototype)
    define(boundLayer, key, {
      value: prototype[key].bind(instance),
      writable: true
    })

  for(const key of ["get", "set"])
    define(boundLayer, key, {
      value: instance,
      writable: true
    })

  return boundLayer
}

export function invokeLifecycle(
  target: any,
  didMount?: () => void, 
  willUnmount?: () => void){

  if(didMount)
    didMount.call(target);
  return () => {
    if(willUnmount)
      willUnmount.call(target);
    for(const key in target)
      try { delete target[key] }
      catch(err) {}
  }
}