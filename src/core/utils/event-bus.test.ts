import { describe, it, expect, vi } from 'vitest';
import { EventBus, MPS_EVENTS } from './event-bus';

describe('EventBus', () => {
  it('calls handler when event is emitted', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('test', handler);
    bus.emit('test', { value: 42 });
    expect(handler).toHaveBeenCalledWith({ value: 42 });
  });

  it('calls multiple handlers for same event', () => {
    const bus = new EventBus();
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('test', h1);
    bus.on('test', h2);
    bus.emit('test', 'data');
    expect(h1).toHaveBeenCalledWith('data');
    expect(h2).toHaveBeenCalledWith('data');
  });

  it('does not call handler for different event', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    bus.on('other', handler);
    bus.emit('test', 'data');
    expect(handler).not.toHaveBeenCalled();
  });

  it('unsubscribes via returned function', () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const unsub = bus.on('test', handler);
    unsub();
    bus.emit('test', 'data');
    expect(handler).not.toHaveBeenCalled();
  });

  describe('once', () => {
    it('fires handler only once', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      bus.once('test', handler);
      bus.emit('test', 'first');
      bus.emit('test', 'second');
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith('first');
    });

    it('can be unsubscribed before firing', () => {
      const bus = new EventBus();
      const handler = vi.fn();
      const unsub = bus.once('test', handler);
      unsub();
      bus.emit('test', 'data');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('clear', () => {
    it('clears handlers for specific event', () => {
      const bus = new EventBus();
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on('a', h1);
      bus.on('b', h2);
      bus.clear('a');
      bus.emit('a', 'data');
      bus.emit('b', 'data');
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalled();
    });

    it('clears all handlers when no event specified', () => {
      const bus = new EventBus();
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.on('a', h1);
      bus.on('b', h2);
      bus.clear();
      bus.emit('a', 'data');
      bus.emit('b', 'data');
      expect(h1).not.toHaveBeenCalled();
      expect(h2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount', () => {
    it('returns 0 for unknown event', () => {
      const bus = new EventBus();
      expect(bus.listenerCount('nope')).toBe(0);
    });

    it('returns accurate count', () => {
      const bus = new EventBus();
      bus.on('test', () => {});
      bus.on('test', () => {});
      expect(bus.listenerCount('test')).toBe(2);
    });

    it('decrements after unsubscribe', () => {
      const bus = new EventBus();
      const unsub = bus.on('test', () => {});
      expect(bus.listenerCount('test')).toBe(1);
      unsub();
      expect(bus.listenerCount('test')).toBe(0);
    });
  });

  it('catches errors in handlers without breaking other handlers', () => {
    const bus = new EventBus();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const badHandler = vi.fn(() => { throw new Error('boom'); });
    const goodHandler = vi.fn();
    bus.on('test', badHandler);
    bus.on('test', goodHandler);
    bus.emit('test', 'data');
    expect(badHandler).toHaveBeenCalled();
    expect(goodHandler).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('MPS_EVENTS', () => {
  it('contains expected event names', () => {
    expect(MPS_EVENTS.LISTINGS_PARSED).toBe('listings:parsed');
    expect(MPS_EVENTS.SELLER_SCORED).toBe('seller:scored');
    expect(MPS_EVENTS.SIDEBAR_TOGGLED).toBe('sidebar:toggled');
  });
});
