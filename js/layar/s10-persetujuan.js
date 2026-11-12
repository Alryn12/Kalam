/**
 * Layar S-10: Pengantar dan Janji Aman (situs/js/layar/s10-persetujuan.js)
 * Tugas M1-C: TB-M1-03
 * Acuan: SRS-3 FR-004, FR-079; BP-1 S-10; BP-5 K-39; BP-6 S-10; KEPUTUSAN.md SL-BARU-07 & SL-BARU-08
 */

import { panggilApi } from '../api.js';
import { arahKe } from '../router.js';
import { ambilState, ambilTeks, perbaruiStatusServer } from '../state.js';
import {
  ambilFase,
  escapeHtml,
  siapkanWadahLayar,
  simpanKemajuanTahap0,
  waktuIsoWib
} from './tahap0-bantu.js';

export async function renderS10({ param = {} } = {}) {
  const fase = ambilFase(param);
  const state = ambilState();
  const judul = fase === 'AF'
    ? ambilTeks('S-10', 'judul_after')
    : ambilTeks('S-10', 'judul_t0');

  const wadah = siapkanWadahLayar('S-10', judul);
  if (!wadah) return;

  const sudahSetujuSebelumnya = fase === 'AF'
    ? Number(state.status_server && state.status_server.persetujuan_AF) === 1
    : Number(state.status_server && state.status_server.persetujuan_T0) === 1;

  const janji1 = ambilTeks('S-10', 'janji_1');
  const janji2 = ambilTeks('S-10', 'janji_2');
  const janji3 = ambilTeks('S-10', 'janji_3');
  const tautan = ambilTeks('S-10', 'tautan');
  const isiTautan = ambilTeks('S-10', 'isi_tautan');
  const labelCentang = ambilTeks('S-10', 'kotak_centang');
  const teksTombol = ambilTeks('S-10', 'tombol');
  const pesanBelumCentang = ambilTeks('S-10', 'pesan_bila_belum_dicentang');

  wadah.innerHTML = `
    <section class="kartu" aria-labelledby="judul-s10">
      <h1 id="judul-s10" class="judul-layar">${escapeHtml(judul)}</h1>

      <div class="pesan-hangat">
        <p class="pesan-hangat__isi">1. ${escapeHtml(janji1)}</p>
      </div>
      <div class="pesan-hangat">
        <p class="pesan-hangat__isi">2. ${escapeHtml(janji2)}</p>
      </div>
      <div class="pesan-hangat">
        <p class="pesan-hangat__isi">3. ${escapeHtml(janji3)}</p>
      </div>

      <div>
        <button type="button" id="tombol-info-suara-s10" class="tautan-aksi tautan-aksi-tombol" aria-expanded="false">
          ${escapeHtml(tautan)}
        </button>
        <div id="isi-info-suara-s10" class="pesan-hangat" role="note" hidden style="margin-top: var(--jarak-2);">
          <p class="pesan-hangat__isi">${escapeHtml(isiTautan)}</p>
        </div>
      </div>

      <label id="wadah-centang-s10" class="kotak-centang-baris ${sudahSetujuSebelumnya ? 'kotak-centang-baris--tercentang' : ''}">
        <input
          type="checkbox"
          id="centang-persetujuan-s10"
          class="kotak-centang-input"
          ${sudahSetujuSebelumnya ? 'checked' : ''}
        >
        <span class="label-input">${escapeHtml(labelCentang)}</span>
      </label>

      <div id="pesan-persetujuan-s10" class="pesan-hangat pesan-hangat--aksen" role="status" ${sudahSetujuSebelumnya ? 'hidden' : ''}>
        <p class="pesan-hangat__isi">${escapeHtml(pesanBelumCentang)}</p>
      </div>

      <div id="pesan-kirim-s10" aria-live="polite"></div>

      <button
        type="button"
        id="tombol-lanjut-s10"
        class="tombol ${sudahSetujuSebelumnya ? 'tombol--utama' : 'tombol--nonaktif'}"
        ${sudahSetujuSebelumnya ? '' : 'disabled'}
      >
        ${escapeHtml(teksTombol)}
      </button>
    </section>
  `;

  const btnInfo = document.getElementById('tombol-info-suara-s10');
  const isiInfo = document.getElementById('isi-info-suara-s10');
  const kotakCentang = document.getElementById('centang-persetujuan-s10');
  const wadahCentang = document.getElementById('wadah-centang-s10');
  const pesanBelum = document.getElementById('pesan-persetujuan-s10');
  const pesanKirim = document.getElementById('pesan-kirim-s10');
  const btnLanjut = document.getElementById('tombol-lanjut-s10');

  if (btnInfo && isiInfo) {
    btnInfo.addEventListener('click', () => {
      const terbuka = !isiInfo.hidden;
      isiInfo.hidden = terbuka;
      btnInfo.setAttribute('aria-expanded', String(!terbuka));
    });
  }

  function perbaruiKeadaanTombol() {
    const dicentang = Boolean(kotakCentang && kotakCentang.checked);
    if (wadahCentang) {
      wadahCentang.classList.toggle('kotak-centang-baris--tercentang', dicentang);
    }
    if (pesanBelum) {
      pesanBelum.hidden = dicentang;
    }
    if (btnLanjut) {
      btnLanjut.disabled = !dicentang;
      btnLanjut.classList.toggle('tombol--utama', dicentang);
      btnLanjut.classList.toggle('tombol--nonaktif', !dicentang);
    }
  }

  if (kotakCentang) {
    kotakCentang.addEventListener('change', perbaruiKeadaanTombol);
  }

  if (btnLanjut) {
    btnLanjut.addEventListener('click', async () => {
      if (!kotakCentang || !kotakCentang.checked) {
        perbaruiKeadaanTombol();
        return;
      }

      btnLanjut.disabled = true;
      btnLanjut.textContent = 'Menyimpan…';
      if (pesanKirim) pesanKirim.innerHTML = '';

      const hasil = await panggilApi(
        'persetujuan',
        { fase, nilai: 1, waktu_klien: waktuIsoWib() },
        { janganArahkan: true }
      );

      if (!hasil || !hasil.ok) {
        btnLanjut.disabled = false;
        btnLanjut.textContent = teksTombol;
        if (pesanKirim) {
          pesanKirim.innerHTML = `
            <div class="pesan-hangat pesan-hangat--aksen" role="status">
              <p class="pesan-hangat__isi">${escapeHtml((hasil && hasil.pesan) || 'Internet belum terhubung. Cek sinyalmu lalu tekan Lanjut lagi.')}</p>
            </div>
          `;
        }
        return;
      }

      const st = Object.assign({}, ambilState().status_server || {});
      if (fase === 'AF') st.persetujuan_AF = 1;
      else st.persetujuan_T0 = 1;
      await perbaruiStatusServer(st);
      await simpanKemajuanTahap0('S-11', fase);
      arahKe('S-11', { fase });
    });
  }
}
