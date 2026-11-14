/**
 * Layar S-03: Isi Unit / Daftar Blok (situs/js/layar/s03-isi-unit.js)
 * Tugas M1-E: TB-M1-07
 * Acuan: SRS-3 FR-003, FR-070; BP-1 S-03; BP-4 R-02..R-06; BP-5 K-37, K-44; BP-6 S-03
 */

import { panggilApi } from '../api.js';
import { arahKe } from '../router.js';
import { ambilState, ambilTeks, perbaruiStatusServer } from '../state.js';
import { KATALOG_UNIT_KALAM } from './s02-beranda.js';
import { escapeHtml, kirimAtauAntre, siapkanWadahLayar } from './tahap0-bantu.js';

function normalkanNomorUnit(paramUnit) {
  const mentah = String(paramUnit || 'U1').trim().toUpperCase().replace(/^U/, '');
  const angka = Number(mentah);
  if (!isNaN(angka) && angka >= 1 && angka <= 6) return angka;
  return 1;
}

function susunTeksStatusBlok({ selesai, sesi1Selesai, levelTerbuka }) {
  if (selesai) {
    return 'Sesi 1 &#10003; &middot; Level 1 &#10003; &middot; Level 2 &#10003; &middot; Level 3 &#10003;';
  }
  const tandaSesi1 = sesi1Selesai ? 'Sesi 1 &#10003;' : 'Sesi 1';
  const lv = Number(levelTerbuka || 0);
  const tandaL1 = lv >= 2 ? 'Level 1 &#10003;' : 'Level 1';
  const tandaL2 = lv >= 3 ? 'Level 2 &#10003;' : 'Level 2';
  const tandaL3 = 'Level 3';
  return `${tandaSesi1} &middot; ${tandaL1} &middot; ${tandaL2} &middot; ${tandaL3}`;
}

export async function renderS03({ param = {} } = {}) {
  const state = ambilState();
  const noUnit = normalkanNomorUnit(param.unit || state.unit_aktif || 'U1');
  const infoUnit = KATALOG_UNIT_KALAM.find((u) => u.no === noUnit) || KATALOG_UNIT_KALAM[0];
  state.unit_aktif = infoUnit.id;

  const namaUnitLengkap = `Unit ${infoUnit.no} · ${infoUnit.judul_id}`;
  const judul = ambilTeks('S-03', 'judul', { nama_unit: namaUnitLengkap }) || namaUnitLengkap;
  const wadah = siapkanWadahLayar('S-03', judul);
  if (!wadah) return;

  let aktifDiLayar = true;

  function gambar() {
    if (!aktifDiLayar) return;
    const st = ambilState().status_server || {
      tahap0_selesai: '',
      unit_terbuka: 1,
      unit_selesai: [],
      blok_terbuka: ['U1-BA'],
      blok_sesi1_selesai: [],
      level_terbuka: {},
      blok_selesai: [],
      sesi3_terbuka: [],
      sesi3_selesai: []
    };

    const teksMulai = ambilTeks('S-03', 'tombol_mulai') || 'Mulai';
    const teksLanjut = ambilTeks('S-03', 'tombol_lanjut') || 'Lanjut';
    const teksUlangi = ambilTeks('S-03', 'tombol_ulangi') || 'Ulangi';
    const teksBlokTerkunci = ambilTeks('S-03', 'blok_terkunci') || 'Selesaikan blok sebelumnya dulu';
    const teksPengayaan = ambilTeks('S-03', 'label_pengayaan') || 'Pengayaan';
    const teksBarisAkhir = ambilTeks('S-03', 'baris_akhir_unit') || 'Sesi 3 dan misi bersama gurumu';
    const teksBarisAkhirTerkunci = ambilTeks('S-03', 'baris_akhir_terkunci') || 'Terbuka setelah semua blok selesai';
    const teksUnitTerkunci = ambilTeks('S-03', 'unit_terkunci') || 'Unit ini terbuka setelah setoran ke gurumu';

    const unitSelesai = Array.isArray(st.unit_selesai) ? st.unit_selesai.map(Number) : [];
    const blokTerbuka = Array.isArray(st.blok_terbuka) ? st.blok_terbuka : [];
    const blokSesi1Selesai = Array.isArray(st.blok_sesi1_selesai)
      ? st.blok_sesi1_selesai
      : (Array.isArray(st.sesi1_selesai) ? st.sesi1_selesai : []);
    const blokSelesai = Array.isArray(st.blok_selesai) ? st.blok_selesai : [];
    const levelTerbukaMap = (st.level_terbuka && typeof st.level_terbuka === 'object') ? st.level_terbuka : {};
    const sesi3Terbuka = Array.isArray(st.sesi3_terbuka) ? st.sesi3_terbuka.map(Number) : [];
    const sesi3Selesai = Array.isArray(st.sesi3_selesai) ? st.sesi3_selesai.map(Number) : [];

    const unitTerbukaNo = Number(st.unit_terbuka || 0);
    const adaBlokUnitIniTerbuka = blokTerbuka.some((idB) => idB.indexOf(`U${infoUnit.no}-`) === 0);
    const apakahUnitIniTerbuka =
      unitSelesai.includes(infoUnit.no) ||
      infoUnit.no <= unitTerbukaNo ||
      adaBlokUnitIniTerbuka;

    if (!apakahUnitIniTerbuka) {
      wadah.innerHTML = `
        <section class="kartu" aria-labelledby="judul-unit-s03">
          <div class="daftar-status" style="justify-content: space-between;">
            <span class="kartu-unit__nomor">Unit ${infoUnit.no}</span>
            <span class="penanda-status penanda-status--menunggu">
              <span class="penanda-status__ikon" aria-hidden="true">&#128274;</span>
              <span>Terkunci</span>
            </span>
          </div>
          <h1 id="judul-unit-s03" class="judul-layar" style="margin-bottom: 0;">
            ${escapeHtml(infoUnit.judul_id)}
          </h1>
          <p class="teks-arab" lang="ar" dir="rtl" style="margin: 0;">
            ${infoUnit.judul_arab}
          </p>
          <div class="pesan-hangat">
            <p class="pesan-hangat__isi">${escapeHtml(teksUnitTerkunci)}</p>
          </div>
          <button type="button" id="tombol-kembali-beranda-s03" class="tombol tombol--utama">
            Kembali ke Beranda
          </button>
        </section>
      `;

      const btnKembali = document.getElementById('tombol-kembali-beranda-s03');
      if (btnKembali) btnKembali.addEventListener('click', () => arahKe('S-02'));
      return;
    }

    const daftarBlokHtml = infoUnit.blok.map((blok, idx) => {
      const selesai = blokSelesai.includes(blok.id);
      const sesi1Sudah = blokSesi1Selesai.includes(blok.id);
      const lvTerbuka = Number(levelTerbukaMap[blok.id] || (sesi1Sudah ? 1 : 0));
      const blokSebelumSelesai = idx === 0 ? true : blokSelesai.includes(infoUnit.blok[idx - 1].id);
      const terbuka = selesai || blokTerbuka.includes(blok.id) || blokSebelumSelesai;

      const barisStatusHtml = susunTeksStatusBlok({
        selesai,
        sesi1Selesai: sesi1Sudah,
        levelTerbuka: lvTerbuka
      });

      const lencanaPengayaanHtml = blok.pengayaan
        ? `<span class="kartu-arab__label">${escapeHtml(teksPengayaan)}</span>`
        : '';

      if (selesai) {
        return `
          <li class="kartu-unit kartu-unit--selesai">
            <div class="kartu-unit__kepala">
              <div>
                <span class="kartu-unit__nomor">${escapeHtml(blok.kode)}</span>
                <h2 class="kartu-unit__judul-id">${escapeHtml(blok.judul_id)}</h2>
              </div>
              <div style="display: flex; align-items: center; gap: var(--jarak-1);">
                ${lencanaPengayaanHtml}
                <span class="penanda-status penanda-status--terdeteksi">
                  <span class="penanda-status__ikon" aria-hidden="true">&#10003;</span>
                  <span>Selesai</span>
                </span>
              </div>
            </div>
            <p class="teks-keterangan" style="margin: 0; font-weight: 600;">
              ${barisStatusHtml}
            </p>
            <button
              type="button"
              class="tombol tombol--sekunder tombol-pilih-blok-s03"
              data-blok="${blok.id}"
              data-aksi="ulangi"
            >
              ${escapeHtml(teksUlangi)}
            </button>
          </li>
        `;
      }

      if (terbuka) {
        const sedangBerjalan = sesi1Sudah || lvTerbuka > 0;
        const labelTahapAktif = sedangBerjalan ? `Level ${Math.max(1, lvTerbuka)}` : 'Sesi 1';
        return `
          <li class="kartu-unit kartu-unit--terbuka">
            <div class="kartu-unit__kepala">
              <div>
                <span class="kartu-unit__nomor">${escapeHtml(blok.kode)}</span>
                <h2 class="kartu-unit__judul-id">${escapeHtml(blok.judul_id)}</h2>
              </div>
              <div style="display: flex; align-items: center; gap: var(--jarak-1);">
                ${lencanaPengayaanHtml}
                <span class="kartu-arab__label">${escapeHtml(labelTahapAktif)}</span>
              </div>
            </div>
            <p class="teks-keterangan" style="margin: 0; font-weight: 600;">
              ${barisStatusHtml}
            </p>
            <button
              type="button"
              class="tombol tombol--utama tombol-pilih-blok-s03"
              data-blok="${blok.id}"
              data-aksi="${sedangBerjalan ? 'lanjut' : 'mulai'}"
            >
              ${escapeHtml(sedangBerjalan ? teksLanjut : teksMulai)}
            </button>
          </li>
        `;
      }

      return `
        <li class="kartu-unit kartu-unit--terkunci">
          <div class="kartu-unit__kepala">
            <div>
              <span class="kartu-unit__nomor">${escapeHtml(blok.kode)}</span>
              <h2 class="kartu-unit__judul-id">${escapeHtml(blok.judul_id)}</h2>
            </div>
            <div style="display: flex; align-items: center; gap: var(--jarak-1);">
              ${lencanaPengayaanHtml}
              <span class="penanda-status penanda-status--menunggu">
                <span class="penanda-status__ikon" aria-hidden="true">&#128274;</span>
                <span>Terkunci</span>
              </span>
            </div>
          </div>
          <p class="teks-keterangan" style="margin: 0;">
            ${barisStatusHtml}
          </p>
          <p class="teks-keterangan" style="margin: 0; font-weight: 600;">
            ${escapeHtml(teksBlokTerkunci)}
          </p>
        </li>
      `;
    }).join('');

    // R-06 & K-44: Sesi 3 terbuka bila semua blok wajib selesai (U5-BF dikecualikan)
    const semuaBlokWajibSelesai = infoUnit.blok
      .filter((b) => b.wajib)
      .every((b) => blokSelesai.includes(b.id));
    const apakahSesi3Terbuka = semuaBlokWajibSelesai || sesi3Terbuka.includes(infoUnit.no);
    const apakahSesi3Selesai = sesi3Selesai.includes(infoUnit.no) || unitSelesai.includes(infoUnit.no);

    const barisAkhirHtml = apakahSesi3Terbuka ? `
      <li class="kartu-unit ${apakahSesi3Selesai ? 'kartu-unit--selesai' : 'kartu-unit--terbuka'}">
        <div class="kartu-unit__kepala">
          <div>
            <span class="kartu-unit__nomor">Akhir Unit</span>
            <h2 class="kartu-unit__judul-id">${escapeHtml(teksBarisAkhir)}</h2>
          </div>
          ${apakahSesi3Selesai ? `
            <span class="penanda-status penanda-status--terdeteksi">
              <span class="penanda-status__ikon" aria-hidden="true">&#10003;</span>
              <span>Selesai</span>
            </span>
          ` : `
            <span class="kartu-arab__label">Siap dimulai</span>
          `}
        </div>
        <button type="button" id="tombol-sesi3-s03" class="tombol tombol--utama">
          ${escapeHtml(apakahSesi3Selesai ? teksUlangi : teksMulai)}
        </button>
      </li>
    ` : `
      <li class="kartu-unit kartu-unit--terkunci">
        <div class="kartu-unit__kepala">
          <div>
            <span class="kartu-unit__nomor">Akhir Unit</span>
            <h2 class="kartu-unit__judul-id">${escapeHtml(teksBarisAkhir)}</h2>
          </div>
          <span class="penanda-status penanda-status--menunggu">
            <span class="penanda-status__ikon" aria-hidden="true">&#128274;</span>
            <span>Terkunci</span>
          </span>
        </div>
        <p class="teks-keterangan" style="margin: 0; font-weight: 600;">
          ${escapeHtml(teksBarisAkhirTerkunci)}
        </p>
      </li>
    `;

    wadah.innerHTML = `
      <section class="kartu" aria-labelledby="judul-unit-s03">
        <div class="daftar-status" style="justify-content: space-between;">
          <span class="kartu-unit__nomor">Unit ${infoUnit.no}</span>
          <button type="button" id="tautan-beranda-s03" class="tautan-aksi-tombol">
            &larr; Beranda
          </button>
        </div>
        <h1 id="judul-unit-s03" class="judul-layar" style="margin-bottom: 0;">
          ${escapeHtml(infoUnit.judul_id)}
        </h1>
        <p class="teks-arab" lang="ar" dir="rtl" style="margin: 0;">
          ${infoUnit.judul_arab}
        </p>
      </section>

      <section class="kartu" aria-label="Daftar blok Unit ${infoUnit.no}">
        <ul class="daftar-unit">
          ${daftarBlokHtml}
          ${barisAkhirHtml}
        </ul>
      </section>
    `;

    const btnBeranda = document.getElementById('tautan-beranda-s03');
    if (btnBeranda) {
      btnBeranda.addEventListener('click', () => arahKe('S-02'));
    }

    const tombolBlok = Array.from(wadah.querySelectorAll('.tombol-pilih-blok-s03'));
    tombolBlok.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idBlok = btn.getAttribute('data-blok') || `${infoUnit.id}-BA`;
        const aksi = btn.getAttribute('data-aksi') || 'mulai';
        state.unit_aktif = infoUnit.id;
        state.blok_aktif = idBlok;

        kirimAtauAntre(
          'catat',
          { jenis: 'aktivitas', aktivitas: 'blok_dipilih', unit: infoUnit.no, blok: idBlok },
          `Pilih blok ${idBlok}`,
          'ANGKA'
        ).catch(() => {});

        const sesi1Sudah = blokSesi1Selesai.includes(idBlok);
        if (aksi === 'lanjut' && sesi1Sudah) {
          arahKe('S-30', { unit: infoUnit.id, blok: idBlok });
        } else {
          arahKe('S-20', { unit: infoUnit.id, blok: idBlok });
        }
      });
    });

    const btnSesi3 = document.getElementById('tombol-sesi3-s03');
    if (btnSesi3) {
      btnSesi3.addEventListener('click', () => {
        arahKe('S-40', { unit: infoUnit.id });
      });
    }
  }

  window.addEventListener('hashchange', () => {
    aktifDiLayar = false;
  }, { once: true });

  gambar();

  // Periksa status buka-kunci unit ke server saat dibuka (FR-003, R-44, UJ-KEA-01)
  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const hasil = await panggilApi('status', { unit: infoUnit.no }, {
        tanpaUlang: true
      });
      if (hasil && hasil.ok && hasil.data) {
        await perbaruiStatusServer(hasil.data.status || hasil.data);
        if (aktifDiLayar) gambar();
      }
    } catch (_) {}
  }
}
