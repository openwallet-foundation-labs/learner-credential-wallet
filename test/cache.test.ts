import { Cache, CacheKey } from '../app/lib/cache';
import Storage from 'react-native-storage';

jest.mock('react-native-storage');
jest.mock('@react-native-async-storage/async-storage', () => ({}));

describe('Cache', () => {
  let mockStorage: jest.Mocked<Storage>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance
    (Cache as any).instance = undefined;
    
    mockStorage = {
      load: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      clearMapForKey: jest.fn(),
      clearMap: jest.fn()
    } as any;
    
    (Storage as jest.Mock).mockImplementation(() => mockStorage);
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const cache1 = Cache.getInstance();
      const cache2 = Cache.getInstance();
      
      expect(cache1).toBe(cache2);
    });
  });

  describe('load', () => {
    it('should load data from storage', async () => {
      const testData = { test: 'data' };
      mockStorage.load.mockResolvedValue(testData);
      
      const cache = Cache.getInstance();
      const result = await cache.load('testKey', 'testId');
      
      expect(mockStorage.load).toHaveBeenCalledWith({ key: 'testKey', id: 'testId' });
      expect(result).toEqual(testData);
    });

    it('should return empty object when load fails', async () => {
      mockStorage.load.mockRejectedValue(new Error('Not found'));
      
      const cache = Cache.getInstance();
      const result = await cache.load('testKey', 'testId');
      
      expect(result).toEqual({});
    });
  });

  describe('store', () => {
    it('should store data with default expires', async () => {
      const testData = { test: 'data' };
      mockStorage.save.mockResolvedValue(undefined);
      
      const cache = Cache.getInstance();
      await cache.store('testKey', 'testId', testData);
      
      expect(mockStorage.save).toHaveBeenCalledWith({
        key: 'testKey',
        id: 'testId',
        data: testData,
        expires: null
      });
    });

    it('should store data with custom expires', async () => {
      const testData = { test: 'data' };
      const expires = 3600000;
      mockStorage.save.mockResolvedValue(undefined);
      
      const cache = Cache.getInstance();
      await cache.store('testKey', 'testId', testData, expires);
      
      expect(mockStorage.save).toHaveBeenCalledWith({
        key: 'testKey',
        id: 'testId',
        data: testData,
        expires
      });
    });
  });

  describe('remove', () => {
    it('should remove data from storage', async () => {
      mockStorage.remove.mockResolvedValue(undefined);
      
      const cache = Cache.getInstance();
      await cache.remove('testKey', 'testId');
      
      expect(mockStorage.remove).toHaveBeenCalledWith({ key: 'testKey', id: 'testId' });
    });
  });

  describe('removeAll', () => {
    it('should remove all data for key', async () => {
      mockStorage.clearMapForKey.mockResolvedValue(undefined);
      
      const cache = Cache.getInstance();
      await cache.removeAll('testKey');
      
      expect(mockStorage.clearMapForKey).toHaveBeenCalledWith('testKey');
    });
  });

  describe('clear', () => {
    it('should clear all cache data', async () => {
      mockStorage.clearMap.mockResolvedValue(undefined);
      
      const cache = Cache.getInstance();
      await cache.clear();
      
      expect(mockStorage.clearMap).toHaveBeenCalled();
    });
  });

  describe('CacheKey enum', () => {
    it('should have expected cache keys', () => {
      expect(CacheKey.PublicLinks).toBe('publiclinks');
      expect(CacheKey.VerificationResult).toBe('verificationResult');
    });
  });
});