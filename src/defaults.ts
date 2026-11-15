import { DefaultsCollection } from '@zenmanage/sdk';

/** Combines two collections. `base` wins where both define a key. */
export function mergeDefaults(
  base?: DefaultsCollection,
  bootstrap?: DefaultsCollection
): DefaultsCollection | undefined {
  if (!base && !bootstrap) {
    return undefined;
  }

  const merged = new DefaultsCollection();

  for (const source of [bootstrap, base]) {
    if (!source) {
      continue;
    }

    for (const key of source.keys()) {
      const value = source.get(key);
      if (value !== undefined) {
        merged.set(key, value);
      }
    }
  }

  return merged;
}

/** Lists a collection's entries in key order, so two equal collections describe the same. */
export function describeDefaults(defaults: DefaultsCollection | undefined): string {
  if (defaults === undefined) {
    return '';
  }

  return JSON.stringify(
    defaults
      .keys()
      .sort()
      .map((key) => [key, defaults.get(key)])
  );
}
