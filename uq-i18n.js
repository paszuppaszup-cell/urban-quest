/* =========================================================
   URBAN QUEST — TÖBBNYELVŰSÉG (hu · en · de · fr · es · it)

   Működés: a lap magyarul készül, ez a motor a látható szövegcsomópontokat
   és a beszédes attribútumokat (placeholder, aria-label, title, alt)
   fordítja le egy szótárból. Az eredeti magyar szöveget megjegyzi, ezért a
   nyelvek között oda-vissza lehet váltani, és a DINAMIKUSAN beszúrt
   tartalmat (kártyák, modálok) is elkapja egy MutationObserver.

   A szótár: window.UQI18N = { "Magyar szöveg": {en:"…",de:"…",…}, … } —
   az i18n/*.js fájlok töltik fel (oldalanként + közös).

   Ami SZÁNDÉKOSAN magyarul marad: a pályák tartalma (nevek, leírások,
   kérdések) — az adat, nem a felület. Azt a szerkesztő írja meg más
   nyelven, ha akarja.
   ========================================================= */
(function () {
  'use strict';

  var NYELVEK = ['hu', 'en', 'de', 'fr', 'es', 'it'];
  var NEV = { hu: 'Magyar', en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano' };
  var KULCS = 'uq_lang_v1';
  var ATTROK = ['placeholder', 'aria-label', 'title', 'alt'];

  window.UQI18N = window.UQI18N || {};

  function nyelv() {
    try {
      var v = localStorage.getItem(KULCS);
      return NYELVEK.indexOf(v) > -1 ? v : 'hu';
    } catch (e) { return 'hu'; }
  }

  /* eredeti magyar szövegek — csomópontonként megjegyezve */
  var eredeti = new WeakMap();

  function fordit(szoveg, cel) {
    var kulcs = szoveg.trim();
    if (!kulcs) return null;
    var sor = window.UQI18N[kulcs];
    if (!sor) return null;
    if (cel === 'hu') return kulcs;
    return sor[cel] || null;
  }

  function csomopont(n, cel) {
    var volt = eredeti.get(n);
    var forras = volt != null ? volt : n.nodeValue;
    /* Magyarra váltás = az eredeti visszaállítása. A csere MINDIG az
       eredeti magyar szövegből indul — ha az aktuális (már lefordított)
       tartalmon dolgoznánk, a nyelvek között nem lehetne visszaváltani. */
    if (cel === 'hu') {
      if (volt != null) n.nodeValue = volt;
      return;
    }
    var uj = fordit(forras, cel);
    if (uj == null) {
      if (volt != null) n.nodeValue = volt;   // erre a nyelvre nincs fordítás
      return;
    }
    if (volt == null) eredeti.set(n, n.nodeValue);
    /* a szöveg körüli térközök maradjanak, csak a törzs cserélődik */
    n.nodeValue = forras.replace(forras.trim(), uj);
  }

  function attrCsere(el, nevAttr, cel) {
    var kulcsA = 'uqI18n' + nevAttr.replace(/-(.)/g, function (_, c) { return c.toUpperCase(); });
    var volt = el.dataset ? el.dataset[kulcsA] : null;
    var forras = volt != null ? volt : el.getAttribute(nevAttr);
    if (!forras) return;
    if (cel === 'hu') {
      if (volt != null) el.setAttribute(nevAttr, volt);
      return;
    }
    var uj = fordit(forras, cel);
    if (uj == null) {
      if (volt != null) el.setAttribute(nevAttr, volt);
      return;
    }
    if (volt == null && el.dataset) el.dataset[kulcsA] = forras;
    el.setAttribute(nevAttr, uj);
  }

  var forditasFut = false;
  function bejar(gyoker, cel) {
    forditasFut = true;
    try {
      var seta = document.createTreeWalker(gyoker, NodeFilter.SHOW_TEXT, {
        acceptNode: function (n) {
          var p = n.parentNode;
          if (!p) return NodeFilter.FILTER_REJECT;
          var t = p.nodeName;
          if (t === 'SCRIPT' || t === 'STYLE' || t === 'NOSCRIPT' || t === 'TEXTAREA') return NodeFilter.FILTER_REJECT;
          if (!n.nodeValue || !n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      });
      var n;
      while ((n = seta.nextNode())) csomopont(n, cel);

      var elemek = (gyoker.querySelectorAll ? gyoker : document)
        .querySelectorAll('[placeholder],[aria-label],[title],[alt]');
      elemek.forEach(function (el) {
        ATTROK.forEach(function (a) { if (el.hasAttribute(a)) attrCsere(el, a, cel); });
      });
      document.documentElement.lang = cel;
    } finally { forditasFut = false; }
  }

  function alkalmaz(cel) {
    try { localStorage.setItem(KULCS, cel); } catch (e) {}
    bejar(document.body, cel);
    frissitValaszto(cel);
    document.dispatchEvent(new CustomEvent('uq:lang', { detail: cel }));
  }

  /* ---------- a fejléc nyelvválasztója ----------
     A meglévő menüt vesszük át: mind a hat nyelvet felkínálja, és a
     kattintás tényleg vált — korábban csak a feliratot cserélte. */
  function frissitValaszto(cel) {
    var cur = document.querySelector('.lang-current');
    if (cur) cur.textContent = cel.toUpperCase();
    document.querySelectorAll('.lang-menu [data-lang], .lang-menu [role="option"]').forEach(function (o) {
      o.setAttribute('aria-selected', String((o.dataset.lang || '').toLowerCase() === cel));
    });
  }

  function epitValaszto() {
    var menu = document.querySelector('.lang-menu');
    if (!menu) return;
    menu.innerHTML = NYELVEK.map(function (k) {
      return '<button type="button" role="option" data-lang="' + k + '" aria-selected="false">' +
        '<b>' + k.toUpperCase() + '</b> ' + NEV[k] + '</button>';
    }).join('');
    menu.addEventListener('click', function (e) {
      var b = e.target.closest('[data-lang]');
      if (!b) return;
      alkalmaz(b.dataset.lang.toLowerCase());
      var lang = b.closest('.lang');
      if (lang) lang.classList.remove('is-open');
    });
  }

  /* ---------- dinamikus tartalom ---------- */
  var figyelo = null;
  function figyel() {
    if (figyelo || !window.MutationObserver) return;
    figyelo = new MutationObserver(function (valtozasok) {
      if (forditasFut) return;
      var cel = nyelv();
      if (cel === 'hu') return;
      valtozasok.forEach(function (v) {
        v.addedNodes.forEach(function (n) {
          if (n.nodeType === 1) bejar(n, cel);
          else if (n.nodeType === 3 && n.parentNode) csomopont(n, cel);
        });
      });
    });
    figyelo.observe(document.body, { childList: true, subtree: true });
  }

  function indul() {
    epitValaszto();
    var cel = nyelv();
    frissitValaszto(cel);
    if (cel !== 'hu') bejar(document.body, cel);
    figyel();
  }

  window.UQLang = { get: nyelv, set: alkalmaz, NYELVEK: NYELVEK };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', indul);
  else indul();
})();
