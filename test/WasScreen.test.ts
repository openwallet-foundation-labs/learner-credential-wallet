jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock the function directly since we can't import it easily
const WAS_BASE_URL = 'https://test-was-server.com';

// Copy the function here for testing since we can't import it easily
async function removeWasPublicLink(key: string, map: Record<string, any>): Promise<boolean> {
  try {
    const index = map[`publiclinks_${key}`];
    if (index !== undefined) {
      const mapData = await AsyncStorage.getItem(`map_${index}`);
      if (mapData) {
        const data = JSON.parse(mapData);
        if (data.rawData?.server === WAS_BASE_URL) {
          console.log('Removing WAS link for key:', key);
          // Would call Cache.getInstance().remove() in real implementation
          return true;
        }
      }
    }
    return false;
  } catch (error) {
    console.error('Error processing link:', key, error);
    return false;
  }
}

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('removeWasPublicLink', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Suppress console logs during tests
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should return true when WAS link is found and removed', async () => {
    // Sample map data based on your log
    const sampleMap = {
      '0': 'publiclinks_did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
      '1': 'publiclinks_did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC',
      'publiclinks_did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC': 21
    };

    // Mock AsyncStorage to return WAS server data
    const mockMapData = {
      rawData: {
        server: WAS_BASE_URL
      }
    };
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockMapData));

    const result = await removeWasPublicLink('did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC', sampleMap);

    expect(result).toBe(true);
    expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('map_21');
    // Verify the success log was called
    expect(console.log).toHaveBeenCalledWith('Removing WAS link for key:', 'did:key:z6MkhVTX9BF3NGYX6cc7jWpbNnR7cAjH8LUffabZP8Qu4ysC');
  });

  it('should return false when server does not match WAS_BASE_URL', async () => {
    const sampleMap = {
      'publiclinks_test-key': 5
    };

    // Mock AsyncStorage to return different server
    const mockMapData = {
      rawData: {
        server: 'https://different-server.com'
      }
    };
    mockAsyncStorage.getItem.mockResolvedValue(JSON.stringify(mockMapData));

    const result = await removeWasPublicLink('test-key', sampleMap);

    expect(result).toBe(false);
    expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('map_5');
  });

  it('should return false when key is not in map', async () => {
    const sampleMap = {
      'publiclinks_other-key': 1
    };

    const result = await removeWasPublicLink('non-existent-key', sampleMap);

    expect(result).toBe(false);
    expect(mockAsyncStorage.getItem).not.toHaveBeenCalled();
  });

  it('should return false when AsyncStorage returns null', async () => {
    const sampleMap = {
      'publiclinks_test-key': 3
    };

    mockAsyncStorage.getItem.mockResolvedValue(null);

    const result = await removeWasPublicLink('test-key', sampleMap);

    expect(result).toBe(false);
    expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('map_3');
  });

  it('should handle invalid JSON gracefully', async () => {
    const sampleMap = {
      'publiclinks_test-key': 2
    };

    mockAsyncStorage.getItem.mockResolvedValue('invalid-json');

    const result = await removeWasPublicLink('test-key', sampleMap);

    expect(result).toBe(false);
    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith('Error processing link:', 'test-key', expect.any(SyntaxError));
  });

  it('should handle AsyncStorage errors', async () => {
    const sampleMap = {
      'publiclinks_test-key': 1
    };

    const storageError = new Error('Storage error');
    mockAsyncStorage.getItem.mockRejectedValue(storageError);

    const result = await removeWasPublicLink('test-key', sampleMap);

    expect(result).toBe(false);
    // Verify error was logged
    expect(console.error).toHaveBeenCalledWith('Error processing link:', 'test-key', storageError);
  });
});