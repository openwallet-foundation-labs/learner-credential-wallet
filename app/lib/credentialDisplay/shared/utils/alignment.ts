import { Alignment } from '../../../../types/credential';

export type ValidAlignment = {
  targetName: string;
  targetUrl: string;
  targetDescription?: string;
};

function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getValidAlignments(alignments?: Alignment[]): ValidAlignment[] {
  if (!alignments || !Array.isArray(alignments)) {
    return [];
  }

  return alignments
    .filter((alignment): alignment is ValidAlignment => {
      // Both targetName and targetUrl are required for display (AC4)
      if (!alignment.targetName || !alignment.targetUrl) {
        return false;
      }
      
      // targetUrl must be a valid URL (AC7)
      if (!isValidUrl(alignment.targetUrl)) {
        return false;
      }
      
      return true;
    })
    .map(alignment => ({
      targetName: alignment.targetName!,
      targetUrl: alignment.targetUrl!,
      targetDescription: alignment.targetDescription,
    }));
}