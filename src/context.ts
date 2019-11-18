import {
  Context,
  createContext,
  createElement,
  FunctionComponentElement,
  PropsWithChildren,
  ProviderExoticComponent,
  ProviderProps,
  useContext,
  useEffect,
  useState,
} from 'react';

import { DISPATCH, ModelController } from './controller';
import { Set } from './polyfill';
import { findInMultiProvider } from './provider';
import { useSubscriber, useWatcher } from './subscriber';
import { useOwnController } from './use_hook';

const CONTEXT_ALLOCATED = [] as [Function, Context<ModelController>][];

const { 
  defineProperty: define,
  keys: keysIn,
  create: inheriting
} = Object;

function ownContext(from: typeof ModelController){
  let constructor;

  if(!from.prototype)
    do {
      from = Object.getPrototypeOf(from);
      constructor = from.constructor;
    }
    while(!constructor)
  else 
    constructor = from.prototype.constructor;

  let context;

  for(const [ _constructor, _context ] of CONTEXT_ALLOCATED)
    if(constructor === _constructor){
      context = _context;
      break; 
    }

  if(!context){
    context = createContext(null as any);
    CONTEXT_ALLOCATED.push([constructor, context]);
  }

  return context as Context<any>;
}

function contextGetterFor(
  target: typeof ModelController) {

  const context = ownContext(target);
  const instance: any = () => useContext(context) || findInMultiProvider(target.name);
  return instance as () => ModelController;
} 

export function accessFromController(
  this: typeof ModelController, 
  key: string){

  const getInstance = contextGetterFor(this);
  const hook = (key: string) => (getInstance() as any)[key];

  define(this, `get`, { value: hook });
  return hook(key) as unknown;
}

export function watchFromController(
  this: typeof ModelController, 
  key: string){

  const getInstance = contextGetterFor(this);
  const hook = (key: string) => {
    const instance: any = getInstance();
    const dispatch = (instance as ModelController)[DISPATCH];
    const setUpdate = useState(0)[1];

    useEffect(() => {
      let watchers: Set<any> = 
        dispatch[key] || (dispatch[key] = new Set());

      watchers.add(setUpdate);

      return () => watchers.delete(setUpdate);
    })

    return instance[key];
  }

  define(this, `tap`, { value: hook });
  return hook(key) as unknown;
}

export function watchFromContext(
  this: typeof ModelController){

  const getInstance = contextGetterFor(this);
  const hook = () => {
    const controller = getInstance();
    return useWatcher(controller);
  }

  define(this, `watch`, { value: hook });
  return hook()
}

export function attachFromContext(
  this: typeof ModelController, 
  ...args: any[]){

  const getInstance = contextGetterFor(this);
  const hook = (...args: any[]) => {
    const controller = getInstance();
    return useSubscriber(controller, args);
  }
  
  define(this, `attach`, { value: hook });
  return hook.apply(null, args);
}

export function accessFromContext(
  this: typeof ModelController, 
  ...args: any[]){

  const getInstance = contextGetterFor(this);
  const hook = (...args: any[]) => {
    const controller = getInstance();
    return inheriting(controller)
  }

  define(this, `fetch`, { value: hook });
  return hook();
}

export function getContext(
  this: typeof ModelController){

  return ownContext(this);
}

export function controllerCreateParent(
  this: typeof ModelController): any {

  const memoizedProvider = () => useOwnController(this).Provider;

  define(this, "Provider", { get: memoizedProvider });

  return memoizedProvider();
}

function ParentProviderFor(
  controller: ModelController,
  Provider: ProviderExoticComponent<any>): any {
    
  return (props: PropsWithChildren<any>) => {
    let { children, className, style, ...rest } = props;

    if(keysIn(rest).length)
      controller.watch(rest);

    if(className || style)
      children = createElement("div", { className, style }, children);

    return createElement(Provider, { value: controller }, children);
  }
}

export function controllerCreateProvider(
  this: typeof ModelController, ...args: any[]): 
  FunctionComponentElement<ProviderProps<any>> {

  return useOwnController(this, args).Provider;
}

export function getControlProvider(
  this: ModelController){

  const { Provider } = ownContext(this.constructor as any);
  const ControlProvider = ParentProviderFor(this, Provider);

  define(this, "Provider", { value: ControlProvider });
  return ControlProvider
}