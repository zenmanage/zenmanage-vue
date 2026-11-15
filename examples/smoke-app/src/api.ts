import { vi } from 'vitest';

const CDN_ORIGIN = 'https://cdn.zenmanage.test';

function wrap(value: unknown): Record<string, unknown> {
  if (typeof value === 'boolean') return { boolean: value };
  if (typeof value === 'number') return { number: value };
  if (typeof value === 'string') return { string: value };
  return { json: value };
}

function flag(key: string, value: unknown): unknown {
  const type = typeof value === 'object' ? 'json' : typeof value;

  return {
    version: `fla_${key}`,
    type,
    key,
    name: key,
    target: { version: 'tar_1', value: { version: 'val_1', value: wrap(value) } },
    rules: [],
  };
}

export const FLAGS: Record<string, unknown> = {
  'new-checkout': true,
  'checkout-flow': 'one-page',
  'api-timeout-ms': 2500,
  'ui-config': { theme: 'dark', pageSize: 50 },
};

export interface SeenRequest {
  url: string;
  agent: string | undefined;
}

/** Replaces `fetch` with an in-memory Zenmanage API. Only the network is faked. */
export function fakeApi(flags: Record<string, unknown> = FLAGS): SeenRequest[] {
  const seen: SeenRequest[] = [];

  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      seen.push({ url, agent: headers['X-ZEN-CLIENT-AGENT'] });

      const body = url.endsWith('/v1/flag-json')
        ? { data: { cdn: CDN_ORIGIN, path: '/rules.json' } }
        : { version: '1', flags: Object.entries(flags).map(([key, value]) => flag(key, value)) };

      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    })
  );

  return seen;
}
