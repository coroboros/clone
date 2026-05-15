import { describe, expect, it } from 'vitest';
import { clone, freeze } from '../src/index.js';

describe('cycle handling', () => {
  describe('clone', () => {
    it('handles a self-referencing object', () => {
      type Cyclic = { name: string; self?: Cyclic };
      const original: Cyclic = { name: 'cyclic' };
      original.self = original;

      const copy = clone(original);

      expect(copy).not.toBe(original);
      expect(copy.name).toBe('cyclic');
      expect(copy.self).toBe(copy);
    });

    it('handles two-step cycles (A -> B -> A)', () => {
      type A = { tag: 'A'; b?: B };
      type B = { tag: 'B'; a?: A };
      const a: A = { tag: 'A' };
      const b: B = { tag: 'B' };
      a.b = b;
      b.a = a;

      const copy = clone(a);

      expect(copy.tag).toBe('A');
      expect(copy.b?.tag).toBe('B');
      expect(copy.b?.a).toBe(copy);
      expect(copy.b).not.toBe(b);
    });

    it('handles cycles inside arrays', () => {
      const arr: unknown[] = [1, 2];
      arr.push(arr);

      const copy = clone(arr) as unknown[];

      expect(copy).not.toBe(arr);
      expect(copy[0]).toBe(1);
      expect(copy[1]).toBe(2);
      expect(copy[2]).toBe(copy);
    });

    it('handles cycles inside Maps', () => {
      const m = new Map<string, unknown>();
      m.set('self', m);
      m.set('value', 42);

      const copy = clone(m);

      expect(copy).not.toBe(m);
      expect(copy.get('value')).toBe(42);
      expect(copy.get('self')).toBe(copy);
    });

    it('handles cycles inside Sets (object element references back)', () => {
      type Node = { name: string; ring?: Set<Node> };
      const ring = new Set<Node>();
      const node: Node = { name: 'n', ring };
      ring.add(node);

      const copy = clone(node);
      const clonedRing = copy.ring as Set<Node>;
      expect(clonedRing).not.toBe(ring);
      const cycled = [...clonedRing][0] as Node;
      expect(cycled).toBe(copy);
    });

    it('preserves shared references (diamond — not duplicated)', () => {
      const shared = { id: 1 };
      const original = { left: shared, right: shared };

      const copy = clone(original);

      expect(copy.left).toBe(copy.right);
      expect(copy.left).not.toBe(shared);
      expect(copy.left.id).toBe(1);
    });
  });

  describe('freeze', () => {
    it('handles a self-referencing object without stack overflow', () => {
      type Cyclic = { name: string; self?: Cyclic };
      const o: Cyclic = { name: 'frozen' };
      o.self = o;

      const out = freeze(o);

      expect(Object.isFrozen(out)).toBe(true);
      expect(out.self).toBe(out);
    });

    it('handles two-step cycles', () => {
      type A = { tag: 'A'; b?: B };
      type B = { tag: 'B'; a?: A };
      const a: A = { tag: 'A' };
      const b: B = { tag: 'B' };
      a.b = b;
      b.a = a;

      const out = freeze(a);

      expect(Object.isFrozen(out)).toBe(true);
      expect(Object.isFrozen(out.b)).toBe(true);
    });
  });
});
