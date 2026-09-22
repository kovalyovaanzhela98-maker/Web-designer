/* KOVALEVA A — shared behaviour for every page.
   i18n · clock · header · progress · reveal · split headlines · pointer FX + cursor · to-top · project CTA · images · video slot */
(function(){
  "use strict";
  var doc = document, root = doc.documentElement;
  var $  = function(s,c){return (c||doc).querySelector(s);};
  var $$ = function(s,c){return Array.prototype.slice.call((c||doc).querySelectorAll(s));};
  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mqFine   = window.matchMedia("(hover: hover) and (pointer: fine)");
  var motionOK = !mqReduce.matches;

  function readStore(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }
  function writeStore(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }

  root.classList.add("js");
  if(motionOK && "IntersectionObserver" in window) root.classList.add("anim");

  /* ---------------- i18n (common + page dictionary) ---------------- */
  var COMMON = {
    en:{
      "nav.home":"Home","nav.works":"Works","nav.skills":"Skills","nav.contact":"Contact",
      "nav.back":"Back","nav.menu":"Menu","nav.skip":"Skip to content",
      "loc":"Minsk, Belarus",
      "footer.legal":"© 2026 · Designed & built with intention",
      "case.visit":"Visit site","case.prev":"Previous project","case.next":"Next project",
      "video.title":"Site presentation","video.copy":"A short screen recording of the live site: first screen, scroll, key interactions and the adaptive layouts.","qpvideo.title":"Site prototype","qpvideo.copy":"An interactive website prototype showing the key screens, user flows, interactions and responsive states.",
      "video.slot":"Video goes here","video.hint":"MP4 / WebM · 16:9 · 1920×1080",
      "cap.tag":"in the image",
      "nav.top":"Back to top",
      "cta.status":"Open for projects","cta.close":"Close","cta.title":"Like the approach? Let’s build yours.",
      "cta.text":"Tell me about your product or task — I’ll reply with a clear plan for where to start.",
      "cta.btn":"Start a project","cta.alt":"or message me on LinkedIn"
    },
    ru:{
      "nav.home":"Главная","nav.works":"Работы","nav.skills":"Навыки","nav.contact":"Контакты",
      "nav.back":"Назад","nav.menu":"Меню","nav.skip":"Перейти к содержимому",
      "loc":"Минск, Беларусь",
      "footer.legal":"© 2026 · Спроектировано и собрано осознанно",
      "case.visit":"Посетить сайт","case.prev":"Предыдущий проект","case.next":"Следующий проект",
      "video.title":"Презентация сайта","video.copy":"Короткая запись экрана живого сайта: первый экран, скролл, ключевые взаимодействия и адаптивы.","qpvideo.title":"Прототип сайта","qpvideo.copy":"Интерактивный прототип сайта: ключевые экраны, сценарии взаимодействия и адаптивные состояния.",
      "video.slot":"Здесь будет видео","video.hint":"MP4 / WebM · 16:9 · 1920×1080",
      "cap.tag":"на изображении",
      "nav.top":"Наверх",
      "cta.status":"Открыта к проектам","cta.close":"Закрыть","cta.title":"Нравится подход? Сделаем ваш проект.",
      "cta.text":"Расскажите о продукте или задаче — отвечу и предложу понятный план, с чего начать.",
      "cta.btn":"Начать проект","cta.alt":"или напишите в LinkedIn"
    }
  };
  var PAGE = window.PAGE_I18N || {en:{},ru:{}};
  function dict(lang){
    var d = {}, k;
    for(k in COMMON[lang]) d[k] = COMMON[lang][k];
    for(k in (PAGE[lang]||{})) d[k] = PAGE[lang][k];
    return d;
  }
  var lang = "en";
  function applyLang(next){
    lang = (next === "ru") ? "ru" : "en";
    var d = dict(lang);
    root.lang = lang;
    $$("[data-i18n]").forEach(function(el){
      var v = d[el.getAttribute("data-i18n")];
      if(v == null) return;
      if(v.indexOf("<") !== -1) el.innerHTML = v; else el.textContent = v;
    });
    $$("[data-i18n-aria]").forEach(function(el){
      var v = d[el.getAttribute("data-i18n-aria")];
      if(v != null) el.setAttribute("aria-label", v);
    });
    if(d["meta.title"]) doc.title = d["meta.title"];
    $$(".lang").forEach(function(box){
      box.setAttribute("data-lang", lang);
      $$("[data-set-lang]", box).forEach(function(b){
        b.setAttribute("aria-pressed", String(b.getAttribute("data-set-lang") === lang));
      });
    });
    splitAll();
    root.classList.remove("i18n-wait");
    writeStore("ak-lang", lang);
  }

  /* ---------------- split headlines into words ---------------- */
  var SPLIT_SEL = ".hero-name,.block-title,.section-heading,.hero-title,.contact-title,.cn-name";
  function splitEl(el){
    var n = 0;
    (function walk(node){
      var kids = Array.prototype.slice.call(node.childNodes);
      kids.forEach(function(k){
        if(k.nodeType === 3){
          var parts = k.textContent.split(/(\s+)/);
          if(!k.textContent.trim()) return;
          var frag = doc.createDocumentFragment();
          parts.forEach(function(p){
            if(!p) return;
            if(/^\s+$/.test(p)){ frag.appendChild(doc.createTextNode(" ")); return; }
            var w = doc.createElement("span"); w.className = "w";
            var wi = doc.createElement("span"); wi.className = "wi"; wi.textContent = p;
            wi.style.setProperty("--wd", n++);
            w.appendChild(wi); frag.appendChild(w);
          });
          node.replaceChild(frag, k);
        } else if(k.nodeType === 1 && k.tagName !== "BR" && !k.classList.contains("w")){
          walk(k);
        }
      });
    })(el);
    el.classList.add("split");
  }
  function splitAll(){
    $$(SPLIT_SEL).forEach(function(el){
      // (re)split whenever bare text nodes exist — first run, or after an i18n swap
      var hasBare = false;
      (function scan(n){ Array.prototype.forEach.call(n.childNodes,function(c){
        if(c.nodeType===3 && c.textContent.trim()) hasBare = true;
        else if(c.nodeType===1 && !c.classList.contains("w")) scan(c);
      }); })(el);
      if(hasBare) splitEl(el);
      if(!el.hasAttribute("data-reveal")) el.setAttribute("data-reveal","split");
    });
  }

  /* ---------------- reveal on scroll ---------------- */
  var AUTO = [
    [".hero-top, .hero-head, .hero-sub, .hero-links", ""],
    [".proof-pill, .proj, .skill-card, .quote-card, .career-row, .info-card, .decision, .persona, .stage-card, .swatch, .value, .quote, .metric, .change, .point, .case-nav__item,  .case-nav__center, .option", "stagger"],
    [".visit-bar", ""],
    [".hero-intro > *, .two-col-head > p, .problem-copy > p, .result-head > p, .skills-intro > p, .caption, .type-row, .filters, .contact-copy .lead, .contact-actions", ""],
    [".big-visual, .video-slot, .marketing-block .media", "img"],
    [".accent-panel, .contact", "scale"]
  ];
  function markReveal(){
    AUTO.forEach(function(pair){
      $$(pair[0]).forEach(function(el){
        if(el.hasAttribute("data-reveal")) return;
        if(pair[1] === "stagger"){
          el.setAttribute("data-reveal","");
          var sibs = Array.prototype.filter.call(el.parentNode.children,function(c){return c.matches && c.matches(pair[0]);});
          var i = sibs.indexOf(el);
          el.style.setProperty("--d", (Math.min(i,6) * 0.08) + "s");
        } else {
          el.setAttribute("data-reveal", pair[1]);
        }
      });
    });
  }
  var io = null;
  function observeReveal(){
    if(!root.classList.contains("anim")){ $$("[data-reveal]").forEach(function(el){ el.classList.add("is-in"); }); return; }
    io = io || new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting){ en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    },{rootMargin:"0px 0px -8% 0px",threshold:0.08});
    $$("[data-reveal]:not(.is-in)").forEach(function(el){ io.observe(el); });
  }

  /* ---------------- clock ---------------- */
  var fmt = null;
  try{ fmt = new Intl.DateTimeFormat("en-GB",{timeZone:"Europe/Minsk",hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false}); }catch(e){}
  function tick(){
    var s;
    if(fmt){ s = fmt.format(new Date()); }
    else { var d = new Date(); s = ("0"+d.getHours()).slice(-2)+":"+("0"+d.getMinutes()).slice(-2)+":"+("0"+d.getSeconds()).slice(-2); }
    $$(".clock").forEach(function(c){ c.textContent = s; });
  }

  /* ---------------- header, burger, active nav ---------------- */
  function initHeader(){
    var hdr = $("#hdr"), burger = $("#burger"), mnav = $("#mobileNav");
    if(burger && mnav){
      var setOpen = function(open){
        burger.setAttribute("aria-expanded", String(open));
        mnav.classList.toggle("is-open", open);
        mnav.toggleAttribute("inert", !open);
      };
      setOpen(false);
      burger.addEventListener("click", function(){ setOpen(burger.getAttribute("aria-expanded") !== "true"); });
      $$("a", mnav).forEach(function(a){ a.addEventListener("click", function(){ setOpen(false); }); });
      doc.addEventListener("keydown", function(e){ if(e.key === "Escape") setOpen(false); });
      window.addEventListener("resize", function(){ if(window.innerWidth > 900) setOpen(false); }, {passive:true});
    }
    var ids = ["home","works","skills","contact"];
    var secs = ids.map(function(id){ return doc.getElementById(id); }).filter(Boolean);
    if(secs.length && "IntersectionObserver" in window){
      var nio = new IntersectionObserver(function(entries){
        entries.forEach(function(en){
          if(!en.isIntersecting) return;
          $$("a[data-nav]").forEach(function(a){ a.classList.toggle("is-active", a.getAttribute("href") === "#"+en.target.id); });
        });
      },{rootMargin:"-45% 0px -50% 0px"});
      secs.forEach(function(s){ nio.observe(s); });
    }
    return hdr;
  }

  /* ---------------- scroll: progress bar + header shadow (one rAF) ---------------- */
  function initScroll(hdr){
    var bar = $(".progress__bar"), ticking = false;
    function update(){
      ticking = false;
      var y = window.scrollY || window.pageYOffset;
      var max = Math.max(1, doc.documentElement.scrollHeight - window.innerHeight);
      var pr = Math.min(1, Math.max(0, y / max));
      if(bar) bar.style.transform = "scaleX(" + pr.toFixed(4) + ")";
      if(hdr) hdr.classList.toggle("is-stuck", y > 8);
      if(toTop){
        toTop.classList.toggle("is-on", y > heroBottom() - 80);
        var c = toTop.querySelector(".ring circle"); if(c) c.style.strokeDashoffset = (157 * (1 - pr)).toFixed(1);
      }
      if(cta && !ctaShown && pr >= 1/3){ ctaShown = true; cta.removeAttribute("inert"); cta.classList.add("is-on"); }
    }
    window.addEventListener("scroll", function(){ if(!ticking){ ticking = true; requestAnimationFrame(update); } }, {passive:true});
    window.addEventListener("resize", update, {passive:true});
    update();
  }

  /* ---------------- pointer FX: background glow + small dot lens + custom cursor ---------------- */
  var cursor = null;
  function initPointer(){
    if(!motionOK || !mqFine.matches) return;
    var glow = $(".bg-fx__glow"), lens = $(".bg-fx__lens");
    cursor = doc.createElement("div");
    cursor.className = "cursor"; cursor.setAttribute("aria-hidden","true");
    cursor.innerHTML = '<span class="cursor__dot"><svg viewBox="0 0 24 24"><path d="M7 17 17 7M9 7h8v8"/></svg></span>';
    doc.body.appendChild(cursor);
    root.classList.add("has-cursor");
    var dot = $(".cursor__dot", cursor);
    var tx = window.innerWidth/2, ty = window.innerHeight/3, gx = tx, gy = ty, lx = tx, ly = ty, raf = 0, active = false;
    var LENS = 100; /* half of .bg-fx__lens size */
    function loop(){
      gx += (tx - gx) * 0.08; gy += (ty - gy) * 0.08;
      lx += (tx - lx) * 0.2;  ly += (ty - ly) * 0.2;
      if(glow) glow.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0)";
      if(lens){
        lens.style.transform = "translate3d(" + lx.toFixed(1) + "px," + ly.toFixed(1) + "px,0)";
        lens.style.backgroundPosition = (-(lx - LENS) % 28).toFixed(1) + "px " + (-(ly - LENS) % 28).toFixed(1) + "px";
      }
      if(Math.abs(tx-gx) > .3 || Math.abs(ty-gy) > .3){ raf = requestAnimationFrame(loop); } else { raf = 0; }
    }
    var HOVER = "a,button,[role='button'],label,select,summary,.proj:not(.is-pending)";
    var ONACC = ".contact,.quote-card,.btn-accent,.persona.is-accent,.swatch.is-primary,.chip.solid,.filter[aria-pressed='true'],.vb-go,.lang-thumb";
    window.addEventListener("pointermove", function(e){
      if(e.pointerType && e.pointerType !== "mouse") return;
      tx = e.clientX; ty = e.clientY;
      dot.style.transform = "translate3d(" + tx + "px," + ty + "px,0)";
      if(!active){ active = true; root.classList.add("has-pointer"); cursor.classList.add("is-on"); }
      var t = e.target && e.target.closest ? e.target : null;
      if(t){
        cursor.classList.toggle("is-hover", !!t.closest(HOVER));
        cursor.classList.toggle("on-accent", !!t.closest(ONACC) && !t.closest(".contact-btn"));
      }
      if(!raf) raf = requestAnimationFrame(loop);
    }, {passive:true});
    doc.addEventListener("pointerdown", function(){ cursor.classList.add("is-down"); });
    doc.addEventListener("pointerup", function(){ cursor.classList.remove("is-down"); });
    doc.documentElement.addEventListener("mouseleave", function(){ active = false; root.classList.remove("has-pointer"); cursor.classList.remove("is-on"); });

    /* project cover: soft light under the pointer (no tilt, no distortion) */
    $$(".proj").forEach(function(card){
      var cover = $(".proj-cover", card); if(!cover) return;
      var f = 0, ex = 0, ey = 0;
      function paint(){
        f = 0; var r = cover.getBoundingClientRect();
        cover.style.setProperty("--gx", ((ex - r.left) / r.width * 100).toFixed(1) + "%");
        cover.style.setProperty("--gy", ((ey - r.top) / r.height * 100).toFixed(1) + "%");
      }
      card.addEventListener("pointermove", function(e){ ex = e.clientX; ey = e.clientY; if(!f) f = requestAnimationFrame(paint); }, {passive:true});
    });

    /* contact card light spot */
    $$(".contact").forEach(function(c){
      var spot = $(".contact-spot", c); if(!spot) return;
      c.addEventListener("pointermove", function(e){
        var r = c.getBoundingClientRect();
        spot.style.setProperty("--cx", (e.clientX - r.left).toFixed(0) + "px");
        spot.style.setProperty("--cy", (e.clientY - r.top).toFixed(0) + "px");
      }, {passive:true});
    });
  }

  /* ---------------- back to top: appears once the hero has scrolled away ---------------- */
  var toTop = null;
  function initToTop(){
    toTop = doc.createElement("button");
    toTop.type = "button"; toTop.className = "to-top";
    toTop.setAttribute("data-i18n-aria","nav.top"); toTop.setAttribute("aria-label","Back to top");
    toTop.innerHTML = '<svg class="ring" viewBox="0 0 52 52" aria-hidden="true"><circle cx="26" cy="26" r="25"/></svg>'
                    + '<svg class="arrow" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>';
    doc.body.appendChild(toTop);
    toTop.addEventListener("click", function(){
      window.scrollTo({top:0, behavior: motionOK ? "smooth" : "auto"});
      var focusTarget = $(".skip"); if(focusTarget) focusTarget.focus({preventScroll:true});
    });
  }
  function heroBottom(){
    var hero = doc.getElementById("home") || $("main .section");
    if(!hero) return window.innerHeight;
    return hero.getBoundingClientRect().bottom + (window.scrollY || 0);
  }

  /* ---------------- project CTA on case pages, after 1/3 of the page ---------------- */
  var cta = null, ctaShown = false;
  function initCta(){
    if(!doc.body.classList.contains("page-case")) return;
    var closed = false; try{ closed = sessionStorage.getItem("ak-cta-closed") === "1"; }catch(e){}
    if(closed) return;
    cta = doc.createElement("aside");
    cta.className = "cta-pop"; cta.setAttribute("aria-labelledby","ctaTitle"); cta.setAttribute("aria-live","polite");
    cta.innerHTML =
      '<div class="cp-top"><span class="cp-status"><i aria-hidden="true"></i><span data-i18n="cta.status">Open for projects</span></span>'
      + '<button type="button" class="cp-close" data-i18n-aria="cta.close" aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>'
      + '<p class="cp-title" id="ctaTitle" data-i18n="cta.title">Like the approach? Let’s build yours.</p>'
      + '<p class="cp-text" data-i18n="cta.text">Tell me about your product or task — I’ll reply with a clear plan for where to start.</p>'
      + '<div class="cp-actions"><a class="btn btn-accent" href="https://t.me/atohsce" target="_blank" rel="noopener noreferrer"><span data-i18n="cta.btn">Start a project</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8"/></svg></a>'
      + '<a class="cp-alt" href="https://www.linkedin.com/in/angelica-kovaleva-39b566269" target="_blank" rel="noopener noreferrer" data-i18n="cta.alt">or message me on LinkedIn</a></div>';
    doc.body.appendChild(cta);
    cta.setAttribute("inert","");
    $(".cp-close", cta).addEventListener("click", function(){
      cta.classList.remove("is-on"); cta.setAttribute("inert","");
      try{ sessionStorage.setItem("ak-cta-closed","1"); }catch(e){}
      setTimeout(function(){ if(cta && cta.parentNode) cta.parentNode.removeChild(cta); cta = null; }, 700);
    });
  }

  /* ---------------- images: skeleton → fade-in ---------------- */
  function initImages(){
    $$(".media img").forEach(function(img){
      var box = img.closest(".media");
      function done(){ box.classList.add("is-loaded"); }
      function fail(){ box.classList.add("is-loaded","is-error"); }
      if(img.complete){ if(img.naturalWidth) done(); else fail(); }
      else { img.addEventListener("load", done, {once:true}); img.addEventListener("error", fail, {once:true}); }
    });
  }

  /* ---------------- video slot: set data-src="video/name.mp4" to activate ---------------- */
  function initVideo(){
    $$(".video-slot[data-src]").forEach(function(slot){
      var src = slot.getAttribute("data-src"); if(!src) return;
      function mount(){
        if(slot.querySelector("video")) return;
        var v = doc.createElement("video");
        v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = motionOK; v.preload = "metadata";
        v.setAttribute("playsinline",""); v.setAttribute("muted","");
        if(slot.getAttribute("data-poster")) v.poster = slot.getAttribute("data-poster");
        if(!motionOK) v.controls = true;
        v.src = src;
        slot.insertBefore(v, slot.firstChild);
        slot.classList.add("has-video");
      }
      if("IntersectionObserver" in window){
        var vio = new IntersectionObserver(function(en){
          en.forEach(function(e){
            if(e.isIntersecting){ mount(); var v = slot.querySelector("video"); if(v && motionOK) v.play().catch(function(){}); }
            else { var v2 = slot.querySelector("video"); if(v2) v2.pause(); }
          });
        },{rootMargin:"200px 0px"});
        vio.observe(slot);
      } else mount();
    });
  }

    /* ---------------- external case-site links ---------------- */
  function initExternalCaseLinks(){
    $$(".visit-bar[data-external-url]").forEach(function(a){
      a.addEventListener("click", function(e){
        e.preventDefault();
        var url = a.getAttribute("data-external-url");
        if(url) window.open(url, "_blank", "noopener,noreferrer");
      });
    });
  }

  /* ---------------- empty links (e.g. "Visit site" not filled yet) ---------------- */
  function initDeadLinks(){
    $$('a[href="#"]').forEach(function(a){ a.addEventListener("click", function(e){ e.preventDefault(); }); });
  }

  /* ---------------- return to #works reliably (fonts/images can shift the anchor) ---------------- */
  function fixHash(){
    var id = location.hash && location.hash.slice(1);
    if(!id) return;
    var t = doc.getElementById(id); if(!t) return;
    var userMoved = false;
    var stop = function(){ userMoved = true; };
    window.addEventListener("wheel", stop, {passive:true, once:true});
    window.addEventListener("touchstart", stop, {passive:true, once:true});
    var go = function(){ if(!userMoved) t.scrollIntoView({behavior:"auto", block:"start"}); };
    requestAnimationFrame(go);
    if(doc.fonts && doc.fonts.ready) doc.fonts.ready.then(go);
    window.addEventListener("load", go, {once:true});
  }

  /* ---------------- boot ---------------- */
  var hdr = initHeader();
  initToTop();
  initCta();
  markReveal();
  applyLang(readStore("ak-lang") === "ru" ? "ru" : (root.getAttribute("lang") === "ru" ? "ru" : "en"));
  observeReveal();
  initScroll(hdr);
  initPointer();
  initImages();
  initVideo();
  initExternalCaseLinks();
  initDeadLinks();
  fixHash();
  $$("[data-set-lang]").forEach(function(b){ b.addEventListener("click", function(){ applyLang(b.getAttribute("data-set-lang")); }); });
  tick(); setInterval(tick, 1000);

  window.KA = {applyLang:applyLang, observeReveal:observeReveal, markReveal:markReveal};
})();
