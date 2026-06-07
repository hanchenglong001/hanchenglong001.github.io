// ====== Canvas 引用 ======
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

/* ====== 页面切换 ====== */
function startGame() {
    document.getElementById('rulesPage').style.display = 'none';
    document.getElementById('gamePage').style.display = 'flex';
    loadLevel(currentLevel);
}
function backToRules() {
    document.getElementById('gamePage').style.display = 'none';
    document.getElementById('rulesPage').style.display = 'flex';
}

/* ====== 模态框 ====== */
function showModal(text) {
    document.getElementById('modalText').textContent = text;
    document.getElementById('modalOverlay').classList.add('show');
}
function closeModal() { document.getElementById('modalOverlay').classList.remove('show'); }

function updateButtonStates() {
    const btns = document.querySelectorAll('.btn-group button');
    if (btns[1]) btns[1].style.opacity = currentLevel <= 1 ? '0.4' : '1';
}

/* ====== Canvas 点击检测 ====== */
function getCellAt(mx, my) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (mx - rect.left) * scaleX;
    const y = (my - rect.top) * scaleY;

    for (const cell of cells) {
        if (x >= cell.px && x <= cell.px + cell.w && y >= cell.py && y <= cell.py + cell.h) {
            return cell;
        }
    }
    return null;
}

function bindClickEvents() {
    canvas.addEventListener('click', (e) => {
        const cell = getCellAt(e.clientX, e.clientY);
        if (!cell) return;
        handleCellClick(cell);
    });
    canvas.style.cursor = 'default';
    canvas.addEventListener('mousemove', (e) => {
        const cell = getCellAt(e.clientX, e.clientY);
        canvas.style.cursor = cell ? 'pointer' : 'default';
    });
}

/* ====== 点击处理 ====== */
function handleCellClick(cell) {
    const { x, y } = cell;

    // 1. 点击已填充区块 → 整组还原 + 粒子
    for (let i = 0; i < filledBlocks.length; i++) {
        const block = filledBlocks[i];
        if (block.cells.some(c => c.x === x && c.y === y)) {
            spawnParticles(cell.px + cell.w / 2, cell.py + cell.h / 2, getBlockColor(block.number).fill, 5);
            filledBlocks.splice(i, 1);
            document.getElementById('winTip').textContent = '';
            document.getElementById('nextLevelBtn').style.display = 'none';
            draw();
            return;
        }
    }

    // 2. 取消选中
    const selIdx = selectedCells.findIndex(c => c.x === x && c.y === y);
    if (selIdx !== -1) {
        selectedCells.splice(selIdx, 1);
        if (selectedCells.length === 0) currentNumber = 0;
        draw();
        return;
    }

    // 3. 未开始 → 必须点数字
    if (currentNumber === 0) {
        const val = board[y][x];
        if (val > 0) {
            currentNumber = val;
            selectedCells.push(cell);
            draw();
            if (currentNumber === 1) fillCurrentBlock();
            return;
        } else {
            showModal('请先点击带有数字的格子开始选择！');
            return;
        }
    }

    // 4. 切换数字
    const val = board[y][x];
    if (val > 0) {
        selectedCells = [];
        currentNumber = val;
        selectedCells.push(cell);
        draw();
        return;
    }

    // 5. 点已填充
    if (isCellFilled(x, y)) {
        showModal('这个格子已经被占用了！');
        return;
    }

    // 6. 超过数量
    if (selectedCells.length + 1 > currentNumber) {
        showModal(`最多只能选择 ${currentNumber} 个格子！`);
        return;
    }

    // 7. 正常添加
    selectedCells.push(cell);
    draw();

    // 8. 选满 → 校验
    if (selectedCells.length === currentNumber) {
        if (isRectangle(selectedCells)) {
            fillCurrentBlock();
        } else {
            showModal(`错误！所选的 ${currentNumber} 个格子不是正方形/长方形！`);
        }
    }
}

function fillCurrentBlock() {
    const newBlock = { number: currentNumber, cells: [...selectedCells] };
    filledBlocks.push(newBlock);
    selectedCells = [];
    currentNumber = 0;

    for (const cell of newBlock.cells) {
        spawnParticles(cell.px + cell.w / 2, cell.py + cell.h / 2, '#ffd43b', 8);
    }

    const totalFilled = filledBlocks.reduce((s, b) => s + b.cells.length, 0);
    if (totalFilled === boardSize * boardSize) { onWin(); }
    draw();
}

function onWin() {
    for (let i = 0; i < 50; i++) {
        const colors = ['#ff6b8a','#4facfe','#ffd43b','#69db7c','#9775fa','#ffa94d'];
        spawnParticles(canvas.width/2, canvas.height/2, colors[Math.floor(Math.random()*colors.length)], 3);
    }

    if (currentLevel >= TOTAL_LEVELS) {
        document.getElementById('winTip').textContent = `🏆 恭喜！已通关全部 ${TOTAL_LEVELS} 关！`;
    } else {
        document.getElementById('winTip').textContent = `🎉 第 ${currentLevel} 关通关！`;
        document.getElementById('nextLevelBtn').style.display = 'block';
    }
}

/* ====== 按钮事件 ====== */
document.getElementById('nextLevelBtn').addEventListener('click', () => {
    if (currentLevel < TOTAL_LEVELS) initBoard(currentLevel + 1);
});

function goPrevLevel() { if (currentLevel > 1) initBoard(currentLevel - 1); }
function resetCurrent() { initBoard(currentLevel); }
function newGame() { currentLevel = 1; initBoard(1); }

/* ====== URL hash 路由 ====== */
if (window.location.hash === '#game') startGame();

// 启动
startAnimation();
