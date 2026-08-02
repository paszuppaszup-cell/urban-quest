/* =========================================================
   URBAN QUEST — ADMIN: JÓVÁHAGYÁS

   Ide futnak be a játékosok beküldött pályái. Három dolgot kell tudni róla:

   1. A döntés SOHA nem vak. Minden sorhoz jár egy „Végigjátszom" gomb, ami a
      befagyasztott csomagot nyitja meg — pont azt, amit a játékos kapna.
   2. A visszaküldés indoklás nélkül nem megy át. A szerver is így tudja
      (review_course), de itt már a gomb sem enged tovább üresen — a szerzőnek
      a „nem felelt meg" önmagában semmit nem mond.
   3. A szerző szövege és a képei MÁS ember tartalma. Minden szöveg
      textContent-tel megy ki, a kép pedig `referrerpolicy="no-referrer"`
      attribútummal, hogy a megnyitás ne szivárogtasson.
   ========================================================= */
(function () {
  'use strict';

  var sorok = [], szuro = 'beadva';

  function $(s) { return document.querySelector(s); }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function mikor(iso) {
    if (!iso) return '—';
    var t = Date.parse(iso); if (isNaN(t)) return '—';
    var mp = Math.round((Date.now() - t) / 1000);
    if (mp < 3600) return Math.max(1, Math.floor(mp / 60)) + ' perce';
    if (mp < 86400) return Math.floor(mp / 3600) + ' órája';
    if (mp < 7 * 86400) return Math.floor(mp / 86400) + ' napja';
    return new Date(t).toLocaleDateString('hu-HU', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function ures(cim, alcim) {
    var host = $('#lista'); host.innerHTML = '';
    var d = el('div', 'jh-ures');
    d.appendChild(el('b', null, cim));
    if (alcim) d.appendChild(el('p', null, alcim));
    host.appendChild(d);
  }

  /* ---------- egy sor ---------- */

  function kartya(p) {
    var k = el('article', 'jh-kartya');

    /* fej: kép + cím + szerző */
    var fej = el('div', 'jh-fej');
    var kep = el('div', 'jh-kep');
    if (p.cover_image) {
      var img = document.createElement('img');
      img.src = p.cover_image;
      img.alt = '';
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';   // MÁS ember képe
      kep.appendChild(img);
    } else {
      kep.appendChild(el('span', 'jh-kep-ures', 'nincs borító'));
    }
    fej.appendChild(kep);

    var cim = el('div', 'jh-cim-blokk');
    cim.appendChild(el('h2', null, p.name || '(névtelen)'));
    var meta = el('p', 'jh-meta');
    meta.appendChild(el('span', null, 'Szerző: ' + (p.szerzo || '(ismeretlen)')));
    meta.appendChild(el('span', null, p.allomas + ' állomás · ' + p.feladat + ' feladat'));
    meta.appendChild(el('span', null, p.review === 'beadva'
      ? ('beküldve ' + mikor(p.submitted_at))
      : ('elbírálva ' + mikor(p.reviewed_at))));
    cim.appendChild(meta);
    if (p.summary) cim.appendChild(el('p', 'jh-osszefoglalo', p.summary));
    fej.appendChild(cim);
    k.appendChild(fej);

    /* jelzések */
    var jelek = el('div', 'jh-jelek');
    if (p.akadaly) {
      var a = el('span', 'jh-jel jh-jel-rossz', p.akadaly + ' akadály');
      a.title = (p.akadalyok || []).join('\n');
      jelek.appendChild(a);
    } else {
      jelek.appendChild(el('span', 'jh-jel jh-jel-jo', 'nincs akadály'));
    }
    if (p.elbiralas_ota_valtozott) {
      jelek.appendChild(el('span', 'jh-jel jh-jel-fig', 'az elbírálás óta hozzányúltak'));
    }
    if (p.review === 'elfogadva') jelek.appendChild(el('span', 'jh-jel jh-jel-jo', 'közzétéve'));
    if (p.review === 'visszakuldve') jelek.appendChild(el('span', 'jh-jel jh-jel-fig', 'visszaküldve'));
    k.appendChild(jelek);

    if (p.akadaly) {
      var lista = el('ul', 'jh-akadalyok');
      (p.akadalyok || []).slice(0, 6).forEach(function (x) { lista.appendChild(el('li', null, x)); });
      if ((p.akadalyok || []).length > 6) {
        lista.appendChild(el('li', null, '…és még ' + (p.akadalyok.length - 6) + ' dolog'));
      }
      k.appendChild(lista);
    }

    if (p.review_note) {
      var uz = el('div', 'jh-korabbi');
      uz.appendChild(el('b', null, 'Korábbi üzeneted:'));
      uz.appendChild(el('p', null, p.review_note));
      k.appendChild(uz);
    }

    /* műveletek */
    var mv = el('div', 'jh-muveletek');

    var jatszd = el('a', 'adm-btn', 'Végigjátszom');
    jatszd.href = 'jatszas.html?quest=' + encodeURIComponent(p.slug || '') + '&elonezet=1';
    jatszd.target = '_blank'; jatszd.rel = 'noopener';
    mv.appendChild(jatszd);

    if (p.review === 'beadva') {
      var ok = el('button', 'adm-btn adm-btn-lime', 'Jóváhagyom és élesítem');
      ok.type = 'button';
      ok.addEventListener('click', function () { dontes(p, true, ok); });
      mv.appendChild(ok);

      var vissza = el('button', 'adm-btn jh-vissza-gomb', 'Visszaküldöm');
      vissza.type = 'button';
      vissza.addEventListener('click', function () { visszakuldoDoboz(k, p); });
      mv.appendChild(vissza);
    }
    k.appendChild(mv);

    return k;
  }

  /* ---------- visszaküldés ---------- */

  function visszakuldoDoboz(kartyaEl, p) {
    if (kartyaEl.querySelector('.jh-visszadoboz')) return;
    var d = el('div', 'jh-visszadoboz');
    d.appendChild(el('label', 'jh-vissza-cimke', 'Mit javítson a szerző? Ezt ő szó szerint megkapja.'));
    var ta = document.createElement('textarea');
    ta.rows = 3;
    ta.maxLength = 600;
    ta.placeholder = 'pl. A 3. állomás koordinátája a Duna közepén van — tedd a partra.';
    d.appendChild(ta);

    var sor = el('div', 'jh-vissza-sor');
    var kuld = el('button', 'adm-btn adm-btn-lime', 'Visszaküldés');
    kuld.type = 'button'; kuld.disabled = true;
    var megse = el('button', 'adm-btn', 'Mégse');
    megse.type = 'button';
    megse.addEventListener('click', function () { d.remove(); });
    sor.appendChild(kuld); sor.appendChild(megse);
    d.appendChild(sor);

    /* Üres indoklással nem enged tovább — a szerzőnek tudnia kell, mit tegyen. */
    ta.addEventListener('input', function () { kuld.disabled = ta.value.trim().length < 5; });
    kuld.addEventListener('click', function () { dontes(p, false, kuld, ta.value.trim()); });

    kartyaEl.appendChild(d);
    ta.focus();
  }

  function dontes(p, jovahagy, gomb, jegyzet) {
    gomb.disabled = true;
    var regi = gomb.textContent;
    gomb.textContent = jovahagy ? 'Élesítés…' : 'Küldés…';

    UQAPI.rest('/rpc/review_course', {
      method: 'POST',
      body: { p_course: p.id, p_approve: !!jovahagy, p_note: jegyzet || null }
    })
      .then(function () { return tolt(); })
      .catch(function (e) {
        gomb.disabled = false; gomb.textContent = regi;
        var host = $('#lista');
        var d = el('div', 'jh-hiba');
        d.appendChild(el('b', null, jovahagy ? 'Nem sikerült élesíteni' : 'Nem sikerült visszaküldeni'));
        d.appendChild(el('p', null, (e && e.message) || 'Hálózati hiba.'));
        host.insertBefore(d, host.firstChild);
      });
  }

  /* ---------- lista ---------- */

  function render() {
    var host = $('#lista');
    var lista = sorok.filter(function (p) { return p.review === szuro; });

    if (!lista.length) {
      if (szuro === 'beadva') {
        ures('Nincs jóváhagyásra váró pálya.',
             'Amint egy játékos beküldi a kalandját, itt jelenik meg — végigjátszható előnézettel.');
      } else if (szuro === 'elfogadva') {
        ures('Még nincs közzétett játékos-pálya.', 'Ami átment a jóváhagyáson, itt marad meg.');
      } else {
        ures('Nincs visszaküldött pálya.', 'Amit javításra adtál vissza, itt látod.');
      }
      return;
    }
    host.innerHTML = '';
    lista.forEach(function (p) { host.appendChild(kartya(p)); });
  }

  function jelvenyFrissit() {
    var db = sorok.filter(function (p) { return p.review === 'beadva'; }).length;
    document.querySelectorAll('#varakozoDb').forEach(function (j) {
      j.textContent = db ? String(db) : '';
      j.hidden = !db;
    });
    document.querySelectorAll('.jh-tab').forEach(function (t) {
      if (t.dataset.szuro !== 'beadva') return;
      t.textContent = db ? ('Vár rád (' + db + ')') : 'Vár rád';
    });
  }

  function tolt() {
    return UQAPI.rest('/v_review_queue?select=*&order=submitted_at.desc.nullslast')
      .then(function (r) { sorok = r || []; jelvenyFrissit(); render(); })
      .catch(function (e) {
        ures('A lista nem tölthető be.', (e && e.message) || '');
      });
  }

  /* ---------- események ---------- */

  document.querySelectorAll('.jh-tab').forEach(function (t) {
    t.addEventListener('click', function () {
      szuro = t.dataset.szuro;
      document.querySelectorAll('.jh-tab').forEach(function (x) {
        x.classList.toggle('is-active', x === t);
      });
      render();
    });
  });

  function indul() {
    if (!window.UQAPI || !UQAPI.user()) {
      ures('Nem vagy bejelentkezve.', 'A beküldött pályák elbírálásához admin fiók kell.');
      return;
    }
    UQAPI.ready().then(tolt);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', indul);
  else indul();
  if (window.UQAPI && UQAPI.onAuth) UQAPI.onAuth(function () { indul(); });
})();
