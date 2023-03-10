import { Control } from './control';
import { create, defineProperty, getOwnPropertyNames } from './helper/object';
import { Model } from './model';

import type { Callback } from './helper/types';

const REGISTER = new WeakMap<{}, Subscriber>();

type Listener = {
  commit(): void;
  release(): void;
}

declare namespace Subscriber {
  type OnEvent<T = any> = (key: Model.Event<T> | null, source: Control) => Callback | void;
}

class Subscriber <T extends {} = any> {
  public proxy!: T;
  public clear: () => void;
  public latest?: Model.Event<T>[];

  public active = false;
  public dependant = new Set<Listener>();
  public watch = new Map<any, boolean | (() => boolean | void)>();

  constructor(
    public parent: Control<T>,
    public onUpdate: Subscriber.OnEvent,
    public strict?: boolean){

    const proxy = create(parent.subject);
    const reset = () => this.latest = undefined;

    REGISTER.set(proxy, this);
    
    defineProperty(this, "proxy", {
      configurable: true,
      get(){
        setTimeout(reset, 0);
        return proxy;
      }
    })

    this.clear = parent.addListener(key => {
      if(this.active)
        this.notify(key);
    });
  }

  get using(): Model.Key<T>[] {
    return Array.from(this.watch.keys());
  }

  apply(values: Model.Compat<T>, keys?: Model.Key<T>[]){
    const { waiting, subject } = this.parent;

    this.active = false;

    if(!keys)
      keys = getOwnPropertyNames(subject) as Model.Key<T>[];

    for(const key of keys)
      if(key in values)
        subject[key] = values[key]!;

    waiting.add(() => this.active = true);
  }

  follow(key: any, value?: boolean | (() => boolean | void)){
    if(value !== undefined)
      this.watch.set(key, value);
    else if(!this.watch.has(key))
      this.watch.set(key, true);
  }

  commit(){
    this.active = true;
    this.dependant.forEach(x => x.commit());
  }

  release(){
    this.clear();
    this.dependant.forEach(x => x.release());
  }

  private notify(key: Model.Event<T> | null){
    const { parent, watch } = this;
    const handler = watch.get(key);

    if(!handler)
      return;

    if(typeof handler == "function")
      handler();

    const notify = this.onUpdate(key, parent);

    if(notify){
      parent.waiting.add(update => {
        this.latest = update.filter(k => watch.has(k));
      });
      parent.waiting.add(notify);
    }
  }
}

function subscriber<T extends {}>(from: T){
  return REGISTER.get(from) as Subscriber<T> | undefined;
}

export { Subscriber, subscriber }