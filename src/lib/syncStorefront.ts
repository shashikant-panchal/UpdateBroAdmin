export function notifyStorefrontSync() {
  try {
    // 1. Invalidate all storefront cache versions so next read or refresh is 100% fresh
    const cacheKeys = [
      'ub_storefront_cache_v1',
      'ub_storefront_cache_v2',
      'ub_storefront_cache_v3',
      'ub_storefront_cache_v4',
      'ub_storefront_cache_v5',
    ];
    cacheKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
      } catch {
        // ignore
      }
    });

    // 2. Broadcast instant update message across all open tabs
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel('ub_storefront_sync');
      channel.postMessage({ type: 'STOREFRONT_MUTATED', timestamp: Date.now() });
      channel.close();
    }

    // 3. Trigger cross-tab storage event
    localStorage.setItem('ub_last_sync_timestamp', String(Date.now()));
  } catch (err) {
    console.warn('Failed to notify storefront sync:', err);
  }
}
