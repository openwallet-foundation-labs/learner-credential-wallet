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

      // If a URL is provided, validate it (HTTPS only for alignments)
      if (alignment.targetUrl) {
        const validation = validateUrl(alignment.targetUrl);
        if (!validation.valid) return false;
      }

      // Warn about suspicious URLs
      if (alignment.targetUrl && isUrlSuspicious(alignment.targetUrl)) {
        console.warn(`Suspicious alignment URL: ${alignment.targetUrl}`);
      }

      return true;
    })
    .map(alignment => {
      const normalizedUrl = alignment.targetUrl
        ? validateUrl(alignment.targetUrl).url
        : undefined;
      return {
        targetName: alignment.targetName!,
        targetUrl: normalizedUrl,
        targetDescription: alignment.targetDescription,
      };
    });
}