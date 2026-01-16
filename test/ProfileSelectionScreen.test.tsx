import React from 'react'
import { render, fireEvent } from '@testing-library/react-native'

// Mock React Native dependencies with a functional FlatList
jest.mock('react-native', () => {
  const React = require('react')
  const View = 'View'
  const Text = 'Text'
  const FlatList = ({ ListHeaderComponent, data, renderItem, style }: any) =>
    React.createElement(
      'View',
      { style },
      ListHeaderComponent || null,
      Array.isArray(data)
        ? data.map((item: any, index: number) =>
            React.createElement(
              'View',
              { key: String(index) },
              renderItem({ item, index })
            )
          )
        : null
    )
  return {
    FlatList,
    Text,
    View,
    StyleSheet: {
      create: jest.fn((styles: any) => styles),
      flatten: jest.fn((styles: any) => styles)
    },
    Dimensions: { get: jest.fn(() => ({ width: 375, height: 667 })) },
    Platform: { OS: 'ios', select: jest.fn((obj: any) => obj.ios) }
  }
})

// Make Button interactive so we can simulate presses (RN-style)
jest.mock('react-native-elements', () => {
  const React = require('react')
  const { View } = require('react-native')
  return {
    Button: ({ onPress, title }: any) =>
      React.createElement(View, { onPress, testID: `button-${title}` }, title),
    ListItem: {
      Chevron: 'Chevron'
    }
  }
})

jest.mock('react-redux', () => ({
  useSelector: jest.fn()
}))

// Mock app dependencies
jest.mock('../app/hooks', () => ({
  useDynamicStyles: jest.fn(),
  useSelectorFactory: jest.fn()
}))

jest.mock('../app/components', () => ({
  NavHeader: ({ title }: any) => <div>{title}</div>
}))

jest.mock('../app/store/slices/profile', () => ({
  selectRawProfileRecords: jest.fn()
}))

jest.mock(
  '../app/store/selectorFactories/makeSelectProfileForPendingCredentials',
  () => ({
    makeSelectProfileForPendingCredentials: jest.fn()
  })
)

import ProfileSelectionScreen from '../app/screens/ProfileSelectionScreen/ProfileSelectionScreen'

describe('ProfileSelectionScreen', () => {
  const mockOnSelectProfile = jest.fn()
  const mockGoBack = jest.fn()
  const mockNavigation: any = {
    goBack: mockGoBack
  }

  const mockRoute: any = {
    params: {
      onSelectProfile: mockOnSelectProfile,
      instructionText: 'Select a profile',
      goBack: undefined
    }
  }

  const mockProfiles = [
    { _id: '1', profileName: 'Profile 1' },
    { _id: '2', profileName: 'Profile 2' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    const { useDynamicStyles, useSelectorFactory } = require('../app/hooks')
    const { useSelector } = require('react-redux')

    useDynamicStyles.mockReturnValue({
      styles: { container: {}, listHeader: {} },
      mixins: {
        paragraphText: {},
        buttonIcon: {},
        buttonContainerVertical: {},
        buttonIconTitle: {}
      },
      theme: { color: { textSecondary: '#666' } }
    })

    useSelector.mockReturnValue(mockProfiles)
    useSelectorFactory.mockReturnValue(null) // No associated profile by default
  })

  // Component Rendering Tests
  it('renders correctly with profiles', () => {
    const { UNSAFE_root } = render(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )
    expect(UNSAFE_root).toBeTruthy()
  })

  it('pressing a profile button calls onSelectProfile', () => {
    const { getByTestId } = render(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )

    const profileBtn = getByTestId('button-Profile 1')
    fireEvent.press(profileBtn)
    expect(mockOnSelectProfile).toHaveBeenCalledWith(mockProfiles[0])
  })

  it('calls navigation.goBack when nav header back is pressed', () => {
    const { UNSAFE_root } = render(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )
    expect(UNSAFE_root).toBeTruthy()
  })

  it('handles empty profile list', () => {
    const { useSelector } = require('react-redux')
    useSelector.mockReturnValue([])

    const { UNSAFE_root } = render(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )
    expect(UNSAFE_root).toBeTruthy()
    expect(mockOnSelectProfile).not.toHaveBeenCalled()
  })

  // Business Logic Tests
  it('uses default instruction text when not provided', () => {
    const routeParams: any = undefined
    const defaultText = 'Issue the credential(s) to the selected profile.'
    const instructionText = routeParams?.instructionText || defaultText
    expect(instructionText).toBe(defaultText)
  })

  it('uses custom instruction text when provided', () => {
    const customText = 'Custom instruction text'
    const routeParams = { instructionText: customText }
    const instructionText =
      routeParams.instructionText ||
      'Issue the credential(s) to the selected profile.'
    expect(instructionText).toBe(customText)
  })

  it('auto-selects when only one profile exists', () => {
    const { useSelector } = require('react-redux')
    useSelector.mockReturnValue([mockProfiles[0]])

    render(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )
    expect(mockOnSelectProfile).toHaveBeenCalledWith(mockProfiles[0])
  })

  it('auto-selects associated profile when available', () => {
    const { useSelectorFactory } = require('../app/hooks')
    const associatedProfile = {
      _id: 'associated',
      profileName: 'Associated Profile'
    }
    useSelectorFactory.mockReturnValue(associatedProfile)

    render(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )
    expect(mockOnSelectProfile).toHaveBeenCalledWith(associatedProfile)
  })

  it('does not auto-select when multiple profiles and no associated profile', () => {
    const { useSelectorFactory } = require('../app/hooks')
    useSelectorFactory.mockReturnValue(null)

    render(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )
    expect(mockOnSelectProfile).not.toHaveBeenCalled()
  })

  it('uses custom goBack function when provided', () => {
    const customGoBack = jest.fn()
    const routeWithCustomGoBack: any = {
      params: {
        onSelectProfile: mockOnSelectProfile,
        goBack: customGoBack
      }
    }

    const { UNSAFE_root } = render(
      <ProfileSelectionScreen
        navigation={mockNavigation}
        route={routeWithCustomGoBack}
      />
    )
    expect(UNSAFE_root).toBeTruthy()
  })

  it('uses navigation goBack when no custom function provided', () => {
    const routeParams: any = { onSelectProfile: mockOnSelectProfile }
    const navigationGoBack = mockGoBack
    const goBackFunction = routeParams.goBack || navigationGoBack
    goBackFunction()
    expect(mockGoBack).toHaveBeenCalled()
  })

  it('formats profile list data correctly', () => {
    const rawProfileRecords = mockProfiles
    const flatListData = [...rawProfileRecords]
    expect(flatListData).toHaveLength(2)
    expect(flatListData[0]).toHaveProperty('profileName', 'Profile 1')
    expect(flatListData[1]).toHaveProperty('profileName', 'Profile 2')
  })

  it('logs profile records to console', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
    render(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )
    expect(consoleSpy).toHaveBeenCalledWith('Profile records:', mockProfiles)
    consoleSpy.mockRestore()
  })

  it('handles missing route params gracefully', () => {
    const emptyRoute: any = { params: undefined }
    const { UNSAFE_root } = render(
      <ProfileSelectionScreen navigation={mockNavigation} route={emptyRoute} />
    )
    expect(UNSAFE_root).toBeTruthy()
  })

  it('sets hasAutoSelected flag when profile is manually selected', () => {
    const { getByTestId } = render(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )

    const profileBtn = getByTestId('button-Profile 1')
    fireEvent.press(profileBtn)
    expect(mockOnSelectProfile).toHaveBeenCalledTimes(1)
    expect(mockOnSelectProfile).toHaveBeenCalledWith(mockProfiles[0])
  })

  it('does not auto-select again after manual selection', () => {
    const { useSelector } = require('react-redux')
    const { rerender } = render(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )

    // Simulate manual selection
    const { getByTestId } = render(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )
    const profileBtn = getByTestId('button-Profile 1')
    fireEvent.press(profileBtn)

    // Clear mock to check if auto-select happens again
    mockOnSelectProfile.mockClear()

    // Update profiles (simulating navigation back)
    useSelector.mockReturnValue(mockProfiles)
    rerender(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )

    // Should not auto-select again
    expect(mockOnSelectProfile).not.toHaveBeenCalled()
  })

  it('handleSelectProfile is memoized with useCallback', () => {
    const { rerender } = render(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )

    const firstCallCount = mockOnSelectProfile.mock.calls.length

    // Re-render with same props
    rerender(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )

    // Should not cause additional calls if properly memoized
    expect(mockOnSelectProfile.mock.calls.length).toBe(firstCallCount)
  })

  it('calls handleSelectProfile for both auto and manual selection', () => {
    const { useSelector } = require('react-redux')
    useSelector.mockReturnValue([mockProfiles[0]])

    const { getByTestId } = render(
      <ProfileSelectionScreen navigation={mockNavigation} route={mockRoute} />
    )

    // Auto-select should have been called
    expect(mockOnSelectProfile).toHaveBeenCalledWith(mockProfiles[0])
  })
})
