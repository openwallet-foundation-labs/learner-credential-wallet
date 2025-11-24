import { configureStore } from '@reduxjs/toolkit'

import wallet from './slices/wallet'
import did from './slices/did'
import credentialFoyer from './slices/credentialFoyer'
import credential from './slices/credential'
import profile from './slices/profile'

const store = configureStore({
  reducer: {
    wallet,
    did,
    credentialFoyer,
    credential,
    profile
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false
    })
})

export { getAllRecords } from './getAllRecords'
export default store

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
