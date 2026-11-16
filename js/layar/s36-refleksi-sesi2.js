/**
 * Layar S-36: Refleksi Sesi 2 (situs/js/layar/s36-refleksi-sesi2.js)
 * Tugas M1-I: TB-M1-09 & TB-M1-10
 * Acuan: SRS-3 FR-025; BP-1 S-36; BP-6 S-36
 */

import { arahKe } from '../router.js';
import { ambilTeks, buatIdIdempoten } from '../state.js';
import { escapeHtml, kirimAtauAntre } from './tahap0-bantu.js';
import {
  kirimKejadianSesi2,
  nomorUnitDariId,
  pasangNavigasiSesi2,
  pilihBentukTeks,
  renderKepalaSesi2,
  siapkanKonteksSesi2
} from './sesi2-bantu.js';

export async function renderS36({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi2('S-36', param);
  if (!konteks) return;

  const { kodeSiswa, unitId, blokId, blokData, kemajuan, wadah } = konteks;
  const daftarKk = Array.isArray(blokData.kata_kunci) ? blokData.kata_kunci : [];

  let nilaiYakin = null;
  let idTersulit = null;
  let pesanPeringatan = '';
  let sedangMengirim = false;

  function lukis() {
    const bentuk = kemajuan.bentukLawan;
    const tanya1 = ambilTeks('S-36', 'pertanyaan_1') || 'Seberapa yakin kamu?';
    const labelSkala = ambilTeks('S-36', 'label_skala') ||
      ambilTeks('S-24', 'label_skala') ||
      '1 Belum yakin · 2 Sedikit yakin · 3 Cukup yakin · 4 Yakin · 5 Sangat yakin';
    const tanya2 = ambilTeks('S-36', 'pertanyaan_2') || 'Kalimat mana yang paling sulit?';
    const pilihanKhusus = ambilTeks('S-36', 'pilihan_khusus') || 'Tidak ada';
    const lblKirim = sedangMengirim
      ? (ambilTeks('S-36', 'label_mengirim') || 'Menyimpan…')
      : (ambilTeks('S-36', 'tombol_kirim') || 'Kirim');
    const lblLewati = ambilTeks('S-36', 'tombol_lewati') || 'Lewati';

    const tombolSkalaHtml = [1, 2, 3, 4, 5].map((n) => `
      <button
        type="button"
        class="tombol-skala ${nilaiYakin === n ? 'tombol-skala--terpilih' : ''}"
        data-yakin-s36="${n}"
        aria-pressed="${nilaiYakin === n}"
      >${n}</button>
    `).join('');

    const pilihanSulitHtml = daftarKk.map((kk) => {
      const arab = pilihBentukTeks(kk.frasa, bentuk);
      const aktif = idTersulit === kk.id_pasangan;
      return `
        <button
          type="button"
          class="pilihan-giliran ${aktif ? 'pilihan-giliran--terpilih' : ''}"
          data-sulit-s36="${escapeHtml(kk.id_pasangan)}"
          aria-pressed="${aktif}"
        >
          <span class="teks-keterangan">${escapeHtml(kk.fungsi_id || kk.id_pasangan)}</span>
          <span class="teks-arab" lang="ar" dir="rtl">${escapeHtml(arab)}</span>
        </button>
      `;
    }).join('');

    wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${renderKepalaSesi2(konteks, 'S-36')}

        <section class="kartu kelompok-skala">
          <p class="teks-instruksi" style="margin: 0;">${escapeHtml(tanya1)}</p>
          <div class="baris-skala-5" role="group" aria-label="${escapeHtml(tanya1)}">
            ${tombolSkalaHtml}
          </div>
          <p class="keterangan-skala">${escapeHtml(labelSkala)}</p>
        </section>

        <section class="kartu" style="display: flex; flex-direction: column; gap: var(--jarak-2);">
          <p class="teks-instruksi" style="margin: 0;">${escapeHtml(tanya2)}</p>
          <button
            type="button"
            class="pilihan-giliran ${idTersulit === 'TIDAK_ADA' ? 'pilihan-giliran--terpilih' : ''}"
            data-sulit-s36="TIDAK_ADA"
            aria-pressed="${idTersulit === 'TIDAK_ADA'}"
          >
            <span>${escapeHtml(pilihanKhusus)}</span>
          </button>
          ${pilihanSulitHtml}
        </section>

        ${pesanPeringatan ? `
          <div class="pesan-hangat" role="status">
            <p class="pesan-hangat__isi">${escapeHtml(pesanPeringatan)}</p>
          </div>
        ` : ''}

        <div class="baris-tombol">
          <button type="button" id="s36-tombol-kirim" class="tombol tombol--utama" ${sedangMengirim ? 'disabled' : ''}>
            ${escapeHtml(lblKirim)}
          </button>
          <button type="button" id="s36-tombol-lewati" class="tombol tombol--sekunder" ${sedangMengirim ? 'disabled' : ''}>
            ${escapeHtml(lblLewati)}
          </button>
        </div>
      </section>
    `;

    pasangEvent();
  }

  function pasangEvent() {
    pasangNavigasiSesi2(konteks, () => lukis());

    wadah.querySelectorAll('[data-yakin-s36]').forEach((btn) => {
      btn.addEventListener('click', () => {
        nilaiYakin = Number(btn.getAttribute('data-yakin-s36'));
        pesanPeringatan = '';
        lukis();
      });
    });

    wadah.querySelectorAll('[data-sulit-s36]').forEach((btn) => {
      btn.addEventListener('click', () => {
        idTersulit = btn.getAttribute('data-sulit-s36');
        lukis();
      });
    });

    const btnKirim = wadah.querySelector('#s36-tombol-kirim');
    if (btnKirim) {
      btnKirim.addEventListener('click', async () => {
        if (sedangMengirim) return;
        if (!nilaiYakin) {
          pesanPeringatan = ambilTeks('S-36', 'pesan_pilih_dulu') ||
            'Pilih tingkat keyakinanmu dulu atau ketuk Lewati.';
          lukis();
          return;
        }
        sedangMengirim = true;
        lukis();

        try {
          const kodeSulit = idTersulit || 'TIDAK_ADA';
          const kkSulit = daftarKk.find((k) => k.id_pasangan === kodeSulit);
          const catSulit = kkSulit
            ? pilihBentukTeks(kkSulit.frasa, kemajuan.bentukLawan).slice(0, 200)
            : 'tidak_ada';

          const peristiwa = [
            {
              id_idempoten: buatIdIdempoten(kodeSiswa),
              jenis: 'kejadian',
              isi: {
                tahap: 'UNIT',
                unit: nomorUnitDariId(unitId),
                blok: blokId,
                aspek: 'keyakinan_sesi',
                butir: `${blokId}-S2`,
                nilai: nilaiYakin
              }
            },
            {
              id_idempoten: buatIdIdempoten(kodeSiswa),
              jenis: 'kejadian',
              isi: {
                tahap: 'UNIT',
                unit: nomorUnitDariId(unitId),
                blok: blokId,
                aspek: 'kalimat_tersulit',
                butir: kodeSulit,
                nilai: kodeSulit === 'TIDAK_ADA' ? 0 : 1,
                catatan: catSulit
              }
            }
          ];

          await kirimAtauAntre('catat', { peristiwa }, `Refleksi Sesi 2 (${blokId})`);
          if (konteks.masihAktif()) {
            arahKe('S-37', { unit: unitId, blok: blokId });
          }
        } catch (_) {
          sedangMengirim = false;
          if (konteks.masihAktif()) lukis();
        }
      });
    }

    const btnLewati = wadah.querySelector('#s36-tombol-lewati');
    if (btnLewati) {
      btnLewati.addEventListener('click', async () => {
        if (sedangMengirim) return;
        sedangMengirim = true;
        lukis();
        try {
          await kirimKejadianSesi2(unitId, blokId, 'keyakinan_sesi', '', {
            butir: `${blokId}-S2`,
            flag: 'lewati'
          });
          if (konteks.masihAktif()) {
            arahKe('S-37', { unit: unitId, blok: blokId });
          }
        } catch (_) {
          sedangMengirim = false;
          if (konteks.masihAktif()) lukis();
        }
      });
    }
  }

  lukis();
}
