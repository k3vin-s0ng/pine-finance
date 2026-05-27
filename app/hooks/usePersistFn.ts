import { useRef } from "react";

/** Generic function constraint for callbacks of any arity. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- required for variadic persist wrapper
type PersistedFn = (...args: any[]) => any;

/**
 * usePersistFn instead of useCallback to reduce cognitive load
 */
export function usePersistFn<T extends PersistedFn>(fn: T): T {
  const fnRef = useRef<T>(fn);
  fnRef.current = fn;

  const persistFn = useRef<T>(null);
  if (!persistFn.current) {
    persistFn.current = function (this: unknown, ...args: Parameters<T>) {
      return fnRef.current.apply(this, args) as ReturnType<T>;
    } as T;
  }

  return persistFn.current;
}
