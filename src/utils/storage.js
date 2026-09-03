
import { saveAppDataToIndexedDB } from './db';
import { saveAppDataToServer, saveSettingsToServer } from './serverApi';

const STORAGE_KEY = 'ptah-app-data';

const defaultAppData = {
  scenarios: [],
  cards: [],
  narrators: [],
  tools: [],
};

// In-memory cache for instant synchronous access across React components
let memoryAppData = null;
let memoryChatSettings = null;

export function setMemoryAppData(data) {
  memoryAppData = data;
}

export function setMemoryChatSettings(settings) {
  memoryChatSettings = settings;
}

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
    } catch (err) { }
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
    } catch (e) { }

    try {
      const cardsDir = await baseDir.getDirectoryHandle('cards', { create: false });
      for await (const entry of cardsDir.values()) {
        if (entry.kind === 'file') {
          const item = await readJsonFile(cardsDir, entry.name);
          if (item && (item.title || item.name)) scannedCards.push(item);
        }
      }
    } catch (e) { }

    try {
      const narratorsDir = await baseDir.getDirectoryHandle('narrators', { create: false });
      for await (const entry of narratorsDir.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          const item = await readJsonFile(narratorsDir, entry.name);
          if (item) scannedNarrators.push(item);
        }
      }
    } catch (e) { }

    let scannedTools = [];
    try {
      const toolsDir = await baseDir.getDirectoryHandle('tools', { create: false });
      for await (const entry of toolsDir.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.json')) {
          const item = await readJsonFile(toolsDir, entry.name);
          if (item) scannedTools.push(item);
        }
      }
    } catch (e) { }

    if (scannedScenarios.length || scannedCards.length || scannedNarrators.length || scannedTools.length) {
      const loadedFolderData = {
        scenarios: scannedScenarios,
        cards: scannedCards,
        narrators: scannedNarrators,
        tools: scannedTools
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
 * Guarda 100% el estado completo de la aplicación (escenarios, tarjetas, narradores, herramientas) en archivos JSON independientes.
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
  const toolsDir = await getDirectoryHandleFromPath(baseDir, 'tools', true);

  await Promise.all((data.scenarios || []).map(s => writeJsonFile(scenariosDir, `${s.id}.json`, s)));
  await Promise.all((data.cards || []).map(c => writeJsonFile(cardsDir, `${c.id}.json`, c)));
  await Promise.all((data.narrators || []).map(n => writeJsonFile(narratorsDir, `${n.id}.json`, n)));
  await Promise.all((data.tools || []).map(t => writeJsonFile(toolsDir, `${t.id}.json`, t)));
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
  } catch (err) { }
}

export const CHAT_SETTINGS_KEY = 'ptah-chat-settings';

export const DEFAULT_CHAT_SETTINGS = {
  preferredModel: 'Precog-Magnum-31B.i1-Q3_K_S.gguf',
  preferredLanguage: 'auto',
  responseLength: 1000,
  llmServerUrl: 'http://localhost:3001',
  lmStudioUrl: 'http://localhost:3001',
  imageServerUrl: 'http://127.0.0.1:42016',
  fontFamily: 'default',
  fontSize: 'normal',
  textColor: '#eaeaea',
  dialogueColor: '#ffd36b',
  actionColor: '#6ee7b7',
  thoughtColor: '#c084fc',
  aiBubbleBg: 'rgba(255, 255, 255, 0.03)',
  userBubbleBg: 'rgba(255, 211, 107, 0.1)',
  sendOnShiftEnter: true,
  nsfwAllowed: false,
  showLocationBackground: true,
  showCharacterSidebar: true,
  chatBackgroundOpacity: 0.85,
  preferredImageModel: 'malaAnimeMixNSFW_v70WithoutVAE.safetensors',
  orchestratorModel: 'mistral-nemo-instruct-2407-gguf-Q4-K-M.gguf', // Lightweight GGUF SLM assistant / intermediary
  autoCardCreation: 'auto', // 'auto' | 'manual' | 'off'
  autoImageDiffusion: 'manual', // 'auto' | 'manual' | 'off'
  temperature: 0.70
};

export function loadChatSettings() {
  if (typeof window === 'undefined') return memoryChatSettings || DEFAULT_CHAT_SETTINGS;
  try {
    const stored = window.localStorage.getItem(CHAT_SETTINGS_KEY);
    if (!stored) return memoryChatSettings || DEFAULT_CHAT_SETTINGS;
    const parsed = JSON.parse(stored);
    const rawServerUrl = (parsed.llmServerUrl && !parsed.llmServerUrl.includes(':1234') && parsed.llmServerUrl !== DEFAULT_CHAT_SETTINGS.llmServerUrl)
      ? parsed.llmServerUrl
      : (parsed.lmStudioUrl && !parsed.lmStudioUrl.includes(':1234') ? parsed.lmStudioUrl : (parsed.llmServerUrl || DEFAULT_CHAT_SETTINGS.llmServerUrl));
    return {
      preferredModel: parsed.preferredModel || DEFAULT_CHAT_SETTINGS.preferredModel,
      orchestratorModel: parsed.orchestratorModel || DEFAULT_CHAT_SETTINGS.orchestratorModel,
      autoCardCreation: parsed.autoCardCreation || DEFAULT_CHAT_SETTINGS.autoCardCreation,
      autoImageDiffusion: parsed.autoImageDiffusion || DEFAULT_CHAT_SETTINGS.autoImageDiffusion,
      preferredLanguage: parsed.preferredLanguage || DEFAULT_CHAT_SETTINGS.preferredLanguage,
      responseLength: parsed.responseLength || DEFAULT_CHAT_SETTINGS.responseLength,
      temperature: typeof parsed.temperature === 'number' ? parsed.temperature : DEFAULT_CHAT_SETTINGS.temperature,
      llmServerUrl: rawServerUrl,
      lmStudioUrl: rawServerUrl,
      imageServerUrl: parsed.imageServerUrl || DEFAULT_CHAT_SETTINGS.imageServerUrl,
      preferredImageModel: parsed.preferredImageModel || DEFAULT_CHAT_SETTINGS.preferredImageModel,
      fontFamily: parsed.fontFamily || DEFAULT_CHAT_SETTINGS.fontFamily,
      fontSize: parsed.fontSize || DEFAULT_CHAT_SETTINGS.fontSize,
      textColor: parsed.textColor || DEFAULT_CHAT_SETTINGS.textColor,
      dialogueColor: parsed.dialogueColor || DEFAULT_CHAT_SETTINGS.dialogueColor,
      actionColor: parsed.actionColor || DEFAULT_CHAT_SETTINGS.actionColor,
      thoughtColor: parsed.thoughtColor || DEFAULT_CHAT_SETTINGS.thoughtColor,
      aiBubbleBg: parsed.aiBubbleBg || DEFAULT_CHAT_SETTINGS.aiBubbleBg,
      userBubbleBg: parsed.userBubbleBg || DEFAULT_CHAT_SETTINGS.userBubbleBg,
      sendOnShiftEnter: typeof parsed.sendOnShiftEnter === 'boolean' ? parsed.sendOnShiftEnter : DEFAULT_CHAT_SETTINGS.sendOnShiftEnter,
      nsfwAllowed: typeof parsed.nsfwAllowed === 'boolean' ? parsed.nsfwAllowed : DEFAULT_CHAT_SETTINGS.nsfwAllowed,
      showLocationBackground: typeof parsed.showLocationBackground === 'boolean' ? parsed.showLocationBackground : DEFAULT_CHAT_SETTINGS.showLocationBackground,
      showCharacterSidebar: typeof parsed.showCharacterSidebar === 'boolean' ? parsed.showCharacterSidebar : DEFAULT_CHAT_SETTINGS.showCharacterSidebar,
      chatBackgroundOpacity: typeof parsed.chatBackgroundOpacity === 'number' ? parsed.chatBackgroundOpacity : DEFAULT_CHAT_SETTINGS.chatBackgroundOpacity
    };
  } catch (e) {

    console.warn('[Storage]: Failed to read chatSettings from localStorage:', e);
    return DEFAULT_CHAT_SETTINGS;
  }
}


export function saveChatSettings(settings) {
  memoryChatSettings = settings;
  saveSettingsToServer(settings).catch(() => {});
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    // Silent in case of quota limit
  }
}

export function loadAppData() {
  if (typeof window === 'undefined') return memoryAppData || defaultAppData;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return memoryAppData || defaultAppData;
    const parsed = JSON.parse(stored);
    return {
      scenarios: Array.isArray(parsed.scenarios) ? parsed.scenarios : [],
      cards: Array.isArray(parsed.cards) ? parsed.cards : [],
      narrators: Array.isArray(parsed.narrators) ? parsed.narrators : [],
      tools: Array.isArray(parsed.tools) ? parsed.tools : [],
    };
  } catch (error) {
    return memoryAppData || defaultAppData;
  }
}

export function saveAppData(data) {
  memoryAppData = data;
  if (typeof window === 'undefined') return;
  
  // 1. Primary: Save directly to local computer disk (ptah-data/appData.json)
  saveAppDataToServer(data).catch(() => {});

  // 2. Local IndexedDB replication (unlimited storage capacity)
  saveAppDataToIndexedDB(data).catch(() => {});
}

/**
 * Relinks legacy or unassigned creations to the authenticated user account
 */
export function relinkAllCreationsToUser(currentData, user) {
  if (!user) return { data: currentData, modifiedCount: 0 };
  const userId = user.id;
  const username = user.username || 'Azgael';
  const userKey = user.userKey || '';

  let modifiedCount = 0;

  const relinkItem = (item) => {
    if (!item.creatorId || item.creatorId === 'usr-master-admin' || !item.creatorName || item.creatorName === 'Creador Ptah') {
      modifiedCount++;
      return { ...item, creatorId: userId, creatorName: username, creatorKey: userKey };
    }
    return item;
  };

  const scenarios = (currentData?.scenarios || []).map(relinkItem);
  const cards = (currentData?.cards || []).map(relinkItem);
  const narrators = (currentData?.narrators || []).map(relinkItem);
  const tools = (currentData?.tools || []).map(relinkItem);

  const updatedData = {
    ...currentData,
    scenarios,
    cards,
    narrators,
    tools
  };

  return { data: updatedData, modifiedCount };
}


