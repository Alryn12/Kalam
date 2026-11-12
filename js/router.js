/**
 * Router Hash Buatan Sendiri (situs/js/router.js)
 * Tugas M1-A: TB-M1-01
 * Acuan: SRS-1 bagian 3 & 8; BP-1 bagian A & B (S-01 s.d. S-91, G-01 s.d. G-03)
 */

export const DAFTAR_ID_LAYAR_SISWA = [
  'S-01', 'S-02', 'S-03',
  'S-10', 'S-11', 'S-12', 'S-13', 'S-14', 'S-15', 'S-16', 'S-17', 'S-18', 'S-19',
  'S-20', 'S-21', 'S-22', 'S-23', 'S-24',
  'S-30', 'S-31', 'S-32', 'S-33', 'S-34', 'S-35', 'S-36', 'S-37',
  'S-40', 'S-41', 'S-42', 'S-43', 'S-44', 'S-45', 'S-46',
  'S-50', 'S-51', 'S-52',
  'S-60', 'S-61', 'S-62',
  'S-70', 'S-71', 'S-72', 'S-73',
  'S-90', 'S-91'
];

export const DAFTAR_ID_LAYAR_SETORAN_HP = [
  'G-01', 'G-02', 'G-03'
];

export const SEMUA_ID_LAYAR_APLIKASI = [
  ...DAFTAR_ID_LAYAR_SISWA,
  ...DAFTAR_ID_LAYAR_SETORAN_HP
];

const petaPerenderLayar = new Map();
let perenderBawaan = null;
let ruteSaatIni = { idLayar: 'S-01', param: {}, asal: '' };

/**
 * Menormalkan string rute menjadi ID layar standar seperti "S-01" atau "G-01"
 */
export function normalkanIdLayar(mentah) {
  const bersih = String(mentah || '')
    .replace(/^#\/?/, '')
    .split('?')[0]
    .trim()
    .toUpperCase();

  if (!bersih) return 'S-01';
  if (/^[SG]-\d{2}$/.test(bersih)) return bersih;
  if (/^[SG]\d{2}$/.test(bersih)) return `${bersih[0]}-${bersih.slice(1)}`;
  return bersih;
}

/**
 * Mengurai hash URL menjadi { idLayar, param }
 * Contoh: "#/s-03?unit=U1&blok=U1-BA" -> { idLayar: "S-03", param: { unit: "U1", blok: "U1-BA" } }
 */
export function uraiHash(hashMentah = window.location.hash) {
  const tanpaPagar = String(hashMentah || '').replace(/^#\/?/, '').trim();
  if (!tanpaPagar) {
    return { idLayar: 'S-01', param: {} };
  }

  const [bagianJalur, bagianKueri] = tanpaPagar.split('?');
  const idLayar = normalkanIdLayar(bagianJalur);
  const param = {};

  if (bagianKueri) {
    const searchParams = new URLSearchParams(bagianKueri);
    searchParams.forEach((nilai, kunci) => {
      param[kunci] = nilai;
    });
  }

  return { idLayar, param };
}

/**
 * Mendaftarkan fungsi perender untuk satu ID layar (mis. "S-01")
 */
export function daftarkanLayar(idLayar, fungsiRender) {
  const idNormal = normalkanIdLayar(idLayar);
  petaPerenderLayar.set(idNormal, fungsiRender);
}

/**
 * Mendaftarkan fungsi perender cadangan/bawaan
 */
export function aturPerenderBawaan(fungsiRender) {
  perenderBawaan = fungsiRender;
}

/**
 * Mengarahkan aplikasi ke layar tertentu (contoh: arahKe("S-02") -> "#/s-02")
 */
export function arahKe(idLayar, param = {}) {
  const idNormal = normalkanIdLayar(idLayar).toLowerCase();
  const kueri = new URLSearchParams();
  Object.keys(param || {}).forEach((k) => {
    if (param[k] !== undefined && param[k] !== null && param[k] !== '') {
      kueri.set(k, String(param[k]));
    }
  });
  const untaiKueri = kueri.toString();
  const hashTujuan = `#/${idNormal}${untaiKueri ? `?${untaiKueri}` : ''}`;

  if (window.location.hash === hashTujuan) {
    tanganiPerubahanHash();
  } else {
    window.location.hash = hashTujuan;
  }
}

/**
 * Menjalankan perender layar saat hash berubah
 */
export async function tanganiPerubahanHash() {
  const { idLayar, param } = uraiHash(window.location.hash);
  const layarSebelumnya = ruteSaatIni.idLayar;
  ruteSaatIni = { idLayar, param, asal: layarSebelumnya };

  const perender = petaPerenderLayar.get(idLayar) || perenderBawaan;
  if (typeof perender === 'function') {
    await perender(ruteSaatIni);
  }
}

/**
 * Memulai router hash dan mendengarkan perubahan alamat
 */
export function mulaiRouter(layarAwal = 'S-01') {
  window.addEventListener('hashchange', () => {
    tanganiPerubahanHash();
  });

  if (!window.location.hash || window.location.hash === '#' || window.location.hash === '#/') {
    arahKe(layarAwal);
  } else {
    tanganiPerubahanHash();
  }
}

export function ambilRuteSaatIni() {
  return ruteSaatIni;
}
