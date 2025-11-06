import { Alignment } from '../../../../types/credential';
import { validateUrl, isUrlSuspicious } from '../../../urlUtils';

export type ValidAlignment = {
  targetName: string;
  targetUrl?: string;
  targetDescription?: string;
  isValidUrl?: boolean;
};

export function getValidAlignments(alignments?: Alignment[]): ValidAlignment[] {
  if (!alignments || !Array.isArray(alignments)) {
    return [];
  }

  return alignments
    .filter((alignment) => {
      // targetName is required for display
      return !!alignment.targetName;
    })
    .map(alignment => {
      const result: ValidAlignment = {
        targetName: alignment.targetName!,
        targetDescription: alignment.targetDescription,
      };

      if (alignment.targetUrl) {
        const validation = validateUrl(alignment.targetUrl);
        
        // Warn about suspicious URLs
        if (validation?.valid && isUrlSuspicious(alignment.targetUrl)) {
          console.warn(`Suspicious alignment URL: ${alignment.targetUrl}`);
        }

        result.targetUrl = alignment.targetUrl;
        result.isValidUrl = validation?.valid ?? false;
      }

      return result;
    });
}