/* ====== 关卡系统 ====== */
const TOTAL_LEVELS = 70;
let currentLevel = 1, boardSize = 3;
let board = [], cells = [], currentNumber = 0;
let selectedCells = [], filledBlocks = [];

function calcBoardSize(level) { return Math.floor((level - 1) / 10) + 3; }
function inLevelProgress(level) { return (level - 1) % 10; }

/* ====== 初始化棋盘 ====== */
function initBoard(level) {
    currentLevel = level;
    boardSize = calcBoardSize(level);

    let cellPx;
    if (boardSize <= 4) cellPx = 72;
    else if (boardSize <= 6) cellPx = 56;
    else if (boardSize <= 8) cellPx = 44;
    else cellPx = 36;

    const gap = 3;
    const pad = 10;
    canvas.width = boardSize * (cellPx + gap) - gap + pad * 2;
    canvas.height = boardSize * (cellPx + gap) - gap + pad * 2;

    let fontSize;
    if (boardSize <= 4) fontSize = 20;
    else if (boardSize <= 6) fontSize = 17;
    else if (boardSize <= 8) fontSize = 14;
    else fontSize = 11;

    board = Array(boardSize).fill(0).map(() => Array(boardSize).fill(0));
    cells = [];
    currentNumber = 0;
    selectedCells = [];
    filledBlocks = [];
    particles = [];

    document.getElementById('winTip').textContent = '';
    document.getElementById('nextLevelBtn').style.display = 'none';

    const progress = inLevelProgress(level);
    const dimName = `${boardSize}×${boardSize}`;
    document.getElementById('levelBadge').textContent = `第 ${currentLevel} 关 / ${TOTAL_LEVELS} - ${dimName} (进度 ${progress + 1}/10)`;
    document.getElementById('progressFill').style.width = ((currentLevel / TOTAL_LEVELS) * 100) + '%';

    for (let y = 0; y < boardSize; y++) {
        for (let x = 0; x < boardSize; x++) {
            const px = pad + x * (cellPx + gap);
            const py = pad + y * (cellPx + gap);
            cells.push({ x, y, px, py, w: cellPx, h: cellPx, fontSize });
        }
    }

    generatePuzzle(level);
    bindClickEvents();
    updateButtonStates();
    draw();
}

function loadLevel(level) {
    if (level < 1 || level > TOTAL_LEVELS) return;
    initBoard(level);
}

/* ====== 简单伪随机（纯整数运算，无 Math.imul 差异问题）===== */
function simpleRNG(seed) {
    let s = (seed * 1103515245 + 12345) & 0x7FFFFFFF;
    return function() {
        s = (s * 1103515245 + 12345) & 0x7FFFFFFF;
        return s / 0x7FFFFFFF;
    };
}

/* ====== 谜题生成（确定性完美分割）===== */
function generatePuzzle(level) {
    const size = boardSize;
    let placed = Array(size).fill(0).map(() => Array(size).fill(false));
    const rects = [];

    // 贪心法：从左到右、从上到下填充
    for (let y = 0; y < size && rects.length < size; y++) {
        for (let x = 0; x < size && rects.length < size; x++) {
            if (placed[y][x]) continue;

            let bestW = 1, bestH = 1;
            for (let h = 1; h <= size - y; h++) {
                for (let w = 1; w <= size - x; w++) {
                    const area = w * h;
                    if (area > 10) continue;
                    let ok = true;
                    for (let dy = 0; dy < h && ok; dy++)
                        for (let dx = 0; dx < w && ok; dx++)
                            if (placed[y + dy][x + dx]) ok = false;
                    if (ok) { bestW = w; bestH = h; }
                }
            }

            for (let dy = 0; dy < bestH; dy++)
                for (let dx = 0; dx < bestW; dx++)
                    placed[y + dy][x + dx] = true;
            rects.push({ x, y, w: bestW, h: bestH });
        }
    }

    // 拆分：不够 boardSize 块就拆分最大的矩形
    while (rects.length < size) {
        let maxIdx = -1, maxArea = 0;
        for (let i = 0; i < rects.length; i++) {
            const a = rects[i].w * rects[i].h;
            if (a > maxArea && a > 2) { maxArea = a; maxIdx = i; }
        }
        if (maxIdx === -1) break;

        const rect = rects.splice(maxIdx, 1)[0];
        if (rect.w >= rect.h) {
            const splitW = Math.floor(rect.w / 2);
            if (splitW === 0) break;
            rects.push({ x: rect.x, y: rect.y, w: splitW, h: rect.h });
            rects.push({ x: rect.x + splitW, y: rect.y, w: rect.w - splitW, h: rect.h });
        } else {
            const splitH = Math.floor(rect.h / 2);
            if (splitH === 0) break;
            rects.push({ x: rect.x, y: rect.y, w: rect.w, h: splitH });
            rects.push({ x: rect.x, y: rect.y + splitH, w: rect.w, h: rect.h - splitH });
        }
    }

    // 分配数字到每块（取矩形内固定位置：左上角+进度偏移）
    const progress = inLevelProgress(level);
    for (let i = 0; i < rects.length; i++) {
        const rect = rects[i];
        const area = rect.w * rect.h;
        if (area > 10 || area < 1) continue;

        // 用确定性方式选一个矩形内的位置
        const rng = simpleRNG(level * 137 + i * 99 + progress);
        let rx = Math.floor(rng() * rect.w);
        let ry = Math.floor(rng() * rect.h);
        // Clamp to valid range
        if (rx < 0) rx = 0;
        if (ry < 0) ry = 0;
        if (rx >= rect.w) rx = rect.w - 1;
        if (ry >= rect.h) ry = rect.h - 1;

        // Safety check: don't overwrite existing numbers
        const cellY = rect.y + ry;
        const cellX = rect.x + rx;
        if (cellY >= 0 && cellY < size && cellX >= 0 && cellX < size) {
            board[cellY][cellX] = area;
        }
    }
}

/* ====== 工具函数 ====== */
function isRectangle(cellList) {
    if (cellList.length === 0) return false;
    const xs = cellList.map(c => c.x);
    const ys = cellList.map(c => c.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    return (maxX - minX + 1) * (maxY - minY + 1) === cellList.length;
}

function isCellFilled(x, y) {
    return filledBlocks.some(block => block.cells.some(c => c.x === x && c.y === y));
}
