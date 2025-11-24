import { useDispatch } from 'react-redux'
import { AppDispatch } from '../store'

/**
 * Typed version of redux `useDispatch() hook.`
 */
export const useAppDispatch: () => AppDispatch = useDispatch
