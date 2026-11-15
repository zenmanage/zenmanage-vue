import { describe, expect, it } from 'vitest';
import * as VueSdk from '../src';

describe('public exports', () => {
  it('exports public API members', () => {
    expect(VueSdk.createZenmanagePlugin).toBeDefined();
    expect(VueSdk.useZenmanage).toBeDefined();
    expect(VueSdk.useFlag).toBeDefined();
    expect(VueSdk.useBooleanFlag).toBeDefined();
    expect(VueSdk.useVariant).toBeDefined();
    expect(VueSdk.useConfig).toBeDefined();
    expect(VueSdk.createServerClient).toBeDefined();
    expect(VueSdk.getServerFlag).toBeDefined();
    expect(VueSdk.buildBootstrapPayload).toBeDefined();
  });
});
