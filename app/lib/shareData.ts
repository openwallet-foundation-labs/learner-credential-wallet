import { Platform } from 'react-native';
import Share from 'react-native-share';
import * as RNFS from 'react-native-fs';

export async function shareData(fileName: string, data: string, type = 'text/plain'): ReturnType<typeof Share.open> {
  const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;

  if (await RNFS.exists(path)) {
    await RNFS.unlink(path);
  }

  await RNFS.writeFile(path, data, 'utf8');
  
  /**
   * On Android, the clipboard share activity only supports strings (copying
   * the file URL if `message` is not provided). To support clipboard
   * functionality here, the `message` parameter must be supplied with the
   * stringified JSON of the file.
   *
   * On iOS, the clipboard supports file sharing so the `message` parameter
   * should be omitted. Including it would result in sharing both the file and
   * the JSON string.
   */
  return Share.open({
    title: fileName,
    url: `file://${path}`,
    type,
    subject: fileName,
    message: Platform.OS === 'ios' ? undefined : data,
  });
}


/**
 * Share a binary file.
 * @param fileName - The name of the file to share.
 * @param base64Data - The base64 encoded data of the file to share.
 * @param mimeType - The mime type of the file to share.
 * @returns 
 */
export async function shareBinaryFile(fileName: string, base64Data: string, mimeType = 'application/octet-stream') {
  const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;

  if (await RNFS.exists(path)) {
    await RNFS.unlink(path);
  }

  await RNFS.writeFile(path, base64Data, 'base64');

  return Share.open({
    title: fileName,
    url: `file://${path}`,
    type: mimeType,
  });
}

