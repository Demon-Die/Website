class Particle {
    constructor(canvas, x, y) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.x = x;
        this.y = y;
        this.baseX = x;
        this.baseY = y;
        this.size = Math.random() * 2 + 1;
        this.density = (Math.random() * 30) + 15;
        this.color = 'rgba(255, 42, 75, 0.4)';
        this.angle = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 1.2 + 0.4;
    }

    draw() {
        this.ctx.fillStyle = this.color;
        this.ctx.beginPath();
        this.ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        this.ctx.closePath();
        this.ctx.fill();
    }

    update(mouse) {
        this.baseX += Math.cos(this.angle) * this.speed;
        this.baseY += Math.sin(this.angle) * this.speed;

        if (this.baseX < 0) {
            this.baseX = this.canvas.width;
            this.x = this.baseX;
        }
        if (this.baseX > this.canvas.width) {
            this.baseX = 0;
            this.x = this.baseX;
        }
        if (this.baseY < 0) {
            this.baseY = this.canvas.height;
            this.y = this.baseY;
        }
        if (this.baseY > this.canvas.height) {
            this.baseY = 0;
            this.y = this.baseY;
        }

        if (mouse.x !== undefined && mouse.y !== undefined) {
            let dx = this.x - mouse.x;
            let dy = this.y - mouse.y;
            let distance = Math.sqrt(dx * dx + dy * dy);
            let forceRadius = 300;

            if (distance < forceRadius) {
                let force = (forceRadius - distance) / forceRadius;
                let angle = Math.atan2(dy, dx);
                let orbitSpeed = 0.16 * force * (this.density / 15);
                let newAngle = angle + orbitSpeed;

                let targetDistance = distance;
                if (targetDistance < 75) {
                    targetDistance = 75 + (distance * 0.15);
                }

                let targetX = mouse.x + Math.cos(newAngle) * targetDistance;
                let targetY = mouse.y + Math.sin(newAngle) * targetDistance;

                this.x += (targetX - this.x) * 0.28;
                this.y += (targetY - this.y) * 0.28;
            }
        }

        let dxHome = this.baseX - this.x;
        let dyHome = this.baseY - this.y;
        this.x += dxHome * 0.05;
        this.y += dyHome * 0.05;
    }
}

(function () {
    let canvas;
    let ctx;
    let particlesArray = [];
    let animationFrameId;

    let mouse = {
        x: undefined,
        y: undefined
    };

    function setMousePosition(e) {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
    }

    function clearMousePosition() {
        mouse.x = undefined;
        mouse.y = undefined;
    }

    function connect() {
        for (let a = 0; a < particlesArray.length; a++) {
            for (let b = a + 1; b < particlesArray.length; b++) {
                let dx = particlesArray[a].x - particlesArray[b].x;
                let dy = particlesArray[a].y - particlesArray[b].y;
                let distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 75) {
                    let opacity = 1 - (distance / 75);
                    ctx.strokeStyle = `rgba(255, 42, 75, ${opacity * 0.15})`;
                    ctx.lineWidth = 0.7;
                    ctx.beginPath();
                    ctx.moveTo(particlesArray[a].x, particlesArray[a].y);
                    ctx.lineTo(particlesArray[b].x, particlesArray[b].y);
                    ctx.stroke();
                }
            }
        }
    }

    function animate() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update(mouse);
            particlesArray[i].draw();
        }
        connect();
        
        animationFrameId = requestAnimationFrame(animate);
    }

    function init() {
        document.documentElement.style.backgroundColor = '#000000';
        document.body.style.backgroundColor = 'transparent';

        canvas = document.getElementById('particles-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'particles-canvas';
            canvas.style.position = 'fixed';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.width = '100vw';
            canvas.style.height = '100vh';
            canvas.style.pointerEvents = 'none';
            canvas.style.zIndex = '-1';
            document.body.prepend(canvas);
        }
        
        ctx = canvas.getContext('2d');
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        particlesArray = [];
        const numberOfParticles = Math.min((canvas.width * canvas.height) / 7600, 175);
        
        for (let i = 0; i < numberOfParticles; i++) {
            let x = Math.random() * canvas.width;
            let y = Math.random() * canvas.height;
            particlesArray.push(new Particle(canvas, x, y));
        }
    }

    function handleResize() {
        cancelAnimationFrame(animationFrameId);
        init();
        animate();
    }

    document.addEventListener("DOMContentLoaded", () => {
        
        const preloadNormal = document.createElement('link');
        preloadNormal.rel = 'preload';
        preloadNormal.as = 'image';
        preloadNormal.href = '/cursor/Cursor_64x64.png';
        document.head.appendChild(preloadNormal);

        const preloadActive = document.createElement('link');
        preloadActive.rel = 'preload';
        preloadActive.as = 'image';
        preloadActive.href = '/cursor/CursorActiveNew.png?v=2';
        document.head.appendChild(preloadActive);

        
        const imgNormal = new Image();
        imgNormal.src = '/cursor/Cursor_64x64.png';
        const imgActive = new Image();
        imgActive.src = '/cursor/CursorActiveNew.png?v=2';

        const cursorStyle = document.createElement('style');
        cursorStyle.textContent = `
            html, body, a, button, select, [role="button"] {
                cursor: url('/cursor/Cursor_64x64.png') 16 7, auto !important;
            }
            a:hover, button:hover, select:hover, [role="button"]:hover, .cursor-pointer, .cursor-pointer:hover,
            a:active, button:active, select:active, [role="button"]:active, :active {
                cursor: url('/cursor/CursorActiveNew.png?v=2') 16 7, auto !important;
            }
        `;
        document.head.appendChild(cursorStyle);

        init();
        animate();

        window.addEventListener('mousemove', setMousePosition);
        window.addEventListener('mouseleave', clearMousePosition);
        window.addEventListener('resize', handleResize);
    });
})();
