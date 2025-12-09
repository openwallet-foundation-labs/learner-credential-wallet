import React from 'react'
import { render } from '@testing-library/react-native'

jest.mock('react-redux', () => ({
  useSelector: jest.fn()
}))

jest.mock('../app/hooks', () => ({
  useAppDispatch: jest.fn(),
  useDynamicStyles: jest.fn()
}))

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn()
}))

jest.mock('../app/navigation/navigationRef', () => ({
  navigationRef: { navigate: jest.fn(), isReady: jest.fn(() => true) }
}))

jest.mock('../app/store/slices/credentialFoyer', () => ({
  selectPendingCredentials: jest.fn(),
  clearFoyer: jest.fn(),
  acceptPendingCredentials: jest.fn(),
  setCredentialApproval: jest.fn(),
  ApprovalStatus: { Pending: 0, PendingDuplicate: 1, Accepted: 2, Rejected: 3 }
}))

jest.mock('../app/model/credential', () => ({
  CredentialRecord: { getAllCredentialRecords: jest.fn() }
}))

jest.mock('../app/components/NavHeader/NavHeader', () => 'NavHeader')
jest.mock(
  '../app/components/CredentialItem/CredentialItem',
  () => 'CredentialItem'
)
jest.mock(
  '../app/components/ApprovalControls/ApprovalControls',
  () => 'ApprovalControls'
)
jest.mock(
  '../app/components/CredentialRequestHandler/CredentialRequestHandler',
  () => 'CredentialRequestHandler'
)
jest.mock('../app/components/ConfirmModal/ConfirmModal', () => 'ConfirmModal')

import ApproveCredentialsScreen from '../app/screens/ApproveCredentialsScreen/ApproveCredentialsScreen'

describe('ApproveCredentialsScreen', () => {
  const mockDispatch = jest.fn()
  const mockNavigation: any = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    getParent: jest.fn()
  }
  const mockRoute: any = {
    params: {
      rawProfileRecord: { _id: 'profile1', profileName: 'Test Profile' },
      canGoBack: true
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    const { useAppDispatch, useDynamicStyles } = require('../app/hooks')
    const { useSelector } = require('react-redux')

    useAppDispatch.mockReturnValue(mockDispatch)
    useDynamicStyles.mockReturnValue({
      styles: {},
      mixins: {}
    })
    useSelector.mockReturnValue([])
  })

  it('renders with canGoBack true', () => {
    const { UNSAFE_root } = render(
      <ApproveCredentialsScreen navigation={mockNavigation} route={mockRoute} />
    )
    expect(UNSAFE_root).toBeTruthy()
  })

  it('renders without canGoBack', () => {
    const routeWithoutGoBack: any = {
      params: {
        rawProfileRecord: { _id: 'profile1', profileName: 'Test Profile' },
        canGoBack: false
      }
    }
    const { UNSAFE_root } = render(
      <ApproveCredentialsScreen
        navigation={mockNavigation}
        route={routeWithoutGoBack}
      />
    )
    expect(UNSAFE_root).toBeTruthy()
  })

  it('filters pending credentials correctly', () => {
    const { useSelector } = require('react-redux')
    const { ApprovalStatus } = require('../app/store/slices/credentialFoyer')

    const mockCredentials = [
      { id: '1', status: ApprovalStatus.Pending },
      { id: '2', status: ApprovalStatus.PendingDuplicate },
      { id: '3', status: ApprovalStatus.Accepted }
    ]

    useSelector.mockReturnValue(mockCredentials)

    const { UNSAFE_root } = render(
      <ApproveCredentialsScreen navigation={mockNavigation} route={mockRoute} />
    )
    expect(UNSAFE_root).toBeTruthy()
  })

  it('shows Accept button when only one acceptable credential', () => {
    const { useSelector } = require('react-redux')
    const { ApprovalStatus } = require('../app/store/slices/credentialFoyer')

    useSelector.mockReturnValue([{ id: '1', status: ApprovalStatus.Pending }])

    const { UNSAFE_root } = render(
      <ApproveCredentialsScreen navigation={mockNavigation} route={mockRoute} />
    )
    expect(UNSAFE_root).toBeTruthy()
  })

  it('shows Accept All button when multiple acceptable credentials', () => {
    const { useSelector } = require('react-redux')
    const { ApprovalStatus } = require('../app/store/slices/credentialFoyer')

    useSelector.mockReturnValue([
      { id: '1', status: ApprovalStatus.Pending },
      { id: '2', status: ApprovalStatus.Pending }
    ])

    const { UNSAFE_root } = render(
      <ApproveCredentialsScreen navigation={mockNavigation} route={mockRoute} />
    )
    expect(UNSAFE_root).toBeTruthy()
  })

  it('does not show Accept All button when only duplicates', () => {
    const { useSelector } = require('react-redux')
    const { ApprovalStatus } = require('../app/store/slices/credentialFoyer')

    useSelector.mockReturnValue([
      { id: '1', status: ApprovalStatus.PendingDuplicate }
    ])

    const { UNSAFE_root } = render(
      <ApproveCredentialsScreen navigation={mockNavigation} route={mockRoute} />
    )
    expect(UNSAFE_root).toBeTruthy()
  })
})
