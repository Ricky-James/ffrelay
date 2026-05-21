// Uses the regular sheet export endpoint (not the publish-to-web "2PACX-..." token).
// Requires the sheet to be shared with "Anyone with the link can view". This endpoint
// is far more responsive to edits than the publish-to-web one, whose CDN can serve
// stale snapshots for several minutes.
export function csvExportUrl(sheetId: string, gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
}
