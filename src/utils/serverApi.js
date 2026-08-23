/**
 * Client API for interacting with the Ptahn Native Server
 */

export function getServerBaseUrl() {
  if (typeof window !== 'undefined' && window.location && window.location.port === '3001') {
    return window.location.origin;
  }
  return 'http://localhost:3001';
}

export async function fetchServerStatus(baseUrl = getServerBaseUrl()) {
  try {
    const res = await fetch(`${baseUrl}/api/ai/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return { online: true, ...data };
  } catch (error) {
    return { online: false, error: error.message };
  }
}

export async function fetchAvailableModels(baseUrl = getServerBaseUrl()) {
  try {
    const res = await fetch(`${baseUrl}/api/models`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    return { success: false, models: [], error: error.message };
  }
}

export async function loadModelOnServer(modelName, baseUrl = getServerBaseUrl()) {
  try {
    const res = await fetch(`${baseUrl}/api/models/load`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelName })
    });
    return await res.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function fetchAppDataFromServer(baseUrl = getServerBaseUrl()) {
  try {
    const res = await fetch(`${baseUrl}/api/storage/app-data`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function saveAppDataToServer(data, baseUrl = getServerBaseUrl()) {
  try {
    const res = await fetch(`${baseUrl}/api/storage/app-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    });
    return await res.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function fetchNetworkInfo(baseUrl = getServerBaseUrl()) {
  try {
    const res = await fetch(`${baseUrl}/api/network/info`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function sendChatToServer(messages, options = {}, baseUrl = getServerBaseUrl()) {
  const res = await fetch(`${baseUrl}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, options })
  });
  if (!res.ok) {
    throw new Error(`Server returned HTTP ${res.status}`);
  }
  return await res.json();
}

export async function fetchNativeImageModels(baseUrl = getServerBaseUrl()) {
  try {
    const res = await fetch(`${baseUrl}/api/images/models`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    return { success: false, models: [], error: error.message };
  }
}

export async function fetchImageEngineStatus(baseUrl = getServerBaseUrl()) {
  try {
    const res = await fetch(`${baseUrl}/api/images/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    return { online: false, error: error.message };
  }
}

export async function generateNativeImage(prompt, options = {}, baseUrl = getServerBaseUrl()) {
  const res = await fetch(`${baseUrl}/api/images/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, options })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Server returned HTTP ${res.status}`);
  }
  return await res.json();
}

