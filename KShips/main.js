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
        { id: 'first_blood', name: 'First Blood', desc: 'Sink your first ship', check: function(stats) { return stats.shipsDestroyed >= 1; } },
        { id: 'sharpshooter', name: 'Sharpshooter', desc: 'Achieve 75% hit rate', check: function(stats) { return stats.hitRate >= 75 && stats.shotsFired >= 10; } },
        { id: 'speed_run', name: 'Speed Run', desc: 'Win in under 20 shots', check: function(stats) { return stats.shotsFired <= 20 && stats.victory; } },
        { id: 'perfect_shot', name: 'Perfect Shot', desc: '100% hit rate victory', check: function(stats) { return stats.hitRate === 100 && stats.victory; } },
        { id: 'dominator', name: 'Dominator', desc: 'Win on hard difficulty', check: function(stats) { return stats.difficulty === 'hard' && stats.victory; } },
        { id: 'explosive', name: 'Explosive Finale', desc: 'Sink 3 ships in a row', check: function(stats) { return stats.consecutiveSinks >= 3; } }
    ];

    var appSettings = {
        animationsEnabled: true,
        gameMode: 'single',
        currentPlayer: 0,
        playerNames: ['Player 1', 'Player 2'],
        consecutiveSinks: 0,
        unlockedAchievements: [],
        playerFleets: [null, null],
        gridSize: 10
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
        aiHitDirection: null
    };

    function init() {
        var gridSelect = document.getElementById('grid-size-select');
        if (gridSelect) {
            gridSelect.onchange = function() {
                var val = parseInt(gridSelect.value, 10) || 10;
                appSettings.gridSize = val;
                saveSettings();
            };
        }

        loadSettings();
        applyGridSizeFromSettings();
        initializeBoards();
        attachMenuListeners();
        attachNewListeners();
    }

    function applyGridSizeFromSettings() {
        GRID_SIZE = parseInt(appSettings.gridSize, 10) || 10;
        var gridSelect = document.getElementById('grid-size-select');
        if (gridSelect) {
            gridSelect.value = GRID_SIZE;
        }
    }

    function initializeBoards() {
        gameState.playerBoard = createEmptyBoard();
        gameState.enemyBoard = createEmptyBoard();
    }

    function createEmptyBoard() {
        var board = [];
        for (var i = 0; i < GRID_SIZE; i++) {
            board[i] = [];
            for (var j = 0; j < GRID_SIZE; j++) {
                board[i][j] = { ship: null, hit: false };
            }
        }
        return board;
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
        var setBtn = document.getElementById('settings-btn');
        var backMenuBtn = document.getElementById('back-to-menu-btn');
        var startMultiBtn = document.getElementById('start-multiplayer-btn');
        var backMultiBtn = document.getElementById('back-from-multiplayer-btn');
        var backAchBtn = document.getElementById('back-from-achievements-btn');
        var backSetBtn = document.getElementById('back-from-settings-btn');
        var mainMenuBtn = document.getElementById('main-menu-btn');
        var animToggle = document.getElementById('toggle-animations');

        if (singleBtn) singleBtn.onclick = startSinglePlayer;
        if (multiBtn) multiBtn.onclick = startMultiplayerSetup;
        if (achBtn) achBtn.onclick = showAchievements;
        if (setBtn) setBtn.onclick = showSettings;
        if (backMenuBtn) backMenuBtn.onclick = goBackToMenu;
        if (startMultiBtn) startMultiBtn.onclick = startMultiplayer;
        if (backMultiBtn) backMultiBtn.onclick = goBackToMenu;
        if (backAchBtn) backAchBtn.onclick = goBackToMenu;
        if (backSetBtn) backSetBtn.onclick = goBackToMenu;
        if (mainMenuBtn) mainMenuBtn.onclick = goBackToMenu;
        if (animToggle) animToggle.onchange = toggleAnimations;
    }

    function showScreenNew(screenId) {
        var screens = ['menu-screen', 'difficulty-screen', 'multiplayer-names-screen', 'achievements-screen', 'settings-screen', 'setup-screen', 'game-screen', 'game-over-screen'];
        for (var i = 0; i < screens.length; i++) {
            var screen = document.getElementById(screens[i]);
            if (!screen) continue;
            if (screens[i] === screenId) {
                screen.className = 'screen';
            } else {
                screen.className = 'screen hidden';
            }
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
        appSettings.playerNames[0] = document.getElementById('p1-name').value || 'Player 1';
        appSettings.playerNames[1] = document.getElementById('p2-name').value || 'Player 2';
        appSettings.currentPlayer = 0;

        applyGridSizeFromSettings();

        gameState.currentShipIndex = 0;
        gameState.isHorizontal = true;
        gameState.playerShips = [];
        gameState.enemyShips = [];
        appSettings.playerFleets = [null, null];

        initializeBoards();

        showScreenNew('setup-screen');
        updateStatus('Place ships - ' + appSettings.playerNames[0]);
        var label = document.getElementById('setup-player-label');
        if (label) label.textContent = appSettings.playerNames[0];
        var startBtn = document.getElementById('start-game-btn');
        if (startBtn) startBtn.disabled = true;
        renderSetupGrid();
        updateShipInfo();
    }

    function showAchievements() {
        var listWrap = document.getElementById('achievements-list');
        if (!listWrap) { showScreenNew('achievements-screen'); return; }
        listWrap.innerHTML = '';

        for (var i = 0; i < ACHIEVEMENTS.length; i++) {
            var ach = ACHIEVEMENTS[i];
            var unlocked = appSettings.unlockedAchievements.indexOf(ach.id) !== -1;

            var item = document.createElement('div');
            item.className = 'achievement-item' + (unlocked ? '' : ' locked');

            var name = document.createElement('div');
            name.className = 'achievement-name';
            name.textContent = ach.name;

            var desc = document.createElement('div');
            desc.className = 'achievement-desc';
            desc.textContent = ach.desc;

            item.appendChild(name);
            item.appendChild(desc);

            if (unlocked) {
                var status = document.createElement('div');
                status.className = 'achievement-unlocked-label';
                status.textContent = '[UNLOCKED]';
                item.appendChild(status);
            } else {
                var status2 = document.createElement('div');
                status2.className = 'achievement-locked-label';
                status2.textContent = '[LOCKED]';
                item.appendChild(status2);
            }

            listWrap.appendChild(item);
        }

        showScreenNew('achievements-screen');
    }

    function showSettings() {
        var anim = document.getElementById('toggle-animations');
        if (anim) anim.checked = appSettings.animationsEnabled;
        var gridSelect = document.getElementById('grid-size-select');
        if (gridSelect) gridSelect.value = appSettings.gridSize || GRID_SIZE;
        showScreenNew('settings-screen');
    }

    function toggleAnimations() {
        var anim = document.getElementById('toggle-animations');
        if (anim) appSettings.animationsEnabled = !!anim.checked;
        saveSettings();
    }

    function goBackToMenu() {
        showScreenNew('menu-screen');
    }

    function loadSettings() {
        var saved = localStorage.getItem('battleship_settings');
        if (saved) {
            try {
                var data = JSON.parse(saved);
                appSettings.animationsEnabled = data.animationsEnabled !== false;
                appSettings.unlockedAchievements = data.unlockedAchievements || [];
                appSettings.gridSize = data.gridSize || appSettings.gridSize;
            } catch (e) {}
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem('battleship_settings', JSON.stringify({
                animationsEnabled: appSettings.animationsEnabled,
                unlockedAchievements: appSettings.unlockedAchievements,
                gridSize: appSettings.gridSize
            }));
        } catch (e) {}
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

    function startGame(difficulty) {
        gameState.difficulty = difficulty;

        applyGridSizeFromSettings();

        gameState.currentShipIndex = 0;
        gameState.isHorizontal = true;
        gameState.playerShips = [];
        gameState.enemyShips = [];

        initializeBoards();
        placeEnemyShips();

        showScreenNew('setup-screen');
        updateStatus('Place your ' + SHIPS[0].name);
        var label = document.getElementById('setup-player-label');
        if (label) label.textContent = '';
        var startBtn = document.getElementById('start-game-btn');
        if (startBtn) startBtn.disabled = true;
        renderSetupGrid();
        updateShipInfo();
    }

    function updateStatus(message) {
        var stat = document.getElementById('status');
        if (stat) stat.textContent = message;
    }

    function renderSetupGrid() {
        var container = document.getElementById('player-setup-grid');
        if (!container) return;
        container.innerHTML = '';

        for (var row = 0; row < GRID_SIZE; row++) {
            var rowDiv = document.createElement('div');
            rowDiv.className = 'grid-row';

            for (var col = 0; col < GRID_SIZE; col++) {
                var cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.setAttribute('data-row', row);
                cell.setAttribute('data-col', col);

                if (gameState.playerBoard[row][col].ship !== null) {
                    cell.className += ' ship';
                }

                cell.innerHTML = '';

                cell.onmouseover = setupCellHover;
                cell.onmouseout = setupCellOut;
                cell.onclick = setupCellClick;

                rowDiv.appendChild(cell);
            }
            container.appendChild(rowDiv);
        }
    }

    function setupCellHover(e) {
        if (gameState.currentShipIndex >= SHIPS.length) return;
        var target = e.target || e.srcElement;
        var row = parseInt(target.getAttribute('data-row'), 10);
        var col = parseInt(target.getAttribute('data-col'), 10);
        var ship = SHIPS[gameState.currentShipIndex];
        clearPreviews();
        showShipPreview(row, col, ship.size, gameState.isHorizontal);
    }

    function setupCellOut() {
        clearPreviews();
    }

    function clearPreviews() {
        var container = document.getElementById('player-setup-grid');
        if (!container) return;
        var cells = container.getElementsByClassName('grid-cell');
        for (var i = 0; i < cells.length; i++) {
            cells[i].className = cells[i].className.replace(' preview', '').replace(' invalid', '');
        }
    }

    function showShipPreview(row, col, size, isHorizontal) {
        var valid = canPlaceShip(gameState.playerBoard, row, col, size, isHorizontal);
        var className = valid ? ' preview' : ' invalid';

        for (var i = 0; i < size; i++) {
            var r = isHorizontal ? row : row + i;
            var c = isHorizontal ? col + i : col;
            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                var cell = document.querySelector('#player-setup-grid [data-row="' + r + '"][data-col="' + c + '"]');
                if (cell && cell.className.indexOf('ship') === -1) {
                    cell.className += className;
                }
            }
        }
    }

    function setupCellClick(e) {
        var target = e.target || e.srcElement;
        if (gameState.currentShipIndex >= SHIPS.length) return;
        var row = parseInt(target.getAttribute('data-row'), 10);
        var col = parseInt(target.getAttribute('data-col'), 10);
        var ship = SHIPS[gameState.currentShipIndex];

        if (canPlaceShip(gameState.playerBoard, row, col, ship.size, gameState.isHorizontal)) {
            placeShip(gameState.playerBoard, gameState.playerShips, row, col, ship, gameState.isHorizontal);
            gameState.currentShipIndex++;

            if (gameState.currentShipIndex < SHIPS.length) {
                updateStatus('Place your ' + SHIPS[gameState.currentShipIndex].name);
                updateShipInfo();
            } else {
                if (appSettings.gameMode === 'multiplayer') {
                    appSettings.playerFleets[appSettings.currentPlayer] = {
                        board: copyBoard(gameState.playerBoard),
                        ships: copyShips(gameState.playerShips)
                    };

                    if (appSettings.currentPlayer === 0) {
                        appSettings.currentPlayer = 1;
                        gameState.playerBoard = createEmptyBoard();
                        gameState.playerShips = [];
                        gameState.currentShipIndex = 0;
                        gameState.isHorizontal = true;
                        var label = document.getElementById('setup-player-label');
                        if (label) label.textContent = appSettings.playerNames[1];
                        var startBtn = document.getElementById('start-game-btn');
                        if (startBtn) startBtn.disabled = true;
                        updateStatus('Place ships - ' + appSettings.playerNames[1]);
                        updateShipInfo();
                        renderSetupGrid();
                        return;
                    } else {
                        var startBtn2 = document.getElementById('start-game-btn');
                        if (startBtn2) startBtn2.disabled = false;
                        updateStatus('All ships placed for both players. Start Battle when ready.');
                        updateShipInfo();
                    }
                } else {
                    var startBtn3 = document.getElementById('start-game-btn');
                    if (startBtn3) startBtn3.disabled = false;
                    updateStatus('All ships placed! Ready to begin battle.');
                    updateShipInfo();
                }
            }

            renderSetupGrid();
        }
    }

    function updateShipInfo() {
        var el = document.getElementById('current-ship');
        if (!el) return;
        if (gameState.currentShipIndex < SHIPS.length) {
            var ship = SHIPS[gameState.currentShipIndex];
            el.textContent = ship.name + ' (' + ship.size + ' cells)';
        } else {
            el.textContent = 'All ships placed!';
        }
    }

    function canPlaceShip(board, row, col, size, isHorizontal) {
        for (var i = 0; i < size; i++) {
            var r = isHorizontal ? row : row + i;
            var c = isHorizontal ? col + i : col;
            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return false;
            if (board[r][c].ship !== null) return false;
        }
        return true;
    }

    function placeShip(board, shipsList, row, col, ship, isHorizontal) {
        var positions = [];
        for (var i = 0; i < ship.size; i++) {
            var r = isHorizontal ? row : row + i;
            var c = isHorizontal ? col + i : col;
            board[r][c].ship = ship.name;
            positions.push({ row: r, col: c });
        }
        shipsList.push({ name: ship.name, size: ship.size, positions: positions, hits: 0 });
    }

    function rotateShip() {
        gameState.isHorizontal = !gameState.isHorizontal;
        clearPreviews();
    }

    function randomPlacement() {
        gameState.playerShips = [];
        gameState.playerBoard = createEmptyBoard();
        for (var i = 0; i < SHIPS.length; i++) {
            var placed = false;
            var attempts = 0;
            while (!placed && attempts < 500) {
                var row = Math.floor(Math.random() * GRID_SIZE);
                var col = Math.floor(Math.random() * GRID_SIZE);
                var isHorizontal = Math.random() < 0.5;
                if (canPlaceShip(gameState.playerBoard, row, col, SHIPS[i].size, isHorizontal)) {
                    placeShip(gameState.playerBoard, gameState.playerShips, row, col, SHIPS[i], isHorizontal);
                    placed = true;
                }
                attempts++;
            }
        }
        gameState.currentShipIndex = SHIPS.length;
        var startBtn = document.getElementById('start-game-btn');
        if (startBtn) startBtn.disabled = false;
        updateStatus('All ships placed! Ready to begin battle.');
        updateShipInfo();
        renderSetupGrid();

        if (appSettings.gameMode === 'multiplayer') {
            appSettings.playerFleets[appSettings.currentPlayer] = { board: copyBoard(gameState.playerBoard), ships: copyShips(gameState.playerShips) };
            if (appSettings.currentPlayer === 0) {
                appSettings.currentPlayer = 1;
                gameState.playerBoard = createEmptyBoard();
                gameState.playerShips = [];
                gameState.currentShipIndex = 0;
                var label = document.getElementById('setup-player-label');
                if (label) label.textContent = appSettings.playerNames[1];
                var startBtn2 = document.getElementById('start-game-btn');
                if (startBtn2) startBtn2.disabled = true;
                updateStatus('Place ships - ' + appSettings.playerNames[1]);
                renderSetupGrid();
            } else {
                var startBtn3 = document.getElementById('start-game-btn');
                if (startBtn3) startBtn3.disabled = false;
            }
        }
    }

    function placeEnemyShips() {
        gameState.enemyShips = [];
        gameState.enemyBoard = createEmptyBoard();
        for (var i = 0; i < SHIPS.length; i++) {
            var placed = false;
            var attempts = 0;
            while (!placed && attempts < 1000) {
                var row = Math.floor(Math.random() * GRID_SIZE);
                var col = Math.floor(Math.random() * GRID_SIZE);
                var isHorizontal = Math.random() < 0.5;
                if (canPlaceShip(gameState.enemyBoard, row, col, SHIPS[i].size, isHorizontal)) {
                    placeShip(gameState.enemyBoard, gameState.enemyShips, row, col, SHIPS[i], isHorizontal);
                    placed = true;
                }
                attempts++;
            }
        }
    }

    function beginBattle() {
        applyGridSizeFromSettings();

        if (appSettings.gameMode === 'multiplayer') {
            var f0 = appSettings.playerFleets[0];
            var f1 = appSettings.playerFleets[1];
            if (!f0 || !f1) {
                initializeBoards();
                placeEnemyShips();
            } else {
                gameState.playerBoard = copyBoard(f0.board);
                gameState.playerShips = copyShips(f0.ships);
                gameState.enemyBoard = copyBoard(f1.board);
                gameState.enemyShips = copyShips(f1.ships);
            }
            appSettings.currentPlayer = 0;
        } else {
            if (!gameState.playerShips || gameState.playerShips.length === 0) randomPlacement();
            placeEnemyShips();
        }

        gameState.shotsFired = 0;
        gameState.hits = 0;
        gameState.playerHits = 0;
        gameState.enemyHits = 0;
        gameState.isPlayerTurn = true;
        gameState.gameOver = false;
        gameState.aiLastHit = null;
        gameState.aiTargets = [];
        gameState.aiHitDirection = null;
        appSettings.consecutiveSinks = 0;

        showScreenNew('game-screen');
        updateStatus('Your turn - Select enemy waters to fire!');
        renderGameGrids();
        updateStats();
    }

    function renderGameGrids() {
        renderPlayerGameGrid();
        renderEnemyGrid();
    }

    function renderPlayerGameGrid() {
        var container = document.getElementById('player-game-grid');
        if (!container) return;
        container.innerHTML = '';
        for (var row = 0; row < GRID_SIZE; row++) {
            var rowDiv = document.createElement('div'); rowDiv.className = 'grid-row';
            for (var col = 0; col < GRID_SIZE; col++) {
                var cell = document.createElement('div'); cell.className = 'grid-cell';
                var cellData = gameState.playerBoard[row][col];
                if (cellData.ship !== null) cell.className += ' ship';
                cell.innerHTML = '';
                if (cellData.hit) {
                    if (cellData.ship !== null) {
                        var ship = findShip(gameState.playerShips, row, col);
                        if (ship && isShipSunk(ship)) {
                            cell.className += ' sunk';
                        } else {
                            cell.className += ' hit';
                            var mark2 = document.createElement('span');
                            mark2.className = 'mark';
                            cell.appendChild(mark2);
                        }
                    } else {
                        cell.className += ' miss';
                        var dot = document.createElement('span');
                        dot.className = 'dot';
                        cell.appendChild(dot);
                    }
                }
                rowDiv.appendChild(cell);
            }
            container.appendChild(rowDiv);
        }
    }

    function renderEnemyGrid() {
        var container = document.getElementById('enemy-grid');
        if (!container) return;
        container.innerHTML = '';
        for (var row = 0; row < GRID_SIZE; row++) {
            var rowDiv = document.createElement('div'); rowDiv.className = 'grid-row';
            for (var col = 0; col < GRID_SIZE; col++) {
                var cell = document.createElement('div'); cell.className = 'grid-cell';
                cell.setAttribute('data-row', row);
                cell.setAttribute('data-col', col);
                var cellData = gameState.enemyBoard[row][col];
                cell.innerHTML = '';
                if (cellData.hit) {
                    if (cellData.ship !== null) {
                        var ship = findShip(gameState.enemyShips, row, col);
                        if (ship && isShipSunk(ship)) {
                            cell.className += ' sunk';
                        } else {
                            cell.className += ' hit';
                            var mark2 = document.createElement('span');
                            mark2.className = 'mark';
                            cell.appendChild(mark2);
                        }
                    } else {
                        cell.className += ' miss';
                        var dot = document.createElement('span');
                        dot.className = 'dot';
                        cell.appendChild(dot);
                    }
                    cell.style.cursor = 'not-allowed';
                } else {
                    cell.onclick = playerShoot;
                }
                rowDiv.appendChild(cell);
            }
            container.appendChild(rowDiv);
        }
    }

    function playerShoot(e) {
        if (!gameState.isPlayerTurn || gameState.gameOver) return;
        var target = e.target || e.srcElement;
        var row = parseInt(target.getAttribute('data-row'), 10);
        var col = parseInt(target.getAttribute('data-col'), 10);
        if (isNaN(row) || isNaN(col)) return;
        if (gameState.enemyBoard[row][col].hit) return;

        gameState.shotsFired++;
        gameState.enemyBoard[row][col].hit = true;

        if (appSettings.animationsEnabled) {
            target.className += ' animating';
        }

        var delay = appSettings.animationsEnabled ? 250 : 0;

        setTimeout(function() {
            if (gameState.enemyBoard[row][col].ship !== null) {
                gameState.hits++;
                var ship = findShip(gameState.enemyShips, row, col);
                if (ship) {
                    ship.hits++;
                    if (isShipSunk(ship)) {
                        updateStatus('You sunk the enemy ' + ship.name + '!');
                        gameState.playerHits++;
                        appSettings.consecutiveSinks++;
                    } else {
                        updateStatus('Hit!');
                    }
                }
            } else {
                updateStatus('Miss!');
                appSettings.consecutiveSinks = 0;
            }

            renderGameGrids();
            updateStats();

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
                setTimeout(function() { enemyTurn(); }, 700);
            }
        }, delay);
    }

    function enemyTurn() {
        if (gameState.gameOver) return;
        updateStatus('Enemy is attacking...');
        setTimeout(function() {
            var target = getAITarget();
            var row = target.row, col = target.col;
            gameState.playerBoard[row][col].hit = true;
            if (gameState.playerBoard[row][col].ship !== null) {
                var ship = findShip(gameState.playerShips, row, col);
                if (ship) {
                    ship.hits++;
                    gameState.aiLastHit = { row: row, col: col };
                    addAdjacentTargets(row, col);
                    if (isShipSunk(ship)) {
                        updateStatus('Enemy sunk your ' + ship.name + '!');
                        gameState.enemyHits++;
                        gameState.aiLastHit = null;
                        gameState.aiTargets = [];
                        gameState.aiHitDirection = null;
                    } else {
                        updateStatus('Enemy hit your ship!');
                    }
                }
            } else {
                updateStatus('Enemy missed!');
            }
            renderGameGrids();
            updateStats();
            if (checkGameOver()) return;
            gameState.isPlayerTurn = true;
            setTimeout(function() { updateStatus('Your turn - Select enemy waters to fire!'); }, 600);
        }, 500);
    }

    function getAITarget() {
        if (gameState.aiTargets.length > 0) return gameState.aiTargets.shift();
        return getRandomTarget();
    }

    function getRandomTarget() {
        for (var attempts = 0; attempts < 200; attempts++) {
            var r = Math.floor(Math.random() * GRID_SIZE);
            var c = Math.floor(Math.random() * GRID_SIZE);
            if (!gameState.playerBoard[r][c].hit) return { row: r, col: c };
        }
        for (var rr = 0; rr < GRID_SIZE; rr++) {
            for (var cc = 0; cc < GRID_SIZE; cc++) {
                if (!gameState.playerBoard[rr][cc].hit) return { row: rr, col: cc };
            }
        }
        return { row: 0, col: 0 };
    }

    function addAdjacentTargets(row, col) {
        var dirs = [{r:-1,c:0},{r:1,c:0},{r:0,c:-1},{r:0,c:1}];
        for (var i = 0; i < dirs.length; i++) {
            var nr = row + dirs[i].r, nc = col + dirs[i].c;
            if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
                if (!gameState.playerBoard[nr][nc].hit) {
                    var exists = false;
                    for (var j = 0; j < gameState.aiTargets.length; j++) {
                        if (gameState.aiTargets[j].row === nr && gameState.aiTargets[j].col === nc) { exists = true; break; }
                    }
                    if (!exists) gameState.aiTargets.push({ row: nr, col: nc });
                }
            }
        }
    }

    function findShip(list, row, col) {
        for (var i = 0; i < list.length; i++) {
            var s = list[i];
            for (var j = 0; j < s.positions.length; j++) {
                if (s.positions[j].row === row && s.positions[j].col === col) return s;
            }
        }
        return null;
    }

    function isShipSunk(ship) { return ship.hits >= ship.size; }

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
        if (gameState.playerHits === SHIPS.length) { gameState.gameOver = true; showGameOver(true); return true; }
        if (gameState.enemyHits === SHIPS.length) { gameState.gameOver = true; showGameOver(false); return true; }
        return false;
    }

    function showGameOver(playerWon) {
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
            var stats = { victory: playerWon, shotsFired: gameState.shotsFired, hitRate: hitRate, shipsDestroyed: gameState.playerHits, consecutiveSinks: appSettings.consecutiveSinks, difficulty: gameState.difficulty };
            checkAchievements(stats);
            displayAchievements();
        }, 600);
    }

    function resetGame() {
        GRID_SIZE = parseInt(appSettings.gridSize, 10) || 10;
        gameState = {
            difficulty: null, currentShipIndex: 0, isHorizontal: true, playerBoard: null, enemyBoard: null,
            playerShips: [], enemyShips: [], playerHits: 0, enemyHits: 0, shotsFired: 0, hits: 0,
            isPlayerTurn: true, gameOver: false, aiLastHit: null, aiTargets: [], aiHitDirection: null
        };
        appSettings.consecutiveSinks = 0; appSettings.playerFleets = [null, null];
        initializeBoards();
        showScreenNew('menu-screen');
        updateStatus('Battleship');
        var startBtn = document.getElementById('start-game-btn'); if (startBtn) startBtn.disabled = true;
    }

    function copyBoard(board) {
        var b = createEmptyBoard();
        for (var r = 0; r < GRID_SIZE; r++) for (var c = 0; c < GRID_SIZE; c++) { b[r][c].ship = board[r][c].ship; b[r][c].hit = !!board[r][c].hit; }
        return b;
    }

    function copyShips(ships) {
        var out = [];
        for (var i = 0; i < ships.length; i++) out.push({ name: ships[i].name, size: ships[i].size, positions: JSON.parse(JSON.stringify(ships[i].positions)), hits: ships[i].hits || 0 });
        return out;
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})();
