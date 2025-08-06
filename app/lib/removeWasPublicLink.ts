import AsyncStorage from '@react-native-async-storage/async-storage';
import { WAS_BASE_URL } from '../../app.config';
import { CacheKey, Cache } from './cache';

/**
 * Removes a WAS public link from the cache if it exists
 * @param key - The key of the public link to check and potentially remove
 * @param map - The storage map containing the link data
 * @returns Promise<boolean> - True if the link was removed, false otherwise
 */
export async function removeWasPublicLink(key: string, map: Record<string, any>): Promise<boolean> {
  try {
    const index = map[`publiclinks_${key}`];
    if (index !== undefined) {
      const mapData = await AsyncStorage.getItem(`map_${index}`);
      if (mapData) {
        const data = JSON.parse(mapData);
        // Check if this is a WAS link
        if (data.rawData?.server === WAS_BASE_URL) {
          console.log('Removing WAS link for key:', key);
          await Cache.getInstance().remove(CacheKey.PublicLinks, key);
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