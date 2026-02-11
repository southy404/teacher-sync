import * as fs from "fs";
import * as path from "path";
import { Snapshot } from "./snapshotTypes";

export class SnapshotStorage {
  private storageFolderName = ".vsc-teacher";
  private snapshotFileName = "baseSnapshot.json";

  constructor(private workspacePath: string) {}

  private getStorageFolderPath(): string {
    return path.join(this.workspacePath, this.storageFolderName);
  }

  private getSnapshotFilePath(): string {
    return path.join(this.getStorageFolderPath(), this.snapshotFileName);
  }

  public saveSnapshot(snapshot: Snapshot): void {
    const folderPath = this.getStorageFolderPath();
    const filePath = this.getSnapshotFilePath();

    // Create storage folder if it doesn't exist
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    // Write snapshot to file
    fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), "utf-8");
  }

  public loadSnapshot(): Snapshot | null {
    const filePath = this.getSnapshotFilePath();

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(fileContent) as Snapshot;
  }

  public snapshotExists(): boolean {
    return fs.existsSync(this.getSnapshotFilePath());
  }
}
