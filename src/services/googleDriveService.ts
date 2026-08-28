import { Edition, GoogleDriveStatus, GoogleDriveUser } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

const DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
];

const DRIVE_FOLDER_NAME = 'Vatsagulma Times E-Paper Archive';
const INDEX_FILE_NAME = 'vatsagulma_editions_index.json';

const ACCESS_TOKEN_KEY = 'vatsagulma_drive_token';
const DRIVE_USER_KEY = 'vatsagulma_drive_user';
const DRIVE_FOLDER_KEY = 'vatsagulma_drive_folder_id';
const LAST_SYNC_KEY = 'vatsagulma_drive_last_sync';

// Global cached state
let cachedToken: string | null = localStorage.getItem(ACCESS_TOKEN_KEY);
let cachedUser: GoogleDriveUser | null = null;
try {
  const u = localStorage.getItem(DRIVE_USER_KEY);
  if (u) cachedUser = JSON.parse(u);
} catch (e) {}

let cachedFolderId: string | null = localStorage.getItem(DRIVE_FOLDER_KEY);

// Initialize Firebase App for Auth fallback
function getFirebaseAppInstance() {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

/**
 * Get current Google Drive access token
 */
export function getGoogleDriveAccessToken(): string | null {
  if (!cachedToken) {
    cachedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  return cachedToken;
}

/**
 * Set and persist Google Drive access token
 */
export function setGoogleDriveAccessToken(token: string | null, user?: GoogleDriveUser | null) {
  cachedToken = token;
  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  if (user) {
    cachedUser = user;
    localStorage.setItem(DRIVE_USER_KEY, JSON.stringify(user));
  } else if (user === null) {
    cachedUser = null;
    localStorage.removeItem(DRIVE_USER_KEY);
  }
}

/**
 * Get stored Google Drive user profile
 */
export function getStoredDriveUser(): GoogleDriveUser | null {
  if (!cachedUser) {
    try {
      const u = localStorage.getItem(DRIVE_USER_KEY);
      if (u) cachedUser = JSON.parse(u);
    } catch (e) {}
  }
  return cachedUser;
}

/**
 * Check if Google Drive is currently connected and active
 */
export function isGoogleDriveConnected(): boolean {
  return !!getGoogleDriveAccessToken();
}

/**
 * Get full Google Drive connection status
 */
export function getGoogleDriveStatus(): GoogleDriveStatus {
  const token = getGoogleDriveAccessToken();
  const user = getStoredDriveUser();
  const folderId = cachedFolderId || localStorage.getItem(DRIVE_FOLDER_KEY);
  const lastSynced = localStorage.getItem(LAST_SYNC_KEY);

  return {
    isConnected: !!token,
    user,
    folderId,
    folderName: DRIVE_FOLDER_NAME,
    isSyncing: false,
    lastSyncedAt: lastSynced,
  };
}

/**
 * Fetch Google User Info using Access Token
 */
async function fetchGoogleUserInfo(token: string): Promise<GoogleDriveUser> {
  try {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      return {
        email: data.email || 'user@gmail.com',
        name: data.name || data.email || 'Google User',
        picture: data.picture,
        connectedAt: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('Failed to fetch userinfo from Google:', err);
  }

  return {
    email: 'shri.workmail@gmail.com',
    name: 'Vatsagulma Times Admin',
    connectedAt: new Date().toISOString(),
  };
}

/**
 * Connect to Google Drive using Google Identity Services (GIS) or Firebase Auth
 */
export async function connectGoogleDrive(): Promise<GoogleDriveStatus> {
  // Method 1: Try Google Identity Services (GSI) Token Client
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
    try {
      const token = await new Promise<string>((resolve, reject) => {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: firebaseConfig.oAuthClientId || '194123986820-lof1f7aeoiie08sql5c13emlthb122q5.apps.googleusercontent.com',
          scope: DRIVE_SCOPES.join(' '),
          callback: (response: any) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
            } else if (response.access_token) {
              resolve(response.access_token);
            } else {
              reject(new Error('No access token received from Google Identity Services'));
            }
          },
        });
        client.requestAccessToken({ prompt: 'consent' });
      });

      const user = await fetchGoogleUserInfo(token);
      setGoogleDriveAccessToken(token, user);
      
      // Auto create or find dedicated folder
      try {
        const folderId = await getOrCreateEpaperFolder(token);
        cachedFolderId = folderId;
        localStorage.setItem(DRIVE_FOLDER_KEY, folderId);
      } catch (e) {
        console.warn('Folder creation warning:', e);
      }

      return getGoogleDriveStatus();
    } catch (gsiErr) {
      console.warn('GSI token client error, attempting Firebase Auth fallback:', gsiErr);
    }
  }

  // Method 2: Firebase Auth Popup Fallback
  try {
    const app = getFirebaseAppInstance();
    const auth = getAuth(app);
    const provider = new GoogleAuthProvider();
    DRIVE_SCOPES.forEach((scope) => provider.addScope(scope));

    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('Google Drive Access Token प्राप्त होऊ शकले नाही.');
    }

    const user: GoogleDriveUser = {
      email: result.user.email || 'user@gmail.com',
      name: result.user.displayName || result.user.email || 'Google User',
      picture: result.user.photoURL || undefined,
      connectedAt: new Date().toISOString(),
    };

    setGoogleDriveAccessToken(token, user);

    try {
      const folderId = await getOrCreateEpaperFolder(token);
      cachedFolderId = folderId;
      localStorage.setItem(DRIVE_FOLDER_KEY, folderId);
    } catch (e) {
      console.warn('Folder creation warning:', e);
    }

    return getGoogleDriveStatus();
  } catch (err: any) {
    console.error('Failed to connect Google Drive:', err);
    throw new Error(err.message || 'Google Drive कनेक्ट करण्यात त्रुटी आली.');
  }
}

/**
 * Disconnect Google Drive
 */
export async function disconnectGoogleDrive(): Promise<void> {
  try {
    const app = getFirebaseAppInstance();
    const auth = getAuth(app);
    await signOut(auth).catch(() => {});
  } catch (e) {}

  setGoogleDriveAccessToken(null, null);
  cachedFolderId = null;
  localStorage.removeItem(DRIVE_FOLDER_KEY);
  localStorage.removeItem(LAST_SYNC_KEY);
}

/**
 * Find or create dedicated folder on Google Drive
 */
export async function getOrCreateEpaperFolder(token?: string): Promise<string> {
  const authToken = token || getGoogleDriveAccessToken();
  if (!authToken) throw new Error('Google Drive कनेक्ट केलेले नाही.');

  if (cachedFolderId) {
    // Verify folder exists
    try {
      const checkRes = await fetch(`https://www.googleapis.com/drive/v3/files/${cachedFolderId}?fields=id,name,trashed`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (checkRes.ok) {
        const data = await checkRes.json();
        if (!data.trashed) return data.id;
      }
    } catch (e) {}
  }

  // 1. Search for existing folder
  const query = `name = '${DRIVE_FOLDER_NAME}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)&spaces=drive`,
    {
      headers: { Authorization: `Bearer ${authToken}` },
    }
  );

  if (searchRes.ok) {
    const data = await searchRes.json();
    if (data.files && data.files.length > 0) {
      const folderId = data.files[0].id;
      cachedFolderId = folderId;
      localStorage.setItem(DRIVE_FOLDER_KEY, folderId);
      return folderId;
    }
  }

  // 2. Create new folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
      description: 'वत्सगुल्म टाईम्स ई-पेपर पीडीएफ व अंक संग्रहण फोल्डर',
    }),
  });

  if (!createRes.ok) {
    throw new Error('Google Drive मध्ये फोल्डर तयार करता आले नाही.');
  }

  const folderData = await createRes.json();
  const folderId = folderData.id;

  // Make folder publicly viewable so readers can access papers on deployed site
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${folderId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (permErr) {
    console.warn('Folder public permission note:', permErr);
  }

  cachedFolderId = folderId;
  localStorage.setItem(DRIVE_FOLDER_KEY, folderId);
  return folderId;
}

/**
 * Upload PDF File directly to Google Drive
 */
export async function uploadPdfToGoogleDrive(
  fileOrBlob: File | Blob,
  fileName: string,
  editionDate: string,
  onProgress?: (percent: number, message: string) => void
): Promise<{ fileId: string; webContentLink: string; webViewLink: string }> {
  const token = getGoogleDriveAccessToken();
  if (!token) throw new Error('Google Drive कनेक्ट केलेले नाही. कृपया आधी Google Drive कनेक्ट करा.');

  if (onProgress) onProgress(10, 'Google Drive फोल्डर तयार/तपासत आहे...');
  const folderId = await getOrCreateEpaperFolder(token);

  if (onProgress) onProgress(30, 'Google Drive वर पीडीएफ फाईल अपलोड होत आहे...');

  // Prepare Multipart Request
  const metadata = {
    name: fileName.endsWith('.pdf') ? fileName : `Vatsagulma_Times_${editionDate}.pdf`,
    mimeType: 'application/pdf',
    parents: [folderId],
    description: `वत्सगुल्म टाईम्स वाशीम दैनिक ई-पेपर - दिनांक: ${editionDate}`,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataBlob = new Blob([JSON.stringify(metadata)], { type: 'application/json' });
  
  const multipartBlob = new Blob(
    [
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      metadataBlob,
      delimiter,
      'Content-Type: application/pdf\r\n\r\n',
      fileOrBlob,
      closeDelimiter,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webContentLink,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBlob,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Google Drive वर अपलोड अयशस्वी: ${errorText}`);
  }

  const uploadedFile = await res.json();
  const fileId = uploadedFile.id;

  if (onProgress) onProgress(75, 'फाईलसाठी सार्वजनिक वाचन परवानग्या सेट करत आहे...');

  // Make PDF file publicly readable so visitors on hosted/deployed site can view it
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch (e) {
    console.warn('Public permission note:', e);
  }

  if (onProgress) onProgress(100, 'Google Drive वर फाईल यशस्वीरीत्या सेव्ह झाली!');

  const webContentLink = uploadedFile.webContentLink || `https://drive.google.com/uc?export=download&id=${fileId}`;
  const webViewLink = uploadedFile.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

  return {
    fileId,
    webContentLink,
    webViewLink,
  };
}

/**
 * Save Master Editions Catalog Index to Google Drive
 */
export async function saveMasterIndexToDrive(editions: Edition[]): Promise<void> {
  const token = getGoogleDriveAccessToken();
  if (!token) return;

  try {
    const folderId = await getOrCreateEpaperFolder(token);
    
    // Check if index file exists
    const query = `name = '${INDEX_FILE_NAME}' and '${folderId}' in parents and trashed = false`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    let existingFileId: string | null = null;
    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        existingFileId = data.files[0].id;
      }
    }

    // Strip heavy base64 data to keep cloud index fast, lightweight and memory-efficient
    const sanitizedEditions = editions.map((ed) => ({
      ...ed,
      pdfDataUrl: ed.isStoredOnDrive ? undefined : undefined,
      pages: ed.pages?.map((p) => ({
        pageNumber: p.pageNumber,
        thumbnailUrl: p.thumbnailUrl?.startsWith('data:') ? undefined : p.thumbnailUrl,
        fullPageUrl: p.fullPageUrl?.startsWith('data:') ? undefined : p.fullPageUrl,
      })),
    }));

    const indexContent = JSON.stringify({
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      editionCount: sanitizedEditions.length,
      editions: sanitizedEditions,
    }, null, 2);

    const indexBlob = new Blob([indexContent], { type: 'application/json' });

    if (existingFileId) {
      // Update existing index
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: indexBlob,
      });
    } else {
      // Create new index file
      const metadata = {
        name: INDEX_FILE_NAME,
        mimeType: 'application/json',
        parents: [folderId],
        description: 'वत्सगुल्म टाईम्स ई-पेपर मास्टर इंडेक्स व कॅटलॉग',
      };

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelimiter = `\r\n--${boundary}--`;

      const multipartBlob = new Blob(
        [
          delimiter,
          'Content-Type: application/json; charset=UTF-8\r\n\r\n',
          JSON.stringify(metadata),
          delimiter,
          'Content-Type: application/json\r\n\r\n',
          indexBlob,
          closeDelimiter,
        ],
        { type: `multipart/related; boundary=${boundary}` }
      );

      const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBlob,
      });

      if (createRes.ok) {
        const fileData = await createRes.json();
        // Make index file publicly readable
        await fetch(`https://www.googleapis.com/drive/v3/files/${fileData.id}/permissions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ role: 'reader', type: 'anyone' }),
        }).catch(() => {});
      }
    }

    localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
  } catch (err) {
    console.error('Error saving master index to Google Drive:', err);
  }
}

/**
 * Load Master Editions Catalog from Google Drive
 */
export async function loadMasterIndexFromDrive(): Promise<Edition[] | null> {
  const token = getGoogleDriveAccessToken();
  if (!token) return null;

  try {
    const folderId = await getOrCreateEpaperFolder(token);
    const query = `name = '${INDEX_FILE_NAME}' and '${folderId}' in parents and trashed = false`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        const fileId = data.files[0].id;
        const fetchRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (fetchRes.ok) {
          const indexJson = await fetchRes.json();
          if (indexJson?.editions && Array.isArray(indexJson.editions)) {
            return indexJson.editions;
          }
        }
      }
    }
  } catch (err) {
    console.warn('Could not load master index from Google Drive:', err);
  }

  return null;
}

/**
 * Sync all local editions to Google Drive (Upload any pending PDFs & refresh index)
 */
export async function syncAllEditionsToDrive(
  editions: Edition[],
  onProgress?: (percent: number, message: string) => void
): Promise<{ updatedEditions: Edition[]; syncedCount: number }> {
  const token = getGoogleDriveAccessToken();
  if (!token) throw new Error('Google Drive कनेक्ट केलेले नाही.');

  const total = editions.length;
  let syncedCount = 0;
  const updatedEditions: Edition[] = [...editions];

  for (let i = 0; i < total; i++) {
    const edition = updatedEditions[i];
    const currentPercent = Math.round((i / Math.max(1, total)) * 90);

    if (!edition.driveFileId && edition.pdfDataUrl) {
      if (onProgress) {
        onProgress(currentPercent, `अंक अपलोड होत आहे: ${edition.date} (${i + 1}/${total})...`);
      }

      try {
        // Convert base64 / dataUrl to blob
        const res = await fetch(edition.pdfDataUrl);
        const blob = await res.blob();
        const uploadResult = await uploadPdfToGoogleDrive(
          blob,
          edition.pdfFileName || `Vatsagulma_Times_${edition.date}.pdf`,
          edition.date
        );

        updatedEditions[i] = {
          ...edition,
          driveFileId: uploadResult.fileId,
          driveWebContentLink: uploadResult.webContentLink,
          driveWebViewLink: uploadResult.webViewLink,
          isStoredOnDrive: true,
          driveSyncedAt: new Date().toISOString(),
        };
        syncedCount++;
      } catch (uploadErr) {
        console.warn(`Failed to upload edition ${edition.date} to Drive:`, uploadErr);
      }
    }
  }

  if (onProgress) onProgress(95, 'मास्टर इंडेक्स Google Drive वर अद्ययावत करत आहे...');
  await saveMasterIndexToDrive(updatedEditions);

  if (onProgress) onProgress(100, `यशस्वी! ${syncedCount} अंक Google Drive वर सेव्ह झाले.`);
  return { updatedEditions, syncedCount };
}

/**
 * Delete a file from Google Drive by File ID
 */
export async function deleteFileFromGoogleDrive(fileId: string): Promise<boolean> {
  const token = getGoogleDriveAccessToken();
  if (!token) return false;

  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.ok;
  } catch (err) {
    console.error('Error deleting file from Google Drive:', err);
    return false;
  }
}

/**
 * Delete all files for an edition from Google Drive folder and update master index
 */
export async function deleteEditionFilesFromGoogleDrive(
  editionDate: string,
  fileId?: string,
  fileName?: string
): Promise<boolean> {
  const token = getGoogleDriveAccessToken();
  if (!token) return false;

  let anyDeleted = false;

  // 1. Delete by direct file ID if provided
  if (fileId) {
    const success = await deleteFileFromGoogleDrive(fileId);
    if (success) anyDeleted = true;
  }

  // 2. Search Drive folder for any matching PDF files for this edition date
  try {
    const folderId = await getOrCreateEpaperFolder(token);
    const dateQuery = `'${folderId}' in parents and trashed = false and (name contains '${editionDate}' or name contains '${fileName || ''}')`;
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(dateQuery)}&fields=files(id,name)`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && Array.isArray(searchData.files)) {
        for (const f of searchData.files) {
          if (f.name !== INDEX_FILE_NAME) {
            await deleteFileFromGoogleDrive(f.id);
            anyDeleted = true;
          }
        }
      }
    }
  } catch (searchErr) {
    console.warn('Drive folder search during deletion note:', searchErr);
  }

  // 3. Update master index on Drive to remove this edition
  try {
    const currentEditions = await loadMasterIndexFromDrive();
    if (currentEditions && currentEditions.length > 0) {
      const remaining = currentEditions.filter((e) => e.date !== editionDate && e.driveFileId !== fileId);
      await saveMasterIndexToDrive(remaining);
    }
  } catch (indexErr) {
    console.warn('Drive index update during deletion note:', indexErr);
  }

  return anyDeleted;
}

/**
 * Fetch raw PDF ArrayBuffer / Blob from Google Drive by File ID
 */
export async function fetchPdfBlobFromDrive(fileId: string): Promise<Blob> {
  const token = getGoogleDriveAccessToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Try standard Google Drive API media download
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers,
  });

  if (res.ok) {
    return await res.blob();
  }

  // Fallback to public uc download
  const fallbackRes = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
  if (fallbackRes.ok) {
    return await fallbackRes.blob();
  }

  throw new Error('Google Drive वरून पीडीएफ लोड करता आली नाही.');
}
