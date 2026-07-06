/* The Souls of AI — site interactions */
(function () {
  'use strict';

  function onReady(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded',fn); }

  /* Nav scroll state */
  onReady(function () {
    var nav = document.querySelector('[data-nav]');
    if(!nav) return;
    function s(){ nav.classList.toggle('scrolled', window.scrollY > 12); }
    s(); window.addEventListener('scroll', s, { passive:true });
  });

  /* Scroll reveal */
  onReady(function () {
    var els = document.querySelectorAll('[data-reveal]');
    if(!('IntersectionObserver' in window)){ els.forEach(function(e){e.classList.add('in');}); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if(en.isIntersecting){
          en.target.style.transitionDelay = (en.target.getAttribute('data-reveal-delay')||0)+'ms';
          en.target.classList.add('in'); io.unobserve(en.target);
        }
      });
    }, { threshold:0.14, rootMargin:'0px 0px -8% 0px' });
    els.forEach(function(e){ io.observe(e); });
  });

  /* Count-up numbers */
  function countUp(el){
    var raw = el.getAttribute('data-count');
    var target = parseFloat(raw.replace(/,/g,''));
    var suffix = el.getAttribute('data-suffix')||'';
    var prefix = el.getAttribute('data-prefix')||'';
    var grp = el.hasAttribute('data-group');
    var start = performance.now(), dur = 1500;
    function fmt(n){ n = Math.round(n); return grp ? n.toLocaleString('en-US') : String(n); }
    function tick(now){
      var p = Math.min(1,(now-start)/dur), e = 1-Math.pow(1-p,3);
      el.textContent = prefix + fmt(target*e) + suffix;
      if(p<1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  onReady(function () {
    var nums = document.querySelectorAll('[data-count]');
    if(!('IntersectionObserver' in window)){ nums.forEach(countUp); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en){ if(en.isIntersecting){ countUp(en.target); io.unobserve(en.target); } });
    }, { threshold:0.5 });
    nums.forEach(function(n){ io.observe(n); });
  });

  /* Layoffs bar chart fill */
  onReady(function () {
    var bars = document.querySelectorAll('[data-bar]');
    if(!bars.length) return;
    if(!('IntersectionObserver' in window)){ bars.forEach(function(b){ b.style.width=b.getAttribute('data-bar')+'%'; }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en){
        if(en.isIntersecting){
          var i = [].indexOf.call(bars, en.target);
          en.target.style.transitionDelay = (i*90)+'ms';
          en.target.style.width = en.target.getAttribute('data-bar')+'%';
          io.unobserve(en.target);
        }
      });
    }, { threshold:0.4 });
    bars.forEach(function(b){ io.observe(b); });
  });

  /* FAQ accordion */
  onReady(function () {
    document.querySelectorAll('[data-faq-q]').forEach(function (q) {
      q.addEventListener('click', function () {
        var item = q.closest('[data-faq]'), open = item.classList.contains('open');
        item.classList.toggle('open', !open);
        q.setAttribute('aria-expanded', String(!open));
      });
    });
  });

  /* Floating security widget: reveal on scroll, dismissible */  onReady(function () {
    var w = document.querySelector('[data-secwidget]');
    if(!w) return;
    // show shortly after load (no scroll gate); dismiss lasts for the session only
    setTimeout(function(){ if(!w.classList.contains('hidden')) w.classList.add('show'); }, 900);
    var toggle = w.querySelector('[data-secwidget-toggle]');
    if(toggle) toggle.addEventListener('click', function () { w.classList.toggle('open'); });
    var x = w.querySelector('[data-secwidget-x]');
    if(x) x.addEventListener('click', function (e) {
      e.stopPropagation();
      w.classList.remove('show', 'open');
      setTimeout(function(){ w.classList.add('hidden'); }, 400);
    });
  });
  /* Product auto-slider */
  onReady(function () {
    var s = document.querySelector('[data-pslider]');
    if(!s) return;
    var track = s.querySelector('[data-pslider-track]');
    var slides = track.children;
    var dotsWrap = s.querySelector('[data-pslider-dots]');
    var n = slides.length, i = 0, timer;
    for(var k=0;k<n;k++){ (function(k){ var b=document.createElement('button'); b.setAttribute('aria-label','Slide '+(k+1)); b.addEventListener('click',function(){ go(k); restart(); }); dotsWrap.appendChild(b); })(k); }
    var dots = dotsWrap.children;
    function go(x){ i=(x+n)%n; track.style.transform='translateX(-'+(i*100)+'%)'; for(var d=0;d<n;d++){ dots[d].setAttribute('aria-current', String(d===i)); } }
    function next(){ go(i+1); }
    function start(){ timer=setInterval(next,5000); }
    function restart(){ clearInterval(timer); start(); }
    go(0); start();
    s.addEventListener('mouseenter', function(){ clearInterval(timer); });
    s.addEventListener('mouseleave', start);
  });  /* Floating chat bubble (injected on every page) */
  onReady(function () {
    if(document.getElementById('chatw')) return; // already present
    var host = document.createElement('div');
    host.id = 'chatw';
    host.innerHTML =
      '<div class="panel">'
      + '<div class="phead"><b>Chat with us</b><p>Live chat is coming soon</p></div>'
      + '<div class="pbody">'
      + '<div class="msg">\uD83D\uDC4B Our AI assistant is on its way. In the meantime, leave a message and we\u2019ll get back to you by email.</div>'
      + '<form id="chatForm" autocomplete="on">'
      + '<div class="cfield"><input type="text" name="name" required placeholder="Your name"></div>'
      + '<div class="cfield"><input type="email" name="email" required placeholder="Email address"></div>'
      + '<div class="cfield"><textarea name="message" required placeholder="How can we help?"></textarea></div>'
      + '<button type="submit" class="btn btn-accent">Send message</button>'
      + '<div class="thx" id="chatThx">Thanks! We\u2019ll be in touch soon. \uD83D\uDE4C</div>'
      + '</form></div></div>'
      + '<button class="bubble" id="chatBubble" aria-label="Open chat">'
      + '<span class="dot"></span>'
      + '<svg class="chat-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z"/></svg>'
      + '<svg class="close-ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 6L6 18M6 6l12 12"/></svg>'
      + '</button>';
    document.body.appendChild(host);
    var b = host.querySelector('#chatBubble'), form = host.querySelector('#chatForm'), thx = host.querySelector('#chatThx');
    b.addEventListener('click', function(){ host.classList.toggle('open'); });
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var rec = { name:form.name.value.trim(), email:form.email.value.trim(), message:form.message.value.trim(), source:'chat-widget', at:Date.now() };
      if(!rec.name || !rec.email || !rec.message){ return; }
      /* TODO: POST `rec` to your CRM / chat inbox endpoint (site_leads) */
      form.querySelectorAll('input,textarea,button').forEach(function(el){ el.style.display='none'; });
      thx.classList.add('show');
    });
  });

})();
