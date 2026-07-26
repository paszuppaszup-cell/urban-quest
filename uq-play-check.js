/* =========================================================
   URBAN QUEST — válasz-ellenőrzés a letöltött csomagból

   A befagyasztott pálya-csomag NEM tartalmaz nyers megoldást, csak
   sózott hash-t — így a telefonra letöltött adatból nem olvasható ki a
   válasz, mégis működik a kiértékelés net nélkül is.

   A normalizálás SZÁNDÉKOSAN azonos a szerveroldali norm_answer()-rel:
   ékezet le, kisbetű, minden nem alfanumerikus karakter törölve. Ha a
   kettő eltérne, a telefon mást mondana, mint a szerver — és a végén a
   szerver szava dönt.

   Publikus API: window.UQCheck
     .norm(sz)                 -> normalizált szöveg
     .helyes(feladat, valasz)  -> Promise<boolean>
     .tudEllenorizni(feladat)  -> van-e hash a feladathoz
   ========================================================= */
(function () {
  'use strict';

  function norm(s) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[̀-ͯ]/g, '')   // ékezetek eltávolítása
      .trim().toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  var enc = new TextEncoder();

  function hexbol(buf) {
    var b = new Uint8Array(buf), s = '';
    for (var i = 0; i < b.length; i++) s += (b[i] + 0x100).toString(16).slice(1);
    return s;
  }

  function hash(valasz, salt) {
    var alap = norm(valasz) + ':' + String(salt || '');
    if (!window.crypto || !crypto.subtle || !crypto.subtle.digest) {
      return Promise.reject(new Error('nincs crypto.subtle'));
    }
    return crypto.subtle.digest('SHA-256', enc.encode(alap)).then(hexbol);
  }

  function tudEllenorizni(f) {
    return !!(f && Array.isArray(f.answer_hashes) && f.answer_hashes.length && f.salt);
  }

  /**
   * @returns Promise<boolean>
   * Ha nincs hash a feladathoz (régi, beégetett adat), a hívó a saját
   * korábbi logikáját használja — ezt a tudEllenorizni() dönti el.
   */
  function helyes(f, valasz) {
    if (f && f.auto_ok) return Promise.resolve(true);      // fotó, GPS, QR, info
    if (!tudEllenorizni(f)) return Promise.resolve(false);
    if (norm(valasz) === '') return Promise.resolve(false);

    return hash(valasz, f.salt)
      .then(function (h) { return f.answer_hashes.indexOf(h) > -1; })
      .catch(function () {
        /* Nem tudunk hash-elni (régi böngésző, nem biztonságos eredet):
           elfogadjuk, és a szerver dönt a szinkronnál — a pontot úgyis
           ő számolja. Jobb, mint helyes választ elutasítani. */
        return true;
      });
  }

  window.UQCheck = { norm: norm, hash: hash, helyes: helyes, tudEllenorizni: tudEllenorizni };
})();
