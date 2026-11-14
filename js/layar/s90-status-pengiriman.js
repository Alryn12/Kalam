/**
 * Layar S-90: Status Pengiriman (situs/js/layar/s90-status-pengiriman.js)
 * Tugas M1-E: TB-M1-06
 * Acuan: SRS-3 FR-044, FR-073; BP-1 S-90; BP-5 K-02, K-04, K-06, K-32; BP-6 S-90
 */

import { ambilSemuaAntrean } from '../antrean.js';
import { langgananPerubahanAntrean, panggilApi, prosesAntreanLatar } from '../api.js';
import { arahKe } from '../router.js';
import { ambilState, ambilTeks } from '../state.js';
import { ambilHasilSuaraS17, escapeHtml, siapkanWadahLayar } from './tahap0-bantu.js';

function lencanaStatusHtml(status) {
  if (status === 'Terkirim') {
    return `
      <span class="penanda-status penanda-status--terdeteksi">
        <span class="penanda-status__ikon" aria-hidden="true">&#10003;</span>
        <span>Terkirim &#10003;</span>
      </span>
    `;
  }
  if (status === 'Mengirim') {
    return `
      <span class="penanda-status penanda-status--menunggu">
        <span class="penanda-status__ikon" aria-hidden="true">&#8635;</span>
        <span>Mengirim</span>
      </span>
    `;
  }
  if (status === 'Menunggu') {
    return `
      <span class="penanda-status penanda-status--menunggu">
        <span class="penanda-status__ikon" aria-hidden="true">&#9719;</span>
        <span>Menunggu</span>
      </span>
    `;
  }
  return `<span class="kartu-arab__label">${escapeHtml(status || 'Belum ada')}</span>`;
}

export async function renderS90() {
  const judul = ambilTeks('S-90', 'judul') || 'Status pengiriman';
  const wadah = siapkanWadahLayar('S-90', judul);
  if (!wadah) return;

  const keteranganStatus = ambilTeks('S-90', 'status') || 'Terkirim ✓ · Menunggu · Mengirim';
  const teksTombolKirim = ambilTeks('S-90', 'tombol') || 'Kirim ulang sekarang';
  const pesanMenunggu = ambilTeks('S-90', 'pesan_menunggu') ||
    'Rekamanmu aman di HP-mu dan akan terkirim saat internet tersedia.';
  const pesanBerulang = ambilTeks('S-90', 'pesan_berulang') ||
    'Belum terkirim juga? Hubungi gurumu.';
  const teksKembali = ambilTeks('S-90', 'tombol_kembali') || 'Kembali ke Beranda';

  let sedangKirimUlang = false;
  let aktifDiLayar = true;

  async function susunRingkasanItem() {
    const daftarAntrean = await ambilSemuaAntrean();
    const state = ambilState();
    const stServer = state.status_server || {};
    const unggahServer = stServer.status_unggah_server || { T0: false, AF: false, P3: {} };
    const hasilS17T0 = await ambilHasilSuaraS17('T0');
    const hasilS17AF = await ambilHasilSuaraS17('AF');

    const itemTampil = [];

    // 1. Suara Hari Pertama (T0)
    const antreanT0 = daftarAntrean.filter(
      (a) => a.kategori === 'T0' || (a.data && a.data.jenis === 'T0')
    );
    let statusT0 = 'Belum direkam';
    if (antreanT0.some((a) => a.status === 'Mengirim')) {
      statusT0 = 'Mengirim';
    } else if (antreanT0.some((a) => a.status === 'Menunggu')) {
      statusT0 = 'Menunggu';
    } else if (unggahServer.T0 || antreanT0.some((a) => a.status === 'Terkirim') || (hasilS17T0 && stServer.tahap0_selesai)) {
      statusT0 = 'Terkirim';
    }
    itemTampil.push({
      id: 'item-t0',
      judul: 'Suara Hari Pertama',
      keterangan: hasilS17T0 && Number(hasilS17T0.dilewati) === 1 ? 'Dilewati (tercatat)' : 'Tahap awal',
      status: statusT0,
      percobaan: antreanT0.reduce((m, a) => Math.max(m, Number(a.percobaan_kirim || 0)), 0)
    });

    // 2. Suara Hari Ini (AF)
    const antreanAF = daftarAntrean.filter(
      (a) => a.kategori === 'AF' || (a.data && a.data.jenis === 'AF')
    );
    if (stServer.after_terbuka || unggahServer.AF || antreanAF.length > 0 || hasilS17AF) {
      let statusAF = 'Belum direkam';
      if (antreanAF.some((a) => a.status === 'Mengirim')) {
        statusAF = 'Mengirim';
      } else if (antreanAF.some((a) => a.status === 'Menunggu')) {
        statusAF = 'Menunggu';
      } else if (unggahServer.AF || antreanAF.some((a) => a.status === 'Terkirim')) {
        statusAF = 'Terkirim';
      }
      itemTampil.push({
        id: 'item-af',
        judul: 'Suara Hari Ini',
        keterangan: 'Tahap melihat perjalananmu',
        status: statusAF,
        percobaan: antreanAF.reduce((m, a) => Math.max(m, Number(a.percobaan_kirim || 0)), 0)
      });
    }

    // 3. Putaran 3 tiap unit (Unit 1 s.d. unit tertinggi yang terbuka atau memiliki rekaman P3)
    const unitTerbukaMaks = Math.max(1, Number(stServer.unit_terbuka || 1));
    for (let u = 1; u <= 6; u++) {
      const kunciU = `U${u}`;
      const slotServer = (unggahServer.P3 && Array.isArray(unggahServer.P3[kunciU])) ? unggahServer.P3[kunciU] : [];
      const antreanP3U = daftarAntrean.filter(
        (a) => (a.kategori === 'P3' || (a.data && a.data.jenis === 'P3')) && Number(a.unit || (a.data && a.data.unit) || 0) === u
      );
      if (u <= unitTerbukaMaks || slotServer.length > 0 || antreanP3U.length > 0) {
        let statusP3 = 'Belum ada';
        if (antreanP3U.some((a) => a.status === 'Mengirim')) {
          statusP3 = 'Mengirim';
        } else if (antreanP3U.some((a) => a.status === 'Menunggu')) {
          statusP3 = 'Menunggu';
        } else if (slotServer.length > 0 || antreanP3U.some((a) => a.status === 'Terkirim')) {
          statusP3 = 'Terkirim';
        }
        itemTampil.push({
          id: `item-p3-u${u}`,
          judul: `Putaran 3 · Unit ${u}`,
          keterangan: slotServer.length > 0 ? `${slotServer.length} rekaman kartu` : 'Rekaman kartu Sesi 3',
          status: statusP3,
          percobaan: antreanP3U.reduce((m, a) => Math.max(m, Number(a.percobaan_kirim || 0)), 0)
        });
      }
    }

    // 4. Angka sesi & jawaban kuesioner
    const antreanAngka = daftarAntrean.filter(
      (a) => a.aksi !== 'unggah_audio' && a.kategori !== 'T0' && a.kategori !== 'AF' && a.kategori !== 'P3'
    );
    const angkaMenunggu = antreanAngka.filter((a) => a.status === 'Menunggu');
    const angkaMengirim = antreanAngka.filter((a) => a.status === 'Mengirim');
    let statusAngka = 'Terkirim';
    if (angkaMengirim.length > 0) {
      statusAngka = 'Mengirim';
    } else if (angkaMenunggu.length > 0) {
      statusAngka = 'Menunggu';
    }
    itemTampil.push({
      id: 'item-angka',
      judul: 'Angka sesi dan jawaban',
      keterangan: angkaMenunggu.length > 0
        ? `${angkaMenunggu.length} catatan menunggu koneksi`
        : 'Kuesioner dan catatan belajar',
      status: statusAngka,
      percobaan: antreanAngka.reduce((m, a) => Math.max(m, Number(a.percobaan_kirim || 0)), 0)
    });

    // Tambahkan rincian item spesifik yang sedang Menunggu / Mengirim agar mudah dipantau
    const belumTerkirim = daftarAntrean.filter((a) => a.status !== 'Terkirim');
    const adaGagal5Kali = belumTerkirim.some((a) => Number(a.percobaan_kirim || 0) >= 5);

    return {
      itemTampil,
      belumTerkirim,
      adaMenunggu: belumTerkirim.length > 0,
      adaGagal5Kali
    };
  }

  async function gambar() {
    if (!aktifDiLayar) return;
    const { itemTampil, belumTerkirim, adaMenunggu, adaGagal5Kali } = await susunRingkasanItem();

    const daftarHtml = itemTampil.map((it) => `
      <li class="kartu-unit" style="padding: var(--jarak-3); gap: var(--jarak-1);">
        <div class="kartu-unit__kepala">
          <div>
            <h2 class="kartu-unit__judul-id" style="font-size: 1rem;">${escapeHtml(it.judul)}</h2>
            <p class="teks-keterangan" style="margin: 2px 0 0 0;">${escapeHtml(it.keterangan)}</p>
          </div>
          ${lencanaStatusHtml(it.status)}
        </div>
      </li>
    `).join('');

    const rincianMenungguHtml = belumTerkirim.length > 0 ? `
      <section class="kartu" aria-labelledby="judul-antrean-menunggu">
        <h2 id="judul-antrean-menunggu" class="subjudul-layar">Antrean di HP ini (${belumTerkirim.length})</h2>
        <ul class="daftar-unit">
          ${belumTerkirim.map((a) => `
            <li class="kartu-unit" style="padding: var(--jarak-2) var(--jarak-3);">
              <div class="kartu-unit__kepala">
                <div>
                  <strong style="font-size: 0.95rem;">${escapeHtml(a.label || a.aksi)}</strong>
                  <p class="teks-keterangan" style="margin: 2px 0 0 0;">
                    Percobaan kirim: ${Number(a.percobaan_kirim || 0)} kali
                  </p>
                </div>
                ${lencanaStatusHtml(a.status)}
              </div>
            </li>
          `).join('')}
        </ul>
      </section>
    ` : '';

    wadah.innerHTML = `
      <section class="kartu" aria-labelledby="judul-s90">
        <h1 id="judul-s90" class="judul-layar">${escapeHtml(judul)}</h1>
        <p class="teks-keterangan" style="margin-top: calc(var(--jarak-1) * -1);">
          ${escapeHtml(keteranganStatus)}
        </p>

        ${adaMenunggu ? `
          <div id="kotak-pesan-menunggu-s90" class="pesan-hangat" role="status" aria-live="polite">
            <p class="pesan-hangat__isi">${escapeHtml(pesanMenunggu)}</p>
            <p class="teks-keterangan" style="margin: var(--jarak-1) 0 0 0;">
              Jangan keluar akun atau berganti HP sebelum semua item bertanda <strong>Terkirim &#10003;</strong>.
            </p>
          </div>
        ` : ''}

        ${adaGagal5Kali ? `
          <div id="kotak-pesan-berulang-s90" class="pesan-hangat pesan-hangat--aksen" role="status" aria-live="polite">
            <p class="pesan-hangat__isi">${escapeHtml(pesanBerulang)}</p>
          </div>
        ` : ''}

        <ul class="daftar-unit" aria-label="Daftar status pengiriman">
          ${daftarHtml}
        </ul>

        <div class="baris-tombol" style="margin-top: var(--jarak-2);">
          <button
            type="button"
            id="tombol-kirim-ulang-s90"
            class="tombol tombol--utama"
            ${sedangKirimUlang ? 'disabled' : ''}
          >
            ${escapeHtml(sedangKirimUlang ? 'Mengirim…' : teksTombolKirim)}
          </button>
          <button type="button" id="tombol-kembali-s90" class="tombol tombol--sekunder">
            ${escapeHtml(teksKembali)}
          </button>
        </div>
      </section>

      ${rincianMenungguHtml}
    `;

    const btnKirim = document.getElementById('tombol-kirim-ulang-s90');
    if (btnKirim) {
      btnKirim.addEventListener('click', async () => {
        if (sedangKirimUlang) return;
        sedangKirimUlang = true;
        await gambar();
        try {
          await prosesAntreanLatar({ langsung: true, tanpaUlangDalam: true });
          if (typeof navigator === 'undefined' || navigator.onLine) {
            await panggilApi('status', {}, { tanpaUlang: true, janganArahkan: true });
          }
        } catch (_) {}
        sedangKirimUlang = false;
        await gambar();
      });
    }

    const btnKembali = document.getElementById('tombol-kembali-s90');
    if (btnKembali) {
      btnKembali.addEventListener('click', () => {
        berhentiLangganan();
        aktifDiLayar = false;
        arahKe('S-02');
      });
    }
  }

  const berhentiLangganan = langgananPerubahanAntrean(() => {
    if (aktifDiLayar) {
      gambar();
    }
  });

  window.addEventListener('hashchange', () => {
    aktifDiLayar = false;
    berhentiLangganan();
  }, { once: true });

  await gambar();
}
