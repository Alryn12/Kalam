/**
 * Layar S-13: Tes Baca "Dengar dan Ketuk" (situs/js/layar/s13-tes-baca.js)
 * Tugas M1-D: TB-M1-05
 * Acuan: SRS-3 FR-007; IN-1 §3.2; BP-1 S-13; BP-5 K-19, K-23, K-24; BP-6 S-13; KD-P17
 *
 * ATURAN KEAMANAN: Kunci jawaban tidak ada di kode, JSON, maupun jaringan.
 * Skor baca dan kelompok baca tidak pernah ditampilkan kepada siswa.
 */

import { hentikanAudioModel, putarAudioModel } from '../audio-model.js';
import { arahKe } from '../router.js';
import { ambilTeks, muatKontenJson } from '../state.js';
import {
  ambilFase,
  escapeHtml,
  kirimAtauAntre,
  siapkanWadahLayar,
  simpanKemajuanTahap0
} from './tahap0-bantu.js';

export async function renderS13({ param = {} } = {}) {
  const fase = ambilFase(param);
  const judul = ambilTeks('S-13', 'judul') || 'Dengar dan ketuk';
  const wadah = siapkanWadahLayar('S-13', judul);
  if (!wadah) return;

  let dataTes;
  try {
    dataTes = await muatKontenJson('konten/umum/tes-baca.json');
  } catch (_) {
    wadah.innerHTML = `
      <section class="kartu">
        <h1 class="judul-layar">${escapeHtml(judul)}</h1>
        <div class="pesan-hangat pesan-hangat--aksen" role="status">
          <p class="pesan-hangat__isi">Daftar butir tes baca belum termuat. Silakan coba lagi.</p>
        </div>
        <button type="button" id="tombol-muat-ulang-s13" class="tombol tombol--utama">Coba lagi</button>
      </section>
    `;
    const btnUlang = document.getElementById('tombol-muat-ulang-s13');
    if (btnUlang) btnUlang.addEventListener('click', () => renderS13({ param }));
    return;
  }

  const daftarButir = Array.isArray(dataTes && dataTes.butir) ? dataTes.butir : [];
  const maksPutar = Number(dataTes && dataTes.maks_putar) || 3;
  const instruksiLayar = (dataTes && dataTes.instruksi_layar) || ambilTeks('S-13', 'instruksi');
  const teksPutar = ambilTeks('S-13', 'tombol_putar');
  const teksTidakTahu = ambilTeks('S-13', 'pilihan_khusus');
  const teksUmpanBalik = ambilTeks('S-13', 'umpan_balik');
  const teksPutarHabis = ambilTeks('S-13', 'putar_habis');
  const teksLewati = ambilTeks('S-13', 'tombol_lewati');

  const jawaban = new Array(daftarButir.length).fill('lewati');
  const waktuPerButir = new Array(daftarButir.length).fill(0);
  let indeks = 0;
  let sedangTransisi = false;

  async function kirimDanLanjut() {
    hentikanAudioModel();
    wadah.innerHTML = `
      <section class="kartu">
        <h1 class="judul-layar">${escapeHtml(judul)}</h1>
        <p class="teks-instruksi">Menyimpan jawabanmu…</p>
      </section>
    `;

    await kirimAtauAntre(
      'tes_baca_kirim',
      {
        fase,
        jawaban,
        waktu_per_butir: waktuPerButir
      },
      `Tes baca (${fase})`
    );
    await simpanKemajuanTahap0('S-14', fase);
    arahKe('S-14', { fase });
  }

  function renderButir() {
    hentikanAudioModel();
    const butir = daftarButir[indeks];
    if (!butir) {
      kirimDanLanjut();
      return;
    }

    let jumlahPutar = 0;
    const waktuMulaiMs = Date.now();
    const penandaButir = ambilTeks('S-13', 'penanda', { n: indeks + 1 }) || `Butir ${indeks + 1} dari ${daftarButir.length}`;

    const tombolPilihanHtml = (butir.pilihan || []).map((opsi, i) => `
      <button
        type="button"
        class="tombol-pilihan-arab pilihan-arab-s13"
        data-nilai="${escapeHtml(opsi)}"
        data-urutan="${i + 1}"
      >
        <span class="teks-arab teks-arab--besar teks-arab--tengah" dir="rtl" lang="ar">${escapeHtml(opsi)}</span>
      </button>
    `).join('');

    wadah.innerHTML = `
      <section class="kartu" aria-labelledby="judul-s13">
        <div class="daftar-status">
          <span class="penanda-status penanda-status--menunggu">
            <span>${escapeHtml(penandaButir)}</span>
          </span>
        </div>

        <h1 id="judul-s13" class="judul-layar">${escapeHtml(judul)}</h1>
        <p class="teks-keterangan">${escapeHtml(instruksiLayar)}</p>
        <p class="teks-instruksi" style="font-weight: 600;">${escapeHtml(butir.instruksi)}</p>

        <div class="baris-tombol">
          <button type="button" id="tombol-putar-s13" class="tombol tombol--utama">
            &#128266; ${escapeHtml(teksPutar)} (sisa ${maksPutar} kali)
          </button>
          <div id="wadah-penanda-audio-s13" aria-live="polite"></div>
        </div>

        <div class="kisi-pilihan-arab" role="group" aria-label="Pilihan jawaban Arab">
          ${tombolPilihanHtml}
        </div>

        <button type="button" id="tombol-tidak-tahu-s13" class="tombol tombol--sekunder">
          ${escapeHtml(teksTidakTahu)}
        </button>

        <div id="umpan-balik-s13" aria-live="polite"></div>

        <button type="button" id="tombol-lewati-s13" class="tombol tombol--sekunder">
          ${escapeHtml(teksLewati)}
        </button>
      </section>
    `;

    const btnPutar = document.getElementById('tombol-putar-s13');
    const wadahPenandaAudio = document.getElementById('wadah-penanda-audio-s13');
    const daftarBtnPilihan = Array.from(wadah.querySelectorAll('.pilihan-arab-s13'));
    const btnTidakTahu = document.getElementById('tombol-tidak-tahu-s13');
    const wadahUmpan = document.getElementById('umpan-balik-s13');
    const btnLewati = document.getElementById('tombol-lewati-s13');

    if (btnPutar) {
      btnPutar.addEventListener('click', async () => {
        if (sedangTransisi || jumlahPutar >= maksPutar) return;
        jumlahPutar += 1;
        const sisa = maksPutar - jumlahPutar;

        if (sisa > 0) {
          btnPutar.innerHTML = `&#128266; ${escapeHtml(teksPutar)} (sisa ${sisa} kali)`;
        } else {
          btnPutar.disabled = true;
          btnPutar.className = 'tombol tombol--nonaktif';
          btnPutar.textContent = teksPutar;
          if (wadahPenandaAudio) {
            wadahPenandaAudio.innerHTML = `
              <div class="pesan-hangat" role="status">
                <p class="pesan-hangat__isi">${escapeHtml(teksPutarHabis)}</p>
              </div>
            `;
          }
        }

        const hasilPutar = await putarAudioModel(butir.audio, 'umum');
        if (hasilPutar.status === 'penanda' && wadahPenandaAudio) {
          const infoHabis = sisa <= 0 ? `<p class="pesan-hangat__isi" style="margin-bottom: var(--jarak-2);">${escapeHtml(teksPutarHabis)}</p>` : '';
          wadahPenandaAudio.innerHTML = `
            ${infoHabis ? `<div class="pesan-hangat" role="status">${infoHabis}</div>` : ''}
            <span class="lencana-penanda-audio">
              &#9834; Penanda audio sementara: <strong>${escapeHtml(butir.audio)}</strong>
            </span>
          `;
        }
      });
    }

    function pilihJawaban(nilaiJawaban, tombolDipilih) {
      if (sedangTransisi) return;
      sedangTransisi = true;

      const durasiDetik = Number(((Date.now() - waktuMulaiMs) / 1000).toFixed(1));
      jawaban[indeks] = nilaiJawaban;
      waktuPerButir[indeks] = durasiDetik;

      daftarBtnPilihan.forEach((b) => {
        b.disabled = true;
        if (b === tombolDipilih) b.classList.add('tombol-pilihan-arab--terpilih');
      });
      if (btnTidakTahu) {
        btnTidakTahu.disabled = true;
        if (btnTidakTahu === tombolDipilih) btnTidakTahu.classList.add('tombol--terpilih');
      }
      if (btnLewati) btnLewati.disabled = true;
      if (btnPutar) btnPutar.disabled = true;

      if (wadahUmpan) {
        wadahUmpan.innerHTML = `
          <div class="pesan-hangat" role="status">
            <p class="pesan-hangat__isi" style="font-weight: 700;">${escapeHtml(teksUmpanBalik)}</p>
          </div>
        `;
      }

      setTimeout(() => {
        sedangTransisi = false;
        indeks += 1;
        if (indeks >= daftarButir.length) {
          kirimDanLanjut();
        } else {
          renderButir();
        }
      }, 500);
    }

    daftarBtnPilihan.forEach((btn) => {
      btn.addEventListener('click', () => {
        const nilai = btn.getAttribute('data-nilai') || '';
        pilihJawaban(nilai, btn);
      });
    });

    if (btnTidakTahu) {
      btnTidakTahu.addEventListener('click', () => {
        pilihJawaban('tidak_tahu', btnTidakTahu);
      });
    }

    if (btnLewati) {
      btnLewati.addEventListener('click', () => {
        if (sedangTransisi) return;
        sedangTransisi = true;
        const durasiDetik = Number(((Date.now() - waktuMulaiMs) / 1000).toFixed(1));
        for (let i = indeks; i < daftarButir.length; i += 1) {
          jawaban[i] = 'lewati';
          waktuPerButir[i] = i === indeks ? durasiDetik : 0;
        }
        sedangTransisi = false;
        kirimDanLanjut();
      });
    }
  }

  renderButir();
}
