import { MutableRefObject, useEffect, useRef } from 'react';

import { Controller, ModelController } from './controller';
import { useSubscription, SpyController } from './subscriber';
import { ensureDispatch, NEW_SUB, SUBSCRIBE, UNSUBSCRIBE } from './subscription';
import { Class } from './types.d';
import { useState } from 'react';

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
  "componentDidMount", 
  "componentDidHook",
  "export",
  "not",
  "on",
  "only",
  "once",
  "Provider",
  "refresh",
  "set",
  "componentWillUnmount", 
  "componentWillHook"
];

export function useModelController(init: any, ...args: any[]){
  return init instanceof Controller
    ? useSubscription(init as ModelController)
    : useOwnController(init, args, Object.prototype);
}

export function useOwnController( 
  model: Class | Function,
  args: any[] = [],
  superType: any = Controller.prototype
): ModelController {

  const setUpdate = useState(0)[1];
  const cache = useRef(null) as MutableRefObject<any>;
  let instance = cache.current;

  const { prototype: p = {} } = model;

  const willRender = p.componentWillRender || p.willRender;
  const willUnmount = p.componentWillUnmount || p.willUnmount;
  const didMount = p.componentDidMount || p.didMount;

  if(instance === null){
    if(model.prototype)
      instance = new (model as Class)(...args);
    else if(typeof instance == "function")
      instance = (model as Function)(...args)
    else 
      instance = model;

    if(!instance[NEW_SUB])
      define(instance, NEW_SUB, {
        get: ensureDispatch,
        configurable: true
      })

    if(willRender)
      willRender.call(instance, true)

    cache.current = bindMethods(instance, model.prototype, superType);
    instance = instance[NEW_SUB](setUpdate);
  }
  else if(willRender)
    willRender.call(instance)

  useEffect(() => {
    const spyControl = instance as unknown as SpyController;
    const state = proto(instance);
    
    spyControl[SUBSCRIBE]();

    if(didMount)
      didMount.call(state);

    return () => {
      if(willUnmount)
        willUnmount.call(state);

      spyControl[UNSUBSCRIBE]();
      nuke(state);
    }
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

  return boundLayer
}

function nuke(target: any){
  for(const key in target)
    try { delete target[key] }
    catch(err) {}
}