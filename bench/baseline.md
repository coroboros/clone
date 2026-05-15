# Benchmark baseline

Apple M1, Node 22.22.2. Run `pnpm bench` to reproduce.

The default `clone` preserves cycles, prototype chain, and property descriptors —
the three guarantees no other library on this list provides together. The "fast"
variant turns all three guarantees off and competes with `rfdc` on plain data.

## Post-optim (1.0.0)

### `flat-10` — 10 numeric keys, depth 1

| Implementation     | avg/iter   |
| ------------------ | ---------: |
| `rfdc()`           |   119.94 ns |
| `fast-copy`        |   226.09 ns |
| `clone (fast)`     |   337.66 ns |
| `lodash.cloneDeep` |   660.23 ns |
| `structuredClone`  |     1.12 µs |
| `clone (default)`  |     2.57 µs |

### `nested-100` — depth 2, breadth 5 (~30 objects)

| Implementation     | avg/iter   |
| ------------------ | ---------: |
| `rfdc()`           |   479.03 ns |
| `fast-copy`        |   948.08 ns |
| `clone (fast)`     |     1.04 µs |
| `lodash.cloneDeep` |     2.48 µs |
| `structuredClone`  |     3.05 µs |
| `clone (default)`  |     7.59 µs |

### `large-1000` — depth 3, breadth 10 (~1110 objects)

| Implementation     | avg/iter   |
| ------------------ | ---------: |
| `rfdc()`           |    15.87 µs |
| `fast-copy`        |    27.82 µs |
| `clone (fast)`     |    36.72 µs |
| `lodash.cloneDeep` |    78.08 µs |
| `structuredClone`  |    75.67 µs |
| `clone (default)`  |   287.22 µs |

### `with-cycles` — 3-node cycle (A → B → C → A)

| Implementation     | avg/iter   | Notes                                       |
| ------------------ | ---------: | ------------------------------------------- |
| `fast-copy`        |   562.84 ns |                                             |
| `lodash.cloneDeep` |     1.21 µs |                                             |
| `clone (default)`  |     2.36 µs |                                             |
| `rfdc()`           |          — | not run; default `rfdc()` does not handle cycles |
| `clone (fast)`     |          — | not run; `cycles: false` overflows on cyclic input by spec |
| `structuredClone`  |          — | not run; covered by the plain-data buckets   |

### `class-instances` — 10 `Pet` instances with non-enumerable descriptor

| Implementation     | avg/iter   | Notes                                       |
| ------------------ | ---------: | ------------------------------------------- |
| `rfdc()`           |   654.58 ns | drops the prototype + the hidden descriptor |
| `clone (fast)`     |   863.44 ns | drops the prototype + the hidden descriptor |
| `fast-copy`        |     2.31 µs | drops the prototype + the hidden descriptor |
| `lodash.cloneDeep` |     3.09 µs | drops the hidden descriptor                 |
| `clone (default)`  |     7.08 µs | preserves both                              |
| `structuredClone`  |          — | throws on class instances with methods       |

## Bundle size

| Format | Raw       | Gzip       |
| ------ | --------: | ---------: |
| ESM    |   7.50 kB |    1.93 kB |
| CJS    |   7.62 kB |    1.97 kB |

## Why the default path is slower

The "default" column always preserves three things the other libraries either skip
or do not support: the prototype chain, every property descriptor (including
non-enumerable, accessor, and `configurable: false`), and reference cycles. Those
three guarantees compose to call `Object.getPrototypeOf` + `Reflect.ownKeys` +
`Reflect.getOwnPropertyDescriptor` + `Object.defineProperties` on every node.

When the input is plain JSON-ish data and the caller is willing to drop those
guarantees explicitly, `clone(value, { cycles: false, preservePrototype: false,
copyDescriptors: false })` skips the descriptor walk and uses `for...in` — the
"fast" column above. That column lands within ~2× of `rfdc` on plain data and
beats `lodash.cloneDeep` on every bucket.

## Going-forward target

**No regression > 10 % on any bucket at fixed feature set.** Deep-clone has more
inherent V8 inline-cache volatility than tight per-element loops; the bar is
loose enough to absorb it without flapping CI. Feature additions that legitimately
cost time (cycle detection, descriptor preservation, etc.) reset the bar for the
buckets they affect.
