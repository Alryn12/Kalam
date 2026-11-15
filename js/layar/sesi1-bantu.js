/**
 * Pembantu Layar Sesi 1: Tab, Varian Gender, State Lokal & Kejadian (situs/js/layar/sesi1-bantu.js)
 * Tugas M1-G: TB-M1-08 (S-20 s.d. S-24)
 */

import { ambilSesi, simpanSesi } from '../antrean.js';
import { ambilState, ambilTeks } from '../state.js';
import {
  muatBlokKonten,
  normalkanIdBlok,
  normalkanIdUnit
} from '../pemuat-konten.js';
import { arahKe } from '../router.js';
import { hentikanAudioModel } from '../audio-model.js';
import { escapeHtml, kirimAtauAntre, siapkanWadahLayar } from './tahap0-bantu.js';

const TAB_SESI1 = [
  { kunci: 'tonton', layar: 'S-20', teksFallback: 'Tonton', aspek: 'tab_tonton_dibuka' },
  { kunci: 'kata_kunci', layar: 'S-21', teksFallback: 'Kata Kunci', aspek: 'tab_kata_kunci_dibuka' },
  { kunci: 'tiru', layar: 'S-22', teksFallback: 'Tiru', aspek: 'tab_tiru_dibuka' },
  { kunci: 'rekam', layar: 'S-23', teksFallback: 'Rekam', aspek: null }
];

export function nomorUnitDariId(unitId) {
  return Number(String(unitId || '1').replace(/^U/i, '')) || 1;
}

export function folderAudioUnit(unitId) {
  return `u${nomorUnitDariId(unitId)}`;
}

export function pilihBentukTeks(nilai, bentuk = 'putra') {
  if (nilai === null || nilai === undefined) return '';
  if (typeof nilai === 'string') return nilai;
  if (Array.isArray(nilai)) {
    return nilai.map((x) => pilihBentukTeks(x, bentuk)).filter(Boolean).join(' · ');
  }
  if (typeof nilai === 'object') {
    const teks = nilai[bentuk] ?? nilai.putra ?? nilai.putri ?? '';
    return pilihBentukTeks(teks, bentuk);
  }
  return String(nilai);
}

export function ratakanBentukTeks(nilai, bentuk = 'putra') {
  if (nilai === null || nilai === undefined) return [];
  if (typeof nilai === 'string') return nilai ? [nilai] : [];
  if (Array.isArray(nilai)) {
    const hasil = [];
    nilai.forEach((x) => hasil.push(...ratakanBentukTeks(x, bentuk)));
    return hasil;
  }
  if (typeof nilai === 'object') {
    const teks = nilai[bentuk] ?? nilai.putra ?? nilai.putri ?? '';
    return ratakanBentukTeks(teks, bentuk);
  }
  return [String(nilai)];
}

export function pilihBentukAudio(nilai, bentuk = 'putra') {
  if (!nilai) return [];
  if (typeof nilai === 'string') return [nilai];
  if (Array.isArray(nilai)) {
    const hasil = [];
    nilai.forEach((x) => hasil.push(...pilihBentukAudio(x, bentuk)));
    return hasil;
  }
  if (typeof nilai === 'object') {
    const pil = nilai[bentuk] ?? nilai.putra ?? nilai.putri;
    return pilihBentukAudio(pil, bentuk);
  }
  return [];
}

export function apakahBlokPunyaVarianGender(blokData) {
  const cek = (v) => v && typeof v === 'object' && !Array.isArray(v) && ('putra' in v || 'putri' in v);
  const kk = Array.isArray(blokData && blokData.kata_kunci) ? blokData.kata_kunci : [];
  const tiru = Array.isArray(blokData && blokData.tiru) ? blokData.tiru : [];
  return kk.some((k) => cek(k.frasa) || cek(k.dibunyikan)) || tiru.some((t) => cek(t.arab) || cek(t.audio));
}

function kunciKemajuanBlok(kodeSiswa, blokId) {
  return `sesi1_${kodeSiswa || 'tamu'}_${blokId}`;
}

export async function ambilKemajuanSesi1(kodeSiswa, blokId) {
  const st = ambilState().status_server || {};
  const daftarS1 = Array.isArray(st.blok_sesi1_selesai)
    ? st.blok_sesi1_selesai
    : (Array.isArray(st.sesi1_selesai) ? st.sesi1_selesai : []);
  const s1SudahServer = daftarS1.includes(blokId);
  const bentukBawaan = (st.konfig_publik && st.konfig_publik.bentuk_sapaan_guru) || 'putra';
  const tersimpan = await ambilSesi(kunciKemajuanBlok(kodeSiswa, blokId));
  const bawaan = {
    tab: {
      tonton: s1SudahServer,
      kata_kunci: s1SudahServer,
      tiru: s1SudahServer,
      rekam: s1SudahServer
    },
    tabTercatat: { tonton: s1SudahServer, kata_kunci: s1SudahServer, tiru: s1SudahServer },
    s12RekamSudah: s1SudahServer,
    bentukLawan: bentukBawaan === 'putri' ? 'putri' : 'putra',
    giliranDipilih: [],
    irama: null,
    kataBeda: null,
    dilewatiTeknis: false
  };
  if (!tersimpan || typeof tersimpan !== 'object') return bawaan;
  return {
    ...bawaan,
    ...tersimpan,
    tab: { ...bawaan.tab, ...(tersimpan.tab || {}) },
    tabTercatat: { ...bawaan.tabTercatat, ...(tersimpan.tabTercatat || {}) },
    giliranDipilih: Array.isArray(tersimpan.giliranDipilih) ? tersimpan.giliranDipilih : []
  };
}

export async function simpanKemajuanSesi1(kodeSiswa, blokId, kemajuan) {
  await simpanSesi(kunciKemajuanBlok(kodeSiswa, blokId), kemajuan);
}

export async function apakahPenyelamatU1Sudah(kodeSiswa) {
  return Boolean(await ambilSesi(`penyelamat_u1_${kodeSiswa || 'tamu'}`));
}

export async function tandaiPenyelamatU1Sudah(kodeSiswa) {
  await simpanSesi(`penyelamat_u1_${kodeSiswa || 'tamu'}`, true);
}

export function semuaTabSesi1Selesai(tab = {}) {
  return Boolean(tab.tonton && tab.kata_kunci && tab.tiru && tab.rekam);
}

export function daftarTabBelumDibuka(tab = {}) {
  return TAB_SESI1
    .filter((t) => !tab[t.kunci])
    .map((t) => ambilTeks(t.layar, 'judul_tab') || t.teksFallback);
}

export async function catatKejadianSesi1(unitId, blokId, aspek, nilai, tambahan = {}) {
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

/**
 * Menyiapkan data blok, validasi buka-kunci, serta mencatat pembukaan tab Sesi 1
 */
export async function siapkanKonteksSesi1(idLayar, param = {}, kunciTab = null) {
  hentikanAudioModel();
  const state = ambilState();
  const unitId = normalkanIdUnit((param && param.unit) || state.unit_aktif || 'U1');
  const blokId = normalkanIdBlok((param && param.blok) || state.blok_aktif || `${unitId}-BA`, unitId);

  const st = state.status_server || {};
  const daftarBlokTerbuka = Array.isArray(st.blok_terbuka) ? st.blok_terbuka : null;
  if (daftarBlokTerbuka && !daftarBlokTerbuka.includes(blokId)) {
    arahKe('S-91', { jenis: 'belum_terbuka', asal: 'S-03', unit: unitId });
    return null;
  }

  const blokData = await muatBlokKonten(blokId, {
    arahkanKeS91: true,
    asal: 'S-03',
    tujuan: idLayar,
    unit: unitId
  });
  if (!blokData) return null;

  const kodeSiswa = state.kode_siswa || 'tamu';
  const kemajuan = await ambilKemajuanSesi1(kodeSiswa, blokId);

  if (kunciTab && kunciTab !== 'rekam') {
    let perluSimpan = false;
    if (!kemajuan.tab[kunciTab]) {
      kemajuan.tab[kunciTab] = true;
      perluSimpan = true;
    }
    const infoTab = TAB_SESI1.find((t) => t.kunci === kunciTab);
    if (infoTab && infoTab.aspek && !kemajuan.tabTercatat[kunciTab]) {
      kemajuan.tabTercatat[kunciTab] = true;
      perluSimpan = true;
      catatKejadianSesi1(unitId, blokId, infoTab.aspek, 1);
    }
    if (perluSimpan) {
      await simpanKemajuanSesi1(kodeSiswa, blokId, kemajuan);
    }
  }

  const namaTab = ambilTeks(idLayar, 'judul_tab') || ambilTeks(idLayar, 'judul') || idLayar;
  const wadah = siapkanWadahLayar(idLayar, `${blokData.judul_id} — ${namaTab}`);
  if (!wadah) return null;

  return { state, kodeSiswa, unitId, blokId, blokData, kemajuan, wadah };
}

export function renderBilahTabSesi1(idLayarAktif, kemajuan) {
  const tab = (kemajuan && kemajuan.tab) || {};
  const terkunciRekam = !tab.tiru;
  const teksRekamTerkunci = ambilTeks('S-23', 'tab_belum_aktif') || 'Buka tab Tiru dulu satu kali, lalu kamu bisa merekam.';

  const butirHtml = TAB_SESI1.map((t) => {
    const label = ambilTeks(t.layar, 'judul_tab') || t.teksFallback;
    const aktif = idLayarAktif === t.layar;
    const selesai = Boolean(tab[t.kunci]);
    const nonaktif = t.kunci === 'rekam' && terkunciRekam;

    let kelas = 'butir-tab';
    if (nonaktif) kelas += ' butir-tab--nonaktif';
    else if (aktif) kelas += ' butir-tab--aktif';
    else if (selesai) kelas += ' butir-tab--selesai';

    const awalan = selesai ? '✓ ' : '';
    return `
      <button
        type="button"
        class="${kelas}"
        data-tab-layar="${t.layar}"
        ${aktif ? 'aria-current="page"' : ''}
        ${nonaktif ? `disabled aria-disabled="true" title="${escapeHtml(teksRekamTerkunci)}"` : ''}
      >
        <span>${awalan}${escapeHtml(label)}</span>
      </button>
    `;
  }).join('');

  return `<nav class="bilah-tab" aria-label="Tab Sesi 1">${butirHtml}</nav>`;
}

export function renderKepalaSesi1(konteks, idLayarAktif, opsi = {}) {
  const { blokData, kemajuan } = konteks;
  const kembali = ambilTeks('S-20', 'tombol_kembali_unit') || 'Kembali ke daftar blok';
  const subjudul = ambilTeks(idLayarAktif, 'judul_tab') || ambilTeks(idLayarAktif, 'judul') || '';
  const petunjuk = ambilTeks(idLayarAktif, 'petunjuk') || '';

  let pemilihBentukHtml = '';
  if (!opsi.tanpaPemilihBentuk && apakahBlokPunyaVarianGender(blokData)) {
    const lblPa = ambilTeks('S-20', 'label_putra') || 'Bentuk putra';
    const lblPi = ambilTeks('S-20', 'label_putri') || 'Bentuk putri';
    pemilihBentukHtml = `
      <div class="baris-pilihan-kecil" role="group" aria-label="Pilih bentuk sapaan">
        <button type="button" class="tombol tombol--sekunder ${kemajuan.bentukLawan === 'putra' ? 'tombol--terpilih' : ''}" data-bentuk="putra" aria-pressed="${kemajuan.bentukLawan === 'putra'}">${escapeHtml(lblPa)}</button>
        <button type="button" class="tombol tombol--sekunder ${kemajuan.bentukLawan === 'putri' ? 'tombol--terpilih' : ''}" data-bentuk="putri" aria-pressed="${kemajuan.bentukLawan === 'putri'}">${escapeHtml(lblPi)}</button>
      </div>
    `;
  }

  return `
    <header style="display: flex; flex-direction: column; gap: var(--jarak-2);">
      <div>
        <button type="button" id="tombol-kembali-s03" class="tautan-aksi" style="padding: 0; background: transparent; border: none; cursor: pointer;">
          ← ${escapeHtml(kembali)}
        </button>
      </div>
      <div>
        <p class="teks-keterangan" style="margin: 0;">${escapeHtml(blokData.id)} · ${escapeHtml(subjudul)}</p>
        <h1 class="judul-layar">${escapeHtml(blokData.judul_id)}</h1>
        ${blokData.judul_ar ? `<p class="teks-arab" lang="ar" dir="rtl" style="margin: var(--jarak-1) 0 0 0;">${escapeHtml(blokData.judul_ar)}</p>` : ''}
      </div>
      ${opsi.sembunyikanTab ? '' : renderBilahTabSesi1(idLayarAktif, kemajuan)}
      ${petunjuk ? `<p class="teks-instruksi" style="margin: 0;">${escapeHtml(petunjuk)}</p>` : ''}
      ${pemilihBentukHtml}
    </header>
  `;
}

export function renderFooterLanjutRefleksi(konteks) {
  const { kemajuan } = konteks;
  if (!semuaTabSesi1Selesai(kemajuan.tab)) return '';
  const teksLanjut = ambilTeks('S-23', 'tombol_lanjut_refleksi') || 'Lanjut ke refleksi';
  return `
    <div style="margin-top: var(--jarak-2);">
      <button type="button" id="tombol-ke-s24" class="tombol tombol--utama">
        ${escapeHtml(teksLanjut)}
      </button>
    </div>
  `;
}

export function pasangNavigasiSesi1(konteks, padaUbahBentuk) {
  const { wadah, kodeSiswa, unitId, blokId, kemajuan } = konteks;

  const btnKembali = wadah.querySelector('#tombol-kembali-s03');
  if (btnKembali) {
    btnKembali.addEventListener('click', () => {
      hentikanAudioModel();
      arahKe('S-03', { unit: unitId });
    });
  }

  wadah.querySelectorAll('[data-tab-layar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const tujuan = btn.getAttribute('data-tab-layar');
      hentikanAudioModel();
      arahKe(tujuan, { unit: unitId, blok: blokId });
    });
  });

  wadah.querySelectorAll('[data-bentuk]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const nilaiBaru = btn.getAttribute('data-bentuk');
      if (nilaiBaru === kemajuan.bentukLawan) return;
      kemajuan.bentukLawan = nilaiBaru;
      await simpanKemajuanSesi1(kodeSiswa, blokId, kemajuan);
      if (typeof padaUbahBentuk === 'function') padaUbahBentuk(nilaiBaru);
    });
  });

  const btnKeS24 = wadah.querySelector('#tombol-ke-s24');
  if (btnKeS24) {
    btnKeS24.addEventListener('click', () => {
      hentikanAudioModel();
      arahKe('S-24', { unit: unitId, blok: blokId });
    });
  }
}
