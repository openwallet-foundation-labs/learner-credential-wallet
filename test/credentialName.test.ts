import { getCredentialName } from '../app/lib/credentialName';
import { IVerifiableCredential } from '@digitalcredentials/ssi';

describe('getCredentialName', () => {
  it('should return credential name from hasCredential property', () => {
    const credential: Partial<IVerifiableCredential> = {
      credentialSubject: {
        hasCredential: {
          name: 'Bachelor of Science in Computer Science'
        }
      }
    };

    const result = getCredentialName(credential as IVerifiableCredential);
    expect(result).toBe('Bachelor of Science in Computer Science');
  });

  it('should return credential name from achievement property', () => {
    const credential: Partial<IVerifiableCredential> = {
      credentialSubject: {
        achievement: {
          name: 'Digital Marketing Certificate'
        }
      }
    };

    const result = getCredentialName(credential as IVerifiableCredential);
    expect(result).toBe('Digital Marketing Certificate');
  });

  it('should return credential name from first element when achievement is array', () => {
    const credential: Partial<IVerifiableCredential> = {
      credentialSubject: {
        achievement: [
          { name: 'First Achievement' },
          { name: 'Second Achievement' }
        ]
      }
    };

    const result = getCredentialName(credential as IVerifiableCredential);
    expect(result).toBe('First Achievement');
  });

  it('should prioritize hasCredential over achievement', () => {
    const credential: Partial<IVerifiableCredential> = {
      credentialSubject: {
        hasCredential: {
          name: 'Has Credential Name'
        },
        achievement: {
          name: 'Achievement Name'
        }
      }
    };

    const result = getCredentialName(credential as IVerifiableCredential);
    expect(result).toBe('Has Credential Name');
  });

  it('should return "Unknown Credential" when no name is found', () => {
    const credential: Partial<IVerifiableCredential> = {
      credentialSubject: {}
    };

    const result = getCredentialName(credential as IVerifiableCredential);
    expect(result).toBe('Unknown Credential');
  });

  it('should return "Unknown Credential" when achievement has no name', () => {
    const credential: Partial<IVerifiableCredential> = {
      credentialSubject: {
        achievement: {}
      }
    };

    const result = getCredentialName(credential as IVerifiableCredential);
    expect(result).toBe('Unknown Credential');
  });
});
