import { renderHook, act } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { useAccessibilityFocus } from '../app/hooks/useAccessibilityFocus';

jest.mock('react-native', () => ({
  findNodeHandle: jest.fn(),
  AccessibilityInfo: {
    setAccessibilityFocus: jest.fn()
  }
}));

describe('useAccessibilityFocus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return ref and focus function', () => {
    const { result } = renderHook(() => useAccessibilityFocus());
    const [ref, focus] = result.current;
    
    expect(ref).toBeDefined();
    expect(typeof focus).toBe('function');
  });

  it('should call setAccessibilityFocus when focus is triggered', () => {
    const mockFindNodeHandle = require('react-native').findNodeHandle;
    mockFindNodeHandle.mockReturnValue(123);
    
    const { result } = renderHook(() => useAccessibilityFocus());
    const [ref, focus] = result.current;
    
    // Simulate ref being set
    if (ref && typeof ref === 'object' && 'current' in ref) {
      ref.current = { mockElement: true } as any;
    }
    
    act(() => {
      focus();
    });
    
    act(() => {
      jest.advanceTimersByTime(1);
    });
    
    expect(AccessibilityInfo.setAccessibilityFocus).toHaveBeenCalledWith(123);
  });

  it('should not call setAccessibilityFocus when ref is null', () => {
    const { result } = renderHook(() => useAccessibilityFocus());
    const [, focus] = result.current;
    
    act(() => {
      focus();
    });
    
    act(() => {
      jest.advanceTimersByTime(1);
    });
    
    expect(AccessibilityInfo.setAccessibilityFocus).not.toHaveBeenCalled();
  });
});