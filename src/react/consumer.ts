import React from 'react';

import { issues } from '../issues';
import { useAmbient, useTap } from './hooks';

export const Oops = issues({
  BadConsumerProps: () =>
    `Provider expects either a render function, 'get' or 'has' props.`
})

declare namespace Consumer {
  type HasProps<E extends Class> = {
      /** Type of controller to fetch from context. */
      of: E;
      /**
       * Getter function. Is called on every natural render of this component.
       * Will throw if usable instance cannot be found in context.
       */
      has: (value: InstanceType<E>) => void;
  }
  
  type GetProps<E extends Class> = {
      /** Type of controller to fetch from context. */
      of: E;
      /** Getter function. Is called on every natural render of this component. */
      get: (value: InstanceType<E> | undefined) => void;
  }
  
  type RenderProps<E extends Class> = {
      /** Type of controller to fetch from context. */
      of: E;
      /**
       * Render function, will receive instance of desired controller.
       *
       * Similar to `tap()`, updates to properties accessed in
       * this function will cause a refresh when they change.
       */
      children: (value: InstanceType<E>) => React.ReactElement<any, any> | null;
  }

  type Props<T extends Class> = HasProps<T> | GetProps<T> | RenderProps<T>
}

function Consumer<T extends Class>(props: Consumer.Props<T>){
  const { get, has, children, of: Control } = props as any;

  if(typeof children == "function")
    return children(useTap(useAmbient(Control)));

  const callback = has || get;

  if(typeof callback == "function")
    callback(useAmbient(Control, !!has));
  else
    throw Oops.BadConsumerProps()

  return null;
}

export { Consumer };