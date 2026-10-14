import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  formatSummaryMarkdown,
  generateSummary,
  importUnitdefs,
  parseCliArgs,
  sanitizeGameVersion
} from './import-unitdefs';
import type { RawUnitdefsExport, UnitSnapshot } from '../src/core/schemas';
import { SnapshotIndexSchema, UnitSnapshotSchema } from '../src/core/schemas';

describe('import-unitdefs', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stratcom-import-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('sanitizeGameVersion', () => {
    it('preserves valid characters and sanitizes invalid characters', () => {
      expect(sanitizeGameVersion('test-31479-433a460')).toBe('test-31479-433a460');
      expect(sanitizeGameVersion('Beyond All Reason test-31479')).toBe('Beyond_All_Reason_test-31479');
      expect(sanitizeGameVersion('v1.0.5+build-42')).toBe('v1.0.5_build-42');
    });
  });

  describe('parseCliArgs', () => {
    it('parses space-separated and equal-separated arguments', () => {
      expect(parseCliArgs(['--from', 'data/raw/h1/unitdefs.json'])).toEqual({
        from: 'data/raw/h1/unitdefs.json',
        dataDir: undefined,
        setDefault: true
      });

      expect(
        parseCliArgs(['--from=foo.json', '--data-dir=custom_data', '--no-default'])
      ).toEqual({
        from: 'foo.json',
        dataDir: 'custom_data',
        setDefault: false
      });
    });
  });

  describe('importUnitdefs programmatic flow', () => {
    const mockFactions = {
      schemaVersion: 1,
      factions: [
        {
          id: 'armada',
          displayName: 'Armada',
          unitPrefix: 'arm',
          enabled: true,
          accent: '#449bed',
          commanderIds: ['armcom']
        },
        {
          id: 'cortex',
          displayName: 'Cortex',
          unitPrefix: 'cor',
          enabled: true,
          accent: '#ff2244',
          commanderIds: ['corcom']
        }
      ]
    };

    const mockRawExport: RawUnitdefsExport = {
      protocol: 1,
      kind: 'unitdefs',
      gameVersion: 'test-1.0.0',
      engineVersion: '2026.07.04',
      units: [
        {
          name: 'armcom',
          translatedHumanName: 'Commander',
          translatedTooltip: 'Armada Commander',
          metalCost: 1000,
          energyCost: 10000,
          buildTime: 5000,
          buildSpeed: 300,
          isBuilder: true,
          isFactory: false,
          isBuilding: false,
          canFly: false,
          canMove: true,
          speed: 1.5,
          health: 3000,
          maxWeaponRange: 300,
          sightDistance: 450,
          radarDistance: 700,
          energyMake: 25,
          metalMake: 1.5,
          energyUpkeep: 0,
          metalUpkeep: 0,
          extractsMetal: 0,
          windGenerator: 0,
          tidalGenerator: 0,
          energyStorage: 500,
          metalStorage: 500,
          buildOptions: ['armsolar', 'armmex'],
          customParams: {
            iscommander: '1',
            techlevel: '1'
          }
        },
        {
          name: 'cormex',
          translatedHumanName: 'Metal Extractor',
          translatedTooltip: 'Extracts metal',
          metalCost: 50,
          energyCost: 500,
          buildTime: 1200,
          buildSpeed: 0,
          isBuilder: false,
          isFactory: false,
          isBuilding: true,
          canFly: false,
          canMove: false,
          speed: 0,
          health: 260,
          maxWeaponRange: 0,
          sightDistance: 200,
          radarDistance: 0,
          energyMake: 0,
          metalMake: 0,
          energyUpkeep: 3,
          metalUpkeep: 0,
          extractsMetal: 0.001,
          windGenerator: 0,
          tidalGenerator: 0,
          energyStorage: 0,
          metalStorage: 50,
          buildOptions: []
        }
      ],
      missingFields: []
    };

    it('imports raw export, writes snapshot, creates index and generates summary', () => {
      // Set up temp directory with factions.json and raw unitdefs
      fs.writeFileSync(path.join(tempDir, 'factions.json'), JSON.stringify(mockFactions));
      const rawPath = path.join(tempDir, 'raw-unitdefs.json');
      fs.writeFileSync(rawPath, JSON.stringify(mockRawExport));

      const result = importUnitdefs({
        fromPath: rawPath,
        dataDir: tempDir,
        setDefault: true,
        now: '2026-10-02T12:00:00.000Z'
      });

      expect(result.snapshot.gameVersion).toBe('test-1.0.0');
      expect(result.snapshot.units).toHaveLength(2);
      expect(fs.existsSync(result.snapshotPath)).toBe(true);

      // Verify file matches schema
      const snapshotOnDisk = JSON.parse(fs.readFileSync(result.snapshotPath, 'utf-8'));
      expect(UnitSnapshotSchema.parse(snapshotOnDisk)).toBeDefined();

      // Verify index
      expect(fs.existsSync(result.indexPath)).toBe(true);
      const indexOnDisk = JSON.parse(fs.readFileSync(result.indexPath, 'utf-8'));
      const parsedIndex = SnapshotIndexSchema.parse(indexOnDisk);
      expect(parsedIndex.default).toBe('test-1.0.0');
      expect(parsedIndex.available).toHaveLength(1);
      expect(parsedIndex.available[0]?.unitCount).toBe(2);

      // Verify summary
      expect(result.summary.totalUnits).toBe(2);
      expect(result.summary.byFaction['armada']).toBe(1);
      expect(result.summary.byFaction['cortex']).toBe(1);
      expect(result.summary.byClass['commander']).toBe(1);
      expect(result.summary.byClass['eco-metal']).toBe(1);
      expect(result.summary.criticalMissingFields).toHaveLength(0);

      const markdown = formatSummaryMarkdown(result.summary);
      expect(markdown).toContain('Unitdefs Import Summary');
      expect(markdown).toContain('Armada');
      expect(markdown).toContain('Cortex');
    });

    it('updates existing index and preserves default when setDefault is false', () => {
      fs.writeFileSync(path.join(tempDir, 'factions.json'), JSON.stringify(mockFactions));
      const rawPath1 = path.join(tempDir, 'raw-1.json');
      fs.writeFileSync(rawPath1, JSON.stringify(mockRawExport));

      const raw2 = {
        ...mockRawExport,
        gameVersion: 'test-2.0.0'
      };
      const rawPath2 = path.join(tempDir, 'raw-2.json');
      fs.writeFileSync(rawPath2, JSON.stringify(raw2));

      // Import first as default
      importUnitdefs({
        fromPath: rawPath1,
        dataDir: tempDir,
        setDefault: true
      });

      // Import second without overriding default
      const res2 = importUnitdefs({
        fromPath: rawPath2,
        dataDir: tempDir,
        setDefault: false
      });

      expect(res2.index.default).toBe('test-1.0.0');
      expect(res2.index.available).toHaveLength(2);
      expect(res2.index.available.map((a) => a.gameVersion)).toEqual(['test-1.0.0', 'test-2.0.0']);
    });

    it('identifies critical missing fields when present in raw export', () => {
      const snapshot: UnitSnapshot = {
        schemaVersion: 1,
        gameVersion: 'v1',
        engineVersion: '2026',
        exportedAt: '2026-10-02T00:00:00.000Z',
        source: 'widget-export',
        units: []
      };

      const summary = generateSummary(snapshot, ['buildSpeed', 'unrelatedField']);
      expect(summary.missingFields).toEqual(['buildSpeed', 'unrelatedField']);
      expect(summary.criticalMissingFields).toEqual(['buildSpeed']);
    });
  });
});
