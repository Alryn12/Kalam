/**
 * Modul Perekam Latihan & Ukuran Suara Otomatis (situs/js/rekam.js)
 * Tugas M1-H: Bagian dari TB-M1-09
 * Acuan: SRS-3 FR-072, FR-074; BP-4 R-26, R-27; BP-5 K-12, K-15, K-16, K-17;
 *        situs/konten/umum/parameter.json
 */

import { ambilState } from './state.js';
import {
  evaluasiDeteksiItem,
  jalankanSesiPengenalanSuara
} from './suara.js';

export const PARAMETER_REKAM_BAWAAN = {
  kanal: 1,
  bitrate_bps: 24000,
  bitrate_kbps: 24,
  urutan_mime: [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac'
  ],
  batas_durasi_detik: {
    tes_cek_perangkat: 3,
    latihan_sesi1_sesi2: 15,
    slot_putaran3: 15,
    tahap0_suara_hari_pertama: 20,
    after_suara_hari_ini: 30
  },
  batas_tidak_mulai_bicara_detik: 10,
  durasi_minimal_sah_detik: 1.0
};

export const PARAMETER_SUARA_OTOMATIS_BAWAAN = {
  bingkai_md: 50,
  persentil_latar_L: 10,
  persentil_puncak_S: 90,
  faktor_adaptif: 0.25,
  ambang_bawaan: 0.02,
  jeda_gabung_detik: 0.30,
  segmen_min_detik: 0.15,
  mode_ambang: 'adaptif_dengan_batas_bawah'
};

/**
 * Mengambil parameter perekaman dari state (parameter.json) dengan nilai bawaan.
 */
export function ambilParameterRekam(override = {}) {
  let dariState = {};
  try {
    const st = ambilState();
    if (st && st.parameter && st.parameter.perekaman) {
      dariState = st.parameter.perekaman;
    }
  } catch (_) {
    // Abaikan bila dipanggil di luar konteks state
  }
  return Object.assign({}, PARAMETER_REKAM_BAWAAN, dariState, override || {});
}

/**
 * Mengambil parameter ukuran suara otomatis FR-074 dari state (parameter.json).
 */
export function ambilParameterUkuranSuara(override = {}) {
  let dariState = {};
  try {
    const st = ambilState();
    if (st && st.parameter && st.parameter.ukuran_suara_otomatis) {
      dariState = st.parameter.ukuran_suara_otomatis;
    }
  } catch (_) {
    // Abaikan bila dipanggil di luar konteks state
  }
  return Object.assign({}, PARAMETER_SUARA_OTOMATIS_BAWAAN, dariState, override || {});
}

/**
 * Menguji dan mengembalikan info dukungan tipe MIME MediaRecorder (FR-072).
 */
export function infoMimeMediaRecorder(urutanKandidat = null) {
  const param = ambilParameterRekam();
  const kandidat = Array.isArray(urutanKandidat) && urutanKandidat.length > 0
    ? urutanKandidat
    : param.urutan_mime;

  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
    return { didukung: false, mime: '', kandidat_diuji: [] };
  }

  const hasilUji = [];
  let terpilih = '';
  for (const mime of kandidat) {
    let ok = false;
    try {
      ok = Boolean(MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(mime));
    } catch (_) {
      ok = false;
    }
    hasilUji.push({ mime, didukung: ok });
    if (ok && !terpilih) {
      terpilih = mime;
    }
  }

  return {
    didukung: true,
    mime: terpilih,
    kandidat_diuji: hasilUji
  };
}

/**
 * Memilih string tipe MIME terbaik yang didukung MediaRecorder (FR-072).
 */
export function pilihMimeRekam(urutanKandidat = null) {
  return infoMimeMediaRecorder(urutanKandidat).mime;
}

/**
 * Menghitung persentil array angka (0..100).
 */
export function hitungPersentil(arr, p) {
  if (!arr || arr.length === 0) return 0;
  const urut = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (urut.length - 1);
  const bawah = Math.floor(idx);
  const atas = Math.ceil(idx);
  if (bawah === atas) return urut[bawah];
  const bobot = idx - bawah;
  return urut[bawah] * (1 - bobot) + urut[atas] * bobot;
}

/**
 * Menganalisis sampel audio PCM dengan bingkai 50 md dan RMS (FR-074):
 * - Bingkai 50 md, RMS tiap bingkai
 * - L dan S dari persentil 10 dan 90 tes rekam 3 detik (S-11) atau bawaan rekaman
 * - Ambang = L + 0,25 * (S - L), cadangan bawaan 0,02
 * - Gabung jeda <= 0,30 detik, buang segmen < 0,15 detik
 * - Menghasilkan waktu_mulai_bicara dan durasi_bicara (serta durasi_bersuara_20 & _tambahan)
 */
export function hitungMetrikAmplitudo(sampelFloat32, sampleRate, paramOverride = {}, kalibrasiLatar = null) {
  const param = ambilParameterUkuranSuara(paramOverride);
  const bingkaiMd = Number(param.bingkai_md) || 50;
  const ambangBawaan = Number(param.ambang_bawaan) || 0.02;
  const faktorAdaptif = Number(param.faktor_adaptif) || 0.25;
  const jedaGabungDetik = Number(param.jeda_gabung_detik) || 0.30;
  const segmenMinDetik = Number(param.segmen_min_detik) || 0.15;
  const persentilL = Number(param.persentil_latar_L) || 10;
  const persentilS = Number(param.persentil_puncak_S) || 90;
  const modeAmbang = param.mode_ambang || 'adaptif_dengan_batas_bawah';

  const durasiBingkaiDetik = bingkaiMd / 1000;
  const sampelPerBingkai = Math.max(1, Math.round(sampleRate * durasiBingkaiDetik));
  const totalSampel = sampelFloat32 ? sampelFloat32.length : 0;
  const durasiTotalDetik = sampleRate > 0 ? totalSampel / sampleRate : 0;

  const rmsBingkai = [];
  for (let i = 0; i < totalSampel; i += sampelPerBingkai) {
    const batas = Math.min(totalSampel, i + sampelPerBingkai);
    const n = batas - i;
    if (n <= 0) break;
    let jumlahKuadrat = 0;
    for (let j = i; j < batas; j += 1) {
      const v = sampelFloat32[j];
      jumlahKuadrat += v * v;
    }
    rmsBingkai.push(Math.sqrt(jumlahKuadrat / n));
  }

  const pL = hitungPersentil(rmsBingkai, persentilL);
  const pS = hitungPersentil(rmsBingkai, persentilS);

  const kalL = kalibrasiLatar
    ? (kalibrasiLatar.L != null ? kalibrasiLatar.L : kalibrasiLatar.L_persentil_10)
    : null;
  const kalS = kalibrasiLatar
    ? (kalibrasiLatar.S != null ? kalibrasiLatar.S : kalibrasiLatar.S_persentil_90)
    : null;

  const L = kalL != null ? Number(kalL) : pL;
  const S = kalS != null && Number(kalS) > L ? Number(kalS) : pS;
  const ambangRumus = L + faktorAdaptif * Math.max(0, S - L);

  let ambangDipakai = ambangBawaan;
  if (kalibrasiLatar && kalL == null && kalS == null && Number(kalibrasiLatar.ambang_dipakai) > 0) {
    ambangDipakai = Number(kalibrasiLatar.ambang_dipakai);
  } else if (modeAmbang === 'tetap') {
    ambangDipakai = ambangBawaan;
  } else if (modeAmbang === 'murni_rumus') {
    ambangDipakai = ambangRumus > 0.001 ? ambangRumus : ambangBawaan;
  } else {
    ambangDipakai = (S - L) >= 0.008 ? Math.max(ambangBawaan * 0.5, ambangRumus) : ambangBawaan;
  }

  // 1. Kumpulkan segmen mentah di atas ambang
  const segmenMentah = [];
  let sedangSuara = false;
  let mulaiIdx = 0;

  for (let idx = 0; idx < rmsBingkai.length; idx += 1) {
    const aktif = rmsBingkai[idx] > ambangDipakai;
    if (aktif && !sedangSuara) {
      sedangSuara = true;
      mulaiIdx = idx;
    } else if (!aktif && sedangSuara) {
      sedangSuara = false;
      segmenMentah.push({
        mulai: mulaiIdx * durasiBingkaiDetik,
        akhir: idx * durasiBingkaiDetik
      });
    }
  }
  if (sedangSuara) {
    segmenMentah.push({
      mulai: mulaiIdx * durasiBingkaiDetik,
      akhir: Math.min(durasiTotalDetik, rmsBingkai.length * durasiBingkaiDetik)
    });
  }

  // 2. Gabungkan segmen yang jeda di antaranya <= jeda_gabung_detik (0,30 detik)
  const segmenGabung = [];
  for (const seg of segmenMentah) {
    if (segmenGabung.length === 0) {
      segmenGabung.push({ ...seg });
    } else {
      const terakhir = segmenGabung[segmenGabung.length - 1];
      if (seg.mulai - terakhir.akhir <= jedaGabungDetik + 1e-6) {
        terakhir.akhir = seg.akhir;
      } else {
        segmenGabung.push({ ...seg });
      }
    }
  }

  // 3. Buang segmen yang panjangnya < segmen_min_detik (0,15 detik)
  const segmenSah = segmenGabung.filter(
    (seg) => (seg.akhir - seg.mulai) >= segmenMinDetik - 1e-6
  );

  // 4. Hitung waktu_mulai_bicara, durasi_bicara, durasi_bersuara_20, dan durasi_bersuara_tambahan
  const waktuMulaiBicara = segmenSah.length > 0 ? Number(segmenSah[0].mulai.toFixed(2)) : null;

  let durasi20 = 0;
  let durasiTambahan = 0;
  let durasiTotalSuara = 0;

  for (const seg of segmenSah) {
    durasiTotalSuara += Math.max(0, seg.akhir - seg.mulai);
    const a20 = Math.min(20, seg.akhir);
    const m20 = Math.max(0, seg.mulai);
    if (a20 > m20) durasi20 += (a20 - m20);

    const a30 = Math.min(30, seg.akhir);
    const m30 = Math.max(20, seg.mulai);
    if (a30 > m30) durasiTambahan += (a30 - m30);
  }

  const durasiBicara = Number(durasiTotalSuara.toFixed(2));
  const durasi20Bulat = Number(durasi20.toFixed(2));
  const durasiTambahanBulat = Number(durasiTambahan.toFixed(2));

  let flag = '';
  if (durasiBicara === 0) {
    flag = 'sunyi';
  } else if (durasiBicara < 1.0) {
    flag = 'kurang_1_detik';
  }

  return {
    durasi_rekaman_total: Number(durasiTotalDetik.toFixed(2)),
    waktu_mulai_bicara: waktuMulaiBicara,
    durasi_bicara: durasiBicara,
    durasi_bersuara_total: durasiBicara,
    durasi_bersuara_20: durasi20Bulat,
    durasi_bersuara_tambahan: durasiTambahanBulat,
    jumlah_segmen_suara: segmenSah.length,
    segmen_suara: segmenSah.map((s) => ({
      mulai: Number(s.mulai.toFixed(2)),
      akhir: Number(s.akhir.toFixed(2)),
      durasi: Number((s.akhir - s.mulai).toFixed(2))
    })),
    statistik_rms: {
      jumlah_bingkai: rmsBingkai.length,
      L: Number(L.toFixed(5)),
      S: Number(S.toFixed(5)),
      L_persentil_10: Number(L.toFixed(5)),
      S_persentil_90: Number(S.toFixed(5)),
      ambang_rumus: Number(ambangRumus.toFixed(5)),
      ambang_dipakai: Number(ambangDipakai.toFixed(5))
    },
    flag
  };
}

/**
 * Mendekode Blob audio dengan AudioContext untuk menghitung metrik amplitudo (FR-074).
 */
export async function analisisAmplitudoBlob(blob, kalibrasiLatar = null, paramOverride = {}) {
  const AudioCtx = typeof window !== 'undefined'
    ? (window.AudioContext || window.webkitAudioContext)
    : null;
  if (!AudioCtx || !blob) {
    return null;
  }
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioCtx();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    return hitungMetrikAmplitudo(audioBuffer.getChannelData(0), audioBuffer.sampleRate, paramOverride, kalibrasiLatar);
  } finally {
    if (ctx.state !== 'closed' && typeof ctx.close === 'function') {
      try {
        await ctx.close();
      } catch (_) {
        // Abaikan penutupan AudioContext
      }
    }
  }
}

/**
 * Mengevaluasi hasil rekaman latihan menurut aturan FR-072, K-15 (sunyi / < 1 detik), dan K-17 (diam 10 detik).
 */
export function evaluasiHasilRekamLatihan({
  alasanHenti = 'manual',
  metrik = null,
  pernahBersuara = false,
  durasi = 0,
  minDetikSah = 1.0
} = {}) {
  if (alasanHenti === 'diam10') {
    return {
      kategori: 'diam10',
      tidakMulai: true,
      hitungPercobaan: true,
      simpan: false,
      waktu_mulai_bicara: null,
      durasi_bicara: 0,
      durasiBicara: 0,
      flag: 'tidak_bersuara',
      kodePesan: 'pesan_tidak_bersuara',
      pesan: 'Tidak apa-apa, coba lagi kapan siap.'
    };
  }

  const sunyiAtauTerlaluPendek = metrik
    ? (metrik.flag === 'sunyi' || metrik.flag === 'kurang_1_detik' || Number(metrik.durasi_bersuara_total || 0) < minDetikSah)
    : (!pernahBersuara && Number(durasi || 0) < minDetikSah);

  if (sunyiAtauTerlaluPendek) {
    return {
      kategori: 'sunyi_pendek',
      tidakMulai: false,
      hitungPercobaan: false,
      simpan: false,
      waktu_mulai_bicara: null,
      durasi_bicara: 0,
      durasiBicara: 0,
      flag: (metrik && metrik.flag) || 'sunyi',
      kodePesan: 'pesan_sunyi_pendek',
      pesan: 'Sepertinya suaramu tidak terekam. Cek mikrofonmu, lalu coba lagi.'
    };
  }

  const durasiBicara = (metrik && typeof metrik.durasi_bersuara_total === 'number')
    ? metrik.durasi_bersuara_total
    : Number(durasi || 0);
  const waktuMulaiBicara = (metrik && metrik.waktu_mulai_bicara != null)
    ? metrik.waktu_mulai_bicara
    : 0;

  return {
    kategori: 'simpan',
    tidakMulai: false,
    hitungPercobaan: true,
    simpan: true,
    waktu_mulai_bicara: waktuMulaiBicara,
    durasi_bicara: durasiBicara,
    durasiBicara,
    flag: ''
  };
}

/**
 * Pengelola perekaman latihan untuk layar Sesi 1, Sesi 2 (Level 1–3), dan Sesi 3 (FR-072, FR-074, K-12, K-15, K-17).
 */
export function buatPerekamLatihan(opsi = {}) {
  const paramRekam = ambilParameterRekam(opsi.paramRekam);
  const batasDetik = Number(
    opsi.batasDetik ||
    (paramRekam.batas_durasi_detik && paramRekam.batas_durasi_detik.latihan_sesi1_sesi2) ||
    15
  );
  const batasDiamDetik = Number(
    opsi.batasDiamDetik || paramRekam.batas_tidak_mulai_bicara_detik || 10
  );
  const bitrateBps = Number(opsi.bitrateBps || paramRekam.bitrate_bps || 24000);
  const minDetikSah = Number(opsi.minDetikSah || paramRekam.durasi_minimal_sah_detik || 1.0);

  let recorderAktif = null;
  let streamAktif = null;
  let audioCtxMonitor = null;
  let intervalMonitor = null;
  let timerDiam = null;
  let timerBatas = null;
  let sesiSpeech = null;
  let sedangMerekam = false;
  let alasanHenti = 'manual';

  function bersihkanSumber() {
    clearInterval(intervalMonitor);
    clearTimeout(timerDiam);
    clearTimeout(timerBatas);
    intervalMonitor = null;
    timerDiam = null;
    timerBatas = null;
    if (streamAktif) {
      try {
        streamAktif.getTracks().forEach((tr) => tr.stop());
      } catch (_) {}
      streamAktif = null;
    }
    if (audioCtxMonitor && typeof audioCtxMonitor.close === 'function') {
      audioCtxMonitor.close().catch(() => {});
      audioCtxMonitor = null;
    }
    recorderAktif = null;
  }

  function hentikan(alasan = 'manual') {
    alasanHenti = alasan;
    if (sesiSpeech) {
      if (alasan === 'batal' || alasan === 'lewati') {
        sesiSpeech.batalkan();
        sesiSpeech = null;
      }
    }
    if (recorderAktif && recorderAktif.state === 'recording') {
      try {
        recorderAktif.stop();
      } catch (_) {
        bersihkanSumber();
        sedangMerekam = false;
      }
    }
  }

  async function mulai({
    kalibrasiLatar = null,
    pengelolaMandiri = null,
    targetDeteksi = null,
    ambangDeteksi = 0.5,
    aktifkanSpeech = true,
    onMulai = null,
    onSelesai = null,
    onKendala = null
  } = {}) {
    if (sedangMerekam) return false;

    if (
      typeof navigator === 'undefined' ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== 'function' ||
      typeof window === 'undefined' ||
      typeof window.MediaRecorder === 'undefined'
    ) {
      if (onKendala) onKendala({ jenis_kendala: 'mikrofon_tidak_didukung' });
      return false;
    }

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
    } catch (_) {
      if (onKendala) onKendala({ jenis_kendala: 'izin_atau_perangkat_mikrofon' });
      return false;
    }

    streamAktif = stream;
    const mime = pilihMimeRekam();
    const opsiRec = mime
      ? { mimeType: mime, audioBitsPerSecond: bitrateBps }
      : { audioBitsPerSecond: bitrateBps };

    let recorder;
    try {
      recorder = new MediaRecorder(stream, opsiRec);
    } catch (_) {
      try {
        recorder = new MediaRecorder(stream);
      } catch (_) {
        bersihkanSumber();
        if (onKendala) onKendala({ jenis_kendala: 'mediarecorder_kendala' });
        return false;
      }
    }

    recorderAktif = recorder;
    sedangMerekam = true;
    alasanHenti = 'manual';

    const potongan = [];
    const mulaiMs = Date.now();
    let pernahBersuara = false;

    // Pantau aktivitas suara untuk berhenti otomatis pada 10 detik jika belum mulai bicara (K-17)
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtxMonitor = new AudioCtx();
        const sumber = audioCtxMonitor.createMediaStreamSource(stream);
        const analyser = audioCtxMonitor.createAnalyser();
        analyser.fftSize = 1024;
        sumber.connect(analyser);
        const buf = new Float32Array(analyser.fftSize);
        const ambangMonitor = (kalibrasiLatar && Number(kalibrasiLatar.ambang_dipakai) > 0)
          ? Number(kalibrasiLatar.ambang_dipakai)
          : 0.015;
        intervalMonitor = setInterval(() => {
          analyser.getFloatTimeDomainData(buf);
          let sum = 0;
          for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
          if (Math.sqrt(sum / buf.length) >= ambangMonitor) {
            pernahBersuara = true;
          }
        }, 120);
      }
    } catch (_) {
      // Gunakan analisis blob penuh setelah berhenti
    }

    const modeMandiriAwal = pengelolaMandiri ? pengelolaMandiri.apakahModeMandiri() : false;
    if (aktifkanSpeech && !modeMandiriAwal) {
      sesiSpeech = jalankanSesiPengenalanSuara({
        onKendalaSpeech: () => {
          if (pengelolaMandiri) {
            pengelolaMandiri.catatHasilSpeech({
              konflikTerjadi: true,
              izinMikrofonAda: true
            });
          }
        }
      });
      if (sesiSpeech && !sesiSpeech.aktif && sesiSpeech.alasan === 'kendala_mulai_speech' && pengelolaMandiri) {
        pengelolaMandiri.catatHasilSpeech({
          konflikTerjadi: true,
          izinMikrofonAda: true
        });
      }
    } else {
      sesiSpeech = null;
    }

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) potongan.push(ev.data);
    };

    recorder.onstop = async () => {
      const alternatifMemori = sesiSpeech ? sesiSpeech.hentikan() : [];
      const speechDipakai = Boolean(sesiSpeech && sesiSpeech.aktif);
      sesiSpeech = null;
      bersihkanSumber();
      sedangMerekam = false;

      if (alasanHenti === 'batal' || alasanHenti === 'lewati') {
        if (onSelesai) {
          onSelesai({
            dibatalkan: true,
            alasanHenti
          });
        }
        return;
      }

      const durasi = Math.max(0.2, Math.round(((Date.now() - mulaiMs) / 1000) * 10) / 10);
      const tipe = recorder.mimeType || mime || 'audio/webm';
      const blob = new Blob(potongan, { type: tipe });

      let metrik = null;
      try {
        metrik = await analisisAmplitudoBlob(blob, kalibrasiLatar);
      } catch (_) {
        metrik = null;
      }

      const evaluasi = evaluasiHasilRekamLatihan({
        alasanHenti,
        metrik,
        pernahBersuara,
        durasi,
        minDetikSah
      });

      let deteksi = null;
      if (targetDeteksi && !modeMandiriAwal && speechDipakai) {
        deteksi = evaluasiDeteksiItem(alternatifMemori, targetDeteksi, ambangDeteksi);
        if (pengelolaMandiri) {
          pengelolaMandiri.catatHasilSpeech({
            transkripKosong: deteksi.transkrip_kosong,
            rekamanSunyiSaatSpeech: evaluasi.kategori === 'sunyi_pendek' && !evaluasi.tidakMulai,
            izinMikrofonAda: true
          });
        }
      }

      if (onSelesai) {
        onSelesai({
          dibatalkan: false,
          alasanHenti,
          blob,
          mime: tipe,
          durasi,
          metrik,
          evaluasi,
          deteksi,
          modeMandiri: pengelolaMandiri ? pengelolaMandiri.apakahModeMandiri() : modeMandiriAwal
        });
      }
    };

    recorder.start(250);
    if (onMulai) onMulai();

    timerDiam = setTimeout(() => {
      if (!pernahBersuara && recorderAktif && recorderAktif.state === 'recording') {
        hentikan('diam10');
      }
    }, batasDiamDetik * 1000);

    timerBatas = setTimeout(() => {
      if (recorderAktif && recorderAktif.state === 'recording') {
        hentikan('batas15');
      }
    }, batasDetik * 1000);

    return true;
  }

  return {
    mulai,
    hentikan,
    sedangAktif() {
      return sedangMerekam;
    },
    bersihkan() {
      hentikan('batal');
      bersihkanSumber();
    }
  };
}
