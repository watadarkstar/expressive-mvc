import { Context, FunctionComponent, ProviderProps } from 'react';

import { ASSIGNED_CONTEXT, ControlProvider, ownContext } from './context';
import { ControllerDispatch } from './dispatch';
import { controllerIsGlobalError, GLOBAL_INSTANCE, globalController } from './global';
import { ControlledInput, ControlledValue } from './hoc';
import { getObserver, OBSERVER, Observer } from './observer';
import { getterFor } from './peers';
import { createWrappedComponent } from './provider';
import { useModelController, useSubscriber } from './subscriber';
import { BunchOf, Callback, Class, ModelController, Observable, SubscribeController } from './types';
import { define, defineOnAccess, transferValues } from './util';
import { useWatchedProperty, useWatcher } from './watcher';

export interface Controller 
  extends ModelController, Observable, SubscribeController {

  // Extended classes represent the onion-layers of a given controller.
  // What is accessible depends on the context controller is accessed.

  [OBSERVER]: ControllerDispatch;

  Input: FunctionComponent<{ to: string }>;
  Value: FunctionComponent<{ of: string }>;
  Provider: FunctionComponent<ProviderProps<this>>;
  
  get: this;
  set: this;

  assign(props: BunchOf<any>): this;
  assign(key: string, props?: BunchOf<any>): any;

  tap(): this;
  tap<K extends keyof this>(key?: K): this[K];
}

export class Controller {
  constructor(){
    this.get = this;
    this.set = this;
  }

  toggle = (key: string) => {
    const self = this as any;
    return self[key] = !self[key];
  }

  export = (
    subset?: string[] | Callback, 
    onChange?: Callback | boolean,
    initial?: boolean) => {

    const dispatch = getObserver(this);

    if(typeof subset == "function"){
      initial = onChange as boolean;
      onChange = subset;
      subset = dispatch.managed;
    }
  
    if(typeof onChange == "function")
      return dispatch.feed(subset!, onChange, initial);
    else 
      return dispatch.pick(subset);
  }

  tap(key?: string, required?: boolean){
    return key ? 
      useWatchedProperty(this, key, required) : 
      useWatcher(this);
  }

  sub(...args: any[]){
    return useSubscriber(this, args, false) 
  }
  
  assign(
    a: string | BunchOf<any>, 
    b?: BunchOf<any>){
  
    if(typeof a == "string")
      return (this as any)[a] = b as any;
    else
      return Object.assign(this, a) as this;
  }

  static global = false;
  static [GLOBAL_INSTANCE]?: Singleton;
  static [ASSIGNED_CONTEXT]?: Context<Controller>;

  static meta: <T>(this: T) => T & Observable;

  static use(...args: any[]){
    return useModelController(this, args);
  }

  static get(key?: string){
    const getInstance = getterFor(this)
    const hook = key === undefined ? 
      () => Object.create(getInstance()) : 
      (key: string) => (getInstance() as any)[key];
  
    define(this, "get", hook);
    return hook(key!) as unknown;
  }

  static tap(key?: string, main?: boolean){
    const instance = getterFor(this)();
    //TODO: Implement better caching here
  
    //TODO: is main on "required" argument correct?
    return instance.tap(key, main);
  }

  static has(key: string){
    const getInstance = getterFor(this)
    const hook = (key: string) =>
      useWatchedProperty(getInstance(), key, true);
  
    define(this, "has", hook);
    return hook(key) as unknown;
  }

  static sub(...args: any[]){
    const getInstance = getterFor(this, args);
    const hook = (...args: any[]) => {
      return useSubscriber(getInstance(), args, false);
    }
    
    define(this, "sub", hook);
    return hook.apply(null, args);
  }

  static hoc<T extends Class>(
    this: T, fn: FunctionComponent<InstanceType<T>>){

    return createWrappedComponent.call(this as any, fn as any)
  }

  static map(this: any, from: any[]){
    return from.map((item, index) => new this(item, index));
  }

  static assign(a: string | BunchOf<any>, b?: BunchOf<any>){
    return this.tap().assign(a, b);
  }

  static uses(
    props: BunchOf<any>, 
    only?: string[]){
      
    return useModelController(this, [], (instance) => {
      transferValues(instance, props, only)
    })
  }

  static using(
    props: BunchOf<any>, 
    only?: string[]){

    function assignTo(instance: Controller){
      transferValues(instance, props, only);
    }

    const subscriber = useModelController(this, [], assignTo);

    assignTo(subscriber);
        
    return subscriber;
  }

  static makeGlobal(...args: any[]){
    this.global = true;
    return globalController(this, args);
  }

  static context(){
    if(this.global)
      throw controllerIsGlobalError(this.name)
    else
      return ownContext(this)
  }

  static get Provider(){
    if(this.global)
      throw controllerIsGlobalError(this.name)
    else 
      return useModelController(this).Provider
  }
}

defineOnAccess(Controller, "meta", 
  function metaSubscriber(){
    const self = this as unknown as Observable;
    const observer = new Observer(self);

    observer.monitorValues(["prototype", "length", "name"]);
    observer.monitorComputed();

    define(self, {
      get: self,
      set: self
    });

    return () => useWatcher(self);
  }
);

defineOnAccess(Controller.prototype, "Provider", ControlProvider);
defineOnAccess(Controller.prototype, "Value", ControlledValue);
defineOnAccess(Controller.prototype, "Input", ControlledInput);

export class Singleton extends Controller {
  static global = true;
}