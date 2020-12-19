import type { Controller } from './controller';

import { Pending } from './directives';
import { Observer, RequestCallback } from './observer';
import { Subscriber } from './subscriber';
import {
  assign,
  defineProperty,
  fn,
  squash,
  within
} from './util';

import Oops from './issues';

const ASSIGNED = new WeakMap<{}, Dispatch>();

export class Dispatch extends Observer {
  public ready?: true;

  static ensure(on: {}, base: typeof Controller){
    if(!ASSIGNED.has(on))
      return new Dispatch(on, base);
  }

  static get(from: {}){
    let dispatch = ASSIGNED.get(from);

    if(!dispatch)
      throw Oops.NoObserver(from.constructor.name);

    if(!dispatch.ready){
      dispatch.ready = true;
      dispatch.start();
  
      if(dispatch.onReady)
        dispatch.onReady();
    }

    return dispatch;
  }

  constructor(
    public subject: {},
    base: typeof Controller,
    protected onReady?: Callback){

    super(subject, base);
    ASSIGNED.set(subject, this);
  }

  protected manageProperty(
    key: string, desc: PropertyDescriptor){

    if(desc.value instanceof Pending)
      desc.value.applyTo(this, key);
    else
      super.manageProperty(key, desc);
  }

  public select(selector: Selector){
    const found = new Set<string>();
    const spy = {} as Recursive;
  
    for(const key of this.watched)
      defineProperty(spy, key, {
        get(){
          found.add(key);
          return spy;
        }
      });
  
    selector(spy);

    return Array.from(found);
  }

  public watch(
    key: string | Selector,
    handler: (value: any, key: string) => void,
    once?: boolean,
    initial?: boolean){

    if(fn(key))
      [ key ] = this.select(key);

    const callback = () =>
      handler.call(
        this.subject, 
        this.state[key as string],
        key as string
      );

    if(initial)
      callback();

    return this.addListener(key, callback, once);
  }

  public on = (
    key: string | Selector,
    listener: HandleUpdatedValue,
    initial?: boolean) => {

    return this.watch(key, listener, false, initial);
  }

  public once = (
    key: string | Selector,
    listener?: HandleUpdatedValue) => {

    if(listener)
      return this.watch(key, listener, true);
    else
      return new Promise(resolve => {
        this.watch(key, resolve, true)
      });
  }

  public effect = (
    callback: EffectCallback<any>,
    select?: string[] | Selector) => {
    
    const { subject } = this;
    const invoke = createEffect(callback);
    const reinvoke = squash(() => invoke(subject));

    if(!select){
      const sub = new Subscriber(subject, reinvoke);
      invoke(sub.proxy);
      return () => sub.release();
    }

    if(fn(select))
      select = this.select(select);

    if(select.length > 1){
      const update = squash(reinvoke);
      const cleanup = select.map(k => this.addListener(k, update));
      return () => cleanup.forEach(x => x());
    }

    return this.addListener(select[0], reinvoke);
  }

  public export = (
    select?: string[] | Selector) => {

    if(!select)
      return assign({}, this.state);

    const acc = {} as BunchOf<any>;

    if(fn(select))
      select = this.select(select);
    
    for(const key of select)
      acc[key] = within(this.subject, key);

    return acc;
  }

  public update = (
    select: string | string[] | Selector | BunchOf<any>) => {

    if(typeof select == "string")
      select = [select];
    else if(fn(select))
      select = this.select(select);

    if(Array.isArray(select))
      select.forEach(k => this.emit(k))
    else
      assign(this.subject, select);
  }

  public requestUpdate = (
    callback?: RequestCallback | boolean) => {

    const { pending, waiting } = this;

    if(typeof callback == "function")
      waiting.push(callback)
    else if(!pending === callback)
      return Promise.reject(Oops.StrictUpdate())
    else if(pending)
      return new Promise(cb => waiting.push(cb));
    else
      return Promise.resolve(false);
  }
}

export function createEffect(callback: EffectCallback<any>){
  let unSet: Callback | undefined;

  return (value: any, callee = value) => {
    unSet && unSet();
    unSet = callback.call(callee, value);

    if(unSet && !fn(unSet))
      throw Oops.BadEffectCallback()
  }
}