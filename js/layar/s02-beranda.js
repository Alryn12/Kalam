/**
 * Layar S-02: Beranda Siswa (situs/js/layar/s02-beranda.js)
 * Tugas M1-E: TB-M1-07
 * Acuan: SRS-3 FR-002, FR-044, FR-070; BP-1 S-02; BP-5 K-32, K-34, K-37, K-48; BP-6 S-02; docs/KEPUTUSAN.md SL-BARU-04
 */

import { ambilSemuaAntrean } from '../antrean.js';
import { langgananPerubahanAntrean, panggilApi } from '../api.js';
import { arahKe } from '../router.js';
import { ambilState, ambilTeks, hapusTokenSesi } from '../state.js';
import { ambilKemajuanTahap0, escapeHtml, kirimAtauAntre, siapkanWadahLayar } from './tahap0-bantu.js';

export const KATALOG_UNIT_KALAM = [
  {
    no: 1,
    id: 'U1',
    judul_id: 'Perkenalan',
    judul_arab: 'التَّعَارُفُ',
    blok: [
      { id: 'U1-BA', kode: 'Blok A', judul_id: 'Salam dan Sapaan Waktu', wajib: true },
      { id: 'U1-BB', kode: 'Blok B', judul_id: 'Berkenalan tentang Diri Sendiri', wajib: true },
      { id: 'U1-BC', kode: 'Blok C', judul_id: 'Memperkenalkan Orang Lain', wajib: true },
      { id: 'U1-BD', kode: 'Blok D', judul_id: 'Sopan Santun Sehari-hari', wajib: true }
    ]
  },
  {
    no: 2,
    id: 'U2',
    judul_id: 'Keluarga dan Rumah',
    judul_arab: 'الْأُسْرَةُ وَالْبَيْتُ',
    blok: [
      { id: 'U2-BA', kode: 'Blok A', judul_id: 'Anggota Keluarga Inti dan Profesi Dasar', wajib: true },
      { id: 'U2-BB', kode: 'Blok B', judul_id: 'Kakek-Nenek, Paman-Bibi, dan Sifat', wajib: true },
      { id: 'U2-BC', kode: 'Blok C', judul_id: 'Bagian Luar dan Ruangan Rumah', wajib: true },
      { id: 'U2-BD', kode: 'Blok D', judul_id: 'Perabotan Kamar dan Ruang Tamu', wajib: true },
      { id: 'U2-BE', kode: 'Blok E', judul_id: 'Kegiatan Anggota Keluarga di Rumah', wajib: true }
    ]
  },
  {
    no: 3,
    id: 'U3',
    judul_id: 'Madrasah',
    judul_arab: 'الْمَدْرَسَةُ',
    blok: [
      { id: 'U3-BA', kode: 'Blok A', judul_id: 'Fasilitas Madrasah, Kelas, dan Alat Tulis', wajib: true },
      { id: 'U3-BB', kode: 'Blok B', judul_id: 'Perpustakaan dan Peminjaman Buku', wajib: true },
      { id: 'U3-BC', kode: 'Blok C', judul_id: 'Jadwal Pelajaran, Jam, dan Nilai', wajib: true },
      { id: 'U3-BD', kode: 'Blok D', judul_id: 'Kantin, Makanan-Minuman, dan Harga', wajib: true }
    ]
  },
  {
    no: 4,
    id: 'U4',
    judul_id: 'Hobi dan Kegiatan',
    judul_arab: 'الْهِوَايَاتُ وَالْأَنْشِطَةُ',
    blok: [
      { id: 'U4-BA', kode: 'Blok A', judul_id: 'Macam-Macam Hobi, Membaca, dan Menulis', wajib: true },
      { id: 'U4-BB', kode: 'Blok B', judul_id: 'Olahraga, Memasak, dan Fotografi', wajib: true },
      { id: 'U4-BC', kode: 'Blok C', judul_id: 'Ekstrakurikuler, Kaligrafi, dan Jurnalistik', wajib: true },
      { id: 'U4-BD', kode: 'Blok D', judul_id: 'Ajakan Latihan Bersama dan Peminjaman Alat', wajib: true }
    ]
  },
  {
    no: 5,
    id: 'U5',
    judul_id: 'Profesi dan Cita-cita',
    judul_arab: 'الْمِهَنُ وَالْآمَالُ',
    blok: [
      { id: 'U5-BA', kode: 'Blok A', judul_id: 'Guru, Dokter, dan Insinyur', wajib: true },
      { id: 'U5-BB', kode: 'Blok B', judul_id: 'Pedagang, Petani, Nelayan, Polisi, dan Pilot', wajib: true },
      { id: 'U5-BC', kode: 'Blok C', judul_id: 'Profesi Keluarga dan Perawat', wajib: true },
      { id: 'U5-BD', kode: 'Blok D', judul_id: 'Cita-Cita Masa Depan dan Alasan', wajib: true },
      { id: 'U5-BE', kode: 'Blok E', judul_id: 'Jurnalis, Koki, Penjahit, dan Tukang Kayu', wajib: true },
      { id: 'U5-BF', kode: 'Blok F', judul_id: 'Pemrogram, Desainer, dan Ilmuwan', wajib: false, pengayaan: true }
    ]
  },
  {
    no: 6,
    id: 'U6',
    judul_id: 'Kegiatan Sehari-hari',
    judul_arab: 'الْأَعْمَالُ الْيَوْمِيَّةُ',
    blok: [
      { id: 'U6-BA', kode: 'Blok A', judul_id: 'Bangun Tidur, Jam Pagi, dan Salat Subuh', wajib: true },
      { id: 'U6-BB', kode: 'Blok B', judul_id: 'Persiapan Pagi, Mandi, dan Berpakaian', wajib: true },
      { id: 'U6-BC', kode: 'Blok C', judul_id: 'Sarapan dan Berangkat ke Madrasah', wajib: true },
      { id: 'U6-BD', kode: 'Blok D', judul_id: 'Transportasi dan Waktu Perjalanan', wajib: true },
      { id: 'U6-BE', kode: 'Blok E', judul_id: 'Kegiatan di Madrasah, Pulang Sore, dan Belajar Malam', wajib: true },
      { id: 'U6-BF', kode: 'Blok F', judul_id: 'Bilangan, Alamat, Saudara, dan Umur', wajib: true },
      { id: 'U6-BG', kode: 'Blok G', judul_id: 'Tidur Malam dan Penutup Hari', wajib: true }
    ]
  }
];

function tentukanLangkahLanjut(st, kemajuanT0) {
  if (!st || !st.tahap0_selesai) {
    if (Number((st && st.persetujuan_T0) || 0) !== 1) {
      return {
        labelAtas: 'Langkah Awal',
        judulArab: 'التَّعَارُفُ',
        layar: 'S-10',
        param: { fase: 'T0' }
      };
    }
    const layarT0 = (kemajuanT0 && kemajuanT0.layar && kemajuanT0.layar !== 'S-01') ? kemajuanT0.layar : 'S-11';
    return {
      labelAtas: 'Langkah Awal',
      judulArab: 'التَّعَارُفُ',
      layar: layarT0,
      param: (kemajuanT0 && kemajuanT0.param) || { fase: 'T0' }
    };
  }

  const unitSelesai = Array.isArray(st.unit_selesai) ? st.unit_selesai.map(Number) : [];
  const blokSelesai = Array.isArray(st.blok_selesai) ? st.blok_selesai : [];
  const unitTerbuka = Math.max(1, Number(st.unit_terbuka || 1));

  if (st.after_terbuka && !st.after_selesai && unitSelesai.includes(6)) {
    return {
      labelAtas: 'Tahap Akhir',
      judulArab: 'مَسِيرَتُكَ',
      layar: 'S-10',
      param: { fase: 'AF' }
    };
  }

  // Cari unit terbuka pertama yang belum selesai
  let unitAktif = KATALOG_UNIT_KALAM.find((u) => u.no <= unitTerbuka && !unitSelesai.includes(u.no));
  if (!unitAktif) {
    unitAktif = KATALOG_UNIT_KALAM.find((u) => u.no === unitTerbuka) || KATALOG_UNIT_KALAM[0];
  }

  const blokBelumSelesai = unitAktif.blok.find((b) => b.wajib && !blokSelesai.includes(b.id)) || unitAktif.blok[0];
  return {
    labelAtas: `Unit ${unitAktif.no} · ${blokBelumSelesai.kode}`,
    judulArab: unitAktif.judul_arab,
    layar: 'S-03',
    param: { unit: unitAktif.id }
  };
}

export async function renderS02() {
  const state = ambilState();
  const namaPanggilan = state.nama_panggilan || 'Teman';
  const judul = ambilTeks('S-02', 'judul') || 'Beranda';
  const wadah = siapkanWadahLayar('S-02', judul);
  if (!wadah) return;

  let sedangKonfirmasiKeluar = false;
  let aktifDiLayar = true;

  // Catat beranda_dibuka tanpa memblokir tampilan
  kirimAtauAntre('catat', { jenis: 'aktivitas', aktivitas: 'beranda_dibuka' }, 'Beranda dibuka', 'ANGKA').catch(() => {});

  async function gambar() {
    if (!aktifDiLayar) return;
    const st = ambilState().status_server || {
      tahap0_selesai: '',
      unit_terbuka: 1,
      unit_selesai: [],
      blok_terbuka: ['U1-BA'],
      blok_selesai: [],
      sesi3_selesai: [],
      after_terbuka: 0,
      after_selesai: ''
    };
    const kemajuanT0 = await ambilKemajuanTahap0();
    const daftarAntrean = await ambilSemuaAntrean();
    const jmlMenunggu = daftarAntrean.filter((a) => a.status !== 'Terkirim').length;

    const sapaan = ambilTeks('S-02', 'sapaan', { nama_panggilan: ambilState().nama_panggilan || namaPanggilan }) ||
      `Halo, ${ambilState().nama_panggilan || namaPanggilan}`;
    const teksKartuLanjut = ambilTeks('S-02', 'kartu_lanjut') || 'Lanjutkan belajar';
    const teksJudulDaftar = ambilTeks('S-02', 'judul_daftar') || 'Unit belajarmu';
    const teksTerkunci = ambilTeks('S-02', 'status_unit_terkunci') || 'Terbuka setelah setoran ke gurumu';
    const teksTerbuka = ambilTeks('S-02', 'status_unit_terbuka') || 'Siap dipelajari';
    const teksSelesai = ambilTeks('S-02', 'status_unit_selesai') || 'Selesai';
    const teksBagianAfter = ambilTeks('S-02', 'bagian_after') || 'Melihat perjalananmu';
    const teksKartuPekan = ambilTeks('S-02', 'kartu_pekan') || 'Pekan ini';
    const teksPintasanAkuBisa = ambilTeks('S-02', 'pintasan_aku_bisa') || 'Aku Bisa';
    const teksPintasanPerjalanan = ambilTeks('S-02', 'pintasan_perjalananku') || 'Perjalananku';
    const teksPintasanKartu = ambilTeks('S-02', 'pintasan_kartu_kemajuan') || 'Kartu Kemajuan';
    const teksPintasanKirim = ambilTeks('S-02', 'pintasan_status_pengiriman') || 'Status pengiriman';
    const teksKeluar = ambilTeks('S-02', 'tombol_keluar') || 'Keluar';

    const langkahLanjut = tentukanLangkahLanjut(st, kemajuanT0);
    const unitSelesai = Array.isArray(st.unit_selesai) ? st.unit_selesai.map(Number) : [];
    const sesi3Selesai = Array.isArray(st.sesi3_selesai) ? st.sesi3_selesai.map(Number) : [];
    const blokTerbuka = Array.isArray(st.blok_terbuka) ? st.blok_terbuka : [];
    const unitTerbukaNo = Number(st.unit_terbuka || 0);

    // SL-BARU-04: Misi Keluarga dan Catatan Pakai muncul setelah Sesi 3 Unit 2 selesai (setoran Unit 2 tuntas)
    const tampilkanPekanIni = unitSelesai.includes(2) || sesi3Selesai.includes(2) || unitTerbukaNo >= 3;

    const daftarUnitHtml = KATALOG_UNIT_KALAM.map((unit) => {
      const selesai = unitSelesai.includes(unit.no);
      const adaBlokTerbuka = blokTerbuka.some((idB) => idB.indexOf(`U${unit.no}-`) === 0);
      const terbuka = selesai || unit.no <= unitTerbukaNo || adaBlokTerbuka;

      if (selesai) {
        return `
          <li class="kartu-unit kartu-unit--selesai">
            <div class="kartu-unit__kepala">
              <div>
                <span class="kartu-unit__nomor">Unit ${unit.no}</span>
                <h3 class="kartu-unit__judul-id">${escapeHtml(unit.judul_id)}</h3>
              </div>
              <span class="penanda-status penanda-status--terdeteksi">
                <span class="penanda-status__ikon" aria-hidden="true">&#10003;</span>
                <span>${escapeHtml(teksSelesai)}</span>
              </span>
            </div>
            <p class="teks-arab" lang="ar" dir="rtl" style="margin: 0;">${unit.judul_arab}</p>
            <button type="button" class="tombol tombol--sekunder tombol-buka-unit-s02" data-unit="${unit.id}">
              Ulangi
            </button>
          </li>
        `;
      }

      if (terbuka) {
        return `
          <li class="kartu-unit kartu-unit--terbuka">
            <div class="kartu-unit__kepala">
              <div>
                <span class="kartu-unit__nomor">Unit ${unit.no}</span>
                <h3 class="kartu-unit__judul-id">${escapeHtml(unit.judul_id)}</h3>
              </div>
              <span class="kartu-arab__label">${escapeHtml(teksTerbuka)}</span>
            </div>
            <p class="teks-arab" lang="ar" dir="rtl" style="margin: 0;">${unit.judul_arab}</p>
            <button type="button" class="tombol tombol--utama tombol-buka-unit-s02" data-unit="${unit.id}">
              Mulai
            </button>
          </li>
        `;
      }

      return `
        <li class="kartu-unit kartu-unit--terkunci">
          <div class="kartu-unit__kepala">
            <div>
              <span class="kartu-unit__nomor">Unit ${unit.no}</span>
              <h3 class="kartu-unit__judul-id">${escapeHtml(unit.judul_id)}</h3>
            </div>
            <span class="penanda-status penanda-status--menunggu">
              <span class="penanda-status__ikon" aria-hidden="true">&#128274;</span>
              <span>Terkunci</span>
            </span>
          </div>
          <p class="teks-arab" lang="ar" dir="rtl" style="margin: 0;">${unit.judul_arab}</p>
          <p class="teks-keterangan" style="margin: 0;">${escapeHtml(teksTerkunci)}</p>
        </li>
      `;
    }).join('');

    wadah.innerHTML = `
      <section class="kartu" aria-labelledby="sapaan-s02">
        <h1 id="sapaan-s02" class="judul-layar" style="margin-bottom: var(--jarak-1);">
          ${escapeHtml(sapaan)}
        </h1>

        <div class="kartu-lanjut">
          <div>
            <span class="kartu-arab__nomor">${escapeHtml(langkahLanjut.labelAtas)}</span>
            <h2 class="subjudul-layar" style="margin: 4px 0 0 0;">${escapeHtml(teksKartuLanjut)}</h2>
          </div>
          <p class="teks-arab" lang="ar" dir="rtl" style="margin: 0;">
            ${langkahLanjut.judulArab}
          </p>
          <button type="button" id="tombol-lanjutkan-s02" class="tombol tombol--utama">
            ${escapeHtml(teksKartuLanjut)}
          </button>
        </div>
      </section>

      ${tampilkanPekanIni ? `
        <section class="kartu" aria-labelledby="judul-pekan-s02">
          <div class="kartu-unit__kepala">
            <h2 id="judul-pekan-s02" class="subjudul-layar" style="margin: 0;">${escapeHtml(teksKartuPekan)}</h2>
            <span class="kartu-arab__label">Misi Keluarga &amp; Catatan Pakai</span>
          </div>
          <div class="baris-tombol">
            <button type="button" id="tombol-mk-s02" class="tombol tombol--sekunder">
              Misi Keluarga
            </button>
            <button type="button" id="tombol-cp-s02" class="tombol tombol--sekunder">
              Catatan Pakai
            </button>
          </div>
        </section>
      ` : ''}

      <section class="kartu" aria-labelledby="judul-daftar-unit-s02">
        <h2 id="judul-daftar-unit-s02" class="subjudul-layar">${escapeHtml(teksJudulDaftar)}</h2>
        <ul class="daftar-unit">
          ${daftarUnitHtml}
        </ul>
      </section>

      <section class="kartu" aria-labelledby="judul-after-s02">
        <div class="kartu-unit__kepala">
          <h2 id="judul-after-s02" class="subjudul-layar" style="margin: 0;">${escapeHtml(teksBagianAfter)}</h2>
          ${st.after_selesai ? `
            <span class="penanda-status penanda-status--terdeteksi">
              <span class="penanda-status__ikon" aria-hidden="true">&#10003;</span>
              <span>${escapeHtml(teksSelesai)}</span>
            </span>
          ` : ''}
        </div>
        ${Number(st.after_terbuka || 0) === 1 ? `
          <button type="button" id="tombol-after-s02" class="tombol tombol--utama">
            ${escapeHtml(st.after_selesai ? 'Lihat kembali' : 'Mulai')}
          </button>
        ` : `
          <p class="teks-keterangan" style="margin: 0;">
            ${escapeHtml(teksTerkunci)}
          </p>
        `}
      </section>

      <section class="kartu" aria-label="Pintasan siswa">
        <div class="kisi-pintasan">
          <button type="button" id="pintasan-aku-bisa-s02" class="tombol-pintasan">
            ${escapeHtml(teksPintasanAkuBisa)}
          </button>
          <button type="button" id="pintasan-perjalanan-s02" class="tombol-pintasan">
            ${escapeHtml(teksPintasanPerjalanan)}
          </button>
          <button type="button" id="pintasan-kartu-s02" class="tombol-pintasan">
            ${escapeHtml(teksPintasanKartu)}
          </button>
          <button type="button" id="pintasan-kirim-s02" class="tombol-pintasan">
            ${escapeHtml(teksPintasanKirim)}${jmlMenunggu > 0 ? ` (${jmlMenunggu})` : ''}
          </button>
        </div>

        ${sedangKonfirmasiKeluar ? `
          <div id="peringatan-keluar-s02" class="pesan-hangat pesan-hangat--aksen" role="status" aria-live="polite">
            <p class="pesan-hangat__isi">
              Masih ada <strong>${jmlMenunggu} kiriman</strong> yang menunggu dikirim di HP ini. Bila kamu keluar atau berganti HP sekarang, antrean yang belum terkirim dapat tertinggal.
            </p>
            <div class="baris-tombol" style="margin-top: var(--jarak-2);">
              <button type="button" id="tombol-cek-kirim-keluar-s02" class="tombol tombol--utama">
                Buka Status Pengiriman
              </button>
              <button type="button" id="tombol-tetap-keluar-s02" class="tombol tombol--sekunder">
                Tetap keluar
              </button>
            </div>
          </div>
        ` : ''}

        <button type="button" id="tombol-keluar-s02" class="tombol tombol--sekunder">
          ${escapeHtml(teksKeluar)}
        </button>
      </section>
    `;

    const btnLanjut = document.getElementById('tombol-lanjutkan-s02');
    if (btnLanjut) {
      btnLanjut.addEventListener('click', () => {
        arahKe(langkahLanjut.layar, langkahLanjut.param);
      });
    }

    const tombolUnit = Array.from(wadah.querySelectorAll('.tombol-buka-unit-s02'));
    tombolUnit.forEach((btn) => {
      btn.addEventListener('click', () => {
        const idUnit = btn.getAttribute('data-unit') || 'U1';
        arahKe('S-03', { unit: idUnit });
      });
    });

    const btnMk = document.getElementById('tombol-mk-s02');
    if (btnMk) btnMk.addEventListener('click', () => arahKe('S-50'));

    const btnCp = document.getElementById('tombol-cp-s02');
    if (btnCp) btnCp.addEventListener('click', () => arahKe('S-51'));

    const btnAfter = document.getElementById('tombol-after-s02');
    if (btnAfter) btnAfter.addEventListener('click', () => arahKe('S-10', { fase: 'AF' }));

    const btnAkuBisa = document.getElementById('pintasan-aku-bisa-s02');
    if (btnAkuBisa) btnAkuBisa.addEventListener('click', () => arahKe('S-60'));

    const btnPerjalanan = document.getElementById('pintasan-perjalanan-s02');
    if (btnPerjalanan) btnPerjalanan.addEventListener('click', () => arahKe('S-61'));

    const btnKartu = document.getElementById('pintasan-kartu-s02');
    if (btnKartu) btnKartu.addEventListener('click', () => arahKe('S-62'));

    const btnKirim = document.getElementById('pintasan-kirim-s02');
    if (btnKirim) btnKirim.addEventListener('click', () => arahKe('S-90'));

    const btnKeluar = document.getElementById('tombol-keluar-s02');
    if (btnKeluar) {
      btnKeluar.addEventListener('click', async () => {
        const antreanKini = await ambilSemuaAntrean();
        const masihMenunggu = antreanKini.filter((a) => a.status !== 'Terkirim').length;
        if (masihMenunggu > 0 && !sedangKonfirmasiKeluar) {
          sedangKonfirmasiKeluar = true;
          await gambar();
          return;
        }
        berhentiLangganan();
        aktifDiLayar = false;
        await hapusTokenSesi(true);
        arahKe('S-01');
      });
    }

    const btnCekKirimKeluar = document.getElementById('tombol-cek-kirim-keluar-s02');
    if (btnCekKirimKeluar) {
      btnCekKirimKeluar.addEventListener('click', () => {
        berhentiLangganan();
        aktifDiLayar = false;
        arahKe('S-90');
      });
    }

    const btnTetapKeluar = document.getElementById('tombol-tetap-keluar-s02');
    if (btnTetapKeluar) {
      btnTetapKeluar.addEventListener('click', async () => {
        berhentiLangganan();
        aktifDiLayar = false;
        await hapusTokenSesi(true);
        arahKe('S-01');
      });
    }
  }

  const berhentiLangganan = langgananPerubahanAntrean(() => {
    if (aktifDiLayar) gambar();
  });

  window.addEventListener('hashchange', () => {
    aktifDiLayar = false;
    berhentiLangganan();
  }, { once: true });

  await gambar();

  // Muat status segar dari server saat S-02 dibuka (FR-002)
  if (typeof navigator === 'undefined' || navigator.onLine) {
    try {
      const hasilStatus = await panggilApi('status', {}, {
        tanpaUlang: true,
        janganArahkan: true
      });
      if (hasilStatus && hasilStatus.ok && hasilStatus.data) {
        const { perbaruiStatusServer } = await import('../state.js');
        await perbaruiStatusServer(hasilStatus.data.status || hasilStatus.data);
        if (aktifDiLayar) await gambar();
      }
    } catch (_) {}
  }
}
