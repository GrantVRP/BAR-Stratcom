import fs from 'node:fs';
import path from 'node:path';

export function isSessionFileMatch(filename: string): boolean {
  if (filename === 'widget.json' || filename === 'probe.json' || filename === 'wind-lookup.json') {
    return true;
  }
  if (filename.startsWith('unitdefs-') && filename.endsWith('.json')) {
    return true;
  }
  if (filename.startsWith('session-') && filename.endsWith('.json')) {
    return true;
  }
  if (filename.startsWith('events-') && filename.endsWith('.ndjson')) {
    return true;
  }
  if (filename.startsWith('state-') && filename.endsWith('.ndjson')) {
    return true;
  }
  return false;
}

export function collectSessionFiles(fromDir: string, toDir: string): string[] {
  const resolvedFrom = path.resolve(process.cwd(), fromDir);
  const resolvedTo = path.resolve(process.cwd(), toDir);

  if (!fs.existsSync(resolvedFrom)) {
    throw new Error(`Source directory does not exist: ${resolvedFrom}`);
  }

  fs.mkdirSync(resolvedTo, { recursive: true });

  const entries = fs.readdirSync(resolvedFrom, { withFileTypes: true });
  const copied: string[] = [];

  for (const entry of entries) {
    if (entry.isFile() && isSessionFileMatch(entry.name)) {
      const src = path.join(resolvedFrom, entry.name);
      const dst = path.join(resolvedTo, entry.name);
      fs.copyFileSync(src, dst);
      copied.push(entry.name);
    }
  }

  return copied;
}

export function parseCliArgs(argv: string[]): { from?: string; to?: string } {
  let from: string | undefined;
  let to: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--from' && i + 1 < argv.length) {
      from = argv[++i];
    } else if (arg.startsWith('--from=')) {
      from = arg.slice('--from='.length);
    } else if (arg === '--to' && i + 1 < argv.length) {
      to = argv[++i];
    } else if (arg.startsWith('--to=')) {
      to = arg.slice('--to='.length);
    }
  }

  return { from, to };
}

export function runCli(): void {
  const { from, to } = parseCliArgs(process.argv.slice(2));

  if (!from || !to) {
    console.error(
      'Usage: tsx tools/collect-session-files.ts --from "<BAR data>/stratcom" --to data/raw/<label>'
    );
    process.exit(1);
  }

  try {
    const copied = collectSessionFiles(from, to);
    console.log(`collect-session-files: Copied ${copied.length} files from "${from}" to "${to}":`);
    for (const f of copied) {
      console.log(`  - ${f}`);
    }
  } catch (err: unknown) {
    console.error('collect-session-files: ERROR:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('collect-session-files.ts')) {
  runCli();
}
