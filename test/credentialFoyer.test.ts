import { configureStore } from '@reduxjs/toolkit'
import credentialFoyerReducer, {
  stageCredentials,
  stageCredentialsForProfile,
  acceptPendingCredentials,
  clearFoyer,
  setCredentialApproval,
  ApprovalStatus,
  ApprovalMessage,
  PendingCredential
} from '../app/store/slices/credentialFoyer'
import { mockCredential, mockCredential2 } from '../app/mock/credential'
import { ObjectID } from 'bson'

// Mock the credential model
jest.mock('../app/model/credential', () => ({
  CredentialRecord: {
    getAllCredentialRecords: jest.fn()
  }
}))

// Mock the credential hash functions
jest.mock('../app/lib/credentialHash', () => ({
  credentialContentHash: jest.fn((credential) => {
    // Create consistent hashes for the same credential
    if (credential === mockCredential) return 'hash_mock1'
    if (credential === mockCredential2) return 'hash_mock2'
    return `hash_${credential.id || 'unknown'}`
  })
}))

import { CredentialRecord } from '../app/model/credential'

const mockGetAllCredentialRecords =
  CredentialRecord.getAllCredentialRecords as jest.MockedFunction<
    typeof CredentialRecord.getAllCredentialRecords
  >

describe('credentialFoyer slice', () => {
  let store: any
  const mockProfileId = new ObjectID()

  beforeEach(() => {
    store = configureStore({
      reducer: {
        credentialFoyer: credentialFoyerReducer
      }
    })
    jest.clearAllMocks()
  })

  describe('stageCredentials', () => {
    it('should stage credentials without duplicates', async () => {
      mockGetAllCredentialRecords.mockResolvedValue([])

      await store.dispatch(stageCredentials([mockCredential]))

      const state = store.getState().credentialFoyer
      expect(state.pendingCredentials).toHaveLength(1)
      expect(state.pendingCredentials[0].status).toBe(ApprovalStatus.Pending)
    })

    it('should mark duplicate credentials as PendingDuplicate', async () => {
      mockGetAllCredentialRecords.mockResolvedValue([
        { credential: mockCredential } as any
      ])

      await store.dispatch(stageCredentials([mockCredential]))

      const state = store.getState().credentialFoyer
      expect(state.pendingCredentials).toHaveLength(1)
      expect(state.pendingCredentials[0].status).toBe(
        ApprovalStatus.PendingDuplicate
      )
    })
  })

  describe('stageCredentialsForProfile', () => {
    it('should stage credentials for specific profile without duplicates', async () => {
      mockGetAllCredentialRecords.mockResolvedValue([])

      await store.dispatch(
        stageCredentialsForProfile({
          credentials: [mockCredential],
          profileRecordId: mockProfileId
        })
      )

      const state = store.getState().credentialFoyer
      expect(state.pendingCredentials).toHaveLength(1)
      expect(state.pendingCredentials[0].status).toBe(ApprovalStatus.Pending)
    })

    it('should mark duplicates only within the same profile', async () => {
      const otherProfileId = new ObjectID()
      mockGetAllCredentialRecords.mockResolvedValue([
        { credential: mockCredential, profileRecordId: otherProfileId } as any
      ])

      await store.dispatch(
        stageCredentialsForProfile({
          credentials: [mockCredential],
          profileRecordId: mockProfileId
        })
      )

      const state = store.getState().credentialFoyer
      expect(state.pendingCredentials).toHaveLength(1)
      expect(state.pendingCredentials[0].status).toBe(ApprovalStatus.Pending)
    })

    it('should mark duplicates within the same profile', async () => {
      mockGetAllCredentialRecords.mockResolvedValue([
        { credential: mockCredential, profileRecordId: mockProfileId } as any
      ])

      await store.dispatch(
        stageCredentialsForProfile({
          credentials: [mockCredential],
          profileRecordId: mockProfileId
        })
      )

      const state = store.getState().credentialFoyer
      expect(state.pendingCredentials).toHaveLength(1)
      expect(state.pendingCredentials[0].status).toBe(
        ApprovalStatus.PendingDuplicate
      )
    })
  })

  describe('acceptPendingCredentials', () => {
    let mockAddCredential: jest.Mock

    beforeEach(() => {
      // Mock the addCredential action
      mockAddCredential = jest.fn(() => ({ type: 'credential/addCredential' }))
      jest.doMock('../app/store/slices/credential', () => ({
        addCredential: mockAddCredential
      }))
    })

    it('should skip duplicate credentials and mark them as rejected', async () => {
      const duplicateCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.PendingDuplicate
      )

      // Stage the duplicate credential first
      store.dispatch({
        type: 'credentialFoyer/stageCredentialsForProfile/fulfilled',
        payload: { pendingCredentials: [duplicateCredential] }
      })

      // Mock the dispatch to simulate the behavior
      const mockDispatch = jest.fn()
      const mockGetState = jest.fn(() => store.getState())

      // Manually call the thunk function
      const thunk = acceptPendingCredentials({
        pendingCredentials: [duplicateCredential],
        profileRecordId: mockProfileId
      })

      await thunk(mockDispatch, mockGetState, undefined)

      // Check that setCredentialApproval was called with correct parameters
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setCredentialApproval'),
          payload: expect.objectContaining({
            status: ApprovalStatus.Rejected,
            messageOverride: ApprovalMessage.Duplicate
          })
        })
      )
    })

    it('should accept non-duplicate credentials', async () => {
      const normalCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Pending
      )

      // Stage the normal credential first
      store.dispatch({
        type: 'credentialFoyer/stageCredentialsForProfile/fulfilled',
        payload: { pendingCredentials: [normalCredential] }
      })

      // Mock the dispatch to simulate the behavior
      const mockDispatch = jest.fn()
      const mockGetState = jest.fn(() => store.getState())

      // Manually call the thunk function
      const thunk = acceptPendingCredentials({
        pendingCredentials: [normalCredential],
        profileRecordId: mockProfileId
      })

      await thunk(mockDispatch, mockGetState, undefined)

      // Check that setCredentialApproval was called with accepted status
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.stringContaining('setCredentialApproval'),
          payload: expect.objectContaining({
            status: ApprovalStatus.Accepted
          })
        })
      )
    })
  })

  describe('clearFoyer', () => {
    it('should clear all pending credentials', () => {
      // Add some credentials first
      store.dispatch({
        type: 'credentialFoyer/stageCredentials/fulfilled',
        payload: { pendingCredentials: [new PendingCredential(mockCredential)] }
      })

      store.dispatch(clearFoyer())

      const state = store.getState().credentialFoyer
      expect(state.pendingCredentials).toHaveLength(0)
      expect(state.selectedExchangeCredentials).toHaveLength(0)
    })
  })

  describe('setCredentialApproval', () => {
    it('should update credential approval status', () => {
      const pendingCredential = new PendingCredential(mockCredential)

      // Stage the credential first
      store.dispatch({
        type: 'credentialFoyer/stageCredentials/fulfilled',
        payload: { pendingCredentials: [pendingCredential] }
      })

      // Update the approval status
      store.dispatch(
        setCredentialApproval({
          ...pendingCredential,
          status: ApprovalStatus.Accepted
        })
      )

      const state = store.getState().credentialFoyer
      const credential = state.pendingCredentials.find(
        (c: any) => c.id === pendingCredential.id
      )
      expect(credential?.status).toBe(ApprovalStatus.Accepted)
    })
  })

  describe('PendingCredential class', () => {
    it('should create a pending credential with default status', () => {
      const pendingCredential = new PendingCredential(mockCredential)
      expect(pendingCredential.credential).toBe(mockCredential)
      expect(pendingCredential.status).toBe(ApprovalStatus.Pending)
      expect(pendingCredential.id).toBeDefined()
    })

    it('should create a pending credential with custom status', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.PendingDuplicate
      )
      expect(pendingCredential.status).toBe(ApprovalStatus.PendingDuplicate)
    })

    it('should create a pending credential with message override', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Rejected,
        ApprovalMessage.Duplicate
      )
      expect(pendingCredential.messageOverride).toBe(ApprovalMessage.Duplicate)
    })
  })

  describe('ApprovalMessage enum', () => {
    it('should have correct duplicate message', () => {
      expect(ApprovalMessage.Duplicate).toBe(
        'This credential already exists in the selected profile and cannot be added again.'
      )
    })
  })
})
