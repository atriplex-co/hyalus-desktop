import { AxiosError } from "axios";
import { computed } from "vue";
import { store } from "../store";

let idbDb: IDBDatabase;

const idbPromisify = (req: IDBRequest | IDBTransaction) =>
  new Promise<unknown>((resolve, reject) => {
    if (req instanceof IDBRequest) {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.result);
    }

    if (req instanceof IDBTransaction) {
      req.oncomplete = () => resolve(null);
      req.onerror = () => reject();
      req.onabort = () => reject();
    }
  });

const idbGetStore = async () => {
  if (!idbDb) {
    const req = indexedDB.open("default");

    req.onupgradeneeded = () => {
      req.result.createObjectStore("default");
    };

    idbDb = (await idbPromisify(req)) as IDBDatabase;
  }

  return idbDb.transaction("default", "readwrite").objectStore("default");
};

export const idbGet = async (k: string): Promise<unknown> => {
  const store = await idbGetStore();

  return await idbPromisify(store.get(k));
};

export const idbSet = async <T>(k: string, v: T): Promise<T> => {
  const store = await idbGetStore();
  store.put(v, k);

  await idbPromisify(store.transaction);
  return v;
};

export const idbKeys = async (): Promise<Array<string>> => {
  const store = await idbGetStore();

  return (await idbPromisify(store.getAllKeys())) as Array<string>;
};

export const idbDel = async (k: string): Promise<void> => {
  const store = await idbGetStore();
  store.delete(k);

  await idbPromisify(store.transaction);
};

export const idbClear = async (): Promise<void> => {
  const store = await idbGetStore();
  store.clear();

  await idbPromisify(store.transaction);
};

export const prettyError = (e: unknown): string => {
  return (
    (
      (e as AxiosError).response?.data as {
        error?: string;
      }
    )?.error || (e as Error).message
  );
};

export const iceServers = [
  {
    urls: ["stun:stun.l.google.com:19302"],
  },
  {
    urls: ["stun:stun1.l.google.com:19302"],
  },
];

export const configToComputed = <T>(k: string) => {
  return computed({
    get() {
      return (store.state.value.config as Record<string, unknown>)[k] as T;
    },
    async set(v: T) {
      await store.writeConfig(k, v);
    },
  });
};
