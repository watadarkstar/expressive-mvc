import { get, Model } from '@expressive/mvc';

import { useContext } from './useContext';
import { useModel } from './useModel';
import { useTap } from './useTap';

Object.assign(Model, <any>{
  use(arg1: any, arg2?: any){
    return useModel(this, arg1, arg2);
  },
  get(required?: boolean){
    return useContext(this, required);
  },
  tap(arg1?: any, arg2?: boolean): any {
    return useTap(this, arg1, arg2);
  },
  meta(arg1?: any, arg2?: any){
    return useTap(() => this, arg1, arg2);
  }
});

export { Consumer } from "./consumer";
export { Provider } from "./provider";

export * from "@expressive/mvc";
export { Model, get };