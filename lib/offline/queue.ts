const DB_NAME = "fineset-offline";
const STORE_NAME = "mutations";
const DB_VERSION = 1;

export type OfflineMutationKind = "visit" | "field-sale" | "call-outcome";

export interface OfflineMutation {
  id: string;
  kind: OfflineMutationKind;
  url: string;
  method: "POST" | "PATCH";
  body: string;
  createdAt: number;
  retryCount: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
      }),
  );
}

export async function enqueueOfflineMutation(
  mutation: Omit<OfflineMutation, "id" | "createdAt" | "retryCount">,
): Promise<string> {
  const id = crypto.randomUUID();
  const record: OfflineMutation = {
    ...mutation,
    id,
    createdAt: Date.now(),
    retryCount: 0,
  };
  await runTransaction("readwrite", (store) => store.put(record));
  return id;
}

export async function listOfflineMutations(): Promise<OfflineMutation[]> {
  return runTransaction<OfflineMutation[]>("readonly", (store) => store.getAll());
}

export async function removeOfflineMutation(id: string): Promise<void> {
  await runTransaction("readwrite", (store) => store.delete(id));
}

export async function updateOfflineMutation(mutation: OfflineMutation): Promise<void> {
  await runTransaction("readwrite", (store) => store.put(mutation));
}

export async function countOfflineMutations(): Promise<number> {
  const items = await listOfflineMutations();
  return items.length;
}
