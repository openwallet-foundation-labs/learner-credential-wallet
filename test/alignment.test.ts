import { getValidAlignments } from '../app/lib/credentialDisplay/shared/utils/alignment';
import { Alignment } from '../app/types/credential';

describe('getValidAlignments', () => {
  it('should return empty array when alignments is undefined', () => {
    expect(getValidAlignments(undefined)).toEqual([]);
  });

  it('should return empty array when alignments is not an array', () => {
    expect(getValidAlignments(null as any)).toEqual([]);
  });

  it('should return empty array when alignments is empty', () => {
    expect(getValidAlignments([])).toEqual([]);
  });

  it('should filter out alignments without targetName', () => {
    const alignments: Alignment[] = [
      {
        targetUrl: 'https://example.com',
        targetDescription: 'Test description'
      }
    ];
    expect(getValidAlignments(alignments)).toEqual([]);
  });

  it('should include alignments with targetName but no targetUrl', () => {
    const alignments: Alignment[] = [
      {
        targetName: 'Test Name'
      }
    ];
    expect(getValidAlignments(alignments)).toEqual([
      {
        targetName: 'Test Name',
        targetDescription: undefined
      }
    ]);
  });

  it('should include alignments with invalid targetUrl but mark as non-clickable', () => {
    const alignments: Alignment[] = [
      {
        targetName: 'Test Name',
        targetUrl: 'invalid-url'
      }
    ];
    expect(getValidAlignments(alignments)).toEqual([
      {
        targetName: 'Test Name',
        targetUrl: 'invalid-url',
        targetDescription: undefined,
        isValidUrl: false
      }
    ]);
  });

  it('should return valid alignments with both targetName and valid targetUrl', () => {
    const alignments: Alignment[] = [
      {
        targetName: 'Requirements Analysis',
        targetUrl: 'https://credentialfinder.org/credential/20229/Requirements_Analysis',
        targetDescription: 'This is a description'
      }
    ];
    expect(getValidAlignments(alignments)).toEqual([
      {
        targetName: 'Requirements Analysis',
        targetUrl: 'https://credentialfinder.org/credential/20229/Requirements_Analysis',
        targetDescription: 'This is a description',
        isValidUrl: true
      }
    ]);
  });

  it('should return valid alignments without targetDescription', () => {
    const alignments: Alignment[] = [
      {
        targetName: 'Requirements Analysis',
        targetUrl: 'https://credentialfinder.org/credential/20229/Requirements_Analysis'
      }
    ];
    expect(getValidAlignments(alignments)).toEqual([
      {
        targetName: 'Requirements Analysis',
        targetUrl: 'https://credentialfinder.org/credential/20229/Requirements_Analysis',
        targetDescription: undefined,
        isValidUrl: true
      }
    ]);
  });

  it('should return valid alignments with only targetName and targetDescription', () => {
    const alignments: Alignment[] = [
      {
        targetName: 'Test Name',
        targetDescription: 'Test description'
      }
    ];
    expect(getValidAlignments(alignments)).toEqual([
      {
        targetName: 'Test Name',
        targetDescription: 'Test description'
      }
    ]);
  });

  it('should handle AC 4: alignment with targetName but no targetUrl should be displayed', () => {
    const alignments: Alignment[] = [
      {
        targetName: 'Requirements Analysis'
        // No targetUrl - this should still be valid per AC 4
      }
    ];
    const result = getValidAlignments(alignments);
    expect(result).toHaveLength(1);
    expect(result[0].targetName).toBe('Requirements Analysis');
    expect(result[0].targetUrl).toBeUndefined();
    expect(result[0].targetDescription).toBeUndefined();
  });

  it('should ignore targetCode, targetFramework, and targetType fields', () => {
    const alignments: Alignment[] = [
      {
        targetName: 'Requirements Analysis',
        targetUrl: 'https://credentialfinder.org/credential/20229/Requirements_Analysis',
        targetCode: 'ce-cf4dee18-7cea-443a-b920-158a0762c6bf',
        targetFramework: 'Edmonds College Course Catalog',
        targetType: 'some-type'
      }
    ];
    const result = getValidAlignments(alignments);
    expect(result).toEqual([
      {
        targetName: 'Requirements Analysis',
        targetUrl: 'https://credentialfinder.org/credential/20229/Requirements_Analysis',
        targetDescription: undefined,
        isValidUrl: true
      }
    ]);
    expect(result[0]).not.toHaveProperty('targetCode');
    expect(result[0]).not.toHaveProperty('targetFramework');
    expect(result[0]).not.toHaveProperty('targetType');
  });

  it('should handle mixed valid and invalid alignments', () => {
    const alignments: Alignment[] = [
      {
        targetName: 'Valid Alignment',
        targetUrl: 'https://example.com'
      },
      {
        targetName: 'Valid - No URL'
      },
      {
        targetUrl: 'https://example2.com'
        // No targetName
      },
      {
        targetName: 'Invalid URL',
        targetUrl: 'not-a-url'
      },
      {
        targetName: 'Another Valid',
        targetUrl: 'https://example3.com',
        targetDescription: 'With description'
      }
    ];
    expect(getValidAlignments(alignments)).toEqual([
      {
        targetName: 'Valid Alignment',
        targetUrl: 'https://example.com',
        targetDescription: undefined,
        isValidUrl: true
      },
      {
        targetName: 'Valid - No URL',
        targetDescription: undefined
      },
      {
        targetName: 'Invalid URL',
        targetUrl: 'not-a-url',
        targetDescription: undefined,
        isValidUrl: false
      },
      {
        targetName: 'Another Valid',
        targetUrl: 'https://example3.com',
        targetDescription: 'With description',
        isValidUrl: true
      }
    ]);
  });
});