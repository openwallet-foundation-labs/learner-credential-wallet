import store, { RootState } from '..';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SelectorProps = any;
export type Selector<Props, Return> = (state: RootState, props: Props) => Return; 
export type SelectorFactory<S extends UnknownSelector> = () => S;
export type SelectorFactoryReturn<F extends UnknownSelectorFactory> = ReturnType<ReturnType<F>>;
export type SelectorFactoryProps<F extends UnknownSelectorFactory> = Parameters<ReturnType<F>>[1];
export type SelectorFactoryCallbackReturn<F extends UnknownSelectorFactory> = (props: SelectorFactoryProps<F>) => SelectorFactoryReturn<F>
export type UnknownSelector = Selector<SelectorProps, unknown>;
export type UnknownSelectorFactory = SelectorFactory<UnknownSelector>;

export const selectProps = (state: RootState, props: SelectorProps): SelectorProps => props;

export function expectValue<T>(value: T, errorMessage: string): NonNullable<T> {
  if (value !== undefined && value !== null) {
    return value as NonNullable<T>;
  } else {
    throw new Error(errorMessage);
  }
}

export function selectWithFactory<F extends UnknownSelectorFactory>(selectorFactory: F, props: SelectorFactoryProps<F>): SelectorFactoryReturn<F> {
  const selector = selectorFactory();
  const state = store.getState();
  const value = selector(state, props);

  return value as SelectorFactoryReturn<F>;
}

// Individual selector factories should be imported directly to avoid cycles
// export * from './makeSelectDidForCredential';
// export * from './makeSelectDidFromProfile';
// export * from './makeSelectProfileFromCredential';
// export * from './makeSelectProfilesWithCredentials';
