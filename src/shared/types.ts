import { app } from '../main/app';

export type App = typeof app;

export type PickMethods<T> = Pick<T, FunctionPropertyNames<T>>;

export type FunctionPropertyNames<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];
