import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Linking } from 'react-native';

// Mock React Native dependencies
jest.mock('react-native', () => {
  const React = require('react');
  return {
    View: 'View',
    Text: 'Text',
    ScrollView: ({ children, contentContainerStyle }: any) => 
      React.createElement('View', { style: contentContainerStyle }, children),
    Image: ({ source, style, accessible, accessibilityLabel }: any) =>
      React.createElement('View', { style, accessible, accessibilityLabel, testID: 'help-image' }),
    Linking: {
      openURL: jest.fn(() => Promise.resolve()),
    },
    StyleSheet: { 
      create: jest.fn((styles: any) => styles),
      flatten: jest.fn((styles: any) => styles)
    },
    Platform: { OS: 'ios', select: jest.fn((obj: any) => obj.ios) },
  };
});

// Mock app dependencies
jest.mock('../app/hooks', () => ({
  useDynamicStyles: jest.fn(),
}));

jest.mock('../app/lib/dynamicStyles', () => ({
  createDynamicStyleSheet: jest.fn((styleFunction) => styleFunction),
}));

jest.mock('../app/components', () => {
  const React = require('react');
  return {
    NavHeader: ({ title, goBack }: any) => 
      React.createElement('View', { testID: 'nav-header' },
        React.createElement('View', { onPress: goBack, testID: 'nav-back-button' }),
        React.createElement('Text', { testID: 'nav-title' }, title)
      ),
  };
});

jest.mock('../app.config', () => ({
  __esModule: true,
  default: {
    displayName: 'Learner Credential Wallet',
  },
  LinkConfig: {
    appWebsite: {
      home: 'https://lcw.app',
    },
  },
}));

import HelpScreen from '../app/screens/HelpScreen/HelpScreen';

describe('HelpScreen', () => {
  const mockNavigation: any = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };

  const mockRoute: any = {
    params: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    const { useDynamicStyles } = require('../app/hooks');
    
    useDynamicStyles.mockReturnValue({
      styles: {
        bodyContainerCenter: { flex: 1, alignItems: 'center', padding: 16 },
        image: { height: 72, resizeMode: 'contain', marginTop: 30 },
        aboutTitleBolded: { fontWeight: 'bold', textAlign: 'center', marginTop: 30 },
        paragraphCenter: { textAlign: 'center', marginTop: 30 },
        link: { color: '#007AFF' },
      },
      theme: {
        color: {
          backgroundPrimary: '#fff',
          linkColor: '#007AFF',
        },
      },
    });
  });

  it('renders correctly', () => {
    const { UNSAFE_root } = render(
      <HelpScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(UNSAFE_root).toBeTruthy();
  });

  it('displays the correct title in NavHeader', () => {
    const { getByTestId } = render(
      <HelpScreen navigation={mockNavigation} route={mockRoute} />
    );
    const navTitle = getByTestId('nav-title');
    expect(navTitle.props.children).toBe('Help');
  });

  it('displays the app logo with correct accessibility label', () => {
    const { getByTestId } = render(
      <HelpScreen navigation={mockNavigation} route={mockRoute} />
    );
    const image = getByTestId('help-image');
    expect(image.props.accessible).toBe(true);
    expect(image.props.accessibilityLabel).toBe('Learner Credential Wallet Logo');
  });

  it('displays the app name', () => {
    const { getByText } = render(
      <HelpScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('Learner Credential Wallet')).toBeTruthy();
  });

  it('displays the correct description text', () => {
    const { getByText } = render(
      <HelpScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('Learner Credential Wallet is a cross-platform mobile application for storing and sharing digital learner credentials as specified in the learner credential wallet specification developed by the Digital Credentials Consortium.')).toBeTruthy();
  });

  it('displays the help text', () => {
    const { getByText } = render(
      <HelpScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText(/Need help getting started?/)).toBeTruthy();
  });

  it('displays the help link', () => {
    const { getByText } = render(
      <HelpScreen navigation={mockNavigation} route={mockRoute} />
    );
    expect(getByText('https://lcw.app/faq.html#getstarted')).toBeTruthy();
  });

  it('opens the help URL when link is pressed', () => {
    const { getByText } = render(
      <HelpScreen navigation={mockNavigation} route={mockRoute} />
    );
    const link = getByText('https://lcw.app/faq.html#getstarted');
    fireEvent.press(link);
    expect(Linking.openURL).toHaveBeenCalledWith('https://lcw.app/faq.html#getstarted');
  });

  it('navigates back to Settings when back button is pressed', () => {
    const { getByTestId } = render(
      <HelpScreen navigation={mockNavigation} route={mockRoute} />
    );
    const backButton = getByTestId('nav-back-button');
    fireEvent.press(backButton);
    expect(mockNavigation.navigate).toHaveBeenCalledWith('Settings');
  });

  it('applies correct styles to components', () => {
    const { getByTestId } = render(
      <HelpScreen navigation={mockNavigation} route={mockRoute} />
    );
    const image = getByTestId('help-image');
    expect(image.props.style).toEqual({
      height: 72,
      resizeMode: 'contain',
      marginTop: 30,
    });
  });

  it('has correct accessibility role for link text', () => {
    const { getByText } = render(
      <HelpScreen navigation={mockNavigation} route={mockRoute} />
    );
    // Find the Text component that contains the help text
    const helpTextElement = getByText(/Need help getting started?/);
    expect(helpTextElement.props.accessibilityRole).toBe('link');
  });

  it('imports and uses styles correctly', () => {
    const dynamicStyleSheet = require('../app/screens/HelpScreen/HelpScreen.styles').default;
    expect(dynamicStyleSheet).toBeDefined();
    expect(typeof dynamicStyleSheet).toBe('function');
    
    // Execute the styles functions
    const mockTheme = {
      color: { backgroundPrimary: '#fff', linkColor: '#007AFF' },
      fontSize: { medium: 16 },
      fontFamily: { bold: 'bold' }
    };
    const mockMixins = {
      paragraphText: { fontSize: 14, lineHeight: 20 }
    };
    const styles = dynamicStyleSheet({ theme: mockTheme, mixins: mockMixins });
    expect(styles).toBeDefined();
    expect(styles.bodyContainerCenter).toBeDefined();
    expect(styles.image).toBeDefined();
    expect(styles.link).toBeDefined();
    expect(styles.paragraphCenter).toBeDefined();
    expect(styles.aboutTitleBolded).toBeDefined();
  });
});