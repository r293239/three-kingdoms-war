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
    barracks: true
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
        barracks: true
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

// Handle clicks on map tiles for city selection
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
  if(tile.cityData) {
    selectedCityCoords = [mapX, mapY];
    showCityInfo(tile.cityData);
  } else {
    selectedCityCoords = null;
    cityInfoElem.textContent = 'Click on your city to see details.';
  }
});

// Show info of selected city in side panel
function showCityInfo(city) {
  cityInfoElem.innerHTML = `
    <strong>${city.name}</strong><br>
    Gold: ${city.gold}<br>
    Armies: ${city.armies}<br>
    Barracks: ${city.barracks ? 'Built' : 'None'}
  `;
}

// End Turn handler
endTurnBtn.addEventListener('click', () => {
  // Increase turn count
  let turnNum = parseInt(turnNumberElem.textContent);
  turnNum++;
  turnNumberElem.textContent = turnNum;

  // Gold income per city +10 gold
  for(let y=0; y<MAP_SIZE; y++) {
    for(let x=0; x<MAP_SIZE; x++) {
      let tile = map[y][x];
      if(tile.cityData) {
        tile.cityData.gold += 10;
      }
    }
  }

  // Update gold display
  goldAmountElem.textContent = calculatePlayerGold();

  // Redraw map and update city info if selected
  draw();
  if(selectedCityCoords) {
    let [x,y] = selectedCityCoords;
    showCityInfo(map[y][x].cityData);
  }
});
