import { control, Controller } from './controller';
import { applyUpdate } from './dispatch';
import { LOCAL, Model, Stateful } from './model';
import { Callback, RequestCallback } from './types';
import { create, define, defineProperty } from './util';

type Listener = {
  commit(): void;
  release(): void;
}

export class Subscriber <T extends Stateful = any> {
  public proxy!: T;
  public release!: Callback;
  public commit: () => () => void;

  public active = false;
  public dependant = new Set<Listener>();
  public watch = {} as {
    [key in Model.Event<T>]: Callback | boolean;
  }

  constructor(
    target: Controller<T> | T,
    public onUpdate: Controller.OnEvent){

    const parent = target instanceof Controller
      ? target : control(target);

    const proxy = create(parent.proxy);

    let reset: Callback | undefined;

    define(proxy, LOCAL, this);
    defineProperty(this, "proxy", {
      configurable: true,
      get(){
        if(reset)
          setTimeout(reset, 0);

        return proxy;
      }
    })

    const release = parent.addListener(key => {
      const handler = this.watch[key];

      if(!handler || !this.active)
        return;

      if(typeof handler == "function")
        handler();

      const notify = this.onUpdate(key, parent);
      const getWhy: RequestCallback = (keys) => {
        reset = applyUpdate(proxy, keys.filter(k => k in this.watch));
      }

      if(notify){
        parent.requestUpdate(getWhy);
        parent.requestUpdate(notify);
      }
    });

    this.commit = () => {
      this.active = true;
      this.dependant.forEach(x => x.commit());

      return this.release;
    }

    this.release = () => {
      this.dependant.forEach(x => x.release());
      release();
    }
  }
}