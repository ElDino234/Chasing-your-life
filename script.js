const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('statusText');
const messageBox = document.getElementById('messageBox');
const playerHealthLabel = document.getElementById('playerHealth');
const woodCountLabel = document.getElementById('woodCount');
const stoneCountLabel = document.getElementById('stoneCount');
const potionsCountLabel = document.getElementById('potionsCount');
const enemyInfoLabel = document.getElementById('enemyInfo');
const combatControls = document.getElementById('combatControls');
const attackButton = document.getElementById('attackButton');
const healButton = document.getElementById('healButton');

const tileSize = 32;
const cols = 16;
const rows = 16;
const mapLayout = [
  'WWWWWWWWWWWWWWWW',
  'W....T....R....W',
  'W..T..RR..T....W',
  'W....G....T..E.W',
  'W..RR..W..RR...W',
  'W.....WW......RW',
  'W...T...W...T..W',
  'W..R...WW....R.W',
  'W......W.......W',
  'W..E...W...T...W',
  'W.....WWRRR....W',
  'W.T...WW...T...W',
  'W..R.....E.....W',
  'W...T.....R....W',
  'W.P....T....R..W',
  'WWWWWWWWWWWWWWWW'
];

const tiles = {
  '.': { type: 'grass', color: '#9dbb87', walkable: true, gatherable: false },
  'T': { type: 'tree', color: '#3a6d2a', walkable: true, gatherable: 'wood' },
  'R': { type: 'rock', color: '#7a7d80', walkable: true, gatherable: 'stone' },
  'W': { type: 'water', color: '#224a6d', walkable: false, gatherable: false },
  'E': { type: 'enemy', color: '#c53131', walkable: true, gatherable: false },
  'G': { type: 'goal', color: '#f4d35e', walkable: true, gatherable: false },
  'P': { type: 'playerStart', color: '#9dbb87', walkable: true, gatherable: false }
};

let map = [];
let player = {
  x: 1,
  y: 14,
  health: 100,
  maxHealth: 100,
  wood: 0,
  stone: 0,
  potions: 2,
  attack: 10,
  defense: 2
};
let state = 'explore';
let enemy = null;
let message = 'Bienvenido a Chasing Your Life. Usa WASD para moverte y E para interactuar.';

function buildMap() {
  map = mapLayout.map((row, y) => {
    return row.split('').map((char, x) => {
      const base = tiles[char] || tiles['.'];
      return { ...base, char, x, y };
    });
  });
}

function getTile(x, y) {
  if (y < 0 || y >= rows || x < 0 || x >= cols) return null;
  return map[y][x];
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const tile = getTile(x, y);
      ctx.fillStyle = tile.color;
      ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
      if (tile.char === 'E') {
        ctx.fillStyle = '#8a1d1d';
        ctx.fillRect(x * tileSize + 10, y * tileSize + 10, 12, 12);
      }
      if (tile.char === 'G') {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * tileSize + 4, y * tileSize + 4, tileSize - 8, tileSize - 8);
      }
    }
  }

  ctx.fillStyle = '#fee440';
  ctx.beginPath();
  ctx.arc(player.x * tileSize + tileSize / 2, player.y * tileSize + tileSize / 2, tileSize / 2 - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();
}

function setMessage(text) {
  message = text;
  messageBox.textContent = message;
}

function updateUI() {
  playerHealthLabel.textContent = player.health;
  woodCountLabel.textContent = player.wood;
  stoneCountLabel.textContent = player.stone;
  potionsCountLabel.textContent = player.potions;
  enemyInfoLabel.textContent = state === 'combat' ? `${enemy.name} - Vida ${enemy.health}` : '-';
  statusText.textContent = state === 'combat' ? 'Combate activo' : state === 'dead' ? 'Has muerto. Presiona R para reiniciar.' : 'Explorando';
  combatControls.classList.toggle('hidden', state !== 'combat');
  attackButton.disabled = state !== 'combat';
  healButton.disabled = state !== 'combat' || player.potions <= 0;
}

function movePlayer(dx, dy) {
  if (state !== 'explore') return;
  const newX = player.x + dx;
  const newY = player.y + dy;
  const target = getTile(newX, newY);
  if (!target || !target.walkable) {
    setMessage('No puedes moverte en esa dirección. Hay un obstáculo.');
    return;
  }

  player.x = newX;
  player.y = newY;

  if (target.char === 'E') {
    startCombat();
    return;
  }

  if (target.char === 'G') {
    setMessage('¡Has encontrado un lugar seguro! Sigue explorando o recolecta recursos para mejorar tus chances.');
  } else if (target.gatherable) {
    setMessage(`Hay un recurso aquí. Presiona E para recolectar ${target.gatherable}.`);
  } else {
    setMessage('Has avanzado. Busca recursos y prepárate para el combate.');
  }
  updateUI();
}

function startCombat() {
  state = 'combat';
  enemy = {
    name: 'Goblin',
    health: 30,
    attack: 8,
    defense: 1
  };
  setMessage('¡Un enemigo te atacó! El combate empieza. Usa ataques y curaciones para ganar.');
  updateUI();
}

function fightAction(action) {
  if (state !== 'combat') return;

  if (action === 'attack') {
    const damage = Math.max(1, player.attack - enemy.defense + getRandomInt(-2, 2));
    enemy.health -= damage;
    setMessage(`Atacas al ${enemy.name} y le haces ${damage} de daño.`);
  }

  if (action === 'heal') {
    if (player.potions <= 0) {
      setMessage('No tienes curaciones disponibles.');
      return;
    }
    player.potions -= 1;
    const healAmount = 20;
    player.health = Math.min(player.maxHealth, player.health + healAmount);
    setMessage(`Usas una curación y recuperas ${healAmount} puntos de vida.`);
  }

  if (enemy.health <= 0) {
    return endCombat(true);
  }

  enemyAttack();
}

function enemyAttack() {
  const damage = Math.max(1, enemy.attack - player.defense + getRandomInt(-2, 2));
  player.health -= damage;
  if (player.health <= 0) {
    player.health = 0;
    state = 'dead';
    setMessage(`El ${enemy.name} te ha derrotado. Presiona R para reiniciar.`);
  } else {
    setMessage(`El ${enemy.name} te golpea y te hace ${damage} de daño. Tu turno.`);
  }
  updateUI();
}

function endCombat(victory) {
  if (victory) {
    map[player.y][player.x].char = '.';
    map[player.y][player.x].type = 'grass';
    map[player.y][player.x].color = tiles['.'].color;
    state = 'explore';
    enemy = null;
    setMessage('Derrotaste al enemigo. Continúa explorando.')
  }
  updateUI();
}

function gatherResource() {
  if (state !== 'explore') return;
  const tile = getTile(player.x, player.y);
  if (!tile || !tile.gatherable) {
    setMessage('No hay nada que recolectar aquí.');
    return;
  }

  if (tile.gatherable === 'wood') {
    player.wood += 1;
    setMessage('Recolectaste madera. Úsala para crear y sobrevivir.');
  } else if (tile.gatherable === 'stone') {
    player.stone += 1;
    setMessage('Recolectaste piedra. Puedes construir mejor equipo con ella.');
  }

  tile.char = '.';
  tile.type = 'grass';
  tile.color = tiles['.'].color;
  tile.gatherable = false;
  updateUI();
}

function restartGame() {
  buildMap();
  player = { x: 1, y: 14, health: 100, maxHealth: 100, wood: 0, stone: 0, potions: 2, attack: 10, defense: 2 };
  state = 'explore';
  enemy = null;
  setMessage('Juego reiniciado. Sigue explorando y recolectando recursos.');
  updateUI();
  draw();
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

document.addEventListener('keydown', (event) => {
  if (state === 'dead' && event.key.toLowerCase() === 'r') {
    restartGame();
    return;
  }

  switch (event.key.toLowerCase()) {
    case 'w': movePlayer(0, -1); break;
    case 'a': movePlayer(-1, 0); break;
    case 's': movePlayer(0, 1); break;
    case 'd': movePlayer(1, 0); break;
    case 'e': gatherResource(); break;
  }
  draw();
});

attackButton.addEventListener('click', () => {
  fightAction('attack');
  if (state !== 'dead') draw();
});

healButton.addEventListener('click', () => {
  fightAction('heal');
  if (state !== 'dead') draw();
});

buildMap();
updateUI();
draw();
