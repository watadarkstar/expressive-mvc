import { issues, Model, Register } from '@expressive/mvc';
import React from 'react';

const Oops = issues({
  NotFound: (name) =>
    `Couldn't find ${name} in context; did you forget to use a Provider?`,

  MultipleExist: (name) =>
    `Did find ${name} in context, but multiple were defined by same Provider.`
})

const Global = new Register();
const LookupContext = React.createContext(Global);

function useLookup(){
  try {
    return React.useContext(LookupContext);
  }
  catch(err){
    return Global;
  }
};

function useContext <T extends Model> (this: Model.Type<T>, required: false): T | undefined;
function useContext <T extends Model> (this: Model.Type<T>, required?: boolean): T;
function useContext<T extends Model>(this: Model.Type<T>, required?: boolean): T | undefined {
  const instance = useLookup().get(this);

  if(instance === null)
    throw Oops.MultipleExist(this.name);

  if(!instance && required !== false)
    throw Oops.NotFound(this.name);

  return instance;
}

export {
  Oops,
  useLookup,
  useContext,
  LookupContext
}