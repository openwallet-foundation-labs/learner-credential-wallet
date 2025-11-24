import store from '../store'
import { setGlobalModal } from '../store/slices/wallet'
import { DisplayGlobalModalPayload } from '../components'

export function displayGlobalModal(
  props: DisplayGlobalModalPayload
): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    store.dispatch(
      setGlobalModal({
        ...props,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false)
      })
    )
  })
}

export function clearGlobalModal(): void {
  store.dispatch(setGlobalModal(null))
}
