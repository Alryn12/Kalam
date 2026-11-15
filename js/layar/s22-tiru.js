/**
 * Layar S-22: Tab Tiru (Shadowing) (situs/js/layar/s22-tiru.js)
 * Tugas M1-G: TB-M1-08 · Acuan: SRS-3 FR-016, BP-1, BP-4 R-10, BP-6
 */

import { ambilTeks } from '../state.js';
import { hentikanAudioModel, putarDaftarAudioModel } from '../audio-model.js';
import { arahKe } from '../router.js';
import { escapeHtml } from './tahap0-bantu.js';
import {
  catatKejadianSesi1,
  folderAudioUnit,
  pasangNavigasiSesi1,
  pilihBentukAudio,
  pilihBentukTeks,
  renderFooterLanjutRefleksi,
  renderKepalaSesi1,
  siapkanKonteksSesi1
} from './sesi1-bantu.js';

export async function renderS22({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi1('S-22', param, 'tiru');
  if (!konteks) return;

  const { unitId, blokId, blokData, kemajuan, wadah } = konteks;
  const daftarTiru = Array.isArray(blokData.tiru) ? blokData.tiru : [];
  let indeksAktif = 0;
  let kecepatan = 0.75; // Sesuai FR-016: 0,75x dulu lalu 1x
  let putaranCount = 0;

  function tampilkanStatusAudio(hasil) {
    const el = wadah.querySelector('#status-audio-s22');
    if (!el || !hasil) return;
    el.textContent = hasil.status === 'penanda'
      ? (ambilTeks('S-20', 'penanda_audio_model') || 'Memutar nada bantu sementara (rekaman model sedang disiapkan).')
      : '';
  }

  async function putarGiliran(idx) {
    const butir = daftarTiru[idx];
    if (!butir) return;
    indeksAktif = idx;
    lukis();
    const daftarId = pilihBentukAudio(butir.audio, kemajuan.bentukLawan);
    const hasil = await putarDaftarAudioModel(daftarId, folderAudioUnit(unitId), { kecepatan });
    if (hasil.status !== 'berhenti') {
      putaranCount += 1;
      catatKejadianSesi1(unitId, blokId, 'putaran_tiru', putaranCount, { butir: `${blokId}-T${butir.no}` });
    }
    tampilkanStatusAudio(hasil);
  }

  function lukis() {
    const bentuk = kemajuan.bentukLawan;
    const butirAktif = daftarTiru[indeksAktif] || daftarTiru[0] || {};
    const teksArab = pilihBentukTeks(butirAktif.arab, bentuk);
    const lblGiliran = (ambilTeks('S-22', 'label_giliran') || 'Giliran {n} dari {total}')
      .replace('{n}', String(daftarTiru.length ? indeksAktif + 1 : 0))
      .replace('{total}', String(daftarTiru.length));
    const lblPelan = ambilTeks('S-22', 'tombol_pelan') || 'Pelan 0,75x';
    const lblBiasa = ambilTeks('S-22', 'tombol_biasa') || 'Biasa 1x';
    const lblUlang = ambilTeks('S-22', 'tombol_putar_ulang') || 'Putar ulang';
    const lblBerikut = ambilTeks('S-22', 'tombol_berikutnya') || 'Giliran berikutnya';
    const lblRekam = ambilTeks('S-22', 'tombol_ke_rekam') || 'Lanjut ke tab Rekam';
    const pesanAktif = ambilTeks('S-22', 'pesan_rekam_aktif') || 'Tab Rekam sudah aktif. Kamu bisa langsung mencoba atau mengulang giliran lagi.';

    const daftarHtml = daftarTiru.map((t, idx) => {
      const arab = pilihBentukTeks(t.arab, bentuk);
      const aktif = idx === indeksAktif;
      return `
        <button
          type="button"
          class="pilihan-giliran ${aktif ? 'pilihan-giliran--terpilih' : ''}"
          data-pilih-tiru="${idx}"
          aria-pressed="${aktif}"
        >
          <span class="teks-keterangan" style="min-width: 28px;">${idx + 1}.</span>
          <span class="teks-arab" lang="ar" dir="rtl" style="flex: 1; text-align: right;">${escapeHtml(arab)}</span>
        </button>
      `;
    }).join('');

    wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${renderKepalaSesi1(konteks, 'S-22')}

        <div class="pesan-hangat pesan-hangat--aksen" role="status">
          <p class="pesan-hangat__isi">${escapeHtml(pesanAktif)}</p>
        </div>

        <article class="kartu-arab kartu-arab--aktif">
          <div class="kartu-arab__kepala">
            <span class="lencana-penanda-audio">${escapeHtml(lblGiliran)}</span>
          </div>
          <div class="kartu-arab__kotak-kalimat">
            <p class="teks-arab teks-arab--besar teks-arab--tengah" lang="ar" dir="rtl" style="margin: 0;">${escapeHtml(teksArab)}</p>
          </div>
          <div class="baris-kontrol" role="group" aria-label="Pilih kecepatan tiru">
            <button type="button" class="tombol tombol--sekunder ${kecepatan === 0.75 ? 'tombol--terpilih' : ''}" data-laju-s22="0.75" aria-pressed="${kecepatan === 0.75}">
              ${escapeHtml(lblPelan)}
            </button>
            <button type="button" class="tombol tombol--sekunder ${kecepatan === 1 ? 'tombol--terpilih' : ''}" data-laju-s22="1" aria-pressed="${kecepatan === 1}">
              ${escapeHtml(lblBiasa)}
            </button>
          </div>
          <div class="baris-kontrol">
            <button type="button" id="tombol-ulang-s22" class="tombol tombol--utama">${escapeHtml(lblUlang)}</button>
            <button type="button" id="tombol-berikut-s22" class="tombol tombol--sekunder">${escapeHtml(lblBerikut)}</button>
          </div>
        </article>

        <p id="status-audio-s22" class="teks-keterangan" role="status" style="margin: 0; min-height: 1.2em;"></p>

        <div style="display: flex; flex-direction: column; gap: var(--jarak-2);" role="list" aria-label="Daftar giliran dialog">
          ${daftarHtml}
        </div>

        <button type="button" id="tombol-ke-rekam-s22" class="tombol tombol--utama">
          ${escapeHtml(lblRekam)}
        </button>

        ${renderFooterLanjutRefleksi(konteks)}
      </section>
    `;

    pasangEvent();
  }

  function pasangEvent() {
    pasangNavigasiSesi1(konteks, () => lukis());

    wadah.querySelectorAll('[data-laju-s22]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nilai = Number(btn.getAttribute('data-laju-s22') || 1);
        kecepatan = nilai;
        catatKejadianSesi1(unitId, blokId, 'kecepatan_tiru', nilai);
        putarGiliran(indeksAktif);
      });
    });

    const btnUlang = wadah.querySelector('#tombol-ulang-s22');
    if (btnUlang) {
      btnUlang.addEventListener('click', () => putarGiliran(indeksAktif));
    }

    const btnBerikut = wadah.querySelector('#tombol-berikut-s22');
    if (btnBerikut) {
      btnBerikut.addEventListener('click', () => {
        const berikut = (indeksAktif + 1) % Math.max(1, daftarTiru.length);
        putarGiliran(berikut);
      });
    }

    wadah.querySelectorAll('[data-pilih-tiru]').forEach((btn) => {
      btn.addEventListener('click', () => {
        putarGiliran(Number(btn.getAttribute('data-pilih-tiru')));
      });
    });

    const btnKeRekam = wadah.querySelector('#tombol-ke-rekam-s22');
    if (btnKeRekam) {
      btnKeRekam.addEventListener('click', () => {
        hentikanAudioModel();
        arahKe('S-23', { unit: unitId, blok: blokId });
      });
    }
  }

  lukis();
}
