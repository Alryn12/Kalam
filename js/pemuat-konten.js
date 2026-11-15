/**
 * Pemuat & Validator Konten Klien (situs/js/pemuat-konten.js)
 * Tugas M1-F: TB-M1-08 (FR-080)
 * Acuan: SRS-2 bagian 1 & 4; SRS-3 FR-080; docs/KEPUTUSAN.md SL-BARU-10 & SL-BARU-11
 */

import { arahKe } from './router.js';
import { ambilState, hapusCacheKonten, muatKontenJson } from './state.js';

const TARGET_GLOBAL_INDEKS = {
  pasangan: 229,
  blok: 30,
  blok_wajib: 29,
  l1: 737,
  l2: 484,
  l3: 121
};

const JALUR_INDEKS = 'konten/indeks.json';

/**
 * Menormalkan ID unit (misal "1" / "u1" / "U1" -> "U1")
 */
export function normalkanIdUnit(idUnit) {
  const bersih = String(idUnit || 'U1').trim().toUpperCase();
  const cocok = bersih.match(/^U?([1-6])$/);
  return cocok ? `U${cocok[1]}` : bersih;
}

/**
 * Menormalkan ID blok (misal "BA", "U1-BLOK-A", "u1-ba" -> "U1-BA") (SRS-2 §1)
 */
export function normalkanIdBlok(idBlok, idUnit = 'U1') {
  const unit = normalkanIdUnit(idUnit);
  const bersih = String(idBlok || '').trim().toUpperCase();
  const cocokPenuh = bersih.match(/^(U[1-6])-(?:BLOK-)?B?([A-G])$/);
  if (cocokPenuh) return `${cocokPenuh[1]}-B${cocokPenuh[2]}`;
  const cocokPendek = bersih.match(/^B?([A-G])$/);
  if (cocokPendek) return `${unit}-B${cocokPendek[1]}`;
  return bersih;
}

function jalurKonten(jalurRelatif) {
  const bersih = String(jalurRelatif || '').replace(/^\/+/, '');
  return bersih.startsWith('konten/') ? bersih : `konten/${bersih}`;
}

function jalankanPengalihanS91(opsi, pesanTeknis) {
  console.error('[Log Teknis Kalām] Kendala pemuat konten:', pesanTeknis);
  if (opsi && opsi.arahkanKeS91) {
    arahKe('S-91', {
      jenis: 'gagal_memuat',
      asal: opsi.asal || 'S-03',
      tujuan: opsi.tujuan || 'S-02',
      unit: opsi.unit || '',
      blok: opsi.blok || ''
    });
  }
}

function kumpulkanIdUnik(daftar, labelBagian, himpunanGlobal) {
  if (!Array.isArray(daftar)) {
    throw new Error(`Daftar ${labelBagian} bukan larik.`);
  }
  const himpunanLokal = new Set();
  for (const item of daftar) {
    if (!item || typeof item !== 'object' || !item.id || typeof item.id !== 'string') {
      throw new Error(`Butir pada ${labelBagian} tidak memiliki id valid.`);
    }
    if (himpunanLokal.has(item.id) || (himpunanGlobal && himpunanGlobal.has(item.id))) {
      throw new Error(`ID ganda ditemukan pada ${labelBagian}: ${item.id}`);
    }
    himpunanLokal.add(item.id);
    if (himpunanGlobal) himpunanGlobal.add(item.id);
  }
}

/**
 * Memvalidasi struktur indeks.json dan target angka global FR-080 (229, 30, 737, 484, 121)
 */
export function validasiIndeksKonten(indeks) {
  if (!indeks || typeof indeks !== 'object') {
    throw new Error('Data indeks.json tidak valid.');
  }
  const r = indeks.ringkasan;
  if (!r || typeof r !== 'object') {
    throw new Error('Ringkasan global indeks.json tidak tersedia.');
  }
  for (const [kunci, target] of Object.entries(TARGET_GLOBAL_INDEKS)) {
    if (Number(r[kunci]) !== target) {
      throw new Error(`Ringkasan global indeks.json "${kunci}" = ${r[kunci]}, seharusnya ${target}.`);
    }
  }
  if (!Array.isArray(indeks.unit) || indeks.unit.length === 0) {
    throw new Error('Daftar unit pada indeks.json kosong.');
  }
  const himpunanBlok = new Set();
  for (const u of indeks.unit) {
    if (!u || !u.id || !Array.isArray(u.blok) || u.blok.length === 0) {
      throw new Error(`Definisi unit di indeks.json tidak lengkap: ${u && u.id}`);
    }
    for (const idB of u.blok) {
      const normal = normalkanIdBlok(idB, u.id);
      if (normal !== idB || himpunanBlok.has(normal)) {
        throw new Error(`ID blok di indeks.json tidak valid atau ganda: ${idB}`);
      }
      himpunanBlok.add(normal);
    }
  }
  return indeks;
}

/**
 * Memvalidasi isi satu berkas blok terhadap indeks.json
 */
export function validasiBlokTerhadapIndeks(blokData, indeks, idBlokDiharapkan) {
  if (!blokData || typeof blokData !== 'object') {
    throw new Error(`Data blok ${idBlokDiharapkan} kosong.`);
  }
  const unitInfo = indeks.unit.find((u) => normalkanIdUnit(u.id) === normalkanIdUnit(blokData.unit));
  if (!unitInfo) {
    throw new Error(`Unit "${blokData.unit}" pada blok ${idBlokDiharapkan} tidak terdaftar di indeks.json.`);
  }
  const idBlokNormal = normalkanIdBlok(blokData.id, unitInfo.id);
  if (idBlokNormal !== idBlokDiharapkan) {
    throw new Error(`ID blok "${blokData.id}" tidak cocok dengan target "${idBlokDiharapkan}".`);
  }
  if (!unitInfo.blok.includes(idBlokDiharapkan)) {
    throw new Error(`Blok "${idBlokDiharapkan}" tidak ada di daftar blok ${unitInfo.id} pada indeks.json.`);
  }

  kumpulkanIdUnik(blokData.pasangan, `${idBlokDiharapkan}.pasangan`);
  kumpulkanIdUnik(blokData.dialog, `${idBlokDiharapkan}.dialog`);
  kumpulkanIdUnik(blokData.l1, `${idBlokDiharapkan}.l1`);
  kumpulkanIdUnik(blokData.l2, `${idBlokDiharapkan}.l2`);
  kumpulkanIdUnik(blokData.l3, `${idBlokDiharapkan}.l3`);
  kumpulkanIdUnik(blokData.aset_audio, `${idBlokDiharapkan}.aset_audio`);

  if (!blokData.aku_bisa || blokData.aku_bisa.id !== `AB-${idBlokDiharapkan}`) {
    throw new Error(`Pernyataan Aku Bisa pada ${idBlokDiharapkan} tidak cocok.`);
  }

  for (const itemL1 of blokData.l1) {
    if (!Array.isArray(itemL1.kata_wajib) || itemL1.kata_wajib.length === 0) {
      throw new Error(`kata_wajib L1 kosong pada ${itemL1.id}.`);
    }
  }
  for (const kartuL3 of blokData.l3) {
    const adaGiliran = kartuL3.pola_giliran === 'dua_putaran' && Array.isArray(kartuL3.giliran) && kartuL3.giliran.length === 2;
    if (!adaGiliran) {
      if (!kartuL3.slot1 || !Array.isArray(kartuL3.slot1.kata_wajib) || kartuL3.slot1.kata_wajib.length === 0) {
        throw new Error(`kata_wajib slot1 L3 kosong pada ${kartuL3.id}.`);
      }
      if (!kartuL3.slot2 || !Array.isArray(kartuL3.slot2.kata_wajib) || kartuL3.slot2.kata_wajib.length === 0) {
        throw new Error(`kata_wajib slot2 L3 kosong pada ${kartuL3.id}.`);
      }
    }
  }

  const targetBlok = unitInfo.ringkasan_blok && unitInfo.ringkasan_blok[idBlokDiharapkan];
  if (targetBlok) {
    const cekAngka = [
      ['pasangan', blokData.pasangan.length],
      ['dialog', blokData.dialog.length],
      ['l1', blokData.l1.length],
      ['l2', blokData.l2.length],
      ['l3', blokData.l3.length],
      ['aset_audio', blokData.aset_audio.length]
    ];
    for (const [kunci, aktual] of cekAngka) {
      if (targetBlok[kunci] !== undefined && Number(targetBlok[kunci]) !== aktual) {
        throw new Error(`Jumlah ${kunci} pada ${idBlokDiharapkan} (${aktual}) tidak cocok dengan indeks.json (${targetBlok[kunci]}).`);
      }
    }
    if (targetBlok.wajib !== undefined && Boolean(blokData.wajib) !== Boolean(targetBlok.wajib)) {
      throw new Error(`Status wajib pada ${idBlokDiharapkan} tidak cocok dengan indeks.json.`);
    }
  }
  return blokData;
}

/**
 * Memuat dan memvalidasi konten/indeks.json
 */
export async function muatIndeksKonten(opsi = {}) {
  try {
    const data = await muatKontenJson(JALUR_INDEKS, { paksa: Boolean(opsi.paksa) });
    return validasiIndeksKonten(data);
  } catch (err) {
    hapusCacheKonten(JALUR_INDEKS);
    jalankanPengalihanS91(opsi, err.message || String(err));
    if (opsi.lemparGalat) throw err;
    return null;
  }
}

/**
 * Memuat dan memvalidasi satu berkas blok (FR-080)
 */
export async function muatBlokKonten(idBlok, opsi = {}) {
  const unitHint = opsi.unit || (String(idBlok || '').match(/^U[1-6]/i) || ['U1'])[0];
  const idNormal = normalkanIdBlok(idBlok, unitHint);
  let jalur = '';
  try {
    const indeks = await muatIndeksKonten({ paksa: Boolean(opsi.paksa), lemparGalat: true });
    const unitInfo = indeks.unit.find((u) => Array.isArray(u.blok) && u.blok.includes(idNormal));
    if (!unitInfo) {
      throw new Error(`Blok ${idNormal} belum tersedia di indeks.json.`);
    }
    const jalurRel = (unitInfo.berkas_blok && unitInfo.berkas_blok[idNormal]) ||
      `${unitInfo.id.toLowerCase()}/blok-${idNormal.slice(-1).toLowerCase()}.json`;
    jalur = jalurKonten(jalurRel);
    const blokData = await muatKontenJson(jalur, { paksa: Boolean(opsi.paksa) });
    return validasiBlokTerhadapIndeks(blokData, indeks, idNormal);
  } catch (err) {
    if (jalur) hapusCacheKonten(jalur);
    jalankanPengalihanS91({ ...opsi, blok: idNormal, unit: unitHint }, err.message || String(err));
    if (opsi.lemparGalat) throw err;
    return null;
  }
}

/**
 * Memuat dan memvalidasi muhimmah.json suatu unit
 */
export async function muatMuhimmahUnit(idUnit, opsi = {}) {
  const unitNormal = normalkanIdUnit(idUnit);
  let jalur = '';
  try {
    const indeks = await muatIndeksKonten({ paksa: Boolean(opsi.paksa), lemparGalat: true });
    const unitInfo = indeks.unit.find((u) => normalkanIdUnit(u.id) === unitNormal);
    if (!unitInfo || !unitInfo.muhimmah) {
      throw new Error(`Berkas muhimmah untuk ${unitNormal} belum terdaftar di indeks.json.`);
    }
    jalur = jalurKonten(unitInfo.muhimmah);
    const data = await muatKontenJson(jalur, { paksa: Boolean(opsi.paksa) });
    if (!data || normalkanIdUnit(data.unit) !== unitNormal) {
      throw new Error(`Unit pada ${jalur} tidak cocok dengan ${unitNormal}.`);
    }
    if (!data.sesi3 || !Array.isArray(data.sesi3.rangkaian) || data.sesi3.rangkaian.length === 0) {
      throw new Error(`Rangkaian Sesi 3 pada ${jalur} kosong.`);
    }
    if (!Array.isArray(data.langkah) || data.langkah.length === 0 || !Array.isArray(data.skrip_guru) || data.skrip_guru.length === 0) {
      throw new Error(`Langkah atau skrip guru pada ${jalur} tidak lengkap.`);
    }
    return data;
  } catch (err) {
    if (jalur) hapusCacheKonten(jalur);
    jalankanPengalihanS91({ ...opsi, unit: unitNormal }, err.message || String(err));
    if (opsi.lemparGalat) throw err;
    return null;
  }
}

/**
 * Memuat dan memvalidasi seluruh blok & muhimmah satu unit terhadap indeks.json
 */
export async function muatUnitLengkap(idUnit, opsi = {}) {
  const unitNormal = normalkanIdUnit(idUnit);
  try {
    const indeks = await muatIndeksKonten({ paksa: Boolean(opsi.paksa), lemparGalat: true });
    const unitInfo = indeks.unit.find((u) => normalkanIdUnit(u.id) === unitNormal);
    if (!unitInfo) {
      throw new Error(`Unit ${unitNormal} tidak terdaftar di indeks.json.`);
    }

    const daftarBlok = await Promise.all(
      unitInfo.blok.map((idB) => muatBlokKonten(idB, { paksa: Boolean(opsi.paksa), lemparGalat: true }))
    );
    const muhimmah = await muatMuhimmahUnit(unitNormal, { paksa: Boolean(opsi.paksa), lemparGalat: true });

    const idUnikUnit = new Set();
    const kartuL3Unit = new Set();
    const petaBlok = {};
    const hitung = { blok: 0, pasangan: 0, dialog: 0, l1: 0, l2: 0, l3: 0, aset_audio: 0 };

    for (const b of daftarBlok) {
      petaBlok[b.id] = b;
      hitung.blok += 1;
      hitung.pasangan += b.pasangan.length;
      hitung.dialog += b.dialog.length;
      hitung.l1 += b.l1.length;
      hitung.l2 += b.l2.length;
      hitung.l3 += b.l3.length;
      hitung.aset_audio += b.aset_audio.length;

      kumpulkanIdUnik(b.pasangan, `${b.id}.pasangan`, idUnikUnit);
      kumpulkanIdUnik(b.dialog, `${b.id}.dialog`, idUnikUnit);
      kumpulkanIdUnik(b.l1, `${b.id}.l1`, idUnikUnit);
      kumpulkanIdUnik(b.l2, `${b.id}.l2`, idUnikUnit);
      kumpulkanIdUnik(b.l3, `${b.id}.l3`, idUnikUnit);
      kumpulkanIdUnik(b.aset_audio, `${b.id}.aset_audio`, idUnikUnit);
      b.l3.forEach((k) => kartuL3Unit.add(k.id));
    }

    for (const itemRangkaian of muhimmah.sesi3.rangkaian) {
      const daftarIdKartu = Array.isArray(itemRangkaian.opsi_kartu) && itemRangkaian.opsi_kartu.length > 0
        ? itemRangkaian.opsi_kartu
        : [itemRangkaian.id_kartu];
      for (const idK of daftarIdKartu) {
        if (!kartuL3Unit.has(idK)) {
          throw new Error(`Kartu Sesi 3 "${idK}" tidak ditemukan di blok ${unitNormal}.`);
        }
      }
    }

    if (unitInfo.ringkasan) {
      for (const kunci of ['blok', 'pasangan', 'dialog', 'l1', 'l2', 'l3', 'aset_audio']) {
        if (unitInfo.ringkasan[kunci] !== undefined && Number(unitInfo.ringkasan[kunci]) !== hitung[kunci]) {
          throw new Error(`Total ${kunci} ${unitNormal} (${hitung[kunci]}) tidak cocok dengan indeks.json (${unitInfo.ringkasan[kunci]}).`);
        }
      }
    }

    return { indeks, unit: unitInfo, blok: petaBlok, daftarBlok, muhimmah, ringkasanAktual: hitung };
  } catch (err) {
    jalankanPengalihanS91({ ...opsi, unit: unitNormal }, err.message || String(err));
    if (opsi.lemparGalat) throw err;
    return null;
  }
}

/**
 * Memuat dan memvalidasi kelima berkas di konten/umum/
 */
export async function muatBerkasUmum(opsi = {}) {
  const daftarJalur = {
    teksUi: 'konten/umum/teks-ui.json',
    parameter: 'konten/umum/parameter.json',
    tesBaca: 'konten/umum/tes-baca.json',
    penyelamat: 'konten/umum/penyelamat.json',
    akuBisa: 'konten/umum/aku-bisa.json'
  };
  try {
    const [teksUi, parameter, tesBaca, penyelamat, akuBisa] = await Promise.all([
      muatKontenJson(daftarJalur.teksUi, { paksa: Boolean(opsi.paksa) }),
      muatKontenJson(daftarJalur.parameter, { paksa: Boolean(opsi.paksa) }),
      muatKontenJson(daftarJalur.tesBaca, { paksa: Boolean(opsi.paksa) }),
      muatKontenJson(daftarJalur.penyelamat, { paksa: Boolean(opsi.paksa) }),
      muatKontenJson(daftarJalur.akuBisa, { paksa: Boolean(opsi.paksa) })
    ]);

    if (!teksUi || !teksUi['S-01'] || !teksUi['S-91']) {
      throw new Error('Berkas teks-ui.json tidak lengkap.');
    }
    if (!parameter || !parameter.deteksi_kata_kunci || !parameter.perekaman) {
      throw new Error('Berkas parameter.json tidak lengkap.');
    }
    if (!tesBaca || !Array.isArray(tesBaca.butir) || tesBaca.butir.length !== 12) {
      throw new Error('Berkas tes-baca.json harus berisi 12 butir.');
    }
    if (!penyelamat || !Array.isArray(penyelamat.kalimat) || penyelamat.kalimat.length !== 4) {
      throw new Error('Berkas penyelamat.json harus berisi 4 kalimat.');
    }
    if (!akuBisa || !Array.isArray(akuBisa.daftar) || akuBisa.daftar.length !== 30 || Number(akuBisa.penyebut_wajib) !== 29) {
      throw new Error('Berkas aku-bisa.json harus berisi 30 pernyataan dengan penyebut 29.');
    }

    return { teksUi, parameter, tesBaca, penyelamat, akuBisa };
  } catch (err) {
    Object.values(daftarJalur).forEach((j) => hapusCacheKonten(j));
    jalankanPengalihanS91(opsi, err.message || String(err));
    if (opsi.lemparGalat) throw err;
    return null;
  }
}

/**
 * Mengambil blok dari cache memori bila sudah dimuat sebelumnya
 */
export function ambilBlokDariCache(idBlok, idUnit = 'U1') {
  const idNormal = normalkanIdBlok(idBlok, idUnit);
  const cache = ambilState().cache_konten || {};
  const indeks = cache[JALUR_INDEKS];
  if (!indeks || !Array.isArray(indeks.unit)) return null;
  const unitInfo = indeks.unit.find((u) => Array.isArray(u.blok) && u.blok.includes(idNormal));
  if (!unitInfo) return null;
  const jalurRel = (unitInfo.berkas_blok && unitInfo.berkas_blok[idNormal]) ||
    `${unitInfo.id.toLowerCase()}/blok-${idNormal.slice(-1).toLowerCase()}.json`;
  return cache[jalurKonten(jalurRel)] || null;
}

/**
 * Mengambil muhimmah unit dari cache memori bila sudah dimuat sebelumnya
 */
export function ambilMuhimmahDariCache(idUnit = 'U1') {
  const unitNormal = normalkanIdUnit(idUnit);
  const cache = ambilState().cache_konten || {};
  const indeks = cache[JALUR_INDEKS];
  if (!indeks || !Array.isArray(indeks.unit)) return null;
  const unitInfo = indeks.unit.find((u) => normalkanIdUnit(u.id) === unitNormal);
  if (!unitInfo || !unitInfo.muhimmah) return null;
  return cache[jalurKonten(unitInfo.muhimmah)] || null;
}
