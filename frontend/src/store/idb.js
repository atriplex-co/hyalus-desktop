let db;

const promisify = (req) =>
  new Promise((resolve, reject) => {
    req.oncomplete = () => resolve(req.result);
    req.onsuccess = () => resolve(req.result);
    req.onabort = () => reject(req.result);
    req.onerror = () => reject(req.result);
  });

const getStore = async () => {
  await navigator.storage.persist();

  if (!db) {
    const req = indexedDB.open("default");

    req.onupgradeneeded = () => {
      req.result.createObjectStore("default");
    };

    db = await promisify(req);
  }

  return db.transaction("default", "readwrite").objectStore("default");
};

const get = async (k) => {
  const store = await getStore();

  return await promisify(store.get(k));
};

const set = async (k, v) => {
  const store = await getStore();
  store.put(v, k);

  return await promisify(store.transaction);
};

const keys = async () => {
  const store = await getStore();

  return await promisify(store.getAllKeys());
};

const _delete = async (k) => {
  const store = await getStore();
  store.delete(k);

  return promisify(store.transaction);
};

const clear = async () => {
  const store = await getStore();
  store.clear();

  return promisify(store.transaction);
};

export default {
  get,
  set,
  delete: _delete, //because of js keywords.
  keys,
  clear,
};
