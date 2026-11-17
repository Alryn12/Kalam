/**
 * Layar S-03: Isi Unit / Daftar Blok (situs/js/layar/s03-isi-unit.js)
 * Tugas M1-E: TB-M1-07
 * Acuan: SRS-3 FR-003, FR-070; BP-1 S-03; BP-4 R-02..R-06; BP-5 K-37, K-44; BP-6 S-03
 */

import { panggilApi } from '../api.js';
import { muatBlokKonten, muatMuhimmahUnit } from '../pemuat-konten.js';
import { arahKe } from '../router.js';
import { ambilState, ambilTeks, perbaruiStatusServer } from '../state.js';
import { KATALOG_UNIT_KALAM } from './s02-beranda.js';
import { ambilKemajuanSesi2 } from './sesi2-bantu.js';
import { ambilKemajuanSesi3 } from './sesi3-bantu.js';
import { escapeHtml, kirimAtauAntre, siapkanWadahLayar } from './tahap0-bantu.js';

function normalkanNomorUnit(paramUnit) {
  const mentah = String(paramUnit || 'U1').trim().toUpperCase().replace(/^U/, '');
  const angka = Number(mentah);
  if (!isNaN(angka) && angka >= 1 && angka <= 6) return angka;
  return 1;
}

function susunTeksStatusBlok({ selesai, sesi1Selesai, levelTerbuka }) {
  const templat = ambilTeks('S-03', 'status_blok') || 'Sesi 1 · Level 1 · Level 2 · Level 3';
  const bagian = templat.split('·').map((s) => s.trim());
  const lblS1 = bagian[0] || 'Sesi 1';
  const lblL1 = bagian[1] || 'Level 1';
  const lblL2 = bagian[2] || 'Level 2';
  const lblL3 = bagian[3] || 'Level 3';

  if (selesai) {
    return `${escapeHtml(lblS1)} &#10003; &middot; ${escapeHtml(lblL1)} &#10003; &middot; ${escapeHtml(lblL2)} &#10003; &middot; ${escapeHtml(lblL3)} &#10003;`;
  }
  const tandaSesi1 = sesi1Selesai ? `${escapeHtml(lblS1)} &#10003;` : escapeHtml(lblS1);
  const lv = Number(levelTerbuka || 0);
  const tandaL1 = lv >= 2 ? `${escapeHtml(lblL1)} &#10003;` : escapeHtml(lblL1);
  const tandaL2 = lv >= 3 ? `${escapeHtml(lblL2)} &#10003;` : escapeHtml(lblL2);
  const tandaL3 = escapeHtml(lblL3);
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
  let blokPilihanTerbuka = '';

  function renderPanelPilihanSesi(blok, lvMaks, selesaiBlok) {
    if (blokPilihanTerbuka !== blok.id) return '';
    const lvTerbuka = selesaiBlok ? 3 : Math.max(1, Number(lvMaks || 1));
    const judulPilih = ambilTeks('S-03', 'pilihan_ulangi_judul', { nama_blok: blok.kode }) ||
      `Pilih bagian untuk ${blok.kode}:`;
    const lblS1 = ambilTeks('S-03', 'ulangi_sesi1') || 'Ulangi Sesi 1 (Tonton · Kata Kunci · Tiru · Rekam)';
    const lblS2 = ambilTeks('S-03', 'ulangi_sesi2') || 'Ulangi Sesi 2 · Pemanasan';
    const ulangParam = selesaiBlok ? '1' : '';

    const tombolLevelHtml = [1, 2, 3].filter((n) => n <= lvTerbuka).map((n) => {
      const layar = n === 1 ? 'S-31' : (n === 2 ? 'S-32' : 'S-33');
      const lblLv = ambilTeks('S-03', 'buka_level', { n }) || `Buka Level ${n}`;
      return `
        <button
          type="button"
          class="tombol tombol--sekunder tombol-tuju-sesi-s03"
          data-blok="${blok.id}"
          data-tujuan-layar="${layar}"
          data-ulang="${ulangParam}"
        >
          ${escapeHtml(lblLv)}
        </button>
      `;
    }).join('');

    return `
      <div class="panel-pilihan-sesi" role="region" aria-label="${escapeHtml(judulPilih)}">
        <p class="teks-keterangan" style="margin: 0; font-weight: 600;">${escapeHtml(judulPilih)}</p>
        <div class="baris-tombol">
          <button
            type="button"
            class="tombol tombol--sekunder tombol-tuju-sesi-s03"
            data-blok="${blok.id}"
            data-tujuan-layar="S-20"
            data-ulang=""
          >
            ${escapeHtml(lblS1)}
          </button>
          <button
            type="button"
            class="tombol tombol--sekunder tombol-tuju-sesi-s03"
            data-blok="${blok.id}"
            data-tujuan-layar="S-30"
            data-ulang=""
          >
            ${escapeHtml(lblS2)}
          </button>
          ${tombolLevelHtml}
        </div>
      </div>
    `;
  }

  async function gambar() {
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
    const teksTautanBeranda = ambilTeks('S-03', 'tautan_beranda') || '← Beranda';
    const teksKembaliBeranda = ambilTeks('S-03', 'tombol_kembali_beranda') || 'Kembali ke Beranda';
    const teksLabelTerkunci = ambilTeks('S-03', 'label_terkunci') || 'Terkunci';
    const teksLabelSelesai = ambilTeks('S-03', 'label_selesai') || 'Selesai';
    const teksSiapDimulai = ambilTeks('S-03', 'label_siap_dimulai') || 'Siap dimulai';
    const teksAkhirUnit = ambilTeks('S-03', 'label_akhir_unit') || 'Akhir Unit';

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
              <span>${escapeHtml(teksLabelTerkunci)}</span>
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
            ${escapeHtml(teksKembaliBeranda)}
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
                  <span>${escapeHtml(teksLabelSelesai)}</span>
                </span>
              </div>
            </div>
            <p class="teks-keterangan" style="margin: 0; font-weight: 600;">
              ${barisStatusHtml}
            </p>
            <button
              type="button"
              class="tombol tombol--sekunder tombol-buka-pilihan-s03"
              data-blok="${blok.id}"
              aria-expanded="${blokPilihanTerbuka === blok.id}"
            >
              ${escapeHtml(teksUlangi)}
            </button>
            ${renderPanelPilihanSesi(blok, 3, true)}
          </li>
        `;
      }

      if (terbuka) {
        const sedangBerjalan = sesi1Sudah || lvTerbuka > 0;
        const labelTahapAktif = sedangBerjalan ? `Level ${Math.max(1, lvTerbuka)}` : 'Sesi 1';
        const lblPilihBagian = ambilTeks('S-03', 'pilih_bagian') || 'Pilih sesi atau level';
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
            <div class="baris-tombol">
              <button
                type="button"
                class="tombol tombol--utama tombol-pilih-blok-s03"
                data-blok="${blok.id}"
                data-aksi="${sedangBerjalan ? 'lanjut' : 'mulai'}"
                data-lv="${lvTerbuka}"
              >
                ${escapeHtml(sedangBerjalan ? teksLanjut : teksMulai)}
              </button>
              ${sesi1Sudah ? `
                <button
                  type="button"
                  class="tombol tombol--sekunder tombol-buka-pilihan-s03"
                  data-blok="${blok.id}"
                  aria-expanded="${blokPilihanTerbuka === blok.id}"
                >
                  ${escapeHtml(lblPilihBagian)}
                </button>
              ` : ''}
            </div>
            ${sesi1Sudah ? renderPanelPilihanSesi(blok, lvTerbuka, false) : ''}
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
                <span>${escapeHtml(teksLabelTerkunci)}</span>
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

    let kemajuanS3 = null;
    if (apakahSesi3Terbuka) {
      kemajuanS3 = await ambilKemajuanSesi3(ambilState().kode_siswa || 'tamu', infoUnit.id);
      if (!aktifDiLayar) return;
    }
    const adaLanjutanS3 = !!(kemajuanS3 && kemajuanS3.sedangBerjalan);
    const labelStatusS3 = adaLanjutanS3
      ? `Putaran ${kemajuanS3.putaranAktif || 1}`
      : teksSiapDimulai;
    const labelTombolS3 = adaLanjutanS3
      ? teksLanjut
      : (apakahSesi3Selesai ? teksUlangi : teksMulai);

    const barisAkhirHtml = apakahSesi3Terbuka ? `
      <li class="kartu-unit ${apakahSesi3Selesai ? 'kartu-unit--selesai' : 'kartu-unit--terbuka'}">
        <div class="kartu-unit__kepala">
          <div>
            <span class="kartu-unit__nomor">${escapeHtml(teksAkhirUnit)}</span>
            <h2 class="kartu-unit__judul-id">${escapeHtml(teksBarisAkhir)}</h2>
          </div>
          ${apakahSesi3Selesai && !adaLanjutanS3 ? `
            <span class="penanda-status penanda-status--terdeteksi">
              <span class="penanda-status__ikon" aria-hidden="true">&#10003;</span>
              <span>${escapeHtml(teksLabelSelesai)}</span>
            </span>
          ` : `
            <span class="kartu-arab__label">${escapeHtml(labelStatusS3)}</span>
          `}
        </div>
        <button type="button" id="tombol-sesi3-s03" class="tombol tombol--utama">
          ${escapeHtml(labelTombolS3)}
        </button>
      </li>
    ` : `
      <li class="kartu-unit kartu-unit--terkunci">
        <div class="kartu-unit__kepala">
          <div>
            <span class="kartu-unit__nomor">${escapeHtml(teksAkhirUnit)}</span>
            <h2 class="kartu-unit__judul-id">${escapeHtml(teksBarisAkhir)}</h2>
          </div>
          <span class="penanda-status penanda-status--menunggu">
            <span class="penanda-status__ikon" aria-hidden="true">&#128274;</span>
            <span>${escapeHtml(teksLabelTerkunci)}</span>
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
          <button type="button" id="tautan-beranda-s03" class="tautan-aksi tautan-aksi-tombol" style="width: auto; padding-inline: var(--jarak-2);">
            ${escapeHtml(teksTautanBeranda)}
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

    async function muatDanArahkanBlok(idBlok, tentukanTujuan) {
      const blokData = await muatBlokKonten(idBlok, {
        arahkanKeS91: true,
        asal: 'S-03',
        tujuan: 'S-03',
        unit: infoUnit.id
      });
      if (!blokData) return;

      state.unit_aktif = infoUnit.id;
      state.blok_aktif = blokData.id;

      kirimAtauAntre(
        'catat',
        { jenis: 'aktivitas', aktivitas: 'blok_dipilih', unit: infoUnit.no, blok: blokData.id },
        `Pilih blok ${blokData.id}`,
        'ANGKA'
      ).catch(() => {});

      await tentukanTujuan(blokData);
    }

    const tombolBlok = Array.from(wadah.querySelectorAll('.tombol-pilih-blok-s03'));
    tombolBlok.forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        const idBlok = btn.getAttribute('data-blok') || `${infoUnit.id}-BA`;
        const aksi = btn.getAttribute('data-aksi') || 'mulai';
        const lvBlok = Number(btn.getAttribute('data-lv') || 1);
        btn.disabled = true;
        btn.textContent = 'Memuat…';

        await muatDanArahkanBlok(idBlok, async (blokData) => {
          const sesi1Sudah = blokSesi1Selesai.includes(blokData.id) || lvBlok > 0;
          if (aksi === 'lanjut' && sesi1Sudah) {
            const kemS2 = await ambilKemajuanSesi2(state.kode_siswa || 'tamu', blokData.id);
            if (kemS2 && kemS2.pemanasanSelesai) {
              const layarLv = lvBlok >= 3 ? 'S-33' : (lvBlok === 2 ? 'S-32' : 'S-31');
              arahKe(layarLv, {
                unit: infoUnit.id,
                blok: blokData.id,
                ...(lvBlok >= 3 ? { konteks: 'sesi2' } : {})
              });
              return;
            }
            arahKe('S-30', { unit: infoUnit.id, blok: blokData.id });
          } else {
            arahKe('S-20', { unit: infoUnit.id, blok: blokData.id });
          }
        });
      });
    });

    wadah.querySelectorAll('.tombol-buka-pilihan-s03').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idBlok = btn.getAttribute('data-blok') || '';
        blokPilihanTerbuka = blokPilihanTerbuka === idBlok ? '' : idBlok;
        gambar();
      });
    });

    wadah.querySelectorAll('.tombol-tuju-sesi-s03').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (btn.disabled) return;
        const idBlok = btn.getAttribute('data-blok') || `${infoUnit.id}-BA`;
        const layar = btn.getAttribute('data-tujuan-layar') || 'S-30';
        const ulang = btn.getAttribute('data-ulang') || '';
        btn.disabled = true;
        btn.textContent = 'Memuat…';

        await muatDanArahkanBlok(idBlok, async (blokData) => {
          arahKe(layar, {
            unit: infoUnit.id,
            blok: blokData.id,
            ...(layar === 'S-33' ? { konteks: 'sesi2' } : {}),
            ...(ulang ? { ulang } : {})
          });
        });
      });
    });

    const btnSesi3 = document.getElementById('tombol-sesi3-s03');
    if (btnSesi3) {
      btnSesi3.addEventListener('click', async () => {
        if (btnSesi3.disabled) return;
        btnSesi3.disabled = true;
        btnSesi3.textContent = 'Memuat…';

        const muhimmahData = await muatMuhimmahUnit(infoUnit.id, {
          arahkanKeS91: true,
          asal: 'S-03',
          tujuan: 'S-03',
          unit: infoUnit.id
        });
        if (!muhimmahData) return;

        state.unit_aktif = infoUnit.id;
        if (kemajuanS3 && kemajuanS3.sedangBerjalan) {
          const putaranAktif = [1, 2, 3].includes(Number(kemajuanS3.putaranAktif)) ? Number(kemajuanS3.putaranAktif) : 1;
          const idxAktif = Math.max(0, Number(kemajuanS3.indeksKartuAktif || 0));
          if (putaranAktif === 1 && idxAktif === 0 && !kemajuanS3.s12Sesi3Sudah) {
            arahKe('S-12', { konteks: 'sesi3', unit: infoUnit.id });
          } else {
            arahKe('S-33', { unit: infoUnit.id, konteks: `p${putaranAktif}`, item: String(idxAktif) });
          }
          return;
        }
        arahKe('S-40', { unit: infoUnit.id });
      });
    }
  }

  window.addEventListener('hashchange', () => {
    aktifDiLayar = false;
  }, { once: true });

  await gambar();

  // Periksa status buka-kunci unit ke server saat dibuka (FR-003, R-44, UJ-KEA-01)
  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const hasil = await panggilApi('status', { unit: infoUnit.no }, {
        tanpaUlang: true
      });
      if (hasil && hasil.ok && hasil.data) {
        await perbaruiStatusServer(hasil.data.status || hasil.data);
        if (aktifDiLayar) await gambar();
      }
    } catch (_) {}
  }
}
