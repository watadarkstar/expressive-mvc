import {
  createContext,
  createElement,
  PropsWithChildren,
  ReactElement,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import { issues } from './issues';
import { Model } from './model';
import { assign, create, define, fn, values } from './util';

export const Oops = issues({
  NothingInContext: (name) =>
    `Couldn't find controller for ${name} in context; did you forget to use a Provider?`,

  BadProviderProps: () =>
    `Provider expects either 'of' or 'for' props.`
})

export class Lookup {
  private table = new Map<typeof Model, symbol>();

  private key(T: typeof Model){
    let key = this.table.get(T);

    if(!key){
      key = Symbol(T.name);
      this.table.set(T, key);
    }

    return key;
  }

  public get(T: typeof Model, strict?: boolean){
    const instance = (this as any)[this.key(T)];

    if(!instance && strict)
      throw Oops.NothingInContext(T.name);

    return instance as Model | undefined;
  }
  
  public push(items: Model[]){
    const next = create(this) as Lookup;

    for(const I of items){
      let T = I.constructor as typeof Model;
  
      do {
        define(next, this.key(T), I);
      }
      while(T = T.inherits!);
    }

    return next;
  }

  public pop(){
    for(const c of values<Model>(this as any))
      c.destroy();
  }
}

type ProvideCollection =
  | Array<Model | typeof Model>
  | BunchOf<Model | typeof Model>;

const LookupContext = createContext(new Lookup());
const LookupProvider = LookupContext.Provider;

export function useLookup(){
  return useContext(LookupContext);
}

function useIncluding(
  insert: Model | ProvideCollection,
  dependancy?: any){

  const current = useLookup();

  function next(){
    const provide = insert instanceof Model
      ? [ insert ] : values(insert).map(T =>
        Model.isTypeof(T) ? T.create() : T
      );

    return current.push(provide);
  }

  return useMemo(next, [ dependancy ])
}

interface ConsumerProps {
  of: typeof Model;
  get?: (value: Model) => void;
  has?: (value: Model) => void;
  children?: (value: Model) => ReactElement<any, any> | null;
}

interface ProviderProps {
  of: Model | typeof Model | ProvideCollection;
  children?: ReactNode;
}

export const Consumer = (props: ConsumerProps) => {
  const { get, has, children: render, of: Control } = props;

  if(fn(render))
    return render(Control.tap());

  const callback = has || get;

  if(fn(callback))
    callback(Control.get(!!has));

  return null;
}

export function Provider(props: ProviderProps){
  const { children, of: target } = props;
  const data = assign({}, props, { children: null, of: null });
 
  if(Model.isTypeof(target))
    return createElement(ParentProvider, { target, data }, children);
  else if(target instanceof Model)
    return createElement(DirectProvider, { target, data }, children);
  else if(typeof target == "object")
    return createElement(MultiProvider, { types: target }, children);
  else
    throw Oops.BadProviderProps();
}

function ParentProvider(
  props: PropsWithChildren<{ target: typeof Model, data: {} }>){

  let { children, target, data } = props;
  const instance = target.using(data);
  const value = useIncluding(instance.get, target);

  if(fn(children))
    children = children(instance);

  return createElement(LookupProvider, { value }, children);
}

function DirectProvider(
  props: PropsWithChildren<{ target: Model, data: {} }>){

  const { children, data, target } = props;
  const value = useIncluding(target, target);

  target.import(data);

  return createElement(LookupProvider, { value }, children);
}

function MultiProvider(
  props: PropsWithChildren<{ types: ProvideCollection }>){

  const { children, types } = props;
  const value = useIncluding(types);

  useEffect(() => () => value.pop(), []);

  return createElement(LookupProvider, { value }, children);
}