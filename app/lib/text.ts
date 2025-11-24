export function fmtCredentialCount(count: number): string {
  const unit = count === 1 ? 'credential' : 'credentials'
  return `${count} ${unit}`
}
