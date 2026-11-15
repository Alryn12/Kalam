/**
 * Layar S-24: Refleksi Sesi 1 & Penutupan Menuju Sesi 2 (situs/js/layar/s24-refleksi.js)
 * Tugas M1-G: TB-M1-08 · Acuan: SRS-3 FR-018, R-05, BP-1, BP-6
 */

import { panggilApi } from '../api.js';
import { arahKe } from '../router.js';
import { ambilState, ambilTeks, perbaruiStatusServer } from '../state.js';
import { escapeHtml, kirimAtauAntre } from './tahap0-bantu.js';
import {
  catatKejadianSesi1,
  daftarTabBelumDibuka,
  pasangNavigasiSesi1,
  pilihBentukTeks,
  renderKepalaSesi1,
  semuaTabSesi1Selesai,
  siapkanKonteksSesi1
} from './sesi1-bantu.js';

export async function renderS24({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi1('S-24', param, null);
  if (!konteks) return;

  const { unitId, blokId, blokData, kemajuan, wadah } = konteks;
  const daftarKk = Array.isArray(blokData.kata_kunci) ? blokData.kata_kunci : [];

  let nilaiYakin = null;
  let idTersulit = null; // null | 'TIDAK_ADA' | id_pasangan
  let pesanPeringatan = '';
  let sedangMengirim = false;
  let selesai = false;

  async function kirimSesi1Selesai(refleksiDilewati) {
    sedangMengirim = true;
    pesanPeringatan = '';
    lukis();

    const muatan = {
      blok: blokId,
      tab_dibuka: { ...kemajuan.tab },
      refleksi_dilewati: refleksiDilewati
    };
    const resp = await panggilApi('sesi1_selesai', muatan);

    let dibukaLokal = false;
    if (resp && resp.ok && resp.data && resp.data.status) {
      await perbaruiStatusServer(resp.data.status);
      dibukaLokal = true;
    } else if (!resp || resp.galat === 'E_SERVER' || resp.galat === 'E_SIBUK') {
      await kirimAtauAntre('sesi1_selesai', muatan, `Selesai Sesi 1 (${blokId})`, 'ANGKA');
      const stLama = ambilState().status_server || {};
      const daftarS1 = Array.isArray(stLama.blok_sesi1_selesai) ? [...stLama.blok_sesi1_selesai] : [];
      if (!daftarS1.includes(blokId)) daftarS1.push(blokId);
      const levelMap = { ...(stLama.level_terbuka || {}) };
      if (Number(levelMap[blokId] || 0) < 1) levelMap[blokId] = 1;
      await perbaruiStatusServer({
        ...stLama,
        sesi1_selesai: daftarS1,
        blok_sesi1_selesai: daftarS1,
        level_terbuka: levelMap
      });
      dibukaLokal = true;
    } else {
      pesanPeringatan = resp.pesan || ambilTeks('S-24', 'pesan_butuh_tab') || 'Buka dulu keempat tab sebelum menyelesaikan Sesi 1.';
    }

    sedangMengirim = false;
    if (dibukaLokal) {
      selesai = true;
    }
    lukis();
  }

  function lukis() {
    const bentuk = kemajuan.bentukLawan;
    const semuaLengkap = semuaTabSesi1Selesai(kemajuan.tab);

    if (selesai) {
      const subSelesai = ambilTeks('S-24', 'subjudul_selesai') || 'Sesi 1 selesai';
      const pesanBuka = ambilTeks('S-24', 'pesan_sesi2_terbuka') || 'Bagus sekali! Sesi 2 pada blok ini sekarang sudah terbuka.';
      const lblSesi2 = ambilTeks('S-24', 'tombol_mulai_sesi2') || 'Buka Sesi 2';
      const lblUnit = ambilTeks('S-24', 'tombol_ke_unit') || 'Kembali ke Isi Unit';

      wadah.innerHTML = `
        <section class="wadah-layar" aria-label="${escapeHtml(subSelesai)}">
          ${renderKepalaSesi1(konteks, 'S-24', { tanpaPemilihBentuk: true })}
          <div class="pesan-hangat pesan-hangat--aksen" role="status">
            <p class="pesan-hangat__judul">${escapeHtml(subSelesai)}</p>
            <p class="pesan-hangat__isi">${escapeHtml(pesanBuka)}</p>
          </div>
          <button type="button" id="tombol-ke-sesi2-s24" class="tombol tombol--utama">
            ${escapeHtml(lblSesi2)}
          </button>
          <button type="button" id="tombol-ke-unit-s24" class="tombol tombol--sekunder">
            ${escapeHtml(lblUnit)}
          </button>
        </section>
      `;
      pasangEvent();
      return;
    }

    if (!semuaLengkap) {
      const kurang = daftarTabBelumDibuka(kemajuan.tab);
      const pesanButuh = ambilTeks('S-24', 'pesan_butuh_tab') || 'Buka dulu keempat tab (Tonton, Kata Kunci, Tiru, dan Rekam) minimal satu kali ya.';
      wadah.innerHTML = `
        <section class="wadah-layar" aria-label="${escapeHtml(ambilTeks('S-24', 'judul') || 'Bagaimana tadi?')}">
          ${renderKepalaSesi1(konteks, 'S-24', { tanpaPemilihBentuk: true })}
          <div class="pesan-hangat" role="status">
            <p class="pesan-hangat__isi">${escapeHtml(pesanButuh)}</p>
            <p class="teks-keterangan" style="margin: var(--jarak-2) 0 0 0;">${escapeHtml((ambilTeks('S-24', 'label_belum_dibuka') || 'Belum dibuka: {daftar}').replace('{daftar}', kurang.join(', ')))}</p>
          </div>
        </section>
      `;
      pasangEvent();
      return;
    }

    const judulS24 = ambilTeks('S-24', 'judul') || 'Bagaimana tadi?';
    const tanya1 = ambilTeks('S-24', 'pertanyaan_1') || 'Seberapa yakin kamu?';
    const labelSkala = ambilTeks('S-24', 'label_skala') || '1 Belum yakin · 2 Sedikit yakin · 3 Cukup yakin · 4 Yakin · 5 Sangat yakin';
    const tanya2 = ambilTeks('S-24', 'pertanyaan_2') || 'Kalimat mana yang paling sulit?';
    const pilihanKhusus = ambilTeks('S-24', 'pilihan_khusus') || 'Tidak ada';
    const lblKirim = sedangMengirim
      ? (ambilTeks('S-24', 'label_mengirim') || 'Menyimpan…')
      : (ambilTeks('S-24', 'tombol_kirim') || 'Kirim');
    const lblLewati = ambilTeks('S-24', 'tombol_lewati') || 'Lewati';

    const tombolSkalaHtml = [1, 2, 3, 4, 5].map((n) => `
      <button
        type="button"
        class="tombol-skala ${nilaiYakin === n ? 'tombol-skala--terpilih' : ''}"
        data-yakin-s24="${n}"
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
          data-sulit-s24="${escapeHtml(kk.id_pasangan)}"
          aria-pressed="${aktif}"
        >
          <span class="teks-keterangan">${escapeHtml(kk.fungsi_id || kk.id_pasangan)}</span>
          <span class="teks-arab" lang="ar" dir="rtl">${escapeHtml(arab)}</span>
        </button>
      `;
    }).join('');

    wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(judulS24)}">
        ${renderKepalaSesi1(konteks, 'S-24')}

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
            data-sulit-s24="TIDAK_ADA"
            aria-pressed="${idTersulit === 'TIDAK_ADA'}"
          >
            <span>${escapeHtml(pilihanKhusus)}</span>
          </button>
          ${pilihanSulitHtml}
        </section>

        ${pesanPeringatan ? `<div class="pesan-hangat" role="status"><p class="pesan-hangat__isi">${escapeHtml(pesanPeringatan)}</p></div>` : ''}

        <div style="display: flex; flex-direction: column; gap: var(--jarak-2);">
          <button type="button" id="tombol-kirim-s24" class="tombol tombol--utama" ${sedangMengirim ? 'disabled' : ''}>
            ${escapeHtml(lblKirim)}
          </button>
          <button type="button" id="tombol-lewati-s24" class="tombol tombol--sekunder" ${sedangMengirim ? 'disabled' : ''}>
            ${escapeHtml(lblLewati)}
          </button>
        </div>
      </section>
    `;

    pasangEvent();
  }

  function pasangEvent() {
    pasangNavigasiSesi1(konteks, () => lukis());

    wadah.querySelectorAll('[data-yakin-s24]').forEach((btn) => {
      btn.addEventListener('click', () => {
        nilaiYakin = Number(btn.getAttribute('data-yakin-s24'));
        pesanPeringatan = '';
        lukis();
      });
    });

    wadah.querySelectorAll('[data-sulit-s24]').forEach((btn) => {
      btn.addEventListener('click', () => {
        idTersulit = btn.getAttribute('data-sulit-s24');
        lukis();
      });
    });

    const btnKirim = wadah.querySelector('#tombol-kirim-s24');
    if (btnKirim) {
      btnKirim.addEventListener('click', async () => {
        if (sedangMengirim) return;
        if (!nilaiYakin) {
          pesanPeringatan = ambilTeks('S-24', 'pesan_pilih_dulu') || 'Pilih tingkat keyakinanmu dulu atau ketuk Lewati.';
          lukis();
          return;
        }
        sedangMengirim = true;
        lukis();
        try {
          await catatKejadianSesi1(unitId, blokId, 'keyakinan_sesi', nilaiYakin, { butir: `${blokId}-S1` });
          const kodeSulit = idTersulit || 'TIDAK_ADA';
          const kkSulit = daftarKk.find((k) => k.id_pasangan === kodeSulit);
          const catSulit = kkSulit ? pilihBentukTeks(kkSulit.frasa, kemajuan.bentukLawan).slice(0, 200) : 'tidak_ada';
          await catatKejadianSesi1(unitId, blokId, 'kalimat_tersulit', kodeSulit === 'TIDAK_ADA' ? 0 : 1, {
            butir: kodeSulit,
            catatan: catSulit
          });
          await kirimSesi1Selesai(0);
        } catch (_) {
          sedangMengirim = false;
          if (konteks.masihAktif()) lukis();
        }
      });
    }

    const btnLewati = wadah.querySelector('#tombol-lewati-s24');
    if (btnLewati) {
      btnLewati.addEventListener('click', async () => {
        if (sedangMengirim) return;
        sedangMengirim = true;
        lukis();
        try {
          await catatKejadianSesi1(unitId, blokId, 'keyakinan_sesi', '', {
            butir: `${blokId}-S1`,
            flag: 'lewati'
          });
          await kirimSesi1Selesai(1);
        } catch (_) {
          sedangMengirim = false;
          if (konteks.masihAktif()) lukis();
        }
      });
    }

    const btnSesi2 = wadah.querySelector('#tombol-ke-sesi2-s24');
    if (btnSesi2) {
      btnSesi2.addEventListener('click', () => arahKe('S-30', { unit: unitId, blok: blokId }));
    }

    const btnUnit = wadah.querySelector('#tombol-ke-unit-s24');
    if (btnUnit) {
      btnUnit.addEventListener('click', () => arahKe('S-03', { unit: unitId }));
    }
  }

  lukis();
}
