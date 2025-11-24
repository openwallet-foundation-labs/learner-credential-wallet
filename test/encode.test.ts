import { encodeQueryParams } from '../app/lib/encode'

describe('encodeQueryParams', () => {
  // note this was added after encodeQueryParams was written, and it's not set in stone that
  // this is the desired behavior. These tests are more for documenting the current behavior.
  it.each([
    // Test case format: [description, input, expectedOutput]
    [
      'No reserved characters',
      'param1=value1&param2=value2',
      'param1=value1&param2=value2'
    ],
    [
      'With reserved characters',
      'param1=value1&param2=val;ue,2',
      'param1=value1&param2=val%3Bue%2C2'
    ],
    [
      'Mixed characters',
      'param1=value1&param2=val;ue2&param3=val3',
      'param1=value1&param2=val%3Bue2&param3=val3'
    ],
    ['Empty string', '', ''],
    ["String without '='", 'justastring', 'justastring'],
    [
      'Only reserved characters',
      'param1=;,/?:@&=+$',
      'param1=%3B%2C%2F%3F%3A%40&=%2B%24'
    ],
    [
      'Spaces and special characters',
      'param1=space test&param2=odd@char&param3=100%match',
      'param1=space test&param2=odd%40char&param3=100%match'
    ]
  ])('%s', (_description, input, expected) => {
    expect(encodeQueryParams(input)).toBe(expected)
  })
})
