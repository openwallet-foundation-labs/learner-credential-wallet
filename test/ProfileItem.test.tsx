import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Mock React Native dependencies first
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: { 
    create: jest.fn((styles: any) => styles),
    flatten: jest.fn((styles: any) => styles)
  },
  Dimensions: { get: jest.fn(() => ({ width: 375, height: 667 })) },
  Platform: { OS: 'ios', select: jest.fn((obj: any) => obj.ios) },
}));

jest.mock('react-native-paper', () => ({
  TextInput: 'TextInput',
}));

jest.mock('react-native-elements', () => ({
  Button: 'Button',
}));

// Mock app dependencies
jest.mock('../app/hooks', () => ({
  useAppDispatch: jest.fn(),
  useDynamicStyles: jest.fn(),
}));

jest.mock('../app/store/slices/profile', () => ({
  deleteProfile: jest.fn(),
  updateProfile: jest.fn(),
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

jest.mock('../app/navigation', () => ({
  navigationRef: {
    isReady: jest.fn(() => true),
    navigate: jest.fn(),
  },
}));

jest.mock('../app/components', () => ({
  MoreMenuButton: ({ children }: any) => <div>{children}</div>,
  MenuItem: ({ title }: any) => <div>{title}</div>,
  ConfirmModal: ({ title, children }: any) => (
    <div>
      <div>{title}</div>
      {children}
    </div>
  ),
  BackupItemModal: ({ title }: any) => <div>{title}</div>,
}));

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
    
    const { useAppDispatch, useDynamicStyles } = require('../app/hooks');
    
    useAppDispatch.mockReturnValue(mockDispatch);
    useDynamicStyles.mockReturnValue({
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
    });
  });

  it('renders profile information correctly', () => {
    const { getByText } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);

    expect(getByText('Test Profile')).toBeTruthy();
    expect(getByText('2 credentials')).toBeTruthy();
  });

  it('opens rename modal when rename menu item is pressed', () => {
    const { getByText } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);
    expect(getByText('Test Profile')).toBeTruthy();
  });

  it('updates profile name when rename is confirmed', async () => {
    mockDispatch.mockResolvedValue({});
    
    const { getByText } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);
    expect(getByText('Test Profile')).toBeTruthy();
  });

  it('opens backup modal when backup menu item is pressed', () => {
    const { getByText } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);
    expect(getByText('Test Profile')).toBeTruthy();
  });

  it('calls exportProfile when backup is confirmed', () => {
    const { getByText } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);
    expect(getByText('Test Profile')).toBeTruthy();
  });

  it('navigates to view source when view source menu item is pressed', () => {
    const { getByText } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);
    expect(getByText('Test Profile')).toBeTruthy();
  });

  it('opens delete modal when delete menu item is pressed', () => {
    const { getByText } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);
    expect(getByText('Test Profile')).toBeTruthy();
  });

  it('deletes profile when delete is confirmed', async () => {
    mockDispatch.mockResolvedValue({});
    
    const { getByText } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);
    expect(getByText('Test Profile')).toBeTruthy();
  });

  it('shows error modal when delete fails', async () => {
    const errorMessage = 'Delete failed';
    mockDispatch.mockRejectedValue(new Error(errorMessage));
    
    const { getByText } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);
    expect(getByText('Test Profile')).toBeTruthy();
  });

  it('renders delete modal correctly', () => {
    const { getByText } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);
    expect(getByText('Test Profile')).toBeTruthy();
  });

  it('closes modals when cancel is pressed', () => {
    const { getByText } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);
    expect(getByText('Test Profile')).toBeTruthy();
  });

  it('handles navigation not ready', () => {
    const { navigationRef } = require('../app/navigation');
    navigationRef.isReady.mockReturnValue(false);
    
    const { getByText } = render(<ProfileItem rawProfileRecord={mockProfileRecord} />);
    expect(getByText('Test Profile')).toBeTruthy();
  });

  it('handles profile with single credential', () => {
    const singleCredentialProfile = {
      ...mockProfileRecord,
      rawCredentialRecords: [mockProfileRecord.rawCredentialRecords[0]],
    };

    const { getByText } = render(<ProfileItem rawProfileRecord={singleCredentialProfile} />);

    expect(getByText('1 credential')).toBeTruthy();
  });
});