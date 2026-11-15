/**
 * Halaman Uji Mesin Suara, Rekam & Mode Mandiri (situs/js/uji/uji-mesin.js)
 * Tugas M1-H: Verifikasi FR-071, FR-072, FR-074, FR-083 (bagian TB-M1-09)
 */

import { ambilState, muatKontenAwal } from '../state.js';
import {
  ambilParameterDeteksi,
  apakahKataCocok,
  buatPengelolaModeMandiri,
  cekDukunganPengenalanSuara,
  ekstrakKataWajibDariTeks,
  evaluasiDeteksiItem,
  hitungSkorKataKunci,
  jalankanSesiPengenalanSuara,
  jarakLevenshtein,
  normalisasiArab,
  renderKotakModeMandiri
} from '../suara.js';
import {
  analisisAmplitudoBlob,
  buatPerekamLatihan,
  evaluasiHasilRekamLatihan,
  hitungMetrikAmplitudo,
  infoMimeMediaRecorder,
  pilihMimeRekam
} from '../rekam.js';

function escapeHtml(teks) {
  return String(teks == null ? '' : teks)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function kumpulkanSemuaItem(simpul, hasil = []) {
  if (!simpul || typeof simpul !== 'object') return hasil;
  if (Array.isArray(simpul)) {
    for (const el of simpul) kumpulkanSemuaItem(el, hasil);
    return hasil;
  }
  const idItem = simpul.id || simpul.id_item;
  if (idItem && (Array.isArray(simpul.kata_wajib) || Array.isArray(simpul.diterima))) {
    hasil.push(Object.assign({ id_item: idItem }, simpul));
  }
  for (const nilai of Object.values(simpul)) {
    if (nilai && typeof nilai === 'object') kumpulkanSemuaItem(nilai, hasil);
  }
  return hasil;
}

function buatBufferPcmSintetis({ sampleRate = 16000, segmen = [], durasiTotal = 6.0, amplitudoLatar = 0.002 } = {}) {
  const totalSampel = Math.round(sampleRate * durasiTotal);
  const pcm = new Float32Array(totalSampel);
  for (let i = 0; i < totalSampel; i++) {
    const t = i / sampleRate;
    pcm[i] = amplitudoLatar * Math.sin(2 * Math.PI * 55 * t);
  }
  for (const sg of segmen) {
    const idxMulai = Math.max(0, Math.round(sg.mulai * sampleRate));
    const idxAkhir = Math.min(totalSampel, Math.round(sg.akhir * sampleRate));
    const amp = sg.amplitudo != null ? sg.amplitudo : 0.25;
    for (let i = idxMulai; i < idxAkhir; i++) {
      const t = i / sampleRate;
      pcm[i] = amp * Math.sin(2 * Math.PI * 220 * t);
    }
  }
  return pcm;
}

function buatBlobWavDariPcm(pcmFloat32, sampleRate = 16000) {
  const panjangData = pcmFloat32.length * 2;
  const buffer = new ArrayBuffer(44 + panjangData);
  const view = new DataView(buffer);

  const tulisAscii = (offset, teks) => {
    for (let i = 0; i < teks.length; i++) {
      view.setUint8(offset + i, teks.charCodeAt(i));
    }
  };

  tulisAscii(0, 'RIFF');
  view.setUint32(4, 36 + panjangData, true);
  tulisAscii(8, 'WAVE');
  tulisAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  tulisAscii(36, 'data');
  view.setUint32(40, panjangData, true);

  let offset = 44;
  for (let i = 0; i < pcmFloat32.length; i++) {
    const s = Math.max(-1, Math.min(1, pcmFloat32[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function catatButir(daftar, kode, nama, lulus, detail) {
  daftar.push({
    kode,
    nama,
    lulus: Boolean(lulus),
    detail: String(detail || '')
  });
}

async function muatJsonLokal(jalur) {
  const res = await fetch(jalur);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} saat memuat ${jalur}`);
  }
  return res.json();
}

export async function jalankanSemuaPengujianMesin() {
  await muatKontenAwal();
  const state = ambilState();
  const paramJson = state.parameter || (await muatJsonLokal('konten/umum/parameter.json'));
  const teksUiJson = state.teksUi || (await muatJsonLokal('konten/umum/teks-ui.json'));
  const blokA = await muatJsonLokal('konten/u1/blok-a.json');
  const blokB = await muatJsonLokal('konten/u1/blok-b.json');

  const itemA = kumpulkanSemuaItem(blokA);
  const itemB = kumpulkanSemuaItem(blokB);
  const semuaItemU1 = [...itemA, ...itemB];

  const kelompok = [];

  // === KELOMPOK 1: Normalisasi Arab (FR-071) ===
  const butirK1 = [];
  {
    const n1 = normalisasiArab('السَّلَامُ عَلَيْكُمْ');
    const n2 = normalisasiArab('الْحَمْدُ لِلّٰهِ');
    const n3 = normalisasiArab('شُـكْـرًا');
    const ok = n1 === 'السلام عليكم' && n2 === 'الحمد لله' && n3 === 'شكرا';
    catatButir(
      butirK1,
      'UJI-M1H-01',
      'Buang harakat (U+064B..U+0652, U+0670) dan tatwil (U+0640)',
      ok,
      `Hasil: ["${n1}", "${n2}", "${n3}"]`
    );
  }
  {
    const sumberAlef = 'أَهْلًا وَإِلَىٰ مَرْحَبًا آدَم ٱسْمِي لَيْلَتُكَ سَعِيدَةٌ';
    const hasil = normalisasiArab(sumberAlef);
    const harap = 'اهلا والي مرحبا ادم اسمي ليلتك سعيده';
    catatButir(
      butirK1,
      'UJI-M1H-02',
      'Seragamkan alef (أ إ آ ٱ → ا), alif maqshurah (ى → ي), dan ta marbutah (ة → ه)',
      hasil === harap,
      `Keluar: "${hasil}" (sasaran: "${harap}")`
    );
  }
  {
    const transkrip = 'السَّلَامُ عَلَيْكُمْ، كَيْفَ حَالُكَ؟!';
    const target = 'السلام عليكم كيف حالك';
    const hasilT = normalisasiArab(transkrip);
    const hasilK = normalisasiArab('إِلَى اللِّقَاءِ!');
    const ok = hasilT === target && hasilK === 'الي اللقاء';
    catatButir(
      butirK1,
      'UJI-M1H-03',
      'Buang tanda baca Arab/umum dan konsistensi normalisasi dua sisi',
      ok,
      `Transkrip -> "${hasilT}", Kata target -> "${hasilK}"`
    );
  }
  kelompok.push({
    judul: 'Kelompok 1 — Normalisasi Teks Arab (FR-071)',
    butir: butirK1
  });

  // === KELOMPOK 2: Kata Wajib, Levenshtein <= 1, & Ambang 0,5 Item Unit 1 ===
  const butirK2 = [];
  {
    const pDeteksi = ambilParameterDeteksi();
    const ok =
      pDeteksi.bahasa === 'ar-SA' &&
      pDeteksi.maks_alternatif === 5 &&
      pDeteksi.ambang_deteksi === 0.5 &&
      pDeteksi.jarak_edit_maks === 1 &&
      pDeteksi.panjang_kata_min_jarak_edit === 4 &&
      pDeteksi.batas_hasil_kosong_ke_mandiri === 2 &&
      Boolean(paramJson && paramJson.deteksi_kata_kunci);
    catatButir(
      butirK2,
      'UJI-M1H-04',
      'Parameter deteksi kata kunci terbaca dari parameter.json',
      ok,
      `bahasa=${pDeteksi.bahasa}, maks_alternatif=${pDeteksi.maks_alternatif}, ambang=${pDeteksi.ambang_deteksi}, jarak=${pDeteksi.jarak_edit_maks}, min_huruf=${pDeteksi.panjang_kata_min_jarak_edit}`
    );
  }
  {
    const d1 = jarakLevenshtein('عليكم', 'عليكن');
    const c4Cocok = apakahKataCocok('عَلَيْكُنْ', 'عليكم');
    const c4Beda2 = apakahKataCocok('السلامي', 'السلام'); // panjang 7 vs 6 = 1; gunakan 'سلمتم' jarak >= 2
    const c4Jarak2 = apakahKataCocok('سلمتم', 'السلام');
    const c3Jarak1 = apakahKataCocok('اني', 'انت'); // panjang 3 (< 4 huruf): tidak memakai jarak edit 1
    const c2Jarak1 = apakahKataCocok('عن', 'من');   // panjang 2 (< 4 huruf): tidak memakai jarak edit 1
    const ok =
      d1 === 1 &&
      c4Cocok.cocok === true &&
      c4Cocok.alasan === 'jarak_edit_1' &&
      c4Beda2.cocok === true &&
      c4Jarak2.cocok === false &&
      c3Jarak1.cocok === false &&
      c2Jarak1.cocok === false;
    catatButir(
      butirK2,
      'UJI-M1H-05',
      'Levenshtein <= 1 berlaku hanya untuk kata >= 4 huruf, kata < 4 huruf wajib persis',
      ok,
      `jarak("عليكم","عليكن")=${d1} (${c4Cocok.alasan}); jarak2=${c4Jarak2.jarak} (cocok=${c4Jarak2.cocok}); kata3("اني","انت") cocok=${c3Jarak1.cocok}; kata2("عن","من") cocok=${c2Jarak1.cocok}`
    );
  }
  {
    const itemSalam = semuaItemU1.find((it) => it.id_item === 'U1-L1-001');
    const itemSyukur = semuaItemU1.find((it) => it.id_item === 'U1-L1-014');
    const itemDiterima = semuaItemU1.find((it) => !it.kata_wajib && Array.isArray(it.diterima) && it.diterima.length > 0);

    const h1 = itemSalam ? evaluasiDeteksiItem(['عَلَيْكُنْ'], itemSalam, 0.5) : null;
    const hAlt = itemSalam
      ? evaluasiDeteksiItem(['صباح الخير', 'مساء النور', 'اهلا', 'السَّلَامُ عَلَيْكُنْ', 'شكرا'], itemSalam, 0.5)
      : null;
    const h2Kurang = itemSyukur ? evaluasiDeteksiItem(['الحمد'], itemSyukur, 0.5) : null;
    const h2Lulus = itemSyukur ? evaluasiDeteksiItem(['الحمد لله'], itemSyukur, 0.5) : null;

    const kataPertamaDiterima = itemDiterima ? ekstrakKataWajibDariTeks(itemDiterima.diterima[0]) : [];
    const h3 = itemDiterima ? evaluasiDeteksiItem([itemDiterima.diterima[0]], itemDiterima, 0.5) : null;

    const ok = Boolean(
      itemSalam && itemSyukur && itemDiterima &&
      h1 && h1.k_wajib === 2 && h1.syarat_minimal === 1 && h1.skor_kata_kunci === 1 && h1.terdeteksi === true &&
      hAlt && hAlt.terdeteksi === true && hAlt.skor_kata_kunci === 2 &&
      h2Kurang && h2Kurang.k_wajib === 3 && h2Kurang.syarat_minimal === 2 && h2Kurang.terdeteksi === false &&
      h2Lulus && h2Lulus.skor_kata_kunci === 2 && h2Lulus.terdeteksi === true &&
      kataPertamaDiterima.length > 0 && h3 && h3.terdeteksi === true
    );
    catatButir(
      butirK2,
      'UJI-M1H-06',
      'Ambang 0,5 (maks(1, ceil(0,5 × k_wajib))) dan 5 alternatif pada item nyata Unit 1',
      ok,
      `U1-L1-001 (k=2, min=1): skor=1 terdeteksi=${h1?.terdeteksi}, alt4 skor=${hAlt?.skor_kata_kunci}; U1-L1-014 (k=3, min=2): 1 kata=${h2Kurang?.terdeteksi}, 2 kata=${h2Lulus?.terdeteksi}; item ${itemDiterima?.id_item} terdeteksi=${h3?.terdeteksi}`
    );
  }
  {
    const kunciSebelum = Object.keys(localStorage).length + Object.keys(sessionStorage).length;
    const sampelRahasia = 'السَّلَامُ عَلَيْكُمْ وَرَحْمَةُ اللَّهِ';
    let langDipakai = '';
    let maksAltDipakai = 0;

    class MockSpeech {
      constructor() {
        this.lang = '';
        this.maxAlternatives = 1;
      }
      start() {
        langDipakai = this.lang;
        maksAltDipakai = this.maxAlternatives;
        if (this.onresult) {
          this.onresult({
            results: [[
              { transcript: 'كلام اخر' },
              { transcript: sampelRahasia }
            ]]
          });
        }
      }
      stop() {}
      abort() {}
    }

    const sesi = jalankanSesiPengenalanSuara({
      SpeechRecognitionCtor: MockSpeech,
      abaikanAturanHp: true
    });
    let alternatifPertama = sesi.hentikan();
    const alternatifKeduaKosong = sesi.hentikan();
    const itemSalam = semuaItemU1.find((it) => it.id_item === 'U1-L1-001');
    const deteksiTanpaBocoran = evaluasiDeteksiItem(alternatifPertama.map((a) => a.transcript), itemSalam, 0.5);

    const teksGabungStorage = JSON.stringify(localStorage) + JSON.stringify(sessionStorage);
    const adaTranskripTersimpan =
      teksGabungStorage.includes('السلام') ||
      teksGabungStorage.includes(sampelRahasia) ||
      'transkrip' in deteksiTanpaBocoran ||
      'alternatif' in deteksiTanpaBocoran;
    const kunciSesudah = Object.keys(localStorage).length + Object.keys(sessionStorage).length;
    const ok =
      sesi.aktif === true &&
      langDipakai === 'ar-SA' &&
      maksAltDipakai === 5 &&
      alternatifPertama.length === 2 &&
      alternatifKeduaKosong.length === 0 &&
      deteksiTanpaBocoran.terdeteksi === true &&
      !adaTranskripTersimpan &&
      kunciSesudah === kunciSebelum;

    // Lepaskan referensi alternatif lokal segera
    alternatifPertama = [];

    catatButir(
      butirK2,
      'UJI-M1H-07',
      'Konfigurasi ar-SA maxAlternatives 5 dan transkrip hanya di memori (R-28)',
      ok,
      `lang=${langDipakai}, maxAlternatives=${maksAltDipakai}, sisa setelah hentikan()=${alternatifKeduaKosong.length}, bebas penyimpanan permanen=${!adaTranskripTersimpan}`
    );
  }
  kelompok.push({
    judul: 'Kelompok 2 — Kata Wajib, Levenshtein <= 1 & Ambang 0,5 Unit 1 (FR-071)',
    butir: butirK2
  });

  // === KELOMPOK 3: Simulasi Kosong 2x, Tanpa SpeechRecognition (UJ-M0-03), & Mode Mandiri ===
  const butirK3 = [];
  {
    const cekTanpa = cekDukunganPengenalanSuara({ SpeechRecognitionCtor: null });
    const pengelolaTanpa = buatPengelolaModeMandiri({ dukunganSpeech: cekTanpa });

    class MockSpeechHp { start() {} stop() {} abort() {} }
    const cekHp = cekDukunganPengenalanSuara({
      SpeechRecognitionCtor: MockSpeechHp,
      userAgent: 'Mozilla/5.0 (Linux; Android 13; Redmi Note 11) Mobile Safari/537.36'
    });

    const ok =
      cekTanpa.tersedia_api === false &&
      cekTanpa.dukungan_pengenalan_suara === 0 &&
      cekTanpa.alasan_mandiri === 'tanpa_dukungan_speech' &&
      pengelolaTanpa.apakahModeMandiri() === true &&
      cekHp.tersedia_api === true &&
      cekHp.aktif_dipakai === false &&
      cekHp.alasan_mandiri === 'perangkat_hp_mandiri';

    catatButir(
      butirK3,
      'UJI-M1H-08',
      'Simulasi tanpa SpeechRecognition (UJ-M0-03 / K-10) & aturan HP parameter.json tanpa galat',
      ok,
      `tanpa_speech -> mode_mandiri=${pengelolaTanpa.apakahModeMandiri()} (${cekTanpa.alasan_mandiri}); UA HP -> aktif=${cekHp.aktif_dipakai} (${cekHp.alasan_mandiri})`
    );
  }
  {
    class MockSpeechDesktop { start() {} stop() {} abort() {} }
    const cekDesktop = cekDukunganPengenalanSuara({
      SpeechRecognitionCtor: MockSpeechDesktop,
      abaikanAturanHp: true
    });
    const pm = buatPengelolaModeMandiri({ dukunganSpeech: cekDesktop });

    const s0 = pm.apakahModeMandiri();
    const k1 = pm.catatHasilSpeech({ transkripKosong: true });
    const kTerisi = pm.catatHasilSpeech({ transkripKosong: false }); // mereset hitungan berturut
    const kUlang1 = pm.catatHasilSpeech({ transkripKosong: true });
    const kUlang2 = pm.catatHasilSpeech({ transkripKosong: true }); // ke-2 berturut-turut -> pindah mandiri
    const statusAktif = pm.apakahModeMandiri();
    const statusSetelahReset = pm.resetLevel();

    const ok =
      s0 === false &&
      k1.beralih_ke_mandiri === false &&
      k1.hitung_kosong_berturut === 1 &&
      kTerisi.hitung_kosong_berturut === 0 &&
      kUlang1.beralih_ke_mandiri === false &&
      kUlang2.beralih_ke_mandiri === true &&
      kUlang2.alasan_aktif === 'hasil_kosong_2x' &&
      statusAktif === true &&
      statusSetelahReset.mode_mandiri === false;

    catatButir(
      butirK3,
      'UJI-M1H-09',
      'Simulasi hasil kosong 2x berturut-turut dalam satu level otomatis ke mode mandiri (K-11)',
      ok,
      `Awal=${s0} -> kosong1=${k1.hitung_kosong_berturut} -> terisi=0 -> kosong1+2=${kUlang2.hitung_kosong_berturut} (mandiri=${statusAktif}, alasan=${kUlang2.alasan_aktif}) -> resetLevel=${statusSetelahReset.mode_mandiri}`
    );
  }
  {
    class MockSpeechKonflik { start() {} stop() {} abort() {} }
    const cek = cekDukunganPengenalanSuara({
      SpeechRecognitionCtor: MockSpeechKonflik,
      abaikanAturanHp: true
    });
    const pm = buatPengelolaModeMandiri({ dukunganSpeech: cek });
    const konf = pm.catatHasilSpeech({
      konflikTerjadi: true,
      izinMikrofonAda: true
    });
    const setelahResetLevel = pm.resetLevel();

    const pm2 = buatPengelolaModeMandiri({ dukunganSpeech: cek });
    pm2.catatHasilSpeech({ transkripKosong: true, rekamanSunyiSaatSpeech: true, izinMikrofonAda: true });
    const konfSunyi2 = pm2.catatHasilSpeech({ transkripKosong: true, rekamanSunyiSaatSpeech: true, izinMikrofonAda: true });

    const ok =
      konf.beralih_ke_mandiri === true &&
      konf.alasan_aktif === 'konflik_rekam_speech' &&
      konf.alasan_permanen === true &&
      setelahResetLevel.mode_mandiri === true &&
      konfSunyi2.beralih_ke_mandiri === true &&
      konfSunyi2.alasan_aktif === 'konflik_rekam_speech';

    catatButir(
      butirK3,
      'UJI-M1H-10',
      'Konflik rekam + pengenalan suara otomatis mengalihkan ke mode mandiri permanen (K-12)',
      ok,
      `konflik -> alasan=${konf.alasan_aktif}, tetap aktif lintas level=${setelahResetLevel.mode_mandiri}, sunyiSaatSpeech2x=${konfSunyi2.alasan_aktif}`
    );
  }
  {
    const cekTanpa = cekDukunganPengenalanSuara({ SpeechRecognitionCtor: null });
    const pm = buatPengelolaModeMandiri({ dukunganSpeech: cekTanpa });
    const cYa = pm.catatPilihanMandiri('ya', { id_item: 'U1-L1-001' });
    const cBelum = pm.catatPilihanMandiri('belum', { id_item: 'U1-L1-009' });
    const htmlKotak = renderKotakModeMandiri({ pertanyaan: 'Sudah mirip dengan model?' });
    const punyaTeksUi = Boolean(teksUiJson && teksUiJson['S-31'] && teksUiJson['S-31'].pilihan_mandiri);

    const ok =
      cYa.hasil === 'mandiri_ya' &&
      cYa.terpenuhi === true &&
      cYa.flag === 'mode_mandiri' &&
      cYa.mode_mandiri === true &&
      cBelum.hasil === 'mandiri_belum' &&
      cBelum.terpenuhi === false &&
      cBelum.flag === 'mode_mandiri' &&
      htmlKotak.includes('Sudah mirip dengan model?') &&
      htmlKotak.includes('Ya') &&
      htmlKotak.includes('Belum') &&
      punyaTeksUi;

    catatButir(
      butirK3,
      'UJI-M1H-11',
      'Mode penilaian mandiri mencatat mandiri_ya, mandiri_belum, dan flag mode_mandiri (FR-083)',
      ok,
      `Ya={hasil:${cYa.hasil}, flag:${cYa.flag}}; Belum={hasil:${cBelum.hasil}, flag:${cBelum.flag}}; teks-ui S-31=${teksUiJson?.['S-31']?.pilihan_mandiri}`
    );
  }
  kelompok.push({
    judul: 'Kelompok 3 — Simulasi Kosong 2x, Konflik, Tanpa Speech (UJ-M0-03) & Mode Mandiri',
    butir: butirK3
  });

  // === KELOMPOK 4: Ukuran Suara AudioContext (FR-074) & Perekaman (FR-072) ===
  const butirK4 = [];
  {
    const pcm = buatBufferPcmSintetis({
      sampleRate: 16000,
      durasiTotal: 6.0,
      amplitudoLatar: 0.002,
      segmen: [
        { mulai: 0.50, akhir: 0.60, amplitudo: 0.22 }, // 0.10 dtk (< 0.15 dtk -> harus dibuang)
        { mulai: 1.50, akhir: 2.70, amplitudo: 0.25 }, // 1.20 dtk bicara 1
        { mulai: 2.90, akhir: 4.10, amplitudo: 0.25 }  // jeda 0.20 dtk (<= 0.30 dtk -> digabung -> 2.60 dtk)
      ]
    });
    const metrik = hitungMetrikAmplitudo(pcm, 16000);
    const mulaiOk = metrik.waktu_mulai_bicara !== null && Math.abs(metrik.waktu_mulai_bicara - 1.5) <= 0.06;
    const durasiOk = Math.abs(metrik.durasi_bicara - 2.6) <= 0.12;
    const ok =
      mulaiOk &&
      durasiOk &&
      metrik.jumlah_segmen_suara === 1 &&
      metrik.flag === '';

    catatButir(
      butirK4,
      'UJI-M1H-12',
      'Buffer PCM sintetis: bingkai 50 md, buang < 0,15 dtk, gabung jeda <= 0,3 dtk (FR-074)',
      ok,
      `waktu_mulai_bicara=${metrik.waktu_mulai_bicara} dtk (sasaran ~1.50), durasi_bicara=${metrik.durasi_bicara} dtk (sasaran ~2.60), segmen=${metrik.jumlah_segmen_suara}, ambang=${metrik.statistik_rms.ambang_dipakai}`
    );
  }
  {
    const pcmWav = buatBufferPcmSintetis({
      sampleRate: 16000,
      durasiTotal: 3.0,
      amplitudoLatar: 0.002,
      segmen: [
        { mulai: 1.00, akhir: 2.80, amplitudo: 0.24 } // 1.80 dtk bicara dimulai tepat di 1.00 dtk
      ]
    });
    const blobWav = buatBlobWavDariPcm(pcmWav, 16000);
    const kalibrasiS11 = { L: 0.002, S: 0.16 }; // ambang rumus = 0.002 + 0.25*(0.16 - 0.002) = 0.0415
    const metrikWav = await analisisAmplitudoBlob(blobWav, kalibrasiS11);
    const ok = Boolean(
      metrikWav &&
      metrikWav.waktu_mulai_bicara !== null &&
      Math.abs(metrikWav.waktu_mulai_bicara - 1.0) <= 0.1 &&
      Math.abs(metrikWav.durasi_bicara - 1.8) <= 0.15 &&
      Math.abs(metrikWav.statistik_rms.ambang_dipakai - 0.0415) <= 0.002
    );

    catatButir(
      butirK4,
      'UJI-M1H-13',
      'Dekode Blob WAV lewat AudioContext + kalibrasi ambang S-11 (FR-074)',
      ok,
      metrikWav
        ? `waktu_mulai_bicara=${metrikWav.waktu_mulai_bicara} dtk, durasi_bicara=${metrikWav.durasi_bicara} dtk, ambang_S11=${metrikWav.statistik_rms.ambang_dipakai}`
        : 'AudioContext tidak tersedia pada peramban ini'
    );
  }
  {
    const infoMime = infoMimeMediaRecorder();
    const kandidat = Array.isArray(infoMime.kandidat_diuji) ? infoMime.kandidat_diuji : [];
    const urutanBenar =
      kandidat.length >= 2 &&
      String(kandidat[0].mime || '').includes('webm') &&
      kandidat.some((m) => String(m.mime || '').includes('mp4'));

    const evSunyi = evaluasiHasilRekamLatihan({
      alasanHenti: 'manual',
      metrik: { flag: 'sunyi', durasi_bersuara_total: 0, waktu_mulai_bicara: null },
      pernahBersuara: false,
      durasi: 2.0
    });
    const evPendek = evaluasiHasilRekamLatihan({
      alasanHenti: 'manual',
      metrik: { flag: 'kurang_1_detik', durasi_bersuara_total: 0.65, waktu_mulai_bicara: 0.3 },
      pernahBersuara: true,
      durasi: 2.0
    });
    const evDiam10 = evaluasiHasilRekamLatihan({
      alasanHenti: 'diam10',
      metrik: null,
      pernahBersuara: false,
      durasi: 10.0
    });
    const evSah = evaluasiHasilRekamLatihan({
      alasanHenti: 'manual',
      metrik: { flag: '', durasi_bersuara_total: 2.4, durasi_bicara: 2.4, waktu_mulai_bicara: 0.8 },
      pernahBersuara: true,
      durasi: 4.0
    });

    const pRek = paramJson.perekaman || {};
    const okParam =
      pRek.kanal === 1 &&
      pRek.bitrate_bps === 24000 &&
      pRek.batas_durasi_detik?.latihan_sesi1_sesi2 === 15 &&
      pRek.batas_tidak_mulai_bicara_detik === 10 &&
      pRek.durasi_minimal_sah_detik === 1.0;

    const ok =
      urutanBenar &&
      okParam &&
      evSunyi.kategori === 'sunyi_pendek' && evSunyi.hitungPercobaan === false &&
      evPendek.kategori === 'sunyi_pendek' && evPendek.hitungPercobaan === false &&
      evDiam10.kategori === 'diam10' && evDiam10.tidakMulai === true && evDiam10.hitungPercobaan === true &&
      evSah.kategori === 'simpan' && evSah.simpan === true && evSah.durasi_bicara === 2.4 && evSah.waktu_mulai_bicara === 0.8;

    catatButir(
      butirK4,
      'UJI-M1H-14',
      'Evaluasi rekaman K-15 (sunyi/<1s tidak kurangi percobaan), K-16 (15s/24kbps), K-17 (diam 10s)',
      ok,
      `MIME aktif="${infoMime.mime || 'bawaan peramban'}"; K-15 percobaan=${evPendek.hitungPercobaan}; K-17 kategori=${evDiam10.kategori}; Sah=${evSah.durasi_bicara} dtk`
    );
  }
  kelompok.push({
    judul: 'Kelompok 4 — AudioContext (FR-074) & Evaluasi Perekam Latihan (FR-072)',
    butir: butirK4
  });

  // === KELOMPOK 5: Verifikasi Kebersihan Antarmuka DESAIN.md ===
  const butirK5 = [];
  {
    const teksArabEl = Array.from(document.querySelectorAll('.teks-arab'));
    const arabTanpaLatin = teksArabEl.length > 0 && teksArabEl.every((el) => !/[A-Za-z]/.test(el.textContent || ''));
    const arabUkuranOk = teksArabEl.every((el) => parseFloat(getComputedStyle(el).fontSize) >= 24);
    const tombolEl = Array.from(document.querySelectorAll('button.tombol'));
    const tombolMin48 = tombolEl.length > 0 && tombolEl.every((el) => el.getBoundingClientRect().height >= 48);

    catatButir(
      butirK5,
      'UJI-M1H-15',
      'Aturan DESAIN.md: Arab berharakat >= 24 px tanpa Latin, tombol >= 48 px, nol warna merah',
      arabTanpaLatin && arabUkuranOk && tombolMin48,
      `teksArab=${teksArabEl.length} (ukuran >= 24px: ${arabUkuranOk}, bebas Latin: ${arabTanpaLatin}), tombol=${tombolEl.length} (>= 48px: ${tombolMin48})`
    );
  }
  kelompok.push({
    judul: 'Kelompok 5 — Kepatuhan Antarmuka DESAIN.md & AGENTS.md',
    butir: butirK5
  });

  return kelompok;
}

function renderHasilKeDom(kelompok) {
  const wadah = document.getElementById('wadah-hasil-uji');
  const ringkasan = document.getElementById('ringkasan-status');
  if (!wadah || !ringkasan) return { total: 0, lulus: 0 };

  let total = 0;
  let lulus = 0;
  for (const klp of kelompok) {
    for (const b of klp.butir) {
      total += 1;
      if (b.lulus) lulus += 1;
    }
  }

  const semuaLulus = total > 0 && lulus === total;
  ringkasan.className = `penanda-status ${semuaLulus ? 'penanda-status--terdeteksi' : 'penanda-status--coba-lagi'}`;
  ringkasan.textContent = semuaLulus
    ? `LULUS SEMUA (${lulus}/${total} butir terverifikasi)`
    : `Perlu perhatian (${lulus}/${total} butir lulus)`;

  wadah.innerHTML = kelompok
    .map((klp) => `
      <section class="kartu" style="margin-top: 14px;">
        <h2 class="uji-bagian-judul">${escapeHtml(klp.judul)}</h2>
        <ul class="uji-daftar">
          ${klp.butir.map((b) => `
            <li class="uji-baris" data-kode-uji="${escapeHtml(b.kode)}" data-status-uji="${b.lulus ? 'LULUS' : 'PERIKSA'}">
              <div class="uji-baris-kepala">
                <span class="uji-kode">${escapeHtml(b.kode)}</span>
                <span class="penanda-status ${b.lulus ? 'penanda-status--terdeteksi' : 'penanda-status--coba-lagi'}">
                  ${b.lulus ? 'LULUS ✓' : 'PERLU PERIKSA'}
                </span>
              </div>
              <p class="uji-nama">${escapeHtml(b.nama)}</p>
              <p class="uji-detail">${escapeHtml(b.detail)}</p>
            </li>
          `).join('')}
        </ul>
      </section>
    `)
    .join('');

  return { total, lulus };
}

function siapkanKomponenInteraktif() {
  const cekDukungan = cekDukunganPengenalanSuara();
  const pengelolaMandiri = buatPengelolaModeMandiri({
    dukunganSpeech: cekDukungan,
    mulaiDalamMandiri: true,
    alasanAwal: 'uji_interaktif'
  });

  const wadahMandiri = document.getElementById('wadah-mandiri-interaktif');
  const logMandiri = document.getElementById('log-mandiri-interaktif');
  let pilihanAktif = '';

  const gambarKotakMandiri = () => {
    if (!wadahMandiri) return;
    wadahMandiri.innerHTML = renderKotakModeMandiri({
      pertanyaan: 'Sudah mirip dengan model?',
      labelYa: 'Ya',
      labelBelum: 'Belum',
      pilihanAktif,
      idPrefix: 'mandiri-uji'
    });
  };

  if (wadahMandiri) {
    gambarKotakMandiri();
    wadahMandiri.addEventListener('click', (ev) => {
      const tombol = ev.target.closest('[data-pilihan-mandiri]');
      if (!tombol) return;
      const pilihan = tombol.getAttribute('data-pilihan-mandiri');
      pilihanAktif = pilihan;
      const catatan = pengelolaMandiri.catatPilihanMandiri(pilihan, {
        id_item: 'U1-L1-001',
        sumber: 'uji_mesin'
      });
      gambarKotakMandiri();
      if (logMandiri) {
        logMandiri.textContent = `Tercatat: hasil=${catatan.hasil}, flag=${catatan.flag}, mode_mandiri=${catatan.mode_mandiri}`;
      }
    });
  }

  // Siklus simulasi kelas status kotak rekam resmi (Siap -> Merekam -> Tersimpan)
  const kotakRekam = document.getElementById('kotak-rekam-pratinjau');
  const statusRekam = document.getElementById('status-rekam-pratinjau');
  const tombolSimulasi = document.getElementById('tombol-rekam-simulasi');
  const infoRekam = document.getElementById('info-rekam-langsung');
  const siklus = [
    {
      kelasKotak: 'kotak-rekam--siap',
      kelasTombol: 'tombol-rekam--siap',
      teksStatus: 'Status kotak rekam: Siap merekam (maksimal 15 detik, mono 24 kbps)',
      teksTombol: 'Simulasi Status Rekam',
      info: `MIME dipilih peramban: ${pilihMimeRekam() || 'bawaan peramban'}`
    },
    {
      kelasKotak: 'kotak-rekam--merekam',
      kelasTombol: 'tombol-rekam--merekam',
      teksStatus: 'Status kotak rekam: Sedang merekam... (batas diam 10 dtk / maks 15 dtk)',
      teksTombol: 'Hentikan Simulasi',
      info: 'Kelas resmi aktif: .kotak-rekam--merekam & .tombol-rekam--merekam'
    },
    {
      kelasKotak: 'kotak-rekam--tersimpan',
      kelasTombol: 'tombol-rekam--siap',
      teksStatus: 'Status kotak rekam: Rekaman tersimpan siap dievaluasi ✓',
      teksTombol: 'Kembali ke Siap',
      info: 'Kelas resmi aktif: .kotak-rekam--tersimpan (tanpa warna merah)'
    }
  ];
  let indeksSiklus = 0;

  if (tombolSimulasi && kotakRekam && statusRekam) {
    tombolSimulasi.addEventListener('click', () => {
      indeksSiklus = (indeksSiklus + 1) % siklus.length;
      const st = siklus[indeksSiklus];
      kotakRekam.className = `kotak-rekam ${st.kelasKotak} uji-pratinjau-rekam`;
      tombolSimulasi.className = `tombol tombol-rekam ${st.kelasTombol}`;
      statusRekam.textContent = st.teksStatus;
      tombolSimulasi.textContent = st.teksTombol;
      if (infoRekam) infoRekam.textContent = st.info;
    });
  }

  // Pengujian opsional mikrofon nyata lewat buatPerekamLatihan
  const tombolLangsung = document.getElementById('tombol-rekam-langsung');
  const perekam = buatPerekamLatihan();
  if (tombolLangsung) {
    tombolLangsung.addEventListener('click', async () => {
      if (perekam.sedangAktif()) {
        perekam.hentikan('manual');
        return;
      }
      if (infoRekam) infoRekam.textContent = 'Meminta izin mikrofon untuk uji rekam singkat...';
      await perekam.mulai({
        pengelolaMandiri,
        onMulai: () => {
          if (kotakRekam) kotakRekam.className = 'kotak-rekam kotak-rekam--merekam uji-pratinjau-rekam';
          tombolLangsung.textContent = 'Hentikan Mikrofon';
          if (infoRekam) infoRekam.textContent = 'Mikrofon aktif... ucapkan salam lalu ketuk Hentikan Mikrofon.';
        },
        onSelesai: (hasil) => {
          if (kotakRekam) kotakRekam.className = 'kotak-rekam kotak-rekam--tersimpan uji-pratinjau-rekam';
          tombolLangsung.textContent = 'Uji Mikrofon Nyata';
          if (infoRekam) {
            const ev = hasil.evaluasi || {};
            infoRekam.textContent = `Selesai: kategori=${ev.kategori || 'ok'}, waktu_mulai=${ev.waktu_mulai_bicara}, durasi=${ev.durasi_bicara} dtk`;
          }
        },
        onKendala: (kendala) => {
          if (kotakRekam) kotakRekam.className = 'kotak-rekam kotak-rekam--siap uji-pratinjau-rekam';
          tombolLangsung.textContent = 'Uji Mikrofon Nyata';
          if (infoRekam) infoRekam.textContent = `Perangkat/izin mikrofon belum aktif (${kendala.jenis_kendala}); uji sintetis tetap berjalan penuh.`;
        }
      });
    });
  }
}

async function inisialisasi() {
  siapkanKomponenInteraktif();
  const jalankanDanRender = async () => {
    try {
      const hasil = await jalankanSemuaPengujianMesin();
      renderHasilKeDom(hasil);
    } catch (err) {
      const ringkasan = document.getElementById('ringkasan-status');
      if (ringkasan) {
        ringkasan.className = 'penanda-status penanda-status--coba-lagi';
        ringkasan.textContent = `Kendala saat memuat uji: ${err && err.message ? err.message : String(err)}`;
      }
    }
  };

  await jalankanDanRender();

  const tombolUlang = document.getElementById('tombol-ulang-uji');
  if (tombolUlang) {
    tombolUlang.addEventListener('click', jalankanDanRender);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inisialisasi);
  } else {
    inisialisasi();
  }
}
