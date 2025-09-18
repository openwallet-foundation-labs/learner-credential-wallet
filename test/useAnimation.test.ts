import { renderHook } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { useAnimation } from '../app/hooks/useAnimation';

jest.mock('react-native', () => ({
  Animated: {
    Value: jest.fn().mockImplementation((value) => ({
      setValue: jest.fn(),
      interpolate: jest.fn().mockReturnValue('interpolated-value')
    })),
    timing: jest.fn().mockImplementation((value, config) => ({
      start: jest.fn(),
      stop: jest.fn(),
      reset: jest.fn()
    }))
  },
  Easing: {
    linear: 'linear'
  }
}));

describe('useAnimation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create animation with default range and config', () => {
    const { result } = renderHook(() => useAnimation());
    
    expect(Animated.Value).toHaveBeenCalledWith(0);
    expect(Animated.timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        useNativeDriver: true,
        easing: 'linear'
      })
    );
    expect(result.current.value).toBe('interpolated-value');
  });

  it('should create animation with custom range', () => {
    const customRange: [number, number] = [10, 20];
    const { result } = renderHook(() => useAnimation(customRange));
    
    const mockAnimatedValue = (Animated.Value as jest.Mock).mock.results[0].value;
    expect(mockAnimatedValue.interpolate).toHaveBeenCalledWith({
      inputRange: [0, 1],
      outputRange: customRange
    });
  });

  it('should create animation with string range', () => {
    const stringRange: [string, string] = ['0deg', '360deg'];
    const { result } = renderHook(() => useAnimation(stringRange));
    
    const mockAnimatedValue = (Animated.Value as jest.Mock).mock.results[0].value;
    expect(mockAnimatedValue.interpolate).toHaveBeenCalledWith({
      inputRange: [0, 1],
      outputRange: stringRange
    });
  });

  it('should create animation with custom config', () => {
    const customConfig = {
      duration: 2000,
      delay: 500
    };
    
    renderHook(() => useAnimation([0, 1], customConfig));
    
    expect(Animated.timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        toValue: 1,
        useNativeDriver: true,
        easing: 'linear',
        duration: 2000,
        delay: 500
      })
    );
  });

  it('should provide reset functionality', () => {
    const { result } = renderHook(() => useAnimation());
    
    const mockAnimatedValue = (Animated.Value as jest.Mock).mock.results[0].value;
    
    result.current.reset();
    
    expect(mockAnimatedValue.setValue).toHaveBeenCalledWith(0);
  });
});