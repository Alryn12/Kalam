/**
 * Layar S-34: Dengar Pasangan (Penutup Kartu Level 3) (situs/js/layar/s34-dengar-pasangan.js)
 * Tugas M1-I: TB-M1-09 & TB-M1-10
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
  pasangNavigasiSesi2,
  pilihBentukAudio,
  pilihBentukTeks,
  renderKepalaSesi2,
  siapkanKonteksSesi2,
  simpanKemajuanSesi2
} from './sesi2-bantu.js';

export async function renderS34({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi2('S-34', param);
  if (!konteks) return;

  const { kodeSiswa, unitId, blokId, blokData, kemajuan, wadah } = konteks;
  const konteksLayar = String((param && param.konteks) || 'sesi2').trim().toLowerCase();
  const daftarL3 = Array.isArray(blokData.l3) ? blokData.l3 : [];
  if (daftarL3.length === 0) {
    arahKe('S-35', { unit: unitId, blok: blokId, level: 3 });
    return;
  }

  let indeks = daftarL3.findIndex((k) => k.id === param.kartu);
  if (indeks < 0) {
    const idxParam = Number(param.indeks);
    indeks = !Number.isNaN(idxParam) && idxParam >= 0 && idxParam < daftarL3.length ? idxParam : 0;
  }

  const kartu = normalisasiKartuL3(daftarL3[indeks]);
  const adaKartuBerikut = indeks + 1 < daftarL3.length;

  let bagianDiputar = 0; // 0 = tidak aktif, 1 = slot1, 2 = slot2
  let statusPutar = ambilTeks('S-34', 'status_memutar') || 'Sedang memutar pasangan…';
  let sudahCatatDidengar = false;

  async function catatPasanganDidengarSekali() {
    if (sudahCatatDidengar) return;
    sudahCatatDidengar = true;
    await kirimKejadianSesi2(unitId, blokId, 'pasangan_didengar', 1, {
      butir: `${kartu.id}-P0`
    });
  }

  async function putarPasangan() {
    if (!konteks.masihAktif()) return;
    const bentuk = kemajuan.bentukLawan;
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
    const bentuk = kemajuan.bentukLawan;
    const teks1 = pilihBentukTeks(kartu.slot1 && kartu.slot1.model, bentuk);
    const teks2 = pilihBentukTeks(kartu.slot2 && kartu.slot2.model, bentuk);
    const lblKartu = (ambilTeks('S-33', 'penanda_kartu') || 'Kartu {n} dari {total}')
      .replace('{n}', String(indeks + 1))
      .replace('{total}', String(daftarL3.length));
    const petunjuk = ambilTeks('S-34', 'petunjuk') || 'Dengarkan kedua bagian kartu secara berurutan. Belum ada tugas.';
    const lblB1 = ambilTeks('S-34', 'label_bagian_1') || 'Bagian 1';
    const lblB2 = ambilTeks('S-34', 'label_bagian_2') || 'Bagian 2';
    const lblPutarLagi = ambilTeks('S-34', 'tombol_putar_lagi') || 'Putar lagi';
    const lblTombolUtama = adaKartuBerikut
      ? (ambilTeks('S-34', 'tombol') || 'Kartu berikutnya')
      : (ambilTeks('S-34', 'tombol_kartu_terakhir') || 'Selesai');

    wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${renderKepalaSesi2(konteks, 'S-34')}

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
    pasangNavigasiSesi2(konteks, () => {
      hentikanAudioModel();
      putarPasangan();
    });

    const btnPutarLagi = wadah.querySelector('#s34-tombol-putar-lagi');
    if (btnPutarLagi) {
      btnPutarLagi.addEventListener('click', () => putarPasangan());
    }

    const btnLanjut = wadah.querySelector('#s34-tombol-lanjut');
    if (btnLanjut) {
      btnLanjut.addEventListener('click', async () => {
        btnLanjut.disabled = true;
        hentikanAudioModel();
        await catatPasanganDidengarSekali();
        if (!konteks.masihAktif()) return;

        if (adaKartuBerikut) {
          arahKe('S-33', {
            unit: unitId,
            blok: blokId,
            item: String(indeks + 1),
            konteks: konteksLayar
          });
        } else {
          kemajuan.level[3].ulangAktif = false;
          kemajuan.level[3].selesaiUlang = {};
          kemajuan.level[3].indeksAktif = 0;
          await simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan);
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
