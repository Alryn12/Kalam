/**
 * Modul Halaman Uji M0 — Suara, Rekam, Amplitudo, dan Unggah (situs/js/uji/uji-m0.js)
 * Tugas M0-A: TB-M0-01 s.d. TB-M0-05
 * Acuan: SRS-4 bagian 1 & 3; SRS-3 FR-071, FR-072, FR-074; SRS-1 bagian 3; U1-BLOK-A.md
 * Tanpa pustaka luar · ES Module murni · Tanpa kata gagal/salah di layar
 */

import { KALAM_CONFIG } from '../config.js';

/**
 * 12 Ungkapan Level 1 dari U1-BLOK-A.md beserta kata wajib dari Lampiran U1-BLOK-A.md
 */
export const DAFTAR_UNGKAPAN_U1_BA = [
  {
    id: 'U1-L1-001',
    id_pasangan: 'U1-P01',
    fungsi_id: 'Memberi salam',
    arab: 'اَلسَّلَامُ عَلَيْكُمْ',
    kata_wajib: ['السلام', 'عليكم']
  },
  {
    id: 'U1-L1-002',
    id_pasangan: 'U1-P01',
    fungsi_id: 'Menjawab salam',
    arab: 'وَعَلَيْكُمُ السَّلَامُ',
    kata_wajib: ['عليكم', 'السلام']
  },
  {
    id: 'U1-L1-003',
    id_pasangan: 'U1-P02',
    fungsi_id: 'Sapaan pagi',
    arab: 'صَبَاحَ الْخَيْرِ',
    kata_wajib: ['صباح', 'خير']
  },
  {
    id: 'U1-L1-004',
    id_pasangan: 'U1-P02',
    fungsi_id: 'Jawaban sapaan pagi',
    arab: 'صَبَاحَ النُّورِ',
    kata_wajib: ['صباح', 'نور']
  },
  {
    id: 'U1-L1-005',
    id_pasangan: 'U1-P03',
    fungsi_id: 'Sapaan sore',
    arab: 'مَسَاءَ الْخَيْرِ',
    kata_wajib: ['مساء', 'خير']
  },
  {
    id: 'U1-L1-006',
    id_pasangan: 'U1-P03',
    fungsi_id: 'Jawaban sapaan sore',
    arab: 'مَسَاءَ النُّورِ',
    kata_wajib: ['مساء', 'نور']
  },
  {
    id: 'U1-L1-007',
    id_pasangan: 'U1-P04',
    fungsi_id: 'Sapaan siang (putra)',
    arab: 'نَهَارُكَ سَعِيدٌ',
    kata_wajib: ['نهار', 'سعيد']
  },
  {
    id: 'U1-L1-008',
    id_pasangan: 'U1-P04',
    fungsi_id: 'Jawaban sapaan siang',
    arab: 'سَعِيدٌ مُبَارَكٌ',
    kata_wajib: ['سعيد', 'مبارك']
  },
  {
    id: 'U1-L1-009',
    id_pasangan: 'U1-P05',
    fungsi_id: 'Sapaan malam (putra)',
    arab: 'لَيْلَتُكَ سَعِيدَةٌ',
    kata_wajib: ['ليلتك', 'سعيدة']
  },
  {
    id: 'U1-L1-010',
    id_pasangan: 'U1-P05',
    fungsi_id: 'Jawaban sapaan malam',
    arab: 'لَيْلَةٌ مُبَارَكَةٌ',
    kata_wajib: ['ليلة', 'مباركة']
  },
  {
    id: 'U1-L1-011',
    id_pasangan: 'U1-P06',
    fungsi_id: 'Menyambut teman',
    arab: 'أَهْلًا وَسَهْلًا',
    kata_wajib: ['اهلا', 'سهلا']
  },
  {
    id: 'U1-L1-012',
    id_pasangan: 'U1-P06',
    fungsi_id: 'Jawaban sambutan',
    arab: 'أَهْلًا بِكْ',
    kata_wajib: ['اهلا', 'بك']
  }
];

/**
 * Normalisasi huruf Arab sesuai SRS-3 FR-071:
 * 1. Buang harakat (U+064B s.d. U+0652 dan U+0670) serta tatwil (U+0640)
 * 2. Normalisasi Alef (أ إ آ ٱ) -> ا
 * 3. Normalisasi Alif Maqsurah (ى) -> ي
 * 4. Normalisasi Ta Marbutah (ة) -> ه
 * 5. Buang tanda baca dan rapikan spasi
 */
export function normalisasiArab(teks) {
  if (!teks || typeof teks !== 'string') return '';
  return teks
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[،؛؟.,!?:;"'()\[\]\-_\/\\«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Menghitung jarak edit Levenshtein antara dua kata (FR-071)
 */
export function jarakLevenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const biaya = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // hapus
        dp[i][j - 1] + 1,      // sisip
        dp[i - 1][j - 1] + biaya // ganti
      );
    }
  }
  return dp[m][n];
}

/**
 * Memeriksa apakah satu kata dari transkrip cocok dengan satu kata wajib (FR-071)
 * - Cocok bila sama persis
 * - Atau jarak Levenshtein <= 1 untuk kata >= 4 huruf
 * - Juga memeriksa pencocokan tanpa awalan "ال" atau "و" bila kata wajib tidak diawali "ال"
 */
export function apakahKataCocok(kataTranskripMentah, kataWajibMentah, maksJarakEdit = 1, minHurufJarakEdit = 4) {
  const kt = normalisasiArab(kataTranskripMentah);
  const kw = normalisasiArab(kataWajibMentah);
  if (!kt || !kw) return { cocok: false, jarak: 99, alasan: 'kosong' };

  // Variasi kandidat transkrip (asli, tanpa awalan ال, tanpa awalan و)
  const kandidatList = [kt];
  if (!kw.startsWith('ال') && kt.startsWith('ال') && kt.length > 2) {
    kandidatList.push(kt.slice(2));
  }
  if (!kw.startsWith('و') && kt.startsWith('و') && kt.length > 2) {
    const tanpaWaw = kt.slice(1);
    kandidatList.push(tanpaWaw);
    if (!kw.startsWith('ال') && tanpaWaw.startsWith('ال') && tanpaWaw.length > 2) {
      kandidatList.push(tanpaWaw.slice(2));
    }
  }

  let jarakTerbaik = 99;
  for (const kand of kandidatList) {
    if (kand === kw) {
      return { cocok: true, jarak: 0, alasan: 'persis' };
    }
    const j = jarakLevenshtein(kand, kw);
    if (j < jarakTerbaik) jarakTerbaik = j;
    if (kw.length >= minHurufJarakEdit && j <= maksJarakEdit) {
      return { cocok: true, jarak: j, alasan: `jarak_edit_${j}` };
    }
  }

  return { cocok: false, jarak: jarakTerbaik, alasan: 'belum_cocok' };
}

/**
 * Menghitung skor_kata_kunci dari daftar alternatif transkrip Web Speech API (FR-071)
 */
export function hitungSkorKataKunci(alternatifList, kataWajibList, ambangDeteksi = 0.5) {
  const kWajib = kataWajibList.length;
  const syaratMin = Math.max(1, Math.ceil(ambangDeteksi * kWajib));
  const rincianKata = [];
  let skor = 0;

  const alternatifBersih = (alternatifList || []).map((alt, idx) => {
    const teksAsli = typeof alt === 'string' ? alt : (alt.transcript || '');
    const teksNorm = normalisasiArab(teksAsli);
    const kataKata = teksNorm ? teksNorm.split(' ') : [];
    return {
      indeks: idx + 1,
      teks_asli: teksAsli,
      teks_normalisasi: teksNorm,
      confidence: typeof alt === 'object' && alt.confidence != null ? alt.confidence : null,
      kata_kata: kataKata
    };
  });

  for (const kw of kataWajibList) {
    const kwNorm = normalisasiArab(kw);
    let ditemukan = false;
    let infoCocok = null;

    for (const alt of alternatifBersih) {
      for (const kt of alt.kata_kata) {
        const hasil = apakahKataCocok(kt, kwNorm);
        if (hasil.cocok) {
          ditemukan = true;
          infoCocok = {
            alternatif_ke: alt.indeks,
            kata_transkrip: kt,
            jarak: hasil.jarak,
            alasan: hasil.alasan
          };
          break;
        }
      }
      if (ditemukan) break;
    }

    if (ditemukan) skor++;
    rincianKata.push({
      kata_wajib: kw,
      kata_wajib_norm: kwNorm,
      cocok: ditemukan,
      detail: infoCocok
    });
  }

  return {
    skor_kata_kunci: skor,
    k_wajib: kWajib,
    ambang_deteksi: ambangDeteksi,
    syarat_minimal: syaratMin,
    terdeteksi: skor >= syaratMin,
    rincian_kata: rincianKata,
    alternatif_diproses: alternatifBersih
  };
}

/**
 * Memilih tipe MIME terbaik yang didukung MediaRecorder (FR-072)
 */
export function pilihMimeMediaRecorder() {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
    return { didukung: false, mime: '', kandidat_diuji: [] };
  }
  const kandidat = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/aac'
  ];
  const hasilUji = [];
  let terpilih = '';

  for (const m of kandidat) {
    let ok = false;
    try {
      ok = MediaRecorder.isTypeSupported(m);
    } catch (_) {
      ok = false;
    }
    hasilUji.push({ mime: m, didukung: ok });
    if (ok && !terpilih) {
      terpilih = m;
    }
  }

  return {
    didukung: true,
    mime: terpilih,
    kandidat_diuji: hasilUji
  };
}

/**
 * Menghitung persentil dari array angka (0..100)
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
 * Menghitung ukuran suara otomatis dari kanal sampel PCM (FR-074)
 * - Bingkai 50 md (dapat diatur)
 * - RMS tiap bingkai
 * - L dan S dari persentil 10 dan 90
 * - Ambang = L + faktor * (S - L), dengan cadangan ambang_bawaan (0,02)
 * - Gabung jeda <= 0,3 detik; buang segmen < 0,15 detik
 */
export function hitungMetrikAmplitudoDariSampel(sampelFloat32, sampleRate, param = {}, kalibrasiLatar = null) {
  const bingkaiMd = Number(param.bingkai_md) || 50;
  const ambangBawaan = Number(param.ambang_bawaan) || 0.02;
  const faktorAdaptif = Number(param.faktor_adaptif) || 0.25;
  const jedaGabungDetik = Number(param.jeda_gabung_detik) || 0.30;
  const segmenMinDetik = Number(param.segmen_min_detik) || 0.15;
  const modeAmbang = param.mode_ambang || 'adaptif_dengan_batas_bawah';

  const durasiBingkaiDetik = bingkaiMd / 1000;
  const sampelPerBingkai = Math.max(1, Math.round(sampleRate * durasiBingkaiDetik));
  const totalSampel = sampelFloat32.length;
  const durasiTotalDetik = totalSampel / sampleRate;

  const rmsBingkai = [];
  for (let i = 0; i < totalSampel; i += sampelPerBingkai) {
    const batas = Math.min(totalSampel, i + sampelPerBingkai);
    const n = batas - i;
    if (n <= 0) break;
    let jumlahKuadrat = 0;
    for (let j = i; j < batas; j++) {
      const v = sampelFloat32[j];
      jumlahKuadrat += v * v;
    }
    rmsBingkai.push(Math.sqrt(jumlahKuadrat / n));
  }

  const p10Rekaman = hitungPersentil(rmsBingkai, 10);
  const p90Rekaman = hitungPersentil(rmsBingkai, 90);

  const L = kalibrasiLatar && kalibrasiLatar.L != null ? kalibrasiLatar.L : p10Rekaman;
  const S = kalibrasiLatar && kalibrasiLatar.S != null && kalibrasiLatar.S > L ? kalibrasiLatar.S : p90Rekaman;
  const ambangRumus = L + faktorAdaptif * Math.max(0, S - L);

  let ambangDipakai = ambangBawaan;
  if (modeAmbang === 'tetap') {
    ambangDipakai = ambangBawaan;
  } else if (modeAmbang === 'murni_rumus') {
    ambangDipakai = ambangRumus > 0.001 ? ambangRumus : ambangBawaan;
  } else {
    // adaptif_dengan_batas_bawah: menjaga agar saat rekaman sunyi total (S ≈ L ≈ 0), derau mikro tidak dianggap suara
    ambangDipakai = (S - L) >= 0.008 ? Math.max(ambangBawaan * 0.5, ambangRumus) : ambangBawaan;
  }

  // 1. Cari segmen mentah di mana RMS > ambangDipakai
  const segmenMentah = [];
  let sedangSuara = false;
  let mulaiIdx = 0;

  for (let idx = 0; idx < rmsBingkai.length; idx++) {
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

  // 2. Gabungkan segmen yang jeda di antaranya <= jedaGabungDetik (0,3 detik)
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

  // 3. Buang segmen yang panjangnya < segmenMinDetik (0,15 detik)
  const segmenSah = segmenGabung.filter(
    (seg) => (seg.akhir - seg.mulai) >= segmenMinDetik - 1e-6
  );

  // 4. Hitung waktu_mulai_bicara, durasi_bersuara_20 (0..20 dtk), durasi_bersuara_tambahan (20..30 dtk)
  const waktuMulaiBicara = segmenSah.length > 0 ? Number(segmenSah[0].mulai.toFixed(2)) : null;

  let durasi20 = 0;
  let durasiTambahan = 0;
  let durasiTotalSuara = 0;

  for (const seg of segmenSah) {
    const dTotal = Math.max(0, seg.akhir - seg.mulai);
    durasiTotalSuara += dTotal;

    // Irisan dengan [0, 20]
    const m20 = Math.max(0, seg.mulai);
    const a20 = Math.min(20, seg.akhir);
    if (a20 > m20) {
      durasi20 += (a20 - m20);
    }

    // Irisan dengan [20, 30]
    const m30 = Math.max(20, seg.mulai);
    const a30 = Math.min(30, seg.akhir);
    if (a30 > m30) {
      durasiTambahan += (a30 - m30);
    }
  }

  const durasiBersuara20 = Number(durasi20.toFixed(2));
  const durasiBersuaraTambahan = Number(durasiTambahan.toFixed(2));
  const durasiBersuaraTotal = Number(durasiTotalSuara.toFixed(2));

  let flag = '';
  if (durasiBersuaraTotal === 0) {
    flag = 'sunyi';
  } else if (durasiBersuaraTotal < 1.0) {
    flag = 'kurang_1_detik';
  }

  return {
    durasi_rekaman_total: Number(durasiTotalDetik.toFixed(2)),
    waktu_mulai_bicara: waktuMulaiBicara,
    durasi_bersuara_20: durasiBersuara20,
    durasi_bersuara_tambahan: durasiBersuaraTambahan,
    durasi_bersuara_total: durasiBersuaraTotal,
    jumlah_segmen_suara: segmenSah.length,
    segmen_suara: segmenSah.map((s) => ({
      mulai: Number(s.mulai.toFixed(2)),
      akhir: Number(s.akhir.toFixed(2)),
      durasi: Number((s.akhir - s.mulai).toFixed(2))
    })),
    statistik_rms: {
      jumlah_bingkai: rmsBingkai.length,
      L_persentil_10: Number(L.toFixed(5)),
      S_persentil_90: Number(S.toFixed(5)),
      ambang_rumus: Number(ambangRumus.toFixed(5)),
      ambang_dipakai: Number(ambangDipakai.toFixed(5))
    },
    flag
  };
}

/**
 * Mendekode Blob audio dengan AudioContext lalu menghitung metrik amplitudo (FR-074)
 */
export async function analisisBlobAudio(blob, param = {}, kalibrasiLatar = null) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('AudioContext tidak tersedia di peramban ini.');
  }
  const arrayBuffer = await blob.arrayBuffer();
  const ctx = new AudioCtx();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));
    const kanal0 = audioBuffer.getChannelData(0);
    return hitungMetrikAmplitudoDariSampel(kanal0, audioBuffer.sampleRate, param, kalibrasiLatar);
  } finally {
    if (ctx.state !== 'closed' && typeof ctx.close === 'function') {
      try {
        await ctx.close();
      } catch (_) {
        // abaikan
      }
    }
  }
}

/**
 * Mengubah Blob ke string Base64 (tanpa prefix data:...;base64,)
 */
export function blobKeBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const hasil = String(reader.result || '');
      const komaIdx = hasil.indexOf(',');
      resolve(komaIdx >= 0 ? hasil.slice(komaIdx + 1) : hasil);
    };
    reader.onerror = () => reject(new Error('Kendala membaca berkas audio.'));
    reader.readAsDataURL(blob);
  });
}

/* ==========================================================================
   PENGENDALI ANTARMUKA HALAMAN situs/uji.html
   ========================================================================== */

const stateUji = {
  streamMikrofon: null,
  izinMikrofon: false,
  dukunganSpeech: false,
  SpeechRecognitionCtor: null,
  infoMime: { didukung: false, mime: '', kandidat_diuji: [] },
  sedangMerekam: false,
  mediaRecorder: null,
  pengenalSuara: null,
  potonganAudio: [],
  alternatifTerkumpul: [],
  waktuMulaiTekanMs: 0,
  timerBatas: null,
  timerDetik: null,
  detikBerjalan: 0,
  kalibrasiLatar: null,
  rekamanTerakhir: null,
  riwayatPercobaan: []
};

function ambilParameterDariForm() {
  return {
    batas_detik: Number(document.querySelector('input[name="batas-detik"]:checked')?.value || 15),
    bitrate_kbps: Number(document.getElementById('pilih-bitrate')?.value || 24),
    ambang_deteksi: Number(document.getElementById('param-ambang-deteksi')?.value || 0.5),
    bingkai_md: Number(document.getElementById('param-bingkai-md')?.value || 50),
    ambang_bawaan: Number(document.getElementById('param-ambang-bawaan')?.value || 0.02),
    faktor_adaptif: Number(document.getElementById('param-faktor-adaptif')?.value || 0.25),
    jeda_gabung_detik: Number(document.getElementById('param-jeda-gabung')?.value || 0.30),
    segmen_min_detik: Number(document.getElementById('param-segmen-min')?.value || 0.15),
    mode_ambang: document.getElementById('param-mode-ambang')?.value || 'adaptif_dengan_batas_bawah'
  };
}

function perbaruiKartuUngkapan() {
  const selectEl = document.getElementById('pilih-ungkapan');
  const idx = Number(selectEl?.value || 0);
  const item = DAFTAR_UNGKAPAN_U1_BA[idx] || DAFTAR_UNGKAPAN_U1_BA[0];

  const elId = document.getElementById('label-id-ungkapan');
  const elFungsi = document.getElementById('label-fungsi-ungkapan');
  const elArab = document.getElementById('teks-arab-ungkapan');
  const elKataWajib = document.getElementById('daftar-kata-wajib');

  if (elId) elId.textContent = `${item.id} (${item.id_pasangan})`;
  if (elFungsi) elFungsi.textContent = item.fungsi_id;
  if (elArab) elArab.textContent = item.arab;
  if (elKataWajib) {
    elKataWajib.innerHTML = '';
    for (const kw of item.kata_wajib) {
      const span = document.createElement('span');
      span.className = 'penanda-status penanda-status--menunggu';
      span.setAttribute('dir', 'rtl');
      span.setAttribute('lang', 'ar');
      span.style.fontFamily = 'var(--font-arab)';
      span.style.fontSize = '1.5rem';
      span.textContent = kw;
      elKataWajib.appendChild(span);
    }
  }
}

function perbaruiPanelTeksSalin() {
  const area = document.getElementById('area-hasil-salin');
  if (!area) return;

  const param = ambilParameterDariForm();
  const baris = [];
  baris.push('=== LAPORAN UJI M0 KALĀM ===');
  baris.push(`Waktu Uji       : ${new Date().toISOString()}`);
  baris.push(`Perangkat (UA)  : ${navigator.userAgent}`);
  baris.push(`Lebar Layar     : ${window.innerWidth} x ${window.innerHeight} px`);
  baris.push(`Izin Mikrofon   : ${stateUji.izinMikrofon ? 'Diizinkan (1)' : 'Belum / Ditolak (0)'}`);
  baris.push(`Speech ar-SA    : ${stateUji.dukunganSpeech ? 'Tersedia (1)' : 'Tidak tersedia -> Mode Mandiri (0)'}`);
  baris.push(`MIME Terpilih   : ${stateUji.infoMime.mime || '(bawaan peramban)'}`);
  baris.push(`Bitrate Target  : ${param.bitrate_kbps} kbps mono`);
  baris.push(`Parameter FR-074: bingkai=${param.bingkai_md}md, ambang_bawaan=${param.ambang_bawaan}, faktor=${param.faktor_adaptif}, gabung=${param.jeda_gabung_detik}d, min=${param.segmen_min_detik}d`);
  if (stateUji.kalibrasiLatar) {
    baris.push(`Kalibrasi 3 dtk : L=${stateUji.kalibrasiLatar.L}, S=${stateUji.kalibrasiLatar.S}, Ambang=${stateUji.kalibrasiLatar.ambang}`);
  }
  baris.push('');
  baris.push(`--- RIWAYAT PERCOBAAN (${stateUji.riwayatPercobaan.length}) ---`);

  if (stateUji.riwayatPercobaan.length === 0) {
    baris.push('Belum ada rekaman percobaan.');
  } else {
    stateUji.riwayatPercobaan.forEach((p, i) => {
      baris.push(
        `#${i + 1} [${p.jenis_uji}] Item=${p.id_ungkapan} | Batas=${p.batas_detik}d | DurasiRekam=${p.durasi_rekaman}d | Ukuran=${p.ukuran_kb} KB (${p.ukuran_byte} B) | MIME=${p.mime}`
      );
      baris.push(
        `   Amplitudo (FR-074): MulaiBicara=${p.waktu_mulai_bicara ?? 'kosong'}d | Bersuara20=${p.durasi_bersuara_20}d | Ekstra20_30=${p.durasi_bersuara_tambahan}d | TotalSuara=${p.durasi_bersuara_total}d | AmbangRMS=${p.ambang_rms} | Flag=${p.flag || 'normal'}`
      );
      baris.push(
        `   Deteksi (FR-071)  : Skor=${p.skor_kata_kunci}/${p.k_wajib} (Syarat>=${p.syarat_minimal}, Ambang=${p.ambang_deteksi}) | Status=${p.status_deteksi}`
      );
      if (p.alternatif && p.alternatif.length > 0) {
        const altStr = p.alternatif.map((a) => `[${a.indeks}] "${a.teks_normalisasi}"`).join(' ; ');
        baris.push(`   Alternatif Memori : ${altStr}`);
      } else {
        baris.push('   Alternatif Memori : (kosong / tidak ada transkrip)');
      }
      if (p.info_unggah) {
        baris.push(`   Unggah Server M0  : ${p.info_unggah}`);
      }
    });
  }

  area.value = baris.join('\n');
}

async function mintaIzinMikrofon() {
  const statusEl = document.getElementById('status-izin-mikrofon');
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (statusEl) {
        statusEl.className = 'penanda-status penanda-status--coba-lagi';
        statusEl.textContent = 'Peramban belum mendukung akses mikrofon (getUserMedia)';
      }
      return false;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    });

    stateUji.streamMikrofon = stream;
    stateUji.izinMikrofon = true;

    if (statusEl) {
      statusEl.className = 'penanda-status penanda-status--terdeteksi';
      statusEl.innerHTML = '<span class="penanda-status__ikon" aria-hidden="true">✓</span> Izin mikrofon aktif ✓';
    }
    perbaruiPanelTeksSalin();
    return true;
  } catch (err) {
    console.info('[Log Teknis M0] Akses mikrofon belum diperoleh:', err);
    stateUji.izinMikrofon = false;
    if (statusEl) {
      statusEl.className = 'penanda-status penanda-status--coba-lagi';
      statusEl.textContent = 'Izin mikrofon belum diberikan. Izinkan mikrofon di pengaturan peramban lalu ketuk lagi.';
    }
    perbaruiPanelTeksSalin();
    return false;
  }
}

function hentikanTimerRekam() {
  if (stateUji.timerBatas) {
    clearTimeout(stateUji.timerBatas);
    stateUji.timerBatas = null;
  }
  if (stateUji.timerDetik) {
    clearInterval(stateUji.timerDetik);
    stateUji.timerDetik = null;
  }
}

async function mulaiRekamDanDeteksi(modeKalibrasi3Detik = false) {
  if (stateUji.sedangMerekam) {
    hentikanRekamDanDeteksi();
    return;
  }

  if (!stateUji.izinMikrofon || !stateUji.streamMikrofon) {
    const ok = await mintaIzinMikrofon();
    if (!ok) return;
  }

  const param = ambilParameterDariForm();
  const batasDetik = modeKalibrasi3Detik ? 3 : param.batas_detik;
  const bitrateBps = param.bitrate_kbps * 1000;

  stateUji.potonganAudio = [];
  stateUji.alternatifTerkumpul = [];
  stateUji.sedangMerekam = true;
  stateUji.waktuMulaiTekanMs = performance.now();
  stateUji.detikBerjalan = 0;

  // Ubah tampilan kotak rekam ke keadaan merekam
  const kotakRekam = document.getElementById('kotak-rekam-utama');
  const tombolRekam = document.getElementById('tombol-rekam-utama');
  const labelStatusRekam = document.getElementById('label-status-rekam');
  const penghitungDetikEl = document.getElementById('penghitung-detik-rekam');

  if (kotakRekam) {
    kotakRekam.className = 'kotak-rekam kotak-rekam--merekam';
  }
  if (tombolRekam) {
    tombolRekam.className = 'tombol tombol-rekam--merekam';
    tombolRekam.textContent = '■ Berhenti Merekam';
  }
  if (labelStatusRekam) {
    labelStatusRekam.textContent = modeKalibrasi3Detik
      ? 'Sedang mengukur suara latar & tes rekam (3 detik)...'
      : `Sedang merekam & mengenali suara ar-SA (batas ${batasDetik} detik)...`;
  }
  if (penghitungDetikEl) {
    penghitungDetikEl.textContent = `0,0 / ${batasDetik} detik`;
  }

  // 1. Jalankan MediaRecorder (FR-072)
  const opsiRecorder = { audioBitsPerSecond: bitrateBps };
  if (stateUji.infoMime.mime) {
    opsiRecorder.mimeType = stateUji.infoMime.mime;
  }

  let recorder;
  try {
    recorder = new MediaRecorder(stateUji.streamMikrofon, opsiRecorder);
  } catch (_) {
    recorder = new MediaRecorder(stateUji.streamMikrofon);
  }
  stateUji.mediaRecorder = recorder;

  recorder.ondataavailable = (ev) => {
    if (ev.data && ev.data.size > 0) {
      stateUji.potonganAudio.push(ev.data);
    }
  };

  recorder.onstop = async () => {
    await prosesHasilRekamDanDeteksi(modeKalibrasi3Detik, batasDetik, param);
  };

  // 2. Jalankan SpeechRecognition ar-SA bersamaan bila didukung dan bukan kalibrasi 3 detik (TB-M0-03 & TB-M0-04)
  if (!modeKalibrasi3Detik && stateUji.dukunganSpeech && stateUji.SpeechRecognitionCtor) {
    try {
      const rec = new stateUji.SpeechRecognitionCtor();
      rec.lang = 'ar-SA';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 5;

      rec.onresult = (event) => {
        const kumpulan = [];
        for (let i = 0; i < event.results.length; i++) {
          const res = event.results[i];
          for (let j = 0; j < res.length; j++) {
            const alt = res[j];
            if (alt && alt.transcript) {
              kumpulan.push({
                transcript: alt.transcript,
                confidence: alt.confidence
              });
            }
          }
        }
        if (kumpulan.length > 0) {
          stateUji.alternatifTerkumpul = kumpulan.slice(0, 5);
        }
      };

      rec.onerror = (ev) => {
        console.info('[Log Teknis M0] Catatan SpeechRecognition:', ev.error);
      };

      rec.start();
      stateUji.pengenalSuara = rec;
    } catch (err) {
      console.info('[Log Teknis M0] SpeechRecognition tidak dapat dimulai bersamaan:', err);
      stateUji.pengenalSuara = null;
    }
  }

  recorder.start(250);

  // Penghitung waktu berjalan (santai, memperbarui tampilan setiap 200 md)
  stateUji.timerDetik = setInterval(() => {
    const lewat = (performance.now() - stateUji.waktuMulaiTekanMs) / 1000;
    if (penghitungDetikEl) {
      penghitungDetikEl.textContent = `${lewat.toFixed(1).replace('.', ',')} / ${batasDetik} detik`;
    }
  }, 200);

  // Berhenti otomatis di batas durasi (FR-072)
  stateUji.timerBatas = setTimeout(() => {
    if (stateUji.sedangMerekam) {
      hentikanRekamDanDeteksi();
    }
  }, batasDetik * 1000);
}

function hentikanRekamDanDeteksi() {
  hentikanTimerRekam();
  stateUji.sedangMerekam = false;

  if (stateUji.pengenalSuara) {
    try {
      stateUji.pengenalSuara.stop();
    } catch (_) {
      // abaikan
    }
    stateUji.pengenalSuara = null;
  }

  if (stateUji.mediaRecorder && stateUji.mediaRecorder.state !== 'inactive') {
    try {
      stateUji.mediaRecorder.stop();
    } catch (_) {
      // abaikan
    }
  }
}

async function prosesHasilRekamDanDeteksi(modeKalibrasi3Detik, batasDetik, param) {
  const kotakRekam = document.getElementById('kotak-rekam-utama');
  const tombolRekam = document.getElementById('tombol-rekam-utama');
  const labelStatusRekam = document.getElementById('label-status-rekam');

  if (kotakRekam) {
    kotakRekam.className = 'kotak-rekam kotak-rekam--tersimpan';
  }
  if (tombolRekam) {
    tombolRekam.className = 'tombol tombol--utama tombol-rekam--siap';
    tombolRekam.textContent = '● Mulai Rekam & Deteksi Suara';
  }
  if (labelStatusRekam) {
    labelStatusRekam.textContent = 'Rekaman tersimpan ✓';
  }

  const mimeAktual = stateUji.mediaRecorder?.mimeType || stateUji.infoMime.mime || 'audio/webm';
  const blob = new Blob(stateUji.potonganAudio, { type: mimeAktual });
  const ukuranByte = blob.size;
  const ukuranKb = Number((ukuranByte / 1024).toFixed(2));

  // Tampilkan pemutar audio uji
  const audioEl = document.getElementById('pemutar-rekaman-uji');
  if (audioEl) {
    audioEl.src = URL.createObjectURL(blob);
    audioEl.hidden = false;
  }

  // Hitung metrik amplitudo (FR-074)
  let metrikAmplitudo;
  try {
    metrikAmplitudo = await analisisBlobAudio(
      blob,
      param,
      modeKalibrasi3Detik ? null : stateUji.kalibrasiLatar
    );
  } catch (err) {
    console.info('[Log Teknis M0] Kendala dekode AudioContext:', err);
    metrikAmplitudo = {
      durasi_rekaman_total: 0,
      waktu_mulai_bicara: null,
      durasi_bersuara_20: 0,
      durasi_bersuara_tambahan: 0,
      durasi_bersuara_total: 0,
      jumlah_segmen_suara: 0,
      segmen_suara: [],
      statistik_rms: {
        jumlah_bingkai: 0,
        L_persentil_10: 0,
        S_persentil_90: 0,
        ambang_rumus: param.ambang_bawaan,
        ambang_dipakai: param.ambang_bawaan
      },
      flag: 'kendala_dekode'
    };
  }

  if (modeKalibrasi3Detik) {
    stateUji.kalibrasiLatar = {
      L: metrikAmplitudo.statistik_rms.L_persentil_10,
      S: metrikAmplitudo.statistik_rms.S_persentil_90,
      ambang: metrikAmplitudo.statistik_rms.ambang_dipakai
    };
    const infoKal = document.getElementById('info-kalibrasi-latar');
    if (infoKal) {
      infoKal.textContent = `Kalibrasi 3 detik tersimpan ✓ — L (P10): ${stateUji.kalibrasiLatar.L} · S (P90): ${stateUji.kalibrasiLatar.S} · Ambang RMS: ${stateUji.kalibrasiLatar.ambang}`;
    }
  }

  // Hitung skor deteksi kata kunci (FR-071)
  const idxUngkapan = Number(document.getElementById('pilih-ungkapan')?.value || 0);
  const itemUngkapan = DAFTAR_UNGKAPAN_U1_BA[idxUngkapan] || DAFTAR_UNGKAPAN_U1_BA[0];
  const hasilKata = hitungSkorKataKunci(
    stateUji.alternatifTerkumpul,
    itemUngkapan.kata_wajib,
    param.ambang_deteksi
  );

  // Tampilkan hasil di layar
  tampilkanHasilKeLayar({
    modeKalibrasi3Detik,
    batasDetik,
    mimeAktual,
    ukuranByte,
    ukuranKb,
    metrikAmplitudo,
    itemUngkapan,
    hasilKata
  });

  const ringkasanPercobaan = {
    jenis_uji: modeKalibrasi3Detik ? 'KALIBRASI_3D' : 'REKAM_DETEKSI',
    id_ungkapan: itemUngkapan.id,
    batas_detik: batasDetik,
    mime: mimeAktual,
    ukuran_byte: ukuranByte,
    ukuran_kb: ukuranKb,
    durasi_rekaman: metrikAmplitudo.durasi_rekaman_total,
    waktu_mulai_bicara: metrikAmplitudo.waktu_mulai_bicara,
    durasi_bersuara_20: metrikAmplitudo.durasi_bersuara_20,
    durasi_bersuara_tambahan: metrikAmplitudo.durasi_bersuara_tambahan,
    durasi_bersuara_total: metrikAmplitudo.durasi_bersuara_total,
    ambang_rms: metrikAmplitudo.statistik_rms.ambang_dipakai,
    flag: metrikAmplitudo.flag,
    skor_kata_kunci: hasilKata.skor_kata_kunci,
    k_wajib: hasilKata.k_wajib,
    syarat_minimal: hasilKata.syarat_minimal,
    ambang_deteksi: hasilKata.ambang_deteksi,
    status_deteksi: !stateUji.dukunganSpeech
      ? 'Mode Mandiri'
      : (hasilKata.terdeteksi ? 'Terdeteksi ✓' : 'Coba lagi'),
    alternatif: hasilKata.alternatif_diproses,
    blob_rekaman: blob
  };

  stateUji.rekamanTerakhir = ringkasanPercobaan;
  stateUji.riwayatPercobaan.push(ringkasanPercobaan);
  perbaruiPanelTeksSalin();

  const tombolUnggah = document.getElementById('tombol-unggah-rekaman');
  if (tombolUnggah) {
    tombolUnggah.disabled = false;
    tombolUnggah.classList.remove('tombol--nonaktif');
  }
}

function tampilkanHasilKeLayar(info) {
  const {
    batasDetik,
    mimeAktual,
    ukuranByte,
    ukuranKb,
    metrikAmplitudo,
    hasilKata
  } = info;

  // 1. Ukuran & MIME (TB-M0-02)
  const elMime = document.getElementById('hasil-mime');
  const elUkuran = document.getElementById('hasil-ukuran');
  const elTolokUkur = document.getElementById('hasil-tolok-ukur');

  if (elMime) elMime.textContent = mimeAktual;
  if (elUkuran) elUkuran.textContent = `${ukuranKb} KB (${ukuranByte} byte) · Durasi: ${metrikAmplitudo.durasi_rekaman_total} detik`;

  if (elTolokUkur) {
    const batasKb = batasDetik <= 15 ? 100 : (batasDetik <= 20 ? 120 : 180);
    const sesuai = ukuranKb <= batasKb;
    elTolokUkur.className = sesuai
      ? 'penanda-status penanda-status--terdeteksi'
      : 'penanda-status penanda-status--coba-lagi';
    elTolokUkur.textContent = sesuai
      ? `Ukuran sesuai tolok ukur (≤ ${batasKb} KB) ✓`
      : `Ukuran di atas sasaran (${ukuranKb} KB > ${batasKb} KB) — pertimbangkan 16 kbps`;
  }

  // 2. Amplitudo & Durasi Bersuara (TB-M0-05 / FR-074)
  const elMulai = document.getElementById('hasil-waktu-mulai');
  const elDurasi20 = document.getElementById('hasil-durasi-20');
  const elDurasiTambahan = document.getElementById('hasil-durasi-tambahan');
  const elRms = document.getElementById('hasil-statistik-rms');
  const elFlagSuara = document.getElementById('hasil-flag-suara');

  if (elMulai) {
    elMulai.textContent = metrikAmplitudo.waktu_mulai_bicara != null
      ? `${metrikAmplitudo.waktu_mulai_bicara} detik`
      : 'Belum terdeteksi suara (kosong)';
  }
  if (elDurasi20) {
    elDurasi20.textContent = `${metrikAmplitudo.durasi_bersuara_20} detik`;
  }
  if (elDurasiTambahan) {
    elDurasiTambahan.textContent = `${metrikAmplitudo.durasi_bersuara_tambahan} detik`;
  }
  if (elRms) {
    const st = metrikAmplitudo.statistik_rms;
    elRms.textContent = `L (P10) = ${st.L_persentil_10} · S (P90) = ${st.S_persentil_90} · Ambang dipakai = ${st.ambang_dipakai} · Segmen = ${metrikAmplitudo.jumlah_segmen_suara}`;
  }
  if (elFlagSuara) {
    if (metrikAmplitudo.flag === 'sunyi') {
      elFlagSuara.className = 'penanda-status penanda-status--coba-lagi';
      elFlagSuara.textContent = 'Suara belum terdengar (sunyi). Dekatkan mikrofon lalu coba lagi.';
    } else if (metrikAmplitudo.flag === 'kurang_1_detik') {
      elFlagSuara.className = 'penanda-status penanda-status--coba-lagi';
      elFlagSuara.textContent = 'Durasi bicara kurang dari 1 detik. Ucapkan kalimat dengan tenang.';
    } else {
      elFlagSuara.className = 'penanda-status penanda-status--terdeteksi';
      elFlagSuara.innerHTML = `<span class="penanda-status__ikon" aria-hidden="true">✓</span> Suara terekam jelas (${metrikAmplitudo.durasi_bersuara_total} detik) ✓`;
    }
  }

  // 3. Pengenalan Suara & Skor Kata Kunci (TB-M0-03 / FR-071)
  const elBadgeDeteksi = document.getElementById('badge-status-deteksi');
  const elSkorKata = document.getElementById('hasil-skor-kata');
  const elDaftarAlternatif = document.getElementById('daftar-alternatif-speech');
  const elRincianKata = document.getElementById('rincian-pencocokan-kata');

  if (elBadgeDeteksi) {
    if (!stateUji.dukunganSpeech) {
      elBadgeDeteksi.className = 'penanda-status penanda-status--menunggu';
      elBadgeDeteksi.textContent = 'Mode Penilaian Mandiri (peramban tanpa SpeechRecognition)';
    } else if (hasilKata.terdeteksi) {
      elBadgeDeteksi.className = 'penanda-status penanda-status--terdeteksi';
      elBadgeDeteksi.innerHTML = '<span class="penanda-status__ikon" aria-hidden="true">✓</span> Terdeteksi ✓';
    } else {
      elBadgeDeteksi.className = 'penanda-status penanda-status--coba-lagi';
      elBadgeDeteksi.innerHTML = '<span class="penanda-status__ikon" aria-hidden="true">↻</span> Coba lagi';
    }
  }

  if (elSkorKata) {
    elSkorKata.textContent = `Skor kata wajib: ${hasilKata.skor_kata_kunci} dari ${hasilKata.k_wajib} (syarat minimal ≥ ${hasilKata.syarat_minimal} pada ambang ${hasilKata.ambang_deteksi})`;
  }

  if (elRincianKata) {
    elRincianKata.innerHTML = '';
    for (const rk of hasilKata.rincian_kata) {
      const li = document.createElement('li');
      li.style.marginBottom = '0.35rem';
      if (rk.cocok) {
        li.textContent = `Kata wajib "${rk.kata_wajib_norm}": Terdeteksi ✓ (cocok dengan "${rk.detail.kata_transkrip}" pada alternatif #${rk.detail.alternatif_ke}, jarak edit = ${rk.detail.jarak})`;
      } else {
        li.textContent = `Kata wajib "${rk.kata_wajib_norm}": Belum muncul di transkrip`;
      }
      elRincianKata.appendChild(li);
    }
  }

  if (elDaftarAlternatif) {
    elDaftarAlternatif.innerHTML = '';
    if (hasilKata.alternatif_diproses.length === 0) {
      const li = document.createElement('li');
      li.textContent = stateUji.dukunganSpeech
        ? 'Belum ada alternatif transkrip yang diterima dari layanan pengenalan suara peramban.'
        : 'Perangkat ini tidak menyediakan Web Speech API; latihan berjalan dengan Mode Penilaian Mandiri.';
      elDaftarAlternatif.appendChild(li);
    } else {
      for (const alt of hasilKata.alternatif_diproses) {
        const li = document.createElement('li');
        li.style.marginBottom = '0.35rem';
        const confTeks = alt.confidence != null ? ` (keyakinan: ${(alt.confidence * 100).toFixed(0)}%)` : '';
        li.textContent = `Alternatif #${alt.indeks}: "${alt.teks_asli}" → normalisasi: "${alt.teks_normalisasi}"${confTeks}`;
        elDaftarAlternatif.appendChild(li);
      }
    }
  }
}

/**
 * Menguji unggah rekaman terakhir ke kalam-api (UJ-M0-04)
 */
async function unggahRekamanTerakhirKeServer() {
  const statusUnggahEl = document.getElementById('status-unggah-m0');
  const inputUrlEl = document.getElementById('input-url-api-m0');
  const urlApi = (inputUrlEl?.value || KALAM_CONFIG.API_URL || '').trim();

  if (!urlApi) {
    if (statusUnggahEl) {
      statusUnggahEl.className = 'penanda-status penanda-status--coba-lagi';
      statusUnggahEl.textContent = 'URL kalam-api belum diisi. Isi di situs/js/config.js atau pada kotak URL di atas.';
    }
    return;
  }

  if (!stateUji.rekamanTerakhir || !stateUji.rekamanTerakhir.blob_rekaman) {
    if (statusUnggahEl) {
      statusUnggahEl.className = 'penanda-status penanda-status--coba-lagi';
      statusUnggahEl.textContent = 'Rekam suara terlebih dahulu sebelum menguji unggah.';
    }
    return;
  }

  const rek = stateUji.rekamanTerakhir;
  if (statusUnggahEl) {
    statusUnggahEl.className = 'penanda-status penanda-status--menunggu';
    statusUnggahEl.textContent = 'Mengirim rekaman ke kalam-api...';
  }

  const mulaiMs = performance.now();
  try {
    const base64Audio = await blobKeBase64(rek.blob_rekaman);
    const idIdempoten = `UJI.${Date.now()}.1`;
    const muatan = {
      aksi: 'unggah_audio',
      token: 'UJI-M0',
      id_idempoten: idIdempoten,
      data: {
        kode_siswa: 'S000',
        jenis: 'UJI',
        unit: 1,
        id_kartu: rek.id_ungkapan,
        bagian: 1,
        mime: rek.mime,
        durasi_total: rek.durasi_rekaman,
        flag: rek.flag,
        metrik: {
          durasi_bersuara_20: rek.durasi_bersuara_20,
          durasi_bersuara_tambahan: rek.durasi_bersuara_tambahan,
          waktu_mulai_bicara: rek.waktu_mulai_bicara,
          dilewati: 0,
          jumlah_ulang: 0,
          batas_detik: rek.batas_detik
        },
        base64: base64Audio
      }
    };

    const resp = await fetch(urlApi, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(muatan)
    });

    const durasiDetik = Number(((performance.now() - mulaiMs) / 1000).toFixed(2));
    const json = await resp.json();

    if (json && json.ok) {
      const idBerkas = json.data?.id_berkas || '-';
      rek.info_unggah = `Terkirim ✓ dalam ${durasiDetik} dtk (id_berkas=${idBerkas})`;
      if (statusUnggahEl) {
        statusUnggahEl.className = 'penanda-status penanda-status--terkirim';
        statusUnggahEl.innerHTML = `<span class="penanda-status__ikon" aria-hidden="true">☁✓</span> Terkirim ✓ dalam ${durasiDetik} detik (ID: ${idBerkas})`;
      }
    } else {
      const kodeGalat = json?.galat || 'E_SERVER';
      rek.info_unggah = `Respons server: ${kodeGalat} (${durasiDetik} dtk)`;
      if (statusUnggahEl) {
        statusUnggahEl.className = 'penanda-status penanda-status--coba-lagi';
        statusUnggahEl.textContent = `Belum tersimpan (${kodeGalat} — ${json?.pesan || 'periksa pengaturan Apps Script'})`;
      }
    }
  } catch (err) {
    const durasiDetik = Number(((performance.now() - mulaiMs) / 1000).toFixed(2));
    rek.info_unggah = `Kendala jaringan setelah ${durasiDetik} dtk`;
    console.info('[Log Teknis M0] Kendala unggah:', err);
    if (statusUnggahEl) {
      statusUnggahEl.className = 'penanda-status penanda-status--coba-lagi';
      statusUnggahEl.textContent = 'Belum terkirim. Periksa koneksi internet dan pastikan URL Web App kalam-api sudah benar.';
    }
  }

  perbaruiPanelTeksSalin();
}

/**
 * Menjalankan verifikasi mandiri algoritma FR-071 & FR-074 dengan sinyal sintetis terukur
 */
function jalankanVerifikasiMandiriAlgoritma() {
  const param = ambilParameterDariForm();

  // 1. Uji FR-071 pada ungkapan terpilih dengan variasi harakat, hamzah, dan jarak edit 1
  const idxUngkapan = Number(document.getElementById('pilih-ungkapan')?.value || 0);
  const item = DAFTAR_UNGKAPAN_U1_BA[idxUngkapan] || DAFTAR_UNGKAPAN_U1_BA[0];
  const alternatifContoh = [
    { transcript: item.arab, confidence: 0.94 },
    { transcript: 'صباح الخير يا استاذ', confidence: 0.81 }
  ];
  const hasilKata = hitungSkorKataKunci(alternatifContoh, item.kata_wajib, param.ambang_deteksi);

  // 2. Buat sampel gelombang suara sintetis 20 detik (sampleRate 8000 Hz):
  //    - 0,00 s.d. 1,20 detik: sunyi latar (amplitudo 0,002)
  //    - 1,20 s.d. 3,40 detik: bicara bagian 1 (2,20 detik, amplitudo 0,18)
  //    - 3,40 s.d. 3,60 detik: jeda napas pendek 0,20 detik (harus digabung karena <= 0,30 detik!)
  //    - 3,60 s.d. 5,70 detik: bicara bagian 2 (2,10 detik, amplitudo 0,18)
  //    Total segmen bicara tergabung = dari 1,20 s.d. 5,70 detik = 4,50 detik, waktu mulai = 1,20 detik.
  const sr = 8000;
  const durasiDetik = 20;
  const totalSampel = sr * durasiDetik;
  const sampel = new Float32Array(totalSampel);

  for (let i = 0; i < totalSampel; i++) {
    const t = i / sr;
    const bicara1 = t >= 1.20 && t < 3.40;
    const bicara2 = t >= 3.60 && t < 5.70;
    if (bicara1 || bicara2) {
      sampel[i] = 0.18 * Math.sin(2 * Math.PI * 220 * t);
    } else {
      sampel[i] = 0.002 * Math.sin(2 * Math.PI * 60 * t);
    }
  }

  const metrikAmplitudo = hitungMetrikAmplitudoDariSampel(sampel, sr, param, null);
  const mimeAktual = stateUji.infoMime.mime || 'audio/webm;codecs=opus (simulasi)';
  const ukuranByte = Math.round((param.bitrate_kbps * 1000 / 8) * durasiDetik);
  const ukuranKb = Number((ukuranByte / 1024).toFixed(2));

  tampilkanHasilKeLayar({
    modeKalibrasi3Detik: false,
    batasDetik: durasiDetik,
    mimeAktual,
    ukuranByte,
    ukuranKb,
    metrikAmplitudo,
    itemUngkapan: item,
    hasilKata
  });

  stateUji.riwayatPercobaan.push({
    jenis_uji: 'VERIFIKASI_ALGORITMA',
    id_ungkapan: item.id,
    batas_detik: durasiDetik,
    mime: mimeAktual,
    ukuran_byte: ukuranByte,
    ukuran_kb: ukuranKb,
    durasi_rekaman: metrikAmplitudo.durasi_rekaman_total,
    waktu_mulai_bicara: metrikAmplitudo.waktu_mulai_bicara,
    durasi_bersuara_20: metrikAmplitudo.durasi_bersuara_20,
    durasi_bersuara_tambahan: metrikAmplitudo.durasi_bersuara_tambahan,
    durasi_bersuara_total: metrikAmplitudo.durasi_bersuara_total,
    ambang_rms: metrikAmplitudo.statistik_rms.ambang_dipakai,
    flag: metrikAmplitudo.flag,
    skor_kata_kunci: hasilKata.skor_kata_kunci,
    k_wajib: hasilKata.k_wajib,
    syarat_minimal: hasilKata.syarat_minimal,
    ambang_deteksi: hasilKata.ambang_deteksi,
    status_deteksi: hasilKata.terdeteksi ? 'Terdeteksi ✓' : 'Coba lagi',
    alternatif: hasilKata.alternatif_diproses
  });

  perbaruiPanelTeksSalin();
}

async function salinHasilKeClipboard() {
  const area = document.getElementById('area-hasil-salin');
  const statusSalin = document.getElementById('status-salin-hasil');
  if (!area) return;

  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(area.value);
    } else {
      area.focus();
      area.select();
      document.execCommand('copy');
    }
    if (statusSalin) {
      statusSalin.className = 'penanda-status penanda-status--terdeteksi';
      statusSalin.innerHTML = '<span class="penanda-status__ikon" aria-hidden="true">✓</span> Teks hasil uji berhasil disalin ✓';
    }
  } catch (_) {
    area.focus();
    area.select();
    if (statusSalin) {
      statusSalin.className = 'penanda-status penanda-status--menunggu';
      statusSalin.textContent = 'Teks telah diblok. Tekan tahan lalu pilih Salin.';
    }
  }
}

function inisialisasiHalamanUji() {
  // 1. Cek dukungan SpeechRecognition (FR-071)
  const SpeechCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  stateUji.SpeechRecognitionCtor = SpeechCtor;
  stateUji.dukunganSpeech = Boolean(SpeechCtor);

  const elStatusSpeech = document.getElementById('status-dukungan-speech');
  if (elStatusSpeech) {
    if (stateUji.dukunganSpeech) {
      elStatusSpeech.className = 'penanda-status penanda-status--terdeteksi';
      elStatusSpeech.innerHTML = '<span class="penanda-status__ikon" aria-hidden="true">✓</span> Web Speech API (ar-SA) tersedia di peramban ini ✓';
    } else {
      elStatusSpeech.className = 'penanda-status penanda-status--menunggu';
      elStatusSpeech.textContent = 'Web Speech API tidak tersedia di perangkat ini → otomatis memakai Mode Penilaian Mandiri (K-10)';
    }
  }

  // 2. Cek dukungan MediaRecorder & tipe MIME (FR-072)
  stateUji.infoMime = pilihMimeMediaRecorder();
  const elMimeAwal = document.getElementById('info-mime-awal');
  if (elMimeAwal) {
    if (stateUji.infoMime.didukung) {
      elMimeAwal.textContent = stateUji.infoMime.mime
        ? `Tipe MIME terpilih: ${stateUji.infoMime.mime}`
        : 'MediaRecorder tersedia (memakai tipe MIME bawaan peramban)';
    } else {
      elMimeAwal.textContent = 'MediaRecorder belum tersedia di peramban ini.';
    }
  }

  // 3. Isi daftar pilihan ungkapan Level 1 U1-BLOK-A
  const selectUngkapan = document.getElementById('pilih-ungkapan');
  if (selectUngkapan) {
    selectUngkapan.innerHTML = '';
    DAFTAR_UNGKAPAN_U1_BA.forEach((item, idx) => {
      const opt = document.createElement('option');
      opt.value = String(idx);
      opt.textContent = `${item.id} — ${item.fungsi_id}`;
      selectUngkapan.appendChild(opt);
    });
    selectUngkapan.addEventListener('change', perbaruiKartuUngkapan);
  }
  perbaruiKartuUngkapan();

  // 4. Isi nilai awal URL API dari config.js bila ada
  const inputUrlApi = document.getElementById('input-url-api-m0');
  if (inputUrlApi && KALAM_CONFIG.API_URL) {
    inputUrlApi.value = KALAM_CONFIG.API_URL;
  }

  // 5. Pasang penangan tombol
  document.getElementById('tombol-izin-mikrofon')?.addEventListener('click', mintaIzinMikrofon);
  document.getElementById('tombol-kalibrasi-3d')?.addEventListener('click', () => mulaiRekamDanDeteksi(true));
  document.getElementById('tombol-rekam-utama')?.addEventListener('click', () => mulaiRekamDanDeteksi(false));
  document.getElementById('tombol-verifikasi-algoritma')?.addEventListener('click', jalankanVerifikasiMandiriAlgoritma);
  document.getElementById('tombol-unggah-rekaman')?.addEventListener('click', unggahRekamanTerakhirKeServer);
  document.getElementById('tombol-salin-hasil')?.addEventListener('click', salinHasilKeClipboard);
  document.getElementById('tombol-bersihkan-riwayat')?.addEventListener('click', () => {
    stateUji.riwayatPercobaan = [];
    perbaruiPanelTeksSalin();
  });

  // Perbarui panel salin saat parameter berubah
  const daftarInputParam = [
    'pilih-bitrate',
    'param-ambang-deteksi',
    'param-bingkai-md',
    'param-ambang-bawaan',
    'param-faktor-adaptif',
    'param-jeda-gabung',
    'param-segmen-min',
    'param-mode-ambang'
  ];
  for (const id of daftarInputParam) {
    document.getElementById(id)?.addEventListener('change', perbaruiPanelTeksSalin);
  }
  document.querySelectorAll('input[name="batas-detik"]').forEach((el) => {
    el.addEventListener('change', perbaruiPanelTeksSalin);
  });

  perbaruiPanelTeksSalin();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inisialisasiHalamanUji);
  } else {
    inisialisasiHalamanUji();
  }
}
