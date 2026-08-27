export interface PageData {
  pageNumber: number;
  title: string;
  thumbnailUrl: string;
  fullPageUrl?: string;
  canvasRendered?: boolean;
}

export interface NewsPoint {
  x: number; // in ORIGINAL PDF coordinate space (points/pixels)
  y: number; // in ORIGINAL PDF coordinate space
}

export interface NewsSection {
  id: string;
  editionId: string;
  pageNumber: number;
  x: number; // in ORIGINAL PDF coordinate space (points/pixels) - bounding box x
  y: number; // in ORIGINAL PDF coordinate space - bounding box y
  width: number; // in ORIGINAL PDF width - bounding box width
  height: number; // in ORIGINAL PDF height - bounding box height
  pdfWidth: number; // original PDF unscaled width
  pdfHeight: number; // original PDF unscaled height
  shapeType?: 'rectangle' | 'polygon' | 'freestyle';
  polygonPoints?: NewsPoint[]; // Vertices in ORIGINAL PDF unscaled coordinate space
  title: string; // Section / Article Name
  category: string; // e.g. "मुख्य बातमी", "जिल्हा विशेष", "संपादकीय", "क्रीडा", "जाहिरात", "मनोरंजन", "व्यापार", "इतर"
  description?: string; // Optional description
  enabled: boolean; // whether the hotspot is active
  createdAt?: string;
  updatedAt?: string;
}

export interface PdfAnalysis {
  language: string; // e.g. "मराठी (Marathi - Devanagari Unicode)" or "मराठी (Legacy 8-bit Font Encoding: Shree-Lipi / Kruti)"
  languageCode: string; // "mr" | "hi" | "en" | "mr-legacy" | "bilingual"
  languageConfidence: number; // 0-100%
  encryption: string; // "Unencrypted / खुला (None)" | "AES-128" | "AES-256" | "RC4"
  isEncrypted: boolean;
  fontEncodings: string[]; // ["Identity-H (Embedded CID)", "WinAnsiEncoding (8-bit)", "TrueType / Type 1"]
  fontsList: string[];
  pdfVersion?: string;
  pdfProducer?: string;
  textExtractedSample?: string;
}

export interface Edition {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  editionName: string;
  titleCode: string;
  chiefEditor: string;
  executiveEditor: string;
  publishedFrom: string;
  totalPages: number;
  pages: PageData[];
  pdfDataUrl?: string; // base64 or object URL of uploaded PDF
  pdfFileName?: string;
  fileSize?: string;
  uploadedAt: string;
  uploadedBy: string;
  pdfAnalysis?: PdfAnalysis;
  sections?: NewsSection[]; // Interactive news/article hotspots
  // Google Drive Cloud Storage Properties
  driveFileId?: string; // ID of the PDF file on Google Drive
  driveFileName?: string;
  driveWebContentLink?: string; // direct download / stream link
  driveWebViewLink?: string; // preview link in Google Drive
  isStoredOnDrive?: boolean;
  driveFolderId?: string;
  driveSyncedAt?: string;
}

export interface GoogleDriveUser {
  email: string;
  name: string;
  picture?: string;
  connectedAt: string;
}

export interface GoogleDriveStatus {
  isConnected: boolean;
  user: GoogleDriveUser | null;
  folderId: string | null;
  folderName: string;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  error?: string | null;
}

export interface SnipRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}
