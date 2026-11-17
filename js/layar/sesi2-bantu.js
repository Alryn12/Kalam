/**
 * Pembantu Layar Sesi 2: Konteks, Kemajuan Lokal, Aku Bisa Monoton, & Komponen (situs/js/layar/sesi2-bantu.js)
 * Tugas M1-I: TB-M1-09 & TB-M1-10
 * Acuan: KEPUTUSAN.md SL-BARU-02, SL-BARU-03, SL-BARU-10; SRS-3 FR-019..026, FR-075, FR-083;
 *        BP-1 S-30..S-37; BP-4 R-12..R-28; BP-5 K-10..K-18, K-35, K-40..K-43; docs/DESAIN.md
 */

import {
  ambilRekamanLatihan,
  ambilSesi,
  simpanRekamanLatihan,
  simpanSesi,
  tambahAntrean
} from '../antrean.js';
import { panggilApi } from '../api.js';
import { hentikanAudioModel, putarDaftarAudioModel } from '../audio-model.js';
import {
  muatBlokKonten,
  normalkanIdBlok,
  normalkanIdUnit
} from '../pemuat-konten.js';
import {
  buatPerekamLatihan,
  evaluasiHasilRekamLatihan
} from '../rekam.js';
import { arahKe } from '../router.js';
import {
  ambilState,
  ambilTeks,
  buatIdIdempoten,
  muatKontenJson,
  perbaruiStatusServer
} from '../state.js';
import {
  buatPengelolaModeMandiri,
  cekDukunganPengenalanSuara,
  ekstrakKataWajibDariTeks,
  evaluasiDeteksiItem,
  renderKotakModeMandiri
} from '../suara.js';
import {
  apakahBlokPunyaVarianGender,
  folderAudioUnit,
  nomorUnitDariId,
  pilihBentukAudio,
  pilihBentukTeks,
  ratakanBentukTeks
} from './sesi1-bantu.js';
import { KATALOG_UNIT_KALAM } from './s02-beranda.js';
import {
  ambilKalibrasiLatar,
  catatKendalaTeknis,
  escapeHtml,
  kirimAtauAntre,
  siapkanWadahLayar,
  waktuIsoWib
} from './tahap0-bantu.js';

export {
  buatPerekamLatihan,
  evaluasiDeteksiItem,
  evaluasiHasilRekamLatihan,
  folderAudioUnit,
  nomorUnitDariId,
  pilihBentukAudio,
  pilihBentukTeks,
  ratakanBentukTeks,
  renderKotakModeMandiri
};

export const IKON_ADEGAN_SVG =
  '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
  '<rect x="3" y="4" width="18" height="14" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/>' +
  '<path d="M21 15l-4.5-4.5L10 17"/></svg>';

function kunciKemajuanSesi2(kodeSiswa, blokId) {
  return `sesi2_${kodeSiswa || 'tamu'}_${blokId}`;
}

function kunciAkuBisaLokal(kodeSiswa) {
  return `aku_bisa_lokal_${kodeSiswa || 'tamu'}`;
}

function cekVarianObjek(nilai) {
  return Boolean(nilai && typeof nilai === 'object' && !Array.isArray(nilai) && ('putra' in nilai || 'putri' in nilai));
}

export function apakahBlokSesi2PunyaVarianGender(blokData) {
  if (apakahBlokPunyaVarianGender(blokData)) return true;
  const cekItem = (daftar) => (Array.isArray(daftar) ? daftar : []);
  if (cekItem(blokData && blokData.l1).some((it) => cekVarianObjek(it.arab) || cekVarianObjek(it.audio))) return true;
  if (cekItem(blokData && blokData.l2).some((it) =>
    cekVarianObjek(it.audio_prompt) ||
    cekVarianObjek(it.model && it.model.arab) ||
    cekVarianObjek(it.model && it.model.audio) ||
    it.bentuk_ikut === 'ikon_teman' ||
    it.bentuk_ikut === 'bentuk_sapaan_guru'
  )) return true;
  return cekItem(blokData && blokData.l3).some((k) =>
    cekVarianObjek(k.slot1 && k.slot1.model) ||
    cekVarianObjek(k.slot1 && k.slot1.audio) ||
    cekVarianObjek(k.slot2 && k.slot2.model) ||
    cekVarianObjek(k.slot2 && k.slot2.audio) ||
    k.pilih_satu === 'teman' ||
    (Array.isArray(k.giliran) && k.giliran.some((g) => cekVarianObjek(g.kalimat_model_arab) || cekVarianObjek(g.audio_pemicu)))
  );
}

function buatStateLevelBawaan() {
  return {
    indeksAktif: 0,
    itemSelesai: {},
    ulangAktif: false,
    selesaiUlang: {},
    modeMandiri: false
  };
}

export async function ambilKemajuanSesi2(kodeSiswa, blokId) {
  const st = ambilState().status_server || {};
  const bentukKonfig = (st.konfig_publik && st.konfig_publik.bentuk_sapaan_guru) || 'putra';
  let bentukAwal = bentukKonfig === 'putri' ? 'putri' : 'putra';

  const tersimpanS1 = await ambilSesi(`sesi1_${kodeSiswa || 'tamu'}_${blokId}`).catch(() => null);
  if (tersimpanS1 && (tersimpanS1.bentukLawan === 'putra' || tersimpanS1.bentukLawan === 'putri')) {
    bentukAwal = tersimpanS1.bentukLawan;
  }

  const bawaan = {
    pemanasanSelesai: false,
    s12Sesi2Sudah: false,
    bentukLawan: bentukAwal,
    konflikSpeechPermanen: false,
    level: {
      1: buatStateLevelBawaan(),
      2: buatStateLevelBawaan(),
      3: buatStateLevelBawaan()
    }
  };

  const tersimpan = await ambilSesi(kunciKemajuanSesi2(kodeSiswa, blokId));
  if (!tersimpan || typeof tersimpan !== 'object') return bawaan;

  const levelTersimpan = tersimpan.level || {};
  return {
    ...bawaan,
    ...tersimpan,
    bentukLawan: tersimpan.bentukLawan === 'putri' ? 'putri' : (tersimpan.bentukLawan === 'putra' ? 'putra' : bentukAwal),
    level: {
      1: { ...buatStateLevelBawaan(), ...(levelTersimpan[1] || {}) },
      2: { ...buatStateLevelBawaan(), ...(levelTersimpan[2] || {}) },
      3: { ...buatStateLevelBawaan(), ...(levelTersimpan[3] || {}) }
    }
  };
}

export async function simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan) {
  await simpanSesi(kunciKemajuanSesi2(kodeSiswa, blokId), kemajuan);
}

/**
 * Menentukan indeks item yang sedang aktif sesuai K-35 (lanjut item pertama yang belum dikerjakan)
 * dan K-41 (mulai ulang dari awal bila ulang=1).
 */
export function tentukanIndeksLanjutLevel(daftarItem, levelState, param = {}) {
  const daftar = Array.isArray(daftarItem) ? daftarItem : [];
  if (daftar.length === 0) return 0;

  if (param && String(param.ulang || '') === '1') {
    levelState.ulangAktif = true;
    levelState.selesaiUlang = {};
    levelState.indeksAktif = 0;
    return 0;
  }

  if (param && param.item !== undefined && param.item !== '') {
    const asNum = Number(param.item);
    if (!Number.isNaN(asNum) && Number.isInteger(asNum) && asNum >= 0 && asNum < daftar.length) {
      levelState.indeksAktif = asNum;
      return asNum;
    }
    const idxId = daftar.findIndex((it) => it.id === param.item);
    if (idxId >= 0) {
      levelState.indeksAktif = idxId;
      return idxId;
    }
  }

  const petaSelesai = levelState.ulangAktif ? (levelState.selesaiUlang || {}) : (levelState.itemSelesai || {});
  const idxBelum = daftar.findIndex((it) => !petaSelesai[it.id] || !petaSelesai[it.id].selesai);
  if (idxBelum >= 0) {
    levelState.indeksAktif = idxBelum;
    return idxBelum;
  }

  const idxSimpan = Number(levelState.indeksAktif || 0);
  return idxSimpan >= 0 && idxSimpan < daftar.length ? idxSimpan : 0;
}

export function tandaiItemSelesaiLevel(levelState, idItem, ringkasan = {}) {
  if (!levelState.itemSelesai || typeof levelState.itemSelesai !== 'object') {
    levelState.itemSelesai = {};
  }
  const entri = {
    selesai: true,
    waktu: Date.now(),
    ...ringkasan
  };
  levelState.itemSelesai[idItem] = entri;
  if (levelState.ulangAktif) {
    if (!levelState.selesaiUlang || typeof levelState.selesaiUlang !== 'object') {
      levelState.selesaiUlang = {};
    }
    levelState.selesaiUlang[idItem] = entri;
  }
}

export function hitungKemajuanLevel(daftarItem, levelState) {
  const daftar = Array.isArray(daftarItem) ? daftarItem : [];
  const peta = (levelState && levelState.itemSelesai) || {};
  let dikerjakan = 0;
  for (const it of daftar) {
    if (peta[it.id] && peta[it.id].selesai) dikerjakan += 1;
  }
  return {
    dikerjakan,
    total: daftar.length
  };
}

/**
 * Mengambil dan menyimpan status Aku Bisa lokal di IndexedDB (SL-BARU-02 & SL-BARU-03)
 */
export async function ambilAkuBisaLokal(kodeSiswa) {
  const data = await ambilSesi(kunciAkuBisaLokal(kodeSiswa)).catch(() => null);
  return data && typeof data === 'object' ? data : {};
}

export async function simpanAkuBisaLokal(kodeSiswa, petaAkuBisa) {
  await simpanSesi(kunciAkuBisaLokal(kodeSiswa), petaAkuBisa || {});
}

function apakahHasilTerpenuhiKunciMesin(hasilStr) {
  return hasilStr === 'terdeteksi' || hasilStr === 'mandiri_ya';
}

export async function perbaruiAkuBisaLokalBlok(kodeSiswa, blokData, kemajuan, serverBaris = null) {
  if (!blokData || !blokData.id) return null;
  const blokId = blokData.id;
  const semua = await ambilAkuBisaLokal(kodeSiswa);
  const lama = semua[blokId] || {};

  const daftarL3 = Array.isArray(blokData.l3) ? blokData.l3 : [];
  const level3State = (kemajuan && kemajuan.level && kemajuan.level[3]) || {};
  const petaL3 = level3State.itemSelesai || {};

  let kKartu = daftarL3.length;
  let kartuTerdeteksi = 0;
  let kartuDicoba = 0;
  let pakaiMandiri = false;

  if (kKartu > 0) {
    for (const kartu of daftarL3) {
      const cat = petaL3[kartu.id];
      if (!cat || !cat.selesai) continue;
      kartuDicoba += 1;
      if (cat.dilewatiKeadaan) {
        kartuTerdeteksi += 1;
        continue;
      }
      const s1Ok = apakahHasilTerpenuhiKunciMesin(cat.slot1 && cat.slot1.hasil);
      const s2Ok = apakahHasilTerpenuhiKunciMesin(cat.slot2 && cat.slot2.hasil);
      if ((cat.slot1 && cat.slot1.hasil === 'mandiri_ya') || (cat.slot2 && cat.slot2.hasil === 'mandiri_ya')) {
        pakaiMandiri = true;
      }
      if (s1Ok && s2Ok) {
        kartuTerdeteksi += 1;
      }
    }
  } else {
    // K-43: Blok tanpa kartu Level 3 memakai hasil Level 2 terbaru
    const daftarL2 = Array.isArray(blokData.l2) ? blokData.l2 : [];
    const petaL2 = (kemajuan && kemajuan.level && kemajuan.level[2] && kemajuan.level[2].itemSelesai) || {};
    kKartu = daftarL2.length;
    for (const it of daftarL2) {
      const cat = petaL2[it.id];
      if (!cat || !cat.selesai) continue;
      kartuDicoba += 1;
      if (cat.dilewatiKeadaan || apakahHasilTerpenuhiKunciMesin(cat.hasil)) {
        kartuTerdeteksi += 1;
        if (cat.hasil === 'mandiri_ya') pakaiMandiri = true;
      }
    }
  }

  const syaratMinimal = kKartu > 0 ? Math.max(1, Math.ceil(kKartu / 2)) : 0;
  const kunciMesinHitung = kKartu > 0 && kartuDicoba >= 1 && kartuTerdeteksi >= syaratMinimal ? 1 : 0;

  const srvMesin = serverBaris && Number(serverBaris.kunci_mesin || 0) === 1 ? 1 : 0;
  const srvGuru = serverBaris && Number(serverBaris.kunci_guru || 0) === 1 ? 1 : 0;
  const srvCentang = serverBaris && Number(serverBaris.tercentang || 0) === 1 ? 1 : 0;

  // SL-BARU-03: Monoton naik — sekali 1, tetap 1
  const kunciMesin = Number(lama.kunci_mesin || 0) === 1 || kunciMesinHitung === 1 || srvMesin === 1 || srvCentang === 1 ? 1 : 0;
  const kunciGuru = Number(lama.kunci_guru || 0) === 1 || srvGuru === 1 || srvCentang === 1 ? 1 : 0;
  const tercentang = Number(lama.tercentang || 0) === 1 || srvCentang === 1 || (kunciMesin === 1 && kunciGuru === 1) ? 1 : 0;

  let statusKunci = 'belum';
  if (tercentang === 1) statusKunci = 'penuh';
  else if (kunciMesin === 1 || kunciGuru === 1) statusKunci = 'setengah';

  const kartuTerdeteksiFinal = (Number(lama.kunci_mesin || 0) === 1 || Number(lama.tercentang || 0) === 1)
    ? Math.max(Number(lama.kartu_terdeteksi || 0), kartuTerdeteksi)
    : kartuTerdeteksi;

  const baru = {
    id_pernyataan: (blokData.aku_bisa && blokData.aku_bisa.id) || `AB-${blokId}`,
    unit: nomorUnitDariId(blokData.unit),
    blok: blokId,
    teks: (blokData.aku_bisa && blokData.aku_bisa.teks) || '',
    wajib: blokData.wajib !== false,
    k_kartu: kKartu,
    kartu_terdeteksi: kartuTerdeteksiFinal,
    kunci_mesin: kunciMesin,
    sumber_mesin: pakaiMandiri ? 'penilaian_mandiri' : (lama.sumber_mesin || 'deteksi'),
    kunci_guru: kunciGuru,
    tercentang,
    status_kunci: statusKunci,
    waktu_tercentang: lama.waktu_tercentang || (tercentang === 1 ? waktuIsoWib() : ''),
    diperbarui: waktuIsoWib()
  };

  semua[blokId] = baru;
  await simpanAkuBisaLokal(kodeSiswa, semua);
  return baru;
}

/**
 * Menyiapkan konteks layar Sesi 2 (S-30..S-37): validasi buka-kunci, muat konten, kemajuan, dan pembersih hashchange.
 */
export async function siapkanKonteksSesi2(idLayar, param = {}, opsi = {}) {
  hentikanAudioModel();
  const state = ambilState();
  const unitId = normalkanIdUnit((param && param.unit) || state.unit_aktif || 'U1');
  const blokId = normalkanIdBlok((param && param.blok) || state.blok_aktif || `${unitId}-BA`, unitId);

  state.unit_aktif = unitId;
  state.blok_aktif = blokId;

  const st = state.status_server;
  let levelTerbukaMaks = 1;
  if (st && typeof st === 'object') {
    const daftarBlokTerbuka = Array.isArray(st.blok_terbuka) ? st.blok_terbuka : null;
    const daftarSelesai = Array.isArray(st.blok_selesai) ? st.blok_selesai : [];
    const daftarS1 = Array.isArray(st.blok_sesi1_selesai)
      ? st.blok_sesi1_selesai
      : (Array.isArray(st.sesi1_selesai) ? st.sesi1_selesai : []);
    const levelMap = st.level_terbuka && typeof st.level_terbuka === 'object' ? st.level_terbuka : {};

    const blokDiizinkan = !daftarBlokTerbuka || daftarBlokTerbuka.includes(blokId) || daftarSelesai.includes(blokId);
    const sesi2Terbuka = daftarS1.includes(blokId) || daftarSelesai.includes(blokId) || Number(levelMap[blokId] || 0) >= 1;

    if (!blokDiizinkan || !sesi2Terbuka) {
      arahKe('S-91', { jenis: 'belum_terbuka', asal: 'S-03', unit: unitId });
      return null;
    }

    levelTerbukaMaks = Math.max(
      Number(levelMap[blokId] || 0),
      daftarSelesai.includes(blokId) ? 3 : 1
    );

    const minLevel = Number(opsi.minLevel || 1);
    if (levelTerbukaMaks < minLevel) {
      arahKe('S-91', { jenis: 'belum_terbuka', asal: 'S-03', unit: unitId, blok: blokId });
      return null;
    }
  }

  const blokData = await muatBlokKonten(blokId, {
    arahkanKeS91: true,
    asal: 'S-03',
    tujuan: idLayar,
    unit: unitId
  });
  if (!blokData) return null;

  const kodeSiswa = state.kode_siswa || 'tamu';
  const kemajuan = await ambilKemajuanSesi2(kodeSiswa, blokId);
  const paramUmum = await muatKontenJson('konten/umum/parameter.json').catch(() => ({}));
  const kalibrasiLatar = await ambilKalibrasiLatar();

  const namaLayar = ambilTeks(idLayar, 'judul') || idLayar;
  const wadah = siapkanWadahLayar(idLayar, `${blokData.judul_id} — ${namaLayar}`);
  if (!wadah) return null;

  let aktif = true;
  const daftarPembersih = [];
  window.addEventListener('hashchange', () => {
    aktif = false;
    hentikanAudioModel();
    daftarPembersih.forEach((fn) => {
      try { fn(); } catch (_) {}
    });
  }, { once: true });

  return {
    state,
    kodeSiswa,
    unitId,
    blokId,
    blokData,
    kemajuan,
    paramUmum,
    kalibrasiLatar,
    levelTerbukaMaks,
    wadah,
    masihAktif: () => aktif,
    saatKeluar: (fn) => {
      if (typeof fn === 'function') daftarPembersih.push(fn);
    }
  };
}

/**
 * Membuat pengelola mode penilaian mandiri yang tersinkron dengan dukungan_pengenalan_suara & K-10/K-11/K-12.
 */
export function buatPengelolaMandiriSesi2(konteks, levelNo, idLayar) {
  const { state, kodeSiswa, blokId, kemajuan } = konteks;
  const st = state.status_server || {};
  const levelState = kemajuan.level[levelNo] || buatStateLevelBawaan();

  let dukunganOverride;
  if (st.dukungan_pengenalan_suara !== undefined && st.dukungan_pengenalan_suara !== '') {
    dukunganOverride = Number(st.dukungan_pengenalan_suara) === 1 ? 1 : 0;
  }
  if (Number(st.mode_penilaian_mandiri || 0) === 1) {
    dukunganOverride = 0;
  }

  const cekBrowser = cekDukunganPengenalanSuara();
  const dukunganFinal = dukunganOverride === 0 ? 0 : cekBrowser.dukungan_pengenalan_suara;
  const paksa = Boolean(levelState.modeMandiri || kemajuan.konflikSpeechPermanen);

  return buatPengelolaModeMandiri({
    dukunganPengenalanSuara: dukunganFinal,
    paksaMandiri: paksa,
    alasanAwal: kemajuan.konflikSpeechPermanen
      ? 'konflik_rekam_speech'
      : (levelState.modeMandiri ? 'hasil_kosong_2x' : (dukunganFinal === 0 ? 'tanpa_dukungan_speech' : null)),
    onKendala: ({ jenis_kendala }) => {
      catatKendalaTeknis(jenis_kendala, idLayar);
      if (jenis_kendala === 'konflik_rekam_pengenalan_suara') {
        kemajuan.konflikSpeechPermanen = true;
      }
      levelState.modeMandiri = true;
      simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan).catch(() => {});
    },
    onPerubahanMode: () => {
      levelState.modeMandiri = true;
      simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan).catch(() => {});
    }
  });
}

/**
 * Merender tangga level 1-4 sesuai docs/DESAIN.md & BP-6 (S-31.nama_tangga)
 */
export function renderTanggaLevel(levelAktif, levelTerbukaMaks = 1) {
  const mentah = ambilTeks('S-31', 'nama_tangga') ||
    'Level 1 Ikut · Level 2 Dengar-Balas · Level 3 Kunci · Level 4 Bersama guru';
  const daftarNama = mentah.split('·').map((s) => s.trim()).filter(Boolean);
  const cadangan = ['Level 1 Ikut', 'Level 2 Dengar-Balas', 'Level 3 Kunci', 'Level 4 Bersama guru'];
  const terbuka = Math.max(1, Math.min(3, Number(levelTerbukaMaks || 1)));

  const butirHtml = [1, 2, 3, 4].map((lv, idx) => {
    const label = daftarNama[idx] || cadangan[idx];
    const aktif = lv === Number(levelAktif);
    const terkunci = lv === 4 || lv > terbuka;
    const selesai = !aktif && !terkunci && lv < Number(levelAktif);

    let kelas = 'butir-tangga';
    if (aktif) kelas += ' butir-tangga--aktif';
    else if (selesai) kelas += ' butir-tangga--selesai';

    const ikon = terkunci
      ? '<span aria-hidden="true">&#128274;</span>'
      : (selesai ? '<span aria-hidden="true">&#10003;</span>' : '');

    return `
      <li class="${kelas}" ${aktif ? 'aria-current="step"' : ''}>
        ${ikon}
        <span>${escapeHtml(label)}</span>
      </li>
    `;
  }).join('');

  return `<ol class="tangga-level" aria-label="Tangga level">${butirHtml}</ol>`;
}

/**
 * Merender pita keterangan situasi (teks_bingkai_id) dan tombol ramah (lewati_keadaan) sesuai SL-BARU-10 Fitur 2
 */
export function renderBingkaiDanLewatiKeadaan(item, idPrefix = 'item') {
  if (!item || typeof item !== 'object') {
    return { bingkaiHtml: '', lewatiKeadaanHtml: '' };
  }
  const bingkaiHtml = item.teks_bingkai_id
    ? `<div class="pita-bingkai" role="note"><span>${escapeHtml(item.teks_bingkai_id)}</span></div>`
    : '';

  const lewatiAktif = Boolean(item.lewati_keadaan && item.lewati_keadaan.aktif);
  const labelLewati = (item.lewati_keadaan && item.lewati_keadaan.label_tombol_id) ||
    'Lewati, tidak sesuai keadaanku';
  const lewatiKeadaanHtml = lewatiAktif
    ? `
      <button
        type="button"
        id="${escapeHtml(idPrefix)}-lewati-keadaan"
        class="tombol tombol--sekunder"
        data-lewati-keadaan="${escapeHtml((item.lewati_keadaan && item.lewati_keadaan.alasan) || 'keadaan')}"
      >
        ${escapeHtml(labelLewati)}
      </button>
    `
    : '';

  return { bingkaiHtml, lewatiKeadaanHtml };
}

export function renderPemilihBentukLawan(blokData, bentukSaatIni, opsi = {}) {
  if (!opsi.paksaTampil && !apakahBlokSesi2PunyaVarianGender(blokData)) return '';
  const lblPa = opsi.labelPutra || ambilTeks('S-20', 'label_putra') || 'Bentuk putra';
  const lblPi = opsi.labelPutri || ambilTeks('S-20', 'label_putri') || 'Bentuk putri';
  return `
    <div class="baris-pilihan-kecil" role="group" aria-label="Pilih bentuk sapaan">
      <button type="button" class="tombol tombol--sekunder ${bentukSaatIni === 'putra' ? 'tombol--terpilih' : ''}" data-bentuk-s2="putra" aria-pressed="${bentukSaatIni === 'putra'}">${escapeHtml(lblPa)}</button>
      <button type="button" class="tombol tombol--sekunder ${bentukSaatIni === 'putri' ? 'tombol--terpilih' : ''}" data-bentuk-s2="putri" aria-pressed="${bentukSaatIni === 'putri'}">${escapeHtml(lblPi)}</button>
    </div>
  `;
}

export function renderKepalaSesi2(konteks, idLayar, opsi = {}) {
  const { blokData, kemajuan, levelTerbukaMaks } = konteks;
  const kembali = ambilTeks('S-30', 'tombol_kembali_unit') || ambilTeks('S-20', 'tombol_kembali_unit') || 'Kembali ke daftar blok';
  const judul = opsi.judul || ambilTeks(idLayar, 'judul') || idLayar;
  const tanggaHtml = opsi.levelAktif ? renderTanggaLevel(opsi.levelAktif, levelTerbukaMaks) : '';
  const pemilihHtml = opsi.tanpaPemilihBentuk ? '' : renderPemilihBentukLawan(blokData, kemajuan.bentukLawan, opsi);

  return `
    <section class="kartu" aria-labelledby="judul-layar-s2">
      <div class="daftar-status" style="justify-content: space-between; align-items: center;">
        <button type="button" id="tombol-kembali-s03" class="tautan-aksi" style="width: auto; padding-inline: 0; background: transparent; border: none; cursor: pointer;">
          &larr; ${escapeHtml(kembali)}
        </button>
        <span class="kartu-arab__label">${escapeHtml(blokData.id)}</span>
      </div>
      <div>
        <p class="teks-keterangan" style="margin: 0;">${escapeHtml(blokData.judul_id)}</p>
        <h1 id="judul-layar-s2" class="judul-layar" style="margin-bottom: 0;">${escapeHtml(judul)}</h1>
      </div>
      ${tanggaHtml}
      ${pemilihHtml}
    </section>
  `;
}

export function pasangNavigasiSesi2(konteks, padaUbahBentuk) {
  const { wadah, kodeSiswa, unitId, blokId, kemajuan } = konteks;
  const btnKembali = wadah.querySelector('#tombol-kembali-s03');
  if (btnKembali) {
    btnKembali.addEventListener('click', () => {
      hentikanAudioModel();
      arahKe('S-03', { unit: unitId });
    });
  }

  wadah.querySelectorAll('[data-bentuk-s2]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const nilaiBaru = btn.getAttribute('data-bentuk-s2');
      if (nilaiBaru === kemajuan.bentukLawan) return;
      kemajuan.bentukLawan = nilaiBaru;
      await simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan);
      if (typeof padaUbahBentuk === 'function') padaUbahBentuk(nilaiBaru);
    });
  });
}

export function normalisasiJenisItemL2(jenis) {
  const j = String(jenis || '').trim().toLowerCase();
  if (j === 'dengar-tanya' || j === 'tanya') return 'tanya';
  if (j === 'situasi') return 'situasi';
  return 'jawab';
}

/**
 * Menormalkan kartu Level 3 (baik standar satu_putaran maupun SL-BARU-10 Fitur 4 dua_putaran)
 */
export function normalisasiKartuL3(kartu) {
  if (!kartu || typeof kartu !== 'object') return null;
  const duaPutaran = kartu.pola_giliran === 'dua_putaran' && Array.isArray(kartu.giliran) && kartu.giliran.length >= 2;
  if (!duaPutaran) {
    return {
      ...kartu,
      duaPutaran: false,
      slot1: { ...(kartu.slot1 || {}), pemicuAudio: null, pemicuTeks: null, instruksiRekam: null },
      slot2: { ...(kartu.slot2 || {}), pemicuAudio: null, pemicuTeks: null, instruksiRekam: null }
    };
  }

  const buatSlot = (gil, cadangan) => {
    const model = (gil && gil.kalimat_model_arab) || (cadangan && cadangan.model) || '';
    const kataWajib = (gil && Array.isArray(gil.kata_wajib) && gil.kata_wajib.length > 0)
      ? gil.kata_wajib
      : (cadangan && Array.isArray(cadangan.kata_wajib) && cadangan.kata_wajib.length > 0
        ? cadangan.kata_wajib
        : ekstrakKataWajibDariTeks(pilihBentukTeks(model, 'putra')));
    const audio = (gil && gil.audio_model) || (cadangan && cadangan.audio) || (gil && gil.audio_pemicu) || null;
    return {
      model,
      kata_wajib: kataWajib,
      audio,
      pemicuAudio: (gil && gil.audio_pemicu) || null,
      pemicuTeks: (gil && gil.teks_pemicu_arab) || null,
      instruksiRekam: (gil && gil.instruksi_rekam_id) || null,
      peranAwal: (gil && gil.peran_awal) || null
    };
  };

  return {
    ...kartu,
    duaPutaran: true,
    slot1: buatSlot(kartu.giliran[0], kartu.slot1),
    slot2: buatSlot(kartu.giliran[1], kartu.slot2)
  };
}

export function renderPenandaHasilDeteksi({ hasil = '', percobaan = 0 } = {}) {
  if (!hasil) return '';
  const lblSukses = ambilTeks('S-31', 'hasil_sukses') || 'Terdeteksi ✓';
  const lblUlang = ambilTeks('S-31', 'hasil_ulang') || 'Coba lagi';
  const lblTersimpan = ambilTeks('S-31', 'label_tersimpan') || 'Tersimpan ✓';

  if (hasil === 'terdeteksi' || hasil === 'mandiri_ya') {
    return `
      <div class="daftar-status">
        <span class="penanda-status penanda-status--terdeteksi">
          <span class="penanda-status__ikon" aria-hidden="true">&#10003;</span>
          <span>${escapeHtml(lblSukses)}</span>
        </span>
      </div>
    `;
  }
  if (hasil === 'tersimpan' || hasil === 'mandiri_belum' || hasil === 'dilewati_teknis') {
    return `
      <div class="daftar-status">
        <span class="penanda-status penanda-status--terkirim">
          <span class="penanda-status__ikon" aria-hidden="true">&#10003;</span>
          <span>${escapeHtml(lblTersimpan)}</span>
        </span>
      </div>
    `;
  }
  if (hasil === 'coba_lagi' || (hasil === 'tidak' && percobaan < 3)) {
    return `
      <div class="daftar-status">
        <span class="penanda-status penanda-status--coba-lagi">
          <span class="penanda-status__ikon" aria-hidden="true">&#8635;</span>
          <span>${escapeHtml(lblUlang)}</span>
        </span>
      </div>
    `;
  }
  return '';
}

export function renderKotakRekamSesi2({
  statusRekam = 'siap',
  sudahRekam = false,
  bolehRekam = true,
  pesanStatus = '',
  idPrefix = 's2'
} = {}) {
  const lblRekam = statusRekam === 'merekam'
    ? (ambilTeks('S-31', 'tombol_berhenti') || 'Berhenti')
    : (ambilTeks('S-31', 'tombol_rekam') || 'Rekam');
  const lblSuaraku = ambilTeks('S-31', 'tombol_dengar_suaraku') || 'Dengar suaraku';

  const statusTeks = statusRekam === 'merekam'
    ? (ambilTeks('S-31', 'status_merekam') || 'Sedang merekam… silakan berbicara.')
    : (statusRekam === 'tersimpan'
      ? (ambilTeks('S-31', 'status_tersimpan') || 'Rekaman tersimpan ✓')
      : (ambilTeks('S-31', 'status_siap') || 'Siap merekam (maksimal 15 detik).'));

  const kelasTombolRekam = statusRekam === 'merekam'
    ? 'tombol-rekam--merekam'
    : (bolehRekam ? 'tombol-rekam--siap' : 'tombol--nonaktif');

  return `
    <div class="kotak-rekam kotak-rekam--${escapeHtml(statusRekam)}" aria-live="polite">
      ${statusRekam === 'merekam'
        ? '<div class="indikator-gelombang" aria-hidden="true"><span class="titik-gelombang"></span><span class="titik-gelombang"></span><span class="titik-gelombang"></span></div>'
        : ''}
      <p class="${statusRekam === 'tersimpan' ? 'label-rekam-tersimpan' : 'teks-keterangan'}" style="margin: 0;">
        ${escapeHtml(statusTeks)}
      </p>
      ${pesanStatus ? `<div class="pesan-hangat" style="width: 100%; text-align: left;"><p class="pesan-hangat__isi">${escapeHtml(pesanStatus)}</p></div>` : ''}
      <button
        type="button"
        id="${escapeHtml(idPrefix)}-tombol-rekam"
        class="tombol ${kelasTombolRekam}"
        ${bolehRekam || statusRekam === 'merekam' ? '' : 'disabled aria-disabled="true"'}
      >
        ${statusRekam === 'merekam' ? '<span aria-hidden="true">&#9632;</span>' : '<span aria-hidden="true">&#9679;</span>'}
        <span>${escapeHtml(lblRekam)}</span>
      </button>
      ${sudahRekam && statusRekam !== 'merekam' ? `
        <button type="button" id="${escapeHtml(idPrefix)}-tombol-dengar-suaraku" class="tombol tombol--sekunder">
          ${escapeHtml(lblSuaraku)}
        </button>
      ` : ''}
    </div>
  `;
}

/**
 * Memutar audio model dan memeriksa kendala muat (K-18)
 */
export async function putarAudioModelSesi2(daftarAudio, unitId, laju = 1) {
  const folder = folderAudioUnit(unitId);
  const daftar = (Array.isArray(daftarAudio) ? daftarAudio : [daftarAudio]).filter(Boolean);
  if (daftar.length === 0) {
    return { status: 'kosong', kendalaOffline: false };
  }
  try {
    const hasil = await putarDaftarAudioModel(daftar, folder, { kecepatan: laju });
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return {
      status: hasil.status,
      kendalaOffline: hasil.status === 'penanda' && offline
    };
  } catch (err) {
    console.info('[Log Teknis Kalām] Kendala putar audio model:', err);
    return { status: 'kendala', kendalaOffline: true };
  }
}

export async function simpanRekamanLokalTerakhir(kunci, blob, meta = {}) {
  await simpanRekamanLatihan(kunci, {
    blob,
    mime: meta.mime || 'audio/webm',
    durasi: meta.durasi || 0,
    durasi_bicara: meta.durasi_bicara || 0,
    waktu_mulai_bicara: meta.waktu_mulai_bicara ?? null,
    waktu: Date.now()
  });
}

export function buatPemutarRekamanLokal() {
  let audioAktif = null;
  let urlAktif = '';

  function hentikan() {
    if (audioAktif) {
      try {
        audioAktif.pause();
        audioAktif.currentTime = 0;
      } catch (_) {}
      audioAktif = null;
    }
    if (urlAktif) {
      try { URL.revokeObjectURL(urlAktif); } catch (_) {}
      urlAktif = '';
    }
  }

  async function putar(kunci) {
    hentikanAudioModel();
    hentikan();
    const rek = await ambilRekamanLatihan(kunci);
    if (!rek || !rek.blob) return false;
    const url = URL.createObjectURL(rek.blob);
    urlAktif = url;
    const audio = new Audio(url);
    audioAktif = audio;
    audio.addEventListener('ended', () => {
      if (audioAktif === audio) hentikan();
    }, { once: true });
    audio.addEventListener('error', () => {
      if (audioAktif === audio) hentikan();
    }, { once: true });
    await audio.play().catch(() => hentikan());
    return true;
  }

  return { putar, hentikan };
}

export async function kirimKejadianSesi2(unitId, blokId, aspek, nilai, tambahan = {}) {
  return kirimAtauAntre(
    'catat',
    {
      tahap: 'UNIT',
      unit: nomorUnitDariId(unitId),
      blok: blokId,
      aspek,
      nilai,
      ...tambahan
    },
    `${blokId}: ${aspek}`
  );
}

export async function kirimCatatanLatihan(payload, label) {
  return kirimAtauAntre('catat', payload, label || `${payload.blok}: ${payload.id_item}`);
}

export function daftarBlokDalamUnit(unitId) {
  const noUnit = nomorUnitDariId(unitId);
  const info = KATALOG_UNIT_KALAM.find((u) => u.no === noUnit);
  return info ? info.blok : [];
}

/**
 * Mengirim aksi level_aksi ke server dengan cadangan antrean & pembaruan status lokal bila sibuk/luring (S-35)
 */
export async function kirimLevelAksiDenganCadangan({ unitId, blokId, level, aksi, itemDikerjakan, itemTotal }) {
  const muatan = {
    blok: blokId,
    level: Number(level),
    aksi,
    item_dikerjakan: Number(itemDikerjakan || 0),
    item_total: Number(itemTotal || 0)
  };
  const state = ambilState();
  const idIdempoten = buatIdIdempoten(state.kode_siswa);
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  let resp = null;
  if (!offline) {
    resp = await panggilApi('level_aksi', muatan, {
      id_idempoten: idIdempoten,
      tanpaTungguOnline: true
    });
  }

  if (resp && resp.ok && resp.data && resp.data.status) {
    await perbaruiStatusServer(resp.data.status);
    return { ok: true, status: resp.data.status };
  }

  const galat = resp && resp.galat ? resp.galat : 'E_SERVER';
  const belumTerdaftar = galat === 'E_PARAM' && /belum terdaftar/i.test(String((resp && resp.pesan) || ''));
  if (offline || galat === 'E_SERVER' || galat === 'E_SIBUK' || belumTerdaftar) {
    await tambahAntrean({
      id_idempoten: idIdempoten,
      aksi: 'level_aksi',
      kategori: 'ANGKA',
      unit: nomorUnitDariId(unitId),
      data: muatan,
      label: `Level ${level} (${aksi}) ${blokId}`,
      status: 'Menunggu',
      percobaan_kirim: offline ? 0 : 1
    });

    // Cadangan pembaruan status lokal (tidak pernah mencabut level atas maupun kunci Aku Bisa)
    const stLama = state.status_server || {};
    const levelMap = { ...(stLama.level_terbuka || {}) };
    const lvSaatIni = Number(levelMap[blokId] || 1);
    const blokSelesai = Array.isArray(stLama.blok_selesai) ? [...stLama.blok_selesai] : [];
    const blokTerbuka = Array.isArray(stLama.blok_terbuka) ? [...stLama.blok_terbuka] : [blokId];
    const sesi3Terbuka = Array.isArray(stLama.sesi3_terbuka) ? [...stLama.sesi3_terbuka] : [];

    if (aksi === 'aku_siap') {
      if (level === 1 && lvSaatIni < 2) levelMap[blokId] = 2;
      else if (level === 2 && lvSaatIni < 3) levelMap[blokId] = 3;
      else if (level === 3) {
        levelMap[blokId] = Math.max(3, lvSaatIni);
        if (!blokSelesai.includes(blokId)) blokSelesai.push(blokId);

        const blokUnit = daftarBlokDalamUnit(unitId);
        const idx = blokUnit.findIndex((b) => b.id === blokId);
        if (idx >= 0 && idx + 1 < blokUnit.length) {
          const berikut = blokUnit[idx + 1].id;
          if (!blokTerbuka.includes(berikut)) blokTerbuka.push(berikut);
        }
        const semuaWajib = blokUnit.filter((b) => b.wajib).every((b) => blokSelesai.includes(b.id));
        const noUnit = nomorUnitDariId(unitId);
        if (semuaWajib && !sesi3Terbuka.includes(noUnit)) {
          sesi3Terbuka.push(noUnit);
        }
      }
    }

    const statusBaru = {
      ...stLama,
      level_terbuka: levelMap,
      blok_selesai: blokSelesai,
      blok_terbuka: blokTerbuka,
      sesi3_terbuka: sesi3Terbuka
    };
    await perbaruiStatusServer(statusBaru);
    return { ok: true, diantrekan: true, status: statusBaru };
  }

  return { ok: false, galat, pesan: (resp && resp.pesan) || '' };
}

/**
 * Membuat state awal satu slot rekam latihan Sesi 2
 */
export function buatStateSlotRekam(kunciRekam, targetDeteksi = null) {
  return {
    kunciRekam,
    targetDeteksi,
    percobaan: 0,
    statusRekam: 'siap',
    sudahRekam: false,
    pesanStatus: '',
    hasil: '',
    penandaTampil: '',
    pilihanMandiri: '',
    menungguMandiri: false,
    selesaiDicoba: false,
    kendalaMikrofon: false,
    waktu_mulai_bicara: null,
    durasi_bicara: 0,
    skor_kata_kunci: '',
    k_wajib: ''
  };
}

/**
 * Pengendali rekam bersama untuk S-31, S-32, dan S-33 (FR-071, FR-072, FR-074, FR-083, K-10..K-17, R-26..R-28)
 */
export function buatPengendaliRekamSesi2({
  konteks,
  idLayar,
  pengelolaMandiri,
  pemutarSuaraku,
  dapatkanSlotAktif,
  maksPercobaan = 3,
  modeSesi3 = false,
  padaPerubahan
}) {
  const { paramUmum, kalibrasiLatar } = konteks;
  const perekamParam = (paramUmum && paramUmum.perekaman) || {};
  const deteksiParam = (paramUmum && paramUmum.deteksi_kata_kunci) || {};
  const ambangDeteksi = Number(deteksiParam.ambang_deteksi || 0.5);

  const perekam = buatPerekamLatihan({ paramRekam: perekamParam });
  konteks.saatKeluar(() => {
    perekam.bersihkan();
    pemutarSuaraku.hentikan();
  });

  async function toggleRekam() {
    if (perekam.sedangAktif()) {
      perekam.hentikan('manual');
      return;
    }
    const slot = dapatkanSlotAktif();
    if (!slot) return;

    hentikanAudioModel();
    pemutarSuaraku.hentikan();
    slot.pesanStatus = '';

    await perekam.mulai({
      kalibrasiLatar,
      pengelolaMandiri,
      targetDeteksi: slot.targetDeteksi,
      ambangDeteksi,
      aktifkanSpeech: !pengelolaMandiri.apakahModeMandiri(),
      onMulai: () => {
        if (!konteks.masihAktif()) return;
        slot.statusRekam = 'merekam';
        padaPerubahan();
      },
      onKendala: (kendala) => {
        if (!konteks.masihAktif()) return;
        slot.statusRekam = slot.sudahRekam ? 'tersimpan' : 'siap';
        slot.kendalaMikrofon = true;
        slot.pesanStatus = ambilTeks('S-31', 'pesan_mikrofon_kendala') ||
          'Mikrofon belum bisa dipakai sekarang. Kamu bisa melewati latihan ini.';
        catatKendalaTeknis(kendala && kendala.jenis_kendala, idLayar);
        padaPerubahan();
      },
      onSelesai: async (res) => {
        if (!konteks.masihAktif() || !res || res.dibatalkan) {
          slot.statusRekam = slot.sudahRekam ? 'tersimpan' : 'siap';
          return;
        }
        const ev = res.evaluasi || {};

        // K-15: sunyi atau < 1 detik tidak dihitung percobaan
        if (ev.kategori === 'sunyi_pendek') {
          slot.statusRekam = slot.sudahRekam ? 'tersimpan' : 'siap';
          slot.pesanStatus = ambilTeks('S-31', 'pesan_sunyi_pendek') || ev.pesan;
          padaPerubahan();
          return;
        }

        // K-17: tidak bersuara dalam 10 detik dihitung percobaan tidak mulai
        if (ev.kategori === 'diam10') {
          slot.percobaan += 1;
          slot.statusRekam = slot.sudahRekam ? 'tersimpan' : 'siap';
          slot.pesanStatus = ambilTeks('S-31', 'pesan_tidak_bersuara') || ev.pesan;
          slot.waktu_mulai_bicara = null;
          slot.durasi_bicara = 0;
          if (modeSesi3) {
            slot.hasil = 'tidak';
            slot.penandaTampil = 'tersimpan';
            slot.selesaiDicoba = true;
          } else if (maksPercobaan > 0 && slot.percobaan >= maksPercobaan &&
              slot.hasil !== 'terdeteksi' && slot.hasil !== 'mandiri_ya') {
            slot.hasil = 'tidak';
            slot.penandaTampil = 'coba_lagi';
            slot.selesaiDicoba = true;
          }
          padaPerubahan();
          return;
        }

        await simpanRekamanLokalTerakhir(slot.kunciRekam, res.blob, {
          mime: res.mime,
          durasi: res.durasi,
          durasi_bicara: ev.durasi_bicara,
          waktu_mulai_bicara: ev.waktu_mulai_bicara
        });
        if (!konteks.masihAktif()) return;

        slot.sudahRekam = true;
        slot.statusRekam = 'tersimpan';
        slot.percobaan += 1;
        slot.waktu_mulai_bicara = ev.waktu_mulai_bicara;
        slot.durasi_bicara = ev.durasi_bicara;
        slot.durasi_total = res.durasi || ev.durasi_bicara || 0;
        slot.mime = res.mime || 'audio/webm';
        slot.pesanStatus = '';

        const det = res.deteksi;
        if (det) {
          slot.skor_kata_kunci = det.skor_kata_kunci;
          slot.k_wajib = det.k_wajib;
        }

        if (pengelolaMandiri.apakahModeMandiri()) {
          slot.menungguMandiri = true;
          slot.pilihanMandiri = '';
          slot.hasil = 'tersimpan';
          slot.penandaTampil = 'tersimpan';
          slot.selesaiDicoba = false;
        } else if (det && det.terdeteksi) {
          slot.menungguMandiri = false;
          slot.hasil = 'terdeteksi';
          slot.penandaTampil = 'terdeteksi';
          slot.selesaiDicoba = true;
        } else {
          slot.menungguMandiri = false;
          slot.hasil = 'tidak';
          slot.penandaTampil = modeSesi3 ? 'tersimpan' : 'coba_lagi';
          slot.selesaiDicoba = modeSesi3 ? true : (maksPercobaan > 0 && slot.percobaan >= maksPercobaan);
        }

        padaPerubahan();
      }
    });
  }

  function pilihMandiri(slot, pilihan, meta = {}) {
    if (!slot) return null;
    const cat = pengelolaMandiri.catatPilihanMandiri(pilihan, meta);
    slot.pilihanMandiri = pilihan;
    slot.hasil = cat.hasil;
    slot.penandaTampil = cat.hasil === 'mandiri_ya' ? 'terdeteksi' : 'tersimpan';
    slot.selesaiDicoba = true;
    padaPerubahan();
    return cat;
  }

  return {
    toggleRekam,
    pilihMandiri,
    sedangAktif: () => perekam.sedangAktif(),
    bersihkan: () => perekam.bersihkan()
  };
}
