(function() {
    "use strict";

    var GRID_SIZE = 10;
    var SHIPS = [
        { name: "Carrier", size: 5 },
        { name: "Battleship", size: 4 },
        { name: "Cruiser", size: 3 },
        { name: "Submarine", size: 3 },
        { name: "Destroyer", size: 2 }
    ];

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
        initializeBoards();
        attachMenuListeners();
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
        document.getElementById("easy-btn").onclick = function() { startGame("easy"); };
        document.getElementById("medium-btn").onclick = function() { startGame("medium"); };
        document.getElementById("hard-btn").onclick = function() { startGame("hard"); };
        document.getElementById("rotate-btn").onclick = rotateShip;
        document.getElementById("random-btn").onclick = randomPlacement;
        document.getElementById("start-game-btn").onclick = beginBattle;
        document.getElementById("play-again-btn").onclick = resetGame;
    }

    function startGame(difficulty) {
        gameState.difficulty = difficulty;
        gameState.currentShipIndex = 0;
        gameState.isHorizontal = true;
        gameState.playerShips = [];
        gameState.enemyShips = [];

        initializeBoards();
        placeEnemyShips();

        showScreen("setup-screen");
        updateStatus("Place your " + SHIPS[0].name);
        renderSetupGrid();
        updateShipInfo();
    }

    function showScreen(screenId) {
        var screens = ["menu-screen", "setup-screen", "game-screen", "game-over-screen"];
        for (var i = 0; i < screens.length; i++) {
            var screen = document.getElementById(screens[i]);
            if (screens[i] === screenId) {
                screen.className = "screen";
            } else {
                screen.className = "screen hidden";
            }
        }
    }

    function updateStatus(message) {
        document.getElementById("status").textContent = message;
    }

    function renderSetupGrid() {
        var container = document.getElementById("player-setup-grid");
        container.innerHTML = "";

        for (var row = 0; row < GRID_SIZE; row++) {
            var rowDiv = document.createElement("div");
            rowDiv.className = "grid-row";

            for (var col = 0; col < GRID_SIZE; col++) {
                var cell = document.createElement("div");
                cell.className = "grid-cell";
                cell.setAttribute("data-row", row);
                cell.setAttribute("data-col", col);

                if (gameState.playerBoard[row][col].ship !== null) {
                    cell.className += " ship";
                }

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

        var row = parseInt(e.target.getAttribute("data-row"));
        var col = parseInt(e.target.getAttribute("data-col"));
        var ship = SHIPS[gameState.currentShipIndex];

        clearPreviews();
        showShipPreview(row, col, ship.size, gameState.isHorizontal);
    }

    function setupCellOut() {
        clearPreviews();
    }

    function clearPreviews() {
        var cells = document.getElementById("player-setup-grid").getElementsByClassName("grid-cell");
        for (var i = 0; i < cells.length; i++) {
            cells[i].className = cells[i].className.replace(" preview", "").replace(" invalid", "");
        }
    }

    function showShipPreview(row, col, size, isHorizontal) {
        var valid = canPlaceShip(gameState.playerBoard, row, col, size, isHorizontal);
        var className = valid ? " preview" : " invalid";

        for (var i = 0; i < size; i++) {
            var r = isHorizontal ? row : row + i;
            var c = isHorizontal ? col + i : col;

            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
                var cell = document.querySelector('[data-row="" + r + ""][data-col="" + c + ""]');
                if (cell && cell.className.indexOf("ship") === -1) {
                    cell.className += className;
                }
            }
        }
    }

    function setupCellClick(e) {
        if (gameState.currentShipIndex >= SHIPS.length) return;

        var row = parseInt(e.target.getAttribute("data-row"));
        var col = parseInt(e.target.getAttribute("data-col"));
        var ship = SHIPS[gameState.currentShipIndex];

        if (canPlaceShip(gameState.playerBoard, row, col, ship.size, gameState.isHorizontal)) {
            placeShip(gameState.playerBoard, gameState.playerShips, row, col, ship, gameState.isHorizontal);
            gameState.currentShipIndex++;

            if (gameState.currentShipIndex < SHIPS.length) {
                updateStatus("Place your " + SHIPS[gameState.currentShipIndex].name);
                updateShipInfo();
            } else {
                updateStatus("All ships placed! Ready to begin battle.");
                document.getElementById("start-game-btn").disabled = false;
            }

            renderSetupGrid();
        }
    }

    function updateShipInfo() {
        if (gameState.currentShipIndex < SHIPS.length) {
            var ship = SHIPS[gameState.currentShipIndex];
            document.getElementById("current-ship").textContent = ship.name + " (" + ship.size + " cells)";
        } else {
            document.getElementById("current-ship").textContent = "All ships placed!";
        }
    }

    function canPlaceShip(board, row, col, size, isHorizontal) {
        for (var i = 0; i < size; i++) {
            var r = isHorizontal ? row : row + i;
            var c = isHorizontal ? col + i : col;

            if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) {
                return false;
            }

            if (board[r][c].ship !== null) {
                return false;
            }
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

        shipsList.push({
            name: ship.name,
            size: ship.size,
            positions: positions,
            hits: 0
        });
    }

    function rotateShip() {
        gameState.isHorizontal = !gameState.isHorizontal;
        clearPreviews();
    }

    function randomPlacement() {
        gameState.playerShips = [];
        initializeBoards();
        placeEnemyShips();

        for (var i = 0; i < SHIPS.length; i++) {
            var placed = false;
            var attempts = 0;

            while (!placed && attempts < 100) {
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
        document.getElementById("start-game-btn").disabled = false;
        updateStatus("All ships placed! Ready to begin battle.");
        updateShipInfo();
        renderSetupGrid();
    }

    function placeEnemyShips() {
        gameState.enemyShips = [];

        for (var i = 0; i < SHIPS.length; i++) {
            var placed = false;
            var attempts = 0;

            while (!placed && attempts < 100) {
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
        gameState.shotsFired = 0;
        gameState.hits = 0;
        gameState.playerHits = 0;
        gameState.enemyHits = 0;
        gameState.isPlayerTurn = true;
        gameState.gameOver = false;
        gameState.aiLastHit = null;
        gameState.aiTargets = [];
        gameState.aiHitDirection = null;

        showScreen("game-screen");
        updateStatus("Your turn - Select enemy waters to fire!");
        renderGameGrids();
        updateStats();
    }

    function renderGameGrids() {
        renderPlayerGameGrid();
        renderEnemyGrid();
    }

    function renderPlayerGameGrid() {
        var container = document.getElementById("player-game-grid");
        container.innerHTML = "";

        for (var row = 0; row < GRID_SIZE; row++) {
            var rowDiv = document.createElement("div");
            rowDiv.className = "grid-row";

            for (var col = 0; col < GRID_SIZE; col++) {
                var cell = document.createElement("div");
                cell.className = "grid-cell";

                var cellData = gameState.playerBoard[row][col];

                if (cellData.ship !== null) {
                    cell.className += " ship";
                }

                if (cellData.hit) {
                    if (cellData.ship !== null) {
                        var ship = findShip(gameState.playerShips, row, col);
                        if (ship && isShipSunk(ship)) {
                            cell.className += " sunk";
                        } else {
                            cell.className += " hit";
                        }
                    } else {
                        cell.className += " miss";
                    }
                }

                rowDiv.appendChild(cell);
            }
            container.appendChild(rowDiv);
        }
    }

    function renderEnemyGrid() {
        var container = document.getElementById("enemy-grid");
        container.innerHTML = "";

        for (var row = 0; row < GRID_SIZE; row++) {
            var rowDiv = document.createElement("div");
            rowDiv.className = "grid-row";

            for (var col = 0; col < GRID_SIZE; col++) {
                var cell = document.createElement("div");
                cell.className = "grid-cell";
                cell.setAttribute("data-row", row);
                cell.setAttribute("data-col", col);

                var cellData = gameState.enemyBoard[row][col];

                if (cellData.hit) {
                    if (cellData.ship !== null) {
                        var ship = findShip(gameState.enemyShips, row, col);
                        if (ship && isShipSunk(ship)) {
                            cell.className += " sunk";
                        } else {
                            cell.className += " hit";
                        }
                    } else {
                        cell.className += " miss";
                    }
                    cell.style.cursor = "not-allowed";
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

        var row = parseInt(e.target.getAttribute("data-row"));
        var col = parseInt(e.target.getAttribute("data-col"));

        if (gameState.enemyBoard[row][col].hit) return;

        gameState.shotsFired++;
        gameState.enemyBoard[row][col].hit = true;

        var cell = e.target;
        cell.className += " animating";

        setTimeout(function() {
            if (gameState.enemyBoard[row][col].ship !== null) {
                gameState.hits++;
                var ship = findShip(gameState.enemyShips, row, col);
                if (ship) {
                    ship.hits++;
                    if (isShipSunk(ship)) {
                        updateStatus("You sunk the enemy " + ship.name + "!");
                        gameState.playerHits++;
                    } else {
                        updateStatus("Hit!");
                    }
                }
            } else {
                updateStatus("Miss!");
            }

            renderGameGrids();
            updateStats();

            if (checkGameOver()) return;

            gameState.isPlayerTurn = false;

            setTimeout(function() {
                enemyTurn();
            }, 800);
        }, 300);
    }

    function enemyTurn() {
        if (gameState.gameOver) return;

        updateStatus("Enemy is attacking...");

        setTimeout(function() {
            var target = getAITarget();
            var row = target.row;
            var col = target.col;

            gameState.playerBoard[row][col].hit = true;

            if (gameState.playerBoard[row][col].ship !== null) {
                var ship = findShip(gameState.playerShips, row, col);
                if (ship) {
                    ship.hits++;
                    gameState.aiLastHit = { row: row, col: col };
                    addAdjacentTargets(row, col);

                    if (isShipSunk(ship)) {
                        updateStatus("Enemy sunk your " + ship.name + "!");
                        gameState.enemyHits++;
                        gameState.aiLastHit = null;
                        gameState.aiTargets = [];
                        gameState.aiHitDirection = null;
                    } else {
                        updateStatus("Enemy hit your ship!");
                    }
                }
            } else {
                updateStatus("Enemy missed!");
            }

            renderGameGrids();
            updateStats();

            if (checkGameOver()) return;

            gameState.isPlayerTurn = true;
            setTimeout(function() {
                updateStatus("Your turn - Select enemy waters to fire!");
            }, 800);
        }, 600);
    }

    function getAITarget() {
        var difficulty = gameState.difficulty;

        if (difficulty === "easy") {
            return getRandomTarget();
        } else if (difficulty === "medium") {
            if (gameState.aiTargets.length > 0 && Math.random() < 0.7) {
                return gameState.aiTargets.shift();
            }
            return getRandomTarget();
        } else {
            if (gameState.aiTargets.length > 0) {
                return gameState.aiTargets.shift();
            }
            return getRandomTarget();
        }
    }

    function getRandomTarget() {
        var attempts = 0;
        while (attempts < 100) {
            var row = Math.floor(Math.random() * GRID_SIZE);
            var col = Math.floor(Math.random() * GRID_SIZE);

            if (!gameState.playerBoard[row][col].hit) {
                return { row: row, col: col };
            }
            attempts++;
        }

        for (var r = 0; r < GRID_SIZE; r++) {
            for (var c = 0; c < GRID_SIZE; c++) {
                if (!gameState.playerBoard[r][c].hit) {
                    return { row: r, col: c };
                }
            }
        }

        return { row: 0, col: 0 };
    }

    function addAdjacentTargets(row, col) {
        var directions = [
            { row: -1, col: 0 },
            { row: 1, col: 0 },
            { row: 0, col: -1 },
            { row: 0, col: 1 }
        ];

        for (var i = 0; i < directions.length; i++) {
            var newRow = row + directions[i].row;
            var newCol = col + directions[i].col;

            if (newRow >= 0 && newRow < GRID_SIZE && newCol >= 0 && newCol < GRID_SIZE) {
                if (!gameState.playerBoard[newRow][newCol].hit) {
                    var exists = false;
                    for (var j = 0; j < gameState.aiTargets.length; j++) {
                        if (gameState.aiTargets[j].row === newRow && gameState.aiTargets[j].col === newCol) {
                            exists = true;
                            break;
                        }
                    }
                    if (!exists) {
                        gameState.aiTargets.push({ row: newRow, col: newCol });
                    }
                }
            }
        }
    }

    function findShip(shipsList, row, col) {
        for (var i = 0; i < shipsList.length; i++) {
            var ship = shipsList[i];
            for (var j = 0; j < ship.positions.length; j++) {
                if (ship.positions[j].row === row && ship.positions[j].col === col) {
                    return ship;
                }
            }
        }
        return null;
    }

    function isShipSunk(ship) {
        return ship.hits >= ship.size;
    }

    function updateStats() {
        document.getElementById("player-ships").textContent = (SHIPS.length - gameState.enemyHits);
        document.getElementById("enemy-ships").textContent = (SHIPS.length - gameState.playerHits);
        document.getElementById("shot-count").textContent = gameState.shotsFired;

        var hitRate = gameState.shotsFired > 0 ? Math.round((gameState.hits / gameState.shotsFired) * 100) : 0;
        document.getElementById("hit-rate").textContent = hitRate + "%";
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
        setTimeout(function() {
            showScreen("game-over-screen");

            document.getElementById("result-title").textContent = playerWon ? "Victory!" : "Defeat";
            document.getElementById("final-shots").textContent = gameState.shotsFired;

            var hitRate = gameState.shotsFired > 0 ? Math.round((gameState.hits / gameState.shotsFired) * 100) : 0;
            document.getElementById("final-rate").textContent = hitRate + "%";
            document.getElementById("final-sunk").textContent = gameState.playerHits + " / " + SHIPS.length;
        }, 1000);
    }

    function resetGame() {
        gameState = {
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

        initializeBoards();
        showScreen("menu-screen");
        updateStatus("Select Difficulty to Start");
        document.getElementById("start-game-btn").disabled = true;
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
