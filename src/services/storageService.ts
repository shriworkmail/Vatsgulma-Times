import { Edition, NewsSection } from '../types';
import { 
  loadMasterIndexFromDrive, 
  saveMasterIndexToDrive, 
  deleteFileFromGoogleDrive, 
  isGoogleDriveConnected 
} from './googleDriveService';

const DB_NAME = 'VatsagulmaLiveEPaperDB';
const DB_VERSION = 1;
const STORE_NAME = 'editions';
const AUTH_KEY = 'vatsagulma_epaper_admin_auth';

// Helper to open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('date', 'date', { unique: false });
      }
    };
  });
}

/**
 * Initialize storage: load from IndexedDB and sync with Google Drive cloud archive
 */
export async function initializeStorage(): Promise<Edition[]> {
  try {
    // Clear legacy database if needed to remove old mock entries
    if (window.indexedDB && indexedDB.deleteDatabase) {
      try {
        indexedDB.deleteDatabase('WashimEPaperDB');
        localStorage.removeItem('washim_epaper_editions');
      } catch (e) {}
    }

    const db = await openDB();
    const localEditions = await getAllEditionsFromDB(db);

    // If Google Drive is connected, check for cloud master index
    if (isGoogleDriveConnected()) {
      try {
        const driveEditions = await loadMasterIndexFromDrive();
        if (driveEditions && driveEditions.length > 0) {
          // Merge local and drive editions
          const map = new Map<string, Edition>();
          driveEditions.forEach((e) => map.set(e.id || e.date, e));
          localEditions.forEach((e) => {
            const key = e.id || e.date;
            if (!map.has(key) || (!map.get(key)!.pdfDataUrl && e.pdfDataUrl)) {
              map.set(key, { ...map.get(key), ...e });
            }
          });

          const merged = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
          // Save merged back to IndexedDB
          for (const item of merged) {
            await saveEditionToDB(db, item);
          }
          return merged;
        }
      } catch (driveErr) {
        console.warn('Google Drive init sync note:', driveErr);
      }
    }
    
    if (localEditions && localEditions.length > 0) {
      return localEditions.sort((a, b) => b.date.localeCompare(a.date));
    }

    return [];
  } catch (err) {
    console.warn('Falling back to local storage:', err);
    const local = localStorage.getItem('vatsagulma_epaper_editions');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (e) {}
    }
    return [];
  }
}

function getAllEditionsFromDB(db: IDBDatabase): Promise<Edition[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function saveEditionToDB(db: IDBDatabase, edition: Edition): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(edition);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save or update an edition in archive database and auto-sync to Google Drive
 */
export async function saveEdition(edition: Edition): Promise<void> {
  try {
    const db = await openDB();
    await saveEditionToDB(db, edition);
  } catch (e) {
    console.warn('Save DB failed, using localStorage fallback', e);
    try {
      const all = await getSavedEditions();
      const filtered = all.filter((item) => item.id !== edition.id);
      // Strip heavy base64 pdfDataUrl for localStorage to avoid QuotaExceededError
      const lightweightEdition: Edition = {
        ...edition,
        pdfDataUrl: edition.isStoredOnDrive ? undefined : edition.pdfDataUrl?.slice(0, 1000),
      };
      filtered.unshift(lightweightEdition);
      localStorage.setItem('vatsagulma_epaper_editions', JSON.stringify(filtered));
    } catch (localErr) {
      console.warn('localStorage fallback failed (quota limit):', localErr);
    }
  }

  // Auto-sync master index to Google Drive if connected
  if (isGoogleDriveConnected()) {
    try {
      const allEditions = await getSavedEditions();
      await saveMasterIndexToDrive(allEditions);
    } catch (driveSyncErr) {
      console.warn('Drive index auto-save note:', driveSyncErr);
    }
  }
}

/**
 * Save interactive sections for a specific edition directly with high efficiency
 */
export async function saveEditionSections(editionId: string, sections: NewsSection[]): Promise<Edition | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(editionId);

      getReq.onsuccess = () => {
        const existing = getReq.result as Edition;
        if (!existing) {
          resolve(null);
          return;
        }
        existing.sections = sections;
        const putReq = store.put(existing);
        putReq.onsuccess = () => {
          // Asynchronously update Drive master index without blocking
          if (isGoogleDriveConnected()) {
            getAllEditionsFromDB(db)
              .then((all) => saveMasterIndexToDrive(all))
              .catch(() => {});
          }
          resolve(existing);
        };
        putReq.onerror = () => reject(putReq.error);
      };

      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.warn('Direct IndexedDB save failed, falling back:', err);
    const editions = await getSavedEditions();
    const targetIndex = editions.findIndex((e) => e.id === editionId);
    if (targetIndex === -1) return null;

    const updatedEdition: Edition = {
      ...editions[targetIndex],
      sections: sections,
    };

    await saveEdition(updatedEdition);
    return updatedEdition;
  }
}

/**
 * Retrieve all editions sorted by date descending
 */
export async function getSavedEditions(): Promise<Edition[]> {
  try {
    const db = await openDB();
    const editions = await getAllEditionsFromDB(db);
    return editions.sort((a, b) => b.date.localeCompare(a.date));
  } catch (e) {
    const local = localStorage.getItem('vatsagulma_epaper_editions');
    if (local) {
      try {
        return JSON.parse(local);
      } catch (err) {}
    }
    return [];
  }
}

/**
 * Delete an edition from archive database and Google Drive (with safety)
 */
export async function deleteEdition(id: string): Promise<void> {
  const all = await getSavedEditions();
  const target = all.find((item) => item.id === id);

  if (target?.driveFileId && isGoogleDriveConnected()) {
    await deleteFileFromGoogleDrive(target.driveFileId);
  }

  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    const filtered = all.filter((item) => item.id !== id);
    localStorage.setItem('vatsagulma_epaper_editions', JSON.stringify(filtered));
  }

  // Update master index on Google Drive
  if (isGoogleDriveConnected()) {
    try {
      const remaining = all.filter((item) => item.id !== id);
      await saveMasterIndexToDrive(remaining);
    } catch (e) {}
  }
}

/**
 * Authentication management
 */
export function checkIsAdminLoggedIn(): boolean {
  return localStorage.getItem(AUTH_KEY) === 'true';
}

export function setAdminLoggedIn(status: boolean): void {
  if (status) {
    localStorage.setItem(AUTH_KEY, 'true');
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

export function verifyAdminCredentials(username: string, pinOrPass: string): boolean {
  const u = username.trim().toLowerCase();
  const p = pinOrPass.trim();
  
  if (u === 'vtv' && (p === 'vtv' || p === '49870')) return true;
  if (u === 'admin' && (p === 'admin' || p === '49870' || p === 'admin@123' || p === 'vtv')) return true;
  if (u === 'vatsagulma' && (p === '49870' || p === 'vatsagulma@2026' || p === 'vtv')) return true;
  
  return false;
}

/**
 * Clear all local storage and IndexedDB records
 */
export async function clearAllStorage(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn('IndexedDB clear error:', e);
  }
  localStorage.removeItem('vatsagulma_epaper_editions');
}

