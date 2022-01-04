import { useLayoutEffect, useMemo, useState } from 'react';

import { keys, manage, Stateful } from './controller';
import { Lifecycle } from './lifecycle';
import { Model } from './model';
import { Subscriber } from './subscriber';
import { suspend } from './suspense';
import { defineProperty } from './util';

export function use<T>(init: (trigger: Callback) => T){
  const [ state, update ] = useState((): T[] => [
    init(() => update(state.concat()))
  ]);

  return state[0];
}

export function useLazy<T extends typeof Model>(
  Type: T, callback?: (instance: InstanceOf<T>) => void){

  const instance = useMemo(() => {
    const instance = Type.create();

    if(callback)
      callback(instance);

    return instance;
  }, []);

  useLayoutEffect(() => () => instance.destroy(), []);

  return instance;
}

export function useWatcher(
  target: Stateful,
  focus?: string | Select,
  expected?: boolean){

  const hook = use(refresh => {
    const sub = new Subscriber(target, () => refresh);

    if(focus){
      const source = sub.proxy;
      const key = keys(sub.parent, focus)[0];

      defineProperty(sub, "proxy", {
        get(){
          const value = source[key];

          if(value === undefined && expected)
            throw suspend(sub.parent, key)

          return value;
        }
      })
    }

    return sub;
  });

  useLayoutEffect(() => hook.commit(), []);

  return hook.proxy;
}

export function useModel(
  Type: Class,
  callback?: (instance: Model) => void){

  const hook = use(refresh => {
    const instance = new Type() as Model;
    const control = manage(instance);
    const sub = new Subscriber(control, () => refresh);

    const release = control.addListener(
      (key: string) => {
        if(key == Lifecycle.WILL_UNMOUNT)
          return () => {
            instance.destroy();
            release();
          }
      }
    );

    if(callback)
      callback(instance);

    return sub;
  });

  return hook.proxy;
}