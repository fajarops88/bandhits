/* Bandhits — lapisan API. Meniru google.script.run di atas fetch() ke Apps Script (JSON).
 * Token sesi hanya di memori (PIN tetap diminta tiap aplikasi dibuka, sama seperti sebelumnya). */
(function () {
  'use strict';
  var URL_ = (window.APP_CONFIG || {}).GAS_URL || '';
  var TOKEN = null;
  var BELUM_DIISI = !URL_ || /GANTI|XXXX/.test(URL_);
  var MAKS_BATCH = 10;
  // Aksi baca murni: boleh digabung otomatis dalam satu permintaan.
  var BACA = /^(get[A-Z]\w*|generateLaporanRinci|cekKonfigurasi)$/;
  var tulisEpoch = 0, inflight = {}, antrean = null;

  function Galat(pesan, kode) { var e = new Error(pesan); e.code = kode || ''; return e; }

  function kirim(body) {
    if (BELUM_DIISI) return Promise.reject(Galat('Konfigurasi belum lengkap: isi GAS_URL di js/config.js.', 'CONFIG'));
    if (TOKEN) body.token = TOKEN;
    return fetch(URL_, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // hindari preflight CORS
      body: JSON.stringify(body), redirect: 'follow'
    }).then(function (r) {
      if (!r.ok) throw Galat('Server membalas ' + r.status, 'HTTP');
      return r.json();
    }).catch(function (e) {
      if (e && e.code) throw e;
      throw Galat('Tidak dapat terhubung ke server. Periksa koneksi internet.', 'NET');
    });
  }

  function sesiHabis() {
    TOKEN = null;
    try { document.dispatchEvent(new CustomEvent('bandhits:auth')); } catch (e) {}
  }

  // Terjemahkan satu respons API menjadi nilai kembalian fungsi (atau lempar galat).
  function buka(res) {
    if (res && res.ok) return res.r;
    var kode = res && res.code, msg = (res && res.message) || 'Terjadi kesalahan.';
    if (kode === 'AUTH') { sesiHabis(); throw Galat('Sesi berakhir. Masukkan PIN kembali.', 'AUTH'); }
    throw Galat(msg, kode);
  }

  function panggilLangsung(fn, args) {
    return kirim({ action: fn, args: args }).then(buka);
  }

  function gabung() {
    var q = antrean; antrean = null;
    var unik = {}, urut = [];
    q.forEach(function (it) {
      var k = it.fn + '|' + JSON.stringify(it.args);
      if (!unik[k]) { unik[k] = { fn: it.fn, args: it.args, pend: [] }; urut.push(unik[k]); }
      unik[k].pend.push(it);
    });
    function selesai(u, ok, v) { u.pend.forEach(function (it) { ok ? it.res(v) : it.rej(v); }); }
    for (var i = 0; i < urut.length; i += MAKS_BATCH) {
      (function (grup) {
        if (grup.length === 1) {
          panggilLangsung(grup[0].fn, grup[0].args).then(function (v) { selesai(grup[0], true, v); }, function (e) { selesai(grup[0], false, e); });
          return;
        }
        kirim({ action: 'batch', calls: grup.map(function (u) { return { action: u.fn, args: u.args }; }) })
          .then(function (res) {
            if (!res.ok) { try { buka(res); } catch (e) { grup.forEach(function (u) { selesai(u, false, e); }); } return; }
            grup.forEach(function (u, i) {
              try { selesai(u, true, buka(res.rs[i])); } catch (e) { selesai(u, false, e); }
            });
          }, function (e) { grup.forEach(function (u) { selesai(u, false, e); }); });
      })(urut.slice(i, i + MAKS_BATCH));
    }
  }

  function baca(fn, args) {
    var kunci = tulisEpoch + '|' + fn + '|' + JSON.stringify(args);
    if (inflight[kunci]) return inflight[kunci];
    var p = new Promise(function (res, rej) {
      if (!antrean) { antrean = []; setTimeout(gabung, 0); }
      antrean.push({ fn: fn, args: args, res: res, rej: rej });
    });
    var bersih = function () { delete inflight[kunci]; };
    p.then(bersih, bersih);
    inflight[kunci] = p;
    return p;
  }

  function jalankan(fn, args) {
    if (fn === 'getPublicUrl') return Promise.resolve(publicUrl_());
    if (fn === 'verifyLoginPin') return login_(args[0]);
    if (fn === 'changeLoginPin') return ubahPin_(args[0], args[1]);
    if (BACA.test(fn)) return baca(fn, args);
    tulisEpoch++;
    return panggilLangsung(fn, args);
  }

  function publicUrl_() {
    var u = location.href.split('#')[0].split('?')[0];
    u = u.replace(/[^\/]*$/, '') + 'public.html';
    return { success: true, url: u };
  }

  function login_(pin) {
    return kirim({ action: 'login', pin: String(pin) }).then(function (res) {
      if (res && res.ok && res.r && res.r.valid && res.r.token) {
        TOKEN = res.r.token; return { success: true, valid: true };
      }
      if (res && res.code === 'LOCKED') return { success: true, valid: false, locked: true, message: res.message };
      if (res && res.code === 'NOSETUP') throw Galat('Backend belum disiapkan. Jalankan setupBandhitsApi() di Apps Script.', 'NOSETUP');
      return { success: true, valid: false };
    });
  }

  function ubahPin_(lama, baru) {
    return panggilLangsung('changePin', [lama, baru]).then(function (r) {
      if (r && r.newToken) TOKEN = r.newToken; // token lama sudah dicabut server
      if (r) delete r.newToken;
      return r;
    });
  }

  // ---- Penyamaran google.script.run ----
  function pembuat(onOk, onGagal) {
    return new Proxy({}, {
      get: function (_, nama) {
        if (nama === 'withSuccessHandler') return function (f) { return pembuat(f, onGagal); };
        if (nama === 'withFailureHandler') return function (f) { return pembuat(onOk, f); };
        if (nama === 'withUserObject') return function () { return pembuat(onOk, onGagal); };
        if (typeof nama !== 'string' || nama === 'then') return undefined;
        return function () {
          var args = Array.prototype.slice.call(arguments);
          jalankan(nama, args).then(function (v) { if (onOk) onOk(v); },
            function (e) { if (onGagal) onGagal(e); else if (window.console) console.error(nama, e); });
        };
      }
    });
  }
  window.google = window.google || {};
  window.google.script = { run: pembuat(null, null) };

  // ---- Akses langsung (dashboard publik, info) ----
  window.BandhitsApi = {
    publicSnapshot: function () { return kirim({ action: 'public.snapshot' }).then(buka); },
    info: function () {
      if (BELUM_DIISI) return Promise.reject(Galat('Konfigurasi belum lengkap.', 'CONFIG'));
      return fetch(URL_ + '?action=info').then(function (r) { return r.json(); });
    },
    punyaSesi: function () { return !!TOKEN; },
    keluar: function () { var t = TOKEN; if (t) kirim({ action: 'logout' }).catch(function () {}); TOKEN = null; },
    _uji: { token: function () { return TOKEN; } }
  };
})();
