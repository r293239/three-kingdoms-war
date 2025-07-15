<!DOCTYPE html>
<html lang="en" >
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Three Kingdoms War - Week 2</title>
  <style>
    body {
      margin: 0;
      font-family: sans-serif;
      background: #121212;
      color: #eee;
      display: flex;
      flex-direction: column;
      align-items: center;
      user-select: none;
    }
    #gameCanvas {
      background: #222;
      border: 2px solid #444;
      cursor: pointer;
      image-rendering: pixelated;
    }
    #infoBar {
      margin-top: 8px;
      max-width: 520px;
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: 1.1em;
    }
    #sidePanel {
      background: #222;
      border: 2px solid #444;
      margin-top: 12px;
      padding: 10px;
      width: 520px;
      height: 280px;
      overflow-y: auto;
      border-radius: 6px;
    }
    h1 {
      margin: 12px 0 6px;
    }
    button {
      background: #4caf50;
      border: none;
      padding: 8px 14px;
      color: white;
      font-weight: bold;
      cursor: pointer;
      border-radius: 4px;
      user-select: none;
    }
    button:disabled {
      background: #666;
      cursor: default;
    }
    label {
      font-weight: normal;
    }
    input[type=number] {
      width: 60px;
      margin-left: 5px;
      background: #333;
      border: 1px solid #555;
      color: #eee;
      padding: 2px 4px;
      border-radius: 3px;
    }
  </style>
</head>
<body>
  <h1>Three Kingdoms War - Week 2</h1>
  <canvas id="gameCanvas" width="500" height="500"></canvas>
  <div id="infoBar">
    <div>Turn: <span id="turnNumber">1</span></div>
    <div>Gold: <span id="goldAmount">100</span></div>
    <button id="endTurnBtn">End Turn</button>
  </div>
  <div id="sidePanel">
    <h2>City Management</h2>
    <div id="cityInfo">Click your city to manage armies and training.</div>
  </div>

  <script src="game.js"></script>
</body>
</html>
// === Part 2: Marching, Battle, Pathfinding ===

let marchingArmies = [];

function heuristic(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function reconstructPath(cameFrom, current) {
  let totalPath = [current];
  while (cameFrom[current[0] + ',' + current[1]]) {
    current = cameFrom[current[0] + ',' + current[1]];
    totalPath.unshift(current);
  }
  return totalPath;
}

function findPath(start, goal) {
  let openSet = [start];
  let cameFrom = {};
  let gScore = { [start.join(",")]: 0 };
  let fScore = { [start.join(",")]: heuristic(start, goal) };

  while (openSet.length > 0) {
    openSet.sort((a, b) => fScore[a.join(",")] - fScore[b.join(",")]);
    let current = openSet.shift();

    if (current[0] === goal[0] && current[1] === goal[1]) {
      return reconstructPath(cameFrom, current);
    }

    let neighbors = [
      [current[0] + 1, current[1]],
      [current[0] - 1, current[1]],
      [current[0], current[1] + 1],
      [current[0], current[1] - 1]
    ];

    for (let neighbor of neighbors) {
      const [nx, ny] = neighbor;
      if (nx < 0 || ny < 0 || nx >= MAP_SIZE || ny >= MAP_SIZE) continue;

      const key = neighbor.join(",");
      const tentativeG = gScore[current.join(",")] + 1;

      if (tentativeG < (gScore[key] || Infinity)) {
        cameFrom[key] = current;
        gScore[key] = tentativeG;
        fScore[key] = tentativeG + heuristic(neighbor, goal);
        if (!openSet.find(p => p[0] === nx && p[1] === ny)) openSet.push(neighbor);
      }
    }
  }

  return null;
}

function startMarching(fromCity, from, to, units, owner) {
  const path = findPath(from, to);
  if (!path) {
    alert('No path found!');
    return;
  }
  marchingArmies.push({
    from,
    to,
    currentPos: from.slice(),
    units,
    path,
    pathIndex: 0,
    owner
  });
}

function resolveBattle(armyA, armyB) {
  const damageA = Math.floor(armyB.units * 0.7);
  const damageB = Math.floor(armyA.units * 0.7);
  armyA.units = Math.max(0, armyA.units - damageA);
  armyB.units = Math.max(0, armyB.units - damageB);
}

function moveArmies() {
  for (let i = marchingArmies.length - 1; i >= 0; i--) {
    const army = marchingArmies[i];
    army.pathIndex++;
    if (army.pathIndex >= army.path.length) {
      const [destX, destY] = army.to;
      const destTile = map[destY][destX];

      if (destTile.cityData) {
        if (destTile.cityData.owner !== army.owner) {
          // Battle
          resolveBattle(army, destTile.cityData);
          if (army.units > 0 && destTile.cityData.armies <= 0) {
            destTile.cityData.owner = army.owner;
            destTile.cityData.armies = army.units;
            army.units = 0;
            if (army.owner === 'player') {
              destTile.type = TILE_PLAYER_CITY;
            } else {
              destTile.type = TILE_AI_CITY;
            }
          } else {
            destTile.cityData.armies = Math.max(0, destTile.cityData.armies);
          }
        } else {
          // Merge
          destTile.cityData.armies += army.units;
        }
      } else {
        // Capture neutral tile (convert to player city)
        map[destY][destX] = {
          type: army.owner === 'player' ? TILE_PLAYER_CITY : TILE_AI_CITY,
          cityData: {
            name: 'New City',
            gold: 20,
            armies: army.units,
            barracks: true,
            trainingQueue: 0,
            owner: army.owner
          }
        };
      }

      marchingArmies.splice(i, 1); // Army completed
    } else {
      army.currentPos = army.path[army.pathIndex];
    }
  }
}
// === Part 3: Turns, AI, Training, UI ===

let turn = 1;

function endTurn() {
  // Train armies
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const tile = map[y][x];
      if (tile.cityData) {
        if (tile.cityData.trainingQueue > 0) {
          tile.cityData.armies += tile.cityData.trainingQueue;
          tile.cityData.trainingQueue = 0;
        }

        // Income
        if (tile.cityData.owner === 'player') {
          tile.cityData.gold += 10;
        } else if (tile.cityData.owner === 'ai') {
          tile.cityData.gold += 8;
        }
      }
    }
  }

  // Move armies
  moveArmies();

  // AI logic
  doAITurn();

  // Update
  turn++;
  updateGoldUI();
  turnNumberElem.textContent = turn;
  draw();
}

endTurnBtn.addEventListener('click', endTurn);

function updateGoldUI() {
  let gold = 0;
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      let tile = map[y][x];
      if (tile.cityData?.owner === 'player') {
        gold += tile.cityData.gold;
      }
    }
  }
  goldAmountElem.textContent = gold;
}
updateGoldUI();

function doAITurn() {
  for (let y = 0; y < MAP_SIZE; y++) {
    for (let x = 0; x < MAP_SIZE; x++) {
      const tile = map[y][x];
      if (tile.cityData?.owner === 'ai') {
        if (tile.cityData.gold >= 20 && tile.cityData.barracks) {
          tile.cityData.trainingQueue = 5;
          tile.cityData.gold -= 20;
        }

        // Look for nearby player cities to attack
        for (let dx = -4; dx <= 4; dx++) {
          for (let dy = -4; dy <= 4; dy++) {
            const nx = x + dx;
            const ny = y + dy;
            if (
              nx >= 0 && ny >= 0 && nx < MAP_SIZE && ny < MAP_SIZE &&
              map[ny][nx].cityData?.owner === 'player' &&
              tile.cityData.armies >= 10
            ) {
              startMarching(tile.cityData, [x, y], [nx, ny], 10, 'ai');
              tile.cityData.armies -= 10;
              break;
            }
          }
        }
      }
    }
  }
}

// === UI Logic ===

function showCityPanel(city) {
  cityInfoElem.innerHTML = `
    <p><strong>${city.name}</strong> (${city.owner})</p>
    <p>Gold: ${city.gold}</p>
    <p>Armies: ${city.armies}</p>
    <p>Training Queue: ${city.trainingQueue}</p>
    <div>
      <button onclick="trainTroops()">Train (5 troops for 20 gold)</button>
    </div>
    <div style="margin-top:10px">
      <label>Send Armies:</label>
      <input type="number" id="armyInput" min="1" max="${city.armies}" value="0" />
      <button onclick="confirmSendArmies()">Select Tile</button>
    </div>
  `;
}

function trainTroops() {
  if (!selectedCityCoords) return;
  const [x, y] = selectedCityCoords;
  const city = map[y][x].cityData;
  if (city.gold >= 20) {
    city.gold -= 20;
    city.trainingQueue += 5;
    showCityPanel(city);
    updateGoldUI();
  } else {
    alert('Not enough gold!');
  }
}

function confirmSendArmies() {
  const input = document.getElementById('armyInput');
  const count = parseInt(input.value);
  if (!isNaN(count) && count > 0) {
    selectedArmySendCount = count;
    alert('Now click a target tile to send the army.');
  } else {
    alert('Invalid number of troops.');
  }
}
