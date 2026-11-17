/**
 * Layar S-34: Dengar Pasangan (Penutup Kartu Level 3 — Sesi 2 & Sesi 3) (situs/js/layar/s34-dengar-pasangan.js)
 * Tugas M1-I (TB-M1-09, TB-M1-10) & M2-A (TB-M2-02)
 * Acuan: SRS-3 FR-023; BP-1 S-34; BP-6 S-34
 */

import { hentikanAudioModel, putarDaftarAudioModel } from '../audio-model.js';
import { arahKe } from '../router.js';
import { ambilTeks } from '../state.js';
import { escapeHtml } from './tahap0-bantu.js';
import {
  folderAudioUnit,
  kirimKejadianSesi2,
  normalisasiKartuL3,
  nomorUnitDariId,
  pasangNavigasiSesi2,
  pilihBentukAudio,
  pilihBentukTeks,
  renderKepalaSesi2,
  siapkanKonteksSesi2,
  simpanKemajuanSesi2
} from './sesi2-bantu.js';
import {
  hitungRingkasanSesi3,
  siapkanKonteksSesi3,
  simpanKemajuanSesi3,
  susunRangkaianFinalSesi3
} from './sesi3-bantu.js';

export async function renderS34({ param = {} } = {}) {
  const konteksLayar = String((param && param.konteks) || 'sesi2').trim().toLowerCase();
  const adalahSesi3 = ['p1', 'p2', 'p3'].includes(konteksLayar);
  const putaranNo = adalahSesi3 ? Number(konteksLayar.slice(1)) : 0;

  let konteks = null;
  let konteksS3 = null;
  let kodeSiswa = 'tamu';
  let unitId = 'U1';
  let blokId = '';
  let blokData = null;
  let daftarKartu = [];
  let indeks = 0;
  let kartu = null;
  let itemRangkaian = null;
  let bentukSaatIni = 'putra';

  if (adalahSesi3) {
    konteksS3 = await siapkanKonteksSesi3('S-34', param);
    if (!konteksS3) return;
    konteks = konteksS3;
    kodeSiswa = konteksS3.kodeSiswa;
    unitId = konteksS3.unitId;

    const { muhimmah, petaKartuL3, kemajuanS3, state } = konteksS3;
    if (!Array.isArray(kemajuanS3.rangkaian) || kemajuanS3.rangkaian.length === 0) {
      kemajuanS3.rangkaian = susunRangkaianFinalSesi3(muhimmah, petaKartuL3, kemajuanS3.ikonTeman);
    }
    daftarKartu = kemajuanS3.rangkaian;
    if (daftarKartu.length === 0) {
      arahKe('S-40', { unit: unitId });
      return;
    }

    indeks = daftarKartu.findIndex((r) => r.id_kartu === String(param.kartu || '').toUpperCase());
    if (indeks < 0) {
      const idxParam = Number(param.indeks);
      indeks = !Number.isNaN(idxParam) && idxParam >= 0 && idxParam < daftarKartu.length ? idxParam : 0;
    }

    itemRangkaian = daftarKartu[indeks];
    const entriPeta = petaKartuL3[String(itemRangkaian.id_kartu).toUpperCase()];
    if (!entriPeta || !entriPeta.kartu) {
      arahKe('S-40', { unit: unitId });
      return;
    }
    kartu = normalisasiKartuL3(entriPeta.kartu);
    blokId = itemRangkaian.blok_id || entriPeta.blokId;
    blokData = entriPeta.blokData;

    const bentukGuru = (state.status_server && state.status_server.konfig_publik &&
      state.status_server.konfig_publik.bentuk_sapaan_guru) === 'putri' ? 'putri' : 'putra';
    bentukSaatIni = itemRangkaian.pilih_satu === 'teman' || kartu.pilih_satu === 'teman'
      ? kemajuanS3.ikonTeman
      : bentukGuru;
  } else {
    konteks = await siapkanKonteksSesi2('S-34', param);
    if (!konteks) return;
    kodeSiswa = konteks.kodeSiswa;
    unitId = konteks.unitId;
    blokId = konteks.blokId;
    blokData = konteks.blokData;
    const daftarL3 = Array.isArray(blokData.l3) ? blokData.l3 : [];
    if (daftarL3.length === 0) {
      arahKe('S-35', { unit: unitId, blok: blokId, level: 3 });
      return;
    }

    indeks = daftarL3.findIndex((k) => k.id === param.kartu);
    if (indeks < 0) {
      const idxParam = Number(param.indeks);
      indeks = !Number.isNaN(idxParam) && idxParam >= 0 && idxParam < daftarL3.length ? idxParam : 0;
    }

    daftarKartu = daftarL3;
    kartu = normalisasiKartuL3(daftarL3[indeks]);
    bentukSaatIni = konteks.kemajuan.bentukLawan;
  }

  const adaKartuBerikut = indeks + 1 < daftarKartu.length;

  let bagianDiputar = 0; // 0 = tidak aktif, 1 = slot1, 2 = slot2
  let statusPutar = ambilTeks('S-34', 'status_memutar') || 'Sedang memutar pasangan…';
  let sudahCatatDidengar = false;

  async function catatPasanganDidengarSekali() {
    if (sudahCatatDidengar) return;
    sudahCatatDidengar = true;
    const butir = adalahSesi3 ? `${kartu.id}-P${putaranNo}` : `${kartu.id}-P0`;
    await kirimKejadianSesi2(unitId, blokId, 'pasangan_didengar', 1, { butir });
  }

  async function putarPasangan() {
    if (!konteks.masihAktif()) return;
    const bentuk = adalahSesi3 ? bentukSaatIni : konteks.kemajuan.bentukLawan;
    const audioS1 = pilihBentukAudio(kartu.slot1 && kartu.slot1.audio, bentuk);
    const audioS2 = pilihBentukAudio(kartu.slot2 && kartu.slot2.audio, bentuk);
    const gabungan = [...audioS1, ...audioS2];
    const batasS1 = audioS1.length;

    bagianDiputar = gabungan.length > 0 ? 1 : 0;
    statusPutar = ambilTeks('S-34', 'status_memutar') || 'Sedang memutar pasangan…';
    lukis();

    if (gabungan.length === 0) {
      await catatPasanganDidengarSekali();
      bagianDiputar = 0;
      statusPutar = ambilTeks('S-34', 'status_selesai_putar') || 'Pasangan selesai diputar.';
      if (konteks.masihAktif()) lukis();
      return;
    }

    const hasil = await putarDaftarAudioModel(gabungan, folderAudioUnit(unitId), {
      kecepatan: 1,
      padaButir: (idxButir) => {
        if (!konteks.masihAktif()) return;
        bagianDiputar = idxButir < batasS1 ? 1 : 2;
        lukis();
      }
    });

    if (!konteks.masihAktif()) return;
    if (hasil.status !== 'berhenti') {
      await catatPasanganDidengarSekali();
      bagianDiputar = 0;
      statusPutar = hasil.status === 'penanda'
        ? (ambilTeks('S-20', 'penanda_audio_model') || 'Memutar nada bantu sementara (rekaman model sedang disiapkan).')
        : (ambilTeks('S-34', 'status_selesai_putar') || 'Pasangan selesai diputar.');
      lukis();
    }
  }

  function lukis() {
    const bentuk = adalahSesi3 ? bentukSaatIni : konteks.kemajuan.bentukLawan;
    const teks1 = pilihBentukTeks(kartu.slot1 && kartu.slot1.model, bentuk);
    const teks2 = pilihBentukTeks(kartu.slot2 && kartu.slot2.model, bentuk);
    const lblKartu = (ambilTeks('S-33', 'penanda_kartu') || 'Kartu {n} dari {total}')
      .replace('{n}', String(indeks + 1))
      .replace('{total}', String(daftarKartu.length));
    const petunjuk = ambilTeks('S-34', 'petunjuk') || 'Dengarkan kedua bagian kartu secara berurutan. Belum ada tugas.';
    const lblB1 = ambilTeks('S-34', 'label_bagian_1') || 'Bagian 1';
    const lblB2 = ambilTeks('S-34', 'label_bagian_2') || 'Bagian 2';
    const lblPutarLagi = ambilTeks('S-34', 'tombol_putar_lagi') || 'Putar lagi';

    let lblTombolUtama = '';
    if (adaKartuBerikut) {
      lblTombolUtama = ambilTeks('S-34', 'tombol') || 'Kartu berikutnya';
    } else if (adalahSesi3 && putaranNo < 3) {
      lblTombolUtama = ambilTeks('S-34', 'tombol_putaran_berikutnya', { n: putaranNo + 1 }) ||
        `Lanjut ke Putaran ${putaranNo + 1}`;
    } else {
      lblTombolUtama = ambilTeks('S-34', 'tombol_kartu_terakhir') || 'Selesai';
    }

    const pesanPenutupPutaran = (adalahSesi3 && !adaKartuBerikut && putaranNo < 3)
      ? (ambilTeks('S-34', 'penutup_putaran', { n: putaranNo }) ||
        `Putaran ${putaranNo} selesai. Lanjut ke putaran berikutnya.`)
      : '';

    const kepalaHtml = adalahSesi3
      ? `
        <section class="kartu" aria-labelledby="judul-s34-s3">
          <div class="daftar-status" style="justify-content: space-between; align-items: center;">
            <button type="button" id="s34-kembali-s40" class="tautan-aksi" style="width: auto; padding-inline: 0; background: transparent; border: none; cursor: pointer;">
              &larr; ${escapeHtml(ambilTeks('S-40', 'tombol_kembali_unit') || 'Kembali ke pengantar Sesi 3')}
            </button>
            <span class="kartu-arab__label">Putaran ${putaranNo} dari 3 · Unit ${nomorUnitDariId(unitId)}</span>
          </div>
          <h1 id="judul-s34-s3" class="judul-layar" style="margin: 0;">${escapeHtml(ambilTeks('S-34', 'judul') || 'Dengar pasangannya')}</h1>
        </section>
      `
      : renderKepalaSesi2(konteks, 'S-34');

    konteks.wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${kepalaHtml}

        <section class="kartu" aria-label="${escapeHtml(kartu.fungsi || 'Pasangan kartu')}">
          <div class="kartu-arab__kepala">
            <div>
              <span class="kartu-unit__nomor">${escapeHtml(lblKartu)}</span>
              <h2 class="subjudul-layar" style="margin: 2px 0 0 0;">${escapeHtml(kartu.fungsi || '')}</h2>
            </div>
          </div>

          <p class="teks-instruksi" style="margin: 0;">${escapeHtml(petunjuk)}</p>
          <p class="teks-keterangan" role="status" style="margin: 0; min-height: 1.2em;">${escapeHtml(statusPutar)}</p>

          <article class="kartu-arab ${bagianDiputar === 1 ? 'kartu-arab--aktif' : ''}">
            <div class="kartu-arab__kepala">
              <span class="kartu-arab__label">${escapeHtml(lblB1)}</span>
            </div>
            <div class="kartu-arab__kotak-kalimat">
              <p class="teks-arab teks-arab--besar teks-arab--tengah" lang="ar" dir="rtl" style="margin: 0;">
                ${escapeHtml(teks1)}
              </p>
            </div>
          </article>

          <article class="kartu-arab ${bagianDiputar === 2 ? 'kartu-arab--aktif' : ''}">
            <div class="kartu-arab__kepala">
              <span class="kartu-arab__label">${escapeHtml(lblB2)}</span>
            </div>
            <div class="kartu-arab__kotak-kalimat">
              <p class="teks-arab teks-arab--besar teks-arab--tengah" lang="ar" dir="rtl" style="margin: 0;">
                ${escapeHtml(teks2)}
              </p>
            </div>
          </article>

          ${pesanPenutupPutaran ? `
            <div class="pesan-hangat pesan-hangat--aksen" role="status">
              <p class="pesan-hangat__isi" style="font-weight: 600;">${escapeHtml(pesanPenutupPutaran)}</p>
            </div>
          ` : ''}

          <div class="baris-tombol">
            <button type="button" id="s34-tombol-putar-lagi" class="tombol tombol--sekunder">
              &#128266; ${escapeHtml(lblPutarLagi)}
            </button>
            <button type="button" id="s34-tombol-lanjut" class="tombol tombol--utama">
              ${escapeHtml(lblTombolUtama)}
            </button>
          </div>
        </section>
      </section>
    `;

    pasangEvent();
  }

  function pasangEvent() {
    if (adalahSesi3) {
      const btnKembaliS40 = konteks.wadah.querySelector('#s34-kembali-s40');
      if (btnKembaliS40) {
        btnKembaliS40.addEventListener('click', () => {
          hentikanAudioModel();
          arahKe('S-40', { unit: unitId });
        });
      }
    } else {
      pasangNavigasiSesi2(konteks, () => {
        hentikanAudioModel();
        putarPasangan();
      });
    }

    const btnPutarLagi = konteks.wadah.querySelector('#s34-tombol-putar-lagi');
    if (btnPutarLagi) {
      btnPutarLagi.addEventListener('click', () => putarPasangan());
    }

    const btnLanjut = konteks.wadah.querySelector('#s34-tombol-lanjut');
    if (btnLanjut) {
      btnLanjut.addEventListener('click', async () => {
        btnLanjut.disabled = true;
        hentikanAudioModel();
        await catatPasanganDidengarSekali();
        if (!konteks.masihAktif()) return;

        if (adalahSesi3) {
          const { kemajuanS3 } = konteksS3;
          if (adaKartuBerikut) {
            kemajuanS3.putaranAktif = putaranNo;
            kemajuanS3.indeksKartuAktif = indeks + 1;
            await simpanKemajuanSesi3(kodeSiswa, unitId, kemajuanS3);
            if (konteks.masihAktif()) {
              arahKe('S-33', {
                unit: unitId,
                item: String(indeks + 1),
                konteks: konteksLayar
              });
            }
          } else if (putaranNo < 3) {
            const putaranBerikut = putaranNo + 1;
            kemajuanS3.putaranAktif = putaranBerikut;
            kemajuanS3.indeksKartuAktif = 0;
            await simpanKemajuanSesi3(kodeSiswa, unitId, kemajuanS3);
            if (konteks.masihAktif()) {
              arahKe('S-33', {
                unit: unitId,
                item: '0',
                konteks: `p${putaranBerikut}`
              });
            }
          } else {
            kemajuanS3.sedangBerjalan = false;
            kemajuanS3.putaranAktif = 3;
            kemajuanS3.indeksKartuAktif = 0;
            kemajuanS3.ringkasanTerakhir = hitungRingkasanSesi3(kemajuanS3);
            await simpanKemajuanSesi3(kodeSiswa, unitId, kemajuanS3);
            if (konteks.masihAktif()) {
              arahKe('S-41', { unit: unitId });
            }
          }
          return;
        }

        if (adaKartuBerikut) {
          arahKe('S-33', {
            unit: unitId,
            blok: blokId,
            item: String(indeks + 1),
            konteks: konteksLayar
          });
        } else {
          konteks.kemajuan.level[3].ulangAktif = false;
          konteks.kemajuan.level[3].selesaiUlang = {};
          konteks.kemajuan.level[3].indeksAktif = 0;
          await simpanKemajuanSesi2(kodeSiswa, blokId, konteks.kemajuan);
          if (konteks.masihAktif()) {
            arahKe('S-35', { unit: unitId, blok: blokId, level: 3 });
          }
        }
      });
    }
  }

  lukis();
  putarPasangan().catch(() => {
    bagianDiputar = 0;
    if (konteks.masihAktif()) lukis();
  });
}
