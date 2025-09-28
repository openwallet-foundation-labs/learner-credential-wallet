import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// Mock navigationRef with proper hoisting
jest.mock('../app/navigation/navigationRef', () => {
  const mockNavigate = jest.fn();
  const mockIsReady = jest.fn(() => true);

  // Store in global for test access
  (global as any).__mockNavigate = mockNavigate;
  (global as any).__mockIsReady = mockIsReady;

  return {
    navigationRef: {
      isReady: mockIsReady,
      navigate: mockNavigate,
    },
  };
});

// Mock React Native dependencies
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  StyleSheet: {
    create: jest.fn((styles: any) => styles),
    flatten: jest.fn((styles: any) => styles)
  },
  Dimensions: { get: jest.fn(() => ({ width: 375, height: 667 })) },
  Platform: { OS: 'ios', select: jest.fn((obj: any) => obj.ios) },
}));

jest.mock('react-native-paper', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    TextInput: ({ value, onChangeText, label, testID }: any) => (
      React.createElement(View, { testID: testID || label, value, onChangeText })
    ),
  };
});

jest.mock('react-native-elements', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    Button: ({ onPress, title, testID }: any) => (
      React.createElement(View, { onPress, testID: testID || title }, title)
    ),
  };
});

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

// Mock AccessibleView first
jest.mock('../app/components/AccessibleView/AccessibleView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return React.forwardRef(({ children, onPress, label, ...props }: any, ref: any) =>
    React.createElement(View, {
      ...props,
      ref,
      onPress,
      accessibilityLabel: label,
      accessible: true
    }, children)
  );
});

// Mock individual components
jest.mock('../app/components/MoreMenuButton/MoreMenuButton', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children }: any) => React.createElement(View, { testID: 'more-menu' }, children);
});

jest.mock('../app/components/MenuItem/MenuItem', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ title, onPress }: any) => React.createElement(View, { onPress, testID: `menu-${title}` }, title);
});

jest.mock('../app/components/ConfirmModal/ConfirmModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ title, children, onConfirm, onCancel, onRequestClose, cancelButton = true }: any) => (
    React.createElement(View, { testID: 'confirm-modal' },
      React.createElement(View, { testID: 'modal-title' }, title),
      React.createElement(View, { onPress: onConfirm, testID: 'confirm' }, 'confirm'),
      cancelButton ? React.createElement(View, { onPress: onCancel || onRequestClose, testID: 'cancel' }, 'cancel') : null,
      children
    )
  );
});

jest.mock('../app/components/BackupItemModal/BackupItemModal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ title, onBackup, onRequestClose }: any) => (
    React.createElement(View, { testID: 'backup-modal' },
      React.createElement(View, { testID: 'backup-title' }, title || 'Backup'),
      React.createElement(View, { onPress: onBackup, testID: 'backup-do' }, 'backup'),
      React.createElement(View, { onPress: onRequestClose, testID: 'backup-close' }, 'close')
    )
  );
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    MaterialIcons: ({ name, ...props }: any) => React.createElement(Text, props, name),
    Ionicons: ({ name, ...props }: any) => React.createElement(Text, props, name),
  };
});

// Mock react-native-outside-press
jest.mock('react-native-outside-press', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ children, onOutsidePress, disabled, ...props }: any) => {
    return React.createElement(View, props, children);
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

    // Reset navigation mocks
    (global as any).__mockNavigate.mockClear();
    (global as any).__mockIsReady.mockReturnValue(true);
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

    fireEvent.press(getByTestId('menu-View Source'));
    expect((global as any).__mockNavigate).toHaveBeenCalledWith('ViewSourceScreen', expect.any(Object));
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

  it('navigates to Delete Details from delete modal', async () => {
    const { getByTestId } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);

    // Open delete modal
    fireEvent.press(getByTestId('menu-Delete'));

    // Wait for modal to render and click Details button
    await act(async () => {
      fireEvent.press(getByTestId('Details'));
    });

    expect((global as any).__mockNavigate).toHaveBeenCalledWith('HomeNavigation', expect.any(Object));
  });

  it('handles navigation not ready for view source', () => {
    (global as any).__mockIsReady.mockReturnValueOnce(false);

    const { getByTestId } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);

    fireEvent.press(getByTestId('menu-View Source'));
    expect((global as any).__mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to credentials when profile is clicked', () => {
    const { getByText } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);

    fireEvent.press(getByText('Test Profile'));
    expect((global as any).__mockNavigate).toHaveBeenCalledWith('HomeNavigation', {
      screen: 'SettingsNavigation',
      params: {
        screen: 'ProfileCredentialScreen',
        params: { rawProfileRecord: mockProfileRecord }
      }
    });
  });
});
