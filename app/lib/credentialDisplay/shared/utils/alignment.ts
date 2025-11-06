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
      const validation = alignment.targetUrl ? validateUrl(alignment.targetUrl) : null;
      
      // Warn about suspicious URLs
      if (alignment.targetUrl && validation?.valid && isUrlSuspicious(alignment.targetUrl)) {
        console.warn(`Suspicious alignment URL: ${alignment.targetUrl}`);
      }

      return {
        targetName: alignment.targetName!,
        targetUrl: alignment.targetUrl,
        targetDescription: alignment.targetDescription,
        isValidUrl: validation?.valid ?? false,
      };
    });
}