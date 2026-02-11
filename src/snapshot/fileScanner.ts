import * as fs from "fs";
import * as path from "path";

const DEFAULT_IGNORES = [
  "node_modules",
  ".git",
  ".vsc-teacher",
  "dist",
  "build",
  ".env",
];

export function scanDirectory(
  dirPath: string,
  basePath: string,
  ignoreList: string[] = DEFAULT_IGNORES
): string[] {
  let results: string[] = [];

  const list = fs.readdirSync(dirPath);

  for (const file of list) {
    const fullPath = path.join(dirPath, file);
    const relativePath = path.relative(basePath, fullPath);

    const stat = fs.statSync(fullPath);

    // Ignore folders
    if (ignoreList.some((ignore) => relativePath.includes(ignore))) {
      continue;
    }

    if (stat && stat.isDirectory()) {
      results = results.concat(scanDirectory(fullPath, basePath, ignoreList));
    } else {
      results.push(relativePath);
    }
  }

  return results;
}
