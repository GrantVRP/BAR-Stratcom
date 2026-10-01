import { describe, expect, it } from 'vitest';
import coachSample from './__samples__/coach.json';
import eventsSample from './__samples__/events.json';
import sessionSample from './__samples__/session.json';
import stateSample from './__samples__/state.json';
import unitdefsSample from './__samples__/unitdefs.json';
import widgetSample from './__samples__/widget.json';
import windLookupSample from './__samples__/wind-lookup.json';
import {
  CoachDocSchema,
  RawUnitdefsExportSchema,
  RawWindLookupSchema,
  SessionFileDocSchema,
  StateDocSchema,
  WidgetEventSchema,
  WidgetHeartbeatSchema
} from './protocol';

describe('protocol schemas and samples', () => {
  it('parses widget.json sample and rejects invalid heartbeat', () => {
    expect(WidgetHeartbeatSchema.parse(widgetSample)).toEqual(widgetSample);
    expect(WidgetHeartbeatSchema.safeParse({ ...widgetSample, protocol: 2 }).success).toBe(false);
    expect(WidgetHeartbeatSchema.safeParse({ ...widgetSample, mode: 'unknown' }).success).toBe(false);
  });

  it('parses state.json sample and rejects invalid state doc', () => {
    expect(StateDocSchema.parse(stateSample)).toEqual(stateSample);
    expect(StateDocSchema.safeParse({ ...stateSample, protocol: 0 }).success).toBe(false);
    expect(StateDocSchema.safeParse({ ...stateSample, seq: 'first' }).success).toBe(false);
  });

  it('parses each event in events.json sample and rejects invalid events', () => {
    for (const ev of eventsSample) {
      expect(WidgetEventSchema.parse(ev)).toEqual(ev);
    }

    expect(WidgetEventSchema.safeParse({ f: 10, e: 'unknown-event' }).success).toBe(false);
    expect(WidgetEventSchema.safeParse({ f: '10', e: 'gamestart' }).success).toBe(false);
  });

  it('parses unitdefs.json sample and rejects invalid unitdefs export', () => {
    expect(RawUnitdefsExportSchema.parse(unitdefsSample)).toEqual(unitdefsSample);
    expect(
      RawUnitdefsExportSchema.safeParse({
        ...unitdefsSample,
        kind: 'other'
      }).success
    ).toBe(false);
  });

  it('parses wind-lookup.json sample and rejects invalid wind lookup', () => {
    expect(RawWindLookupSchema.parse(windLookupSample)).toEqual(windLookupSample);
    expect(
      RawWindLookupSchema.safeParse({
        ...windLookupSample,
        table: 'invalid'
      }).success
    ).toBe(false);
  });

  it('parses coach.json sample and validates limits', () => {
    expect(CoachDocSchema.parse(coachSample)).toEqual(coachSample);
    expect(
      CoachDocSchema.safeParse({
        ...coachSample,
        hud: {
          ...coachSample.hud,
          lines: [
            ...coachSample.hud.lines,
            { text: 'Line 4', tone: 'info' },
            { text: 'Line 5', tone: 'info' }
          ]
        }
      }).success
    ).toBe(false);

    expect(
      CoachDocSchema.safeParse({
        ...coachSample,
        hud: {
          ...coachSample.hud,
          lines: [{ text: 'x'.repeat(37), tone: 'info' }]
        }
      }).success
    ).toBe(false);
  });

  it('parses session.json sample and rejects invalid session doc', () => {
    expect(SessionFileDocSchema.parse(sessionSample)).toEqual(sessionSample);
    expect(
      SessionFileDocSchema.safeParse({
        ...sessionSample,
        kind: 'wrong'
      }).success
    ).toBe(false);
  });
});
