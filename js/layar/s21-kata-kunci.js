/**
 * Layar S-21: Tab Kata Kunci (situs/js/layar/s21-kata-kunci.js)
 * Tugas M1-G: TB-M1-08 · Acuan: SRS-3 FR-015, BP-1, BP-6
 */

import { ambilTeks } from '../state.js';
import { putarDaftarAudioModel } from '../audio-model.js';
import { escapeHtml } from './tahap0-bantu.js';
import {
  catatKejadianSesi1,
  folderAudioUnit,
  pasangNavigasiSesi1,
  pilihBentukAudio,
  pilihBentukTeks,
  ratakanBentukTeks,
  renderFooterLanjutRefleksi,
  renderKepalaSesi1,
  siapkanKonteksSesi1
} from './sesi1-bantu.js';

export async function renderS21({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi1('S-21', param, 'kata_kunci');
  if (!konteks) return;

  const { unitId, blokId, blokData, kemajuan, wadah } = konteks;
  const daftarKartu = Array.isArray(blokData.kata_kunci) ? blokData.kata_kunci : [];
  const daftarPasangan = Array.isArray(blokData.pasangan) ? blokData.pasangan : [];
  const daftarTiru = Array.isArray(blokData.tiru) ? blokData.tiru : [];
  const terbukaSet = new Set();
  let ketukanCount = 0;

  function cariAudioPasangan(idPasangan, bentuk) {
    const kk = daftarKartu.find((k) => k.id_pasangan === idPasangan);
    if (kk && kk.dibunyikan) return pilihBentukAudio(kk.dibunyikan, bentuk);
    return daftarTiru
      .filter((t) => t.id_pasangan === idPasangan)
      .flatMap((t) => pilihBentukAudio(t.audio, bentuk));
  }

  function tampilkanStatusAudio(hasil) {
    const el = wadah.querySelector('#status-audio-s21');
    if (!el || !hasil) return;
    el.textContent = hasil.status === 'penanda'
      ? (ambilTeks('S-20', 'penanda_audio_model') || 'Memutar nada bantu sementara (rekaman model sedang disiapkan).')
      : '';
  }

  function lukis() {
    const bentuk = kemajuan.bentukLawan;
    const lblDengar = ambilTeks('S-21', 'tombol_dengar') || 'Dengar';
    const lblPelan = ambilTeks('S-21', 'tombol_kartu') || 'Dengar pelan';
    const lblBuka = ambilTeks('S-21', 'tombol_ketuk_buka') || 'Ketuk untuk membuka kalimat Arab dan audio';
    const judulFungsi = ambilTeks('S-21', 'judul_kartu_fungsi') || 'Ungkapan inti';
    const judulPasangan = ambilTeks('S-21', 'judul_pasangan') || 'Pasangan tanya dan jawab';
    const lblTanya = ambilTeks('S-21', 'label_tanya') || 'Tanya / pembuka';
    const lblJawab = ambilTeks('S-21', 'label_jawab') || 'Jawab';
    const lblTanpaJawab = ambilTeks('S-21', 'label_tanpa_jawab') || 'Langsung dijawab dengan tindakan atau mengulang bagian yang belum jelas.';

    const kartuHtml = daftarKartu.map((kk, idx) => {
      const terbuka = terbukaSet.has(idx);
      const frasaArab = pilihBentukTeks(kk.frasa, bentuk);
      const daftarDibunyikan = ratakanBentukTeks(kk.teks_dibunyikan, bentuk)
        .filter((t) => t && t !== frasaArab);

      return `
        <article class="kartu-arab ${terbuka ? 'kartu-arab--aktif' : ''}">
          <button
            type="button"
            class="tombol tombol--sekunder"
            data-ketuk-kartu="${idx}"
            aria-expanded="${terbuka}"
            style="justify-content: space-between; text-align: left;"
          >
            <span>${escapeHtml(kk.fungsi_id || kk.id_pasangan)}</span>
            <span class="teks-keterangan">${terbuka ? '✓' : '+'}</span>
          </button>
          ${!terbuka ? `<p class="teks-keterangan" style="margin: 0;">${escapeHtml(lblBuka)}</p>` : `
            <div class="kartu-arab__kotak-kalimat" style="display: flex; flex-direction: column; gap: var(--jarak-2);">
              <p class="teks-arab teks-arab--besar" lang="ar" dir="rtl" style="margin: 0;">${escapeHtml(frasaArab)}</p>
              ${daftarDibunyikan.map((t) => `<p class="teks-arab" lang="ar" dir="rtl" style="margin: 0; color: var(--warna-teks-sekunder);">${escapeHtml(t)}</p>`).join('')}
            </div>
            <div class="baris-kontrol">
              <button type="button" class="tombol tombol--utama" data-putar-kk="${idx}" data-laju="1">${escapeHtml(lblDengar)}</button>
              <button type="button" class="tombol tombol--sekunder" data-putar-kk="${idx}" data-laju="0.75">${escapeHtml(lblPelan)}</button>
            </div>
          `}
        </article>
      `;
    }).join('');

    const pasanganHtml = daftarPasangan.map((p) => {
      const tanya = pilihBentukTeks((p.versi && p.versi.tanya) || p.tanya, bentuk);
      const jawab = p.jawab === null
        ? ''
        : pilihBentukTeks((p.versi && p.versi.jawab) || p.jawab, bentuk);
      const alt = Array.isArray(p.jawab_alternatif)
        ? ratakanBentukTeks(p.jawab_alternatif, bentuk).join(' · ')
        : '';

      return `
        <article class="kartu-arab">
          <div class="kartu-arab__kepala">
            <span class="kartu-arab__label">${escapeHtml(p.fungsi || p.id)}</span>
          </div>
          <div>
            <p class="teks-keterangan" style="margin: 0;">${escapeHtml(lblTanya)}</p>
            <p class="teks-arab" lang="ar" dir="rtl" style="margin: 0;">${escapeHtml(tanya)}</p>
          </div>
          <div>
            <p class="teks-keterangan" style="margin: 0;">${escapeHtml(lblJawab)}</p>
            ${jawab
              ? `<p class="teks-arab" lang="ar" dir="rtl" style="margin: 0;">${escapeHtml(jawab)}</p>`
              : `<p class="teks-keterangan" style="margin: 0;">${escapeHtml(lblTanpaJawab)}</p>`}
            ${alt && alt !== jawab ? `<p class="teks-arab" lang="ar" dir="rtl" style="margin: var(--jarak-1) 0 0 0;">${escapeHtml(alt)}</p>` : ''}
          </div>
          <div class="baris-kontrol">
            <button type="button" class="tombol tombol--sekunder" data-putar-pasangan="${escapeHtml(p.id)}" data-laju="1">${escapeHtml(lblDengar)}</button>
            <button type="button" class="tombol tombol--sekunder" data-putar-pasangan="${escapeHtml(p.id)}" data-laju="0.75">${escapeHtml(lblPelan)}</button>
          </div>
        </article>
      `;
    }).join('');

    wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${renderKepalaSesi1(konteks, 'S-21')}
        <p id="status-audio-s21" class="teks-keterangan" role="status" style="margin: 0; min-height: 1.2em;"></p>

        <section style="display: flex; flex-direction: column; gap: var(--jarak-3);" aria-label="${escapeHtml(judulFungsi)}">
          <h2 class="subjudul-layar">${escapeHtml(judulFungsi)}</h2>
          ${kartuHtml}
        </section>

        <section style="display: flex; flex-direction: column; gap: var(--jarak-3);" aria-label="${escapeHtml(judulPasangan)}">
          <h2 class="subjudul-layar">${escapeHtml(judulPasangan)}</h2>
          ${pasanganHtml}
        </section>

        ${renderFooterLanjutRefleksi(konteks)}
      </section>
    `;

    pasangEvent();
  }

  function pasangEvent() {
    pasangNavigasiSesi1(konteks, () => lukis());

    wadah.querySelectorAll('[data-ketuk-kartu]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.getAttribute('data-ketuk-kartu'));
        const kk = daftarKartu[idx];
        if (!kk) return;
        const akanDibuka = !terbukaSet.has(idx);
        if (akanDibuka) {
          terbukaSet.add(idx);
          ketukanCount += 1;
          catatKejadianSesi1(unitId, blokId, 'kartu_diketuk', ketukanCount, { butir: kk.id_pasangan });
        } else {
          terbukaSet.delete(idx);
        }
        lukis();
        if (akanDibuka) {
          const daftarId = pilihBentukAudio(kk.dibunyikan, kemajuan.bentukLawan);
          const hasil = await putarDaftarAudioModel(daftarId, folderAudioUnit(unitId), { kecepatan: 1 });
          tampilkanStatusAudio(hasil);
        }
      });
    });

    wadah.querySelectorAll('[data-putar-kk]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.getAttribute('data-putar-kk'));
        const laju = Number(btn.getAttribute('data-laju') || 1);
        const kk = daftarKartu[idx];
        if (!kk) return;
        const daftarId = pilihBentukAudio(kk.dibunyikan, kemajuan.bentukLawan);
        const hasil = await putarDaftarAudioModel(daftarId, folderAudioUnit(unitId), { kecepatan: laju });
        tampilkanStatusAudio(hasil);
      });
    });

    wadah.querySelectorAll('[data-putar-pasangan]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idPas = btn.getAttribute('data-putar-pasangan');
        const laju = Number(btn.getAttribute('data-laju') || 1);
        const daftarId = cariAudioPasangan(idPas, kemajuan.bentukLawan);
        const hasil = await putarDaftarAudioModel(daftarId, folderAudioUnit(unitId), { kecepatan: laju });
        tampilkanStatusAudio(hasil);
      });
    });
  }

  lukis();
}
