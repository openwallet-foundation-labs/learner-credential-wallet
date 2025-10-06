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

  it('should filter out alignments without targetUrl', () => {
    const alignments: Alignment[] = [
      {
        targetName: 'Test Name'
      }
    ];
    expect(getValidAlignments(alignments)).toEqual([]);
  });

  it('should filter out alignments with invalid targetUrl', () => {
    const alignments: Alignment[] = [
      {
        targetName: 'Test Name',
        targetUrl: 'invalid-url'
      }
    ];
    expect(getValidAlignments(alignments)).toEqual([]);
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
        targetDescription: 'This is a description'
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
        targetDescription: undefined
      }
    ]);
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
        targetDescription: undefined
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
        targetName: 'Invalid - No URL'
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
        targetDescription: undefined
      },
      {
        targetName: 'Another Valid',
        targetUrl: 'https://example3.com',
        targetDescription: 'With description'
      }
    ]);
  });
});