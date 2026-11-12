/**
 * Pembungkus kecil IndexedDB Kalām (situs/js/antrean.js) — <= 100 baris (SRS-1 §3, TB-M1-01)
 * Menyimpan: (1) sesi/token siswa, (2) antrean unggah & peristiwa, (3) rekaman latihan lokal.
 */
const NAMA_DB = 'kalam_db';
const VERSI_DB = 1;
let janjiDb = null;

export function bukaDb() {
  if (janjiDb) return janjiDb;
  janjiDb = new Promise((selesai, tolak) => {
    const req = indexedDB.open(NAMA_DB, VERSI_DB);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('sesi')) db.createObjectStore('sesi', { keyPath: 'kunci' });
      if (!db.objectStoreNames.contains('antrean')) db.createObjectStore('antrean', { keyPath: 'id_idempoten' });
      if (!db.objectStoreNames.contains('latihan')) db.createObjectStore('latihan', { keyPath: 'id' });
    };
    req.onsuccess = () => selesai(req.result);
    req.onerror = () => tolak(req.error);
  });
  return janjiDb;
}

function jalankanToko(namaToko, mode, aksi) {
  return bukaDb().then((db) => new Promise((selesai, tolak) => {
    const tx = db.transaction(namaToko, mode);
    const toko = tx.objectStore(namaToko);
    const req = aksi(toko);
    req.onsuccess = () => selesai(req.result);
    req.onerror = () => tolak(req.error);
  }));
}

export async function simpanSesi(kunci, nilai) {
  return jalankanToko('sesi', 'readwrite', (t) => t.put({ kunci, nilai, waktu: Date.now() }));
}

export async function ambilSesi(kunci) {
  const baris = await jalankanToko('sesi', 'readonly', (t) => t.get(kunci));
  return baris ? baris.nilai : null;
}

export async function hapusSesi(kunci) {
  return jalankanToko('sesi', 'readwrite', (t) => t.delete(kunci));
}

export async function tambahAntrean(item) {
  const entri = {
    id_idempoten: item.id_idempoten,
    aksi: item.aksi,
    data: item.data || {},
    label: item.label || item.aksi,
    status: item.status || 'Menunggu',
    percobaan_kirim: item.percobaan_kirim || 0,
    waktu_buat: item.waktu_buat || Date.now()
  };
  return jalankanToko('antrean', 'readwrite', (t) => t.put(entri));
}

export async function ambilSemuaAntrean() {
  const daftar = await jalankanToko('antrean', 'readonly', (t) => t.getAll());
  return Array.isArray(daftar) ? daftar.sort((a, b) => a.waktu_buat - b.waktu_buat) : [];
}

export async function perbaruiStatusAntrean(id_idempoten, perubahan) {
  const lama = await jalankanToko('antrean', 'readonly', (t) => t.get(id_idempoten));
  if (!lama) return null;
  const baru = Object.assign({}, lama, perubahan, { waktu_ubah: Date.now() });
  await jalankanToko('antrean', 'readwrite', (t) => t.put(baru));
  return baru;
}

export async function hapusAntrean(id_idempoten) {
  return jalankanToko('antrean', 'readwrite', (t) => t.delete(id_idempoten));
}

export async function simpanRekamanLatihan(id, data) {
  return jalankanToko('latihan', 'readwrite', (t) => t.put({ id, data, waktu: Date.now() }));
}

export async function ambilRekamanLatihan(id) {
  const baris = await jalankanToko('latihan', 'readonly', (t) => t.get(id));
  return baris ? baris.data : null;
}
