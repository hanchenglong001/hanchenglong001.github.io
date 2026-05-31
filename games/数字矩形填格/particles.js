// ====== 粒子系统 ======
let particles = [];

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.life = 1;
        this.decay = 0.02 + Math.random() * 0.03;
        this.size = 2 + Math.random() * 4;
        this.color = color;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += 0.1;
        this.life -= this.decay;
    }
    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * this.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function spawnParticles(cx, cy, color, count=15) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(cx, cy, color));
    }
}

// ====== 动画循环 ======
let animFrameId = null;
function startAnimation() {
    if (animFrameId) return;
    function loop() {
        draw();
        particles = particles.filter(p => p.life > 0);
        for (const p of particles) { p.update(); p.draw(ctx); }
        animFrameId = requestAnimationFrame(loop);
    }
    loop();
}
