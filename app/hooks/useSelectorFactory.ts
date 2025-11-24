import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../store'
import {
  SelectorFactoryProps,
  SelectorFactoryReturn,
  UnknownSelectorFactory
} from '../store/selectorFactories'

export function useSelectorFactory<F extends UnknownSelectorFactory>(
  selectorFactory: F,
  props?: SelectorFactoryProps<F>
): SelectorFactoryReturn<F> {
  const selector = useMemo(selectorFactory, [])
  const value = useSelector<RootState>((state) => selector(state, props))

  return value as SelectorFactoryReturn<F>
}
