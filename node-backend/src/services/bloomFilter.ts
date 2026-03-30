/**
 * Standard Bloom Filter for permanently blocked device IDs.
 *
 * Fixed-size bit array with k hash functions.
 * - add()          → mark a device as permanently blocked
 * - mightContain() → O(1) membership check (false positives possible, no false negatives)
 * - loadFromMongo()→ hydrate from all isPermanentlyBlocked records on server boot
 *
 * No external dependencies — uses FNV-1a + double-hashing internally.
 */

import ReportRecord from "../models/ReportRecord";

// ─── FNV-1a Hash ──────────────────────────────────────────────────────────────

function fnv1a(input: string, seed: number = 0): number {
  let hash = 2166136261 ^ seed;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 16777619) >>> 0; // unsigned 32-bit
  }
  return hash;
}

/** Generate k hash positions via double-hashing: h(i) = (h1 + i·h2) mod m */
function getHashPositions(item: string, k: number, m: number): number[] {
  const h1 = fnv1a(item, 0);
  const h2 = fnv1a(item, 0x9e3779b9); // golden-ratio seed offset
  const positions: number[] = [];
  for (let i = 0; i < k; i++) {
    positions.push(((h1 + i * h2) >>> 0) % m);
  }
  return positions;
}

// ─── Bloom Filter ─────────────────────────────────────────────────────────────

class BloomFilter {
  private bits: Uint8Array;
  private readonly bitCount: number;
  private readonly hashCount: number;
  private count: number = 0;

  /**
   * @param bitCount  Size of the bit array (default 8192 ≈ 1KB).
   *                  Supports ~550 entries at <1% false-positive rate.
   * @param hashCount Number of hash functions (default 7, optimal for 8192 bits / 550 items).
   */
  constructor(bitCount: number = 8192, hashCount: number = 7) {
    this.bitCount = bitCount;
    this.hashCount = hashCount;
    this.bits = new Uint8Array(Math.ceil(bitCount / 8));
  }

  private setBit(pos: number): void {
    this.bits[pos >> 3] |= 1 << (pos & 7);
  }

  private getBit(pos: number): boolean {
    return (this.bits[pos >> 3] & (1 << (pos & 7))) !== 0;
  }

  /** Add an item to the filter. */
  add(item: string): void {
    const positions = getHashPositions(item, this.hashCount, this.bitCount);
    for (const pos of positions) {
      this.setBit(pos);
    }
    this.count++;
  }

  /** Check if an item MIGHT be in the filter. False positives possible. */
  mightContain(item: string): boolean {
    const positions = getHashPositions(item, this.hashCount, this.bitCount);
    return positions.every((pos) => this.getBit(pos));
  }

  /** Number of items inserted. */
  size(): number {
    return this.count;
  }

  /**
   * Hydrate from MongoDB on server startup.
   * Loads all permanently blocked deviceIds into the filter.
   */
  async loadFromMongo(): Promise<void> {
    const blocked = await ReportRecord.find(
      { isPermanentlyBlocked: true },
      { deviceId: 1 }
    ).lean();

    for (const record of blocked) {
      this.add(record.deviceId);
    }

    console.log(
      `[BloomFilter] Hydrated with ${blocked.length} permanently blocked device(s). ` +
      `Filter: ${this.bitCount} bits, ${this.hashCount} hashes.`
    );
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

const blockedUsersFilter = new BloomFilter(8192, 7);

export default blockedUsersFilter;
