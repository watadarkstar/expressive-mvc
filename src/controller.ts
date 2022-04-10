import * as Computed from './compute';
import { issues } from './issues';
import { LOCAL, Stateful, UPDATE } from './model';
import { Subscriber } from './subscriber';
import { defineProperty, getOwnPropertyDescriptor } from './util';

export const Oops = issues({
  StrictUpdate: (expected) => 
    `Strict update() did ${expected ? "not " : ""}find pending updates.`,

  NoChaining: () =>
    `Then called with undefined; update promise will never catch nor supports chaining.`
})

export const Pending = new Map<symbol, Instruction<any>>();

export function apply<T = any>(
  fn: Instruction<any>, label?: string){

  const name = label || fn.name || "pending";
  const placeholder = Symbol(`${name} instruction`);

  function setup(this: Controller, key: string){
    const { subject, state } = this;
    let output = fn.call(this, key, this);

    if(typeof output == "function"){
      const getter = output;

      output = {
        set: this.setter(key),
        ...getOwnPropertyDescriptor(subject, key),
        get(this: Stateful){
          return getter(state[key], this[LOCAL])
        }
      }
    }

    if(output)
      defineProperty(subject, key, output);
  }

  Pending.set(placeholder, setup);

  return placeholder as unknown as T;
}

export type HandleValue = (this: Stateful, value: any) => boolean | void;

export type Getter<T> = (state: T, sub?: Subscriber) => T

export type Instruction<T> = (this: Controller, key: string, thisArg: Controller) =>
  void | Getter<T> | PropertyDescriptor;

export namespace Controller {
  export type Listen = (key: string, source: Controller) => RequestCallback | void;
}

export class Controller {
  ready = false;
  public state = {} as BunchOf<any>;
  public frame = new Set<string>();
  public waiting = new Set<RequestCallback>();

  protected followers = new Set<Controller.Listen>();

  constructor(public subject: Stateful){}

  public get pending(){
    return this.frame.size > 0;
  }

  public start(){
    if(this.ready)
      return;

    const { subject } = this;
    
    for(const key in subject){
      const desc = getOwnPropertyDescriptor(subject, key);

      if(desc && "value" in desc){
        const { value } = desc;
        const instruction = Pending.get(value);

        if(instruction){
          Pending.delete(value);
          delete (subject as any)[key];
          instruction.call(this, key, this);
        }
        else if(typeof value !== "function" || /^[A-Z]/.test(key))
          this.manage(key, value);
      }
    }

    this.emit();
    this.ready = true;

    return this;
  }

  public manage(
    key: string,
    initial: any,
    effect?: HandleValue){

    const { state, subject } = this;

    state[key] = initial;
    defineProperty(subject, key, {
      enumerable: true,
      configurable: true,
      get: () => state[key],
      set: this.setter(key, effect)
    });
  }

  public setter(
    key: string,
    handler?: HandleValue){

    const { state, subject } = this;

    return (value: any) => {
      if(state[key] == value)
        return;

      if(handler)
        switch(handler.call(subject, value)){
          case true:
            this.update(key);
          case false:
            return;
        }

      this.update(key, value);
    }
  }

  public addListener(listener: Controller.Listen){
    this.followers.add(listener);
    return () => {
      this.followers.delete(listener)
    }
  }

  public update(key: string, value?: any){
    if(1 in arguments)
      this.state[key] = value;

    if(this.frame.has(key))
      return;

    if(!this.frame.size)
      setTimeout(() => this.emit(), 0);

    this.frame.add(key);

    for(const callback of this.followers){
      const event = callback(key, this);

      if(typeof event == "function")
        this.waiting.add(event);
    }
  }

  public requestUpdate(strict?: boolean): any {
    if(strict !== undefined && !this.pending === strict)
      return Promise.reject(Oops.StrictUpdate(strict));

    return <PromiseLike<readonly string[] | false>> {
      then: (callback) => {
        if(callback)
          if(this.pending)
            this.waiting.add(callback);
          else
            callback(false);
        else
          throw Oops.NoChaining();
      }
    }
  }

  private emit(){
    Computed.flush(this);

    const keys = Object.freeze([ ...this.frame ]);
    const handle = new Set(this.waiting);

    this.waiting.clear();
    this.frame.clear();

    defineProperty(this.subject, UPDATE, {
      configurable: true,
      value: keys
    })

    handle.forEach(callback => {
      try { callback(keys) }
      catch(e){ }
    })
  }
}