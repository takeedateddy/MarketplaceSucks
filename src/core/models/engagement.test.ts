import { describe, it, expect } from 'vitest';
import { createEngagementSnapshot, computeEngagementDelta, validateEngagementSnapshot } from './engagement';

describe('createEngagementSnapshot', () => {
  it('creates with required field and defaults', () => {
    const snap = createEngagementSnapshot({ listingId: '123' });
    expect(snap.listingId).toBe('123');
    expect(typeof snap.timestamp).toBe('number');
    expect(snap.saves).toBeNull();
    expect(snap.comments).toBeNull();
    expect(snap.views).toBeNull();
  });

  it('uses provided metrics', () => {
    const snap = createEngagementSnapshot({
      listingId: '123',
      saves: 10,
      comments: 3,
      views: 200,
    });
    expect(snap.saves).toBe(10);
    expect(snap.comments).toBe(3);
    expect(snap.views).toBe(200);
  });
});

describe('computeEngagementDelta', () => {
  it('computes deltas correctly', () => {
    const before = createEngagementSnapshot({
      listingId: '123', timestamp: 1000, saves: 5, comments: 1, views: 100,
    });
    const after = createEngagementSnapshot({
      listingId: '123', timestamp: 2000, saves: 15, comments: 4, views: 300,
    });
    const delta = computeEngagementDelta(before, after);
    expect(delta.listingId).toBe('123');
    expect(delta.periodMs).toBe(1000);
    expect(delta.savesDelta).toBe(10);
    expect(delta.commentsDelta).toBe(3);
    expect(delta.viewsDelta).toBe(200);
  });

  it('returns null deltas when metrics are null', () => {
    const before = createEngagementSnapshot({ listingId: '123', timestamp: 1000 });
    const after = createEngagementSnapshot({ listingId: '123', timestamp: 2000, saves: 10 });
    const delta = computeEngagementDelta(before, after);
    expect(delta.savesDelta).toBeNull(); // before.saves is null
    expect(delta.commentsDelta).toBeNull();
    expect(delta.viewsDelta).toBeNull();
  });

  it('throws on mismatched listing IDs', () => {
    const before = createEngagementSnapshot({ listingId: 'a', timestamp: 1000 });
    const after = createEngagementSnapshot({ listingId: 'b', timestamp: 2000 });
    expect(() => computeEngagementDelta(before, after)).toThrow('Cannot compute delta');
  });
});

describe('validateEngagementSnapshot', () => {
  it('returns true for valid snapshot', () => {
    const snap = createEngagementSnapshot({ listingId: '123' });
    expect(validateEngagementSnapshot(snap)).toBe(true);
  });

  it('returns false for null', () => {
    expect(validateEngagementSnapshot(null)).toBe(false);
  });

  it('returns false for empty listingId', () => {
    const snap = createEngagementSnapshot({ listingId: '123' });
    expect(validateEngagementSnapshot({ ...snap, listingId: '' })).toBe(false);
  });

  it('returns false for non-number timestamp', () => {
    const snap = createEngagementSnapshot({ listingId: '123' });
    expect(validateEngagementSnapshot({ ...snap, timestamp: 'now' })).toBe(false);
  });

  it('allows null metrics', () => {
    const snap = createEngagementSnapshot({ listingId: '123' });
    expect(validateEngagementSnapshot(snap)).toBe(true);
  });

  it('rejects non-number metrics', () => {
    const snap = createEngagementSnapshot({ listingId: '123' });
    expect(validateEngagementSnapshot({ ...snap, saves: 'many' })).toBe(false);
  });
});
