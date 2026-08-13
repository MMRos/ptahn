// Minimal IndexedDB helper for chats
const DB_NAME = 'ptah-db';
const DB_VERSION = 1;
const STORE_CHATS = 'chats';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (ev) => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE_CHATS)) {
        db.createObjectStore(STORE_CHATS, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addChat(chat) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, 'readwrite');
    const store = tx.objectStore(STORE_CHATS);
    const req = store.put(chat);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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

export async function deleteChat(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CHATS, 'readwrite');
    const store = tx.objectStore(STORE_CHATS);
    const req = store.delete(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
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
