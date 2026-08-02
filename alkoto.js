/* =========================================================
   URBAN QUEST — ALKOTÓ: A pályáim

   A játékos itt hozza létre és nevezi el a kalandját, majd innen lép tovább
   az állomásokhoz és a feladatokhoz.

   Két dolog, amit ez a felület máshogy kezel, mint az admin:

   1. NEM tesz élesre semmit. A szerző beküld, az adminisztrátor dönt. Ezt a
      szerver is így tudja: a save_course nem-adminnak nem engedi a `status`
      mezőt, tehát a felület nem is kínálja.
   2. A saját munkáján kívül nem lát mást. A lista a v_my_courses nézetből
      jön, ami a bejelentkezett felhasználó pályáira szűkít.
   ========================================================= */
(function () {
  'use strict';

  var KULCS = 'uq_alkoto_palya';        // melyik pályán dolgozik (oldalak közt)

  var palyak = [], aktiv = null, mentesOra = null;

  function $(s) { return document.querySelector(s); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;      // MINDIG textContent
    return e;
  }

  function aktivId() {
    try { return localStorage.getItem(KULCS) || null; } catch (e) { return null; }
  }
  function aktivIdMent(id) {
    try { if (id) localStorage.setItem(KULCS, id); else localStorage.removeItem(KULCS); } catch (e) {}
  }

  /* ---------- állapot-címkék ---------- */

  var ALLAPOT = {
    piszkozat:    { szo: 'Piszkozat',        cls: 'alk-a-piszkozat',
                    magyarazat: 'Még nálad van. Amikor kész, küldd be jóváhagyásra.' },
    beadva:       { szo: 'Jóváhagyásra vár', cls: 'alk-a-beadva',
                    magyarazat: 'Elküldted. Amíg el nem bírálják, nem szerkeszthető.' },
    elfogadva:    { szo: 'Közzétéve',        cls: 'alk-a-elfogadva',
                    magyarazat: 'Bárki játszhatja. Ha módosítasz, a változás csak új jóváhagyás után kerül ki.' },
    visszakuldve: { szo: 'Visszaküldve',     cls: 'alk-a-vissza',
                    magyarazat: 'A szerkesztő kért valamit. Javítsd, és küldd be újra.' }
  };

  /* ---------- lista ---------- */

  function renderLista() {
    var host = $('#palyaLista');
    host.innerHTML = '';

    if (!palyak.length) {
      var ures = el('div', 'alk-ures');
      ures.appendChild(el('b', null, 'Még nincs pályád.'));
      ures.appendChild(el('p', null,
        'Nyomd meg az „Új pálya" gombot, és néhány perc alatt összerakhatod az elsőt. ' +
        'Legalább 5, legfeljebb 20 állomásból állhat.'));
      host.appendChild(ures);
      return;
    }

    palyak.forEach(function (p) {
      var A = ALLAPOT[p.review] || ALLAPOT.piszkozat;
      var kartya = el('button', 'alk-kartya' + (aktiv && aktiv.id === p.id ? ' is-active' : ''));
      kartya.type = 'button';
      kartya.setAttribute('data-id', p.id);

      var bal = el('span', 'alk-kartya-bal');
      var borito = el('span', 'alk-kartya-kep');
      if (p.cover_image) borito.style.backgroundImage = 'url("' + encodeURI(p.cover_image) + '")';
      else borito.appendChild(el('span', 'alk-kartya-kep-ures', '—'));
      bal.appendChild(borito);

      var szoveg = el('span', 'alk-kartya-szoveg');
      szoveg.appendChild(el('b', null, p.name || '(névtelen pálya)'));
      szoveg.appendChild(el('small', null,
        p.allomas + ' állomás · ' + p.feladat + ' feladat' +
        (p.akadaly ? ' · ' + p.akadaly + ' javítanivaló' : '')));
      bal.appendChild(szoveg);
      kartya.appendChild(bal);

      kartya.appendChild(el('span', 'alk-cimke ' + A.cls, A.szo));
      host.appendChild(kartya);
    });

    host.querySelectorAll('.alk-kartya').forEach(function (b) {
      b.addEventListener('click', function () { valaszt(b.getAttribute('data-id')); });
    });
  }

  /* ---------- a kiválasztott pálya ---------- */

  function valaszt(id) {
    aktiv = palyak.filter(function (p) { return p.id === id; })[0] || null;
    aktivIdMent(aktiv ? aktiv.id : null);
    renderLista();
    renderPanel();
  }

  function renderPanel() {
    var panel = $('#palyaPanel');
    if (!aktiv) { panel.hidden = true; return; }
    panel.hidden = false;

    $('#panelCim').textContent = aktiv.name || '(névtelen pálya)';
    $('#fNev').value           = aktiv.name || '';
    $('#fOsszefoglalo').value  = aktiv.summary || '';
    $('#fLeiras').value        = aktiv.about || '';
    $('#fNehezseg').value      = aktiv.difficulty || 'kozepes';
    $('#fKategoria').value     = aktiv.category || 'varosi';
    $('#fVaros').value         = aktiv.city || '';

    var kep = $('#boritoKep');
    kep.innerHTML = '';
    if (aktiv.cover_image) {
      kep.style.backgroundImage = 'url("' + encodeURI(aktiv.cover_image) + '")';
      $('#boritoTorol').hidden = false;
    } else {
      kep.style.backgroundImage = '';
      kep.appendChild(el('span', null, 'Nincs kép'));
      $('#boritoTorol').hidden = true;
    }

    /* a szerkeszthetőség a szerver szabálya szerint */
    var zarva = (aktiv.review === 'beadva');
    panel.querySelectorAll('input, textarea, select, #boritoFeltolt, #boritoTorol')
      .forEach(function (x) { x.disabled = zarva; });

    renderAllapot();
    $('#tovabbPalyak').href    = 'alkoto-palya.html';
    $('#tovabbFeladatok').href = 'alkoto-feladat.html';
    $('#kiprobal').href        = 'jatszas.html?quest=' + encodeURIComponent(aktiv.slug || '') + '&elonezet=1';
  }

  function renderAllapot() {
    var sav = $('#allapotSav');
    sav.innerHTML = '';
    if (!aktiv) return;
    var A = ALLAPOT[aktiv.review] || ALLAPOT.piszkozat;

    var doboz = el('div', 'alk-allapot-doboz ' + A.cls);
    doboz.appendChild(el('b', null, A.szo));
    doboz.appendChild(el('p', null, A.magyarazat));

    if (aktiv.review === 'visszakuldve' && aktiv.review_note) {
      var uz = el('div', 'alk-uzenet');
      uz.appendChild(el('b', null, 'A szerkesztő üzenete:'));
      uz.appendChild(el('p', null, aktiv.review_note));   // MÁS szövege → textContent
      doboz.appendChild(uz);
    }

    /* Mi hiányzik még a beküldéshez? Ugyanaz a lista, amit a szerver is néz —
       jobb itt megmutatni, mint a beküldésnél hibaüzenetként. */
    var hiba = [];
    if (aktiv.allomas < 5)  hiba.push('Még ' + (5 - aktiv.allomas) + ' állomás kell (legalább 5).');
    if (aktiv.allomas > 20) hiba.push('Túl sok állomás: ' + aktiv.allomas + ' (legfeljebb 20).');
    (aktiv.akadalyok || []).forEach(function (a) { hiba.push(a); });

    if (hiba.length && aktiv.review !== 'beadva') {
      var lista = el('div', 'alk-hianyok');
      lista.appendChild(el('b', null, 'Ez hiányzik még a beküldéshez:'));
      var ul = el('ul');
      hiba.slice(0, 8).forEach(function (h) { ul.appendChild(el('li', null, h)); });
      if (hiba.length > 8) ul.appendChild(el('li', null, '…és még ' + (hiba.length - 8) + ' dolog'));
      lista.appendChild(ul);
      doboz.appendChild(lista);
    }
    sav.appendChild(doboz);

    $('#bekuld').disabled = (aktiv.review === 'beadva') || hiba.length > 0;
    $('#bekuld').textContent = (aktiv.review === 'beadva') ? 'Jóváhagyásra vár' : 'Beküldés jóváhagyásra';
  }

  /* ---------- mentés ---------- */

  /* Automatikus mentés: nincs gomb, nincs elveszett munka. A gépelést
     megvárjuk, hogy ne induljon kérés minden leütésre. */
  function utemezMentes() {
    if (!aktiv || aktiv.review === 'beadva') return;
    if (mentesOra) clearTimeout(mentesOra);
    mentesOra = setTimeout(ment, 700);
  }

  function ment() {
    if (!aktiv) return Promise.resolve();
    var p = {
      id: aktiv.id,
      name: $('#fNev').value.trim() || 'Névtelen pálya',
      summary: $('#fOsszefoglalo').value.trim(),
      about: $('#fLeiras').value.trim(),
      difficulty: $('#fNehezseg').value,
      category: $('#fKategoria').value,
      city: $('#fVaros').value.trim(),
      team_min: $('#fCsapatMin').value,
      team_max: $('#fCsapatMax').value
    };
    return UQAPI.rest('/rpc/save_course', { method: 'POST', body: { p: p } })
      .then(function () {
        jelezMentve();
        return tolt(true);
      })
      .catch(function (e) { hiba(e); });
  }

  function jelezMentve() {
    var j = $('#mentveJelzes');
    j.hidden = false;
    j.classList.add('is-lathato');
    setTimeout(function () { j.classList.remove('is-lathato'); }, 1600);
  }

  function hiba(e) {
    var sav = $('#allapotSav');
    var d = el('div', 'alk-allapot-doboz alk-a-vissza');
    d.appendChild(el('b', null, 'Nem sikerült menteni'));
    d.appendChild(el('p', null, (e && e.message) || 'Hálózati hiba. Próbáld újra.'));
    sav.insertBefore(d, sav.firstChild);
  }

  /* ---------- borítókép ---------- */

  function boritoFeltoltes(file) {
    var u = UQAPI.user();
    if (!u || !file) return;
    /* A szerző MINDIG a saját mappájába tölt — a tároló házirendje is ezt
       követeli meg, más mappájába nem is tudna írni. */
    var nev = String(file.name || 'kep')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-50) || 'kep';
    var ut = 'szerzo/' + u.id + '/' + UQAPI.uuid().slice(0, 8) + '-' + nev;

    $('#boritoFeltolt').disabled = true;
    UQAPI.upload(file, { path: ut })
      .then(function (r) {
        return UQAPI.rest('/rpc/save_course', {
          method: 'POST', body: { p: { id: aktiv.id, cover_image: r.url } }
        });
      })
      .then(function () { return tolt(true); })
      .catch(function (e) { hiba(e); })
      .then(function () { $('#boritoFeltolt').disabled = false; });
  }

  /* ---------- betöltés ---------- */

  function tolt(csendben) {
    return UQAPI.rest('/v_my_courses?select=*&order=updated_at.desc')
      .then(function (sorok) {
        palyak = sorok || [];
        var id = aktiv ? aktiv.id : aktivId();
        aktiv = palyak.filter(function (p) { return p.id === id; })[0] || null;
        if (!aktiv && palyak.length && !csendben) aktiv = palyak[0];
        aktivIdMent(aktiv ? aktiv.id : null);
        renderLista();
        renderPanel();
      })
      .catch(function (e) {
        if (!csendben) {
          var host = $('#palyaLista');
          host.innerHTML = '';
          var d = el('div', 'alk-ures');
          d.appendChild(el('b', null, 'A pályáid nem tölthetők be.'));
          d.appendChild(el('p', null, (e && e.message) || ''));
          host.appendChild(d);
        }
      });
  }

  /* ---------- események ---------- */

  ['#fNev', '#fOsszefoglalo', '#fLeiras', '#fVaros'].forEach(function (s) {
    var e = $(s); if (e) e.addEventListener('input', utemezMentes);
  });
  ['#fNehezseg', '#fKategoria', '#fCsapatMin', '#fCsapatMax'].forEach(function (s) {
    var e = $(s); if (e) e.addEventListener('change', utemezMentes);
  });

  $('#ujPalya').addEventListener('click', function () {
    UQAPI.rest('/rpc/save_course', { method: 'POST', body: { p: { name: 'Új kalandom' } } })
      .then(function (r) {
        var uj = Array.isArray(r) ? r[0] : r;
        aktivIdMent(uj && uj.id);
        aktiv = null;
        return tolt(false);
      })
      .catch(function (e) { hiba(e); });
  });

  $('#boritoFeltolt').addEventListener('click', function () { $('#boritoInput').click(); });
  $('#boritoInput').addEventListener('change', function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (f) boritoFeltoltes(f);
  });
  $('#boritoTorol').addEventListener('click', function () {
    UQAPI.rest('/rpc/save_course', { method: 'POST', body: { p: { id: aktiv.id, cover_image: '' } } })
      .then(function () { return tolt(true); })
      .catch(hiba);
  });

  $('#bekuld').addEventListener('click', function () {
    if (!aktiv) return;
    var b = this;
    b.disabled = true;
    /* Mentünk egyet, hogy a legfrissebb szöveg menjen be. */
    ment().then(function () {
      return UQAPI.rest('/rpc/submit_course', { method: 'POST', body: { p_course: aktiv.id } });
    }).then(function () {
      if (window.UQTrack) UQTrack.esemeny('kuldetes_megnyitva', aktiv.slug || null);
      return tolt(true);
    }).catch(function (e) {
      hiba(e); b.disabled = false;
    });
  });

  /* ---------- indulás ---------- */

  function indul() {
    if (!window.UQAPI || !UQAPI.user()) {
      var host = $('#palyaLista');
      host.innerHTML = '';
      var d = el('div', 'alk-ures');
      d.appendChild(el('b', null, 'Jelentkezz be'));
      d.appendChild(el('p', null, 'Pályát csak bejelentkezve tudsz készíteni — így tudjuk, hogy a tiéd.'));
      var a = el('a', 'adm-btn adm-btn-lime', 'Bejelentkezés');
      a.href = 'bejelentkezes.html?next=alkoto.html';
      d.appendChild(a);
      host.appendChild(d);
      $('#ujPalya').disabled = true;
      return;
    }
    $('#ujPalya').disabled = false;
    UQAPI.ready().then(function () { tolt(false); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', indul);
  else indul();
  if (window.UQAPI && UQAPI.onAuth) UQAPI.onAuth(function () { indul(); });
})();
