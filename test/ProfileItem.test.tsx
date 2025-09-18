import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// Mock React Native dependencies first
jest.mock('react-native', () => ({
  View: ({ children, onPress, testID }: any) => (
    <div onClick={onPress} testID={testID}>{children}</div>
  ),
  Text: ({ children }: any) => <span>{children}</span>,
  StyleSheet: { 
    create: jest.fn((styles: any) => styles),
    flatten: jest.fn((styles: any) => styles)
  },
  Dimensions: { get: jest.fn(() => ({ width: 375, height: 667 })) },
  Platform: { OS: 'ios', select: jest.fn((obj: any) => obj.ios) },
}));

jest.mock('react-native-paper', () => ({
  TextInput: ({ value, onChangeText, label, testID }: any) => (
    <input aria-label={label} testID={testID || label} value={value} onChange={(e: any) => onChangeText && onChangeText(e.target.value)} />
  ),
}));

jest.mock('react-native-elements', () => ({
  Button: ({ onPress, title, testID }: any) => (
    <div onClick={onPress} testID={testID || title}>{title}</div>
  ),
}));

// Mock app dependencies
jest.mock('../app/hooks', () => ({
  useAppDispatch: jest.fn(),
  useDynamicStyles: jest.fn(() => ({
    styles: {
      container: {},
      textContainer: {},
      titleText: {},
      subtitleText: {},
      input: {},
      underline: {},
    },
    theme: {
      color: {
        textPrimary: '#000',
        inputInactive: '#999',
        brightAccent: '#007AFF',
      },
    },
    mixins: {
      modalBodyText: {},
      buttonClear: {},
      buttonClearTitle: {},
      buttonClearContainer: {},
    },
  })),
}));

jest.mock('../app/store/slices/profile', () => ({
  deleteProfile: jest.fn((payload?: any) => ({ type: 'profile/delete', payload })),
  updateProfile: jest.fn((payload?: any) => ({ type: 'profile/update', payload })),
}));

jest.mock('../app/lib/export', () => ({
  exportProfile: jest.fn(),
}));

jest.mock('../app/lib/text', () => ({
  fmtCredentialCount: jest.fn((count) => `${count} credential${count !== 1 ? 's' : ''}`),
}));

jest.mock('../app/lib/error', () => ({
  errorMessageFrom: jest.fn((err) => err.message || 'Unknown error'),
}));

import ProfileItem from '../app/components/ProfileItem/ProfileItem';
import { deleteProfile, updateProfile } from '../app/store/slices/profile';
import { exportProfile } from '../app/lib/export';

// Provide navigation mock entirely within factory scope
jest.mock('../app/navigation', () => {
  const mockNavigate = jest.fn();
  return {
    navigationRef: {
      isReady: jest.fn(() => true),
      navigate: (...args: any[]) => mockNavigate(...args),
    },
    __esModule: true as const,
    _mockNavigate: mockNavigate,
  };
});

// Make app components interactive using RN View
jest.mock('../app/components', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    MoreMenuButton: ({ children }: any) => React.createElement(View, null, children),
    MenuItem: ({ title, onPress }: any) => (
      React.createElement(View, { onPress, testID: `menu-${title}` }, title)
    ),
    ConfirmModal: ({ title, children, onConfirm, onCancel, onRequestClose, cancelButton = true }: any) => (
      React.createElement(View, null,
        React.createElement(View, { testID: 'modal-title' }, title),
        React.createElement(View, { onPress: onConfirm, testID: 'confirm' }, 'confirm'),
        cancelButton ? React.createElement(View, { onPress: onCancel || onRequestClose, testID: 'cancel' }, 'cancel') : null,
        children
      )
    ),
    BackupItemModal: ({ title, onBackup, onRequestClose }: any) => (
      React.createElement(View, null,
        React.createElement(View, { testID: 'backup-title' }, title || 'Backup'),
        React.createElement(View, { onPress: onBackup, testID: 'backup-do' }, 'backup'),
        React.createElement(View, { onPress: onRequestClose, testID: 'backup-close' }, 'close')
      )
    ),
  };
});

describe('ProfileItem Component', () => {
  const mockDispatch = jest.fn();
  const mockProfileRecord: any = {
    _id: '1',
    profileName: 'Test Profile',
    rawCredentialRecords: [
      { credential: { credentialSubject: { hasCredential: { name: 'Credential 1' } } } },
      { credential: { credentialSubject: { hasCredential: { name: 'Credential 2' } } } },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { useAppDispatch } = require('../app/hooks');
    useAppDispatch.mockReturnValue(mockDispatch);
  });

  it('renders menu items so component mounted', () => {
    const { getByTestId } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);
    expect(getByTestId('menu-Rename')).toBeTruthy();
    expect(getByTestId('menu-Backup')).toBeTruthy();
    expect(getByTestId('menu-View Source')).toBeTruthy();
    expect(getByTestId('menu-Delete')).toBeTruthy();
  });

  it('renames a profile via modal', async () => {
    mockDispatch.mockResolvedValue({});
    const { getByTestId } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);

    // Open rename
    fireEvent.press(getByTestId('menu-Rename'));

    // Change text and confirm
    const input = getByTestId('Profile Name');
    fireEvent.changeText(input, 'Renamed');

    await act(async () => {
      fireEvent.press(getByTestId('confirm'));
    });

    expect(updateProfile).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('backs up a profile', () => {
    const { getByTestId } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);

    fireEvent.press(getByTestId('menu-Backup'));
    fireEvent.press(getByTestId('backup-do'));

    expect(exportProfile).toHaveBeenCalledWith(mockProfileRecord);
  });

  it('navigates to View Source and clears modal', () => {
    const { getByTestId } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);

    const { _mockNavigate } = require('../app/navigation');

    fireEvent.press(getByTestId('menu-View Source'));
    expect(_mockNavigate).toHaveBeenCalledWith('ViewSourceScreen', expect.any(Object));
  });

  it('deletes a profile successfully', async () => {
    mockDispatch.mockResolvedValue({});
    const { getByTestId } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);

    fireEvent.press(getByTestId('menu-Delete'));
    await act(async () => {
      fireEvent.press(getByTestId('confirm'));
    });

    expect(deleteProfile).toHaveBeenCalledWith(mockProfileRecord);
    expect(mockDispatch).toHaveBeenCalled();
  });

  it('shows error when delete fails and can close the error modal', async () => {
    mockDispatch.mockRejectedValueOnce(new Error('boom'));
    const { getByTestId } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);

    fireEvent.press(getByTestId('menu-Delete'));
    await act(async () => {
      fireEvent.press(getByTestId('confirm'));
    });

    // Error modal displayed (confirm present without cancel)
    expect(getByTestId('confirm')).toBeTruthy();

    // Close error modal
    fireEvent.press(getByTestId('confirm'));
  });

  it('navigates to Delete Details from delete modal', () => {
    const { getByTestId } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);

    const { _mockNavigate } = require('../app/navigation');

    fireEvent.press(getByTestId('menu-Delete'));
    fireEvent.press(getByTestId('Details'));

    expect(_mockNavigate).toHaveBeenCalledWith('HomeNavigation', expect.any(Object));
  });

  it('handles navigation not ready for view source', () => {
    const { navigationRef, _mockNavigate } = require('../app/navigation');
    navigationRef.isReady.mockReturnValueOnce(false);

    const { getByTestId } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);

    fireEvent.press(getByTestId('menu-View Source'));
    expect(_mockNavigate).not.toHaveBeenCalled();
  });
});