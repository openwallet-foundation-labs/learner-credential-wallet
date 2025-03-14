import { JSONPath } from 'jsonpath-plus';
import { CredentialRecordRaw } from '../types/credential';

// Check if credential record matches QueryByExample VPR
export async function credentialMatchesVprExampleQuery (
  vprExample: any, credentialRecord: CredentialRecordRaw, credentialRecordPath='$.credential'
): Promise<boolean> {
  const credentialRecordMatches = [];
  console.log('Matching example:', vprExample);
  for (const [vprExampleKey, vprExampleValue] of Object.entries(vprExample)) {
    const newCredentialRecordPath = extendPath(credentialRecordPath, vprExampleKey);
    // The result is always dumped into a single-element array
    const [credentialRecordScope] = JSONPath({ path: newCredentialRecordPath, json: credentialRecord });
    if (Array.isArray(vprExampleValue)) {
      // Array query values require that matching credential records contain at least every value specified
      // Note: This logic assumes that each array element is a literal value
      if (!Array.isArray(credentialRecordScope)) {
        return false;
      }
      if (credentialRecordScope.length < vprExampleValue.length) {
        return false;
      }
      const credentialRecordArrayMatches = vprExampleValue.every((vprExVal) => {
        return !!credentialRecordScope.includes(vprExVal);
      });
      credentialRecordMatches.push(credentialRecordArrayMatches);
    } else if (typeof vprExampleValue === 'object' && vprExampleValue !== null) {
      // Object query values will trigger a recursive call in order to handle nested queries
      const credentialRecordObjectMatches = await credentialMatchesVprExampleQuery(vprExampleValue, credentialRecord, newCredentialRecordPath);
      credentialRecordMatches.push(credentialRecordObjectMatches);
    } else {
      // Literal query values can be compared directly
      const credentialRecordLiteralMatches = credentialRecordScope === vprExampleValue;
      credentialRecordMatches.push(credentialRecordLiteralMatches);
    }
  }
  return credentialRecordMatches.every(matches => matches);
}

// Extend JSON path of credential by a literal value
function extendPath (path: string, extension: string): string {
  const jsonPathResCharsRegex = /[$@*()[\].:?]/g;
  if (jsonPathResCharsRegex.test(extension)) {
    // In order to escape reserved characters in a JSONPath in jsonpath-plus,
    // you must prefix each occurrence thereof with a tick symbol (`)
    extension = extension.replace(jsonPathResCharsRegex, (match: string) => '`' + match);
  }
  return `${path}.${extension}`;
}
