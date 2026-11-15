/**
 * Layar S-20: Tab Tonton & Pengantar 4 Kalimat Penyelamat (situs/js/layar/s20-tonton.js)
 * Tugas M1-G: TB-M1-08 · Acuan: KEPUTUSAN.md SL-BARU-01, SRS-3 FR-014, BP-1, BP-6
 */

import { ambilTeks, muatKontenJson } from '../state.js';
import {
  hentikanAudioModel,
  putarAudioModel,
  putarDaftarAudioModel
} from '../audio-model.js';
import { escapeHtml } from './tahap0-bantu.js';
import {
  apakahPenyelamatU1Sudah,
  catatKejadianSesi1,
  folderAudioUnit,
  pasangNavigasiSesi1,
  pilihBentukAudio,
  pilihBentukTeks,
  renderFooterLanjutRefleksi,
  renderKepalaSesi1,
  siapkanKonteksSesi1,
  tandaiPenyelamatU1Sudah
} from './sesi1-bantu.js';

const IKON_MATA_SVG = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const IKON_ADEGAN_SVG = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="14" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="M21 15l-4.5-4.5L10 17"/></svg>';

function renderPanelPenyelamat(daftarKalimat, bentukLawan) {
  const judul = ambilTeks('S-20', 'judul_penyelamat') || '4 Kalimat Penyelamat';
  const subjudul = ambilTeks('S-20', 'subjudul_penyelamat') || ambilTeks('S-19', 'pengantar_frasa') || '';
  const tombolLanjut = ambilTeks('S-20', 'tombol_lanjut_tonton') || 'Aku siap, mulai menonton';

  const daftarHtml = (daftarKalimat || []).map((k) => {
    const arab = pilihBentukTeks(k.arab, bentukLawan);
    return `
      <button type="button" class="kartu-arab" data-penyelamat-id="${escapeHtml(k.id)}" style="text-align: left; cursor: pointer;">
        <div class="kartu-arab__kepala">
          <span class="kartu-arab__label">${escapeHtml(k.arti_id || '')}</span>
          <span class="teks-keterangan">${escapeHtml(k.id)}</span>
        </div>
        <p class="teks-arab teks-arab--tengah" lang="ar" dir="rtl" style="margin: 0;">${escapeHtml(arab)}</p>
        ${k.keterangan_id ? `<p class="teks-keterangan" style="margin: 0;">${escapeHtml(k.keterangan_id)}</p>` : ''}
      </button>
    `;
  }).join('');

  return `
    <section id="panel-penyelamat-s20" class="kartu" aria-label="${escapeHtml(judul)}" style="display: flex; flex-direction: column; gap: var(--jarak-3);">
      <div class="pesan-hangat pesan-hangat--aksen">
        <p class="pesan-hangat__judul">${escapeHtml(judul)}</p>
        <p class="pesan-hangat__isi">${escapeHtml(subjudul)}</p>
      </div>
      <div style="display: flex; flex-direction: column; gap: var(--jarak-2);">
        ${daftarHtml}
      </div>
      <p id="status-audio-penyelamat" class="teks-keterangan" role="status" style="margin: 0; min-height: 1.2em;"></p>
      <button type="button" id="tombol-tutup-penyelamat" class="tombol tombol--utama">
        ${escapeHtml(tombolLanjut)}
      </button>
    </section>
  `;
}

export async function renderS20({ param = {} } = {}) {
  const konteks = await siapkanKonteksSesi1('S-20', param, 'tonton');
  if (!konteks) return;

  const { kodeSiswa, unitId, blokId, blokData, kemajuan, wadah } = konteks;
  const dialog = Array.isArray(blokData.dialog) ? blokData.dialog : [];
  const dataPenyelamat = unitId === 'U1' ? await muatKontenJson('konten/umum/penyelamat.json') : null;
  const daftarPenyelamat = (dataPenyelamat && Array.isArray(dataPenyelamat.kalimat)) ? dataPenyelamat.kalimat : [];

  let tampilkanPenyelamat = unitId === 'U1' && daftarPenyelamat.length > 0 && !(await apakahPenyelamatU1Sudah(kodeSiswa));
  let indeksAktif = 0;
  let kecepatan = 1;
  let artiDibuka = false;
  let sedangPutarSemua = false;
  let putaranCount = 0;

  function lukis() {
    const bentuk = kemajuan.bentukLawan;
    const dlgAktif = dialog[indeksAktif] || dialog[0] || {};
    const labelAdegan = (ambilTeks('S-20', 'label_adegan') || 'Adegan {n} dari {total}')
      .replace('{n}', String(dialog.length ? indeksAktif + 1 : 0))
      .replace('{total}', String(dialog.length));
    const catatanArti = ambilTeks('S-20', 'catatan_adegan_arti') || 'Keterangan adegan (terjemahan per kalimat menyusul):';
    const teksGambarKosong = ambilTeks('S-20', 'penanda_gambar_kosong') || 'Ilustrasi adegan sedang disiapkan.';
    const lblPutarSemua = sedangPutarSemua
      ? (ambilTeks('S-20', 'tombol_berhenti') || 'Berhenti')
      : (ambilTeks('S-20', 'tombol_putar_semua') || 'Putar semua dialog');
    const lblUlang = ambilTeks('S-20', 'tombol_putar_ulang') || 'Putar ulang';
    const lbl1x = ambilTeks('S-20', 'kecepatan_normal') || '1x';
    const lbl075 = ambilTeks('S-20', 'kecepatan_pelan') || '0,75x';
    const lblMata = artiDibuka
      ? (ambilTeks('S-20', 'ikon_mata_tutup') || 'Sembunyikan arti')
      : (ambilTeks('S-20', 'ikon_mata') || 'Tampilkan arti');

    const barisDialogHtml = dialog.map((d, idx) => {
      const aktif = idx === indeksAktif;
      return `
        <article class="kartu-arab ${aktif ? 'kartu-arab--aktif' : ''}" data-dialog-idx="${idx}">
          <div class="kartu-arab__kepala">
            <span class="teks-arab" lang="ar" dir="rtl" style="font-size: var(--ukuran-teks-arab);">${escapeHtml(d.penutur || '')}</span>
            <button type="button" class="tombol tombol--sekunder" data-putar-baris="${idx}" style="width: auto; padding-inline: var(--jarak-3);">
              ${escapeHtml(ambilTeks('S-21', 'tombol_dengar') || 'Dengar')}
            </button>
          </div>
          <div class="kartu-arab__kotak-kalimat">
            <p class="teks-arab" lang="ar" dir="rtl" style="margin: 0;">${escapeHtml(d.arab || '')}</p>
          </div>
          <div class="kartu-arab__arti" ${artiDibuka ? '' : 'hidden'}>
            <p class="teks-keterangan" style="margin: 0 0 var(--jarak-1) 0;">${escapeHtml(catatanArti)}</p>
            <p style="margin: 0;">${escapeHtml(d.adegan || '')}</p>
          </div>
        </article>
      `;
    }).join('');

    const tombolBukaPenyelamat = (unitId === 'U1' && daftarPenyelamat.length > 0 && !tampilkanPenyelamat)
      ? `<button type="button" id="tombol-buka-penyelamat" class="tombol tombol--sekunder">${escapeHtml(ambilTeks('S-20', 'tombol_buka_penyelamat') || 'Lihat 4 Kalimat Penyelamat')}</button>`
      : '';

    wadah.innerHTML = `
      <section class="wadah-layar" aria-label="${escapeHtml(blokData.judul_id)}">
        ${renderKepalaSesi1(konteks, 'S-20')}
        ${tampilkanPenyelamat ? renderPanelPenyelamat(daftarPenyelamat, bentuk) : ''}
        <section id="panel-dialog-s20" style="display: flex; flex-direction: column; gap: var(--jarak-3);" ${tampilkanPenyelamat ? 'hidden' : ''}>
          <div class="kotak-adegan" aria-live="polite">
            <span class="lencana-penanda-audio">${escapeHtml(labelAdegan)}</span>
            ${dlgAktif.gambar ? `<img id="gambar-adegan-s20" class="kotak-adegan__gambar" src="${escapeHtml(dlgAktif.gambar)}" alt="${escapeHtml(labelAdegan)}">` : ''}
            <div id="pengganti-gambar-s20" style="display: flex; flex-direction: column; align-items: center; gap: var(--jarak-1);" ${dlgAktif.gambar ? 'hidden' : ''}>
              ${IKON_ADEGAN_SVG}
              <p class="teks-keterangan" style="margin: 0;">${escapeHtml(teksGambarKosong)}</p>
            </div>
            ${artiDibuka && dlgAktif.adegan ? `<p class="teks-keterangan" style="margin: 0;">${escapeHtml(dlgAktif.adegan)}</p>` : ''}
          </div>

          <div class="baris-kontrol">
            <button type="button" id="tombol-putar-semua-s20" class="tombol ${sedangPutarSemua ? 'tombol--terpilih' : 'tombol--utama'}">
              ${escapeHtml(lblPutarSemua)}
            </button>
            <button type="button" id="tombol-ulang-s20" class="tombol tombol--sekunder">
              ${escapeHtml(lblUlang)}
            </button>
          </div>

          <div class="baris-kontrol">
            <button type="button" class="tombol tombol--sekunder ${kecepatan === 1 ? 'tombol--terpilih' : ''}" data-kecepatan-s20="1" aria-pressed="${kecepatan === 1}">
              ${escapeHtml(lbl1x)}
            </button>
            <button type="button" class="tombol tombol--sekunder ${kecepatan === 0.75 ? 'tombol--terpilih' : ''}" data-kecepatan-s20="0.75" aria-pressed="${kecepatan === 0.75}">
              ${escapeHtml(lbl075)}
            </button>
            <button type="button" id="tombol-mata-s20" class="tombol tombol--sekunder ${artiDibuka ? 'tombol--terpilih' : ''}" aria-pressed="${artiDibuka}" style="gap: var(--jarak-2);">
              ${IKON_MATA_SVG}
              <span>${escapeHtml(lblMata)}</span>
            </button>
          </div>

          <p id="status-audio-s20" class="teks-keterangan" role="status" style="margin: 0; min-height: 1.2em;"></p>

          <div style="display: flex; flex-direction: column; gap: var(--jarak-3);">
            ${barisDialogHtml}
          </div>

          ${tombolBukaPenyelamat}
          ${renderFooterLanjutRefleksi(konteks)}
        </section>
      </section>
    `;

    pasangEvent();
  }

  function tampilkanStatusAudio(hasil, targetId = 'status-audio-s20') {
    const el = wadah.querySelector(`#${targetId}`);
    if (!el || !hasil) return;
    el.textContent = hasil.status === 'penanda'
      ? (ambilTeks('S-20', 'penanda_audio_model') || 'Memutar nada bantu sementara (rekaman model sedang disiapkan).')
      : '';
  }

  async function putarSatuBaris(idx, catatPutaran = false) {
    const item = dialog[idx];
    if (!item || !konteks.masihAktif()) return;
    sedangPutarSemua = false;
    indeksAktif = idx;
    lukis();
    const hasil = await putarDaftarAudioModel(pilihBentukAudio(item.audio, kemajuan.bentukLawan), folderAudioUnit(unitId), { kecepatan });
    if (!konteks.masihAktif()) return;
    if (catatPutaran && hasil.status !== 'berhenti') {
      putaranCount += 1;
      catatKejadianSesi1(unitId, blokId, 'putaran_tonton', putaranCount, { butir: item.id });
    }
    tampilkanStatusAudio(hasil);
  }

  async function putarSemuaDialog() {
    if (!konteks.masihAktif()) return;
    if (sedangPutarSemua) {
      hentikanAudioModel();
      sedangPutarSemua = false;
      lukis();
      return;
    }
    sedangPutarSemua = true;
    for (let i = 0; i < dialog.length; i += 1) {
      if (!sedangPutarSemua || !konteks.masihAktif()) {
        sedangPutarSemua = false;
        return;
      }
      indeksAktif = i;
      lukis();
      const daftarId = pilihBentukAudio(dialog[i].audio, kemajuan.bentukLawan);
      const hasil = await putarDaftarAudioModel(daftarId, folderAudioUnit(unitId), { kecepatan });
      if (!konteks.masihAktif()) {
        sedangPutarSemua = false;
        return;
      }
      tampilkanStatusAudio(hasil);
      if (hasil.status === 'berhenti' || !sedangPutarSemua) {
        sedangPutarSemua = false;
        return;
      }
    }
    if (sedangPutarSemua && konteks.masihAktif()) {
      sedangPutarSemua = false;
      putaranCount += 1;
      catatKejadianSesi1(unitId, blokId, 'putaran_tonton', putaranCount, { butir: blokId });
      lukis();
    }
  }

  function pasangEvent() {
    pasangNavigasiSesi1(konteks, () => lukis());

    const img = wadah.querySelector('#gambar-adegan-s20');
    const pengganti = wadah.querySelector('#pengganti-gambar-s20');
    if (img && pengganti) {
      img.addEventListener('error', () => {
        img.hidden = true;
        pengganti.hidden = false;
      }, { once: true });
    }

    wadah.querySelectorAll('[data-penyelamat-id]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pnId = btn.getAttribute('data-penyelamat-id');
        const butir = daftarPenyelamat.find((x) => x.id === pnId);
        if (!butir) return;
        catatKejadianSesi1(unitId, blokId, 'ketukan_penyelamat', 1, { butir: pnId });
        const hasil = await putarAudioModel(pilihBentukAudio(butir.audio, kemajuan.bentukLawan), 'umum', { kecepatan });
        tampilkanStatusAudio(hasil, 'status-audio-penyelamat');
      });
    });

    const btnTutupPn = wadah.querySelector('#tombol-tutup-penyelamat');
    if (btnTutupPn) {
      btnTutupPn.addEventListener('click', async () => {
        hentikanAudioModel();
        await tandaiPenyelamatU1Sudah(kodeSiswa);
        tampilkanPenyelamat = false;
        lukis();
      });
    }

    const btnBukaPn = wadah.querySelector('#tombol-buka-penyelamat');
    if (btnBukaPn) {
      btnBukaPn.addEventListener('click', () => {
        hentikanAudioModel();
        sedangPutarSemua = false;
        tampilkanPenyelamat = true;
        lukis();
      });
    }

    const btnPutarSemua = wadah.querySelector('#tombol-putar-semua-s20');
    if (btnPutarSemua) btnPutarSemua.addEventListener('click', putarSemuaDialog);

    const btnUlang = wadah.querySelector('#tombol-ulang-s20');
    if (btnUlang) {
      btnUlang.addEventListener('click', () => {
        sedangPutarSemua = false;
        indeksAktif = 0;
        putarSemuaDialog();
      });
    }

    wadah.querySelectorAll('[data-kecepatan-s20]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const k = Number(btn.getAttribute('data-kecepatan-s20'));
        if (k === kecepatan) return;
        kecepatan = k;
        catatKejadianSesi1(unitId, blokId, 'kecepatan_tonton', k);
        lukis();
      });
    });

    const btnMata = wadah.querySelector('#tombol-mata-s20');
    if (btnMata) {
      btnMata.addEventListener('click', () => {
        artiDibuka = !artiDibuka;
        if (artiDibuka) catatKejadianSesi1(unitId, blokId, 'arti_dibuka', 1);
        lukis();
      });
    }

    wadah.querySelectorAll('[data-putar-baris]').forEach((btn) => {
      btn.addEventListener('click', () => {
        putarSatuBaris(Number(btn.getAttribute('data-putar-baris')), true);
      });
    });
  }

  lukis();
}
