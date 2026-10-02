import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PLAYER_FIXTURES, runCalibration, writeCalibrationReport } from './calibrate';

describe('Simulator Calibration against Real Player Games (T04.5)', () => {
  const reports = runCalibration();

  it('runs calibration on all 4 player fixtures', () => {
    expect(reports).toHaveLength(4);
    const fixtureIds = reports.map((r) => r.fixtureId);
    expect(fixtureIds).toEqual(PLAYER_FIXTURES);
  });

  for (const fixtureId of PLAYER_FIXTURES) {
    describe(`Fixture: ${fixtureId}`, () => {
      const report = reports.find((r) => r.fixtureId === fixtureId)!;

      it('evaluates at least 20 finished units', () => {
        expect(report.unitTypeDeltas.length).toBeGreaterThanOrEqual(20);
      });

      it('meets finish time error thresholds (median <= 8s, p90 <= 20s)', () => {
        expect(report.unitTypeMedian).toBeLessThanOrEqual(8.0);
        expect(report.unitTypeP90).toBeLessThanOrEqual(20.0);
        expect(report.passed.finishMedian).toBe(true);
        expect(report.passed.finishP90).toBe(true);
      });

      it('meets income curve error thresholds (metal MAPE <= 15%, energy MAPE <= 15%)', () => {
        expect(report.metalMape).toBeLessThanOrEqual(15.0);
        expect(report.energyMape).toBeLessThanOrEqual(15.0);
        expect(report.passed.metalMape).toBe(true);
        expect(report.passed.energyMape).toBe(true);
      });

      it('passes overall calibration quality gate', () => {
        expect(report.passed.all).toBe(true);
      });

      it('identifies suspected reclaim windows as an array', () => {
        expect(Array.isArray(report.reclaimWindows)).toBe(true);
      });
    });
  }

  it('generates calibration report file without error', () => {
    const reportPath = writeCalibrationReport();
    expect(fs.existsSync(reportPath)).toBe(true);
    const content = fs.readFileSync(reportPath, 'utf-8');
    expect(content).toContain('# Calibration Report — BAR StratCom v3');
    expect(content).toContain('Threshold Summary');
    expect(content).toContain('**PASS**');
  });
});
