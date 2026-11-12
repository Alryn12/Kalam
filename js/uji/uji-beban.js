/**
 * Modul Uji Beban 36 Klien Paralel (situs/js/uji/uji-beban.js)
 * Tugas M0-B: TB-M0-07 (UJ-KUO-01)
 * Acuan: SRS-1 bagian 9; SRS-3 bagian 1 & FR-073, FR-084; SRS-4 UJ-KUO-01
 * Tanpa pustaka luar · ES Module murni · Tanpa warna merah dan tanpa kata gagal/salah di layar
 */

import { KALAM_CONFIG } from '../config.js';
import { hitungPersentil } from './uji-m0.js';

const stateBeban = {
  sedangBerjalan: false,
  daftarKlien: [],
  ringkasanTerakhir: null
};

/**
 * Membuat berkas WAV mono sintetis kecil (~4 KB, durasi 0,25 detik pada 8000 Hz)
 * dalam bentuk string Base64 untuk pengujian unggah_audio paralel tanpa mikrofon
 */
export function buatAudioSintetisBase64(nomorKlien = 1) {
  const sampleRate = 8000;
  const durasiDetik = 0.25;
  const jumlahSampel = Math.floor(sampleRate * durasiDetik); // 2000 sampel = 4000 byte PCM 16-bit
  const ukuranData = jumlahSampel * 2;
  const buffer = new ArrayBuffer(44 + ukuranData);
  const view = new DataView(buffer);

  function tulisString(offset, str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  tulisString(0, 'RIFF');
  view.setUint32(4, 36 + ukuranData, true);
  tulisString(8, 'WAVE');
  tulisString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM
  view.setUint16(20, 1, true);  // Linear PCM
  view.setUint16(22, 1, true);  // 1 kanal (mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tulisString(36, 'data');
  view.setUint32(40, ukuranData, true);

  const frek = 220 + (nomorKlien % 12) * 15;
  for (let i = 0; i < jumlahSampel; i++) {
    const t = i / sampleRate;
    const nilai = Math.sin(2 * Math.PI * frek * t) * 0.25;
    const int16 = Math.max(-32768, Math.min(32767, Math.round(nilai * 32767)));
    view.setInt16(44 + i * 2, int16, true);
  }

  const bytes = new Uint8Array(buffer);
  let biner = '';
  for (let i = 0; i < bytes.length; i++) {
    biner += String.fromCharCode(bytes[i]);
  }
  return btoa(biner);
}

function tungguMd(md) {
  return new Promise((resolve) => setTimeout(resolve, md));
}

function susunMuatanPermintaan(nomor, aksi, idIdempoten) {
  const kodeSiswa = `S${String(nomor).padStart(3, '0')}`;
  if (aksi === 'ping') {
    return {
      aksi: 'ping',
      token: 'UJI-BEBAN-M0',
      id_idempoten: idIdempoten,
      data: { kode_siswa: kodeSiswa }
    };
  }
  if (aksi === 'catat') {
    return {
      aksi: 'catat',
      token: 'UJI-BEBAN-M0',
      id_idempoten: idIdempoten,
      data: {
        kode_siswa: kodeSiswa,
        jenis: 'latihan_uji_m0',
        unit: 1,
        id_butir: `U1-L1-${String(((nomor - 1) % 12) + 1).padStart(3, '0')}`,
        catatan: `Uji beban klien #${nomor}`
      }
    };
  }
  // unggah_audio kecil sintetis
  return {
    aksi: 'unggah_audio',
    token: 'UJI-BEBAN-M0',
    id_idempoten: idIdempoten,
    data: {
      kode_siswa: kodeSiswa,
      jenis: 'UJI',
      unit: 1,
      id_kartu: `U1-L1-${String(((nomor - 1) % 12) + 1).padStart(3, '0')}`,
      bagian: 1,
      mime: 'audio/wav',
      durasi_total: 0.25,
      flag: '',
      metrik: {
        durasi_bersuara_20: 0.25,
        durasi_bersuara_tambahan: 0,
        waktu_mulai_bicara: 0.05,
        dilewati: 0,
        jumlah_ulang: 0,
        batas_detik: 15
      },
      base64: buatAudioSintetisBase64(nomor)
    }
  };
}

/**
 * Mengirim satu permintaan dengan percobaan ulang otomatis (2, 5, 15 detik)
 * bila terjadi kendala jaringan, E_SIBUK, atau E_SERVER sesuai SRS-3 bagian 1.
 */
async function kirimDenganPercobaanUlang(urlApi, muatan, modeSimulasiLokal) {
  const jedaUlangDetik = [2, 5, 15];
  let percobaanKe = 0;
  const mulaiTotalMs = performance.now();

  while (percobaanKe <= jedaUlangDetik.length) {
    percobaanKe++;
    const mulaiPanggilanMs = performance.now();

    if (modeSimulasiLokal) {
      // Simulasi waktu proses server (antara 0,35 s.d. 1,85 detik)
      const latensiSimulasiMd = 350 + Math.random() * 1500;
      await tungguMd(latensiSimulasiMd);
      const waktuDetik = Number(((performance.now() - mulaiTotalMs) / 1000).toFixed(2));
      return {
        berhasil: true,
        percobaan: percobaanKe,
        waktu_detik: waktuDetik,
        waktu_panggilan_terakhir: Number(((performance.now() - mulaiPanggilanMs) / 1000).toFixed(2)),
        kode_hasil: 'OK (Simulasi)',
        duplikat: false
      };
    }

    try {
      const resp = await fetch(urlApi, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(muatan)
      });

      const json = await resp.json();
      if (json && json.ok) {
        const waktuDetik = Number(((performance.now() - mulaiTotalMs) / 1000).toFixed(2));
        return {
          berhasil: true,
          percobaan: percobaanKe,
          waktu_detik: waktuDetik,
          waktu_panggilan_terakhir: Number(((performance.now() - mulaiPanggilanMs) / 1000).toFixed(2)),
          kode_hasil: json.duplikat ? 'OK (Idempoten)' : 'OK',
          duplikat: Boolean(json.duplikat)
        };
      }

      const kodeGalat = json?.galat || 'E_SERVER';
      const perluUlang = kodeGalat === 'E_SIBUK' || kodeGalat === 'E_SERVER';

      if (perluUlang && percobaanKe <= jedaUlangDetik.length) {
        const tungguDetik = jedaUlangDetik[percobaanKe - 1];
        await tungguMd(tungguDetik * 1000);
        continue;
      }

      const waktuDetik = Number(((performance.now() - mulaiTotalMs) / 1000).toFixed(2));
      return {
        berhasil: false,
        percobaan: percobaanKe,
        waktu_detik: waktuDetik,
        waktu_panggilan_terakhir: Number(((performance.now() - mulaiPanggilanMs) / 1000).toFixed(2)),
        kode_hasil: kodeGalat,
        duplikat: false
      };
    } catch (err) {
      console.info('[Log Teknis Uji Beban] Kendala jaringan pada percobaan ke-' + percobaanKe, err);
      if (percobaanKe <= jedaUlangDetik.length) {
        const tungguDetik = jedaUlangDetik[percobaanKe - 1];
        await tungguMd(tungguDetik * 1000);
        continue;
      }
      const waktuDetik = Number(((performance.now() - mulaiTotalMs) / 1000).toFixed(2));
      return {
        berhasil: false,
        percobaan: percobaanKe,
        waktu_detik: waktuDetik,
        waktu_panggilan_terakhir: Number(((performance.now() - mulaiPanggilanMs) / 1000).toFixed(2)),
        kode_hasil: 'KENDALA_JARINGAN',
        duplikat: false
      };
    }
  }
}

function perbaruiTampilanProgres() {
  const selesai = stateBeban.daftarKlien.filter((k) => k.status === 'selesai').length;
  const berhasil = stateBeban.daftarKlien.filter((k) => k.status === 'selesai' && k.berhasil).length;
  const kendala = stateBeban.daftarKlien.filter((k) => k.status === 'selesai' && !k.berhasil).length;
  const waktuList = stateBeban.daftarKlien
    .filter((k) => k.status === 'selesai' && typeof k.waktu_detik === 'number')
    .map((k) => k.waktu_detik);

  const median = waktuList.length > 0 ? Number(hitungPersentil(waktuList, 50).toFixed(2)) : 0;
  const p95 = waktuList.length > 0 ? Number(hitungPersentil(waktuList, 95).toFixed(2)) : 0;

  const elProgres = document.getElementById('label-progres-beban');
  const elBerhasil = document.getElementById('metrik-jumlah-berhasil');
  const elKendala = document.getElementById('metrik-jumlah-kendala');
  const elMedian = document.getElementById('metrik-median-waktu');
  const elP95 = document.getElementById('metrik-p95-waktu');
  const elStatusGerbang = document.getElementById('status-gerbang-kuo01');

  if (elProgres) {
    elProgres.textContent = `Progres: ${selesai} / ${stateBeban.daftarKlien.length} klien selesai`;
  }
  if (elBerhasil) elBerhasil.textContent = `${berhasil} / ${stateBeban.daftarKlien.length}`;
  if (elKendala) elKendala.textContent = String(kendala);
  if (elMedian) elMedian.textContent = waktuList.length > 0 ? `${median} dtk` : '-';
  if (elP95) elP95.textContent = waktuList.length > 0 ? `${p95} dtk` : '-';

  if (elStatusGerbang && selesai === stateBeban.daftarKlien.length && selesai > 0) {
    const lulus = kendala === 0 && p95 <= 10.0;
    elStatusGerbang.className = lulus
      ? 'penanda-status penanda-status--terdeteksi'
      : 'penanda-status penanda-status--coba-lagi';
    elStatusGerbang.innerHTML = lulus
      ? `<span class="penanda-status__ikon" aria-hidden="true">✓</span> UJ-KUO-01 Terpenuhi ✓ (36 berhasil, P95 = ${p95} dtk ≤ 10 dtk)`
      : `Perlu penyesuaian (Kendala = ${kendala}, P95 = ${p95} dtk; batas UJ-KUO-01 ≤ 10 dtk)`;
  }

  // Perbarui daftar baris klien
  const tbody = document.getElementById('tabel-baris-klien');
  if (tbody) {
    tbody.innerHTML = '';
    for (const k of stateBeban.daftarKlien) {
      const tr = document.createElement('tr');
      const tdNo = document.createElement('td');
      tdNo.textContent = `S${String(k.nomor).padStart(3, '0')}`;

      const tdAksi = document.createElement('td');
      tdAksi.textContent = k.aksi;

      const tdJeda = document.createElement('td');
      tdJeda.textContent = `${k.jeda_acak_detik} dtk`;

      const tdWaktu = document.createElement('td');
      tdWaktu.textContent = k.waktu_detik != null ? `${k.waktu_detik} dtk` : '...';

      const tdStatus = document.createElement('td');
      if (k.status === 'menunggu') {
        tdStatus.textContent = 'Menunggu jeda';
      } else if (k.status === 'mengirim') {
        tdStatus.textContent = 'Mengirim...';
      } else if (k.berhasil) {
        tdStatus.textContent = `Terkirim ✓ (${k.kode_hasil}, coba=${k.percobaan})`;
      } else {
        tdStatus.textContent = `Kendala (${k.kode_hasil}, coba=${k.percobaan})`;
      }

      tr.appendChild(tdNo);
      tr.appendChild(tdAksi);
      tr.appendChild(tdJeda);
      tr.appendChild(tdWaktu);
      tr.appendChild(tdStatus);
      tbody.appendChild(tr);
    }
  }

  stateBeban.ringkasanTerakhir = {
    total: stateBeban.daftarKlien.length,
    selesai,
    berhasil,
    kendala,
    median_detik: median,
    p95_detik: p95
  };

  perbaruiPanelSalinBeban();
}

function perbaruiPanelSalinBeban() {
  const area = document.getElementById('area-salin-beban');
  if (!area) return;

  const urlApi = (document.getElementById('input-url-api-beban')?.value || KALAM_CONFIG.API_URL || '').trim();
  const jenisPaket = document.getElementById('pilih-paket-beban')?.value || 'campuran';
  const r = stateBeban.ringkasanTerakhir;

  const baris = [];
  baris.push('=== LAPORAN UJI BEBAN 36 KLIEN PARALEL (TB-M0-07 / UJ-KUO-01) ===');
  baris.push(`Waktu Uji          : ${new Date().toISOString()}`);
  baris.push(`Paket Permintaan   : ${jenisPaket} (36 klien paralel, jeda acak 0-3 detik)`);
  baris.push(`Target Server      : ${urlApi ? 'kalam-api (' + urlApi.slice(0, 48) + '...)' : 'Simulasi Lokal'}`);

  if (!r || r.selesai === 0) {
    baris.push('Status             : Belum dijalankan');
  } else {
    baris.push(`Jumlah Total Klien : ${r.total}`);
    baris.push(`Jumlah Berhasil    : ${r.berhasil}`);
    baris.push(`Jumlah Kendala     : ${r.kendala}`);
    baris.push(`Median Respons     : ${r.median_detik} detik`);
    baris.push(`Persentil ke-95    : ${r.p95_detik} detik (Batas UJ-KUO-01 <= 10,0 detik)`);
    baris.push(`Status UJ-KUO-01   : ${r.kendala === 0 && r.p95_detik <= 10.0 ? 'LULUS ✓' : 'PERLU PENYESUAIAN'}`);
    baris.push('');
    baris.push('--- RINCIAN PER KLIEN ---');
    for (const k of stateBeban.daftarKlien) {
      baris.push(
        `S${String(k.nomor).padStart(3, '0')} | aksi=${k.aksi.padEnd(12, ' ')} | jeda=${k.jeda_acak_detik}d | respons=${k.waktu_detik ?? '-'}d | coba=${k.percobaan || 0} | hasil=${k.kode_hasil || k.status}`
      );
    }
  }

  area.value = baris.join('\n');
}

async function jalankanUjiBeban36(modeSimulasiLokal = false) {
  if (stateBeban.sedangBerjalan) return;

  const urlApi = (document.getElementById('input-url-api-beban')?.value || KALAM_CONFIG.API_URL || '').trim();
  const statusGerbang = document.getElementById('status-gerbang-kuo01');

  if (!modeSimulasiLokal && !urlApi) {
    if (statusGerbang) {
      statusGerbang.className = 'penanda-status penanda-status--coba-lagi';
      statusGerbang.textContent = 'URL kalam-api masih kosong. Isi URL di atas atau gunakan tombol Simulasi Lokal 36 Klien.';
    }
    return;
  }

  stateBeban.sedangBerjalan = true;
  const paket = document.getElementById('pilih-paket-beban')?.value || 'campuran';
  const sesiId = Date.now();

  // Siapkan 36 klien paralel dengan jeda acak 0 sampai 3 detik (SRS-1 §9 & TB-M0-07)
  stateBeban.daftarKlien = Array.from({ length: 36 }, (_, idx) => {
    const nomor = idx + 1;
    let aksi = 'catat';
    if (paket === 'campuran') {
      if (nomor <= 12) aksi = 'ping';
      else if (nomor <= 24) aksi = 'catat';
      else aksi = 'unggah_audio';
    } else if (paket === 'semua_ping') {
      aksi = 'ping';
    } else if (paket === 'semua_catat') {
      aksi = 'catat';
    } else if (paket === 'semua_unggah') {
      aksi = 'unggah_audio';
    }

    const jedaMd = Math.floor(Math.random() * 3000);
    const idIdempoten = `S${String(nomor).padStart(3, '0')}.${sesiId}.${nomor}`;

    return {
      nomor,
      aksi,
      id_idempoten: idIdempoten,
      jeda_acak_md: jedaMd,
      jeda_acak_detik: Number((jedaMd / 1000).toFixed(2)),
      status: 'menunggu',
      berhasil: false,
      percobaan: 0,
      waktu_detik: null,
      kode_hasil: ''
    };
  });

  if (statusGerbang) {
    statusGerbang.className = 'penanda-status penanda-status--menunggu';
    statusGerbang.textContent = modeSimulasiLokal
      ? 'Menjalankan simulasi 36 permintaan paralel (jeda acak 0–3 detik)...'
      : 'Mengirim 36 permintaan paralel ke kalam-api (jeda acak 0–3 detik)...';
  }

  perbaruiTampilanProgres();

  // Jalankan 36 klien secara paralel
  await Promise.all(
    stateBeban.daftarKlien.map(async (klien) => {
      await tungguMd(klien.jeda_acak_md);
      klien.status = 'mengirim';
      perbaruiTampilanProgres();

      const muatan = susunMuatanPermintaan(klien.nomor, klien.aksi, klien.id_idempoten);
      const hasil = await kirimDenganPercobaanUlang(urlApi, muatan, modeSimulasiLokal);

      klien.status = 'selesai';
      klien.berhasil = hasil.berhasil;
      klien.percobaan = hasil.percobaan;
      klien.waktu_detik = hasil.waktu_detik;
      klien.kode_hasil = hasil.kode_hasil;
      perbaruiTampilanProgres();
    })
  );

  stateBeban.sedangBerjalan = false;
  perbaruiTampilanProgres();
}

async function salinHasilBeban() {
  const area = document.getElementById('area-salin-beban');
  const statusEl = document.getElementById('status-salin-beban');
  if (!area) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(area.value);
    } else {
      area.focus();
      area.select();
      document.execCommand('copy');
    }
    if (statusEl) {
      statusEl.className = 'penanda-status penanda-status--terdeteksi';
      statusEl.innerHTML = '<span class="penanda-status__ikon" aria-hidden="true">✓</span> Hasil uji beban berhasil disalin ✓';
    }
  } catch (_) {
    area.focus();
    area.select();
    if (statusEl) {
      statusEl.className = 'penanda-status penanda-status--menunggu';
      statusEl.textContent = 'Teks telah diblok. Tekan tahan lalu pilih Salin.';
    }
  }
}

function inisialisasiUjiBeban() {
  const inputUrl = document.getElementById('input-url-api-beban');
  if (inputUrl && KALAM_CONFIG.API_URL) {
    inputUrl.value = KALAM_CONFIG.API_URL;
  }

  document.getElementById('tombol-mulai-beban-nyata')?.addEventListener('click', () => jalankanUjiBeban36(false));
  document.getElementById('tombol-mulai-beban-simulasi')?.addEventListener('click', () => jalankanUjiBeban36(true));
  document.getElementById('tombol-salin-beban')?.addEventListener('click', salinHasilBeban);

  perbaruiPanelSalinBeban();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inisialisasiUjiBeban);
  } else {
    inisialisasiUjiBeban();
  }
}
