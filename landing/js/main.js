/* ==========================================================================
   CHARGEWAY ECUADOR — SCRIPT PRINCIPAL DE MOVIMIENTO
   Nivel: Avanzado (GSAP 3.13.0 + ScrollTrigger + Lenis 1.3.11)
   Cimientos y salvaguardas según estándar Ruva Web Pro
   ========================================================================== */

(function () {
  'use strict';

  // 1. Guardias y Cimientos Base
  const doc = document;
  const root = doc.documentElement;
  root.classList.remove('no-js');
  root.classList.add('js');

  const RM = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = window.matchMedia('(pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined';
  const hasST = typeof window.ScrollTrigger !== 'undefined';
  const hasLenis = typeof window.Lenis !== 'undefined';

  const $ = (sel, ctx = doc) => ctx.querySelector(sel);
  const $$ = (sel, ctx = doc) => Array.from(ctx.querySelectorAll(sel));

  const safe = (fn) => {
    try {
      fn();
    } catch (err) {
      console.warn('[ChargeWay Motion Warning]', err);
    }
  };

  // 2. Tokens de Movimiento (Personalidad: Precisa, Eléctrica y Serena)
  const M = {
    ease: 'power3.out',
    easeIO: 'power2.inOut',
    pop: 'back.out(1.4)',
    dur: 0.85,
    stagger: 0.08,
    dist: 24,
    lerp: 0.1
  };

  // Respaldo de tiempo: asegurar visibilidad total si algo tarda
  setTimeout(() => {
    $$('[data-reveal], [data-pieza]').forEach((el) => {
      if (window.getComputedStyle(el).opacity === '0') {
        el.style.opacity = '1';
        el.style.transform = 'none';
        el.style.visibility = 'visible';
      }
    });
  }, 3500);

  // 3. Inicialización del Scroll Suave con Lenis
  let lenisInstance = null;
  safe(() => {
    if (!hasLenis || RM) return;

    lenisInstance = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95
    });

    if (hasGSAP && hasST) {
      lenisInstance.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenisInstance.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) {
        lenisInstance.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }

    // Manejo de anclas con Lenis
    $$('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId && targetId !== '#') {
          const targetEl = $(targetId);
          if (targetEl) {
            e.preventDefault();
            lenisInstance.scrollTo(targetEl, { offset: -60 });
          }
        }
      });
    });
  });

  // 4. Animación Firma de la Portada (Hero)
  safe(() => {
    if (!hasGSAP) return;

    if (hasST) {
      gsap.registerPlugin(ScrollTrigger);
    }

    const heroTl = gsap.timeline();

    if (RM) {
      gsap.set('[data-hero-item]', { autoAlpha: 1 });
      return;
    }

    // Configuración inicial de piezas del hero
    gsap.set('[data-hero-item]', { autoAlpha: 0, y: M.dist });

    // Secuencia coreografiada
    heroTl
      .to('.cabecera', { autoAlpha: 1, y: 0, duration: 0.6, ease: M.ease })
      .to('[data-hero-ceja]', { autoAlpha: 1, y: 0, duration: 0.5, ease: M.ease }, '-=0.3')
      .to('[data-hero-titulo]', { autoAlpha: 1, y: 0, duration: 0.8, ease: M.ease }, '-=0.35')
      .to('[data-hero-bajada]', { autoAlpha: 1, y: 0, duration: 0.7, ease: M.ease }, '-=0.5')
      .to('[data-hero-widget]', { autoAlpha: 1, y: 0, duration: 0.8, ease: M.ease }, '-=0.5')
      .to('[data-hero-visual]', { autoAlpha: 1, y: 0, duration: 0.85, ease: M.ease }, '-=0.6');
  });

  // 5. Revelados al hacer Scroll (ScrollTrigger por sección)
  safe(() => {
    if (!hasGSAP || !hasST || RM) {
      $$('[data-reveal]').forEach((el) => gsap.set(el, { autoAlpha: 1 }));
      return;
    }

    // Revelado de tarjetas de métricas
    const metricCards = $$('.metrica-card');
    if (metricCards.length) {
      gsap.set(metricCards, { autoAlpha: 0, y: 20 });
      ScrollTrigger.batch(metricCards, {
        once: true,
        start: 'top 88%',
        onEnter: (batch) => {
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            duration: 0.75,
            stagger: 0.1,
            ease: M.ease
          });
        }
      });
    }

    // Revelado de módulos Bento
    const bentoCards = $$('.bento-card');
    if (bentoCards.length) {
      gsap.set(bentoCards, { autoAlpha: 0, y: 30 });
      ScrollTrigger.batch(bentoCards, {
        once: true,
        start: 'top 85%',
        onEnter: (batch) => {
          gsap.to(batch, {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            stagger: 0.1,
            ease: M.ease
          });
        }
      });
    }

    // Trazado de la curva de altimetría SVG
    const pathAltimetria = $('#curva-altitud');
    if (pathAltimetria) {
      const length = pathAltimetria.getTotalLength ? pathAltimetria.getTotalLength() : 600;
      gsap.set(pathAltimetria, { strokeDasharray: length, strokeDashoffset: length });
      ScrollTrigger.create({
        trigger: '.perfil-altimetrico-box',
        start: 'top 80%',
        once: true,
        onEnter: () => {
          gsap.to(pathAltimetria, {
            strokeDashoffset: 0,
            duration: 1.6,
            ease: 'power2.out'
          });
        }
      });
    }

    // Revelados genéricos con data-reveal
    $$('[data-reveal]').forEach((el) => {
      gsap.set(el, { autoAlpha: 0, y: 25 });
      ScrollTrigger.create({
        trigger: el,
        start: 'top 88%',
        once: true,
        onEnter: () => {
          gsap.to(el, {
            autoAlpha: 1,
            y: 0,
            duration: 0.8,
            ease: M.ease
          });
        }
      });
    });
  });

  // 6. Barra Fija en Celular (Aparece tras el hero y se esconde en el footer)
  safe(() => {
    const barraMovil = $('.barra-fija-movil');
    const heroSection = $('.hero');
    const footerSection = $('.footer');

    if (!barraMovil || !heroSection) return;

    window.addEventListener('scroll', () => {
      const heroBottom = heroSection.getBoundingClientRect().bottom;
      const footerTop = footerSection ? footerSection.getBoundingClientRect().top : 99999;
      const windowHeight = window.innerHeight;

      // Ocultar si aún estamos en el Hero o si llegamos al pie
      if (heroBottom > 100 || footerTop <= windowHeight) {
        barraMovil.classList.add('oculta');
      } else {
        barraMovil.classList.remove('oculta');
      }
    }, { passive: true });
  });

  // 7. Simulación interactiva de clicks en el selector
  safe(() => {
    const inputBoxes = $$('.input-field-visual');
    inputBoxes.forEach((box) => {
      box.addEventListener('click', () => {
        // Al tocar un campo, resaltar el botón primario
        const ctaBtn = $('.btn-cta-primario');
        if (ctaBtn) {
          ctaBtn.classList.add('pulsar');
          setTimeout(() => ctaBtn.classList.remove('pulsar'), 600);
        }
      });
    });
  });

})();
