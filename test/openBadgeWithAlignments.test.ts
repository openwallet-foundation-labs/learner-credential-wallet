import { mockOpenBadgeWithAlignments } from '../app/mock/openBadgeWithAlignments';

describe('mockOpenBadgeWithAlignments', () => {
  it('should be a valid credential structure', () => {
    expect(mockOpenBadgeWithAlignments).toBeDefined();
    expect(mockOpenBadgeWithAlignments['@context']).toContain('https://www.w3.org/ns/credentials/v2');
    expect(mockOpenBadgeWithAlignments.type).toContain('OpenBadgeCredential');
    expect(mockOpenBadgeWithAlignments.issuer).toBeDefined();
    expect(mockOpenBadgeWithAlignments.credentialSubject).toBeDefined();
  });

  it('should have achievement with alignments', () => {
    const achievement = mockOpenBadgeWithAlignments.credentialSubject.achievement;
    expect(achievement).toBeDefined();
    if (achievement && !Array.isArray(achievement) && 'alignment' in achievement) {
      expect(achievement.alignment).toBeDefined();
      expect(Array.isArray(achievement.alignment)).toBe(true);
      expect(achievement.alignment!.length).toBeGreaterThan(0);
    }
  });

  it('should have valid alignments with required fields', () => {
    const achievement = mockOpenBadgeWithAlignments.credentialSubject.achievement;
    if (achievement && !Array.isArray(achievement) && 'alignment' in achievement) {
      const alignments = achievement.alignment!;
      const validAlignment = alignments[0];
      expect(validAlignment.targetName).toBe('Requirements Analysis');
      expect(validAlignment.targetUrl).toBe('https://credentialfinder.org/credential/20229/Requirements_Analysis');
    }
  });

  it('should have alignment with description', () => {
    const achievement = mockOpenBadgeWithAlignments.credentialSubject.achievement;
    if (achievement && !Array.isArray(achievement) && 'alignment' in achievement) {
      const alignments = achievement.alignment!;
      const alignmentWithDescription = alignments[1];
      expect(alignmentWithDescription.targetName).toBe('Requirements Analysis with Description');
      expect(alignmentWithDescription.targetDescription).toBe('This is a description');
    }
  });

  it('should include invalid alignments for testing validation', () => {
    const achievement = mockOpenBadgeWithAlignments.credentialSubject.achievement;
    if (achievement && !Array.isArray(achievement) && 'alignment' in achievement) {
      const alignments = achievement.alignment!;
      // Should have 4 alignments total (2 valid, 2 invalid for testing)
      expect(alignments.length).toBe(4);
    }
  });
});