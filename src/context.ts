import { createContext, createElement, PropsWithChildren, ReactNode, useContext, useEffect, useMemo } from 'react';

import type { Controller, Model } from './controller';
import { create, define, values } from './util';

import Oops from './issues';

const LOOKUP = new Map<Model, symbol>();

class Context {
  private key(T: Model){
    let key = LOOKUP.get(T);
    if(!key)
      LOOKUP.set(T, key = Symbol(T.name));
    return key;
  }

  public find(T: Model): Controller | undefined {
    return (this as any)[this.key(T)];
  }
  
  private register(T: Model, I: Controller){
    do {
      define(this, this.key(T), I);
    }
    while(T = T.inherits!);
  }

  public concat(instance: Controller){
    const layer: Context = create(this);
    layer.register(instance.constructor as Model, instance);
    return layer;
  }

  public manage(types: Array<Model> | BunchOf<Model>){
    const layer: Context = create(this);

    if(!Array.isArray(types))
      types = values(types);

    for(const Type of types)
      layer.register(Type, Type.create());
      
    return layer;
  }

  public destroy(){
    const registered: Controller[] = values(this);
    registered.forEach((c) => c.destroy());
  }
}

const CONTEXT_CHAIN = createContext(new Context());

export function getFromContext(Type: Model){
  const instance = useContext(CONTEXT_CHAIN).find(Type);

  if(!instance)
    throw Oops.NothingInContext(Type.name);

  return instance;
}

type GetPeers = (instance: Controller) => [string, typeof Controller][];
const NEEDS_HOOK = new WeakMap<Controller, boolean>();

export function attachFromContext(
  instance: Controller,
  getPending: GetPeers){

  if(NEEDS_HOOK.has(instance)){
    if(NEEDS_HOOK.get(instance))
      useContext(CONTEXT_CHAIN);
    return;
  }

  const pending = getPending(instance);

  if(!pending.length){
    NEEDS_HOOK.set(instance, false);
    return;
  }
  
  const context = useContext(CONTEXT_CHAIN);

  for(const [key, type] of pending)
    define(instance, key, context.find(type));

  NEEDS_HOOK.set(instance, true);

  return () => NEEDS_HOOK.set(instance, false);
}

export function ControlProvider(this: Controller | Model){
  return ({ children }: PropsWithChildren<{}>) => {
    const parent = useContext(CONTEXT_CHAIN);
    const provide = useMemo(() => parent.concat(
      typeof this == "function" ? this.create() : this
    ), []);

    return createElement(
      CONTEXT_CHAIN.Provider, { value: provide }, children
    );
  }
}

type InsertProviderProps = {
  of?: Array<Model> | BunchOf<Model>;
  children: ReactNode;
};

export function InsertProvider(props: InsertProviderProps){
  const { of: insertTypes = [], children } = props;
  const parent = useContext(CONTEXT_CHAIN);
  const provide = useMemo(() => parent.manage(insertTypes), []);

  useEffect(() => provide.destroy, []);

  return createElement(
    CONTEXT_CHAIN.Provider, { value: provide }, children
  );
}