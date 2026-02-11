export interface SnapshotFile {
  hash: string;
  content: string;
}

export interface Snapshot {
  id: string;
  createdAt: number;
  files: Record<string, SnapshotFile>;
}
