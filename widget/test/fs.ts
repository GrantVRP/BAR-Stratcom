export class InMemoryFs {
  private files = new Map<string, string>();
  private directories = new Set<string>();

  createDir(dir: string): void {
    const norm = dir.replace(/\\/g, '/').replace(/\/+$/, '');
    this.directories.add(norm);
  }

  hasDir(dir: string): boolean {
    const norm = dir.replace(/\\/g, '/').replace(/\/+$/, '');
    return this.directories.has(norm);
  }

  write(filePath: string, content: string): void {
    const norm = filePath.replace(/\\/g, '/');
    this.files.set(norm, content);
  }

  writeJson(filePath: string, data: unknown): void {
    this.write(filePath, JSON.stringify(data));
  }

  read(filePath: string): string | undefined {
    const norm = filePath.replace(/\\/g, '/');
    return this.files.get(norm);
  }

  readJson<T>(filePath: string): T | null {
    const content = this.read(filePath);
    if (!content) return null;
    try {
      return JSON.parse(content) as T;
    } catch {
      return null;
    }
  }

  exists(filePath: string): boolean {
    const norm = filePath.replace(/\\/g, '/');
    return this.files.has(norm);
  }

  delete(filePath: string): boolean {
    const norm = filePath.replace(/\\/g, '/');
    return this.files.delete(norm);
  }

  rename(oldPath: string, newPath: string): boolean {
    const normOld = oldPath.replace(/\\/g, '/');
    const normNew = newPath.replace(/\\/g, '/');
    const content = this.files.get(normOld);
    if (content === undefined) return false;
    this.files.delete(normOld);
    this.files.set(normNew, content);
    return true;
  }

  list(prefix?: string): string[] {
    const res: string[] = [];
    for (const k of this.files.keys()) {
      if (!prefix || k.startsWith(prefix)) {
        res.push(k);
      }
    }
    return res.sort();
  }

  all(): Map<string, string> {
    return new Map(this.files);
  }

  dirs(): Set<string> {
    return new Set(this.directories);
  }
}
