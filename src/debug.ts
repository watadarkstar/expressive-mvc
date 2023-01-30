import { Control, controller } from './control';
import { defineProperties } from './helper/object';
import { Model } from './model';
import { Subscriber } from './subscriber';

const LOCAL = "$debug local";
const STATE = "$debug state";
const UPDATE = "$debug update";
const CONTROL = "$debug controller";

defineProperties(Model.prototype, {
  [CONTROL]: {
    get(this: Model){
      return controller(this);
    }
  },
  [LOCAL]: {
    get(this: Model){
      return Subscriber.get(this);
    }
  },
  [STATE]: {
    get(this: Model){
      const { state } = controller(this)!;
      const output: any = {};

      state.forEach((value, key) => output[key] = value);

      return output;
    }
  },
  [UPDATE]: {
    get(this: Model){
      const source = Subscriber.get(this) || controller(this);

      return source && source.latest;
    }
  }
})

const Debug = {
  CONTROL,
  LOCAL,
  STATE,
  UPDATE
} as const;

type Debug<T extends {}> = T & {
  /** Controller for this instance. */
  [CONTROL]?: Control<T>;

  /** Current subscriber (if present) while used in a live context (e.g. hook or effect). */
  [LOCAL]?: Subscriber<T>;

  /** Current state of this instance. */
  [STATE]?: Model.Export<T>;

  /**
   * Last update causing a refresh to subscribers.
   * 
   * If accessed directly, will contain all keys from last push.
   * If within a subscribed function, will contain only keys which explicitly caused a refresh.
   */
  [UPDATE]?: readonly Model.Event<T>[];
}

export { Debug };