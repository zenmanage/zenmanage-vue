import { describe, expect, it } from 'vitest';
import {
  buildBootstrapPayload,
  buildBootstrapScript,
  contextFromBootstrapPayload,
  defaultsFromBootstrapDocument,
  defaultsFromBootstrapPayload,
  deserializeBootstrapPayload,
  readBootstrapPayloadFromDocument,
  serializeBootstrapPayload,
} from '../src/bootstrap';

describe('bootstrap helpers', () => {
  it('builds and round-trips bootstrap payload', () => {
    const payload = buildBootstrapPayload({
      'new-ui': true,
      'checkout-variant': 'one-page',
    });

    const serialized = serializeBootstrapPayload(payload);
    const parsed = deserializeBootstrapPayload(serialized);

    expect(parsed?.version).toBe(1);
    expect(parsed?.flags['new-ui']).toBe(true);
    expect(parsed?.flags['checkout-variant']).toBe('one-page');
  });

  it('returns null for invalid serialized payload', () => {
    expect(deserializeBootstrapPayload('not-json')).toBeNull();
    expect(deserializeBootstrapPayload('{"version":2}')).toBeNull();
  });

  it('builds script tags and reads payload from document', () => {
    const payload = buildBootstrapPayload({ 'beta-chat': true });
    const script = buildBootstrapScript(payload, { elementId: 'zm-bootstrap' });

    document.body.innerHTML = script;

    const parsed = readBootstrapPayloadFromDocument('zm-bootstrap');
    expect(parsed?.flags['beta-chat']).toBe(true);

    const defaults = defaultsFromBootstrapDocument('zm-bootstrap');
    expect(defaults?.get('beta-chat')).toBe(true);
  });

  it('returns null or undefined for missing payload sources', () => {
    const parsed = readBootstrapPayloadFromDocument('missing-payload');
    expect(parsed).toBeNull();

    expect(defaultsFromBootstrapPayload(null)).toBeUndefined();
    expect(contextFromBootstrapPayload(undefined)).toBeUndefined();
  });

  it('creates defaults and context from payload', () => {
    const payload = buildBootstrapPayload(
      { 'new-home': true },
      {
        context: {
          toJSON: () => ({ type: 'user', identifier: 'u-1' }),
        } as never,
      }
    );

    const defaults = defaultsFromBootstrapPayload(payload);
    const context = contextFromBootstrapPayload(payload);

    expect(defaults?.get('new-home')).toBe(true);
    expect(context?.getType()).toBe('user');
    expect(context?.getIdentifier()).toBe('u-1');
  });
});
