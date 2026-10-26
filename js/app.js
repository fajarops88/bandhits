/* ================= LOGIN PIN =================
 * PIN WAJIB dimasukkan ulang setiap kali membuka aplikasi dari awal
 * (tidak diingat via localStorage). Overlay selalu tampil dan fokus ke
 * kotak PIN setiap DOMContentLoaded. */
function checkPinSession(){
  document.getElementById('pinInput').focus();
}
let _appStarted = false;
/* Data aplikasi baru dimuat SETELAH PIN benar (token sesi didapat dari server). */
function mulaiAplikasi(){
  if (_appStarted) return;
  _appStarted = true;
  loadKategoriGlobal();
  navigateTo('dashboard');
  loadPengingatBadge();
}
function tampilkanPinError_(teks){
  const el = document.getElementById('pinError');
  el.innerText = teks; el.style.display = 'block';
}
function submitPinLogin(){
  const input = document.getElementById('pinInput');
  const pin = input.value.trim();
  if (!pin) return;
  const tombol = document.querySelector('#pinOverlay button');
  tombol.disabled = true;
  google.script.run.withSuccessHandler(function(res){
    tombol.disabled = false;
    if (res.success && res.valid){
      document.getElementById('pinError').style.display = 'none';
      document.getElementById('pinOverlay').style.display = 'none';
      input.value = '';
      mulaiAplikasi();
    } else {
      tampilkanPinError_(res.locked && res.message ? res.message : 'PIN salah, coba lagi.');
      input.value = '';
      input.focus();
    }
  }).withFailureHandler(function(err){
    tombol.disabled = false;
    tampilkanPinError_((err && err.message) || 'Tidak dapat terhubung ke server.');
  }).verifyLoginPin(pin);
}
function openModalUbahPin(){
  document.getElementById('formUbahPin').reset();
  showBootstrapModal('modalUbahPin');
}
function submitUbahPin(e){
  e.preventDefault();
  const oldPin = document.getElementById('pinLama').value.trim();
  const newPin = document.getElementById('pinBaru').value.trim();
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    showLoading(false);
    if(!res.success){ toast('error', res.message); return; }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalUbahPin')).hide();
    toast('success', res.message);
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).changeLoginPin(oldPin, newPin);
}
function openPublicLinkInfo(){
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    showLoading(false);
    if (!res.success){ toast('error', 'Gagal mengambil link publik'); return; }
    const publicUrl = res.url;
    Swal.fire({
      title: 'Link Dashboard Publik',
      html: '<p class="small text-muted mb-2">Bagikan link ini ke teman Anda. Mereka bisa melihat ringkasan keuangan (hanya lihat, tidak bisa edit) tanpa perlu PIN.</p>' +
        '<input type="text" class="form-control text-center mb-2" id="publicUrlInput" value="'+publicUrl+'" readonly onclick="this.select()">',
      showConfirmButton: true,
      confirmButtonText: 'Buka Link',
      showDenyButton: true,
      denyButtonText: 'Salin Link',
      showCancelButton: true,
      cancelButtonText: 'Tutup',
      confirmButtonColor: '#6C5CE7',
      denyButtonColor: '#4834D4'
    }).then(function(swalRes){
      if (swalRes.isConfirmed){
        window.open(publicUrl, '_blank');
      } else if (swalRes.isDenied){
        copyPublicUrlToClipboard_(publicUrl);
      }
    });
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).getPublicUrl();
}
function copyPublicUrlToClipboard_(url){
  if (navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(url).then(function(){
      toast('success','Link berhasil disalin');
    }).catch(function(){
      fallbackCopyPublicUrl_(url);
    });
  } else {
    fallbackCopyPublicUrl_(url);
  }
}
function fallbackCopyPublicUrl_(url){
  const input = document.getElementById('publicUrlInput');
  if (input){
    input.select();
    try {
      document.execCommand('copy');
      toast('success','Link berhasil disalin');
    } catch(e){
      toast('warning','Gagal menyalin otomatis. Silakan salin manual dari kotak teks.');
    }
  }
}

/* ================= LAZY LOADER LIBRARY BERAT ================= */
const _loadedLibs = {};
function loadScriptOnce(url){
  return new Promise(function(resolve, reject){
    if (_loadedLibs[url]) { resolve(); return; }
    const s = document.createElement('script');
    s.src = url;
    s.onload = function(){ _loadedLibs[url] = true; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
function ensureChartJs(){
  return loadScriptOnce('https://cdn.jsdelivr.net/npm/chart.js@4.4.4/dist/chart.umd.min.js');
}
function ensureJsPdf(){
  return loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
    .then(function(){ return loadScriptOnce('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js'); });
}

/* ================= UTILITAS ================= */
function formatRupiah(angka){ angka = Number(angka)||0; return 'Rp ' + angka.toLocaleString('id-ID'); }
function parseRupiahInput(el){ let val = el.value.replace(/[^0-9]/g,''); el.value = val ? Number(val).toLocaleString('id-ID') : ''; }
function unformatRupiah(str){ return Number(String(str).replace(/[^0-9]/g,'')) || 0; }
function todayStr(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function formatTanggal(str){ const d=new Date(str); if(isNaN(d)) return str; return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}); }
function dateTd(str){
  return '<td data-sort="'+escapeHtml(str||'')+'">'+formatTanggal(str)+'</td>';
}
function escapeHtml(str){ const div=document.createElement('div'); div.innerText = str==null?'':str; return div.innerHTML; }

/* ================= MODAL HELPER ================= */
function showBootstrapModal(id){
  showLoading(false);
  document.querySelectorAll('.swal2-container').forEach(function(el){ el.remove(); });
  document.body.classList.remove('swal2-shown', 'swal2-height-auto');
  bootstrap.Modal.getOrCreateInstance(document.getElementById(id)).show();
}

/* ================= PEMBERSIH OVERLAY MACET ================= */
function forceCleanupOverlays(){
  if (!document.querySelector('.modal.show') && !document.querySelector('.offcanvas.show')) {
    document.querySelectorAll('.modal-backdrop, .offcanvas-backdrop').forEach(function(el){ el.remove(); });
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
}

let _loadingTimer = null;
let _loadingWatchdog = null;
let _loadingForceBtnTimer = null;
function showLoading(show){
  const el = document.getElementById('loading-overlay');
  const btn = document.getElementById('btnForceCloseLoading');
  if (show){
    clearTimeout(_loadingTimer);
    _loadingTimer = setTimeout(function(){
      el.style.display = 'flex';
      requestAnimationFrame(function(){ el.classList.add('show'); });
    }, 150);

    clearTimeout(_loadingForceBtnTimer);
    if (btn){
      btn.style.display = 'none';
      _loadingForceBtnTimer = setTimeout(function(){ btn.style.display = 'block'; }, 5000);
    }

    clearTimeout(_loadingWatchdog);
    _loadingWatchdog = setTimeout(function(){
      showLoading(false);
      toast('error', 'Server tidak merespons. Coba lagi.');
    }, 20000);
  } else {
    clearTimeout(_loadingTimer);
    clearTimeout(_loadingWatchdog);
    clearTimeout(_loadingForceBtnTimer);
    el.classList.remove('show');
    el.style.display = 'none';
    if (btn) btn.style.display = 'none';
  }
}
function toast(icon,title){ Swal.mixin({toast:true,position:'top-end',showConfirmButton:false,timer:2500,timerProgressBar:true}).fire({icon:icon,title:title}); }
function confirmDelete(cb){
  Swal.fire({ title:'Hapus data ini?', text:'Data yang dihapus tidak dapat dikembalikan.', icon:'warning',
    showCancelButton:true, confirmButtonColor:'#e11d48', cancelButtonColor:'#9ca3af',
    confirmButtonText:'Ya, hapus', cancelButtonText:'Batal' }).then(function(res){ if(res.isConfirmed) cb(); });
}
function jenisLabel(jenis){
  if (jenis === 'Hutang') return 'Pinjaman';
  return jenis;
}
const dtLangID = {
  processing:"Sedang memproses...", search:"Cari:", lengthMenu:"Tampilkan _MENU_ data",
  info:"Menampilkan _START_ - _END_ dari _TOTAL_ data", infoEmpty:"Tidak ada data",
  infoFiltered:"(disaring dari _MAX_ total data)", zeroRecords:"Tidak ditemukan data yang sesuai",
  emptyTable:'<div class="empty-state-box"><i class="bi bi-inbox"></i><div class="empty-title">Belum ada data</div></div>',
  paginate:{first:"Awal",previous:"Sebelumnya",next:"Berikutnya",last:"Akhir"}
};
const dtLengthMenu = [[10,25,50,100,-1],[10,25,50,100,'Semua']];

/* ================= PRIVACY TOGGLE ================= */
let isPrivacyHidden = true;
function maskText(){ return 'Rp ••••••'; }
function updatePrivacyIcon(){
  const icon = document.getElementById('iconPrivacyToggle');
  if (icon) icon.className = isPrivacyHidden ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill';
}
function togglePrivacy(){
  isPrivacyHidden = !isPrivacyHidden;
  updatePrivacyIcon();
  applyPrivacyToDashboard();
}
function applyPrivacyToDashboard(){
  const raw = window._dashboardRawValues;
  if (!raw) return;
  document.getElementById('sumSaldoKas').innerText = isPrivacyHidden ? maskText() : formatRupiah(raw.saldoKas);
  document.getElementById('sumUangTotal').innerText = isPrivacyHidden ? maskText() : formatRupiah(raw.totalUang);
  document.getElementById('sumPemasukan').innerText = isPrivacyHidden ? maskText() : formatRupiah(raw.totalPemasukanBulanIni);
  document.getElementById('sumPengeluaran').innerText = isPrivacyHidden ? maskText() : formatRupiah(raw.totalPengeluaranBulanIni);
  document.getElementById('sumHutang').innerText = isPrivacyHidden ? maskText() : formatRupiah(raw.totalHutang);
  const topbarEl = document.getElementById('topbarSaldoKas');
  if (topbarEl) topbarEl.innerText = isPrivacyHidden ? maskText() : formatRupiah(raw.saldoKas);
}
function countUpValue(el, endValue, duration){
  if (!el) return;
  duration = duration || 700;
  const startTime = performance.now();
  function step(now){
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(endValue * eased);
    el.innerText = formatRupiah(current);
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.innerText = isPrivacyHidden ? maskText() : formatRupiah(endValue);
    }
  }
  requestAnimationFrame(step);
}

/* ================= HERO CARD BULAN INI (Pemasukan/Pengeluaran/Pinjaman) ================= */
let heroPemasukanHidden = true;
function togglePemasukanHeroPrivacy(){
  heroPemasukanHidden = !heroPemasukanHidden;
  document.getElementById('iconPemasukanHeroPrivacy').className = heroPemasukanHidden ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill';
  renderHeroPemasukan();
}
function renderHeroPemasukan(){
  const data = window._dataPemasukan || [];
  const now = new Date();
  const ym = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const bulanIni = data.filter(function(x){
    const d = new Date(x.tanggal);
    return !isNaN(d) && (d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')) === ym;
  });
  const total = bulanIni.reduce(function(s,x){ return s + Number(x.nominal||0); }, 0);
  document.getElementById('heroPemasukanValue').innerText = heroPemasukanHidden ? 'Rp ••••••' : formatRupiah(total);
  document.getElementById('heroPemasukanSub').innerText = bulanIni.length + ' transaksi bulan ini';
}

let heroPengeluaranHidden = true;
function togglePengeluaranHeroPrivacy(){
  heroPengeluaranHidden = !heroPengeluaranHidden;
  document.getElementById('iconPengeluaranHeroPrivacy').className = heroPengeluaranHidden ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill';
  renderHeroPengeluaran();
}
function renderHeroPengeluaran(){
  const data = window._dataPengeluaran || [];
  const now = new Date();
  const ym = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const bulanIni = data.filter(function(x){
    const d = new Date(x.tanggal);
    return !isNaN(d) && (d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')) === ym;
  });
  const total = bulanIni.reduce(function(s,x){ return s + Number(x.nominal||0); }, 0);
  document.getElementById('heroPengeluaranValue').innerText = heroPengeluaranHidden ? 'Rp ••••••' : formatRupiah(total);
  document.getElementById('heroPengeluaranSub').innerText = bulanIni.length + ' transaksi bulan ini';
}

let heroPinjamanHidden = true;
function togglePinjamanHeroPrivacy(){
  heroPinjamanHidden = !heroPinjamanHidden;
  document.getElementById('iconPinjamanHeroPrivacy').className = heroPinjamanHidden ? 'bi bi-eye-slash-fill' : 'bi bi-eye-fill';
  renderHeroPinjaman();
}
function renderHeroPinjaman(){
  const data = window._dataHutang || [];
  const now = new Date();
  const ym = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  const bulanIni = data.filter(function(h){
    if (h.status === 'Lunas' || !h.nextDueDate) return false;
    const d = new Date(h.nextDueDate);
    return !isNaN(d) && (d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')) === ym;
  });
  const total = bulanIni.reduce(function(s,h){ return s + Math.min(h.cicilanPerBulan, h.sisa); }, 0);
  document.getElementById('heroPinjamanValue').innerText = heroPinjamanHidden ? 'Rp ••••••' : formatRupiah(total);
  document.getElementById('heroPinjamanSub').innerText = bulanIni.length + ' cicilan jatuh tempo bulan ini';
}

/* ================= PERSENTASE ARUS KAS BULAN INI (Dashboard) =================
 * Menampilkan persentase Pemasukan vs Pengeluaran dari total arus kas bulan ini
 * (label di atas kolom rincian kategori) + teks di mini-stat pill. */
function renderPersentaseBulanIni(d){
  const totalPemasukanBulanIni = Number(d.totalPemasukanBulanIni || 0);
  const totalPengeluaranBulanIni = Number(d.totalPengeluaranBulanIni || 0);
  const totalArus = totalPemasukanBulanIni + totalPengeluaranBulanIni;

  const persenPemasukan = totalArus > 0 ? Math.round((totalPemasukanBulanIni / totalArus) * 100) : 0;
  const persenPengeluaran = totalArus > 0 ? Math.round((totalPengeluaranBulanIni / totalArus) * 100) : 0;

  const lblPemasukan = document.getElementById('progressPemasukanLabel');
  const lblPengeluaran = document.getElementById('progressPengeluaranLabel');
  const subArus = document.getElementById('progressArusKasSub');

  if (lblPemasukan) lblPemasukan.textContent = persenPemasukan + '%';
  if (lblPengeluaran) lblPengeluaran.textContent = persenPengeluaran + '%';
  if (subArus) subArus.textContent = 'Total arus kas bulan ini: ' + formatRupiah(totalArus);

  // Teks persentase di mini-stat pill (jika elemen ada)
  const pEl = document.getElementById('persenPemasukan');
  const eEl = document.getElementById('persenPengeluaran');
  if (pEl && eEl){
    if (totalArus <= 0){
      pEl.innerHTML = '<span class="text-muted">0% dari arus kas bulan ini</span>';
      eEl.innerHTML = '<span class="text-muted">0% dari arus kas bulan ini</span>';
    } else {
      pEl.innerHTML = '<span class="text-success">'+persenPemasukan+'% dari arus kas bulan ini</span>';
      eEl.innerHTML = '<span class="text-danger">'+persenPengeluaran+'% dari arus kas bulan ini</span>';
    }
  }
}

/* ================= RINCIAN KATEGORI PEMASUKAN/PENGELUARAN BULAN INI (Dashboard) ================= */
function renderKategoriBreakdownBulanIni(dataPemasukan, dataPengeluaran){
  const now = new Date();
  const ym = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');

  function groupKategoriBulanIni(data){
    const bulanIni = (data||[]).filter(function(x){
      const d = new Date(x.tanggal);
      return !isNaN(d) && (d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')) === ym;
    });
    const map = {};
    bulanIni.forEach(function(x){
      const nama = x.kategori || 'Lainnya';
      map[nama] = (map[nama] || 0) + Number(x.nominal||0);
    });
    const total = bulanIni.reduce(function(s,x){ return s + Number(x.nominal||0); }, 0);
    return Object.keys(map).map(function(nama){ return { nama:nama, total:map[nama] }; })
      .sort(function(a,b){ return b.total - a.total; })
      .map(function(item){ return { nama:item.nama, total:item.total, persen: total>0 ? Math.round((item.total/total)*100) : 0 }; });
  }

  function renderList(containerId, list, tipe){
    const el = document.getElementById(containerId);
    if (!el) return;
    if (!list.length){
      el.innerHTML = '<p class="text-muted small mb-0">Belum ada data bulan ini</p>';
      return;
    }
    el.innerHTML = list.map(function(item){
      const meta = getKategoriMeta(item.nama, tipe);
      return '<div class="progress-diagram-item mb-2">'+
        '<div class="d-flex justify-content-between mb-1">'+
          '<span class="small">'+escapeHtml(item.nama)+'</span>'+
          '<span class="small fw-semibold">'+item.persen+'% ('+formatRupiah(item.total)+')</span>'+
        '</div>'+
        '<div class="progress" style="height:10px; border-radius:8px; background:var(--bg-body);">'+
          '<div class="progress-bar" style="width:'+item.persen+'%; background:'+meta.warna+'; border-radius:8px; transition:width .6s ease;"></div>'+
        '</div>'+
      '</div>';
    }).join('');
  }

  renderList('kategoriPemasukanBreakdown', groupKategoriBulanIni(dataPemasukan), 'Pemasukan');
  renderList('kategoriPengeluaranBreakdown', groupKategoriBulanIni(dataPengeluaran), 'Pengeluaran');
}

/* ================= OPTIMISTIC UI HELPER (Dashboard) =================
 * Prinsip 2 (Optimistic UI): begitu transaksi Pemasukan/Pengeluaran disimpan/diedit/dihapus,
 * kartu ringkasan Dashboard (saldo, mini-stat, persentase, rincian kategori) langsung
 * di-update dari data lokal (0ms, tanpa nunggu server). Angka final tetap direkonsiliasi oleh
 * refreshDashboardSilently() di background setelah server merespons. */
function applyOptimisticDashboardDelta(tipe, deltaNominal, tanggalLama, tanggalBaru){
  if (!window._dashboardRawValues || !deltaNominal) return;

  const now = new Date();
  const ym = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  function diBulanIni(str){
    if (!str) return false;
    const d = new Date(str);
    return !isNaN(d) && (d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')) === ym;
  }
  // Hanya nudge angka kalau transaksinya memang di bulan berjalan
  if (!diBulanIni(tanggalBaru) && !diBulanIni(tanggalLama)) return;

  const raw = window._dashboardRawValues;
  if (tipe === 'Pemasukan'){
    raw.totalPemasukanBulanIni = Math.max(0, (raw.totalPemasukanBulanIni||0) + deltaNominal);
    raw.saldoKas = (raw.saldoKas||0) + deltaNominal;
  } else {
    raw.totalPengeluaranBulanIni = Math.max(0, (raw.totalPengeluaranBulanIni||0) + deltaNominal);
    raw.saldoKas = (raw.saldoKas||0) - deltaNominal;
  }
  raw.totalUang = raw.saldoKas - (raw.totalHutang||0);

  if (isPrivacyHidden){
    applyPrivacyToDashboard();
  } else {
    countUpValue(document.getElementById('sumSaldoKas'), raw.saldoKas, 300);
    countUpValue(document.getElementById('sumUangTotal'), raw.totalUang, 300);
    countUpValue(document.getElementById('sumPemasukan'), raw.totalPemasukanBulanIni, 300);
    countUpValue(document.getElementById('sumPengeluaran'), raw.totalPengeluaranBulanIni, 300);
    const topbarEl = document.getElementById('topbarSaldoKas');
    if (topbarEl) countUpValue(topbarEl, raw.saldoKas, 300);
  }

  renderPersentaseBulanIni({
    totalPemasukanBulanIni: raw.totalPemasukanBulanIni,
    totalPengeluaranBulanIni: raw.totalPengeluaranBulanIni
  });
  renderKategoriBreakdownBulanIni(window._dataPemasukan || [], window._dataPengeluaran || []);
}

/* ================= SAPAAN PERSONAL ================= */
function renderGreeting(){
  const el = document.getElementById('dashboardGreeting');
  if (!el) return;
  const h = new Date().getHours();
  let text;
  if (h < 11) text = 'Selamat pagi';
  else if (h < 15) text = 'Selamat siang';
  else if (h < 18) text = 'Selamat sore';
  else text = 'Selamat malam';
  el.innerHTML = '<b>' + text + '!</b> Berikut ringkasan keuangan Anda hari ini.';
}

/* ================= INSIGHT CARD ================= */
function renderInsightCard(insight){
  const card = document.getElementById('insightCard');
  const text = document.getElementById('insightCardText');
  if (!card || !text) return;
  if (!insight){ card.classList.add('d-none'); return; }
  text.innerHTML = 'Kategori pengeluaran terbesar bulan ini: <b>'+escapeHtml(insight.nama)+'</b> ('+formatRupiah(insight.total)+', '+insight.persen+'% dari total pengeluaran bulan ini)';
  card.classList.remove('d-none');
}

/* ================= BOTTOM NAV / MENU SHEET (mobile) ================= */
let _offcanvasMenuInstance = null;
function getOffcanvasMenu(){
  if (!_offcanvasMenuInstance) _offcanvasMenuInstance = bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('offcanvasMenu'));
  return _offcanvasMenuInstance;
}
function openMenuSheet(){ getOffcanvasMenu().show(); }
function navigateFromSheet(page){ getOffcanvasMenu().hide(); navigateTo(page); }
function openQuickAddSheet(){
  Swal.fire({
    title: 'Tambah Transaksi',
    showDenyButton: true,
    showCancelButton: true,
    confirmButtonText: '<i class="bi bi-arrow-down-circle-fill"></i> Pemasukan',
    denyButtonText: '<i class="bi bi-arrow-up-circle-fill"></i> Pengeluaran',
    cancelButtonText: 'Batal',
    confirmButtonColor: '#10b981',
    denyButtonColor: '#e11d48'
  }).then(function(res){
    if (res.isConfirmed) openModalPemasukan();
    else if (res.isDenied) openModalPengeluaran();
  });
}
function updateBottomNavActive(page){
  document.querySelectorAll('.bottom-nav-item[data-page]').forEach(function(btn){
    btn.classList.toggle('active', btn.dataset.page === page);
  });
}

/* ================= BADGE NOTIFIKASI PENGINGAT (bottom nav) ================= */
function loadPengingatBadge(){
  google.script.run.withSuccessHandler(function(res){
    if(!res.success) return;
    const r = res.data.ringkasan;
    let mingguIniCount = 0;
    if (res.data.bulanList && res.data.bulanList[0]){
      const w = res.data.bulanList[0].minggu.find(function(mm){ return mm.isMingguIni; });
      if (w) mingguIniCount = w.items.length;
    }
    updateBottomNavBadge(r.jumlahTerlambat + mingguIniCount);
  }).withFailureHandler(function(){}).getPengingatJatuhTempo();
}
function updateBottomNavBadge(count){
  const el = document.getElementById('bottomNavBadgePengingat');
  if (!el) return;
  if (count > 0){ el.innerText = count > 99 ? '99+' : count; el.classList.remove('d-none'); }
  else { el.classList.add('d-none'); }
}

/* ================= KATEGORI (ikon & warna custom) ================= */
window._kategoriPemasukan = [];
window._kategoriPengeluaran = [];
function loadKategoriGlobal(cb){
  google.script.run.withSuccessHandler(function(res){
    if (res.success){
      window._kategoriPemasukan = res.data.filter(function(k){ return k.tipe==='Pemasukan'; });
      window._kategoriPengeluaran = res.data.filter(function(k){ return k.tipe==='Pengeluaran'; });
      fillKategoriDatalists();
    }
    if (cb) cb();
  }).withFailureHandler(function(){ if (cb) cb(); }).getKategori();
}
function fillKategoriDatalists(){
  const elP = document.getElementById('datalistKategoriPemasukan');
  const elE = document.getElementById('datalistKategoriPengeluaran');
  if (elP) elP.innerHTML = window._kategoriPemasukan.map(function(k){ return '<option value="'+escapeHtml(k.nama)+'">'; }).join('');
  if (elE) elE.innerHTML = window._kategoriPengeluaran.map(function(k){ return '<option value="'+escapeHtml(k.nama)+'">'; }).join('');
}
function getKategoriMeta(nama, tipe){
  const list = tipe==='Pemasukan' ? window._kategoriPemasukan : window._kategoriPengeluaran;
  const found = list.find(function(k){ return String(k.nama).toLowerCase() === String(nama||'').toLowerCase(); });
  return found || { ikon:'bi-tag-fill', warna:'#6b7280' };
}
function kategoriBadgeHtml(nama, tipe){
  const meta = getKategoriMeta(nama, tipe);
  return '<span class="kategori-dot" style="background:'+meta.warna+';" title="'+escapeHtml(nama)+'"><i class="bi '+meta.ikon+'"></i></span> '+escapeHtml(nama);
}
function openModalKategori(tipe){
  document.getElementById('kategoriTipeAktif').value = tipe;
  document.getElementById('modalKategoriTitle').innerText = 'Kelola Kategori ' + tipe;
  renderKategoriList(tipe);
  updateKategoriIconPreview();
  showBootstrapModal('modalKategori');
}
function renderKategoriList(tipe){
  const list = tipe==='Pemasukan' ? window._kategoriPemasukan : window._kategoriPengeluaran;
  const el = document.getElementById('kategoriListContainer');
  if (!list.length){ el.innerHTML = '<p class="text-muted small mb-0">Belum ada kategori</p>'; return; }
  el.innerHTML = list.map(function(k){
    return '<div class="d-flex align-items-center justify-content-between py-1 border-bottom">'+
      '<div class="d-flex align-items-center gap-2"><span class="kategori-dot" style="background:'+k.warna+';"><i class="bi '+k.ikon+'"></i></span>'+escapeHtml(k.nama)+'</div>'+
      '<button class="btn btn-sm btn-outline-danger" onclick="hapusKategori(\''+k.id+'\',\''+tipe+'\')"><i class="bi bi-trash3"></i></button>'+
    '</div>';
  }).join('');
}
function updateKategoriIconPreview(){
  const iconSel = document.getElementById('kategoriIkonBaru');
  const colorInput = document.getElementById('kategoriWarnaBaru');
  const previewBox = document.getElementById('kategoriIconPreview');
  const previewIcon = document.getElementById('kategoriIconPreviewIcon');
  if (!iconSel || !colorInput || !previewBox || !previewIcon) return;
  previewBox.style.background = colorInput.value;
  previewIcon.className = 'bi ' + iconSel.value;
}
function submitKategoriBaru(e){
  e.preventDefault();
  const tipe = document.getElementById('kategoriTipeAktif').value;
  const data = { tipe:tipe, nama:document.getElementById('kategoriNamaBaru').value.trim(), ikon:document.getElementById('kategoriIkonBaru').value, warna:document.getElementById('kategoriWarnaBaru').value };
  if (!data.nama){ toast('warning','Isi nama kategori'); return; }
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    showLoading(false); if (!res.success){ toast('error', res.message); return; }
    toast('success', res.message);
    document.getElementById('formKategoriBaru').reset();
    document.getElementById('kategoriWarnaBaru').value = '#6C5CE7';
    updateKategoriIconPreview();
    loadKategoriGlobal(function(){ renderKategoriList(tipe); });
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).saveKategori(data);
}
function hapusKategori(id, tipe){
  confirmDelete(function(){
    showLoading(true);
    google.script.run.withSuccessHandler(function(res){
      showLoading(false); if (!res.success){ toast('error', res.message); return; }
      toast('success', res.message);
      loadKategoriGlobal(function(){ renderKategoriList(tipe); });
    }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).deleteKategori(id);
  });
}

/* ================= GROUPING HELPER per bulan (dipakai di Pengingat & Laporan) ================= */
function groupByMonth(data){
  const map = {}; const order = [];
  data.forEach(function(r){
    const d = new Date(r.tanggal);
    if (isNaN(d)) return;
    const key = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    if (!map[key]){ map[key] = { label: namaBulanFull[d.getMonth()]+' '+d.getFullYear(), items:[], total:0 }; order.push(key); }
    map[key].items.push(r);
    map[key].total += Number(r.nominal||0);
  });
  return order.map(function(k){ return map[k]; });
}
function buildMonthGroupsHtml(groups, rowRenderer, idPrefix){
  return groups.map(function(g, idx){
    const rowId = idPrefix+'-'+idx;
    const isOpen = idx===0;
    const rows = g.items.map(rowRenderer).join('');
    return '<div class="ledger-month">'+
      '<div class="ledger-week-row" onclick="toggleLedgerRow(\''+rowId+'\')" id="head-'+rowId+'"'+(isOpen?' data-open="1"':'')+'>'+
        '<div class="ledger-week-left">'+
          '<div class="ledger-week-badge"><i class="bi bi-calendar3"></i></div>'+
          '<div><div class="ledger-week-date">'+g.label+'</div><div class="ledger-week-count">'+g.items.length+' transaksi</div></div>'+
        '</div>'+
        '<div class="ledger-week-right">'+
          '<div class="ledger-week-total">'+formatRupiah(g.total)+'</div>'+
          '<i class="bi bi-chevron-down ledger-week-chevron"></i>'+
        '</div>'+
      '</div>'+
      '<div class="ledger-week-detail'+(isOpen?' is-open':'')+'" id="'+rowId+'">'+
        '<div class="table-responsive"><table class="table align-middle mb-0"><tbody>'+rows+'</tbody></table></div>'+
      '</div>'+
    '</div>';
  }).join('');
}
function toggleLedgerRow(rowId){
  const detail = document.getElementById(rowId);
  const head = document.getElementById('head-' + rowId);
  if (!detail || !head) return;
  const isOpen = detail.classList.contains('is-open');
  if (isOpen){
    detail.classList.remove('is-open');
    head.classList.remove('is-open');
  } else {
    detail.classList.add('is-open');
    head.classList.add('is-open');
  }
}

/* ================= FEED TRANSAKSI GENERIK (dipakai di Pemasukan, Pengeluaran, Riwayat) ================= */
function renderTransactionFeed(container, data, itemRenderer, emptyIcon, emptyTitle, emptySub){
  if (!data.length){
    container.innerHTML = '<div class="glass-card"><div class="empty-state-box"><i class="bi '+emptyIcon+'"></i><div class="empty-title">'+emptyTitle+'</div><div class="empty-sub">'+emptySub+'</div></div></div>';
    return;
  }
  let html = '';
  let lastDateKey = null;
  data.forEach(function(r){
    const d = new Date(r.tanggal);
    const dateKey = isNaN(d) ? r.tanggal : d.toISOString().slice(0,10);
    if (dateKey !== lastDateKey){
      html += '<div class="riwayat-feed-date-header">'+formatTanggal(r.tanggal)+'</div>';
      lastDateKey = dateKey;
    }
    html += itemRenderer(r);
  });
  container.innerHTML = html;
}
function pemasukanFeedItemHtml(r){
  const meta = getKategoriMeta(r.kategori, 'Pemasukan');
  return '<div class="riwayat-feed-item">'+
    '<div class="riwayat-feed-icon" style="background:'+meta.warna+'22; color:'+meta.warna+';"><i class="bi '+meta.ikon+'"></i></div>'+
    '<div class="riwayat-feed-info">'+
      '<div class="nama">'+escapeHtml(r.kategori)+'</div>'+
      '<div class="sub">'+(r.keterangan ? escapeHtml(r.keterangan) : 'Pemasukan')+'</div>'+
    '</div>'+
    '<div class="riwayat-feed-amount">'+
      '<div class="nominal plus">+ '+formatRupiah(r.nominal)+'</div>'+
      '<div class="riwayat-feed-actions">'+
        '<button class="btn btn-sm btn-outline-primary" onclick="editPemasukan(\''+r.id+'\')"><i class="bi bi-pencil-square"></i></button>'+
        '<button class="btn btn-sm btn-outline-danger" onclick="hapusPemasukan(\''+r.id+'\')"><i class="bi bi-trash3"></i></button>'+
      '</div>'+
    '</div>'+
  '</div>';
}
function pengeluaranFeedItemHtml(r){
  const meta = getKategoriMeta(r.kategori, 'Pengeluaran');
  return '<div class="riwayat-feed-item">'+
    '<div class="riwayat-feed-icon" style="background:'+meta.warna+'22; color:'+meta.warna+';"><i class="bi '+meta.ikon+'"></i></div>'+
    '<div class="riwayat-feed-info">'+
      '<div class="nama">'+escapeHtml(r.kategori)+'</div>'+
      '<div class="sub">'+(r.keterangan ? escapeHtml(r.keterangan) : 'Pengeluaran')+'</div>'+
    '</div>'+
    '<div class="riwayat-feed-amount">'+
      '<div class="nominal minus">- '+formatRupiah(r.nominal)+'</div>'+
      '<div class="riwayat-feed-actions">'+
        '<button class="btn btn-sm btn-outline-primary" onclick="editPengeluaran(\''+r.id+'\')"><i class="bi bi-pencil-square"></i></button>'+
        '<button class="btn btn-sm btn-outline-danger" onclick="hapusPengeluaran(\''+r.id+'\')"><i class="bi bi-trash3"></i></button>'+
      '</div>'+
    '</div>'+
  '</div>';
}
function riwayatFeedIconHtml(r){
  if (r.jenis === 'Pemasukan' || r.jenis === 'Pengeluaran'){
    const meta = getKategoriMeta(r.kategori, r.jenis);
    return '<div class="riwayat-feed-icon" style="background:'+meta.warna+'22; color:'+meta.warna+';"><i class="bi '+meta.ikon+'"></i></div>';
  }
  return '<div class="riwayat-feed-icon debt"><i class="bi bi-credit-card-2-front-fill"></i></div>';
}
function riwayatFeedItemHtml(r){
  const isPlus = r.jenis === 'Pemasukan';
  const sign = isPlus ? '+' : '-';
  const actions = (r.jenis === 'Pemasukan' || r.jenis === 'Pengeluaran')
    ? '<div class="riwayat-feed-actions">'+
        '<button class="btn btn-sm btn-outline-primary" onclick="'+(r.jenis==='Pemasukan'?'editPemasukan':'editPengeluaran')+'(\''+r.id+'\')"><i class="bi bi-pencil-square"></i></button>'+
        '<button class="btn btn-sm btn-outline-danger" onclick="'+(r.jenis==='Pemasukan'?'hapusPemasukan':'hapusPengeluaran')+'(\''+r.id+'\')"><i class="bi bi-trash3"></i></button>'+
      '</div>'
    : '';
  return '<div class="riwayat-feed-item">'+
    riwayatFeedIconHtml(r)+
    '<div class="riwayat-feed-info">'+
      '<div class="nama">'+escapeHtml(r.kategori||jenisLabel(r.jenis))+'</div>'+
      '<div class="sub">'+jenisLabel(r.jenis)+(r.keterangan ? ' &middot; '+escapeHtml(r.keterangan) : '')+'</div>'+
    '</div>'+
    '<div class="riwayat-feed-amount">'+
      '<div class="nominal '+(isPlus?'plus':'minus')+'">'+sign+' '+formatRupiah(r.nominal)+'</div>'+
      actions+
    '</div>'+
  '</div>';
}

/* ================= NAVIGASI ================= */
const pages = ['dashboard','pemasukan','pengeluaran','hutang','pengingat','kalender','riwayat','laporan','proyeksi'];
const pageTitles = {dashboard:'Dashboard', pemasukan:'Pemasukan', pengeluaran:'Pengeluaran', hutang:'Pinjaman', pengingat:'Pengingat Jatuh Tempo', kalender:'Kalender', riwayat:'Riwayat Transaksi', laporan:'Laporan', proyeksi:'Proyeksi Saldo'};
let dtHutang;
let chartPie, chartSaldo, chartProyeksi;

function navigateTo(page){
  forceCleanupOverlays();
  pages.forEach(p => document.getElementById('page-'+p).classList.add('d-none'));
  document.getElementById('page-'+page).classList.remove('d-none');
  document.getElementById('pageTitle').innerText = pageTitles[page];
  document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
  const navEl = document.querySelector('.nav-link[data-page="'+page+'"]');
  if (navEl) navEl.classList.add('active');
  updateBottomNavActive(page);

  if (page !== 'dashboard'){
    isPrivacyHidden = true;
    if (window._dashboardRawValues) applyPrivacyToDashboard();
  }

  loadPage(page);
}
/* ================= NAVIGASI INSTAN DARI CACHE LOKAL (Prinsip 1 + 3) =================
 * Kunjungan PERTAMA ke suatu menu tetap fetch normal (dengan spinner).
 * Kunjungan BERIKUTNYA: data yang sudah pernah dimuat langsung dirender dari
 * window._dataXxx (0ms, tanpa spinner), lalu disinkronkan ulang diam-diam di
 * background supaya tetap akurat kalau ada perubahan dari perangkat/tab lain. */
function loadPage(page){
  if (page==='dashboard'){
    if (window._dashboardData){ renderDashboardFromCache(); refreshDashboardSilently(); }
    else loadDashboard();
  }
  if (page==='pemasukan'){
    if (window._dataPemasukan){ fillTablePemasukan(window._dataPemasukan); renderHeroPemasukan(); refreshPemasukanSilently(); }
    else loadPemasukan();
  }
  if (page==='pengeluaran'){
    if (window._dataPengeluaran){ populateFilterKategori(window._dataPengeluaran); fillTablePengeluaran(window._dataPengeluaran); renderHeroPengeluaran(); refreshPengeluaranSilently(); }
    else loadPengeluaran();
  }
  if (page==='hutang'){
    if (window._dataHutang){ fillTableHutang(window._dataHutang); renderHutangSummary(window._dataHutang); renderHutangCards(window._dataHutang); renderHeroPinjaman(); refreshHutangSilently(); }
    else loadHutang();
  }
  if (page==='pengingat') loadPengingat();
  if (page==='kalender') loadKalender();
  if (page==='riwayat') loadRiwayat();
  if (page==='laporan'){ loadRekapBulanan(); loadBackupList(); }
  if (page==='proyeksi') loadProyeksi();
}
function renderDashboardFromCache(){
  renderGreeting();
  isPrivacyHidden = true;
  updatePrivacyIcon();
  const d = window._dashboardData;
  renderSummary(d);
  renderAllCharts(d);
  renderRecent(d.recentTransactions);
  renderAlertJatuhTempo(d.jumlahJatuhTempoBulanIni, d.jatuhTempoPrioritas, d.jatuhTempoLainnya, d.jatuhTempoList, d.jatuhTempoSisaTakTampil);
  renderMoM(d);
  renderPersentaseBulanIni(d);
  renderKategoriBreakdownBulanIni(window._dataPemasukan || [], window._dataPengeluaran || []);
  renderInsightCard(d.insightTopKategori);
  if (!document.getElementById('btnPrivacyToggle').dataset.bound){
    document.getElementById('btnPrivacyToggle').addEventListener('click', togglePrivacy);
    document.getElementById('btnPrivacyToggle').dataset.bound = '1';
  }
}
function refreshPemasukanSilently(){
  google.script.run.withSuccessHandler(function(res){
    if (!res.success) return;
    window._dataPemasukan = res.data; fillTablePemasukan(res.data); renderHeroPemasukan();
  }).withFailureHandler(function(){}).getPemasukan();
}
function refreshPengeluaranSilently(){
  google.script.run.withSuccessHandler(function(res){
    if (!res.success) return;
    window._dataPengeluaran = res.data; populateFilterKategori(res.data); fillTablePengeluaran(res.data); renderHeroPengeluaran();
  }).withFailureHandler(function(){}).getPengeluaran();
}
function refreshHutangSilently(){
  google.script.run.withSuccessHandler(function(res){
    if (!res.success) return;
    window._dataHutang = res.data; fillTableHutang(res.data); renderHutangSummary(res.data); renderHutangCards(res.data); renderHeroPinjaman();
  }).withFailureHandler(function(){}).getHutangWithStatus();
}

document.addEventListener('DOMContentLoaded', function(){
  checkPinSession();
  document.getElementById('pinInput').addEventListener('keypress', function(e){ if(e.key==='Enter') submitPinLogin(); });

  const btnForceClose = document.getElementById('btnForceCloseLoading');
  if (btnForceClose) btnForceClose.addEventListener('click', function(){ location.reload(); });

  document.getElementById('tahunFooter').innerText = new Date().getFullYear();
  document.querySelectorAll('.nav-link').forEach(function(a){
    a.addEventListener('click', function(e){ e.preventDefault(); navigateTo(this.dataset.page); });
  });
  document.querySelectorAll('.bottom-nav-item[data-page]').forEach(function(btn){
    btn.addEventListener('click', function(){ navigateTo(this.dataset.page); });
  });
  document.getElementById('btnDarkMode').addEventListener('click', toggleDarkMode);
  initDarkModePreference();
  updateDarkIcon();
  document.getElementById('todayDate').innerText = new Date().toLocaleDateString('id-ID', {weekday:'long', year:'numeric', month:'long', day:'numeric'});
  document.getElementById('filterKategoriPengeluaran').addEventListener('change', function(){ fillTablePengeluaran(window._dataPengeluaran||[]); });
  /* Sesi habis / token dicabut → kembali ke layar PIN */
  document.addEventListener('bandhits:auth', function(){
    document.getElementById('pinOverlay').style.display = 'flex';
    tampilkanPinError_('Sesi berakhir. Masukkan PIN kembali.');
    document.getElementById('pinInput').focus();
  });
  /* Logo (publik) diambil dari server; sebelum itu pakai logo bawaan lokal */
  if (window.BandhitsApi) BandhitsApi.info().then(function(j){
    if (j && j.logoUrl) setLogoSumber_(j.logoUrl);
  }).catch(function(){});
});
function setLogoSumber_(url){
  document.querySelectorAll('.brand-logo, #pinOverlay img').forEach(function(img){ img.src = url; });
  ['link[rel="icon"]','link[rel="apple-touch-icon"]'].forEach(function(q){
    const el = document.querySelector(q); if (el) el.href = url;
  });
}

/* Dark mode otomatis 18:00-06:00, kecuali user sudah pernah toggle manual. */
function initDarkModePreference(){
  const manual = localStorage.getItem('bandhits-dark-manual');
  if (manual === '1'){
    if (localStorage.getItem('bandhits-dark') === '1') document.body.classList.add('dark');
  } else {
    const h = new Date().getHours();
    if (h >= 18 || h < 6) document.body.classList.add('dark');
  }
}
function toggleDarkMode(){
  document.body.classList.toggle('dark');
  localStorage.setItem('bandhits-dark', document.body.classList.contains('dark') ? '1':'0');
  localStorage.setItem('bandhits-dark-manual', '1');
  updateDarkIcon();
  if (window._dashboardData) renderAllCharts(window._dashboardData);
}
function updateDarkIcon(){
  document.getElementById('btnDarkMode').innerHTML = document.body.classList.contains('dark') ? '<i class="bi bi-sun-fill"></i>' : '<i class="bi bi-moon-stars-fill"></i>';
}

/* ================= DASHBOARD ================= */
function loadDashboard(){
  showLoading(true);
  renderGreeting();
  isPrivacyHidden = true;
  updatePrivacyIcon();
  fetchAndRenderDashboard(function(){
    showLoading(false);
  }, function(err){
    showLoading(false);
    toast('error', (err && err.message) || 'Gagal memuat dashboard');
  });
}
/* Refresh data & tampilan Dashboard di belakang layar (tanpa spinner, tanpa reset privacy),
   dipanggil otomatis setiap kali ada transaksi baru/diubah/dihapus (Pemasukan, Pengeluaran, Pinjaman),
   supaya saldo & data Dashboard selalu ter-update walau user sedang berada di halaman lain. */
function refreshDashboardSilently(){
  fetchAndRenderDashboard(function(){}, function(){});
}
function fetchAndRenderDashboard(onDone, onError){
  Promise.all([
    ensureChartJs(),
    new Promise(function(resolve, reject){
      google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).getDashboardData();
    }),
    new Promise(function(resolve){
      google.script.run.withSuccessHandler(resolve).withFailureHandler(function(){ resolve({success:false, data:[]}); }).getPemasukan();
    }),
    new Promise(function(resolve){
      google.script.run.withSuccessHandler(resolve).withFailureHandler(function(){ resolve({success:false, data:[]}); }).getPengeluaran();
    })
  ]).then(function(results){
    const res = results[1];
    const resPemasukan = results[2];
    const resPengeluaran = results[3];
    if(!res.success){ onDone(); toast('error', res.message); return; }
    window._dashboardData = res.data;
    // Simpan juga data Pemasukan/Pengeluaran yang sudah diambil, supaya saat pindah ke
    // halaman Pemasukan/Pengeluaran nanti tidak perlu fetch ulang dari nol (Prinsip 1+4).
    if (resPemasukan.success) window._dataPemasukan = resPemasukan.data;
    if (resPengeluaran.success) window._dataPengeluaran = resPengeluaran.data;
    renderSummary(res.data);
    renderAllCharts(res.data);
    renderRecent(res.data.recentTransactions);
    renderAlertJatuhTempo(res.data.jumlahJatuhTempoBulanIni, res.data.jatuhTempoPrioritas, res.data.jatuhTempoLainnya, res.data.jatuhTempoList, res.data.jatuhTempoSisaTakTampil);
    renderMoM(res.data);
    renderPersentaseBulanIni(res.data);
    renderKategoriBreakdownBulanIni(resPemasukan.success ? resPemasukan.data : [], resPengeluaran.success ? resPengeluaran.data : []);
    renderInsightCard(res.data.insightTopKategori);
    if (!document.getElementById('btnPrivacyToggle').dataset.bound){
      document.getElementById('btnPrivacyToggle').addEventListener('click', togglePrivacy);
      document.getElementById('btnPrivacyToggle').dataset.bound = '1';
    }
    onDone();
  }).catch(function(err){ onError(err); });
}
function renderSummary(d){
  window._dashboardRawValues = {
    saldoKas: d.saldoKas,
    totalUang: d.totalUang,
    totalPemasukanBulanIni: d.totalPemasukanBulanIni,
    totalPengeluaranBulanIni: d.totalPengeluaranBulanIni,
    totalHutang: d.totalHutang
  };
  if (isPrivacyHidden){
    applyPrivacyToDashboard();
  } else {
    countUpValue(document.getElementById('sumSaldoKas'), d.saldoKas);
    countUpValue(document.getElementById('sumUangTotal'), d.totalUang);
    countUpValue(document.getElementById('sumPemasukan'), d.totalPemasukanBulanIni);
    countUpValue(document.getElementById('sumPengeluaran'), d.totalPengeluaranBulanIni);
    countUpValue(document.getElementById('sumHutang'), d.totalHutang);
    const topbarEl = document.getElementById('topbarSaldoKas');
    if (topbarEl) countUpValue(topbarEl, d.saldoKas, 700);
  }
}
function renderMoM(d){
  const pEl = document.getElementById('momPemasukanBadge');
  const eEl = document.getElementById('momPengeluaranBadge');
  const lEl = document.getElementById('momLabelText');
  if (!pEl || !eEl) return;
  if (lEl) lEl.innerText = d.momLabel || 'Belum cukup data';
  function badge(percent){
    if (percent===null || percent===undefined) return '<span class="text-muted">-</span>';
    const up = percent >= 0;
    const cls = up ? 'text-success' : 'text-danger';
    const icon = up ? 'bi-arrow-up-short' : 'bi-arrow-down-short';
    return '<span class="'+cls+'"><i class="bi '+icon+'"></i> '+Math.abs(percent)+'%</span>';
  }
  pEl.innerHTML = badge(d.momPemasukanPercent);
  eEl.innerHTML = badge(d.momPengeluaranPercent);
}
function renderAlertJatuhTempo(jumlah, prioritas, lainnya, list, sisaTakTampil){
  const el = document.getElementById('alertJatuhTempo');
  if (!el) return;
  if (jumlah > 0 && prioritas){
    el.classList.remove('d-none');
    const label = prioritas.status === 'Terlambat' ? 'Terlambat' : 'Segera';
    let teks = label + ': cicilan ' + escapeHtml(prioritas.namaPihak || '-') + ' ' + formatRupiah(prioritas.nominal) + ' jatuh tempo ' + formatTanggal(prioritas.tanggal);
    if (lainnya > 0) teks += ' (+' + lainnya + ' lainnya)';
    document.getElementById('teksJatuhTempo').innerText = teks;

    window._jatuhTempoList = list || [];
    window._jatuhTempoSisaTakTampil = sisaTakTampil || 0;
    renderJatuhTempoDetailList();
    // Tutup panel setiap kali data direfresh, supaya tidak nyangkut dalam keadaan terbuka dengan data basi
    const panel = document.getElementById('jatuhTempoDetailPanel');
    const icon = document.getElementById('iconJatuhTempoToggle');
    if (panel) panel.classList.add('d-none');
    if (icon) { icon.classList.remove('bi-chevron-up'); icon.classList.add('bi-chevron-down'); }
  } else {
    el.classList.add('d-none');
    const panel = document.getElementById('jatuhTempoDetailPanel');
    if (panel) panel.classList.add('d-none');
  }
}
function renderJatuhTempoDetailList(){
  const container = document.getElementById('jatuhTempoDetailList');
  if (!container) return;
  const list = window._jatuhTempoList || [];
  if (!list.length){ container.innerHTML = ''; return; }
  let html = '';
  list.forEach(function(h){
    const badge = h.status === 'Terlambat'
      ? '<span class="badge bg-danger me-2">Terlambat</span>'
      : '<span class="badge bg-warning text-dark me-2">Segera</span>';
    html += '<div class="d-flex justify-content-between align-items-center py-1">'
      + '<div>' + badge + escapeHtml(h.namaPihak || '-') + '</div>'
      + '<div class="text-end"><div class="fw-semibold">' + formatRupiah(h.nominal) + '</div><div class="small text-muted">' + formatTanggal(h.tanggal) + '</div></div>'
      + '</div>';
  });
  const sisa = window._jatuhTempoSisaTakTampil || 0;
  if (sisa > 0) html += '<div class="small text-muted mt-1">+' + sisa + ' lainnya, lihat selengkapnya di Pengingat</div>';
  container.innerHTML = html;
}
function toggleJatuhTempoDetail(){
  const panel = document.getElementById('jatuhTempoDetailPanel');
  const icon = document.getElementById('iconJatuhTempoToggle');
  if (!panel) return;
  const sedangTertutup = panel.classList.contains('d-none');
  if (sedangTertutup){
    panel.classList.remove('d-none');
    if (icon){ icon.classList.remove('bi-chevron-down'); icon.classList.add('bi-chevron-up'); }
  } else {
    panel.classList.add('d-none');
    if (icon){ icon.classList.remove('bi-chevron-up'); icon.classList.add('bi-chevron-down'); }
  }
}
function renderRecent(list){
  const tbody = document.getElementById('recentTransBody'); tbody.innerHTML = '';
  if(!list.length){ tbody.innerHTML = '<tr><td colspan="4" class="p-0"><div class="empty-state-box"><i class="bi bi-clock-history"></i><div class="empty-title">Belum ada transaksi</div></div></td></tr>'; return; }
  list.forEach(function(t){
    const badgeClass = t.jenis==='Pemasukan' ? 'badge-income' : (t.jenis==='Pembayaran Cicilan' ? 'badge-debt' : 'badge-expense');
    tbody.innerHTML += '<tr><td>'+formatTanggal(t.tanggal)+'</td><td><span class="badge-jenis '+badgeClass+'">'+t.jenis+'</span></td><td>'+escapeHtml(t.keterangan||'-')+'</td><td class="text-end fw-semibold">'+formatRupiah(t.nominal)+'</td></tr>';
  });
}
function renderAllCharts(d){
  const isDark = document.body.classList.contains('dark');
  Chart.defaults.color = isDark ? '#e5e7eb' : '#1f2937';
  Chart.defaults.font.family = 'Poppins';

  if (chartPie) chartPie.destroy();
  const pieData = [d.totalPemasukanBulanIni, d.totalPengeluaranBulanIni];
  chartPie = new Chart(document.getElementById('chartPie'), {
    type:'pie',
    data:{ labels:['Pemasukan','Pengeluaran'], datasets:[{ data:pieData, backgroundColor:['#10b981','#e11d48'], borderWidth:0 }] },
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{
          position:'bottom',
          labels:{
            generateLabels:function(chart){
              const ds = chart.data.datasets[0];
              const total = ds.data.reduce(function(a,b){ return a+b; }, 0);
              return chart.data.labels.map(function(label, i){
                const value = ds.data[i];
                const percent = total>0 ? ((value/total)*100).toFixed(1) : 0;
                return { text: label+' ('+percent+'%)', fillStyle: ds.backgroundColor[i], strokeStyle: ds.backgroundColor[i], index: i, hidden:false };
              });
            }
          }
        },
        tooltip:{
          callbacks:{
            label:function(context){
              const value = context.parsed;
              const total = context.dataset.data.reduce(function(a,b){ return a+b; }, 0);
              const percent = total>0 ? ((value/total)*100).toFixed(1) : 0;
              return context.label+': '+formatRupiah(value)+' ('+percent+'%)';
            }
          }
        }
      }
    }
  });

  if (chartSaldo) chartSaldo.destroy();
  const dailyLabels = (d.dailyTrend||[]).map(p=>p.tanggalLabel);
  chartSaldo = new Chart(document.getElementById('chartSaldo'), {
    type:'line', data:{ labels:dailyLabels, datasets:[{ label:'Saldo Kas', data:(d.dailyTrend||[]).map(p=>p.saldoKasKumulatif), borderColor:'#6C5CE7', backgroundColor:'rgba(108,92,231,0.1)', fill:true, tension:0.3, pointRadius:0 }]},
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{ ticks:{ maxTicksLimit:8 } } } }
  });

  renderProyeksi4BulanTable(d.proyeksi4Bulan || []);
}
function renderProyeksi4BulanTable(list){
  const tbody = document.getElementById('proyeksi4BulanBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  if (!list.length){ tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Belum ada data</td></tr>'; return; }
  list.forEach(function(p){
    tbody.innerHTML += '<tr><td class="fw-semibold">'+p.bulanLabel+'</td>'+
      '<td class="text-end text-success">'+formatRupiah(p.pemasukanEstimasi)+'</td>'+
      '<td class="text-end text-danger">'+formatRupiah(p.pengeluaranEstimasi)+'</td>'+
      '<td class="text-end text-warning">'+formatRupiah(p.cicilanPinjaman)+'</td>'+
      '<td class="text-end fw-bold '+(p.saldoAkhir>=0?'text-success':'text-danger')+'">'+formatRupiah(p.saldoAkhir)+'</td></tr>';
  });
}

/* ================= PEMASUKAN (feed per tanggal + search) ================= */
function loadPemasukan(){
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    showLoading(false); if(!res.success){ toast('error', res.message); return; }
    window._dataPemasukan = res.data; fillTablePemasukan(res.data);
    renderHeroPemasukan();
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).getPemasukan();
}
function fillTablePemasukan(data){
  const searchEl = document.getElementById('pemasukanSearchInput');
  const term = searchEl ? searchEl.value.trim().toLowerCase() : '';
  let filtered = data.slice().reverse();
  if (term){
    filtered = filtered.filter(function(x){
      return String(x.kategori||'').toLowerCase().indexOf(term) !== -1 ||
             String(x.keterangan||'').toLowerCase().indexOf(term) !== -1;
    });
  }
  const container = document.getElementById('pemasukanGroupsContainer');
  renderTransactionFeed(container, filtered, pemasukanFeedItemHtml, 'bi-inbox', 'Belum ada data pemasukan', 'Klik "Tambah Pemasukan" untuk mulai mencatat');
}
function openModalPemasukan(id){
  document.getElementById('formPemasukan').reset();
  document.getElementById('pemasukanId').value = '';
  document.getElementById('pemasukanTanggal').value = todayStr();
  document.getElementById('modalPemasukanTitle').innerText = id ? 'Edit Pemasukan' : 'Tambah Pemasukan';
  if (id){
    const item = window._dataPemasukan.find(x=>x.id===id);
    document.getElementById('pemasukanId').value = item.id;
    document.getElementById('pemasukanTanggal').value = item.tanggal;
    document.getElementById('pemasukanKategori').value = item.kategori;
    document.getElementById('pemasukanKeterangan').value = item.keterangan;
    document.getElementById('pemasukanNominal').value = Number(item.nominal).toLocaleString('id-ID');
  }
  showBootstrapModal('modalPemasukan');
}
function editPemasukan(id){ openModalPemasukan(id); }
/* ================= SUBMIT PEMASUKAN — OPTIMISTIC UI (Prinsip 2) =================
 * UI (list, hero, ringkasan Dashboard) di-update INSTAN dari data lokal begitu form disubmit,
 * modal langsung tertutup tanpa spinner. Sinkronisasi ke server terjadi di background;
 * kalau server menolak/gagal, perubahan lokal di-rollback otomatis + toast error. */
function submitPemasukan(e){
  e.preventDefault();
  const id = document.getElementById('pemasukanId').value;
  const data = { id:id, tanggal:document.getElementById('pemasukanTanggal').value,
    kategori:document.getElementById('pemasukanKategori').value.trim(),
    keterangan:document.getElementById('pemasukanKeterangan').value.trim(),
    nominal:unformatRupiah(document.getElementById('pemasukanNominal').value) };
  if (!data.tanggal || !data.kategori || !data.nominal){ toast('warning','Lengkapi semua field wajib'); return; }

  bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPemasukan')).hide();
  window._dataPemasukan = window._dataPemasukan || [];

  if (id){
    // EDIT: update instan, simpan salinan asli untuk rollback
    const idx = window._dataPemasukan.findIndex(function(x){ return x.id === id; });
    if (idx === -1){ toast('error', 'Data tidak ditemukan'); return; }
    const original = Object.assign({}, window._dataPemasukan[idx]);
    const delta = Number(data.nominal) - Number(original.nominal || 0);
    window._dataPemasukan[idx] = Object.assign({}, window._dataPemasukan[idx], data);
    fillTablePemasukan(window._dataPemasukan);
    renderHeroPemasukan();
    applyOptimisticDashboardDelta('Pemasukan', delta, original.tanggal, data.tanggal);
    toast('success', 'Data pemasukan berhasil diperbarui');

    google.script.run.withSuccessHandler(function(res){
      if (!res.success){
        window._dataPemasukan[idx] = original;
        fillTablePemasukan(window._dataPemasukan); renderHeroPemasukan();
        applyOptimisticDashboardDelta('Pemasukan', -delta, data.tanggal, original.tanggal);
        toast('error', (res.message || 'Gagal memperbarui') + ' — perubahan dibatalkan');
      }
      refreshDashboardSilently();
    }).withFailureHandler(function(err){
      window._dataPemasukan[idx] = original;
      fillTablePemasukan(window._dataPemasukan); renderHeroPemasukan();
      applyOptimisticDashboardDelta('Pemasukan', -delta, data.tanggal, original.tanggal);
      toast('error', ((err && err.message) || 'Gagal memperbarui') + ' — perubahan dibatalkan');
      refreshDashboardSilently();
    }).updatePemasukan(data);
  } else {
    // TAMBAH: sisipkan instan dengan ID sementara, ganti dengan ID asli setelah server sukses
    const tempId = 'TMP-' + Date.now();
    const optimisticRecord = Object.assign({ id: tempId }, data);
    window._dataPemasukan.push(optimisticRecord);
    fillTablePemasukan(window._dataPemasukan);
    renderHeroPemasukan();
    applyOptimisticDashboardDelta('Pemasukan', Number(data.nominal), null, data.tanggal);
    toast('success', 'Data pemasukan berhasil ditambahkan');

    google.script.run.withSuccessHandler(function(res){
      if (res.success){
        optimisticRecord.id = res.id;
      } else {
        window._dataPemasukan = window._dataPemasukan.filter(function(x){ return x.id !== tempId; });
        fillTablePemasukan(window._dataPemasukan); renderHeroPemasukan();
        applyOptimisticDashboardDelta('Pemasukan', -Number(data.nominal), data.tanggal, null);
        toast('error', (res.message || 'Gagal menyimpan') + ' — data dibatalkan');
      }
      refreshDashboardSilently();
    }).withFailureHandler(function(err){
      window._dataPemasukan = window._dataPemasukan.filter(function(x){ return x.id !== tempId; });
      fillTablePemasukan(window._dataPemasukan); renderHeroPemasukan();
      applyOptimisticDashboardDelta('Pemasukan', -Number(data.nominal), data.tanggal, null);
      toast('error', ((err && err.message) || 'Gagal menyimpan') + ' — data dibatalkan');
      refreshDashboardSilently();
    }).savePemasukan(data);
  }
}
function hapusPemasukan(id){
  confirmDelete(function(){
    const idx = window._dataPemasukan.findIndex(function(x){ return x.id === id; });
    if (idx === -1) return;
    const removed = window._dataPemasukan[idx];

    // Hapus instan dari UI
    window._dataPemasukan.splice(idx, 1);
    fillTablePemasukan(window._dataPemasukan);
    renderHeroPemasukan();
    applyOptimisticDashboardDelta('Pemasukan', -Number(removed.nominal || 0), removed.tanggal, null);
    toast('success', 'Data pemasukan berhasil dihapus');

    google.script.run.withSuccessHandler(function(res){
      if (!res.success){
        window._dataPemasukan.splice(idx, 0, removed);
        fillTablePemasukan(window._dataPemasukan); renderHeroPemasukan();
        applyOptimisticDashboardDelta('Pemasukan', Number(removed.nominal || 0), null, removed.tanggal);
        toast('error', (res.message || 'Gagal menghapus') + ' — data dikembalikan');
      }
      refreshDashboardSilently();
    }).withFailureHandler(function(err){
      window._dataPemasukan.splice(idx, 0, removed);
      fillTablePemasukan(window._dataPemasukan); renderHeroPemasukan();
      applyOptimisticDashboardDelta('Pemasukan', Number(removed.nominal || 0), null, removed.tanggal);
      toast('error', ((err && err.message) || 'Gagal menghapus') + ' — data dikembalikan');
      refreshDashboardSilently();
    }).deletePemasukan(id);
  });
}

/* ================= PENGELUARAN (feed per tanggal + kategori + search) ================= */
function loadPengeluaran(){
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    showLoading(false); if(!res.success){ toast('error', res.message); return; }
    window._dataPengeluaran = res.data; populateFilterKategori(res.data); fillTablePengeluaran(res.data);
    renderHeroPengeluaran();
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).getPengeluaran();
}
function populateFilterKategori(data){
  const sel = document.getElementById('filterKategoriPengeluaran'); const existing = sel.value;
  const cats = [...new Set(data.map(x=>x.kategori))];
  sel.innerHTML = '<option value="">Semua Kategori</option>' + cats.map(c=>'<option value="'+c+'">'+c+'</option>').join('');
  sel.value = existing;
}
function fillTablePengeluaran(data){
  const filterVal = document.getElementById('filterKategoriPengeluaran').value;
  const searchEl = document.getElementById('pengeluaranSearchInput');
  const term = searchEl ? searchEl.value.trim().toLowerCase() : '';
  let filtered = data.slice().reverse();
  if (filterVal) filtered = filtered.filter(x=>x.kategori===filterVal);
  if (term){
    filtered = filtered.filter(function(x){
      return String(x.kategori||'').toLowerCase().indexOf(term) !== -1 ||
             String(x.keterangan||'').toLowerCase().indexOf(term) !== -1;
    });
  }
  const container = document.getElementById('pengeluaranGroupsContainer');
  renderTransactionFeed(container, filtered, pengeluaranFeedItemHtml, 'bi-inbox', 'Belum ada data pengeluaran', 'Klik "Tambah Pengeluaran" untuk mulai mencatat');
}
function openModalPengeluaran(id){
  document.getElementById('formPengeluaran').reset();
  document.getElementById('pengeluaranId').value = '';
  document.getElementById('pengeluaranTanggal').value = todayStr();
  document.getElementById('modalPengeluaranTitle').innerText = id ? 'Edit Pengeluaran' : 'Tambah Pengeluaran';
  if (id){
    const item = window._dataPengeluaran.find(x=>x.id===id);
    document.getElementById('pengeluaranId').value = item.id;
    document.getElementById('pengeluaranTanggal').value = item.tanggal;
    document.getElementById('pengeluaranKategori').value = item.kategori;
    document.getElementById('pengeluaranKeterangan').value = item.keterangan;
    document.getElementById('pengeluaranNominal').value = Number(item.nominal).toLocaleString('id-ID');
  }
  showBootstrapModal('modalPengeluaran');
}
function editPengeluaran(id){ openModalPengeluaran(id); }
/* ================= SUBMIT PENGELUARAN — OPTIMISTIC UI (Prinsip 2) ================= */
function submitPengeluaran(e){
  e.preventDefault();
  const id = document.getElementById('pengeluaranId').value;
  const data = { id:id, tanggal:document.getElementById('pengeluaranTanggal').value,
    kategori:document.getElementById('pengeluaranKategori').value.trim(),
    keterangan:document.getElementById('pengeluaranKeterangan').value.trim(),
    nominal:unformatRupiah(document.getElementById('pengeluaranNominal').value) };
  if (!data.tanggal || !data.kategori || !data.nominal){ toast('warning','Lengkapi semua field wajib'); return; }

  bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPengeluaran')).hide();
  window._dataPengeluaran = window._dataPengeluaran || [];

  if (id){
    const idx = window._dataPengeluaran.findIndex(function(x){ return x.id === id; });
    if (idx === -1){ toast('error', 'Data tidak ditemukan'); return; }
    const original = Object.assign({}, window._dataPengeluaran[idx]);
    const delta = Number(data.nominal) - Number(original.nominal || 0);
    window._dataPengeluaran[idx] = Object.assign({}, window._dataPengeluaran[idx], data);
    fillTablePengeluaran(window._dataPengeluaran);
    renderHeroPengeluaran();
    applyOptimisticDashboardDelta('Pengeluaran', delta, original.tanggal, data.tanggal);
    toast('success', 'Data pengeluaran berhasil diperbarui');

    google.script.run.withSuccessHandler(function(res){
      if (!res.success){
        window._dataPengeluaran[idx] = original;
        fillTablePengeluaran(window._dataPengeluaran); renderHeroPengeluaran();
        applyOptimisticDashboardDelta('Pengeluaran', -delta, data.tanggal, original.tanggal);
        toast('error', (res.message || 'Gagal memperbarui') + ' — perubahan dibatalkan');
      }
      refreshDashboardSilently();
    }).withFailureHandler(function(err){
      window._dataPengeluaran[idx] = original;
      fillTablePengeluaran(window._dataPengeluaran); renderHeroPengeluaran();
      applyOptimisticDashboardDelta('Pengeluaran', -delta, data.tanggal, original.tanggal);
      toast('error', ((err && err.message) || 'Gagal memperbarui') + ' — perubahan dibatalkan');
      refreshDashboardSilently();
    }).updatePengeluaran(data);
  } else {
    const tempId = 'TMP-' + Date.now();
    const optimisticRecord = Object.assign({ id: tempId }, data);
    window._dataPengeluaran.push(optimisticRecord);
    fillTablePengeluaran(window._dataPengeluaran);
    renderHeroPengeluaran();
    applyOptimisticDashboardDelta('Pengeluaran', Number(data.nominal), null, data.tanggal);
    toast('success', 'Data pengeluaran berhasil ditambahkan');

    google.script.run.withSuccessHandler(function(res){
      if (res.success){
        optimisticRecord.id = res.id;
      } else {
        window._dataPengeluaran = window._dataPengeluaran.filter(function(x){ return x.id !== tempId; });
        fillTablePengeluaran(window._dataPengeluaran); renderHeroPengeluaran();
        applyOptimisticDashboardDelta('Pengeluaran', -Number(data.nominal), data.tanggal, null);
        toast('error', (res.message || 'Gagal menyimpan') + ' — data dibatalkan');
      }
      refreshDashboardSilently();
    }).withFailureHandler(function(err){
      window._dataPengeluaran = window._dataPengeluaran.filter(function(x){ return x.id !== tempId; });
      fillTablePengeluaran(window._dataPengeluaran); renderHeroPengeluaran();
      applyOptimisticDashboardDelta('Pengeluaran', -Number(data.nominal), data.tanggal, null);
      toast('error', ((err && err.message) || 'Gagal menyimpan') + ' — data dibatalkan');
      refreshDashboardSilently();
    }).savePengeluaran(data);
  }
}
function hapusPengeluaran(id){
  confirmDelete(function(){
    const idx = window._dataPengeluaran.findIndex(function(x){ return x.id === id; });
    if (idx === -1) return;
    const removed = window._dataPengeluaran[idx];

    window._dataPengeluaran.splice(idx, 1);
    fillTablePengeluaran(window._dataPengeluaran);
    renderHeroPengeluaran();
    applyOptimisticDashboardDelta('Pengeluaran', -Number(removed.nominal || 0), removed.tanggal, null);
    toast('success', 'Data pengeluaran berhasil dihapus');

    google.script.run.withSuccessHandler(function(res){
      if (!res.success){
        window._dataPengeluaran.splice(idx, 0, removed);
        fillTablePengeluaran(window._dataPengeluaran); renderHeroPengeluaran();
        applyOptimisticDashboardDelta('Pengeluaran', Number(removed.nominal || 0), null, removed.tanggal);
        toast('error', (res.message || 'Gagal menghapus') + ' — data dikembalikan');
      }
      refreshDashboardSilently();
    }).withFailureHandler(function(err){
      window._dataPengeluaran.splice(idx, 0, removed);
      fillTablePengeluaran(window._dataPengeluaran); renderHeroPengeluaran();
      applyOptimisticDashboardDelta('Pengeluaran', Number(removed.nominal || 0), null, removed.tanggal);
      toast('error', ((err && err.message) || 'Gagal menghapus') + ' — data dikembalikan');
      refreshDashboardSilently();
    }).deletePengeluaran(id);
  });
}

/* ================= HUTANG (tampil sebagai "Pinjaman") ================= */
function updatePreviewCicilan(){
  const nominal = unformatRupiah(document.getElementById('hutangNominal').value);
  const jw = Number(document.getElementById('hutangJangkaWaktu').value);
  const box = document.getElementById('previewCicilanBox');
  if (nominal>0 && jw>0){
    box.style.display='block';
    document.getElementById('previewCicilanNilai').innerText = formatRupiah(Math.round(nominal/jw));
  } else {
    box.style.display='none';
  }
}
function loadHutang(){
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    showLoading(false); if(!res.success){ toast('error', res.message); return; }
    window._dataHutang = res.data; fillTableHutang(res.data); renderHutangSummary(res.data); renderHutangCards(res.data);
    renderHeroPinjaman();
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).getHutangWithStatus();
}
function renderHutangSummary(data){
  const el = document.getElementById('hutangSummaryContainer');
  if (!el) return;
  const aktif = data.filter(function(h){ return h.status !== 'Lunas'; });
  const totalSisa = aktif.reduce(function(s,h){ return s + Math.max(0, h.sisa); }, 0);
  el.innerHTML =
    '<div class="mini-stat-pill">'+
      '<div class="mini-stat-icon debt"><i class="bi bi-cash-coin"></i></div>'+
      '<div class="mini-stat-info"><div class="mini-stat-label">Total Sisa Pinjaman</div><div class="mini-stat-value">'+formatRupiah(totalSisa)+'</div></div>'+
    '</div>'+
    '<div class="mini-stat-pill">'+
      '<div class="mini-stat-icon balance"><i class="bi bi-list-check"></i></div>'+
      '<div class="mini-stat-info"><div class="mini-stat-label">Pinjaman Aktif</div><div class="mini-stat-value">'+aktif.length+'</div></div>'+
    '</div>';
}
function statusBadgeClass(status){
  if (status==='Lunas') return 'badge-lunas';
  if (status==='Terlambat') return 'badge-terlambat';
  if (status==='Segera Jatuh Tempo') return 'badge-segera';
  return 'badge-menunggu';
}
function fillTableHutang(data){
  if ($.fn.DataTable.isDataTable('#tableHutang')) dtHutang.destroy();
  const tbody = document.querySelector('#tableHutang tbody'); tbody.innerHTML = '';
  data.forEach(function(r){
    const bayarBtn = r.status !== 'Lunas' ? '<button class="btn btn-sm btn-outline-success me-1" onclick="openModalBayarHutang(\''+r.id+'\')"><i class="bi bi-cash-coin"></i></button>' : '';
    const cicilanKe = r.status==='Lunas' ? '-' : (r.installmentKe + ' / ' + r.jangkaWaktu);
    const jatuhTempoTd = r.status==='Lunas' ? '<td data-sort="9999-12-31">-</td>' : dateTd(r.nextDueDate);
    tbody.innerHTML += '<tr><td>'+escapeHtml(r.namaPihak)+'</td><td>'+escapeHtml(r.keterangan||'-')+'</td>'+
      '<td class="text-end">'+formatRupiah(r.nominal)+'</td>'+
      '<td class="text-end">'+formatRupiah(r.cicilanPerBulan)+'</td>'+
      '<td class="text-end">'+formatRupiah(r.sisa)+'</td>'+
      '<td>'+cicilanKe+'</td>'+
      jatuhTempoTd+
      '<td><span class="badge-jenis '+statusBadgeClass(r.status)+'">'+r.status+'</span></td>'+
      '<td class="text-center">'+bayarBtn+
      '<button class="btn btn-sm btn-outline-primary me-1" onclick="editHutang(\''+r.id+'\')"><i class="bi bi-pencil-square"></i></button>'+
      '<button class="btn btn-sm btn-outline-danger" onclick="hapusHutang(\''+r.id+'\')"><i class="bi bi-trash3"></i></button></td></tr>';
  });
  dtHutang = $('#tableHutang').DataTable({ language:dtLangID, order:[[6,'asc']], pageLength:-1, lengthMenu:dtLengthMenu, responsive:true });
}
function renderHutangCards(data){
  const el = document.getElementById('hutangCardsContainer');
  if (!el) return;
  if (!data.length){ el.innerHTML = '<div class="glass-card"><div class="empty-state-box"><i class="bi bi-inbox"></i><div class="empty-title">Belum ada data pinjaman</div></div></div>'; return; }

  const sorted = data.slice().sort(function(a, b){
    const aDate = a.nextDueDate ? new Date(a.nextDueDate).getTime() : Infinity;
    const bDate = b.nextDueDate ? new Date(b.nextDueDate).getTime() : Infinity;
    return aDate - bDate;
  });

  el.innerHTML = sorted.map(function(r){
    const bayarBtn = r.status !== 'Lunas' ? '<button class="btn btn-sm btn-outline-success" onclick="openModalBayarHutang(\''+r.id+'\')"><i class="bi bi-cash-coin"></i> Bayar</button>' : '';
    const cicilanKe = r.status==='Lunas' ? '-' : (r.installmentKe + ' / ' + r.jangkaWaktu);
    const jatuhTempo = r.status==='Lunas' ? '-' : formatTanggal(r.nextDueDate);
    return '<div class="hutang-card">'+
      '<div class="hc-top"><div><div class="hc-nama">'+escapeHtml(r.namaPihak)+'</div><div class="hc-ket">'+escapeHtml(r.keterangan||'-')+'</div></div><span class="badge-jenis '+statusBadgeClass(r.status)+'">'+r.status+'</span></div>'+
      '<div class="hc-row"><span class="label">Nominal</span><span>'+formatRupiah(r.nominal)+'</span></div>'+
      '<div class="hc-row"><span class="label">Cicilan/Bulan</span><span>'+formatRupiah(r.cicilanPerBulan)+'</span></div>'+
      '<div class="hc-row"><span class="label">Sisa</span><span class="fw-semibold">'+formatRupiah(r.sisa)+'</span></div>'+
      '<div class="hc-row"><span class="label">Cicilan Ke</span><span>'+cicilanKe+'</span></div>'+
      '<div class="hc-row"><span class="label">Jatuh Tempo</span><span>'+jatuhTempo+'</span></div>'+
      '<div class="hc-actions">'+bayarBtn+
      '<button class="btn btn-sm btn-outline-primary" onclick="editHutang(\''+r.id+'\')"><i class="bi bi-pencil-square"></i></button>'+
      '<button class="btn btn-sm btn-outline-danger" onclick="hapusHutang(\''+r.id+'\')"><i class="bi bi-trash3"></i></button></div>'+
    '</div>';
  }).join('');
}
function openModalHutang(id){
  document.getElementById('formHutang').reset();
  document.getElementById('hutangId').value = '';
  document.getElementById('hutangTanggal').value = todayStr();
  document.getElementById('previewCicilanBox').style.display='none';
  document.getElementById('modalHutangTitle').innerText = id ? 'Edit Pinjaman' : 'Tambah Pinjaman';
  if (id){
    const item = window._dataHutang.find(x=>x.id===id);
    document.getElementById('hutangId').value = item.id;
    document.getElementById('hutangTanggal').value = item.tanggal;
    document.getElementById('hutangNamaPihak').value = item.namaPihak;
    document.getElementById('hutangKeterangan').value = item.keterangan;
    document.getElementById('hutangNominal').value = Number(item.nominal).toLocaleString('id-ID');
    document.getElementById('hutangJatuhTempo').value = item.jatuhTempo;
    document.getElementById('hutangJangkaWaktu').value = item.jangkaWaktu;
    updatePreviewCicilan();
  }
  showBootstrapModal('modalHutang');
}
function editHutang(id){ openModalHutang(id); }
function submitHutang(e){
  e.preventDefault();
  const id = document.getElementById('hutangId').value;
  const data = { id:id, tanggal:document.getElementById('hutangTanggal').value,
    namaPihak:document.getElementById('hutangNamaPihak').value.trim(),
    keterangan:document.getElementById('hutangKeterangan').value.trim(),
    nominal:unformatRupiah(document.getElementById('hutangNominal').value),
    jatuhTempo:document.getElementById('hutangJatuhTempo').value,
    jangkaWaktu:Number(document.getElementById('hutangJangkaWaktu').value) };
  if (!data.tanggal || !data.namaPihak || !data.nominal || !data.jatuhTempo || !data.jangkaWaktu){ toast('warning','Lengkapi semua field wajib'); return; }
  showLoading(true);
  const fn = id ? 'updateHutang' : 'saveHutang';
  google.script.run.withSuccessHandler(function(res){
    showLoading(false); if(!res.success){ toast('error', res.message); return; }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalHutang')).hide();
    toast('success', res.message); loadHutang(); loadPengingatBadge(); refreshDashboardSilently();
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); })[fn](data);
}
function hapusHutang(id){
  confirmDelete(function(){
    showLoading(true);
    google.script.run.withSuccessHandler(function(res){
      showLoading(false); if(!res.success){ toast('error', res.message); return; }
      toast('success', res.message); loadHutang(); loadPengingatBadge(); refreshDashboardSilently();
    }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).deleteHutang(id);
  });
}

function openModalBayarHutang(id){
  const item = window._dataHutang.find(x=>x.id===id);
  document.getElementById('formBayarHutang').reset();
  document.getElementById('bayarHutangId').value = id;
  document.getElementById('bayarNamaPihak').innerText = item.namaPihak;
  document.getElementById('bayarCicilanKe').innerText = item.installmentKe;
  document.getElementById('bayarJangkaWaktu').innerText = item.jangkaWaktu;
  document.getElementById('bayarJatuhTempoBerikutnya').innerText = formatTanggal(item.nextDueDate);
  document.getElementById('bayarSisaHutang').innerText = formatRupiah(item.sisa);
  document.getElementById('bayarTanggal').value = todayStr();
  document.getElementById('bayarNominal').value = Math.min(item.cicilanPerBulan, item.sisa).toLocaleString('id-ID');
  showBootstrapModal('modalBayarHutang');
}
function submitBayarHutang(e){
  e.preventDefault();
  const data = {
    hutangId: document.getElementById('bayarHutangId').value,
    tanggal: document.getElementById('bayarTanggal').value,
    nominal: unformatRupiah(document.getElementById('bayarNominal').value),
    keterangan: document.getElementById('bayarKeterangan').value.trim()
  };
  if (!data.nominal){ toast('warning','Isi nominal cicilan'); return; }
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    showLoading(false); if(!res.success){ toast('error', res.message); return; }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalBayarHutang')).hide();
    toast('success', res.message);
    loadHutang(); loadPengingatBadge(); refreshDashboardSilently();
    if (!document.getElementById('page-pengingat').classList.contains('d-none')) loadPengingat();
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).savePembayaranHutang(data);
}

/* ================= PENGINGAT ================= */
function loadPengingat(){
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    showLoading(false); if(!res.success){ toast('error', res.message); return; }
    window._pengingatData = res.data;
    renderPengingatHero(res.data.ringkasan);
    renderPengingatTerlambat(res.data.terlambatGrouped);
    renderPengingatLedger(res.data.bulanList);
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).getPengingatJatuhTempo();
}

function renderPengingatHero(r){
  document.getElementById('heroTotalSeluruh').innerText = formatRupiah(r.totalSeluruhTunggakan);
  document.getElementById('heroTotalSub').innerText = r.jumlahAktif + ' cicilan aktif belum lunas';
  document.getElementById('heroMingguIni').innerText = formatRupiah(r.totalMingguIni);
  document.getElementById('heroMingguLabel').innerText = r.labelMingguIni;
  document.getElementById('heroTotalTerlambat').innerText = formatRupiah(r.totalTerlambat);
  document.getElementById('heroJumlahTerlambat').innerText = r.jumlahTerlambat + ' cicilan';
}

function reminderCardHtml(h){
  const cls = h.status==='Terlambat' ? 'terlambat' : (h.status==='Segera Jatuh Tempo' ? 'segera' : '');
  const initial = (h.namaPihak || '?').trim().charAt(0).toUpperCase();
  return '<div class="reminder-card '+cls+'">'+
    '<div class="reminder-avatar '+cls+'">'+escapeHtml(initial)+'</div>'+
    '<div class="reminder-info">'+
      '<div class="nama">'+escapeHtml(h.namaPihak)+'</div>'+
      '<div class="sub">Cicilan ke-'+h.installmentKe+' dari '+h.jangkaWaktu+' bulan &middot; jatuh tempo '+formatTanggal(h.nextDueDate)+'</div>'+
    '</div>'+
    '<div class="reminder-amount">'+
      '<div class="nominal">'+formatRupiah(Math.min(h.cicilanPerBulan, h.sisa))+'</div>'+
      '<span class="badge-jenis '+statusBadgeClass(h.status)+'">'+h.status+'</span>'+
      '<div class="mt-2"><button class="btn btn-sm btn-gradient-income" onclick="bayarDariPengingat(\''+h.id+'\')">Bayar</button></div>'+
    '</div>'+
  '</div>';
}

function pihakGroupHtml(group){
  return '<div class="mb-3">'+
    '<div class="d-flex justify-content-between align-items-center mb-2 px-1">'+
      '<span class="fw-semibold small text-muted"><i class="bi bi-person-fill"></i> '+escapeHtml(group.namaPihak)+'</span>'+
      '<span class="fw-semibold small">'+formatRupiah(group.total)+'</span>'+
    '</div>'+
    group.items.map(reminderCardHtml).join('') +
  '</div>';
}

function renderPengingatTerlambat(groupedList){
  const section = document.getElementById('terlambatSection');
  const el = document.getElementById('listTerlambat');
  if (!groupedList || !groupedList.length){ section.style.display = 'none'; el.innerHTML = ''; return; }
  section.style.display = 'block';
  el.innerHTML = groupedList.map(pihakGroupHtml).join('');
}

function renderPengingatLedger(bulanList){
  const container = document.getElementById('ledgerContainer');
  if (!bulanList.length){
    container.innerHTML = '<div class="glass-card"><div class="empty-state-box"><i class="bi bi-check2-circle"></i><div class="empty-title">Tidak ada cicilan mendatang</div><div class="empty-sub">Semua pinjaman sudah lunas atau belum ada jadwal jatuh tempo</div></div></div>';
    return;
  }
  container.innerHTML = bulanList.map(function(bulan, bIdx){
    const rows = bulan.minggu.map(function(w, wIdx){
      const rowId = 'ledgerRow-' + bIdx + '-' + wIdx;
      const badgeIni = w.isMingguIni ? '<span class="badge-minggu-ini">Minggu Ini</span>' : '';
      const kelompokHtml = (w.kelompokPihak || []).map(pihakGroupHtml).join('');
      return '<div>'+
        '<div class="ledger-week-row" onclick="toggleLedgerRow(\''+rowId+'\')" id="head-'+rowId+'">'+
          '<div class="ledger-week-left">'+
            '<div class="ledger-week-badge'+(w.isMingguIni?' ini':'')+'">M'+w.mingguKe+'</div>'+
            '<div>'+
              '<div class="ledger-week-date">'+w.label+badgeIni+'</div>'+
              '<div class="ledger-week-count">'+w.items.length+' cicilan jatuh tempo</div>'+
            '</div>'+
          '</div>'+
          '<div class="ledger-week-right">'+
            '<div class="ledger-week-total">'+formatRupiah(w.total)+'</div>'+
            '<i class="bi bi-chevron-down ledger-week-chevron"></i>'+
          '</div>'+
        '</div>'+
        '<div class="ledger-week-detail" id="'+rowId+'">'+ kelompokHtml +'</div>'+
      '</div>';
    }).join('');

    const ringkasanPihakHtml = (bulan.ringkasanPihak || []).map(function(p){
      return '<span class="badge-jenis badge-menunggu me-1 mb-1" style="display:inline-block;">'+escapeHtml(p.namaPihak)+': '+formatRupiah(p.total)+'</span>';
    }).join('');

    return '<div class="ledger-month">'+
      '<div class="ledger-month-header">'+
        '<div class="bulan-nama"><i class="bi bi-calendar3"></i> '+bulan.bulanLabel+'</div>'+
        '<div class="bulan-total">'+formatRupiah(bulan.totalBulan)+'</div>'+
      '</div>'+
      (ringkasanPihakHtml ? '<div class="px-3 pt-2 pb-1">'+ringkasanPihakHtml+'</div>' : '')+
      '<div class="ledger-table">'+ rows +'</div>'+
      '<div class="ledger-month-footer">'+
        '<span class="label">Total '+bulan.bulanLabel+'</span>'+
        '<span class="value">'+formatRupiah(bulan.totalBulan)+'</span>'+
      '</div>'+
    '</div>';
  }).join('');

  const firstIniRow = container.querySelector('.ledger-week-badge.ini');
  if (firstIniRow) {
    const rowHead = firstIniRow.closest('.ledger-week-row');
    if (rowHead) {
      const rowId = rowHead.id.replace('head-', '');
      toggleLedgerRow(rowId);
    }
  }
}

function bayarDariPengingat(id){
  if (window._dataHutang && window._dataHutang.length){
    openModalBayarHutang(id);
  } else {
    showLoading(true);
    google.script.run.withSuccessHandler(function(res){
      showLoading(false);
      if(res.success){ window._dataHutang = res.data; openModalBayarHutang(id); }
    }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).getHutangWithStatus();
  }
}

/* ================= KALENDER ================= */
let calYear, calMonth, calSelectedDay = null, calEventsData = {};
const namaBulanFull = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

function loadKalender(){
  const now = new Date();
  if (calYear === undefined) { calYear = now.getFullYear(); calMonth = now.getMonth(); }
  renderCalendar();
}
function calPrevMonth(){ calMonth--; if(calMonth<0){calMonth=11;calYear--;} calSelectedDay=null; renderCalendar(); }
function calNextMonth(){ calMonth++; if(calMonth>11){calMonth=0;calYear++;} calSelectedDay=null; renderCalendar(); }
function calGoToday(){ const now=new Date(); calYear=now.getFullYear(); calMonth=now.getMonth(); calSelectedDay=now.getDate(); renderCalendar(); }

function renderCalendar(){
  document.getElementById('calMonthLabel').innerText = namaBulanFull[calMonth] + ' ' + calYear;
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    showLoading(false);
    if(!res.success){ toast('error', res.message); return; }
    calEventsData = res.data;
    buildCalendarGrid();
    if (calSelectedDay) renderDayDetail(calSelectedDay);
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).getKalenderData(calYear, calMonth);
}

function buildCalendarGrid(){
  const grid = document.getElementById('calGrid');
  grid.innerHTML = '';
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear()===calYear && today.getMonth()===calMonth;

  for (let i=0; i<firstDay; i++){
    grid.innerHTML += '<div class="calendar-cell empty"></div>';
  }
  for (let day=1; day<=daysInMonth; day++){
    const events = calEventsData[day] || [];
    const isToday = isCurrentMonth && today.getDate()===day;
    const isSelected = calSelectedDay===day;
    const dotsHtml = events.slice(0,6).map(function(e){ return '<span class="calendar-dot '+e.type+'"></span>'; }).join('');
    grid.innerHTML += '<div class="calendar-cell'+(isToday?' today':'')+(isSelected?' selected':'')+'" onclick="calSelectDay('+day+')">'+
      '<div class="calendar-daynum">'+day+'</div>'+
      '<div class="calendar-dots">'+dotsHtml+'</div>'+
    '</div>';
  }
}

function calSelectDay(day){
  calSelectedDay = day;
  buildCalendarGrid();
  renderDayDetail(day);
}

function renderDayDetail(day){
  const card = document.getElementById('calDayDetailCard');
  const events = calEventsData[day] || [];
  const dateLabel = day + ' ' + namaBulanFull[calMonth] + ' ' + calYear;
  document.getElementById('calDayDetailTitle').innerText = 'Transaksi ' + dateLabel;
  const list = document.getElementById('calDayDetailList');
  if (!events.length){
    list.innerHTML = '<p class="text-muted text-center py-3 mb-0">Tidak ada transaksi pada tanggal ini.</p>';
  } else {
    list.innerHTML = events.map(function(e){
      return '<div class="calendar-event-item '+e.type+'"><span>'+escapeHtml(e.label)+'</span><span class="fw-semibold">'+formatRupiah(e.nominal)+'</span></div>';
    }).join('');
  }
  card.style.display = 'block';
}

function syncGoogleCalendar(){
  Swal.fire({
    title: 'Sinkronkan ke Google Calendar?',
    text: 'Semua jadwal jatuh tempo cicilan pinjaman yang belum lunas akan ditambahkan sebagai event pengingat di Google Calendar Anda.',
    icon: 'question', showCancelButton: true, confirmButtonText: 'Ya, sinkronkan', cancelButtonText: 'Batal'
  }).then(function(res){
    if (!res.isConfirmed) return;
    showLoading(true);
    google.script.run.withSuccessHandler(function(r){
      showLoading(false);
      if(!r.success){ toast('error', r.message); return; }
      toast('success', r.message);
    }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).syncPinjamanToGoogleCalendar();
  });
}

/* ================= RIWAYAT — FEED TRANSAKSI + SEARCH BAR + PANEL FILTER ================= */
window._riwayatDataAll = [];
function toggleRiwayatFilterPanel(){
  const panel = document.getElementById('riwayatFilterPanel');
  const btn = document.getElementById('btnToggleRiwayatFilter');
  panel.classList.toggle('open');
  btn.classList.toggle('active');
}
function loadRiwayat(){
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    showLoading(false); if(!res.success){ toast('error', res.message); return; }
    window._riwayatDataAll = res.data;
    fillTableRiwayat(res.data);
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).getAllTransactions();
}
function applyRiwayatFilter(){
  const start = document.getElementById('riwayatFilterStart').value;
  const end = document.getElementById('riwayatFilterEnd').value;
  const jenis = document.getElementById('riwayatFilterJenis').value;
  const min = unformatRupiah(document.getElementById('riwayatFilterMin').value);
  const max = unformatRupiah(document.getElementById('riwayatFilterMax').value);
  const keyword = document.getElementById('riwayatFilterKeyword').value.trim().toLowerCase();

  let filtered = window._riwayatDataAll.slice();
  if (start) filtered = filtered.filter(function(r){ return new Date(r.tanggal) >= new Date(start); });
  if (end) filtered = filtered.filter(function(r){ return new Date(r.tanggal) <= new Date(end); });
  if (jenis) filtered = filtered.filter(function(r){ return r.jenis === jenis; });
  if (min > 0) filtered = filtered.filter(function(r){ return Number(r.nominal) >= min; });
  if (max > 0) filtered = filtered.filter(function(r){ return Number(r.nominal) <= max; });
  if (keyword) filtered = filtered.filter(function(r){
    return String(r.kategori||'').toLowerCase().indexOf(keyword) !== -1 ||
           String(r.keterangan||'').toLowerCase().indexOf(keyword) !== -1;
  });
  fillTableRiwayat(filtered);
}
function resetRiwayatFilter(){
  document.getElementById('riwayatFilterStart').value = '';
  document.getElementById('riwayatFilterEnd').value = '';
  document.getElementById('riwayatFilterJenis').value = '';
  document.getElementById('riwayatFilterMin').value = '';
  document.getElementById('riwayatFilterMax').value = '';
  document.getElementById('riwayatFilterKeyword').value = '';
  fillTableRiwayat(window._riwayatDataAll);
}
function fillTableRiwayat(data){
  const container = document.getElementById('riwayatFeedContainer');
  renderTransactionFeed(container, data, riwayatFeedItemHtml, 'bi-inbox', 'Tidak ada transaksi', 'Coba ubah filter pencarian');
}

/* ================= LAPORAN ================= */
function loadRekapBulanan(){
  google.script.run.withSuccessHandler(function(res){
    if(!res.success){ toast('error', res.message); return; }
    renderRekapBulanan(res.data);
  }).withFailureHandler(function(err){ toast('error', err.message); }).getRekapBulanan();
}
function renderRekapBulanan(data){
  const tbody = document.getElementById('rekapBulananBody'); tbody.innerHTML = '';
  const cardsEl = document.getElementById('rekapCardsContainer');
  const heroSaldo = document.getElementById('rekapHeroSaldoAkhir');
  const heroLabel = document.getElementById('rekapHeroLabel');
  if(!data.length){
    tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">Belum ada data transaksi</td></tr>';
    if (cardsEl) cardsEl.innerHTML = '<div class="glass-card"><div class="empty-state-box"><i class="bi bi-inbox"></i><div class="empty-title">Belum ada data transaksi</div></div></div>';
    if (heroSaldo) heroSaldo.innerText = formatRupiah(0);
    if (heroLabel) heroLabel.innerText = 'Belum ada data';
    return;
  }
  const now = new Date();
  const currentKey = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  data.forEach(function(r){
    const isCurrent = r.bulan === currentKey;
    tbody.innerHTML += '<tr'+(isCurrent?' class="rekap-row-current"':'')+'><td class="fw-semibold">'+r.bulanLabel+(isCurrent?' <span class="badge-jenis badge-menunggu ms-1">Bulan Ini</span>':'')+'</td>'+
      '<td class="text-end">'+formatRupiah(r.saldoAwal)+'</td>'+
      '<td class="text-end text-success">'+formatRupiah(r.totalPemasukan)+'</td>'+
      '<td class="text-end">'+formatRupiah(r.totalPengeluaranMurni)+'</td>'+
      '<td class="text-end text-warning">'+formatRupiah(r.totalCicilan)+'</td>'+
      '<td class="text-end text-danger fw-semibold">'+formatRupiah(r.totalPengeluaran)+'</td>'+
      '<td class="text-end '+(r.selisih>=0?'text-success':'text-danger')+'">'+formatRupiah(r.selisih)+'</td>'+
      '<td class="text-end fw-bold '+(r.saldoAkhir>=0?'text-success':'text-danger')+'">'+formatRupiah(r.saldoAkhir)+'</td></tr>';
  });
  const last = data[data.length-1];
  if (heroSaldo) heroSaldo.innerText = formatRupiah(last.saldoAkhir);
  if (heroLabel) heroLabel.innerText = 'Per akhir ' + last.bulanLabel;

  if (cardsEl){
    cardsEl.innerHTML = data.map(function(r){
      const isCurrent = r.bulan === currentKey;
      return '<div class="data-row-card">'+
        '<div class="drc-top"><span class="drc-title">'+r.bulanLabel+'</span>'+(isCurrent?'<span class="badge-jenis badge-menunggu">Bulan Ini</span>':'')+'</div>'+
        '<div class="drc-row"><span class="label">Saldo Awal</span><span>'+formatRupiah(r.saldoAwal)+'</span></div>'+
        '<div class="drc-row"><span class="label">Pemasukan</span><span class="value positive">'+formatRupiah(r.totalPemasukan)+'</span></div>'+
        '<div class="drc-row"><span class="label">Pengeluaran Murni</span><span>'+formatRupiah(r.totalPengeluaranMurni)+'</span></div>'+
        '<div class="drc-row"><span class="label">Pembayaran Cicilan</span><span>'+formatRupiah(r.totalCicilan)+'</span></div>'+
        '<div class="drc-row"><span class="label">Total Pengeluaran</span><span class="value negative">'+formatRupiah(r.totalPengeluaran)+'</span></div>'+
        '<div class="drc-row"><span class="label">Selisih</span><span class="'+(r.selisih>=0?'value positive':'value negative')+'">'+formatRupiah(r.selisih)+'</span></div>'+
        '<div class="drc-row"><span class="label fw-semibold">Saldo Akhir</span><span class="fw-bold">'+formatRupiah(r.saldoAkhir)+'</span></div>'+
      '</div>';
    }).join('');
  }
}
function generateLaporan(){
  const periode = document.getElementById('laporanPeriode').value;
  const startDate = document.getElementById('laporanStart').value;
  const endDate = document.getElementById('laporanEnd').value;
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    if(!res.success){ showLoading(false); toast('error', res.message); return; }
    window._laporanData = res.data; renderLaporanTable(res.data);
    google.script.run.withSuccessHandler(function(res2){
      showLoading(false);
      if(!res2.success){ toast('error', res2.message); return; }
      renderLaporanRinci(res2.data);
    }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).generateLaporanRinci({startDate:startDate, endDate:endDate});
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).generateReport({periode:periode, startDate:startDate, endDate:endDate});
}
function renderLaporanTable(data){
  const tbody = document.querySelector('#tableLaporan tbody'); tbody.innerHTML = '';
  if(!data.length){ tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">Tidak ada data pada periode ini</td></tr>'; return; }
  data.forEach(function(r){
    tbody.innerHTML += '<tr><td>'+r.periode+'</td><td class="text-end text-success">'+formatRupiah(r.pemasukan)+'</td><td class="text-end text-danger">'+formatRupiah(r.pengeluaran)+'</td><td class="text-end text-warning">'+formatRupiah(r.hutang)+'</td><td class="text-end fw-bold">'+formatRupiah(r.saldo)+'</td></tr>';
  });
}
function renderLaporanRinci(months){
  const el = document.getElementById('laporanRinciAccordion');
  if (!months.length){
    el.innerHTML = '<div class="glass-card"><p class="text-muted text-center py-4 mb-0">Tidak ada data pada periode ini</p></div>';
    return;
  }
  function rincianRows(arr, colorClass){
    if (!arr.length) return '<p class="text-muted small mb-0 px-1">Tidak ada data</p>';
    return '<table class="table table-sm mb-0"><tbody>' + arr.map(function(r){
      return '<tr><td>'+escapeHtml(r.kategori)+'</td><td class="text-end '+colorClass+'">'+formatRupiah(r.total)+'</td></tr>';
    }).join('') + '</tbody></table>';
  }
  function pinjamanRows(list){
    if (!list.length) return '<p class="text-muted small mb-0 px-1">Tidak ada pinjaman baru</p>';
    return '<table class="table table-sm mb-0"><tbody>' + list.map(function(p){
      return '<tr><td>'+escapeHtml(p.namaPihak)+' <span class="text-muted small">('+escapeHtml(p.keterangan||'-')+')</span></td><td class="text-end text-warning">'+formatRupiah(p.nominal)+'</td></tr>';
    }).join('') + '</tbody></table>';
  }
  el.innerHTML = months.map(function(m, idx){
    const collapseId = 'laporanCollapse'+idx;
    const isFirst = idx===0;
    return '<div class="accordion-item">'+
      '<h2 class="accordion-header">'+
        '<button class="accordion-button'+(isFirst?'':' collapsed')+'" type="button" data-bs-toggle="collapse" data-bs-target="#'+collapseId+'">'+
          '<div class="periode-header">'+
            '<div class="periode-tanggal"><i class="bi bi-calendar3"></i><div>'+m.bulanLabel+'</div></div>'+
            '<div><div class="periode-total-label">Perubahan Bersih</div>'+
              '<div class="periode-total '+(m.saldoBulan>=0?'text-success':'text-danger')+'">'+formatRupiah(m.saldoBulan)+'</div></div>'+
          '</div>'+
        '</button>'+
      '</h2>'+
      '<div id="'+collapseId+'" class="accordion-collapse collapse'+(isFirst?' show':'')+'" data-bs-parent="#laporanRinciAccordion">'+
        '<div class="accordion-body">'+
          '<div class="month-balance-bar">'+
            '<div class="balance-item"><span class="balance-label">Saldo Awal Bulan</span><span class="balance-value">'+formatRupiah(m.saldoAwal)+'</span></div>'+
            '<i class="bi bi-arrow-right"></i>'+
            '<div class="balance-item"><span class="balance-label">Saldo Akhir Bulan</span><span class="balance-value '+(m.saldoAkhir>=0?'text-success':'text-danger')+'">'+formatRupiah(m.saldoAkhir)+'</span></div>'+
          '</div>'+
          '<div class="row g-3">'+
            '<div class="col-md-4"><h6 class="text-success mb-2">Pemasukan <span class="float-end">'+formatRupiah(m.pemasukan.total)+'</span></h6>'+rincianRows(m.pemasukan.rincian,'text-success')+'</div>'+
            '<div class="col-md-4"><h6 class="text-danger mb-2">Pengeluaran <span class="float-end">'+formatRupiah(m.pengeluaran.total)+'</span></h6>'+rincianRows(m.pengeluaran.rincian,'text-danger')+'</div>'+
            '<div class="col-md-4"><h6 class="text-warning mb-2">Pinjaman Baru <span class="float-end">'+formatRupiah(m.pinjaman.total)+'</span></h6>'+pinjamanRows(m.pinjaman.list)+'</div>'+
          '</div>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}
function exportCSV(){
  if(!window._laporanData || !window._laporanData.length){ toast('warning','Tampilkan laporan terlebih dahulu'); return; }
  let csv = 'Periode,Pemasukan,Pengeluaran,Pinjaman,Saldo\n';
  window._laporanData.forEach(function(r){ csv += [r.periode, r.pemasukan, r.pengeluaran, r.hutang, r.saldo].join(',') + '\n'; });
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
  link.download = 'Laporan_Bandhits_'+todayStr()+'.csv'; link.click();
}
function exportPDF(){
  if(!window._laporanData || !window._laporanData.length){ toast('warning','Tampilkan laporan terlebih dahulu'); return; }
  showLoading(true);
  ensureJsPdf().then(function(){
    showLoading(false);
    const doc = new jspdf.jsPDF();
    doc.setFontSize(14); doc.text('Laporan Keuangan Bandhits', 14, 15);
    doc.setFontSize(9); doc.text('Dicetak: ' + new Date().toLocaleString('id-ID'), 14, 21);
    const rows = window._laporanData.map(r => [r.periode, formatRupiah(r.pemasukan), formatRupiah(r.pengeluaran), formatRupiah(r.hutang), formatRupiah(r.saldo)]);
    doc.autoTable({ head:[['Periode','Pemasukan','Pengeluaran','Pinjaman','Saldo']], body:rows, startY:26, styles:{font:'helvetica', fontSize:8} });
    doc.save('Laporan_Bandhits_'+todayStr()+'.pdf');
  }).catch(function(){ showLoading(false); toast('error','Gagal memuat modul PDF'); });
}
function printLaporan(){ window.print(); }

/* ================= CETAK RINGKASAN BULANAN OTOMATIS (PDF) ================= */
function cetakRingkasanBulanIni(){
  showLoading(true);
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  const endDate = new Date(now.getFullYear(), now.getMonth()+1, 0).toISOString().slice(0,10);

  Promise.all([
    ensureJsPdf(),
    new Promise(function(resolve, reject){
      google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).generateLaporanRinci({startDate:startDate, endDate:endDate});
    })
  ]).then(function(results){
    showLoading(false);
    const res = results[1];
    if (!res.success || !res.data.length){ toast('warning','Tidak ada data bulan ini untuk dicetak'); return; }
    const m = res.data[0];
    const doc = new jspdf.jsPDF();
    doc.setFontSize(16); doc.text('Ringkasan Keuangan Bulanan', 14, 16);
    doc.setFontSize(11); doc.text('Bandhits - ' + m.bulanLabel, 14, 23);
    doc.setFontSize(9); doc.text('Dicetak: ' + new Date().toLocaleString('id-ID'), 14, 29);

    doc.setFontSize(11);
    doc.text('Saldo Awal: ' + formatRupiah(m.saldoAwal), 14, 40);
    doc.text('Saldo Akhir: ' + formatRupiah(m.saldoAkhir), 14, 47);

    let y = 58;
    doc.setFontSize(12); doc.text('Pemasukan (Total: ' + formatRupiah(m.pemasukan.total) + ')', 14, y); y += 6;
    doc.autoTable({ startY:y, head:[['Kategori','Nominal']], body: m.pemasukan.rincian.map(function(r){ return [r.kategori, formatRupiah(r.total)]; }), styles:{fontSize:8} });
    y = doc.lastAutoTable.finalY + 10;

    doc.setFontSize(12); doc.text('Pengeluaran (Total: ' + formatRupiah(m.pengeluaran.total) + ')', 14, y); y += 6;
    doc.autoTable({ startY:y, head:[['Kategori','Nominal']], body: m.pengeluaran.rincian.map(function(r){ return [r.kategori, formatRupiah(r.total)]; }), styles:{fontSize:8} });
    y = doc.lastAutoTable.finalY + 10;

    if (m.pinjaman.list.length){
      doc.setFontSize(12); doc.text('Pinjaman Baru (Total: ' + formatRupiah(m.pinjaman.total) + ')', 14, y); y += 6;
      doc.autoTable({ startY:y, head:[['Nama Pihak','Nominal']], body: m.pinjaman.list.map(function(p){ return [p.namaPihak, formatRupiah(p.nominal)]; }), styles:{fontSize:8} });
    }

    doc.save('Ringkasan_Bandhits_' + m.bulan + '.pdf');
  }).catch(function(err){ showLoading(false); toast('error', (err && err.message) || 'Gagal membuat PDF'); });
}

/* ================= BACKUP / EXPORT OTOMATIS ================= */
function loadBackupList(){
  google.script.run.withSuccessHandler(function(res){
    const el = document.getElementById('backupListContainer');
    if (!res.success){ el.innerHTML = '<p class="text-danger small mb-0">'+res.message+'</p>'; return; }
    if (!res.data.length){ el.innerHTML = '<p class="text-muted small mb-0">Belum ada backup. Klik "Backup Sekarang" untuk membuat yang pertama.</p>'; return; }
    el.innerHTML = '<table class="table table-sm mb-0"><tbody>' + res.data.map(function(b){
      return '<tr><td>'+escapeHtml(b.name)+'</td><td class="text-muted small">'+b.date+'</td><td class="text-end"><a href="'+b.url+'" target="_blank" class="btn btn-sm btn-outline-primary"><i class="bi bi-box-arrow-up-right"></i></a></td></tr>';
    }).join('') + '</tbody></table>';
  }).withFailureHandler(function(err){
    document.getElementById('backupListContainer').innerHTML = '<p class="text-danger small mb-0">'+err.message+'</p>';
  }).getBackupList();
}
function backupSekarang(){
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    showLoading(false);
    if (!res.success){ toast('error', res.message); return; }
    toast('success', res.message);
    loadBackupList();
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).runManualBackup();
}
function aktifkanBackupOtomatis(){
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    showLoading(false);
    if (!res.success){ toast('error', res.message); return; }
    toast('success', res.message);
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).setupMonthlyBackupTrigger();
}

/* ================= PENGATURAN LOGO ================= */
function extractDriveIdClient(input){
  if(!input) return '';
  input = String(input).trim();
  let m = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if(m) return m[1];
  m = input.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if(m) return m[1];
  if(/^[a-zA-Z0-9_-]{10,}$/.test(input)) return input;
  return '';
}
function openModalLogo(){
  const currentSrc = document.querySelector('.brand-logo').src;
  document.getElementById('logoInput').value = '';
  document.getElementById('logoPreviewImg').src = currentSrc;
  document.getElementById('logoPreviewBox').style.display = 'flex';
  showBootstrapModal('modalLogo');
}
function previewLogoInput(){
  const val = document.getElementById('logoInput').value;
  const id = extractDriveIdClient(val);
  if (id){
    document.getElementById('logoPreviewImg').src = 'https://drive.google.com/thumbnail?id=' + id + '&sz=w400';
    document.getElementById('logoPreviewBox').style.display = 'flex';
  }
}
function applyLogoEverywhere(url){
  const busted = url + '&t=' + new Date().getTime();
  document.querySelectorAll('.brand-logo').forEach(function(img){ img.src = busted; });
  const favicon = document.querySelector('link[rel="icon"]');
  if (favicon) favicon.href = busted;
}
function submitLogo(e){
  e.preventDefault();
  const val = document.getElementById('logoInput').value.trim();
  if (!val){ toast('warning','Tempel link atau ID Google Drive terlebih dahulu'); return; }
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    showLoading(false);
    if(!res.success){ toast('error', res.message); return; }
    applyLogoEverywhere(res.logoUrl);
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalLogo')).hide();
    toast('success', res.message);
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).saveLogo(val);
}
function resetLogoDefault(){
  showLoading(true);
  google.script.run.withSuccessHandler(function(res){
    showLoading(false);
    if(!res.success){ toast('error', res.message); return; }
    applyLogoEverywhere(res.logoUrl);
    document.getElementById('logoInput').value = '';
    document.getElementById('logoPreviewImg').src = res.logoUrl;
    toast('success', res.message);
  }).withFailureHandler(function(err){ showLoading(false); toast('error', err.message); }).resetLogo();
}

/* ================= PROYEKSI SALDO 3 TAHUN (36 BULAN, HERO 4 BULAN) ================= */
function loadProyeksi(){
  showLoading(true);
  Promise.all([
    ensureChartJs(),
    new Promise(function(resolve, reject){
      google.script.run.withSuccessHandler(resolve).withFailureHandler(reject).getProyeksiSaldo();
    })
  ]).then(function(results){
    showLoading(false);
    const res = results[1];
    if(!res.success){ toast('error', res.message); return; }
    renderProyeksiSummary(res.data);
    renderProyeksiChart(res.data.proyeksi);
    renderProyeksiTable(res.data.proyeksi);
  }).catch(function(err){ showLoading(false); toast('error', (err && err.message) || 'Gagal memuat proyeksi'); });
}
function renderProyeksiSummary(d){
  document.getElementById('proyeksiSaldoSaatIni').innerText = formatRupiah(d.saldoKasSaatIni);
  const empatBulan = d.proyeksi.slice(0, 4);
  const last4 = empatBulan[empatBulan.length - 1];
  document.getElementById('proyeksiSaldoAkhir').innerText = last4 ? formatRupiah(last4.saldoAkhir) : formatRupiah(d.saldoKasSaatIni);
  const labelEl = document.getElementById('proyeksiHeroBulanLabel');
  if (labelEl) labelEl.innerText = last4 ? last4.bulanLabel : '-';
}
function renderProyeksiChart(proyeksi){
  const isDark = document.body.classList.contains('dark');
  Chart.defaults.color = isDark ? '#e5e7eb' : '#1f2937';
  Chart.defaults.font.family = 'Poppins';
  if (chartProyeksi) chartProyeksi.destroy();
  chartProyeksi = new Chart(document.getElementById('chartProyeksi'), {
    type:'line',
    data:{
      labels: proyeksi.map(p=>p.bulanLabel),
      datasets:[{ label:'Proyeksi Saldo Kas', data: proyeksi.map(p=>p.saldoAkhir), borderColor:'#6C5CE7', backgroundColor:'rgba(108,92,231,0.1)', fill:true, tension:0.3, pointRadius:0 }]
    },
    options:{ responsive:true, maintainAspectRatio:false, plugins:{legend:{display:false}}, scales:{ x:{ ticks:{ maxTicksLimit:12 } } } }
  });
}
function renderProyeksiTable(proyeksi){
  const tbody = document.getElementById('proyeksiTableBody');
  const cardsEl = document.getElementById('proyeksiCardsContainer');
  if (tbody) tbody.innerHTML='';
  proyeksi.forEach(function(p){
    if (tbody){
      tbody.innerHTML += '<tr><td>'+p.bulanLabel+'</td>'+
        '<td class="text-end text-success">'+formatRupiah(p.pemasukanEstimasi)+'</td>'+
        '<td class="text-end text-danger">'+formatRupiah(p.pengeluaranEstimasi)+'</td>'+
        '<td class="text-end text-warning">'+formatRupiah(p.cicilanPinjaman)+'</td>'+
        '<td class="text-end fw-bold '+(p.saldoAkhir>=0?'text-success':'text-danger')+'">'+formatRupiah(p.saldoAkhir)+'</td></tr>';
    }
  });
  if (cardsEl){
    cardsEl.innerHTML = proyeksi.map(function(p){
      return '<div class="data-row-card">'+
        '<div class="drc-top"><span class="drc-title">'+p.bulanLabel+'</span></div>'+
        '<div class="drc-row"><span class="label">Pemasukan</span><span class="value positive">'+formatRupiah(p.pemasukanEstimasi)+'</span></div>'+
        '<div class="drc-row"><span class="label">Pengeluaran</span><span class="value negative">'+formatRupiah(p.pengeluaranEstimasi)+'</span></div>'+
        '<div class="drc-row"><span class="label">Cicilan Pinjaman</span><span>'+formatRupiah(p.cicilanPinjaman)+'</span></div>'+
        '<div class="drc-row"><span class="label fw-semibold">Saldo Akhir</span><span class="'+(p.saldoAkhir>=0?'value positive fw-bold':'value negative fw-bold')+'">'+formatRupiah(p.saldoAkhir)+'</span></div>'+
      '</div>';
    }).join('');
  }
}
