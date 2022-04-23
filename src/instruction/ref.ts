import { control, Controller } from '../controller';
import { Model } from '../model';
import { createValueEffect, defineLazy, defineProperty } from '../util';
import { apply } from './apply';

declare namespace ref {
  type Callback<T, S = any> = (this: S, argument: T) =>
    ((next: T) => void) | Promise<void> | void | boolean;

  interface Object<T = any> {
    (next: T): void;
    current: T | null;
  }

  /** Object with references to all managed values of `T`. */
  type Proxy<T extends Model> = { [P in Model.Fields<T>]: Model.Ref<T[P]> };
}

/**
 * Creates an object with references to all managed values.
 * Each property will set value in state when invoked.
 *
 * *Properties are simultaneously a ref-function and ref-object, use as needed.*
 *
 * @param target - Source model from which to reference values.
 */
function ref <T extends Model> (target: T): ref.Proxy<T>;

/**
 * Creates a ref-compatible property.
 * Will persist value, and updates to this are made part of controller event-stream.
 *
 * *Output is simultaneously a ref-function and ref-object, use as needed.*
 *
 * @param callback - Optional callback to synchronously fire when reference is first set or does update.
 */
function ref <T = HTMLElement> (callback?: ref.Callback<T>): ref.Object<T>;
function ref <T, S> (callback?: ref.Callback<T, S>): ref.Object<T>;

function ref<T>(arg?: AssignCallback<T> | Model){
  return apply(
    function ref(key){
      let value: ref.Object | ref.Proxy<any> = {};

      if(typeof arg == "object"){
        const source = control(arg);
    
        for(const key in source.state)
          defineLazy(value, key, createRef.bind(source, key));
      }
      else 
        value = createRef.call(this, key, arg);

      return { value };
    }
  )
}

export { ref }

function createRef(
  this: Controller,
  key: string,
  cb?: AssignCallback<any>){

  const refObjectFunction =
    this.ref(key, cb && createValueEffect(cb));

  defineProperty(refObjectFunction, "current", {
    set: refObjectFunction,
    get: () => this.state[key]
  })

  return refObjectFunction as ref.Object;
}