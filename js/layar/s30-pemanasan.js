/**
 * Layar S-30: Sesi 2 Pemanasan (situs/js/layar/s30-pemanasan.js)
 * Tugas M1-I: TB-M1-09 & TB-M1-10
 * Acuan: SRS-3 FR-019; BP-1 S-30; BP-4 R-05; BP-6 S-30
 */

import { hentikanAudioModel } from '../audio-model.js';
import { arahKe } from '../router.js';
import { ambilTeks } from '../state.js';
import { escapeHtml } from './tahap0-bantu.js';
import {
  kirimKejadianSesi2,
  pasangNavigasiSesi2,
  pilihBentukAudio,
  pilihBentukTeks,
  putarAudioModelSesi2,
  renderKepalaSesi2,
  siapkanKonteksSesi2,
  simpanKemajuanSesi2
} from './sesi2-bantu.js';

const KUNJUNGAN_S12_SESI2 = new Set();

function susunDaftarUngkapanPemanasan(blokData) {
  const kataKunci = Array.isArray(blokData.kata_kunci) ? blokData.kata_kunci : [];
  const tiru = Array.isArray(blokData.tiru) ? blokData.tiru : [];
  const hasil = [];
  const sudahId = new Set();

  for (const kk of kataKunci) {
    if (hasil.length >= 5) break;
    hasil.push({
      id: kk.id_pasangan || `kk-${hasil.length}`,
      fungsi: kk.fungsi_id || '',
      arab: kk.frasa,
      audio: kk.dibunyikan
    });
    if (kk.id_pasangan) sudahId.add(kk.id_pasangan);
  }

  if (hasil.length < 3) {
    for (const t of tiru) {
      if (hasil.length >= 5) break;
      const kunciTeks = JSON.stringify(t.arab || '');
      if (t.id_pasangan && sudahId.has(t.id_pasangan) && hasil.length >= 3) continue;
      if (hasil.some((h) => JSON.stringify(h.arab || '') === kunciTeks)) continue;
      hasil.push({
        id: `tiru-${t.no || hasil.length}`,
        fungsi: '',
        arab: t.arab,
        audio: t.audio
      });
    }
  }

  const batas = Math.min(5, Math.max(Math.min(3, hasil.length), hasil.length));
  return hasil.slice(0, batas);
}

export async function renderS30({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi2('S-30', param);
  if (!konteks) return;

  const { kodeSiswa, unitId, blokId, blokData, kemajuan, wadah } = konteks;
  const daftarUngkapan = susunDaftarUngkapanPemanasan(blokData);
  let indeksAktif = -1;
  let pesanAudio = '';
  let sedangLanjut = false;

  function lukis() {
    const bentuk = kemajuan.bentukLawan;
    const petunjuk = ambilTeks('S-30', 'petunjuk') ||
      'Ketuk dan dengarkan ungkapan dari Sesi 1. Belum ada tugas.';
    const tombolMulai = ambilTeks('S-30', 'tombol') || 'Mulai Level 1';

    const daftarHtml = daftarUngkapan.map((item, idx) => {
      const arab = pilihBentukTeks(item.arab, bentuk);
      const aktif = idx === indeksAktif;
      return `
        <button
          type="button"
          class="kartu-arab tombol-kartu-arab ${aktif ? 'kartu-arab--aktif' : ''}"
          data-putar-pemanasan="${idx}"
        >
          <div class="kartu-arab__kepala">
            <span class="kartu-arab__label">${escapeHtml(item.fungsi || `Ungkapan ${idx + 1}`)}</span>
            <span class="teks-keterangan" style="margin: 0;">&#128266; Dengar</span>
          </div>
          <div class="kartu-arab__kotak-kalimat">
            <p class="teks-arab teks-arab--besar teks-arab--tengah" lang="ar" dir="rtl" style="margin: 0;">
              ${escapeHtml(arab)}
            </p>
          </div>
        </button>
      `;
    }).join('');

    wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${renderKepalaSesi2(konteks, 'S-30')}

        <section class="kartu" aria-label="Daftar ungkapan pemanasan">
          <p class="teks-instruksi" style="margin: 0;">${escapeHtml(petunjuk)}</p>
          <p id="status-audio-s30" class="teks-keterangan" role="status" style="margin: 0; min-height: 1.2em;">
            ${escapeHtml(pesanAudio)}
          </p>
          <div style="display: flex; flex-direction: column; gap: var(--jarak-3);">
            ${daftarHtml}
          </div>
        </section>

        <div class="baris-tombol">
          <button type="button" id="tombol-mulai-l1-s30" class="tombol tombol--utama">
            ${escapeHtml(tombolMulai)}
          </button>
        </div>
      </section>
    `;

    pasangEvent();
  }

  function pasangEvent() {
    pasangNavigasiSesi2(konteks, () => lukis());

    wadah.querySelectorAll('[data-putar-pemanasan]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const idx = Number(btn.getAttribute('data-putar-pemanasan'));
        const item = daftarUngkapan[idx];
        if (!item) return;
        indeksAktif = idx;
        pesanAudio = '';
        lukis();
        const daftarId = pilihBentukAudio(item.audio, kemajuan.bentukLawan);
        const hasil = await putarAudioModelSesi2(daftarId, unitId, 1);
        if (!konteks.masihAktif()) return;
        if (hasil.status === 'penanda') {
          pesanAudio = ambilTeks('S-20', 'penanda_audio_model') ||
            'Memutar nada bantu sementara (rekaman model sedang disiapkan).';
          lukis();
        }
      });
    });

    const btnMulai = wadah.querySelector('#tombol-mulai-l1-s30');
    if (btnMulai) {
      btnMulai.addEventListener('click', async () => {
        if (sedangLanjut) return;
        sedangLanjut = true;
        btnMulai.disabled = true;
        hentikanAudioModel();

        const kunciKunjungan = `${kodeSiswa}:${blokId}`;
        const sudahS12Kunjungan = KUNJUNGAN_S12_SESI2.has(kunciKunjungan);

        kemajuan.pemanasanSelesai = true;
        if (!sudahS12Kunjungan) {
          kemajuan.s12Sesi2Sudah = true;
          KUNJUNGAN_S12_SESI2.add(kunciKunjungan);
        }
        await simpanKemajuanSesi2(kodeSiswa, blokId, kemajuan);
        await kirimKejadianSesi2(unitId, blokId, 'pemanasan_selesai', 1, {
          butir: `${blokId}-S2`
        });

        if (!konteks.masihAktif()) return;
        if (sudahS12Kunjungan) {
          arahKe('S-31', { unit: unitId, blok: blokId });
        } else {
          arahKe('S-12', { konteks: 'sesi2', unit: unitId, blok: blokId });
        }
      });
    }
  }

  lukis();
}

export function tandaiS12Sesi2Dikunjungi(kodeSiswa, blokId) {
  KUNJUNGAN_S12_SESI2.add(`${kodeSiswa || 'tamu'}:${blokId}`);
}
