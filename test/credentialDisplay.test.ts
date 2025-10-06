// Mock credential display components
jest.mock('../app/lib/credentialDisplay/openBadgeCredential', () => ({
  openBadgeCredentialDisplayConfig: {
    credentialType: 'OpenBadgeCredential',
    cardComponent: jest.fn(),
    itemPropsResolver: jest.fn(() => ({ title: 'Test Badge', subtitle: 'Test Issuer', image: 'test.png' })),
  },
}));

jest.mock('../app/lib/credentialDisplay/studentId', () => ({
  studentIdDisplayConfig: {
    credentialType: 'StudentId',
    cardComponent: jest.fn(),
    itemPropsResolver: jest.fn(() => ({ title: 'Student ID', subtitle: 'School', image: 'id.png' })),
  },
}));

jest.mock('../app/lib/credentialDisplay/universityDegreeCredential', () => ({
  universityDegreeCredentialDisplayConfig: {
    credentialType: 'UniversityDegreeCredential',
    cardComponent: jest.fn(),
    itemPropsResolver: jest.fn(() => ({ title: 'Degree', subtitle: 'University', image: 'degree.png' })),
  },
}));

jest.mock('../app/lib/credentialDisplay/verifiableCredential', () => ({
  verifiableCredentialDisplayConfig: {
    credentialType: 'VerifiableCredential',
    cardComponent: jest.fn(),
    itemPropsResolver: jest.fn(() => ({ title: 'Credential', subtitle: 'Issuer', image: 'default.png' })),
  },
}));

import { credentialDisplayConfigFor, credentialItemPropsFor } from '../app/lib/credentialDisplay';
import { Credential } from '../app/types/credential';

describe('credentialDisplay', () => {
  const mockOpenBadgeCredential: Credential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'test-credential',
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: { id: 'test-issuer' },
    issuanceDate: '2023-01-01T00:00:00Z',
    credentialSubject: { id: 'test-subject' },
  };

  const mockAchievementCredential: Credential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'test-achievement',
    type: ['VerifiableCredential', 'AchievementCredential'],
    issuer: { id: 'test-issuer' },
    issuanceDate: '2023-01-01T00:00:00Z',
    credentialSubject: { id: 'test-subject' },
  };

  const mockGenericCredential: Credential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'test-generic',
    type: ['VerifiableCredential'],
    issuer: { id: 'test-issuer' },
    issuanceDate: '2023-01-01T00:00:00Z',
    credentialSubject: { id: 'test-subject' },
  };

  describe('credentialDisplayConfigFor', () => {
    it('should return OpenBadgeCredential config for OpenBadgeCredential type', () => {
      const config = credentialDisplayConfigFor(mockOpenBadgeCredential);
      expect(config.credentialType).toBe('OpenBadgeCredential');
      expect(config.cardComponent).toBeDefined();
      expect(config.itemPropsResolver).toBeDefined();
    });

    it('should return OpenBadgeCredential config for AchievementCredential type', () => {
      const config = credentialDisplayConfigFor(mockAchievementCredential);
      expect(config.credentialType).toBe('OpenBadgeCredential');
    });

    it('should return fallback config for generic VerifiableCredential', () => {
      const config = credentialDisplayConfigFor(mockGenericCredential);
      expect(config.credentialType).toBe('VerifiableCredential');
    });
  });

  describe('credentialItemPropsFor', () => {
    it('should return item props for OpenBadgeCredential', () => {
      const props = credentialItemPropsFor(mockOpenBadgeCredential);
      expect(props).toBeDefined();
      expect(props.title).toBe('Test Badge');
      expect(props.subtitle).toBe('Test Issuer');
      expect(props.image).toBe('test.png');
    });

    it('should return item props for AchievementCredential', () => {
      const props = credentialItemPropsFor(mockAchievementCredential);
      expect(props).toBeDefined();
      expect(props.title).toBe('Test Badge');
    });

    it('should return item props for generic credential', () => {
      const props = credentialItemPropsFor(mockGenericCredential);
      expect(props).toBeDefined();
      expect(props.title).toBe('Credential');
    });
  });
});