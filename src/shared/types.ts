/* eslint-disable @typescript-eslint/no-explicit-any */

import { app } from '../main/app';

export type App = typeof app;

export type WithNoReturnValue<
  T extends Record<string, (...args: any) => any>
> = {
  [P in keyof T]: (...args: Parameters<T[P]>) => void;
};

export type PickMethods<T> = Pick<T, FunctionPropertyNames<T>>;

export type FunctionPropertyNames<T> = {
  [P in keyof T]: T[P] extends (...args: any) => any ? P : never;
}[keyof T];
