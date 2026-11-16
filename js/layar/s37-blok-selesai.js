/**
 * Layar S-37: Blok Selesai & Pernyataan Aku Bisa Blok (situs/js/layar/s37-blok-selesai.js)
 * Tugas M1-I: TB-M1-09 & TB-M1-10
 * Acuan: KEPUTUSAN.md SL-BARU-02 & SL-BARU-03; SRS-3 FR-026, FR-075; BP-1 S-37; BP-4 R-04, R-60..R-62; BP-6 S-37
 */

import { panggilApi } from '../api.js';
import { arahKe } from '../router.js';
import { ambilState, ambilTeks } from '../state.js';
import { escapeHtml } from './tahap0-bantu.js';
import {
  daftarBlokDalamUnit,
  nomorUnitDariId,
  pasangNavigasiSesi2,
  perbaruiAkuBisaLokalBlok,
  renderKepalaSesi2,
  siapkanKonteksSesi2
} from './sesi2-bantu.js';

export async function renderS37({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi2('S-37', param);
  if (!konteks) return;

  const { kodeSiswa, unitId, blokId, blokData, kemajuan, wadah } = konteks;
  let entriAkuBisa = await perbaruiAkuBisaLokalBlok(kodeSiswa, blokData, kemajuan);

  function tentukanKeteranganBerikut() {
    const st = ambilState().status_server || {};
    const blokSelesai = Array.isArray(st.blok_selesai) ? st.blok_selesai : [];
    const sesi3Terbuka = Array.isArray(st.sesi3_terbuka) ? st.sesi3_terbuka.map(Number) : [];
    const noUnit = nomorUnitDariId(unitId);

    if (blokData.wajib === false) {
      return ambilTeks('S-37', 'keterangan_pengayaan') ||
        'Blok pengayaan ini sudah kamu selesaikan.';
    }

    const daftarBlokUnit = daftarBlokDalamUnit(unitId);
    const semuaWajibSelesai = daftarBlokUnit
      .filter((b) => b.wajib)
      .every((b) => b.id === blokId || blokSelesai.includes(b.id));

    if (semuaWajibSelesai || sesi3Terbuka.includes(noUnit)) {
      return ambilTeks('S-37', 'keterangan_sesi_3') || 'Sesi 3 sudah terbuka.';
    }
    return ambilTeks('S-37', 'keterangan') || 'Blok berikutnya sudah terbuka.';
  }

  function lukis() {
    const pesanUtama = ambilTeks('S-37', 'pesan') ||
      'Satu blok sudah kamu jalani. Terima kasih sudah berani mencoba.';
    const judulAkuBisa = ambilTeks('S-37', 'judul_aku_bisa') || 'Pernyataan Aku Bisa blok ini';
    const teksPernyataan = (blokData.aku_bisa && blokData.aku_bisa.teks) || '';
    const keteranganBerikut = tentukanKeteranganBerikut();
    const lblLanjut = ambilTeks('S-37', 'tombol') || 'Lanjut';

    // SL-BARU-02: Siswa HANYA melihat centang ✓ bila KEDUA kunci terpenuhi (tercentang === 1), selain itu kosong
    const tercentang = Boolean(
      entriAkuBisa &&
      Number(entriAkuBisa.tercentang) === 1 &&
      Number(entriAkuBisa.kunci_mesin) === 1 &&
      Number(entriAkuBisa.kunci_guru) === 1
    );

    wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${renderKepalaSesi2(konteks, 'S-37', { tanpaPemilihBentuk: true })}

        <section class="kartu" aria-label="Ringkasan blok selesai">
          <div class="pesan-hangat pesan-hangat--aksen" role="status">
            <p class="pesan-hangat__isi">${escapeHtml(pesanUtama)}</p>
          </div>

          <h2 class="subjudul-layar" style="margin: 0;">${escapeHtml(judulAkuBisa)}</h2>

          <ul class="daftar-aku-bisa">
            <li class="butir-aku-bisa ${tercentang ? 'butir-aku-bisa--tercentang' : ''}">
              <div class="baris-pernyataan-aku-bisa">
                <span
                  class="tanda-aku-bisa ${tercentang ? 'tanda-aku-bisa--centang' : 'tanda-aku-bisa--kosong'}"
                  aria-label="${tercentang ? 'Tercentang' : 'Belum tercentang'}"
                >${tercentang ? '&#10003;' : '&nbsp;'}</span>
                <p class="teks-instruksi" style="margin: 0; font-weight: ${tercentang ? '600' : '400'};">
                  ${escapeHtml(teksPernyataan)}
                </p>
              </div>
            </li>
          </ul>

          <div class="pesan-hangat" role="status">
            <p class="pesan-hangat__isi" style="font-weight: 600;">${escapeHtml(keteranganBerikut)}</p>
          </div>

          <button type="button" id="s37-tombol-lanjut" class="tombol tombol--utama">
            ${escapeHtml(lblLanjut)}
          </button>
        </section>
      </section>
    `;

    pasangEvent();
  }

  function pasangEvent() {
    pasangNavigasiSesi2(konteks);

    const btnLanjut = wadah.querySelector('#s37-tombol-lanjut');
    if (btnLanjut) {
      btnLanjut.addEventListener('click', () => {
        arahKe('S-03', { unit: unitId });
      });
    }
  }

  lukis();

  // Sinkronkan kunci_guru / tercentang dari server secara non-blocking bila daring (FR-026, SL-BARU-03)
  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const resp = await panggilApi('aku_bisa_data', {}, { tanpaUlang: true, janganArahkan: true });
      if (!konteks.masihAktif()) return;
      if (resp && resp.ok && resp.data) {
        const daftar = Array.isArray(resp.data.daftar)
          ? resp.data.daftar
          : (Array.isArray(resp.data) ? resp.data : []);
        const idTarget = (blokData.aku_bisa && blokData.aku_bisa.id) || `AB-${blokId}`;
        const cocok = daftar.find((r) => r && (r.id_pernyataan === idTarget || r.blok === blokId));
        if (cocok) {
          entriAkuBisa = await perbaruiAkuBisaLokalBlok(kodeSiswa, blokData, kemajuan, cocok);
          if (konteks.masihAktif()) lukis();
        }
      }
    } catch (_) {}
  }
}
