import * as Computed from './compute';
import { apply, Controller, manage, Stateful } from './controller';
import { issues } from './issues';
import { Model } from './model';
import { pendingAccess } from './peer';
import { createValueEffect, define, defineLazy, defineProperty, setAlias } from './util';

export const Oops = issues({
  DuplicateAction: (key) =>
    `Invoked action ${key} but one is already active.`,

  BadComputedSource: (model, property, got) =>
    `Bad from-instruction provided to ${model}.${property}. Expects an arrow-function or a Model as source. Got ${got}.`,

  PeerNotAllowed: (model, property) =>
    `Attempted to use an instruction result (probably use or tap) as computed source for ${model}.${property}. This is not possible.`
})

function createRef(
  this: Controller,
  key: string,
  cb?: InterceptCallback<any>){

  const refObjectFunction =
    this.setter(key, cb && createValueEffect(cb));

  defineProperty(refObjectFunction, "current", {
    set: refObjectFunction,
    get: () => this.state[key]
  })

  return refObjectFunction;
}

export function ref<T>(arg?: InterceptCallback<T> | Model): { current: T } {
  return apply(
    function ref(key){
      let value = {};

      if(typeof arg == "object"){
        const source = manage(arg);
    
        for(const key in source.state)
          defineLazy(value, key, createRef.bind(source, key));
      }
      else 
        value = createRef.call(this, key, arg);

      return { value };
    }
  )
}

export function on<T>(
  initial: T, cb: InterceptCallback<T>): T {

  return apply(
    function on(key){
      this.manage(key, initial, cb && createValueEffect(cb));
    }
  );
}

export function memo<T>(
  factory: () => T, defer?: boolean): T {

  return apply(
    function memo(key){
      const source = this.subject;
      const get = () => factory.call(source);

      if(defer)
        defineLazy(source, key, get);
      else
        define(source, key, get())
    }
  );
}

export function lazy<T>(value: T): T {
  return apply(
    function lazy(key){
      const source = this.subject as any;

      source[key] = value;
      defineProperty(this.state, key, {
        get: () => source[key]
      });
    }
  );
}

export function act<T extends Async>(task: T): T {
  return apply(
    function act(key){
      let pending = false;

      const invoke = (...args: any[]) => {
        if(pending)
          return Promise.reject(
            Oops.DuplicateAction(key)
          )

        pending = true;
        this.update(key);

        return new Promise(res => {
          res(task.apply(this.subject, args));
        }).finally(() => {
          pending = false;
          this.update(key);
        })
      };

      setAlias(invoke, `run ${key}`);
      defineProperty(invoke, "active", {
        get: () => pending
      })

      return {
        value: invoke,
        writable: false
      };
    }
  )
}

type ComputeFunction<T, O = any> = (this: O, on: O) => T;
type ComputeFactory<T> = (key: string) => ComputeFunction<T>;

export function from<T, R = T>(
  source: ComputeFactory<T> | Stateful,
  setter?: ComputeFunction<T>,
  getter?: (this: Model, value: T, key: string) => R): R {

  return apply(
    function from(key){
      const { subject } = this;
      let getSource: () => Controller;

      // Easy mistake, using a peer, will always be unresolved.
      if(typeof source == "symbol")
        throw Oops.PeerNotAllowed(subject, key);

      // replace source controller in-case different
      if(typeof source == "object")
        getSource = () => manage(source);

      // specifically an arrow function (getter factory)
      else if(!source.prototype){
        setter = source.call(subject, key);
        getSource = () => this;
      }

      // is a peer Model (constructor)
      else if(Model.isTypeof(source))
        getSource = pendingAccess(subject, source, key, true);

      // Regular function is to ambiguous so not allowed.
      else
        throw Oops.BadComputedSource(subject, key, source);

      Computed.prepare(this, key, getSource, setter!, getter);
    }
  )
}