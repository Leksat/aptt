import { app } from '../main/app';

export type App = typeof app;

export type PickMethods<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof T]: T[K] extends Function ? T[K] : void;
};

type Bob = Pick<App, 'showWindow'>;
