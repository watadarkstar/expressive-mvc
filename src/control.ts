import { PENDING } from './instruction/add';
import { flush } from './instruction/get.compute';
import { Model } from './model';
import { Subscriber } from './subscriber';
import { defineProperty, getOwnPropertyDescriptor, getPrototypeOf } from './util';

import type { Callback } from './types';

const REGISTER = new WeakMap<{}, Control>();
const UPDATE = new WeakMap<{}, readonly string[]>();

export function getUpdate<T extends {}>(subject: T){
  return UPDATE.get(subject) as readonly Model.Event<T>[];
}

export function setUpdate(subject: any, keys: Set<string>){
  UPDATE.set(subject, Array.from(keys));
  setTimeout(() => UPDATE.delete(subject), 0);
}

/** Ensure a local update is dropped after use. */
export function hasUpdate(proxy: any){
  if(UPDATE.has(proxy))
    setTimeout(() => UPDATE.delete(proxy), 0);
}

/** Set local update for a subscribed context. */
export function addUpdate(proxy: any, using: Map<string, any>){
  const parent = UPDATE.get(getPrototypeOf(proxy))!;

  UPDATE.set(proxy, parent.filter(k => using.has(k)));
}

declare namespace Control {
  // TODO: implement value type
  type OnValue<T = any> = (this: T, value: any) => boolean | void;

  type OnEvent<T = any> = (key: Model.Event<T> | null, source: Control) => Callback | void;

  type OnReady<T extends {}> = (control: Control<T>) => Callback | void;
}

class Control<T extends {} = any> {
  public state!: Map<any, any>;
  public frame = new Set<string>();
  public waiting = new Set<Callback>();
  public followers = new Set<Control.OnEvent>();

  constructor(public subject: T){
    REGISTER.set(subject, this);
  }

  subscribe(callback: Control.OnEvent<T>){
    return new Subscriber<T>(this, callback);
  }

  watch(key: keyof T & string){
    const { subject, state } = this;
    const { value } = getOwnPropertyDescriptor(subject, key)!;

    if(typeof value == "function")
      return;

    if(typeof value == "symbol"){
      const instruction = PENDING.get(value);

      if(instruction){
        delete subject[key];
        PENDING.delete(value);
        instruction.call(this, key, this);
      }

      return;
    }

    state.set(key, value);

    defineProperty(subject, key, {
      enumerable: false,
      set: this.ref(key as any),
      get(){
        const sub = Subscriber.get(this);

        if(sub)
          sub.add(key);

        return state.get(key);
      }
    });
  }

  addListener(listener: Control.OnEvent<T>){
    this.followers.add(listener);
    return () => {
      this.followers.delete(listener)
    }
  }

  ref(
    key: Model.Field<T>,
    handler?: Control.OnValue<T>){
  
    const { subject, state } = this;
  
    return (value: any) => {
      if(state.get(key) == value)
        return;
  
      if(handler)
        switch(handler.call(subject, value)){
          case true:
            this.update(key);
          case false:
            return;
        }
  
      state.set(key, value);
      this.update(key);
    }
  }

  update(key: Model.Field<T>){
    const { followers, frame, waiting } = this;
  
    if(frame.has(key))
      return;
  
    else if(!frame.size)
      setTimeout(() => {
        flush(this);      
        setUpdate(this.subject, frame)
        frame.clear();
      
        for(const notify of waiting)
          try {
            waiting.delete(notify);
            notify();
          }
          catch(err){
            console.error(err);
          }
      }, 0);
  
    frame.add(key);
  
    for(const callback of followers){
      const event = callback(key, this);
  
      if(typeof event == "function")
        waiting.add(event);
    }
  }

  clear(){
    const listeners = [ ...this.followers ];

    this.followers.clear();
    listeners.forEach(x => x(null, this));
  }

  static get<T extends {}>(from: T){
    if(from && "is" in from)
      from = (from as any).is as T;
  
    return REGISTER.get(from) as Control<T> | undefined;
  }

  static for<T extends {}>(subject: T): Control<T>;
  static for<T extends {}>(subject: T, cb: Control.OnReady<T>): Callback;
  static for<T extends {}>(subject: T, cb?: Control.OnReady<T>){
    const control = this.get(subject) || new this(subject);

    if(!control.state){
      const { waiting } = control;
  
      if(cb){
        let done: Callback | void;
  
        waiting.add(() => {
          done = cb(control);
        });
  
        return () => done && done();
      }
  
      control.state = new Map();
  
      for(const key in subject)
        control.watch(key);
  
      control.waiting = new Set();
  
      for(const cb of waiting)
        cb();
    }
  
    return cb ? cb(control) : control;
  }
}

export {
  Control
}