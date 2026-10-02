import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AvgWindFileSchema } from '../src/core/schemas/maps';
import { importWind } from './import-wind';

describe('tools/import-wind.ts', () => {
  it('imports valid wind lookup file and formats output properly', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wind-test-'));
    const fromPath = path.join(tmpDir, 'raw-wind.json');
    const outPath = path.join(tmpDir, 'avg-wind.json');

    const sample = {
      gameVersion: 'test-31479-433a460',
      kind: 'wind-lookup',
      protocol: 1,
      table: {
        '10': { '20': 15.5, '15': 12.8 },
        '2': { '20': 11.4, '10': 6.0 }
      }
    };
    fs.writeFileSync(fromPath, JSON.stringify(sample), 'utf-8');

    const result = importWind({ fromPath, outPath });

    expect(result.schemaVersion).toBe(1);
    expect(result.gameVersion).toBe('test-31479-433a460');
    // Check sorted keys
    expect(Object.keys(result.table)).toEqual(['2', '10']);
    expect(Object.keys(result.table['2']!)).toEqual(['10', '20']);
    expect(result.table['2']!['20']).toBe(11.4);

    // Verify written file
    const fileContent = JSON.parse(fs.readFileSync(outPath, 'utf-8'));
    expect(AvgWindFileSchema.parse(fileContent)).toEqual(result);
  });

  it('fails if table row is empty', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wind-test-'));
    const fromPath = path.join(tmpDir, 'raw-wind.json');
    const outPath = path.join(tmpDir, 'avg-wind.json');

    const sample = {
      gameVersion: 'test-31479-433a460',
      table: {
        '10': {},
        '2': { '20': 11.4 }
      }
    };
    fs.writeFileSync(fromPath, JSON.stringify(sample), 'utf-8');

    expect(() => importWind({ fromPath, outPath })).toThrow(/table row "10" is empty/);
  });

  it('fails if any value is non-numeric', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wind-test-'));
    const fromPath = path.join(tmpDir, 'raw-wind.json');
    const outPath = path.join(tmpDir, 'avg-wind.json');

    const sample = {
      gameVersion: 'test-31479-433a460',
      table: {
        '10': { '20': 'non-number' as unknown as number }
      }
    };
    fs.writeFileSync(fromPath, JSON.stringify(sample), 'utf-8');

    expect(() => importWind({ fromPath, outPath })).toThrow(/entry \[10\]\[20\] is non-numeric/);
  });

  it('fails if table is empty', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wind-test-'));
    const fromPath = path.join(tmpDir, 'raw-wind.json');
    const outPath = path.join(tmpDir, 'avg-wind.json');

    const sample = {
      gameVersion: 'test-31479-433a460',
      table: {}
    };
    fs.writeFileSync(fromPath, JSON.stringify(sample), 'utf-8');

    expect(() => importWind({ fromPath, outPath })).toThrow(/table contains no rows/);
  });

  it('fails if source file does not exist', () => {
    expect(() =>
      importWind({
        fromPath: 'non-existent-file.json',
        outPath: 'out.json'
      })
    ).toThrow(/does not exist/);
  });
});
