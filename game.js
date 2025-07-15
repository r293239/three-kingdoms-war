// Constants
const MAP_SIZE = 100;
const TILE_SIZE = 25; 
const VIEW_SIZE = 20; 

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const turnNumberElem = document.getElementById('turnNumber');
const goldAmountElem = document.getElementById('goldAmount');
const endTurnBtn = document.getElementById('endTurnBtn');
const cityInfoElem = document.getElementById('cityInfo');

// Tile types
const TILE_NEUTRAL = 0;
const TILE_PLAYER_CITY = 1;
const TILE_PLAYER_CAPITAL = 2;

// Map data structure: 2D array of tiles { type, cityData }
let map = [];
for(let y=0; y<MAP_SIZE; y++) {
  let row = [];
  for(let x=0; x<MAP_SIZE; x++) {
    row.push({ type: TILE_NEUTRAL, cityData: null });
  }
  map.push(row);
}

// Initialize player capital near center
const capitalX = Math.floor(MAP_SIZE/2);
const capitalY = Math.floor(MAP_SIZE/2);
map[capitalY][capitalX] = {
  type: TILE_PLAYER_CAPITAL,
  cityData: {
    name: 'Capital',
    gold: 100,
    armies: 20,
    barracks: true,
    trainingQueue: 0
  }
};

// Create 3 nearby cities
const nearbyCities = [
  [capitalX+2, capitalY],
  [capitalX, capitalY+2],
  [capitalX-2, capitalY-1],
];

nearbyCities.forEach(([x,y], i) => {
  if(x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE) {
    map[y][x] = {
      type: TILE_PLAYER_CITY,
      cityData: {
        name: `City ${i+1}`,
        gold: 50,
        armies: 10,
        barracks: true,
        trainingQueue: 0
      }
    };
  }
});

// Viewport start position
let viewX = capitalX - Math.floor(VIEW_SIZE/2);
let viewY = capitalY - Math.floor(VIEW_SIZE/2);

function clampViewport() {
  viewX = Math.max(0, Math.min(viewX, MAP_SIZE - VIEW_SIZE));
  viewY = Math.max(0, Math.min(viewY, MAP_SIZE - VIEW_SIZE));
}
clampViewport();

// Player global gold tracker (sum of city golds)
function calculatePlayerGold() {
  let totalGold = 0;
  for(let y=0; y<MAP_SIZE; y++) {
    for(let x=0; x<MAP_SIZE; x++) {
      let tile = map[y][x];
      if(tile.cityData) totalGold += tile.cityData.gold;
    }
  }
  return totalGold;
}

// Draw the visible map area
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for(let y=0; y<VIEW_SIZE; y++) {
    for(let x=0; x<VIEW_SIZE; x++) {
      let mapX = viewX + x;
      let mapY = viewY + y;
      let tile = map[mapY][mapX];

      // Tile colors
      let color = '#444'; // neutral land
      if(tile.type === TILE_PLAYER_CAPITAL) color = '#1e7d32'; // dark green
      else if(tile.type === TILE_PLAYER_CITY) color = '#4caf50'; // lighter green

      ctx.fillStyle = color;
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      // Draw armies count on city tiles
      if(tile.cityData) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(tile.cityData.armies, x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE - 6);
      }

      // Draw tile border
      ctx.strokeStyle = '#222';
      ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // Draw marching armies
  marchingArmies.forEach(army => {
    let [mx, my] = army.currentPos;
    if(mx >= viewX && mx < viewX + VIEW_SIZE && my >= viewY && my < viewY + VIEW_SIZE) {
      let drawX = (mx - viewX) * TILE_SIZE + TILE_SIZE/2;
      let drawY = (my - viewY) * TILE_SIZE + TILE_SIZE/2;

      ctx.fillStyle = 'deepskyblue';
      ctx.beginPath();
      ctx.arc(drawX, drawY, TILE_SIZE/3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#000';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(army.units, drawX, drawY);
    }
  });
}
draw();

// Handle viewport movement by arrow keys / WASD
window.addEventListener('keydown', e => {
  switch(e.key) {
    case 'ArrowUp':
    case 'w':
    case 'W':
      viewY--;
      break;
    case 'ArrowDown':
    case 's':
    case 'S':
      viewY++;
      break;
    case 'ArrowLeft':
    case 'a':
    case 'A':
      viewX--;
      break;
    case 'ArrowRight':
    case 'd':
    case 'D':
      viewX++;
      break;
  }
  clampViewport();
  draw();
});

// Track selected city coords
let selectedCityCoords = null;
let selectedArmySendCount = 0;

// Map click handler for selecting city or sending armies
canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const tileX = Math.floor(clickX / TILE_SIZE);
  const tileY = Math.floor(clickY / TILE_SIZE);

  const mapX = viewX + tileX;
  const mapY = viewY + tileY;

  if(mapX < 0 || mapX >= MAP_SIZE || mapY < 0 || mapY >= MAP_SIZE) return;

  const tile = map[mapY][mapX];

  if(tile.cityData && (tile.type === TILE_PLAYER_CITY || tile.type === TILE_PLAYER_CAPITAL)) {
    selectedCityCoords = [mapX, mapY];
    selectedArmySendCount = 0;
    showCityPanel(tile.cityData);
  } else if(selectedCityCoords) {
    // Try to send armies marching if valid
    let [sx, sy] = selectedCityCoords;
    let sourceTile = map[sy][sx];
    if(sourceTile.cityData && sourceTile.cityData.armies > 0) {
      if(selectedArmySendCount <= 0) {
        alert('Enter soldiers to send in city panel first.');
        return;
      }
      if(selectedArmySendCount > sourceTile.cityData.armies) {
        alert('Not enough armies in source city.');
        return;
      }
      if((tile.type === TILE_PLAYER_CITY || tile.type === TILE_PLAYER_CAPITAL) && (mapX !== sx || mapY !== sy)) {
        // Start marching
        startMarching(sourceTile.cityData, [sx, sy], [mapX, mapY], selectedArmySendCount);
        sourceTile.cityData.armies -= selectedArmySendCount;
        selectedArmySendCount = 0;
        showCityPanel(sourceTile.cityData);
        draw();
      }
    }
  }
});

// Show city management panel with training & sending armies
function showCityPanel(city) {
  cityInfoElem.innerHTML = `
    <strong>${city.name}</strong><br>
    Gold: ${city.gold}<br>
    Armies: ${city.armies}<br>
    Barracks: ${city.barracks ? 'Built' : 'None'}<br>
    Training queue: ${city.trainingQueue} turns left<br><br>

    <label>Train Soldiers (10 gold each): 
      <input id="trainCount" type="number" min="0" max="${Math.floor(city.gold / 10)}" value="0" />
    </label>
    <button id="trainBtn">Train</button>
    <hr>
    <label>Send Soldiers:
      <input id="sendCount" type="number" min="0" max="${city.armies}" value="0" />
    </label>
    <p>Click on a destination city tile to send soldiers marching.</p>
  `;

  const trainBtn = document.getElementById('trainBtn');
  const trainCountInput = document.getElementById('trainCount');
  const sendCountInput = document.getElementById('sendCount');

  trainBtn.onclick = () => {
    const count = parseInt(trainCountInput.value);
    if(isNaN(count) || count <= 0) {
      alert('Enter a valid number to train.');
      return;
    }
    const cost = count * 10;
    if(cost > city.gold) {
      alert('Not enough gold.');
      return;
    }
    city.gold -= cost;
    city.trainingQueue += count; // 1 turn per soldier training
    showCityPanel(city);
    draw();
  };

  sendCountInput.oninput = () => {
    let val = parseInt(sendCountInput.value);
    if(isNaN(val) || val < 0) val = 0;
    if(val > city.armies) val = city.armies;
    selectedArmySendCount = val;
    sendCountInput.value = val;
  };
}

// Marching armies: array of objects { from, to, currentPos, units, path, pathIndex }
let marchingArmies = [];

// Simple A* pathfinding
function findPath(start, goal) {
  let openSet = [];
  let cameFrom = {};
  let gScore = {};
  let fScore = {};

  function key(pos) { return pos[0] + ',' + pos[1]; }

  openSet.push(start);
  gScore[key(start)] = 0;
  fScore[key(start)] = heuristic(start, goal);

  while(openSet.length > 0) {
    // Get node with lowest fScore
    openSet.sort((a,b) => fScore[key(a)] - fScore[key(b)]);
    let current = openSet.shift();

    if(current[0] === goal[0] && current[1] === goal[1]) {
      return reconstructPath(cameFrom, current);
    }

    // Neighbors (4-directional)
    let neighbors = [
      [current[0]+1, current[1]],
      [current[0]-1, current[1]],
      [current[0], current[1]+1],
      [current[0], current[1]-1],
    ];

    neighbors.forEach(neighbor => {
      let [nx, ny] = neighbor;
      if(nx < 0 || ny < 0 || nx >= MAP_SIZE || ny >= MAP_SIZE) return;

      // Only walkable on player cities or neutral (can expand)
      let tileType = map[ny][nx].type;
      if(tileType !== TILE_NEUTRAL && tileType !== TILE_PLAYER_CITY && tileType !== TILE_PLAYER_CAPITAL) return;

      let tentativeG = gScore[key(current)] + 1;
      if(tentativeG < (gScore[key(neighbor)] || Infinity)) {
        cameFrom[key(neighbor)] = current;
        gScore[key(neighbor)] = tentativeG;
        fScore[key(neighbor)] = tentativeG + heuristic(neighbor, goal);
        if(!openSet.some(n => n[0] === nx && n[1] === ny)) {
          openSet.push(neighbor);
        }
      }
    });
  }

  // No path found
  return null;
}

function heuristic(a,b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
}

function reconstructPath(cameFrom, current) {
  let totalPath = [current];
  while(cameFrom[current[0] + ',' + current[1]]) {
    current = cameFrom[current[0] + ',' + current[1]];
    totalPath.unshift(current);
  }
  return totalPath;
}

function startMarching(city, from, to, units) {
  const path = findPath(from, to);
  if(!path) {
    alert('No valid path found to destination!');
    return;
  }
  marchingArmies.push({
    from,
    to,
    currentPos: from.slice(),
    units,
    path,
    pathIndex: 0,
  });
}

// Move marching armies 1 tile per turn
function moveArmies() {
  for(let i = marchingArmies.length - 1; i >= 0; i--) {
    let army = marchingArmies[i];
    if(army.pathIndex < army.path.length - 1) {
      army.pathIndex++;
      army.currentPos = army.path[army.pathIndex];
    } else {
      // Arrived at destination
      let [dx, dy] = army.to;
      let tile = map[dy][dx];

      if(tile.cityData && (tile.type === TILE_PLAYER_CITY || tile.type === TILE_PLAYER_CAPITAL)) {
        tile.cityData.armies += army.units;
      } else if(tile.type === TILE_NEUTRAL) {
        // Capture neutral tile as city (optional)
        tile.type = TILE_PLAYER_CITY;
        tile.cityData = {
          name: `City ${dx},${dy}`,
          gold: 50,
          armies: army.units,
          barracks: false,
          trainingQueue: 0
        };
      }

      marchingArmies.splice(i, 1);
    }
  }
}

endTurnBtn.addEventListener('click', () => {
  let turnNum = parseInt(turnNumberElem.textContent);
  turnNum++;
  turnNumberElem.textContent = turnNum;

  // Gold income + 10 gold per city
  for(let y=0; y<MAP_SIZE; y++) {
    for(let x=0; x<MAP_SIZE; x++) {
      let tile = map[y][x];
      if(tile.cityData) {
        tile.cityData.gold += 10;

        // Process training queue: train 1 soldier per turn per queue count
        if(tile.cityData.trainingQueue > 0) {
          tile.cityData.armies++;
          tile.cityData.trainingQueue--;
        }
      }
    }
  }

  // Move marching armies
  moveArmies();

  goldAmountElem.textContent = calculatePlayerGold();

  draw();

  // Update panel if city selected
  if(selectedCityCoords) {
    let [x,y] = selectedCityCoords;
    showCityPanel(map[y][x].cityData);
  }
});

