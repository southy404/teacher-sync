export interface SnapshotDiff {
  added: string[]; // exists in current, not in base
  deleted: string[]; // exists in base, not in current
  modified: string[]; // exists in both, but different hash
}
