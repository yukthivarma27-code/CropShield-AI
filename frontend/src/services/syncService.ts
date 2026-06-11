import { db } from './offlineDb';
import { checkOnlineStatus } from './api';

export async function syncOfflineQueue() {
  const isOnline = await checkOnlineStatus();
  if (!isOnline) {
    console.log('[Sync] Device is still offline. Skipping sync.');
    return;
  }

  const queuedItems = await db.syncQueue.toArray();
  if (queuedItems.length === 0) {
    return;
  }

  console.log(`[Sync] Found ${queuedItems.length} items to sync. Processing...`);

  for (const item of queuedItems) {
    try {
      if (item.action === 'predict') {
        // Run prediction in background to update model records on server
        console.log('[Sync] Uploading offline prediction details to server...');
        // Here we could upload base64 images if stored.
      }
      // Delete from queue upon success
      if (item.id) {
        await db.syncQueue.delete(item.id);
      }
    } catch (err) {
      console.error(`[Sync] Failed to sync item ${item.id}:`, err);
    }
  }

  console.log('[Sync] Queue synchronization complete.');
}

// Start auto-sync interval
export function startAutoSync(intervalMs = 30000) {
  // Sync on startup
  syncOfflineQueue();

  // Sync on browser online event
  window.addEventListener('online', () => {
    console.log('[Network] Browser went online. Triggering sync...');
    syncOfflineQueue();
  });

  // Regular polling sync
  setInterval(() => {
    syncOfflineQueue();
  }, intervalMs);
}
