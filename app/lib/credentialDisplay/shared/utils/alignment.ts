import { Alignment } from '../../../../types/credential';
import { validateUrl, isUrlSuspicious } from '../../../urlUtils';

export type ValidAlignment = {
  targetName: string;
  targetUrl?: string;
  targetDescription?: string;
};

export function getValidAlignments(alignments?: Alignment[]): ValidAlignment[] {
  if (!alignments || !Array.isArray(alignments)) {
    return [];
  }

  return alignments
    .filter((alignment) => {
      // targetName is required for display
      if (!alignment.targetName) {
        return false;
      }
      
      // Validate URL (HTTPS only for alignments)
      const validation = validateUrl(alignment.targetUrl);
      if (!validation.valid) return false;
      
      // Warn about suspicious URLs
      if (isUrlSuspicious(alignment.targetUrl)) {
        console.warn(`Suspicious alignment URL: ${alignment.targetUrl}`);
      }
      
      return true;
    })
    .map(alignment => {
      const validation = validateUrl(alignment.targetUrl!);
      return {
        targetName: alignment.targetName!,
        targetUrl: validation.url!,
        targetDescription: alignment.targetDescription,
      };
      
      if (alignment.targetUrl) {
        const normalizedUrl = isStrictHttpUrl(alignment.targetUrl);
        if (normalizedUrl) {
          result.targetUrl = normalizedUrl;
        }
      }
      
      return result;
    });
}