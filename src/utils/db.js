// Minimal IndexedDB helper for chats & app data
import { saveChatsToServer } from './serverApi';

const DB_NAME = 'ptah-db';
const DB_VERSION = 2;
const STORE_CHATS = 'chats';
const STORE_APP_DATA = 'app_data';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE_CHATS)) {
        db.createObjectStore(STORE_CHATS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_APP_DATA)) {
        db.createObjectStore(STORE_APP_DATA);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveAppDataToIndexedDB(data) {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_APP_DATA, 'readwrite');
      const store = tx.objectStore(STORE_APP_DATA);
      const req = store.put(data, 'main');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}

export async function loadAppDataFromIndexedDB() {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_APP_DATA, 'readonly');
      const store = tx.objectStore(STORE_APP_DATA);
      const req = store.get('main');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return null;
  }
}

export function getChatActivityTimestamp(c) {
  if (!c) return 0;
  if (c.updatedAt) return new Date(c.updatedAt).getTime();
  if (Array.isArray(c.messages) && c.messages.length > 0) {
    const last = c.messages[c.messages.length - 1];
    if (last.timestamp) return new Date(last.timestamp).getTime();
    if (last.createdAt) return new Date(last.createdAt).getTime();
  }
  return new Date(c.createdAt || 0).getTime();
}

export async function addChat(chat) {
  const db = await openDB();
  const res = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, 'readwrite');
    const store = tx.objectStore(STORE_CHATS);
    const req = store.put(chat);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  // Non-blocking sync to server disk (ptah-data/chats.json)
  try {
    getAllChats().then(all => {
      if (Array.isArray(all)) {
        saveChatsToServer(all).catch(() => {});
      }
    }).catch(() => {});
  } catch (e) {}

  return res;
}

export async function getAllChats() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, 'readonly');
    const store = tx.objectStore(STORE_CHATS);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getChatById(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, 'readonly');
    const store = tx.objectStore(STORE_CHATS);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteChat(id) {
  const db = await openDB();
  const res = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, 'readwrite');
    const store = tx.objectStore(STORE_CHATS);
    const req = store.delete(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  try {
    getAllChats().then(all => {
      if (Array.isArray(all)) {
        saveChatsToServer(all).catch(() => {});
      }
    }).catch(() => {});
  } catch (e) {}

  return res;
}

export async function clearAllChats() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, 'readwrite');
    const store = tx.objectStore(STORE_CHATS);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function exportChats() {
  const chats = await getAllChats();
  return JSON.stringify(chats, null, 2);
}
