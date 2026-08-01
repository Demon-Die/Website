document.addEventListener("DOMContentLoaded", () => {
    // 1. Initialize Vanilla Tilt on glass panels
    if (typeof VanillaTilt !== 'undefined') {
        VanillaTilt.init(document.querySelectorAll(".glass-panel"), {
            max: 5,
            speed: 400,
            glare: true,
            "max-glare": 0.05,
            scale: 1.02,
            transition: true
        });
    }

    // 2. Parallax Hero Effect
    const heroImg = document.querySelector('.hero-img');
    const heroSection = document.getElementById('hero-section');
    if (heroImg && heroSection) {
        heroSection.addEventListener('mousemove', (e) => {
            const x = (window.innerWidth / 2 - e.pageX) / 25;
            const y = (window.innerHeight / 2 - e.pageY) / 25;
            // The hero img has md:scale-125, so we incorporate a base scale
            heroImg.style.transform = `translate(${x}px, ${y}px) scale(1.15)`;
            heroImg.style.transition = 'transform 0.1s ease-out';
        });
        heroSection.addEventListener('mouseleave', () => {
            heroImg.style.transform = `translate(0px, 0px) scale(1.0)`;
            heroImg.style.transition = 'transform 0.5s ease-out';
        });
    }

    // Parallax on rings
    const ringContainer = document.querySelector('.animate-\\[ping_3s_cubic-bezier\\(0\\,0\\,0\\.2\\,1\\)_infinite\\]')?.parentElement;
    if (ringContainer && heroSection) {
         heroSection.addEventListener('mousemove', (e) => {
            const x = (window.innerWidth / 2 - e.pageX) / 50;
            const y = (window.innerHeight / 2 - e.pageY) / 50;
            ringContainer.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
            ringContainer.style.transition = 'transform 0.1s ease-out';
        });
        heroSection.addEventListener('mouseleave', () => {
            ringContainer.style.transform = `translate(-50%, -50%)`;
            ringContainer.style.transition = 'transform 0.5s ease-out';
        });
    }

    // 3. Mouse-tracking spotlight glow on cards
    const cards = document.querySelectorAll('.glass-panel');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
        });
    });

    // 4. Enhanced Scroll Reveal
    const revealElements = document.querySelectorAll('.scroll-reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Don't unobserve if we want it to animate in/out, but usually we unobserve for 1-time animation
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });
});
