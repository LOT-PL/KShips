(function() {
    'use strict';
    var GRID_SIZE = 10;
    var SHIPS = [
        { name: 'Carrier', size: 5 },
        { name: 'Battleship', size: 4 },
        { name: 'Cruiser', size: 3 },
        { name: 'Submarine', size: 3 },
        { name: 'Destroyer', size: 2 }
    ];
    var ACHIEVEMENTS = [
        { id: 'first_blood', name: 'First Blood', desc: 'Sink your first ship', check: function(s) { return s.shipsDestroyed >= 1; } },
        { id: 'sharpshooter', name: 'Sharpshooter', desc: 'Achieve 75% hit rate', check: function(s) { return s.hitRate >= 75 && s.shotsFired >= 10; } },
        { id: 'speed_run', name: 'Speed Run', desc: 'Win in under 20 shots', check: function(s) { return s.shotsFired <= 20 && s.victory; } },
        { id: 'perfect_shot', name: 'Perfect Shot', desc: '100% hit rate victory', check: function(s) { return s.hitRate === 100 && s.victory; } },
        { id: 'easy_victory', name: 'Easy Victory', desc: 'Win on easy difficulty', check: function(s) { return s.difficulty === 'easy' && s.victory; } },
        { id: 'medium_victory', name: 'Medium Victory', desc: 'Win on medium difficulty', check: function(s) { return s.difficulty === 'medium' && s.victory; } },
        { id: 'dominator', name: 'Dominator', desc: 'Win on hard difficulty', check: function(s) { return s.difficulty === 'hard' && s.victory; } },
        { id: 'explosive', name: 'Explosive Finale', desc: 'Sink 3 ships in a row', check: function(s) { return s.consecutiveSinks >= 3; } }
    ];
    var appSettings = {
        animationsEnabled: true,
        gameMode: 'single',
        currentPlayer: 0,
        playerNames: ['Player 1', 'Player 2'],
        consecutiveSinks: 0,
        unlockedAchievements: [],
        playerFleets: [null, null],
        gridSize: 10,
        gamesWon: 0,
        gamesLost: 0,
        totalShipsSunk: 0,
        totalShotsFired: 0,
        totalHits: 0
    };
    var gameState = {
        difficulty: null,
        currentShipIndex: 0,
        isHorizontal: true,
        playerBoard: null,
        enemyBoard: null,
        playerShips: [],
        enemyShips: [],
        playerHits: 0,
        enemyHits: 0,
        shotsFired: 0,
        hits: 0,
        isPlayerTurn: true,
        gameOver: false,
        aiLastHit: null,
        aiTargets: [],
        aiHitDirection: null,
        aiMode: 'search'
    };
    function init() {
        bindSettingsButtons();
        loadSettings();
        applyGridSizeFromSettings();
        initializeBoards();
        attachMenuListeners();
        attachNewListeners();
    }
    function computeCellSize() {
        var maxGridWidth = 720;
        var size = Math.floor(maxGridWidth / GRID_SIZE);
        if (size > 40) size = 40;
        if (size < 14) size = 14;
        return size;
    }
    function applyGridSizeFromSettings() {
        GRID_SIZE = parseInt(appSettings.gridSize, 10) || 10;
        var checks = ['gs10-check','gs12-check','gs14-check','gs16-check','gs18-check','gs20-check'];
        for (var i = 0; i < checks.length; i++) {
            var el = document.getElementById(checks[i]);
            if (el) el.textContent = '';
        }
        var id = 'gs' + GRID_SIZE + '-check';
        var elc = document.getElementById(id);
        if (elc) elc.textContent = '✓';
        var anim = document.getElementById('animations-check');
        if (anim) anim.textContent = appSettings.animationsEnabled ? '✓' : '';
    }
    function initializeBoards() {
        gameState.playerBoard = createEmptyBoard();
        gameState.enemyBoard = createEmptyBoard();
    }
    function createEmptyBoard() {
        var b = [];
        for (var i = 0; i < GRID_SIZE; i++) {
            b[i] = [];
            for (var j = 0; j < GRID_SIZE; j++) {
                b[i][j] = { ship: null, hit: false };
            }
        }
        return b;
    }
    function attachMenuListeners() {
        var easy = document.getElementById('easy-btn');
        var medium = document.getElementById('medium-btn');
        var hard = document.getElementById('hard-btn');
        if (easy) easy.onclick = function(){ startGame('easy'); };
        if (medium) medium.onclick = function(){ startGame('medium'); };
        if (hard) hard.onclick = function(){ startGame('hard'); };
        var rotate = document.getElementById('rotate-btn');
        var random = document.getElementById('random-btn');
        var startBattleBtn = document.getElementById('start-game-btn');
        var playAgain = document.getElementById('play-again-btn');
        if (rotate) rotate.onclick = rotateShip;
        if (random) random.onclick = randomPlacement;
        if (startBattleBtn) startBattleBtn.onclick = beginBattle;
        if (playAgain) playAgain.onclick = resetGame;
    }
    function attachNewListeners() {
        var singleBtn = document.getElementById('single-player-btn');
        var multiBtn = document.getElementById('multiplayer-btn');
        var achBtn = document.getElementById('achievements-btn');
        var statsBtn = document.getElementById('stats-btn');
        var setBtn = document.getElementById('settings-btn');
        var backMenuBtn = document.getElementById('back-to-menu-btn');
        var startMultiBtn = document.getElementById('start-multiplayer-btn');
        var backMultiBtn = document.getElementById('back-from-multiplayer-btn');
        var backAchBtn = document.getElementById('back-from-achievements-btn');
        var backStatsBtn = document.getElementById('back-from-stats-btn');
        var backSetBtn = document.getElementById('back-from-settings-btn');
        if (singleBtn) singleBtn.onclick = startSinglePlayer;
        if (multiBtn) multiBtn.onclick = startMultiplayerSetup;
        if (achBtn) achBtn.onclick = showAchievements;
        if (statsBtn) statsBtn.onclick = showStats;
        if (setBtn) setBtn.onclick = showSettings;
        if (backMenuBtn) backMenuBtn.onclick = goBackToMenu;
        if (startMultiBtn) startMultiBtn.onclick = startMultiplayer;
        if (backMultiBtn) backMultiBtn.onclick = goBackToMenu;
        if (backAchBtn) backAchBtn.onclick = goBackToMenu;
        if (backStatsBtn) backStatsBtn.onclick = goBackToMenu;
        if (backSetBtn) backSetBtn.onclick = goBackToMenu;
    }
    function showScreenNew(screenId) {
        var screens = ['menu-screen','difficulty-screen','multiplayer-names-screen','achievements-screen','stats-screen','settings-screen','setup-screen','game-screen','game-over-screen'];
        for (var i = 0; i < screens.length; i++) {
            var screen = document.getElementById(screens[i]);
            if (!screen) continue;
            if (screens[i] === screenId) { screen.className = 'screen'; } else { screen.className = 'screen hidden'; }
        }
    }
    function startSinglePlayer() {
        appSettings.gameMode = 'single';
        showScreenNew('difficulty-screen');
    }
    function startMultiplayerSetup() {
        appSettings.gameMode = 'multiplayer';
        showScreenNew('multiplayer-names-screen');
    }
    function startMultiplayer() {
        var p1 = document.getElementById('p1-name');
        var p2 = document.getElementById('p2-name');
        appSettings.playerNames[0] = p1 && p1.value ? p1.value : 'Player 1';
        appSettings.playerNames[1] = p2 && p2.value ? p2.value : 'Player 2';
        appSettings.currentPlayer = 0;
        applyGridSizeFromSettings();
        gameState.currentShipIndex = 0;
        gameState.isHorizontal = true;
        gameState.playerShips = [];
        gameState.enemyShips = [];
        appSettings.playerFleets = [null,null];
        initializeBoards();
        showScreenNew('setup-screen');
        updateStatus('Place ships - ' + appSettings.playerNames[0]);
        var label = document.getElementById('setup-player-label'); if (label) label.textContent = appSettings.playerNames[0];
        var startBtn = document.getElementById('start-game-btn'); if (startBtn) startBtn.disabled = true;
        renderSetupGrid(); updateShipInfo();
    }
    function showAchievements() {
        var list = document.getElementById('achievements-list');
        if (!list) { showScreenNew('achievements-screen'); return; }
        list.innerHTML = '';
        for (var i = 0; i < ACHIEVEMENTS.length; i++) {
            var ach = ACHIEVEMENTS[i];
            var unlocked = appSettings.unlockedAchievements.indexOf(ach.id) !== -1;
            var item = document.createElement('div'); item.className = 'achievement-item' + (unlocked ? '' : ' locked');
            var name = document.createElement('div'); name.className = 'achievement-name'; name.textContent = ach.name;
            var desc = document.createElement('div'); desc.className = 'achievement-desc'; desc.textContent = ach.desc;
            item.appendChild(name); item.appendChild(desc);
            var status = document.createElement('div'); status.className = unlocked ? 'achievement-unlocked-label' : 'achievement-locked-label'; status.textContent = unlocked ? '[UNLOCKED]' : '[LOCKED]';
            item.appendChild(status); list.appendChild(item);
        }
        showScreenNew('achievements-screen');
    }
    function showStats() {
        var list = document.getElementById('stats-list');
        if (!list) { showScreenNew('stats-screen'); return; }
        list.innerHTML = '';
        var stats = [
            { label: 'Games Won', value: appSettings.gamesWon },
            { label: 'Games Lost', value: appSettings.gamesLost },
            { label: 'Total Ships Sunk', value: appSettings.totalShipsSunk },
            { label: 'Total Shots Fired', value: appSettings.totalShotsFired },
            { label: 'Total Hits', value: appSettings.totalHits },
            { label: 'Overall Hit Rate', value: appSettings.totalShotsFired > 0 ? Math.round((appSettings.totalHits / appSettings.totalShotsFired) * 100) + '%' : '0%' }
        ];
        for (var i = 0; i < stats.length; i++) {
            var item = document.createElement('div'); item.className = 'achievement-item';
            var name = document.createElement('div'); name.className = 'achievement-name'; name.textContent = stats[i].label;
            var value = document.createElement('div'); value.className = 'achievement-desc'; value.textContent = stats[i].value;
            item.appendChild(name); item.appendChild(value); list.appendChild(item);
        }
        showScreenNew('stats-screen');
    }
    function showSettings() {
        var anim = document.getElementById('animations-check'); if (anim) anim.textContent = appSettings.animationsEnabled ? '✓' : '';
        applyGridSizeFromSettings(); showScreenNew('settings-screen');
    }
    function toggleAnimationsState(on) {
        appSettings.animationsEnabled = !!on;
        saveSettings();
        var anim = document.getElementById('animations-check'); if (anim) anim.textContent = appSettings.animationsEnabled ? '✓' : '';
    }
    function bindSettingsButtons() {
        var animBtn = document.getElementById('animations-btn');
        if (animBtn) animBtn.onclick = function() {
            appSettings.animationsEnabled = !appSettings.animationsEnabled;
            saveSettings();
            var a = document.getElementById('animations-check'); if (a) a.textContent = appSettings.animationsEnabled ? '✓' : '';
        };
        var gridButtons = document.getElementsByClassName('grid-size-option');
        for (var i = 0; i < gridButtons.length; i++) {
            gridButtons[i].onclick = function() {
                var size = parseInt(this.getAttribute('data-size'),10) || 10;
                appSettings.gridSize = size;
                saveSettings();
                applyGridSizeFromSettings();
                initializeBoards();
                renderSetupGrid();
            };
        }
    }
    function goBackToMenu() { showScreenNew('menu-screen'); }
    function loadSettings() {
        var saved = localStorage.getItem('battleship_settings');
        if (saved) {
            try {
                var data = JSON.parse(saved);
                appSettings.animationsEnabled = data.animationsEnabled !== false;
                appSettings.unlockedAchievements = data.unlockedAchievements || [];
                appSettings.gridSize = data.gridSize || appSettings.gridSize;
                appSettings.gamesWon = data.gamesWon || 0;
                appSettings.gamesLost = data.gamesLost || 0;
                appSettings.totalShipsSunk = data.totalShipsSunk || 0;
                appSettings.totalShotsFired = data.totalShotsFired || 0;
                appSettings.totalHits = data.totalHits || 0;
            } catch (e) {}
        }
    }
    function saveSettings() {
        try { localStorage.setItem('battleship_settings', JSON.stringify({ animationsEnabled: appSettings.animationsEnabled, unlockedAchievements: appSettings.unlockedAchievements, gridSize: appSettings.gridSize, gamesWon: appSettings.gamesWon, gamesLost: appSettings.gamesLost, totalShipsSunk: appSettings.totalShipsSunk, totalShotsFired: appSettings.totalShotsFired, totalHits: appSettings.totalHits })); } catch (e) {}
    }
    function startGame(difficulty) {
        gameState.difficulty = difficulty;
        applyGridSizeFromSettings();
        gameState.currentShipIndex = 0;
        gameState.isHorizontal = true;
        gameState.playerShips = [];
        gameState.enemyShips = [];
        initializeBoards(); placeEnemyShips();
        showScreenNew('setup-screen'); updateStatus('Place your ' + SHIPS[0].name);
        var lb = document.getElementById('setup-player-label'); if (lb) lb.textContent = '';
        var sb = document.getElementById('start-game-btn'); if (sb) sb.disabled = true;
        renderSetupGrid(); updateShipInfo();
    }
    function updateStatus(msg) { var s = document.getElementById('status'); if (s) s.textContent = msg; }
    function renderSetupGrid() {
        var container = document.getElementById('player-setup-grid'); if (!container) return; container.innerHTML = '';
        var cellSize = computeCellSize();
        container.style.width = (cellSize * GRID_SIZE) + 'px';
        for (var row = 0; row < GRID_SIZE; row++) {
            var rowDiv = document.createElement('div'); rowDiv.className = 'grid-row';
            for (var col = 0; col < GRID_SIZE; col++) {
                var cell = document.createElement('div'); cell.className = 'grid-cell';
                cell.setAttribute('data-row', row); cell.setAttribute('data-col', col);
                cell.style.width = cellSize + 'px'; cell.style.height = cellSize + 'px';
                if (gameState.playerBoard[row][col].ship !== null) cell.className += ' ship';
                cell.innerHTML = '';
                cell.onmouseover = setupCellHover; cell.onmouseout = setupCellOut; cell.onclick = setupCellClick;
                rowDiv.appendChild(cell);
            }
            container.appendChild(rowDiv);
        }
    }
    function setupCellHover(e) {
        if (gameState.currentShipIndex >= SHIPS.length) return;
        var t = e.target || e.srcElement; var row = parseInt(t.getAttribute('data-row'),10); var col = parseInt(t.getAttribute('data-col'),10);
        clearPreviews(); showShipPreview(row,col,SHIPS[gameState.currentShipIndex].size, gameState.isHorizontal);
    }
    function setupCellOut() { clearPreviews(); }
    function clearPreviews() {
        var container = document.getElementById('player-setup-grid'); if (!container) return;
        var cells = container.getElementsByClassName('grid-cell'); for (var i = 0; i < cells.length; i++) {
            cells[i].className = cells[i].className.replace(' preview','').replace(' invalid','');
        }
    }
    function showShipPreview(row, col, size, isHorizontal) {
        var valid = canPlaceShip(gameState.playerBoard,row,col,size,isHorizontal); var className = valid ? ' preview' : ' invalid';
        for (var i = 0; i < size; i++) {
            var r = isHorizontal ? row : row + i; var c = isHorizontal ? col + i : col;
            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                var cell = document.querySelector('#player-setup-grid [data-row="'+r+'"][data-col="'+c+'"]');
                if (cell && cell.className.indexOf('ship') === -1) cell.className += className;
            }
        }
    }
    function setupCellClick(e) {
        var t = e.target || e.srcElement;
        if (gameState.currentShipIndex >= SHIPS.length) return;
        var row = parseInt(t.getAttribute('data-row'),10); var col = parseInt(t.getAttribute('data-col'),10);
        var ship = SHIPS[gameState.currentShipIndex];
        if (canPlaceShip(gameState.playerBoard,row,col,ship.size,gameState.isHorizontal)) {
            placeShip(gameState.playerBoard,gameState.playerShips,row,col,ship,gameState.isHorizontal);
            gameState.currentShipIndex++;
            if (gameState.currentShipIndex < SHIPS.length) { updateStatus('Place your ' + SHIPS[gameState.currentShipIndex].name); updateShipInfo(); }
            else {
                if (appSettings.gameMode === 'multiplayer') {
                    appSettings.playerFleets[appSettings.currentPlayer] = { board: copyBoard(gameState.playerBoard), ships: copyShips(gameState.playerShips) };
                    if (appSettings.currentPlayer === 0) {
                        appSettings.currentPlayer = 1;
                        gameState.playerBoard = createEmptyBoard(); gameState.playerShips = []; gameState.currentShipIndex = 0; gameState.isHorizontal = true;
                        var lbl = document.getElementById('setup-player-label'); if (lbl) lbl.textContent = appSettings.playerNames[1];
                        var sb = document.getElementById('start-game-btn'); if (sb) sb.disabled = true;
                        updateStatus('Place ships - ' + appSettings.playerNames[1]); updateShipInfo(); renderSetupGrid(); return;
                    } else {
                        var sb2 = document.getElementById('start-game-btn'); if (sb2) sb2.disabled = false;
                        updateStatus('All ships placed for both players. Start Battle when ready.'); updateShipInfo();
                    }
                } else {
                    var sb3 = document.getElementById('start-game-btn'); if (sb3) sb3.disabled = false;
                    updateStatus('All ships placed! Ready to begin battle.'); updateShipInfo();
                }
            }
            renderSetupGrid();
        }
    }
    function updateShipInfo() {
        var el = document.getElementById('current-ship'); if (!el) return;
        if (gameState.currentShipIndex < SHIPS.length) { el.textContent = SHIPS[gameState.currentShipIndex].name + ' (' + SHIPS[gameState.currentShipIndex].size + ' cells)'; }
        else { el.textContent = 'All ships placed!'; }
    }
    function canPlaceShip(board,row,col,size,isHorizontal) {
        for (var i = 0; i < size; i++) {
            var r = isHorizontal ? row : row + i; var c = isHorizontal ? col + i : col;
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
            if (board[r][c].ship !== null) return false;
        }
        return true;
    }
    function placeShip(board,shipsList,row,col,ship,isHorizontal) {
        var positions = [];
        for (var i = 0; i < ship.size; i++) {
            var r = isHorizontal ? row : row + i; var c = isHorizontal ? col + i : col;
            board[r][c].ship = ship.name; positions.push({ row: r, col: c });
        }
        shipsList.push({ name: ship.name, size: ship.size, positions: positions, hits: 0 });
    }
    function rotateShip() { gameState.isHorizontal = !gameState.isHorizontal; clearPreviews(); }
    function randomPlacement() {
        gameState.playerShips = []; gameState.playerBoard = createEmptyBoard();
        for (var i = 0; i < SHIPS.length; i++) {
            var placed = false; var attempts = 0;
            while (!placed && attempts < 500) {
                var row = Math.floor(Math.random() * GRID_SIZE); var col = Math.floor(Math.random() * GRID_SIZE);
                var isH = Math.random() < 0.5;
                if (canPlaceShip(gameState.playerBoard,row,col,SHIPS[i].size,isH)) { placeShip(gameState.playerBoard,gameState.playerShips,row,col,SHIPS[i],isH); placed = true; }
                attempts++;
            }
        }
        gameState.currentShipIndex = SHIPS.length;
        var sb = document.getElementById('start-game-btn'); if (sb) sb.disabled = false;
        updateStatus('All ships placed! Ready to begin battle.'); updateShipInfo(); renderSetupGrid();
        if (appSettings.gameMode === 'multiplayer') {
            appSettings.playerFleets[appSettings.currentPlayer] = { board: copyBoard(gameState.playerBoard), ships: copyShips(gameState.playerShips) };
            if (appSettings.currentPlayer === 0) {
                appSettings.currentPlayer = 1; gameState.playerBoard = createEmptyBoard(); gameState.playerShips = []; gameState.currentShipIndex = 0;
                var lbl = document.getElementById('setup-player-label'); if (lbl) lbl.textContent = appSettings.playerNames[1];
                var sb2 = document.getElementById('start-game-btn'); if (sb2) sb2.disabled = true;
                updateStatus('Place ships - ' + appSettings.playerNames[1]); renderSetupGrid();
            } else {
                var sb3 = document.getElementById('start-game-btn'); if (sb3) sb3.disabled = false;
            }
        }
    }
    function placeEnemyShips() {
        gameState.enemyShips = []; gameState.enemyBoard = createEmptyBoard();
        for (var i = 0; i < SHIPS.length; i++) {
            var placed = false; var attempts = 0;
            while (!placed && attempts < 1000) {
                var row = Math.floor(Math.random() * GRID_SIZE); var col = Math.floor(Math.random() * GRID_SIZE);
                var isH = Math.random() < 0.5;
                if (canPlaceShip(gameState.enemyBoard,row,col,SHIPS[i].size,isH)) { placeShip(gameState.enemyBoard,gameState.enemyShips,row,col,SHIPS[i],isH); placed = true; }
                attempts++;
            }
        }
    }
    function beginBattle() {
        applyGridSizeFromSettings();
        if (appSettings.gameMode === 'multiplayer') {
            var f0 = appSettings.playerFleets[0]; var f1 = appSettings.playerFleets[1];
            if (!f0 || !f1) { initializeBoards(); placeEnemyShips(); } else {
                gameState.playerBoard = copyBoard(f0.board); gameState.playerShips = copyShips(f0.ships);
                gameState.enemyBoard = copyBoard(f1.board); gameState.enemyShips = copyShips(f1.ships);
            }
            appSettings.currentPlayer = 0;
        } else {
            if (!gameState.playerShips || gameState.playerShips.length === 0) randomPlacement();
            placeEnemyShips();
        }
        gameState.shotsFired = 0; gameState.hits = 0; gameState.playerHits = 0; gameState.enemyHits = 0; gameState.isPlayerTurn = true; gameState.gameOver = false;
        gameState.aiLastHit = null; gameState.aiTargets = []; gameState.aiHitDirection = null; gameState.aiMode = 'search'; appSettings.consecutiveSinks = 0;
        showScreenNew('game-screen'); updateStatus('Your turn - Select enemy waters to fire!'); renderGameGrids(); updateStats();
    }
    function renderGameGrids() { renderPlayerGameGrid(); renderEnemyGrid(); }
    function renderPlayerGameGrid() {
        var container = document.getElementById('player-game-grid'); if (!container) return; container.innerHTML = '';
        var cellSize = computeCellSize();
        container.style.width = (cellSize * GRID_SIZE) + 'px';
        for (var row = 0; row < GRID_SIZE; row++) {
            var rowDiv = document.createElement('div'); rowDiv.className = 'grid-row';
            for (var col = 0; col < GRID_SIZE; col++) {
                var cell = document.createElement('div'); cell.className = 'grid-cell';
                var cellData = gameState.playerBoard[row][col];
                cell.style.width = cellSize + 'px'; cell.style.height = cellSize + 'px';
                if (cellData.ship !== null) cell.className += ' ship';
                cell.innerHTML = '';
                if (cellData.hit) {
                    if (cellData.ship !== null) {
                        var ship = findShip(gameState.playerShips,row,col);
                        if (ship && isShipSunk(ship)) { cell.className += ' sunk'; }
                        else { cell.className += ' hit'; var mk = document.createElement('span'); mk.className = 'mark'; cell.appendChild(mk); }
                    } else { cell.className += ' miss'; var d = document.createElement('span'); d.className = 'dot'; cell.appendChild(d); }
                }
                rowDiv.appendChild(cell);
            }
            container.appendChild(rowDiv);
        }
    }
    function renderEnemyGrid() {
        var container = document.getElementById('enemy-grid'); if (!container) return; container.innerHTML = '';
        var cellSize = computeCellSize();
        container.style.width = (cellSize * GRID_SIZE) + 'px';
        for (var row = 0; row < GRID_SIZE; row++) {
            var rowDiv = document.createElement('div'); rowDiv.className = 'grid-row';
            for (var col = 0; col < GRID_SIZE; col++) {
                var cell = document.createElement('div'); cell.className = 'grid-cell';
                cell.setAttribute('data-row', row); cell.setAttribute('data-col', col);
                var cellData = gameState.enemyBoard[row][col]; cell.innerHTML = '';
                cell.style.width = cellSize + 'px'; cell.style.height = cellSize + 'px';
                if (cellData.hit) {
                    if (cellData.ship !== null) {
                        var ship = findShip(gameState.enemyShips,row,col);
                        if (ship && isShipSunk(ship)) { cell.className += ' sunk'; }
                        else { cell.className += ' hit'; var mk2 = document.createElement('span'); mk2.className = 'mark'; cell.appendChild(mk2); }
                    } else { cell.className += ' miss'; var d2 = document.createElement('span'); d2.className = 'dot'; cell.appendChild(d2); }
                    cell.style.cursor = 'not-allowed';
                } else { cell.onclick = playerShoot; }
                rowDiv.appendChild(cell);
            }
            container.appendChild(rowDiv);
        }
    }
    function playerShoot(e) {
        if (!gameState.isPlayerTurn || gameState.gameOver) return;
        var t = e.target || e.srcElement; var row = parseInt(t.getAttribute('data-row'),10); var col = parseInt(t.getAttribute('data-col'),10);
        if (isNaN(row) || isNaN(col)) return; if (gameState.enemyBoard[row][col].hit) return;
        gameState.shotsFired++; gameState.enemyBoard[row][col].hit = true;
        if (appSettings.animationsEnabled) { t.className += ' animating'; }
        var delay = appSettings.animationsEnabled ? 250 : 0;
        var statusDelay = 1000;
        setTimeout(function() {
            if (gameState.enemyBoard[row][col].ship !== null) {
                gameState.hits++; var ship = findShip(gameState.enemyShips,row,col);
                if (ship) {
                    ship.hits++;
                    if (isShipSunk(ship)) { updateStatus('You sunk the enemy ' + ship.name + '!'); gameState.playerHits++; appSettings.consecutiveSinks++; }
                    else { updateStatus('Hit!'); statusDelay = 1000; }
                }
            } else { updateStatus('Miss!'); appSettings.consecutiveSinks = 0; statusDelay = 1000; }
            renderGameGrids(); updateStats();
            if (gameState.enemyBoard[row][col].ship !== null) {
                var statsNow = { victory:false, shotsFired: gameState.shotsFired, hitRate: Math.round((gameState.hits / gameState.shotsFired) * 100), shipsDestroyed: gameState.playerHits, consecutiveSinks: appSettings.consecutiveSinks, difficulty: gameState.difficulty };
                checkAchievements(statsNow); 
                displayAchievements();
            }
            setTimeout(function() {
                if (checkGameOver()) return;
                if (appSettings.gameMode === 'multiplayer') {
                    appSettings.currentPlayer = appSettings.currentPlayer === 0 ? 1 : 0;
                    var tmpB = gameState.playerBoard, tmpS = gameState.playerShips;
                    gameState.playerBoard = gameState.enemyBoard; 
                    gameState.playerShips = gameState.enemyShips;
                    gameState.enemyBoard = tmpB; 
                    gameState.enemyShips = tmpS;
                    setTimeout(function() { 
                        updateStatus(appSettings.playerNames[appSettings.currentPlayer] + "'s turn - Pass device"); 
                        renderGameGrids(); 
                    }, 700);
                } else {
                    gameState.isPlayerTurn = false; 
                    setTimeout(function() { 
                        enemyTurn(); 
                    }, 700);
                }
            }, statusDelay);
        }, delay);
    }
    
    function enemyTurn() {
        if (gameState.gameOver) return; 
        updateStatus('Enemy is attacking...');
        var statusDelay = 1000;
        setTimeout(function() {
            var target = getAITarget();
            var row = target.row, col = target.col;
            gameState.playerBoard[row][col].hit = true;
            if (gameState.playerBoard[row][col].ship !== null) {
                var ship = findShip(gameState.playerShips,row,col);
                if (ship) {
                    ship.hits++; 
                    gameState.aiLastHit = { row: row, col: col };
                    addAdjacentTargets(row,col);
                    if (isShipSunk(ship)) { 
                        updateStatus('Enemy sunk your ' + ship.name + '!'); 
                        gameState.enemyHits++; 
                        gameState.aiLastHit = null; 
                        gameState.aiTargets = []; 
                        gameState.aiHitDirection = null; 
                        gameState.aiMode = 'search'; 
                    } else {
                        updateStatus('Enemy hit your ship!'); 
                        statusDelay = 1000;
                        if (gameState.aiLastHit && gameState.aiTargets.length > 0) {
                            var next = gameState.aiTargets[0];
                            if (next && next.row === gameState.aiLastHit.row) gameState.aiHitDirection = 'horizontal';
                            else if (next && next.col === gameState.aiLastHit.col) gameState.aiHitDirection = 'vertical';
                            gameState.aiMode = 'target';
                        }
                    }
                }
            } else { 
                updateStatus('Enemy missed!'); 
                statusDelay = 1000; 
            }
            renderGameGrids(); 
            updateStats();
            if (gameState.playerBoard[row][col].ship !== null) {
                var statsNow = { 
                    victory:false, 
                    shotsFired: gameState.shotsFired, 
                    hitRate: Math.round((gameState.hits / Math.max(1, gameState.shotsFired)) * 100), 
                    shipsDestroyed: gameState.playerHits, 
                    consecutiveSinks: appSettings.consecutiveSinks, 
                    difficulty: gameState.difficulty 
                };
                checkAchievements(statsNow); 
                displayAchievements();
            }
            setTimeout(function() {
                if (checkGameOver()) return;
                gameState.isPlayerTurn = true; 
                setTimeout(function() { 
                    updateStatus('Your turn - Select enemy waters to fire!'); 
                }, 600);
            }, statusDelay);
        }, 500);
    }
    
    function getAITarget() {
        var difficulty = gameState.difficulty;
        if (difficulty === 'easy') {
            if (gameState.aiTargets.length > 0 && Math.random() < 0.3) {
                return gameState.aiTargets.shift();
            }
            return getRandomTarget();
        } else if (difficulty === 'medium') {
            if (gameState.aiTargets.length > 0 && Math.random() < 0.7) {
                return gameState.aiTargets.shift();
            }
            return getRandomTarget();
        } else {
            if (gameState.aiTargets.length > 0) {
                if (gameState.aiHitDirection) {
                    for (var i = 0; i < gameState.aiTargets.length; i++) {
                        var t = gameState.aiTargets[i];
                        if (gameState.aiHitDirection === 'horizontal' && t.row === gameState.aiLastHit.row) { 
                            gameState.aiTargets.splice(i,1); 
                            return t; 
                        }
                        if (gameState.aiHitDirection === 'vertical' && t.col === gameState.aiLastHit.col) { 
                            gameState.aiTargets.splice(i,1); 
                            return t; 
                        }
                    }
                }
                return gameState.aiTargets.shift();
            }
            var bestTargets = [];
            for (var r = 0; r < GRID_SIZE; r++) {
                for (var c = 0; c < GRID_SIZE; c++) {
                    if (!gameState.playerBoard[r][c].hit) {
                        var adjacentHits = 0;
                        if (r > 0 && gameState.playerBoard[r-1][c].hit && gameState.playerBoard[r-1][c].ship) adjacentHits++;
                        if (r < GRID_SIZE-1 && gameState.playerBoard[r+1][c].hit && gameState.playerBoard[r+1][c].ship) adjacentHits++;
                        if (c > 0 && gameState.playerBoard[r][c-1].hit && gameState.playerBoard[r][c-1].ship) adjacentHits++;
                        if (c < GRID_SIZE-1 && gameState.playerBoard[r][c+1].hit && gameState.playerBoard[r][c+1].ship) adjacentHits++;
                        if (adjacentHits > 0) {
                            bestTargets.push({ row: r, col: c, priority: adjacentHits });
                        }
                    }
                }
            }
            if (bestTargets.length > 0) {
                bestTargets.sort(function(a,b) { return b.priority - a.priority; });
                return bestTargets[0];
            }
            return getRandomTarget();
        }
    }
    
    function getRandomTarget() {
        var attempts = 0;
        while (attempts < 500) {
            var r = Math.floor(Math.random() * GRID_SIZE);
            var c = Math.floor(Math.random() * GRID_SIZE);
            if (!gameState.playerBoard[r][c].hit) return { row: r, col: c };
            attempts++;
        }
        for (var rr = 0; rr < GRID_SIZE; rr++) {
            for (var cc = 0; cc < GRID_SIZE; cc++) {
                if (!gameState.playerBoard[rr][cc].hit) return { row: rr, col: cc };
            }
        }
        return { row: 0, col: 0 };
    }
    
    function addAdjacentTargets(row,col) {
        var dirs = [{r:-1,c:0},{r:1,c:0},{r:0,c:-1},{r:0,c:1}];
        for (var i = 0; i < dirs.length; i++) {
            var nr = row + dirs[i].r, nc = col + dirs[i].c;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                if (!gameState.playerBoard[nr][nc].hit) {
                    var exists = false;
                    for (var j = 0; j < gameState.aiTargets.length; j++) {
                        if (gameState.aiTargets[j].row === nr && gameState.aiTargets[j].col === nc) { 
                            exists = true; 
                            break; 
                        }
                    }
                    if (!exists) gameState.aiTargets.push({ row: nr, col: nc });
                }
            }
        }
    }
    
    function findShip(list,row,col) {
        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            for (var j = 0; j < s.positions.length; j++) {
                if (s.positions[j].row === row && s.positions[j].col === col) return s;
            }
        }
        return null;
    }
    
    function isShipSunk(ship) { 
        return ship.hits >= ship.size; 
    }
    
    function updateStats() {
        var ps = document.getElementById('player-ships'); 
        var es = document.getElementById('enemy-ships');
        if (ps) ps.textContent = (SHIPS.length - gameState.enemyHits); 
        if (es) es.textContent = (SHIPS.length - gameState.playerHits);
        var sc = document.getElementById('shot-count'); 
        if (sc) sc.textContent = gameState.shotsFired;
        var hr = document.getElementById('hit-rate'); 
        var hitRate = gameState.shotsFired > 0 ? Math.round((gameState.hits / gameState.shotsFired) * 100) : 0;
        if (hr) hr.textContent = hitRate + '%';
    }
    
    function checkGameOver() {
        if (gameState.playerHits === SHIPS.length) { 
            gameState.gameOver = true; 
            showGameOver(true); 
            return true; 
        }
        if (gameState.enemyHits === SHIPS.length) { 
            gameState.gameOver = true; 
            showGameOver(false); 
            return true; 
        }
        return false;
    }
    
    function showGameOver(playerWon) {
        appSettings.totalShotsFired += gameState.shotsFired;
        appSettings.totalHits += gameState.hits;
        appSettings.totalShipsSunk += gameState.playerHits;
        if (playerWon) {
            appSettings.gamesWon++;
        } else {
            appSettings.gamesLost++;
        }
        saveSettings();
        setTimeout(function() {
            showScreenNew('game-over-screen');
            var title = playerWon ? 'Victory!' : 'Defeat';
            if (appSettings.gameMode === 'multiplayer') { 
                title = playerWon ? (appSettings.playerNames[appSettings.currentPlayer] + ' Wins!') : (appSettings.playerNames[appSettings.currentPlayer === 0 ? 1 : 0] + ' Wins!'); 
            }
            var res = document.getElementById('result-title'); 
            if (res) res.textContent = title;
            var fs = document.getElementById('final-shots'); 
            if (fs) fs.textContent = gameState.shotsFired;
            var fr = document.getElementById('final-rate'); 
            var hitRate = gameState.shotsFired > 0 ? Math.round((gameState.hits / gameState.shotsFired) * 100) : 0;
            if (fr) fr.textContent = hitRate + '%';
            var fss = document.getElementById('final-sunk'); 
            if (fss) fss.textContent = gameState.playerHits + ' / ' + SHIPS.length;
            var stats = { 
                victory: playerWon, 
                shotsFired: gameState.shotsFired, 
                hitRate: hitRate, 
                shipsDestroyed: gameState.playerHits, 
                consecutiveSinks: appSettings.consecutiveSinks, 
                difficulty: gameState.difficulty 
            };
            checkAchievements(stats); 
            displayAchievements();
        }, 600);
    }
    
    function resetGame() {
        GRID_SIZE = parseInt(appSettings.gridSize,10) || 10;
        gameState = { 
            difficulty:null, 
            currentShipIndex:0, 
            isHorizontal:true, 
            playerBoard:null, 
            enemyBoard:null, 
            playerShips:[], 
            enemyShips:[], 
            playerHits:0, 
            enemyHits:0, 
            shotsFired:0, 
            hits:0, 
            isPlayerTurn:true, 
            gameOver:false, 
            aiLastHit:null, 
            aiTargets:[], 
            aiHitDirection:null, 
            aiMode:'search' 
        };
        appSettings.consecutiveSinks = 0; 
        appSettings.playerFleets = [null,null];
        initializeBoards(); 
        showScreenNew('menu-screen'); 
        updateStatus('Battleship');
        var sb = document.getElementById('start-game-btn'); 
        if (sb) sb.disabled = true;
    }
    
    function copyBoard(board) {
        var b = createEmptyBoard();
        for (var r = 0; r < GRID_SIZE; r++) { 
            for (var c = 0; c < GRID_SIZE; c++) { 
                b[r][c].ship = board[r][c].ship; 
                b[r][c].hit = !!board[r][c].hit; 
            } 
        }
        return b;
    }
    
    function copyShips(ships) {
        var out = [];
        for (var i = 0; i < ships.length; i++) {
            out.push({ 
                name: ships[i].name, 
                size: ships[i].size, 
                positions: JSON.parse(JSON.stringify(ships[i].positions)), 
                hits: ships[i].hits || 0 
            });
        }
        return out;
    }
    
    function checkAchievements(stats) {
        for (var i = 0; i < ACHIEVEMENTS.length; i++) {
            var ach = ACHIEVEMENTS[i];
            if (appSettings.unlockedAchievements.indexOf(ach.id) === -1 && ach.check(stats)) {
                appSettings.unlockedAchievements.push(ach.id);
            }
        }
        saveSettings();
    }
    
    function displayAchievements() {
        var div = document.getElementById('achievements-unlocked-display');
        if (!div) return;
        var newUnlocked = [];
        for (var i = 0; i < ACHIEVEMENTS.length; i++) {
            if (appSettings.unlockedAchievements.indexOf(ACHIEVEMENTS[i].id) !== -1) {
                newUnlocked.push(ACHIEVEMENTS[i].name);
            }
        }
        div.textContent = newUnlocked.length ? 'Achievements: ' + newUnlocked.join(', ') : 'No achievements yet';
    }
    
    if (document.readyState === 'loading') { 
        document.addEventListener('DOMContentLoaded', init); 
    } else { 
        init(); 
    }
})();