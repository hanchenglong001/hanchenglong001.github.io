/* ====== Canvas 渲染引擎 ====== */
const COLORS = {
    bg: '#1a1a2e',
    numberBg: '#252545',
    selected: 'rgba(79,172,254,0.35)',
    selectedStroke: '#4facfe',
};

const NUMBER_COLORS = {
    1: { fill: '#ff6b8a', stroke: '#ff4070', glow: 'rgba(255,107,138,0.4)' },
    2: { fill: '#ffa94d', stroke: '#ff922b', glow: 'rgba(255,169,77,0.4)' },
    3: { fill: '#ffd43b', stroke: '#fab005', glow: 'rgba(255,212,59,0.4)' },
    4: { fill: '#69db7c', stroke: '#51cf66', glow: 'rgba(105,219,124,0.4)' },
    5: { fill: '#38d9a9', stroke: '#20c997', glow: 'rgba(56,217,169,0.4)' },
    6: { fill: '#4dabf7', stroke: '#339af0', glow: 'rgba(77,171,247,0.4)' },
    7: { fill: '#9775fa', stroke: '#8854d8', glow: 'rgba(151,117,250,0.4)' },
    8: { fill: '#e599f7', stroke: '#cc5de8', glow: 'rgba(229,153,247,0.4)' },
    9: { fill: '#da77f2', stroke: '#be4bdb', glow: 'rgba(218,119,242,0.4)' },
    10:{ fill: '#e8590c', stroke: '#dc3545', glow: 'rgba(232,89,12,0.4)' },
};

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

function getBlockColor(num) {
    return NUMBER_COLORS[num] || { fill: '#aaa', stroke: '#888', glow: 'rgba(170,170,170,0.3)' };
}

function shadeColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return `rgb(${r},${g},${b})`;
}

function draw() {
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);

    // 第一步：绘制所有已填充区块
    for (const block of filledBlocks) {
        drawBlock(block);
    }

    // 记录被覆盖的格子
    const covered = new Set();
    for (const block of filledBlocks) {
        for (const cell of block.cells) {
            covered.add(`${cell.x},${cell.y}`);
        }
    }

    // 第二步：绘制剩余格子（数字/空白/选中）
    for (const cell of cells) {
        const key = `${cell.x},${cell.y}`;
        if (covered.has(key)) continue;

        const { x, y, px, py, w: cw, h: ch, fontSize } = cell;
        const isSelected = selectedCells.some(c => c.x === x && c.y === y);
        const isNumber = board[y][x] > 0;
        const numVal = board[y][x];
        const r = cw * 0.15;

        if (isSelected) {
            ctx.save();
            ctx.shadowColor = COLORS.selectedStroke;
            ctx.shadowBlur = 12;
            roundRect(ctx, px, py, cw, ch, r);
            ctx.fillStyle = COLORS.selected;
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.strokeStyle = COLORS.selectedStroke;
            ctx.lineWidth = 2.5;
            ctx.stroke();
            ctx.restore();
        } else if (isNumber) {
            const c = getBlockColor(numVal);
            ctx.save();
            roundRect(ctx, px, py, cw, ch, r);
            ctx.fillStyle = COLORS.numberBg;
            ctx.fill();

            const grad = ctx.createLinearGradient(px, py, px, py + ch * 0.4);
            grad.addColorStop(0, 'rgba(255,255,255,0.08)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.fill();

            roundRect(ctx, px + 1, py + 1, cw - 2, ch - 2, r);
            ctx.strokeStyle = c.stroke;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.fillStyle = '#fff';
            ctx.font = `bold ${fontSize}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(numVal, px + cw / 2, py + ch / 2 + 1);
            ctx.restore();
        } else {
            roundRect(ctx, px, py, cw, ch, r);
            ctx.fillStyle = '#222240';
            ctx.fill();

            const grad = ctx.createLinearGradient(px, py, px, py + ch * 0.35);
            grad.addColorStop(0, 'rgba(255,255,255,0.04)');
            grad.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.strokeStyle = 'rgba(255,255,255,0.06)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    // 第三步：粒子叠加
    for (const p of particles) { p.draw(ctx); }
}

function drawBlock(block) {
    const xs = block.cells.map(c => c.x);
    const ys = block.cells.map(c => c.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    const firstCell = cells.find(c => c.x === minX && c.y === minY);
    if (!firstCell) return;

    const numVal = block.number;
    const c = getBlockColor(numVal);
    const gap = 3;

    const totalW = (maxX - minX + 1) * (firstCell.w + gap) - gap;
    const totalH = (maxY - minY + 1) * (firstCell.h + gap) - gap;
    const ox = firstCell.px;
    const oy = firstCell.py;
    const r = firstCell.w * 0.2;

    ctx.save();
    ctx.shadowColor = c.glow;
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 4;

    roundRect(ctx, ox, oy, totalW, totalH, r);
    const bgGrad = ctx.createLinearGradient(ox, oy, ox + totalW, oy + totalH);
    bgGrad.addColorStop(0, c.fill);
    bgGrad.addColorStop(1, shadeColor(c.fill, -20));
    ctx.fillStyle = bgGrad;
    ctx.fill();

    ctx.shadowBlur = 0;
    const hlGrad = ctx.createLinearGradient(ox, oy, ox, oy + totalH * 0.4);
    hlGrad.addColorStop(0, 'rgba(255,255,255,0.18)');
    hlGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hlGrad;
    ctx.fill();

    ctx.strokeStyle = shadeColor(c.stroke, 10);
    ctx.lineWidth = 1.5;
    roundRect(ctx, ox, oy, totalW, totalH, r);
    ctx.stroke();

    // 数字居中
    const cx2 = ox + totalW / 2;
    const cy2 = oy + totalH / 2;
    let fontSize = firstCell.fontSize * (block.cells.length === 1 ? 1 : Math.max(0.7, 1 - block.cells.length * 0.05));
    ctx.font = `bold ${Math.floor(fontSize)}px "Segoe UI"`;
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(numVal, cx2, cy2 + 1);

    // 内部分隔线
    if (block.cells.length > 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const cell = cells.find(cc => cc.x === x && cc.y === y);
                if (!cell) continue;
                if (x < maxX && block.cells.some(c => c.x === x + 1 && c.y === y)) {
                    ctx.beginPath();
                    ctx.moveTo(cell.px + cell.w + gap / 2, cell.py);
                    ctx.lineTo(cell.px + cell.w + gap / 2, cell.py + cell.h);
                    ctx.stroke();
                }
                if (y < maxY && block.cells.some(c => c.x === x && c.y === y + 1)) {
                    ctx.beginPath();
                    ctx.moveTo(cell.px, cell.py + cell.h + gap / 2);
                    ctx.lineTo(cell.px + cell.w, cell.py + cell.h + gap / 2);
                    ctx.stroke();
                }
            }
        }
        ctx.setLineDash([]);
    }

    ctx.restore();
}
