export type Key = string | symbol | number;
export type Async<T = any> = (this: T, ...args: any[]) => Promise<any>;
export type BunchOf<T> = { [key: string]: T };

export type Class = new (...args: any[]) => any;
export type InstanceOf<T> = T extends { prototype: infer U } ? U : never;
export type IfApplicable<T extends {}, K> = K extends keyof T ? T[K] : undefined;

export type Callback = () => void;
export type RequestCallback = (keys?: string[]) => void;
export type EffectCallback<T, A = T> = (this: T, argument: A) => Callback | Promise<any> | void;
export type UpdateCallback<T, P> = (this: T, value: IfApplicable<T, P>, changed: P) => void;
export type InterceptCallback<T, S = any> = (this: S, argument: T) => ((next: T) => void) | Promise<any> | void | boolean;

export type RefFunction = (e: HTMLElement | null) => void;

export type Recursive<T> = { [K in keyof T]: Recursive<Omit<T, K>> };
export type Query = (select: Recursive<{}>) => void;