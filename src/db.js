const DB_NAME = "yang-mulia-pos";
const DB_VERSION = 1;
let dbPromise;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("products")) db.createObjectStore("products", {keyPath:"id"});
      if (!db.objectStoreNames.contains("categories")) db.createObjectStore("categories", {keyPath:"id"});
      if (!db.objectStoreNames.contains("sales")) db.createObjectStore("sales", {keyPath:"id"});
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", {keyPath:"id", autoIncrement:true});
      if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", {keyPath:"key"});
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function tx(store, mode="readonly") {
  const db = await openDb();
  return db.transaction(store, mode).objectStore(store);
}
export async function put(store, value) {
  const s = await tx(store, "readwrite");
  return new Promise((resolve,reject)=>{const r=s.put(value);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
}
export async function bulkPut(store, values) {
  const s = await tx(store, "readwrite");
  return new Promise((resolve,reject)=>{let n=0;if(!values.length)return resolve();for(const v of values){const r=s.put(v);r.onerror=()=>reject(r.error);r.onsuccess=()=>{n++;if(n===values.length)resolve()}}});
}
export async function getAll(store) {
  const s = await tx(store);
  return new Promise((resolve,reject)=>{const r=s.getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
}
export async function get(store,id) {
  const s = await tx(store);
  return new Promise((resolve,reject)=>{const r=s.get(id);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
}
export async function remove(store,id) {
  const s = await tx(store,"readwrite");
  return new Promise((resolve,reject)=>{const r=s.delete(id);r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)});
}
export async function clear(store) {
  const s = await tx(store,"readwrite");
  return new Promise((resolve,reject)=>{const r=s.clear();r.onsuccess=()=>resolve();r.onerror=()=>reject(r.error)});
}
export async function queueAction(action) {
  return put("queue", {...action, created_at:new Date().toISOString()});
}
export async function getQueue() { return getAll("queue"); }
export async function deleteQueue(id) { return remove("queue",id); }
export async function setMeta(key,value) { return put("meta",{key,value}); }
export async function getMeta(key) { const x=await get("meta",key); return x?.value; }
