/* Lingerie — интерактив лендинга (без зависимостей) */
(function () {
  'use strict';
  window.LINGERIE_READY = true;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var body = document.body;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  var desktop = window.matchMedia('(min-width: 1024px)');

  /* ---------- Toast ---------- */
  var toast = $('[data-toast]');
  var toastText = $('[data-toast-text]');
  var toastTimer;
  function showToast(text) {
    if (!toast) return;
    toastText.textContent = text;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('is-visible'); }, 2800);
  }

  function bump(el, cls) {
    if (!el) return;
    cls = cls || 'is-bump';
    el.classList.remove(cls);
    void el.offsetWidth; // перезапуск анимации
    el.classList.add(cls);
  }

  /* ---------- Шапка: состояние при прокрутке ---------- */
  var header = $('[data-header]');
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      var y = window.scrollY || window.pageYOffset;
      if (header) header.classList.toggle('is-scrolled', y > 24);
      ticking = false;
    });
  }

  /* ---------- Выпадающие панели: каталог и поиск ---------- */
  var openPanel = null;
  var openToggle = null;
  var hoverTimer;
  var hoverOpenedAt = 0;

  function setPanel(panel, toggle, open) {
    panel.classList.toggle('is-open', open);
    panel.setAttribute('aria-hidden', open ? 'false' : 'true');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  function closePanels(returnFocus) {
    if (!openPanel) return;
    var t = openToggle;
    setPanel(openPanel, openToggle, false);
    openPanel = openToggle = null;
    if (header) header.classList.remove('has-panel');
    if (returnFocus && t) t.focus();
  }

  function showPanel(panel, toggle) {
    if (openPanel === panel) return;
    closePanels(false);
    setPanel(panel, toggle, true);
    openPanel = panel;
    openToggle = toggle;
    if (header) header.classList.add('has-panel');
    if (panel.id === 'search') {
      var input = $('input', panel);
      if (input) setTimeout(function () { input.focus({ preventScroll: true }); }, 60);
    }
  }

  function bindPanel(toggle) {
    var panel = document.getElementById(toggle.getAttribute('aria-controls'));
    if (!panel) return;

    toggle.addEventListener('click', function () {
      if (openPanel === panel) {
        // если меню только что открылось наведением — клик его не закрывает
        if (Date.now() - hoverOpenedAt < 400) return;
        closePanels(false);
      } else {
        showPanel(panel, toggle);
      }
    });

    // Каталог открывается и по наведению (только мышь)
    if (toggle.hasAttribute('data-mega-toggle')) {
      var item = toggle.closest('.nav__item') || toggle;
      var enter = function () {
        if (!canHover.matches || !desktop.matches) return;
        clearTimeout(hoverTimer);
        if (openPanel !== panel) { showPanel(panel, toggle); hoverOpenedAt = Date.now(); }
      };
      var leave = function () {
        if (!canHover.matches || openPanel !== panel) return;
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () { if (openPanel === panel) closePanels(false); }, 260);
      };
      item.addEventListener('mouseenter', enter);
      item.addEventListener('mouseleave', leave);
      panel.addEventListener('mouseenter', function () { if (openPanel === panel) clearTimeout(hoverTimer); });
      panel.addEventListener('mouseleave', leave);
    }

    // Клик по ссылке внутри панели закрывает её
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) closePanels(false);
    });
  }

  $$('[data-mega-toggle], [data-search-toggle]').forEach(bindPanel);

  document.addEventListener('click', function (e) {
    if (openPanel && !e.target.closest('[data-header]')) closePanels(false);
  });

  // Поиск (демо: без серверной части)
  var searchForm = $('[data-search-form]');
  if (searchForm) {
    searchForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var input = $('input', searchForm);
      var q = input.value.trim();
      if (!q) { input.focus(); bump(searchForm, 'is-shake'); return; }
      closePanels(false);
      showToast('Ищем «' + q + '»…');
      input.value = '';
    });
  }

  /* ---------- Мобильное меню ---------- */
  var drawer = $('[data-drawer]');
  var drawerOpener = $('[data-drawer-open]');
  var lastFocus = null;

  function focusables(scope) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])', scope)
      .filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
  }

  function openDrawer() {
    if (!drawer || drawer.classList.contains('is-open')) return;
    closePanels(false);
    lastFocus = document.activeElement;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    if (drawerOpener) drawerOpener.setAttribute('aria-expanded', 'true');
    body.classList.add('is-locked');
    var closeBtn = $('.drawer__head [data-drawer-close]', drawer);
    setTimeout(function () { if (closeBtn) closeBtn.focus({ preventScroll: true }); }, 60);
  }

  function closeDrawer(returnFocus) {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    if (drawerOpener) drawerOpener.setAttribute('aria-expanded', 'false');
    body.classList.remove('is-locked');
    if (returnFocus !== false && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  if (drawer) {
    if (drawerOpener) drawerOpener.addEventListener('click', openDrawer);
    $$('[data-drawer-close]', drawer).forEach(function (el) { el.addEventListener('click', closeDrawer); });
    $$('[data-drawer-link]', drawer).forEach(function (el) {
      el.addEventListener('click', function () { closeDrawer(false); });
    });
    // Удерживаем фокус внутри открытого меню
    drawer.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab' || !drawer.classList.contains('is-open')) return;
      var list = focusables($('.drawer__panel', drawer));
      if (!list.length) return;
      var first = list[0];
      var last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    var onDesktop = function (mq) { if (mq.matches) closeDrawer(false); };
    if (desktop.addEventListener) desktop.addEventListener('change', onDesktop);
    else if (desktop.addListener) desktop.addListener(onDesktop);
  }

  // Аккордеон «Каталог» в мобильном меню
  $$('[data-accordion]').forEach(function (btn) {
    var target = document.getElementById(btn.getAttribute('aria-controls'));
    if (!target) return;
    btn.addEventListener('click', function () {
      var open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      target.hidden = !open;
    });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (drawer && drawer.classList.contains('is-open')) { closeDrawer(); return; }
    if (openPanel) closePanels(true);
  });

  /* ---------- Слайдер на первом экране ---------- */
  var hero = $('[data-hero]');
  if (hero) {
    var slides = $$('[data-slide]', hero);
    var dots = $$('[data-dot]', hero);
    var counter = $('[data-current]', hero);
    var controls = $('.hero__controls', hero);
    var current = 0;
    var autoplay = !reduceMotion.matches && slides.length > 1;
    var pause = { hover: false, focus: false, hidden: document.hidden };
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var syncPause = function () {
      hero.classList.toggle('is-paused', pause.hover || pause.focus || pause.hidden);
    };

    var go = function (index) {
      var n = slides.length;
      index = (index + n) % n;
      if (index === current) return;
      slides[current].classList.remove('is-active');
      slides[current].setAttribute('aria-hidden', 'true');
      if (dots[current]) { dots[current].classList.remove('is-active'); dots[current].removeAttribute('aria-current'); }
      current = index;
      slides[current].classList.add('is-active');
      slides[current].removeAttribute('aria-hidden');
      if (dots[current]) { dots[current].classList.add('is-active'); dots[current].setAttribute('aria-current', 'true'); }
      if (counter) counter.textContent = pad(current + 1);
    };

    // Автопрокрутка: слайд меняется, когда заполнится полоска прогресса
    if (autoplay) {
      hero.classList.add('is-autoplay');
      hero.addEventListener('animationend', function (e) {
        if (e.animationName === 'heroProgress') go(current + 1);
      });
    }

    dots.forEach(function (dot) {
      dot.addEventListener('click', function () { go(parseInt(dot.getAttribute('data-dot'), 10) || 0); });
    });
    var prev = $('[data-prev]', hero);
    var next = $('[data-next]', hero);
    if (prev) prev.addEventListener('click', function () { go(current - 1); });
    if (next) next.addEventListener('click', function () { go(current + 1); });

    hero.addEventListener('keydown', function (e) {
      if (!e.target.closest('.hero__controls')) return;
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
    });

    // Пауза: курсор на кнопках слайдера, фокус с клавиатуры, вкладка скрыта
    if (controls) {
      controls.addEventListener('mouseenter', function () { pause.hover = true; syncPause(); });
      controls.addEventListener('mouseleave', function () { pause.hover = false; syncPause(); });
    }
    hero.addEventListener('focusin', function (e) {
      var kb = false;
      try { kb = e.target.matches(':focus-visible'); } catch (err) { kb = true; }
      if (kb) { pause.focus = true; syncPause(); }
    });
    hero.addEventListener('focusout', function (e) {
      if (!hero.contains(e.relatedTarget)) { pause.focus = false; syncPause(); }
    });
    document.addEventListener('visibilitychange', function () { pause.hidden = document.hidden; syncPause(); });

    // Свайп на сенсорных экранах
    var sx = 0, sy = 0, tracking = false;
    hero.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse') return;
      tracking = true; sx = e.clientX; sy = e.clientY;
    });
    hero.addEventListener('pointerup', function (e) {
      if (!tracking) return;
      tracking = false;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.3) go(current + (dx < 0 ? 1 : -1));
    });
    hero.addEventListener('pointercancel', function () { tracking = false; });

    syncPause();
  }

  /* ---------- Избранное ---------- */
  var wishBadge = $('[data-wish-count]');
  var wishCount = 0;
  $$('.product__fav').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-pressed') !== 'true';
      var name = btn.getAttribute('data-name') || 'Товар';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.setAttribute('aria-label', (on ? 'Убрать из избранного: ' : 'Добавить в избранное: ') + name);
      bump(btn, 'is-pop');
      wishCount = Math.max(0, wishCount + (on ? 1 : -1));
      if (wishBadge) {
        wishBadge.textContent = wishCount;
        wishBadge.hidden = wishCount === 0;
        if (wishCount) bump(wishBadge);
      }
      showToast(on ? '«' + name + '» в избранном' : '«' + name + '» удалён из избранного');
    });
  });

  /* ---------- Корзина ---------- */
  var cartBadge = $('[data-cart-count]');
  var cartCount = cartBadge ? parseInt(cartBadge.textContent, 10) || 0 : 0;
  $$('[data-add-to-cart]').forEach(function (btn) {
    var original = btn.innerHTML;
    var resetTimer;
    btn.addEventListener('click', function () {
      cartCount += 1;
      if (cartBadge) { cartBadge.textContent = cartCount; bump(cartBadge); }
      btn.classList.add('is-added');
      btn.innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-check"/></svg>Добавлено';
      clearTimeout(resetTimer);
      resetTimer = setTimeout(function () { btn.classList.remove('is-added'); btn.innerHTML = original; }, 1800);
      showToast('«' + btn.getAttribute('data-add-to-cart') + '» добавлен в корзину');
    });
  });

  /* ---------- Подписка ---------- */
  var sub = $('[data-subscribe]');
  var note = $('[data-subscribe-note]');
  if (sub && note) {
    var input = $('input', sub);
    var defaultNote = note.innerHTML;
    var isEmail = function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); };
    sub.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = input.value.trim();
      note.classList.remove('is-ok', 'is-error');
      if (!isEmail(v)) {
        sub.classList.add('is-error');
        input.setAttribute('aria-invalid', 'true');
        note.classList.add('is-error');
        note.textContent = v ? 'Проверьте адрес — например, name@mail.ru' : 'Введите e-mail, чтобы подписаться';
        input.focus();
        return;
      }
      sub.classList.remove('is-error');
      input.removeAttribute('aria-invalid');
      note.classList.add('is-ok');
      note.textContent = 'Спасибо! Промокод −10% отправлен на ' + v;
      sub.reset();
    });
    input.addEventListener('input', function () {
      if (!sub.classList.contains('is-error')) return;
      sub.classList.remove('is-error');
      input.removeAttribute('aria-invalid');
      note.classList.remove('is-error');
      note.innerHTML = defaultNote;
    });
  }

  /* ---------- Год в подвале ---------- */
  $$('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Кнопка «Наверх» ---------- */
  var toTop = $('[data-to-top]');
  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion.matches ? 'auto' : 'smooth' });
      var logo = $('.site-header .logo');
      if (logo) logo.focus({ preventScroll: true });
    });
  }

  /* ---------- Плавное появление блоков ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion.matches) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
