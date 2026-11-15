# Zenmanage Vue SDK Examples

This directory contains examples mirroring the core SDK use-cases with Vue composables.

## Setup

```bash
npm install
export ZENMANAGE_ENVIRONMENT_TOKEN="cli_your_client_key_here"
```

## Core Sample Set

- simple-flags.ts: Basic plugin installation and boolean flag check
- context-based-flags.ts: Context-targeted evaluations
- ab-testing.ts: Variant-driven rendering
- defaults.ts: Inline defaults and DefaultsCollection
- caching.ts: Cache TTL and usage reporting tuning
- percentage-rollouts.ts: Deterministic rollout behavior

## Framework-Specific Patterns (ZEN-580)

- vite-app.ts: Vite app bootstrap with plugin install
- nuxt-plugin.ts: Nuxt plugin and server bootstrap pattern

## Smoke App Integration

A package-level smoke app is included at `examples/smoke-app`.

Run from package root:

```bash
npm run test:smoke
```
