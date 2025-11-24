import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import AsyncStorage from '@react-native-async-storage/async-storage'

import { type RootState } from '..'
import { GlobalModalPayload } from '../../components'
import { isBiometricsSupported } from '../../lib/biometrics'
import { importWalletOrProfileFrom } from '../../lib/import'
import { db, INITIAL_PROFILE_NAME } from '../../model'
import { loadThemeName, saveThemeName } from '../../styles/theme/themeName'
import { createProfile } from './profile'
import { Cache } from '../../lib/cache'
import { getAllRecords } from '../getAllRecords'

type InitializeParams = {
  passphrase: string
  enableBiometrics: boolean
  existingData?: string
}

export type WalletState = {
  isUnlocked: boolean | null
  isInitialized: boolean | null
  isBiometricsSupported: boolean | null
  isBiometricsEnabled: boolean
  needsRestart: boolean
  themeName: string | null
  globalModal: GlobalModalPayload | null
}

const initialState: WalletState = {
  isUnlocked: null,
  isInitialized: null,
  isBiometricsSupported: null,
  isBiometricsEnabled: false,
  needsRestart: false,
  themeName: null,
  globalModal: null
}

const pollWalletState = createAsyncThunk('walletState/pollState', async () => {
  return {
    isUnlocked: await db.isUnlocked(),
    isInitialized: await db.isInitialized(),
    isBiometricsEnabled: await db.isBiometricsEnabled(),
    isBiometricsSupported: await isBiometricsSupported(),
    themeName: await loadThemeName()
  }
})

const lock = createAsyncThunk('walletState/lock', async (_, { dispatch }) => {
  await db.lock()
  await dispatch(pollWalletState())
})

const unlock = createAsyncThunk(
  'walletState/unlock',
  async (passphrase: string, { dispatch }) => {
    await db.unlock(passphrase)
    await dispatch(getAllRecords())
    await dispatch(pollWalletState())
  }
)

const unlockWithBiometrics = createAsyncThunk(
  'walletState/unlockWithBiometrics',
  async (_, { dispatch }) => {
    await db.unlockWithBiometrics()
    await dispatch(getAllRecords())
    await dispatch(pollWalletState())
  }
)

const initialize = createAsyncThunk(
  'walletState/initialize',
  async (
    { passphrase, enableBiometrics, existingData }: InitializeParams,
    { dispatch }
  ) => {
    try {
      await db.initialize(passphrase)
      await db.unlock(passphrase)
    } catch (err) {
      console.error('Wallet initialization failed:', err)
      return
    }

    if (enableBiometrics) {
      try {
        await db.enableBiometrics()
      } catch (err) {
        console.error('Biometric auth initialization failed:', err)
      }
    }

    let reportDetails = undefined

    if (existingData) {
      try {
        reportDetails = await importWalletOrProfileFrom(existingData)
      } catch (err) {
        await db.lock().then(db.reset)
        throw err
      }
    } else {
      try {
        await dispatch(
          createProfile({ profileName: INITIAL_PROFILE_NAME })
        ).unwrap()
      } catch (err) {
        console.error('Profile creation failed:', err)
      }
    }

    await dispatch(getAllRecords())
    return reportDetails
  }
)

const reset = createAsyncThunk('walletState/reset', async () => {
  await db.lock()
  await db.reset()
  await Cache.getInstance().clear()

  /** For now, we are leaving the cached theme name intact on wallet reset. */
  const themeName = await loadThemeName()
  await AsyncStorage.clear()
  if (themeName) await saveThemeName(themeName)
})

const toggleBiometrics = createAsyncThunk(
  'walletState/toggleBiometrics',
  async (_, { getState, dispatch }) => {
    const state = (await getState()) as RootState
    const { isBiometricsEnabled } = state.wallet

    if (isBiometricsEnabled) {
      await db.disableBiometrics()
    } else {
      await db.enableBiometrics()
    }

    await dispatch(pollWalletState())
  }
)

const updateThemeName = createAsyncThunk(
  'walletState/updateThemeName',
  async (themeName: string, { dispatch }) => {
    await saveThemeName(themeName)
    await dispatch(pollWalletState())
  }
)

const walletSlice = createSlice({
  name: 'walletState',
  initialState,
  reducers: {
    setGlobalModal(state, action: PayloadAction<GlobalModalPayload | null>) {
      state.globalModal = action.payload
    }
  },
  extraReducers: (builder) => {
    builder.addCase(unlock.rejected, (_, action) => {
      throw action.error
    })

    builder.addCase(unlockWithBiometrics.rejected, (_, action) => {
      throw action.error
    })

    builder.addCase(toggleBiometrics.rejected, (_, action) => {
      throw action.error
    })

    builder.addCase(initialize.rejected, (_, action) => {
      throw action.error
    })

    builder.addCase(reset.fulfilled, () => ({
      ...initialState,
      needsRestart: true
    }))

    builder.addCase(pollWalletState.fulfilled, (state, action) => ({
      ...state,
      ...action.payload
    }))

    builder.addCase(pollWalletState.rejected, (_, action) => {
      throw action.error
    })
  }
})

export default walletSlice.reducer
export const { setGlobalModal } = walletSlice.actions

export {
  unlock,
  unlockWithBiometrics,
  lock,
  initialize,
  reset,
  pollWalletState,
  toggleBiometrics,
  updateThemeName
}

export const selectWalletState = (state: RootState): WalletState => state.wallet
