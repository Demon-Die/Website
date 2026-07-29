import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initHeroAnimation() {
    const container = document.getElementById('omnikon-hero-animation-container');
    if (!container) return;

    // ── Inject extra DOM elements ──────────────────────────────
    injectExtras(container);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
        gsap.set('.omnikon-letter-fill', { clipPath: 'inset(0 0% 0 0)' });
        gsap.set('.omnikon-letter', { '-webkit-text-stroke': '1px rgba(220, 38, 38, 0.3)' });
        const ul = document.getElementById('omnikon-underline');
        if (ul) gsap.set(ul, { width: '60%' });
        return;
    }

    initEmberParticles();
    initGlitchEffect();

    // ── Letter reveal timeline ─────────────────────────────────
    const tl = gsap.timeline({
        scrollTrigger: {
            trigger: '#omnikon-hero-animation-container',
            start: 'top 82%',
        },
        delay: 0.1
    });

    const fills = document.querySelectorAll('.omnikon-letter-fill');
    const glows = document.querySelectorAll('.omnikon-letter-glow');
    const letters = document.querySelectorAll('.omnikon-letter');

    // 1. Letters flash in from invisible → stroke outline
    tl.fromTo(letters,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.08, ease: 'back.out(1.5)' }
    );

    // 2. Sweep the fill left → right per letter
    tl.to(fills, {
        clipPath: 'inset(0 0% 0 0)',
        duration: 1.4,
        ease: 'power4.out',
        stagger: 0.13
    }, '<0.1');

    // 3. Burst glow as each letter fills
    tl.to(glows, {
        '-webkit-text-stroke': '2px rgba(255, 60, 60, 0.9)',
        filter: 'drop-shadow(0 0 30px rgba(255, 0, 0, 1)) drop-shadow(0 0 60px rgba(220,38,38,0.5))',
        duration: 0.6,
        stagger: 0.13,
        ease: 'power2.out'
    }, '<0.1');

    // 4. Settle to a calm crimson glow
    tl.to(glows, {
        '-webkit-text-stroke': '1px rgba(220, 38, 38, 0.25)',
        filter: 'drop-shadow(0 0 10px rgba(220, 38, 38, 0.4))',
        duration: 1.2,
        ease: 'power2.inOut'
    }, '>-0.3');

    // 5. Gradient shift (cool-down)
    tl.to(fills, {
        backgroundPosition: '100% 100%',
        duration: 1.8,
        ease: 'power2.inOut',
    }, '<');

    // 6. Underline reveal
    const underline = document.getElementById('omnikon-underline');
    if (underline) {
        tl.fromTo(underline,
            { width: '0%', opacity: 0 },
            { width: '70%', opacity: 1, duration: 1, ease: 'power3.out' },
            '<0.4'
        );
    }

    // ── Continuous shimmer every ~10s ──────────────────────────
    gsap.to(fills, {
        backgroundPosition: '0% 0%',
        duration: 2,
        ease: 'sine.inOut',
        repeat: -1,
        repeatDelay: 10,
        yoyo: true,
        delay: tl.duration() + 1
    });

    // ── Subtle breathing glow loop ─────────────────────────────
    gsap.to(glows, {
        filter: 'drop-shadow(0 0 16px rgba(220,38,38,0.6)) drop-shadow(0 0 4px rgba(255,80,80,0.3))',
        duration: 2.5,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: tl.duration() + 0.5
    });

    // ── Chromatic aberration drift ─────────────────────────────
    gsap.to('#omnikon-hero-text', {
        '--ca-offset-x': '3px',
        duration: 3,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true
    });
}

// ─────────────────────────────────────────────────────────────
// Inject glitch bar, corner brackets, and underline into DOM
// ─────────────────────────────────────────────────────────────
function injectExtras(container) {
    // Glitch bar
    if (!document.getElementById('omnikon-glitch-bar')) {
        const bar = document.createElement('div');
        bar.id = 'omnikon-glitch-bar';
        container.appendChild(bar);
    }

    // Corner brackets
    ['tl','tr','bl','br'].forEach(pos => {
        const id = `omnikon-corner-${pos}`;
        if (!document.getElementById(id)) {
            const el = document.createElement('div');
            el.id = id;
            container.appendChild(el);
        }
    });

    // Underline (appended after #omnikon-hero-text)
    if (!document.getElementById('omnikon-underline')) {
        const ul = document.createElement('div');
        ul.id = 'omnikon-underline';
        container.appendChild(ul);
    }

    // Add data-char to each letter for CSS pseudo-element CA effect
    document.querySelectorAll('.omnikon-letter').forEach(el => {
        const char = el.textContent.trim()[0] || '';
        el.setAttribute('data-char', char);
    });
}

// ─────────────────────────────────────────────────────────────
// Ember particle system — glowing, trail-fading, rising
// ─────────────────────────────────────────────────────────────
function initEmberParticles() {
    const canvas = document.getElementById('omnikon-particles-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const dpr = window.devicePixelRatio || 1;
    let W, H;

    function resize() {
        W = canvas.offsetWidth;
        H = canvas.offsetHeight;
        canvas.width  = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);
    }
    resize();
    window.addEventListener('resize', resize);

    // Particle factory
    function makeParticle() {
        const isLarge = Math.random() < 0.15;
        return {
            x:      Math.random() * W,
            y:      Math.random() * H,
            r:      isLarge ? Math.random() * 2.5 + 1.5 : Math.random() * 1.5 + 0.4,
            vx:     (Math.random() - 0.5) * 0.4,
            vy:     -(Math.random() * 0.6 + 0.2),   // rises upward
            alpha:  Math.random() * 0.6 + 0.2,
            life:   1,
            decay:  Math.random() * 0.004 + 0.002,
            hue:    Math.random() * 20 - 10,         // slight hue jitter ±10 from red
            trail:  [],
            twinkle: Math.random() * Math.PI * 2     // phase offset
        };
    }

    const particles = Array.from({ length: 120 }, makeParticle);

    let tick = 0;
    function render() {
        tick++;
        ctx.clearRect(0, 0, W, H);

        particles.forEach((p, i) => {
            p.x += p.vx + Math.sin(tick * 0.01 + i) * 0.15;
            p.y += p.vy;
            p.life -= p.decay;
            p.twinkle += 0.05;

            // Store trail (last 6 positions)
            p.trail.push({ x: p.x, y: p.y, a: p.alpha * p.life });
            if (p.trail.length > 6) p.trail.shift();

            // Draw trail
            for (let t = 0; t < p.trail.length - 1; t++) {
                const ta = (p.trail[t].a * t) / p.trail.length * 0.35;
                ctx.beginPath();
                ctx.moveTo(p.trail[t].x, p.trail[t].y);
                ctx.lineTo(p.trail[t + 1].x, p.trail[t + 1].y);
                ctx.strokeStyle = `hsla(${0 + p.hue}, 100%, 60%, ${ta})`;
                ctx.lineWidth = p.r * 0.6;
                ctx.stroke();
            }

            // Twinkle alpha modulation
            const twinkleAlpha = p.alpha * p.life * (0.7 + 0.3 * Math.sin(p.twinkle));

            // Draw core glow
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
            grad.addColorStop(0, `hsla(${0 + p.hue}, 100%, 80%, ${twinkleAlpha})`);
            grad.addColorStop(0.4, `hsla(${0 + p.hue}, 90%, 55%, ${twinkleAlpha * 0.6})`);
            grad.addColorStop(1, `hsla(${0 + p.hue}, 80%, 40%, 0)`);

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Solid core
            ctx.globalAlpha = twinkleAlpha;
            ctx.fillStyle = `hsl(${0 + p.hue}, 100%, 75%)`;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;

            // Respawn when dead or out of bounds
            if (p.life <= 0 || p.y < -10 || p.x < -10 || p.x > W + 10) {
                particles[i] = makeParticle();
            }
        });

        requestAnimationFrame(render);
    }
    render();
}

// ─────────────────────────────────────────────────────────────
// Glitch: random letter displacement every few seconds
// ─────────────────────────────────────────────────────────────
function initGlitchEffect() {
    const letters = Array.from(document.querySelectorAll('.omnikon-letter'));
    if (!letters.length) return;

    function glitch() {
        const count = Math.floor(Math.random() * 3) + 1;
        const chosen = [];
        while (chosen.length < count) {
            const idx = Math.floor(Math.random() * letters.length);
            if (!chosen.includes(idx)) chosen.push(idx);
        }

        chosen.forEach(idx => {
            const el = letters[idx];
            const fill = el.querySelector('.omnikon-letter-fill');

            gsap.to(el, {
                x: (Math.random() - 0.5) * 10,
                skewX: (Math.random() - 0.5) * 8,
                opacity: 0.7,
                duration: 0.06,
                ease: 'none',
                onComplete() {
                    gsap.to(el, { x: 0, skewX: 0, opacity: 1, duration: 0.08 });
                }
            });

            if (fill) {
                gsap.to(fill, {
                    backgroundPosition: `${Math.random() * 100}% ${Math.random() * 100}%`,
                    duration: 0.06,
                    onComplete() {
                        gsap.to(fill, { backgroundPosition: '100% 100%', duration: 0.3 });
                    }
                });
            }
        });

        // Next glitch in 3–8 seconds
        setTimeout(glitch, 3000 + Math.random() * 5000);
    }

    // Start after initial reveal
    setTimeout(glitch, 3500);
}

document.addEventListener('DOMContentLoaded', initHeroAnimation);
