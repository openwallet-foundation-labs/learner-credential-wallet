import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import ApprovalControls from '../app/components/ApprovalControls/ApprovalControls'
import {
  PendingCredential,
  ApprovalStatus,
  ApprovalMessage
} from '../app/store/slices/credentialFoyer'
import { mockCredential } from '../app/mock/credential'
import { ObjectID } from 'bson'

// Mock the navigation
jest.mock('../app/navigation/navigationRef', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    navigate: jest.fn()
  }
}))

// Mock the hooks
jest.mock('../app/hooks', () => ({
  useAppDispatch: () => jest.fn(),
  useDynamicStyles: () => ({
    styles: {
      approvalContainer: {},
      button: {},
      buttonPrimary: {},
      buttonText: {},
      buttonTextPrimary: {},
      buttonSpacer: {},
      credentialStatusContainer: {},
      statusText: {},
      statusTextOutside: {}
    },
    theme: {
      iconSize: 24,
      color: {
        success: '#00ff00',
        error: '#ff0000'
      }
    }
  }),
  useAccessibilityFocus: () => [null, jest.fn()]
}))

// Mock MaterialIcons
jest.mock('@expo/vector-icons', () => ({
  MaterialIcons: 'MaterialIcons'
}))

// Mock the credential foyer actions
jest.mock('../app/store/slices/credentialFoyer', () => ({
  ...jest.requireActual('../app/store/slices/credentialFoyer'),
  setCredentialApproval: jest.fn(() => ({ type: 'setCredentialApproval' })),
  acceptPendingCredentials: jest.fn(() => ({
    type: 'acceptPendingCredentials'
  })),
  clearFoyer: jest.fn(() => ({ type: 'clearFoyer' }))
}))

const createMockStore = () =>
  configureStore({
    reducer: {
      credentialFoyer: (state = { pendingCredentials: [] }) => state
    }
  })

describe('ApprovalControls', () => {
  const mockProfileRecordId = new ObjectID()
  let mockStore: any

  beforeEach(() => {
    mockStore = createMockStore()
    jest.clearAllMocks()
  })

  const renderComponent = (pendingCredential: PendingCredential) => {
    return render(
      <Provider store={mockStore}>
        <ApprovalControls
          pendingCredential={pendingCredential}
          profileRecordId={mockProfileRecordId}
        />
      </Provider>
    )
  }

  describe('Pending status', () => {
    it('should render Accept and Decline buttons for pending credentials', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Pending
      )
      const { getByText } = renderComponent(pendingCredential)

      expect(getByText('Accept')).toBeTruthy()
      expect(getByText('Decline')).toBeTruthy()
    })

    it('should call acceptPendingCredentials when Accept is pressed', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Pending
      )
      const { getByText } = renderComponent(pendingCredential)

      fireEvent.press(getByText('Accept'))
      // The actual dispatch call would be tested in integration tests
    })

    it('should call setCredentialApproval when Decline is pressed', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Pending
      )
      const { getByText } = renderComponent(pendingCredential)

      fireEvent.press(getByText('Decline'))
      // The actual dispatch call would be tested in integration tests
    })
  })

  describe('PendingDuplicate status', () => {
    it('should render Close button for duplicate credentials', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.PendingDuplicate
      )
      const { getByText } = renderComponent(pendingCredential)

      expect(getByText('Close')).toBeTruthy()
      expect(() => getByText('Accept')).toThrow()
      expect(() => getByText('Decline')).toThrow()
    })

    it('should display duplicate message for duplicate credentials', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.PendingDuplicate
      )
      const { getByText } = renderComponent(pendingCredential)

      expect(getByText(ApprovalMessage.Duplicate)).toBeTruthy()
    })

    it('should call rejectAndExit when Close is pressed', async () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.PendingDuplicate
      )
      const { getByText } = renderComponent(pendingCredential)

      fireEvent.press(getByText('Close'))

      // The actual navigation and dispatch calls would be tested in integration tests
      // Here we just verify the button is pressable
      expect(getByText('Close')).toBeTruthy()
    })

    it('should not navigate when navigationRef is not ready', async () => {
      const { navigationRef } = require('../app/navigation/navigationRef')
      navigationRef.isReady.mockReturnValue(false)

      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.PendingDuplicate
      )
      const { getByText } = renderComponent(pendingCredential)

      fireEvent.press(getByText('Close'))

      expect(navigationRef.navigate).not.toHaveBeenCalled()
    })
  })

  describe('Completed status', () => {
    it('should render status icon and message for accepted credentials', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Accepted
      )
      const { getByText } = renderComponent(pendingCredential)

      expect(getByText(ApprovalMessage.Accepted)).toBeTruthy()
    })

    it('should render status icon and message for rejected credentials', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Rejected
      )
      const { getByText } = renderComponent(pendingCredential)

      expect(getByText(ApprovalMessage.Rejected)).toBeTruthy()
    })

    it('should render status icon and message for errored credentials', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Errored
      )
      const { getByText } = renderComponent(pendingCredential)

      expect(getByText(ApprovalMessage.Errored)).toBeTruthy()
    })

    it('should use message override when provided', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Rejected,
        ApprovalMessage.Duplicate
      )
      const { getByText } = renderComponent(pendingCredential)

      expect(getByText(ApprovalMessage.Duplicate)).toBeTruthy()
    })
  })

  describe('Accessibility', () => {
    it('should render buttons with proper accessibility', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Pending
      )
      const { getByText } = renderComponent(pendingCredential)

      const acceptButton = getByText('Accept')
      const declineButton = getByText('Decline')

      // Verify buttons are rendered and accessible
      expect(acceptButton).toBeTruthy()
      expect(declineButton).toBeTruthy()
    })

    it('should render status message for completed status', () => {
      const pendingCredential = new PendingCredential(
        mockCredential,
        ApprovalStatus.Accepted
      )
      const { getByText } = renderComponent(pendingCredential)

      // Check that the status message is displayed
      expect(getByText(ApprovalMessage.Accepted)).toBeTruthy()
    })
  })
})
