
const STORAGE_KEY = 'ptah-app-data';

const defaultAppData = {
  scenarios: [],
  cards: [],
  narrators: [],
};

// ----------------------------------------------------
// IndexedDB para persistir el Handle de la carpeta
// ----------------------------------------------------
const HANDLE_DB = 'ptah-handle-db';
const HANDLE_STORE = 'handles';
const HANDLE_KEY = 'directory';

function openHandleDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = window.indexedDB.open(HANDLE_DB, 1);
    req.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(HANDLE_STORE)) {
        db.createObjectStore(HANDLE_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function saveHandle(handle) {
  return openHandleDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readwrite');
    const store = tx.objectStore(HANDLE_STORE);
    const request = store.put(handle, HANDLE_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  }));
}

function loadHandle() {
  return openHandleDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(HANDLE_STORE, 'readonly');
    const store = tx.objectStore(HANDLE_STORE);
    const request = store.get(HANDLE_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}

async function verifyPermission(handle, write = true) {
  if (!handle || typeof handle.queryPermission !== 'function') return false;
  try {
    const opts = write ? { mode: 'readwrite' } : undefined;
    if (await handle.queryPermission(opts) === 'granted') return true;
    if (await handle.requestPermission(opts) === 'granted') return true;
  } catch (e) {
    // Si la versión del navegador no soporta el parámetro opts en queryPermission, reintentar sin argumentos
    try {
      if (await handle.queryPermission() === 'granted') return true;
      if (await handle.requestPermission() === 'granted') return true;
    } catch (err) {}
  }
  return false;
}

// ----------------------------------------------------
// Auxiliares de Navegación de Directorios y Archivos
// ----------------------------------------------------
async function getDirectoryHandleFromPath(rootHandle, path, create = true) {
  let folder = rootHandle;
  const parts = path.split('/').filter(Boolean);
  for (const part of parts) {
    folder = await folder.getDirectoryHandle(part, { create });
  }
  return folder;
}

async function writeJsonFile(dirHandle, fileName, data) {
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
}

async function readJsonFile(dirHandle, fileName) {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: false });
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text);
  } catch (err) {
    return null;
  }
}

// ----------------------------------------------------
// File System Access API Integración Principal
// ----------------------------------------------------

export async function requestDirectoryHandle() {
  if (typeof window === 'undefined' || !window.showDirectoryPicker) {
    throw new Error('File System Access API no soportada en este navegador');
  }
  const handle = await window.showDirectoryPicker();
  if (!handle) {
    throw new Error('No se seleccionó carpeta');
  }
  await saveHandle(handle);
  await verifyPermission(handle, true);
  return handle;
}

export async function loadDirectoryHandle() {
  if (typeof window === 'undefined' || !window.showDirectoryPicker) {
    return null;
  }
  try {
    const handle = await loadHandle();
    if (!handle) return null;
    if (await verifyPermission(handle, true)) {
      return handle;
    }
    return null;
  } catch (error) {
    console.warn('Could not restore directory handle', error);
    return null;
  }
}

/**
 * Carga 100% el estado completo de la aplicación directamente desde los archivos locales de disco.
 */
export async function loadAppDataFromFolder(rootDirHandle) {
  if (!rootDirHandle) return loadAppData();
  try {
    if (!await verifyPermission(rootDirHandle, false)) return loadAppData();

    const baseDir = await getDirectoryHandleFromPath(rootDirHandle, 'ptah-data', true);
    
    // 1. Intentar cargar app-data.json master
    const masterData = await readJsonFile(baseDir, 'app-data.json');
    if (masterData && (masterData.scenarios?.length || masterData.cards?.length)) {
      saveAppData(masterData);
      return masterData;
    }

    // 2. Si no hay masterData o está vacío, escanear subcarpetas individuales (scenarios, cards, narrators)
    const scannedScenarios = [];
    const scannedCards = [];
    const scannedNarrators = [];

    try {
      const scenariosDir = await baseDir.getDirectoryHandle('scenarios', { create: false });
      for await (const entry of scenariosDir.values()) {
        if (entry.kind === 'file') {
          const item = await readJsonFile(scenariosDir, entry.name);
          if (item && (item.title || item.name)) scannedScenarios.push(item);
        }
      }
    } catch (e) {}

    try {
      const cardsDir = await baseDir.getDirectoryHandle('cards', { create: false });
      for await (const entry of cardsDir.values()) {
        if (entry.kind === 'file') {
          const item = await readJsonFile(cardsDir, entry.name);
          if (item && (item.title || item.name)) scannedCards.push(item);
        }
      }
    } catch (e) {}

    try {
      const narratorsDir = await baseDir.getDirectoryHandle('narrators', { create: false });
      for await (const entry of narratorsDir.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          const item = await readJsonFile(narratorsDir, entry.name);
          if (item) scannedNarrators.push(item);
        }
      }
    } catch (e) {}

    if (scannedScenarios.length || scannedCards.length || scannedNarrators.length) {
      const loadedFolderData = {
        scenarios: scannedScenarios,
        cards: scannedCards,
        narrators: scannedNarrators
      };
      saveAppData(loadedFolderData);
      return loadedFolderData;
    }
  } catch (err) {
    console.warn('Error al leer de carpeta local, recurriendo a almacenamiento auxiliar:', err);
  }
  return loadAppData();
}

/**
 * Guarda 100% el estado completo de la aplicación (escenarios, tarjetas, narradores) en archivos JSON independientes.
 */
export async function saveAppDataToFolder(data, rootDirHandle) {
  if (!rootDirHandle) return;
  if (!await verifyPermission(rootDirHandle, true)) {
    throw new Error('Permiso de escritura denegado para la carpeta seleccionada');
  }

  const baseDir = await getDirectoryHandleFromPath(rootDirHandle, 'ptah-data', true);
  await writeJsonFile(baseDir, 'app-data.json', data);

  const scenariosDir = await getDirectoryHandleFromPath(baseDir, 'scenarios', true);
  const cardsDir = await getDirectoryHandleFromPath(baseDir, 'cards', true);
  const narratorsDir = await getDirectoryHandleFromPath(baseDir, 'narrators', true);

  await Promise.all((data.scenarios || []).map(s => writeJsonFile(scenariosDir, `${s.id}.json`, s)));
  await Promise.all((data.cards || []).map(c => writeJsonFile(cardsDir, `${c.id}.json`, c)));
  await Promise.all((data.narrators || []).map(n => writeJsonFile(narratorsDir, `${n.id}.json`, n)));
}

/**
 * Guarda un Chat específico con su historial y contexto como archivo JSON independiente en la carpeta local.
 */
export async function saveChatToFolder(chat, rootDirHandle) {
  if (!rootDirHandle) return;
  if (!await verifyPermission(rootDirHandle, true)) {
    throw new Error('Permiso de escritura denegado para la carpeta seleccionada');
  }

  const baseDir = await getDirectoryHandleFromPath(rootDirHandle, 'ptah-data', true);
  const chatsDir = await getDirectoryHandleFromPath(baseDir, 'chats', true);
  
  const singleChatDir = await getDirectoryHandleFromPath(chatsDir, chat.id, true);
  await writeJsonFile(singleChatDir, 'chat-data.json', chat);

  const contextDir = await getDirectoryHandleFromPath(singleChatDir, 'context', true);
  if (chat.contextDocuments && Array.isArray(chat.contextDocuments)) {
    await Promise.all(chat.contextDocuments.map(doc => writeJsonFile(contextDir, `${doc.id || Date.now()}.json`, doc)));
  }
}

// Limpiar todo el estado local y almacenamiento
export function clearAllLocalData() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.clear();
  } catch (err) {}
}

export function loadAppData() {
  if (typeof window === 'undefined') return defaultAppData;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return defaultAppData;
    const parsed = JSON.parse(stored);
    return {
      scenarios: Array.isArray(parsed.scenarios) ? parsed.scenarios : [],
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      narrators: Array.isArray(parsed.narrators) ? parsed.narrators : [],
    };
  } catch (error) {
    return defaultAppData;
  }
}

export function saveAppData(data) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Could not save fallback data to localStorage', error);
  }
}
