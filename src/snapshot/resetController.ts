import * as fs from "fs";
import * as path from "path";
import { SnapshotEngine } from "./snapshotEngine";
import { SnapshotStorage } from "./snapshotStorage";
import { DiffEngine } from "./diffEngine";

export class ResetController {
  private protectedFolder = ".vsc-teacher";

  constructor(private workspacePath: string) {}

  public resetWorkspace(): void {
    const storage = new SnapshotStorage(this.workspacePath);
    const base = storage.loadSnapshot();

    if (!base) {
      throw new Error("No base snapshot found. Create a snapshot first.");
    }

    // Create a snapshot of the CURRENT workspace state
    const current = new SnapshotEngine(this.workspacePath).createSnapshot();

    // Compute diff
    const diff = DiffEngine.diff(base, current);

    // 1) Delete added files (present now, not in teacher base)
    for (const relativePath of diff.added) {
      this.safeDeletePath(relativePath);
    }

    // 2) Restore deleted files (present in base, missing now)
    for (const relativePath of diff.deleted) {
      this.writeFileFromBase(base, relativePath);
    }

    // 3) Restore modified files (overwrite with base content)
    for (const relativePath of diff.modified) {
      this.writeFileFromBase(base, relativePath);
    }

    // Optional cleanup: remove empty folders (except protected)
    this.removeEmptyDirs(this.workspacePath);
  }

  private writeFileFromBase(base: any, relativePath: string): void {
    const absolutePath = path.join(this.workspacePath, relativePath);
    const directory = path.dirname(absolutePath);

    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { recursive: true });
    }

    fs.writeFileSync(absolutePath, base.files[relativePath].content, "utf-8");
  }

  private safeDeletePath(relativePath: string): void {
    // never touch protected folder
    if (relativePath === this.protectedFolder) return;
    if (relativePath.startsWith(this.protectedFolder + path.sep)) return;

    const absolutePath = path.join(this.workspacePath, relativePath);

    // If it doesn't exist, skip
    if (!fs.existsSync(absolutePath)) return;

    fs.rmSync(absolutePath, { recursive: true, force: true });
  }

  private removeEmptyDirs(dir: string): void {
    if (!fs.existsSync(dir)) return;

    const entries = fs.readdirSync(dir);

    for (const entry of entries) {
      if (entry === this.protectedFolder) continue;

      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        this.removeEmptyDirs(fullPath);

        // remove dir if empty
        const after = fs.readdirSync(fullPath);
        if (after.length === 0) {
          fs.rmdirSync(fullPath);
        }
      }
    }
  }
}
