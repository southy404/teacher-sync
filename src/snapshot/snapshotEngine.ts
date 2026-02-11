import * as fs from "fs";
import * as path from "path";
import { Snapshot, SnapshotFile } from "./snapshotTypes";
import { scanDirectory } from "./fileScanner";
import { generateHash } from "./hashGenerator";

export class SnapshotEngine {
  constructor(private workspacePath: string) {}

  public createSnapshot(): Snapshot {
    const files: Record<string, SnapshotFile> = {};

    const filePaths = scanDirectory(this.workspacePath, this.workspacePath);

    for (const relativePath of filePaths) {
      const absolutePath = path.join(this.workspacePath, relativePath);

      try {
        const content = fs.readFileSync(absolutePath, "utf-8");
        const hash = generateHash(content);

        files[relativePath] = {
          hash,
          content,
        };
      } catch (error) {
        console.warn(`Skipping unreadable file: ${relativePath}`);
      }
    }

    return {
      id: Date.now().toString(),
      createdAt: Date.now(),
      files,
    };
  }
}
