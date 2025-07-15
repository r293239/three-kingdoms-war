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
// 0 = neutral land
// 1 = player city
// 2 = player capital
// 3 = neutral city (not owned)
// 4 = enemy capital (future)
const TILE_NEUTRAL = 0;
const TILE_PLAYER_CITY = 1;
const TILE_PLAYER_CAPITAL = 2;
const TILE_NEUTRAL_CITY = 3;
const TILE_ENEMY_CAPITAL = 4;

// Game State
let map = [];
for (let i=0; i<MAP_SIZE; i++) {
  let row = [];
  for(let j=0; j<MAP_SIZE; j++) row.push({ type: TILE_NEUTRAL, city: null });
  map.push(row);
}

// Starting player capital in center
const startX = Math.floor(MAP_SIZE / 2);
const startY = Math.floor(MAP_SIZE / 2);

// Initialize player's capital tile
map[startY][startX].type = TILE_PLAYER_CAPITAL;
map[startY][startX].city = {
  name: 'Capital',
  gold: 100,
  armies: 0,
  buildingBarracks: true,
  trainingQueue: 0
};

// Create a few nearby player cities
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
      armies: 0,
      buildingBarracks: true,
      trainingQueue: 0
    };
  }
});

// Viewport variables
let viewX = startX - Math.floor(VIEW_SIZE/2);
let viewY = startY - Math.floor(VIEW_SIZE/2);

function clampViewport() {
  viewX = Math.max(0, Math.min(viewX, MAP_SIZE - VIEW_SIZE));
  viewY = Math.max(0, Math.min(viewY, MAP_SIZE - VIEW_SIZE));
}

clampViewport();

// Player global state
let turn = 1;
let playerGold = 100;

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for(let y=0; y<VIEW_SIZE; y++) {
    for(let x=0; x<VIEW_SIZE; x++) {
      let mapX = viewX + x;
      let mapY = viewY + y;
      let tile = map[mapY][mapX];

      // Base tile color
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

      // Draw city details if present
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
}

draw();

// Handle keyboard panning
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

// Click handler for city selection and training
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

  if(tile.city && (tile.type === TILE_PLAYER_CITY || tile.type === TILE_PLAYER_CAPITAL)) {
    selectedCityCoords = [mapX, mapY];
    showCityDetails(tile.city);
  }
});

function showCityDetails(city) {
  cityDetails.innerHTML = `
    <div class="city-info">
      <strong>${city.name}</strong><br>
      Gold: ${city.gold}<br>
      Armies: ${city.armies}<br>
      Barracks: ${city.buildingBarracks ? 'Built' : 'None'}<br>
      <label>Train Soldiers: 
        <input id="trainCount" type="number" min="0" max="${city.gold}" value="0" />
      </label>
      <button id="trainBtn">Train</button>
    </div>
  `;

  const trainBtn = document.getElementById('trainBtn');
  const trainCountInput = document.getElementById('trainCount');

  trainBtn.addEventListener('click', () => {
    const count = parseInt(trainCountInput.value);
    if(isNaN(count) || count <= 0) {
      alert('Enter a valid number of soldiers to train.');
      return;
    }
    const cost = count * 10; // each soldier costs 10 gold
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
}

// End turn: gain gold per city, train armies in queue (not implemented yet), next turn
endTurnBtn.addEventListener('click', () => {
  turn++;
  turnInfo.textContent = `Turn: ${turn}`;

  // Gain gold: +10 per city
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
  goldInfo.textContent = `Gold: ${totalGoldGain} gained`;

  draw();
});
