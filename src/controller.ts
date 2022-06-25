import { setUpdate } from './dispatch';
import { Model, Stateful } from './model';
import { STATE } from './stateful';

import type { Callback } from './types';

declare namespace Controller {
  // TODO: implement value type
  type OnValue<T = any> = (this: T, value: any) => boolean | void;
  type OnEvent<T = any> = (key: Model.Event<T> | null, source: Controller) => Callback | void;
}

class Controller<T extends Stateful = any> {
  public frame = new Set<string>();
  public waiting = new Set<Callback>();
  public followers = new Set<Controller.OnEvent>();

  constructor(public subject: T){}

  get state(){
    return STATE.get(this.subject)!;
  }

  ref(
    key: Model.Field<T>,
    handler?: Controller.OnValue<T>){
  
    const { subject, state } = this;
  
    return (value: any) => {
      if(state.get(key) == value)
        return;
  
      if(handler)
        switch(handler.call(subject, value)){
          case true:
            setUpdate(this, key);
          case false:
            return;
        }
  
      state.set(key, value);
      setUpdate(this, key);
    }
  }
}

export { Controller }