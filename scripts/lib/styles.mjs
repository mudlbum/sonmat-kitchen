// The whole stylesheet. One file, emitted to /assets/site.css.
//
// Theming: light is the default and is defined on :root with no media query
// attached, so a first-time visitor always gets the light site regardless of
// their OS setting. Dark is opt-in through the header toggle, which sets
// data-theme="dark" on <html> and remembers it in localStorage.

export const CSS = `
:root{
  --ink:#241c17; --ink-soft:#5b4c42; --ink-faint:#8a7768;
  --paper:#fbf7f1; --card:#fffdfa; --line:#e6dbcc;
  --accent:#b3452b; --accent-hover:#8d3521; --accent-soft:#f3e2d9; --gochu:#c8552f;
  --shadow:0 1px 2px rgba(60,40,25,.05), 0 6px 18px rgba(60,40,25,.05);
  --measure:37rem;
  --serif:"Nanum Myeongjo",'Apple SD Gothic Neo',"Noto Serif KR",Georgia,serif;
  --sans:'Pretendard','Apple SD Gothic Neo','Malgun Gothic',system-ui,-apple-system,"Noto Sans KR",sans-serif;
  color-scheme:light;
}
[data-theme="dark"]{
  --ink:#f0e7dd; --ink-soft:#c3b3a4; --ink-faint:#9b897a;
  --paper:#1a1512; --card:#221c18; --line:#3a3029;
  --accent:#e88a6b; --accent-hover:#f4a488; --accent-soft:#33251f;
  --shadow:0 1px 2px rgba(0,0,0,.3), 0 6px 18px rgba(0,0,0,.25);
  color-scheme:dark;
}

*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{
  margin:0; background:var(--paper); color:var(--ink);
  font-family:var(--sans); font-size:17px; line-height:1.75;
  word-break:keep-all; overflow-wrap:break-word;
}
:lang(en) body,body:lang(en){word-break:normal}
a{color:var(--accent); text-underline-offset:.18em; text-decoration-thickness:.06em}
a:hover{color:var(--accent-hover)}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:.2rem}
img{max-width:100%;height:auto;display:block}
.wrap{max-width:64rem;margin:0 auto;padding:0 1.25rem}
.skip{position:absolute;left:-9999px}
.skip:focus{left:1rem;top:1rem;background:var(--card);padding:.5rem .9rem;border-radius:.4rem;z-index:20}

/* ------------------------------------------------------------- header */
header.site{border-bottom:1px solid var(--line);background:var(--card)}
header.site .wrap{display:flex;align-items:center;gap:1.25rem;flex-wrap:wrap;padding-block:1rem}
.brand{font-family:var(--serif);font-size:1.45rem;font-weight:700;color:var(--ink);text-decoration:none;letter-spacing:-.01em;line-height:1.2}
.brand span{display:block;font-family:var(--sans);font-size:.7rem;font-weight:500;letter-spacing:.16em;text-transform:uppercase;color:var(--ink-faint);margin-top:.15rem}
nav.site{margin-left:auto;display:flex;gap:1.15rem;flex-wrap:wrap;align-items:center;font-size:.9rem}
nav.site a{color:var(--ink-soft);text-decoration:none;padding:.35rem 0;display:inline-flex;align-items:center;min-height:2.75rem}
nav.site a:hover{color:var(--accent)}
.tools{display:flex;align-items:center;gap:.5rem;margin-left:.25rem}

/* WCAG 2.2 target size: both controls are 2.75rem square (44px at 16px root). */
.iconbtn{
  width:2.75rem;height:2.75rem;flex:0 0 auto;
  display:grid;place-items:center;
  background:transparent;border:1px solid var(--line);border-radius:.55rem;
  color:var(--ink-soft);cursor:pointer;font:inherit;font-size:.8rem;line-height:1;
  padding:0;
}
.iconbtn:hover{border-color:var(--accent);color:var(--accent)}
.iconbtn svg{width:1.15rem;height:1.15rem;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
/* Show the sun in dark mode (click = go light) and the moon in light mode. */
.icon-sun{display:none}
[data-theme="dark"] .icon-sun{display:block}
[data-theme="dark"] .icon-moon{display:none}
a.iconbtn{text-decoration:none;font-weight:600;letter-spacing:.02em;width:auto;padding:0 .7rem}

/* --------------------------------------------------------------- main */
main{padding-block:2rem 4rem}
.lede{max-width:var(--measure);color:var(--ink-soft);margin:0 0 2.25rem}

h1,h2,h3{font-family:var(--serif);line-height:1.3;letter-spacing:-.015em;color:var(--ink)}
h1{font-size:clamp(1.8rem,4.5vw,2.6rem);margin:0 0 .5rem}
h2{font-size:1.35rem;margin:2.5rem 0 .9rem}
h3{font-size:1.05rem;margin:1.6rem 0 .5rem}

.crumbs{list-style:none;display:flex;flex-wrap:wrap;gap:.4rem;padding:0;margin:0 0 1.25rem;font-size:.8rem;color:var(--ink-faint)}
.crumbs li+li::before{content:"›";margin-right:.4rem;color:var(--line)}
/* WCAG 2.2 target size: breadcrumb links sit in a list, not a sentence, so the
   inline exception does not cover them — pad them out to 24px tall. */
.crumbs a{color:var(--ink-faint);text-decoration:none;display:inline-block;padding:.3rem .45rem;margin-inline:-.45rem}
.crumbs a:hover{color:var(--accent);text-decoration:underline}

/* -------------------------------------------------------------- media */
/* aspect-ratio reserves the box before the photo arrives, and the width/height
   attributes on every <img> do the same for browsers that ignore it. CLS 0. */
figure.shot{margin:0 0 .6rem}
.frame{
  aspect-ratio:16/9;overflow:hidden;border-radius:.8rem;
  background:var(--accent-soft);border:1px solid var(--line);box-shadow:var(--shadow);
}
.frame img{width:100%;height:100%;object-fit:cover}
.credit{font-size:.74rem;color:var(--ink-faint);margin:.5rem 0 0;line-height:1.5}
.credit a{color:var(--ink-faint);display:inline-block;padding-block:.3rem}
.credit a:hover{color:var(--accent)}

.hero{background:var(--card);border:1px solid var(--line);border-radius:.9rem;padding:1.25rem;margin-bottom:2.5rem;box-shadow:var(--shadow)}
.hero .frame{aspect-ratio:4/3}
.hero figure.shot{margin-bottom:1.1rem}
/* Side by side once there is room. A full-width 16:9 hero photo pushed the
   recipe title below the fold on a laptop, which is the one thing the front
   page exists to show. */
@media (min-width:52rem){
  .hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:1.75rem;align-items:center;padding:1.5rem}
  .hero figure.shot{margin:0}
  .hero .frame{aspect-ratio:4/3}
  .hero-text{min-width:0}
}
.hero .kicker{font-size:.72rem;letter-spacing:.18em;text-transform:uppercase;color:var(--accent);font-weight:700;margin:0 0 .5rem}
.hero h2{font-size:clamp(1.5rem,3.6vw,2.1rem);margin:0 0 .6rem}
.hero h2 a{color:inherit;text-decoration:none}
.hero h2 a:hover{color:var(--accent)}
.hero p{margin:0 0 1rem;color:var(--ink-soft);max-width:var(--measure)}

.meta{display:flex;flex-wrap:wrap;gap:.5rem;list-style:none;padding:0;margin:0;font-size:.82rem;color:var(--ink-soft)}
.meta li{background:var(--accent-soft);border-radius:999px;padding:.2rem .7rem}

.cards{list-style:none;padding:0;margin:0;display:grid;gap:1.25rem;grid-template-columns:repeat(auto-fill,minmax(17rem,1fr))}
.card{background:var(--card);border:1px solid var(--line);border-radius:.75rem;overflow:hidden;display:flex;flex-direction:column;box-shadow:var(--shadow)}
.card .frame{aspect-ratio:4/3;border:0;border-radius:0;box-shadow:none}
.card-body{padding:1rem 1.15rem 1.15rem}
.card h3{margin:0 0 .35rem;font-size:1.12rem}
.card h3 a{color:inherit;text-decoration:none}
.card h3 a:hover{color:var(--accent)}
.card p{margin:0 0 .8rem;font-size:.92rem;color:var(--ink-soft)}
.card time{font-size:.78rem;color:var(--ink-faint);font-variant-numeric:tabular-nums}

/* ------------------------------------------------------------- recipe */
article.recipe{max-width:var(--measure)}
article.recipe figure.shot{margin-bottom:1.5rem}
article.recipe .summary{font-size:1.05rem;color:var(--ink-soft);margin:0 0 1.25rem}
.byline{font-size:.85rem;color:var(--ink-faint);margin:0 0 1rem}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(6.5rem,1fr));gap:.75rem;margin:1.5rem 0 2rem;padding:1rem 1.15rem;background:var(--card);border:1px solid var(--line);border-radius:.7rem}
.facts div{font-size:.85rem}
.facts dt{color:var(--ink-faint);font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.15rem}
.facts dd{margin:0;font-weight:600}

.ing{margin:0 0 1.5rem}
.ing h3{margin-top:1.2rem}
.ing ul{list-style:none;padding:0;margin:0}
.ing li{display:flex;justify-content:space-between;gap:1rem;padding:.45rem 0;border-bottom:1px dotted var(--line)}
.ing li span:last-child{color:var(--ink-soft);white-space:nowrap;font-variant-numeric:tabular-nums}

ol.steps{counter-reset:step;list-style:none;padding:0;margin:0}
ol.steps li{counter-increment:step;position:relative;padding:0 0 1.15rem 2.6rem;margin-bottom:.15rem}
ol.steps li::before{
  content:counter(step);position:absolute;left:0;top:.15rem;
  width:1.85rem;height:1.85rem;border-radius:50%;
  background:var(--accent);color:var(--paper);font-size:.85rem;font-weight:700;
  display:grid;place-items:center;font-family:var(--sans)
}
.tips{background:var(--accent-soft);border-radius:.7rem;padding:1.15rem 1.35rem;margin:2rem 0}
.tips h3{margin:0 0 .5rem}
.tips ul{margin:0;padding-left:1.1rem}
.tips li{margin-bottom:.4rem}
.tips li:last-child{margin-bottom:0}

.disclosure{border-left:3px solid var(--gochu);background:var(--card);padding:.9rem 1.1rem;margin:2.5rem 0 0;font-size:.86rem;color:var(--ink-soft);border-radius:0 .5rem .5rem 0}
.disclosure strong{color:var(--ink)}

.tags{display:flex;flex-wrap:wrap;gap:.4rem;list-style:none;padding:0;margin:1.75rem 0 0}
.tags a,.tags span{font-size:.8rem;background:var(--card);border:1px solid var(--line);border-radius:999px;padding:.4rem .8rem;text-decoration:none;color:var(--ink-soft);display:inline-block}
.tags a:hover{border-color:var(--accent);color:var(--accent)}

.prose{max-width:var(--measure)}
.prose p{margin:0 0 1rem}
.prose ul{padding-left:1.15rem}

.adslot{margin:2.5rem 0;min-height:0}

/* ------------------------------------------------------------- footer */
footer.site{border-top:1px solid var(--line);background:var(--card);padding-block:2rem;font-size:.86rem;color:var(--ink-soft)}
footer.site .wrap{display:flex;gap:1.25rem;flex-wrap:wrap;align-items:center}
footer.site nav{display:flex;gap:1.1rem;flex-wrap:wrap;margin-left:auto}
footer.site a{color:var(--ink-soft);display:inline-flex;align-items:center;min-height:2.75rem}
footer.site a:hover{color:var(--accent)}

@media (max-width:34rem){
  body{font-size:16px}
  .hero{padding:1rem}
  header.site .wrap{gap:.75rem}
  nav.site{gap:.9rem;font-size:.85rem;width:100%;margin-left:0}
}
@media (prefers-reduced-motion:reduce){
  *{animation-duration:.01ms !important;transition-duration:.01ms !important}
}
@media print{
  header.site nav,.tools,footer.site nav,.adslot,.credit{display:none}
  body{background:#fff;color:#000;font-size:12pt}
  .frame{border:0;box-shadow:none}
}
`.trim();

/**
 * Runs in <head>, before the body paints, so a returning dark-mode visitor
 * never sees a flash of the light theme. Nothing here can throw into the page:
 * localStorage is unavailable in some privacy modes and that must degrade to
 * "light theme", not "blank page".
 */
export const THEME_BOOT = `(function(){try{var s=localStorage.getItem('sk-theme');if(s==='dark')document.documentElement.setAttribute('data-theme','dark');}catch(e){}})();`;

/** Wires the toggle. Deferred to the end of body — nothing depends on it. */
export const THEME_JS = `(function(){
  var root=document.documentElement, btn=document.querySelector('[data-theme-toggle]');
  if(!btn) return;
  function label(){
    var dark=root.getAttribute('data-theme')==='dark';
    btn.setAttribute('aria-pressed', dark?'true':'false');
    btn.setAttribute('title', dark?btn.dataset.toLight:btn.dataset.toDark);
    btn.setAttribute('aria-label', dark?btn.dataset.toLight:btn.dataset.toDark);
  }
  label();
  btn.addEventListener('click',function(){
    var dark=root.getAttribute('data-theme')==='dark';
    if(dark) root.removeAttribute('data-theme'); else root.setAttribute('data-theme','dark');
    try{localStorage.setItem('sk-theme', dark?'light':'dark');}catch(e){}
    label();
  });
})();`;

export const SUN_ICON =
  '<svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M4.2 12H2M22 12h-2.2M6.1 6.1 4.6 4.6M19.4 19.4l-1.5-1.5M17.9 6.1l1.5-1.5M4.6 19.4l1.5-1.5"/></svg>';
export const MOON_ICON =
  '<svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.5 14.3A8.5 8.5 0 1 1 9.7 3.5a6.8 6.8 0 0 0 10.8 10.8Z"/></svg>';
