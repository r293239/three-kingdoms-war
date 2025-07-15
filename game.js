// Constants
const MAP_SIZE = 100;
const TILE_SIZE = 25;
const VIEW_SIZE = 20;

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const endTurnBtn = document.getElementById('endTurnBtn');
const turnInfo = document.getElementById('turnInfo');
const goldInfo = document.getElementById('goldInfo');
const cityDetails = document.getElementById('cityDetails');

// Tile types:
const TILE_NEUTRAL = 0;
const TILE_PLAYER_CITY = 1;
const TILE_PLAYER_CAPITAL = 2;
const TILE_NEUTRAL_CITY = 3;
const TILE_ENEMY_CAPITAL = 4;

// Map & Game State
let map = [];
for (let i=0; i<MAP_SIZE; i++) {
  let row = [];
  for(let j=0; j<MAP_SIZE; j++) row.push({ type: TILE_NEUTRAL, city: null });
  map.push(row);
}

// Player capital and cities setup
const startX = Math.floor(MAP_SIZE / 2);
const startY = Math.floor(MAP_SIZE / 2);

map[startY][startX].type = TILE_PLAYER_CAPITAL;
map[startY][startX].city = {
  name: 'Capital',
  gold: 100,
  armies: 20,
  buildingBarracks: true,
  trainingQueue: 0
};

const nearbyCities = [
  [startX+1, startY],
  [startX, startY+1],
  [startX-1, startY],
];
nearbyCities.forEach(([x,y],i) => {
  if(x >= 0 && x < MAP_SIZE && y >= 0 && y < MAP_SIZE) {
    map[y][x].type = TILE_PLAYER_CITY;
    map[y][x].city = {
      name: `City ${i+1}`,
      gold: 50,
      armies: 10,
      buildingBarracks: true,
      trainingQueue: 0
    };
  }
});

let viewX = startX - Math.floor(VIEW_SIZE/2);
let viewY = startY - Math.floor(VIEW_SIZE/2);

function clampViewport() {
  viewX = Math.max(0, Math.min(viewX, MAP_SIZE - VIEW_SIZE));
  viewY = Math.max(0, Math.min(viewY, MAP_SIZE - VIEW_SIZE));
}

clampViewport();

let turn = 1;
let playerGold = 100;

// Army marching structure
// Each army group marching is:
// { from: [x,y], to: [x,y], currentPos: [x,y], units: number, moving: true/false }

let marchingArmies = [];

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for(let y=0; y<VIEW_SIZE; y++) {
    for(let x=0; x<VIEW_SIZE; x++) {
      let mapX = viewX + x;
      let mapY = viewY + y;
      let tile = map[mapY][mapX];

      let color = '#444';
      switch(tile.type) {
        case TILE_NEUTRAL: color = '#444'; break;
        case TILE_PLAYER_CITY: color = '#4caf50'; break;
        case TILE_PLAYER_CAPITAL: color = '#2e7d32'; break;
        case TILE_NEUTRAL_CITY: color = '#888'; break;
        case TILE_ENEMY_CAPITAL: color = '#b71c1c'; break;
      }

      ctx.fillStyle = color;
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      // Draw city armies count
      if(tile.city) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(tile.city.armies, x * TILE_SIZE + TILE_SIZE/2, y * TILE_SIZE + TILE_SIZE - 5);
      }

      ctx.strokeStyle = '#222';
      ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }

  // Draw marching armies on visible map
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
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(army.units, drawX, drawY);
    }
  });
}

draw();

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

let selectedCityCoords = null;
let selectedArmySendCount = 0;

canvas.addEventListener('click', e => {
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const tileX = Math.floor(clickX / TILE_SIZE);
  const tileY = Math.floor(clickY / TILE_SIZE);

  const mapX = viewX + tileX;
  const mapY = viewY + tileY;

  if(mapY < 0 || mapY >= MAP_SIZE || mapX < 0 || mapX >= MAP_SIZE) return;

  let tile = map[mapY][mapX];

  // Select player's city
  if(tile.city && (tile.type === TILE_PLAYER_CITY || tile.type === TILE_PLAYER_CAPITAL)) {
    selectedCityCoords = [mapX, mapY];
    showCityDetails(tile.city);
  } else if(selectedCityCoords) {
    // Try to send armies from selected city to clicked tile if city owned
    let [sx, sy] = selectedCityCoords;
    let sourceTile = map[sy][sx];
    if(sourceTile.city && sourceTile.city.armies > 0) {
      // Check if clicked tile is city owned by player or neutral city to march to
      if((tile.type === TILE_PLAYER_CITY || tile.type === TILE_PLAYER_CAPITAL || tile.type === TILE_NEUTRAL_CITY) && (mapY !== sy || mapX !== sx)) {
        if(selectedArmySendCount <= 0) {
          alert('Enter soldiers to send in city panel first.');
          return;
        }
        if(selectedArmySendCount > sourceTile.city.armies) {
          alert('Not enough armies in source city.');
          return;
        }
        // Create marching army
        marchingArmies.push({
          from: [sx, sy],
          to: [mapX, mapY],
          currentPos: [sx, sy],
          units: selectedArmySendCount,
          moving: true
        });
        sourceTile.city.armies -= selectedArmySendCount;
        selectedArmySendCount = 0;
        showCityDetails(sourceTile.city);
        draw();
      }
    }
  }
});

function showCityDetails(city) {
  cityDetails.innerHTML = `
    <div class="city-info">
      <strong>${city.name}</strong><br>
      Gold: ${city.gold}<br>
      Armies: ${city.armies}<br>
      Barracks: ${city.buildingBarracks ? 'Built' : 'None'}<br>
      <label>Train Soldiers (10 gold each): 
        <input id="trainCount" type="number" min="0" max="${city.gold}" value="0" />
      </label>
      <button id="trainBtn">Train</button>
      <hr>
      <label>Send Soldiers:
        <input id="sendCount" type="number" min="0" max="${city.armies}" value="0" />
      </label>
      <p>Click on a destination city tile on the map to send the selected soldiers marching.</p>
    </div>
  `;

  const trainBtn = document.getElementById('trainBtn');
  const trainCountInput = document.getElementById('trainCount');
  const sendCountInput = document.getElementById('sendCount');

  trainBtn.addEventListener('click', () => {
    const count = parseInt(trainCountInput.value);
    if(isNaN(count) || count <= 0) {
      alert('Enter a valid number of soldiers to train.');
      return;
    }
    const cost = count * 10;
    if(cost > city.gold) {
      alert('Not enough gold.');
      return;
    }
    city.gold -= cost;
    city.armies += count;
    cityDetails.querySelector('div.city-info').remove();
    showCityDetails(city);
    draw();
  });

  sendCountInput.addEventListener('input', () => {
    let val = parseInt(sendCountInput.value);
    if(isNaN(val) || val < 0) val = 0;
    if(val > city.armies) val = city.armies;
    selectedArmySendCount = val;
    sendCountInput.value = val;
  });
}

// Move armies one tile closer to their target
function moveArmies() {
  marchingArmies.forEach((army, index) => {
    if(!army.moving) return;

    let [cx, cy] = army.currentPos;
    let [tx, ty] = army.to;

    if(cx === tx && cy === ty) {
      // Arrived
      // Merge with city armies if city belongs to player
      let tile = map[ty][tx];
      if(tile.city && (tile.type === TILE_PLAYER_CITY || tile.type === TILE_PLAYER_CAPITAL)) {
        tile.city.armies += army.units;
      } else if(tile.type === TILE_NEUTRAL_CITY) {
        // Capture neutral city and set as player city
        tile.type = TILE_PLAYER_CITY;
        tile.city = {
          name: `City ${tx},${ty}`,
          gold: 50,
          armies: army.units,
          buildingBarracks: true,
          trainingQueue: 0
        };
      }
      // Remove marching army
      marchingArmies.splice(index, 1);
      return;
    }

    // Calculate next step toward target
    let dx = tx - cx;
    let dy = ty - cy;
    if(Math.abs(dx) > Math.abs(dy)) {
      cx += dx > 0 ? 1 : -1;
    } else if(dy !== 0) {
      cy += dy > 0 ? 1 : -1;
    }

    army.currentPos = [cx, cy];
  });
}

endTurnBtn.addEventListener('click', () => {
  turn++;
  turnInfo.textContent = `Turn: ${turn}`;

  // Gain gold from cities
  let totalGoldGain = 0;
  for(let y=0; y<MAP_SIZE; y++) {
    for(let x=0; x<MAP_SIZE; x++) {
      let tile = map[y][x];
      if(tile.city && (tile.type === TILE_PLAYER_CITY || tile.type === TILE_PLAYER_CAPITAL)) {
        tile.city.gold += 10;
        totalGoldGain += 10;
      }
    }
  }
  goldInfo.textContent = `Gold: +${totalGoldGain}`;

  // Move marching armies
  moveArmies();

  draw();

  // Update selected city panel if city still selected
  if(selectedCityCoords) {
    let [sx, sy] = selectedCityCoords;
    showCityDetails(map[sy][sx].city);
  }
});
