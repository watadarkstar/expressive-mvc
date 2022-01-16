import { Controller, LOCAL, manage, Stateful, UPDATE } from './controller';
import { create, define, defineProperty, getOwnPropertyDescriptor, setAlias } from './util';

type Listener = {
  commit(): void;
  release(): void;
}

export class Subscriber {
  public proxy: any;
  public source: any;
  public active = false;
  public handle = {} as BunchOf<Callback | true>;
  public dependant = new Set<Listener>();
  public parent: Controller;
  public latest?: readonly string[];
  public freeze?: boolean;

  constructor(
    parent: Controller | Stateful,
    public onUpdate: Controller.Listen){

    if(!(parent instanceof Controller))
      parent = manage(parent);

    this.parent = parent;
    this.source = parent.subject;
    this.proxy = create(parent.subject);

    define(this.proxy, LOCAL, this);
    defineProperty(this.proxy, UPDATE, {
      get: () => {
        if(!this.latest)
          return [];

        const keys = this.latest
          .filter(k => k in this.handle);

        this.latest = undefined;
        return keys;
      }
    })

    for(const key in parent.state)
      this.spy(key);
  }

  public listen = (key: string, from: Controller) => {
    const handler = this.handle[key];

    if(!handler)
      return;

    if(typeof handler == "function")
      handler();

    const notify = this.onUpdate(key, from);

    from.waiting.add(this.notify);

    if(this.freeze){
      debugger
      return;
    }

    if(notify){
      from.waiting.add(notify);
    }
  }

  public notify = (keys: readonly string[]) => {
    debugger
    this.latest = keys;
    this.freeze = false;
  }

  public spy(key: string){
    const { proxy, source } = this;

    const { set } =
      getOwnPropertyDescriptor(source, key)!;

    const intercept = () => {
      this.follow(key);
      delete proxy[key];
      return proxy[key];
    }

    setAlias(intercept, `tap ${key}`);
    defineProperty(proxy, key, {
      get: intercept,
      set,
      configurable: true,
      enumerable: true
    })
  }

  public follow(key: string, callback?: Callback){
    this.handle[key] = callback || true;
  }

  public skip(){
    if(this.parent.pending)
      this.freeze = true;
  }

  public commit(){
    const onDone =
      this.parent.addListener(this.listen);

    this.active = true;

    this.dependant.forEach(x => x.commit());

    return this.release = () => {
      this.dependant.forEach(x => x.release());
      onDone();
    }
  }

  public release!: Callback;
}