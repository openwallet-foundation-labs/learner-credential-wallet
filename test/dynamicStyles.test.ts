import { StyleSheet } from 'react-native';
import { createDynamicStyleSheet, DynamicStyles } from '../app/lib/dynamicStyles';

jest.mock('react-native', () => ({
  StyleSheet: {
    create: jest.fn((styles) => styles)
  }
}));

describe('dynamicStyles', () => {
  const mockDynamicStyles: DynamicStyles = {
    theme: {
      color: {
        primary: '#007AFF',
        secondary: '#666666'
      },
      fontSize: {
        large: 18,
        medium: 16
      }
    } as any,
    mixins: {
      button: {
        padding: 10,
        borderRadius: 5
      },
      text: {
        fontFamily: 'System'
      }
    } as any
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createDynamicStyleSheet', () => {
    it('should create dynamic stylesheet with theme and mixins', () => {
      const styleResolver = (dynamicStyles: DynamicStyles) => ({
        container: {
          backgroundColor: dynamicStyles.theme.color.primary,
          ...dynamicStyles.mixins.button
        },
        text: {
          fontSize: dynamicStyles.theme.fontSize.large,
          color: dynamicStyles.theme.color.secondary,
          ...dynamicStyles.mixins.text
        }
      });

      const dynamicStyleSheet = createDynamicStyleSheet(styleResolver);
      const styles = dynamicStyleSheet(mockDynamicStyles);

      expect(StyleSheet.create).toHaveBeenCalledWith({
        container: {
          backgroundColor: '#007AFF',
          padding: 10,
          borderRadius: 5
        },
        text: {
          fontSize: 18,
          color: '#666666',
          fontFamily: 'System'
        }
      });

      expect(styles).toEqual({
        container: {
          backgroundColor: '#007AFF',
          padding: 10,
          borderRadius: 5
        },
        text: {
          fontSize: 18,
          color: '#666666',
          fontFamily: 'System'
        }
      });
    });

    it('should handle empty style resolver', () => {
      const emptyStyleResolver = () => ({});
      
      const dynamicStyleSheet = createDynamicStyleSheet(emptyStyleResolver);
      const styles = dynamicStyleSheet(mockDynamicStyles);

      expect(StyleSheet.create).toHaveBeenCalledWith({});
      expect(styles).toEqual({});
    });

    it('should handle complex nested styles', () => {
      const complexStyleResolver = (dynamicStyles: DynamicStyles) => ({
        card: {
          backgroundColor: dynamicStyles.theme.color.primary,
          padding: 20
        },
        cardTitle: {
          fontSize: dynamicStyles.theme.fontSize.large,
          fontWeight: 'bold' as const
        },
        cardContent: {
          fontSize: dynamicStyles.theme.fontSize.medium,
          marginTop: 10
        }
      });

      const dynamicStyleSheet = createDynamicStyleSheet(complexStyleResolver);
      const styles = dynamicStyleSheet(mockDynamicStyles);

      expect(styles).toHaveProperty('card');
      expect(styles).toHaveProperty('cardTitle');
      expect(styles).toHaveProperty('cardContent');
      expect(styles.card.backgroundColor).toBe('#007AFF');
      expect(styles.cardTitle.fontSize).toBe(18);
      expect(styles.cardContent.fontSize).toBe(16);
    });

    it('should preserve function reference for reusability', () => {
      const styleResolver = () => ({ test: { color: 'red' } });
      
      const dynamicStyleSheet = createDynamicStyleSheet(styleResolver);
      
      expect(typeof dynamicStyleSheet).toBe('function');
      
      // Should be callable multiple times
      const styles1 = dynamicStyleSheet(mockDynamicStyles);
      const styles2 = dynamicStyleSheet(mockDynamicStyles);
      
      expect(styles1).toEqual(styles2);
      expect(StyleSheet.create).toHaveBeenCalledTimes(2);
    });
  });
});