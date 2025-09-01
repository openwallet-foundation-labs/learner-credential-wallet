import { JSONPath } from 'jsonpath-plus';
import { CredentialRecordRaw, VcQueryType } from '../types/credential';
import { IQueryByExample } from './vcApi';

// Check if credential record matches QueryByExample VPR
export function credentialMatchesVprExampleQuery (
  vprExample: any, credentialRecord: CredentialRecordRaw, credentialRecordPath='$.credential'
): boolean {
  const credentialRecordMatches = [];
  console.log('Attempting to match example:', vprExample);
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
        return credentialRecordScope.includes(vprExVal);
      });
      credentialRecordMatches.push(credentialRecordArrayMatches);
    } else if (typeof vprExampleValue === 'object' && vprExampleValue !== null) {
      // Object query values will trigger a recursive call in order to handle nested queries
      const credentialRecordObjectMatches = credentialMatchesVprExampleQuery(vprExampleValue, credentialRecord, newCredentialRecordPath);
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

// Filter credential records by type
export function filterCredentialRecordsByType (
  allRecords: CredentialRecordRaw[], query: IQueryByExample
): CredentialRecordRaw[] {
  let matchedCredentialRecords: CredentialRecordRaw[];
  const example = query.credentialQuery?.example;
  if (!example) {
    // This is an error with the exchanger, as the request is malformed
    console.log('"example" field missing in QueryByExample.');
    return [];
  }
  const credentialRecordMatches = allRecords.map(
    (c: CredentialRecordRaw) => credentialMatchesVprExampleQuery(example, c));
  matchedCredentialRecords = allRecords.filter(
    (c: CredentialRecordRaw, i: number) => credentialRecordMatches[i]);
  console.log('Resulting matches:', matchedCredentialRecords.length);
  return matchedCredentialRecords;
}
