import type { QuotaStore, StoredLedger } from './quota';
// Demo storage is isolated from production and deliberately disappears on restart.
export class DemoQuotaStore implements QuotaStore {
  private records = new Map<string, StoredLedger>();
  private sequence = 0;
  async read(path: string) { return structuredClone(this.records.get(path) ?? null); }
  async compareAndSwap(path: string, value: string, etag: string | null) {
    if ((this.records.get(path)?.etag ?? null) !== etag) return false;
    this.records.set(path, { value, etag: String(++this.sequence) });
    // Keep demo memory bounded even during long local sessions.
    if (this.records.size > 2) this.records.delete(this.records.keys().next().value!);
    return true;
  }
}
