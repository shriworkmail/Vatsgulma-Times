import { Edition, NewsSection } from '../types';
import { 
  loadMasterIndexFromDrive, 
  saveMasterIndexToDrive, 
  deleteFileFromGoogleDrive, 
  deleteEditionFilesFromGoogleDrive,
  isGoogleDriveConnected 
} from './googleDriveService';
import firebaseConfig from '../../firebase-applet-config.json';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';

const DB_NAME = 'VatsagulmaLiveEPaperDB';
const DB_VERSION = 1;
const STORE_NAME = 'editions';
const AUTH_KEY = 'vatsagulma_epaper_admin_auth';

// Initialize Firebase App & Firestore for cloud persistence (available on Netlify & all devices)
function getFirestoreInstance() {
  try {
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    return getFirestore(app);
  } catch (err) {
    console.warn('Firestore initialization warning:', err);
    return null;
  }
}

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
 * Initialize storage: load from IndexedDB and sync with Firestore cloud database and Google Drive archive
 * Guarantees papers appear on Netlify and across all visitor devices
 */
export async function initializeStorage(): Promise<Edition[]> {
  try {
    // Clear legacy database if needed
    if (window.indexedDB && indexedDB.deleteDatabase) {
      try {
        indexedDB.deleteDatabase('WashimEPaperDB');
        localStorage.removeItem('washim_epaper_editions');
      } catch (e) {}
    }

    const db = await openDB();
    const localEditions = await getAllEditionsFromDB(db);

    const mergedMap = new Map<string, Edition>();
    localEditions.forEach((e) => mergedMap.set(e.id || e.date, e));

    // 1. Fetch from Firestore Cloud Database (for Netlify readers everywhere)
    try {
      const firestore = getFirestoreInstance();
      if (firestore) {
        const snapshot = await getDocs(collection(firestore, 'editions'));
        if (!snapshot.empty) {
          for (const docSnap of snapshot.docs) {
            const cloudData = docSnap.data() as any;
            const key = cloudData.id || cloudData.date;
            const existingLocal = mergedMap.get(key);

            let assembledPdf = existingLocal?.pdfDataUrl || cloudData.pdfDataUrl;

            // If PDF was chunked and not available locally, fetch chunks from subcollection
            if (!assembledPdf && cloudData.hasPdfChunks && cloudData.totalPdfChunks > 0) {
              try {
                const chunksSnap = await getDocs(collection(firestore, `editions/${cloudData.id}/pdfChunks`));
                if (!chunksSnap.empty) {
                  const chunksList: { index: number; chunk: string }[] = [];
                  chunksSnap.forEach((cDoc) => chunksList.push(cDoc.data() as any));
                  chunksList.sort((a, b) => a.index - b.index);
                  assembledPdf = chunksList.map((c) => c.chunk).join('');
                }
              } catch (chunkErr) {
                console.warn(`Error loading chunks for ${cloudData.id}:`, chunkErr);
              }
            }

            const mergedEdition: Edition = {
              ...cloudData,
              pdfDataUrl: assembledPdf || cloudData.pdfDataUrl || existingLocal?.pdfDataUrl,
            };

            mergedMap.set(key, mergedEdition);
          }
        }
      }
    } catch (firestoreErr) {
      console.warn('Firestore cloud fetch note:', firestoreErr);
    }

    // 2. If Google Drive is connected, sync with Drive master catalog
    if (isGoogleDriveConnected()) {
      try {
        const driveEditions = await loadMasterIndexFromDrive();
        if (driveEditions && driveEditions.length > 0) {
          driveEditions.forEach((e) => {
            const key = e.id || e.date;
            const existing = mergedMap.get(key);
            if (!existing || (!existing.pdfDataUrl && e.pdfDataUrl)) {
              mergedMap.set(key, { ...existing, ...e });
            }
          });
        }
      } catch (driveErr) {
        console.warn('Google Drive init sync note:', driveErr);
      }
    }

    const finalEditions = Array.from(mergedMap.values()).sort((a, b) => b.date.localeCompare(a.date));

    // Cache merged editions into local IndexedDB
    for (const item of finalEditions) {
      await saveEditionToDB(db, item).catch(() => {});
    }

    return finalEditions;
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
 * Save or update an edition in IndexedDB, Firestore cloud database, and Google Drive
 */
export async function saveEdition(edition: Edition): Promise<void> {
  // 1. Save to local IndexedDB
  try {
    const db = await openDB();
    await saveEditionToDB(db, edition);
  } catch (e) {
    console.warn('Save DB failed, using localStorage fallback', e);
    try {
      const all = await getSavedEditions();
      const filtered = all.filter((item) => item.id !== edition.id);
      const lightweightEdition: Edition = {
        ...edition,
        pdfDataUrl: edition.isStoredOnDrive ? undefined : edition.pdfDataUrl?.slice(0, 1000),
      };
      filtered.unshift(lightweightEdition);
      localStorage.setItem('vatsagulma_epaper_editions', JSON.stringify(filtered));
    } catch (localErr) {
      console.warn('localStorage fallback failed:', localErr);
    }
  }

  // 2. Save to Firestore Cloud Database with Chunking Support
  try {
    const firestore = getFirestoreInstance();
    if (firestore) {
      const CHUNK_SIZE = 700000; // ~700KB per chunk safe for 1MB Firestore doc limit
      const rawPdf = edition.pdfDataUrl || '';
      
      let chunksCount = 0;
      if (rawPdf && rawPdf.length > 0) {
        chunksCount = Math.ceil(rawPdf.length / CHUNK_SIZE);
        // Write chunks to subcollection
        for (let i = 0; i < chunksCount; i++) {
          const chunkData = rawPdf.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await setDoc(
            doc(firestore, `editions/${edition.id}/pdfChunks`, `chunk_${i}`),
            { index: i, chunk: chunkData }
          );
        }
      }

      // Metadata doc in editions collection
      const firestoreDocData: Edition = {
        ...edition,
        pdfDataUrl: chunksCount <= 1 && rawPdf.length < CHUNK_SIZE ? rawPdf : undefined,
        pages: edition.pages?.map((p) => ({
          pageNumber: p.pageNumber,
          title: p.title || `पान ${p.pageNumber}`,
          thumbnailUrl: p.thumbnailUrl,
          fullPageUrl: p.fullPageUrl && p.fullPageUrl.length > 400000 ? undefined : p.fullPageUrl,
        })),
      };
      
      await setDoc(doc(firestore, 'editions', edition.id), {
        ...firestoreDocData,
        hasPdfChunks: chunksCount > 1,
        totalPdfChunks: chunksCount,
      }, { merge: true });
    }
  } catch (firestoreErr) {
    console.warn('Firestore cloud save note:', firestoreErr);
  }

  // 3. Auto-sync master index to Google Drive if connected
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
        putReq.onsuccess = async () => {
          // Asynchronously update Firestore and Drive without blocking
          try {
            const firestore = getFirestoreInstance();
            if (firestore) {
              await setDoc(doc(firestore, 'editions', editionId), { sections }, { merge: true });
            }
          } catch (e) {}

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
 * Delete an edition completely from IndexedDB, Firestore cloud database, and Google Drive folder
 */
export async function deleteEdition(id: string): Promise<void> {
  const all = await getSavedEditions();
  const target = all.find((item) => item.id === id);

  // 1. Delete from Google Drive folder (files + master index)
  if (target && isGoogleDriveConnected()) {
    try {
      await deleteEditionFilesFromGoogleDrive(target.date, target.driveFileId, target.pdfFileName);
    } catch (driveDelErr) {
      console.warn('Google Drive file deletion warning:', driveDelErr);
    }
  }

  // 2. Delete from Firestore Cloud Database (metadata and any subcollection chunks)
  try {
    const firestore = getFirestoreInstance();
    if (firestore) {
      try {
        const chunksSnap = await getDocs(collection(firestore, `editions/${id}/pdfChunks`));
        for (const cDoc of chunksSnap.docs) {
          await deleteDoc(cDoc.ref);
        }
      } catch (chunkDelErr) {}
      await deleteDoc(doc(firestore, 'editions', id));
    }
  } catch (firestoreDelErr) {
    console.warn('Firestore cloud delete note:', firestoreDelErr);
  }

  // 3. Delete from local IndexedDB
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

  // 4. Update master index on Google Drive
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


