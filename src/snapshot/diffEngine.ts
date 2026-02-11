import { Snapshot } from "./snapshotTypes";
import { SnapshotDiff } from "./diffTypes";

export class DiffEngine {
  public static diff(base: Snapshot, current: Snapshot): SnapshotDiff {
    const basePaths = new Set(Object.keys(base.files));
    const currentPaths = new Set(Object.keys(current.files));

    const added: string[] = [];
    const deleted: string[] = [];
    const modified: string[] = [];

    // Added: in current but not in base
    for (const p of currentPaths) {
      if (!basePaths.has(p)) added.push(p);
    }

    // Deleted + Modified
    for (const p of basePaths) {
      if (!currentPaths.has(p)) {
        deleted.push(p);
        continue;
      }

      const baseHash = base.files[p]?.hash;
      const currentHash = current.files[p]?.hash;

      if (baseHash !== currentHash) modified.push(p);
    }

    // stable ordering
    added.sort();
    deleted.sort();
    modified.sort();

    return { added, deleted, modified };
  }
}
