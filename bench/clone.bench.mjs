/**
 * Micro-benchmark for clone over 5 fixture buckets.
 *
 * Usage (from the package root):
 *   pnpm build && node bench/clone.bench.mjs
 *
 * Compares the in-package `clone` against the field:
 *   - structuredClone (native)
 *   - lodash.cloneDeep
 *   - rfdc()
 *   - fast-copy
 *
 * The "clone (fast)" variant is the in-package clone with all three opt-out
 * flags set, which competes head-to-head with rfdc on plain JSON-like data.
 */
import { copy as fastCopy } from 'fast-copy';
import lodashCloneDeep from 'lodash.clonedeep';
import { bench, group, run } from 'mitata';
import rfdcFactory from 'rfdc';
import { clone } from '../dist/index.mjs';

const rfdcClone = rfdcFactory();

const rng = (seed) => {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
};

const makeFlat = (n, seed = 1) => {
  const r = rng(seed);
  const out = {};
  for (let i = 0; i < n; i += 1) {
    out[`k${i}`] = Math.floor(r() * 1_000_000);
  }
  return out;
};

const makeNested = (depth, breadth, seed = 1) => {
  const r = rng(seed);
  const build = (d) => {
    if (d === 0) return Math.floor(r() * 1_000_000);
    const node = {};
    for (let i = 0; i < breadth; i += 1) {
      node[`f${i}`] = build(d - 1);
    }
    return node;
  };
  return build(depth);
};

const makeWithCycles = () => {
  const a = { tag: 'a', refs: [] };
  const b = { tag: 'b', refs: [] };
  const c = { tag: 'c', refs: [] };
  a.refs.push(b);
  b.refs.push(c);
  c.refs.push(a);
  return a;
};

class Pet {
  constructor(name) {
    this.name = name;
  }
  greet() {
    return `hello, ${this.name}`;
  }
}

const makeClassInstances = () => {
  const pets = [];
  for (let i = 0; i < 10; i += 1) {
    const pet = new Pet(`pet-${i}`);
    Object.defineProperty(pet, 'hidden', {
      value: i,
      enumerable: false,
      writable: true,
      configurable: true,
    });
    pets.push(pet);
  }
  return { pets };
};

const FIXTURES = {
  'flat-10': makeFlat(10),
  'nested-100': makeNested(2, 5), // 5^2 = 25 leaves, ~30 objects
  'large-1000': makeNested(3, 10), // 10^3 = 1000 leaves, ~1110 objects
  'with-cycles': makeWithCycles(),
  'class-instances': makeClassInstances(),
};

const FAST_OPTIONS = { cycles: false, preservePrototype: false, copyDescriptors: false };

for (const [label, value] of Object.entries(FIXTURES)) {
  const isCyclic = label === 'with-cycles';
  const isClassy = label === 'class-instances';

  group(label, () => {
    bench('clone (default)', () => {
      clone(value);
    });
    if (!isCyclic) {
      bench('clone (fast)', () => {
        clone(value, FAST_OPTIONS);
      });
      bench('rfdc()', () => {
        rfdcClone(value);
      });
    }

    bench('fast-copy', () => {
      fastCopy(value);
    });
    bench('lodash.cloneDeep', () => {
      lodashCloneDeep(value);
    });

    if (!isCyclic && !isClassy) {
      bench('structuredClone', () => {
        structuredClone(value);
      });
    }
  });
}

await run({ colors: true });
