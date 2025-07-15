const MAP_SIZE = 100;
const TILE_SIZE = 25;
const VIEW_SIZE = 20; // viewport 20x20 tiles

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const endTurnBtn = document.getElementById('endTurnBtn');
const turnInfo = document.getElementById('turnInfo');
const apInfo = document.getElementById('apInfo');

// Tile states:
// 0 = neutral/unowned
// 1 = player owned
// 2 = enemy owned (for future expansion)
let map = new Array(MAP_SIZE);
for(let i=0; i<MAP_SIZE; i++) {
  map[i] = new Array(MAP_SIZE).fill(0);
}

// Starting tile in center
const startX = Math.floor(MAP_SIZE / 2);
const startY = Math.floor(MAP_SIZE / 2);
map[startY][startX] = 1;

// Viewport position (top-left tile coords)
let viewX = startX - Math.floor(VIEW_SIZE / 2);
let viewY = startY - Math.floor(VIEW_SIZE / 2);

function clampViewport() {
  viewX = Math.max(0, Math.min(viewX, MAP_SIZE - VIEW_SIZE));
  viewY = Math.max(0, Math.min(viewY, MAP_SIZE - VIEW_SIZE));
}

// Player state
let turn = 1;
let actionPoints = 3;

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for(let y=0; y<VIEW_SIZE; y++) {
    for(let x=0; x<VIEW_SIZE; x++) {
      const mapX = viewX + x;
      const mapY = viewY + y;
      const tile = map[mapY][mapX];

      // Tile color by ownership
      let color;
      if(tile === 0) color = '#444'; // neutral
      else if(tile === 1) color = '#4caf50'; // player green
      else if(tile === 2) color = '#f44336'; // enemy red

      ctx.fillStyle = color;
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      // Tile border
      ctx.strokeStyle = '#222';
      ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
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

canvas.addEventListener('click', e => {
  if(actionPoints <= 0) {
    alert('No action points left this turn!');
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  const tileX = Math.floor(clickX / TILE_SIZE);
  const tileY = Math.floor(clickY / TILE_SIZE);

  const mapX = viewX + tileX;
  const mapY = viewY + tileY;

  if(mapY < 0 || mapY >= MAP_SIZE || mapX < 0 || mapX >= MAP_SIZE) return;

  if(map[mapY][mapX] === 0 && isAdjacentToPlayer(mapX, mapY)) {
    map[mapY][mapX] = 1;
    actionPoints--;
    apInfo.textContent = `AP: ${actionPoints}`;
    draw();
  } else {
    alert('Tile must be neutral and adjacent to your territory to capture.');
  }
});

function isAdjacentToPlayer(x, y) {
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  for(let [dx, dy] of dirs) {
    let nx = x + dx, ny = y + dy;
    if(nx >= 0 && nx < MAP_SIZE && ny >= 0 && ny < MAP_SIZE) {
      if(map[ny][nx] === 1) return true;
    }
  }
  return false;
}

endTurnBtn.addEventListener('click', () => {
  turn++;
  turnInfo.textContent = `Turn: ${turn}`;
  actionPoints = 3;
  apInfo.textContent = `AP: ${actionPoints}`;
  alert('Turn ended. AP reset.');
});
