const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const statusText = document.getElementById('statusText');
const messageBox = document.getElementById('messageBox');
const playerHealthLabel = document.getElementById('playerHealth');
const woodCountLabel = document.getElementById('woodCount');
const stoneCountLabel = document.getElementById('stoneCount');
const potionsCountLabel = document.getElementById('potionsCount');
const combatMenuOverlay = document.getElementById('combatMenuOverlay');
const fightButton = document.getElementById('fightButton');
const inventoryButton = document.getElementById('inventoryButton');
const infoButton = document.getElementById('infoButton');
const runButton = document.getElementById('runButton');
const startScreen = document.getElementById('startScreen');
const startButton = document.getElementById('startButton');
const chapterTitleLabel = document.getElementById('chapterTitle');
const objectiveTextLabel = document.getElementById('objectiveText');

const chapters = [
  {
    title: 'Prólogo – El fin del mundo',
    objective: 'Sobrevive, recolecta recursos y prepárate para el combate.',
    intro: 'El mundo terminó en un instante. Un héroe y cinco compañeros lucharon en la última batalla; él se sacrificó y todos creyeron que estaba muerto.'
  },
  {
    title: 'Capítulo 1 – La última batalla',
    objective: 'Derrota al enemigo y sigue explorando.',
    intro: 'El sacrificio fue total. Parece que todo terminó, pero existe una segunda oportunidad para seguir adelante.'
  }
];

let currentChapter = 0;
let gameMode = 'menu';

function applyChapter() {
  const chapter = chapters[currentChapter];
  chapterTitleLabel.textContent = chapter.title;
  objectiveTextLabel.textContent = `Objetivo: ${chapter.objective}`;
  setMessage(chapter.intro);
}

function startGame() {
  startScreen.classList.add('hidden');
  startScreen.style.display = 'none';
  gameMode = 'play';
  state = 'explore';
  currentChapter = 0;
  buildMap();
  applyChapter();
  recomputeCharacterStats(player);
  updateUI();
  lastTimestamp = performance.now();
  requestAnimationFrame(gameLoop);
}

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
  level: 1,
  exp: 0,
  expToNext: 50,
  // base stats (analogous to Pokémon Base)
  baseHP: 20,
  baseAttack: 12,
  baseDefense: 8,
  baseSpeed: 10,
  // IVs (player fixed at 16 per request)
  iv: { hp: 16, atk: 16, def: 16, spd: 16 },
  // EVs (start at 0)
  ev: { hp: 0, atk: 0, def: 0, spd: 0 },
  // derived/current stats (will be calculated)
  health: 0,
  maxHealth: 0,
  attack: 0,
  defense: 0,
  speed: 0,
  statusEffects: [],
  quality: 'Normal',
  wood: 0,
  stone: 0,
  potions: 2
};
let state = 'explore';
let enemy = null;
let message = 'Bienvenido a Chasing Your Life. Usa WASD para moverte y E para interactuar.';
let isMoving = false;
let moveStart = { x: 1, y: 14 };
let moveTarget = { x: 1, y: 14 };
let moveProgress = 1;
const moveDuration = 140; // ms
let lastTimestamp = 0;

function buildMap() {
  map = mapLayout.map((row, y) => {
    return row.split('').map((char, x) => {
      const base = tiles[char] || tiles['.'];
      return { ...base, char, x, y };
    });
  });
}

// Stat calculation helpers (Pokémon-style)
function calcHP(base, iv, ev, level) {
  const evTerm = Math.floor(ev / 4);
  const value = Math.floor(((2 * base + iv + evTerm) * level) / 100) + level + 10;
  return value;
}

function calcStat(base, iv, ev, level) {
  const evTerm = Math.floor(ev / 4);
  const value = Math.floor(((2 * base + iv + evTerm) * level) / 100) + 5;
  return value;
}

function recomputeCharacterStats(char) {
  // char must have baseHP/baseAttack/baseDefense/baseSpeed, iv and ev objects and level
  char.maxHealth = calcHP(char.baseHP, char.iv.hp, char.ev.hp, char.level);
  char.attack = calcStat(char.baseAttack, char.iv.atk, char.ev.atk, char.level);
  char.defense = calcStat(char.baseDefense, char.iv.def, char.ev.def, char.level);
  char.speed = calcStat(char.baseSpeed, char.iv.spd, char.ev.spd, char.level);
  if (!char.health || char.health <= 0) {
    char.health = char.maxHealth;
  } else {
    char.health = Math.min(char.health, char.maxHealth);
  }
}

function getTile(x, y) {
  if (y < 0 || y >= rows || x < 0 || x >= cols) return null;
  return map[y][x];
}

function drawExplore() {
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
  const drawX = isMoving ? lerp(moveStart.x, moveTarget.x, moveProgress) : player.x;
  const drawY = isMoving ? lerp(moveStart.y, moveTarget.y, moveProgress) : player.y;
  ctx.beginPath();
  ctx.arc(drawX * tileSize + tileSize / 2, drawY * tileSize + tileSize / 2, tileSize / 2 - 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();
}

function drawCombat() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Simple flat background for battle
  ctx.fillStyle = '#2b3350';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Enemy area (left)
  ctx.fillStyle = '#243042';
  ctx.fillRect(20, 20, canvas.width - 40, canvas.height * 0.55 - 30);
  ctx.fillStyle = '#f4f7ef';
  ctx.font = '20px monospace';
  ctx.fillText(`${enemy.name || 'Enemigo'} (Lv ${enemy.level || 1})`, 36, 48);
  drawHealthBar(36, 64, 300, enemy.health, enemy.maxHealth || 30, '#e05555');

  // Enemy sprite (red circle) - left side
  ctx.fillStyle = '#d33a3a';
  ctx.beginPath();
  ctx.arc(140, canvas.height * 0.28, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();

  // Player area (right)
  ctx.fillStyle = '#1f3a2c';
  const playerBoxY = canvas.height * 0.55;
  ctx.fillRect(20, playerBoxY, canvas.width - 40, canvas.height - playerBoxY - 20);
  ctx.fillStyle = '#f4f7ef';
  ctx.fillText('Tú', canvas.width - 340, playerBoxY + 28);
  drawHealthBar(canvas.width - 340, playerBoxY + 44, 300, player.health, player.maxHealth, '#80d58a');

  // Player sprite (yellow circle) - right side
  ctx.fillStyle = '#f6df6b';
  ctx.beginPath();
  ctx.arc(canvas.width - 120, playerBoxY + 86, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.closePath();

  // Bottom pixel-style command bar is handled by overlay buttons; but draw an underlay strip for visual
  ctx.fillStyle = '#2b1b3f';
  ctx.fillRect(16, canvas.height - 108, canvas.width - 32, 92);
}
const inventoryIcon = new Image();
inventoryIcon.src = '';
function drawHealthBar(x, y, width, current, max, color) {
  const ratio = Math.max(0, Math.min(1, current / max));
  ctx.fillStyle = '#2c2c2c';
  ctx.fillRect(x, y, width, 16);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, width * ratio, 16);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, width, 16);
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line.length > 0) {
      ctx.fillText(line, x, y);
      line = word + ' ';
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

function draw() {
  if (state === 'combat') {
    drawCombat();
  } else {
    drawExplore();
  }
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
  statusText.textContent = state === 'combat' ? 'Combate activo' : state === 'dead' ? 'Has muerto. Presiona R para reiniciar.' : 'Explorando';
  combatMenuOverlay.classList.toggle('hidden', state !== 'combat');
  document.body.classList.toggle('combat-active', state === 'combat');
  fightButton.disabled = state !== 'combat';
  inventoryButton.disabled = state !== 'combat';
  infoButton.disabled = state !== 'combat';
  runButton.disabled = state !== 'combat';
}

function nextChapter() {
  if (currentChapter < chapters.length - 1) {
    currentChapter += 1;
    applyChapter();
    draw();
  }
}

function movePlayer(dx, dy) {
  if (state !== 'explore' || isMoving) return;
  const newX = player.x + dx;
  const newY = player.y + dy;
  const target = getTile(newX, newY);
  if (!target || !target.walkable) {
    setMessage('No puedes moverte en esa dirección. Hay un obstáculo.');
    return;
  }

  moveStart = { x: player.x, y: player.y };
  moveTarget = { x: newX, y: newY };
  moveProgress = 0;
  isMoving = true;
  player.x = newX;
  player.y = newY;

  if (target.char === 'E') {
    setTimeout(() => startCombat(), moveDuration);
    return;
  }

  if (target.char === 'G') {
    if (currentChapter < chapters.length - 1) {
      setMessage('¡Has encontrado un lugar seguro! Prepárate para el próximo capítulo.');
      nextChapter();
    } else {
      setMessage('¡Has encontrado un lugar seguro! Has avanzado lo suficiente por ahora.');
    }
  } else if (target.gatherable) {
    setMessage(`Hay un recurso aquí. Presiona E para recolectar ${target.gatherable}.`);
  } else {
    setMessage('Has avanzado. Busca recursos y prepárate para el combate.');
  }
  updateUI();
}

function startCombat() {
  state = 'combat';
  const levelVariance = getRandomInt(-1, 1);
  const lvl = Math.max(1, player.level + levelVariance);
  // create enemy with base stats and random IVs (1-31)
  enemy = {
    name: 'Goblin',
    level: lvl,
    baseHP: getRandomInt(6, 28),
    baseAttack: getRandomInt(5, 24),
    baseDefense: getRandomInt(3, 20),
    baseSpeed: getRandomInt(5, 24),
    iv: { hp: getRandomInt(1, 31), atk: getRandomInt(1, 31), def: getRandomInt(1, 31), spd: getRandomInt(1, 31) },
    ev: { hp: 0, atk: 0, def: 0, spd: 0 }
  };
  recomputeCharacterStats(enemy);
  setMessage('¡Un enemigo te atacó! Apareció un ' + enemy.name + ` (Lv ${enemy.level}).`);
  updateUI();
}

function combatAction(action) {
  if (state !== 'combat') return;

  if (action === 'fight') {
    const damage = Math.max(1, player.attack - enemy.defense + getRandomInt(-2, 2));
    enemy.health -= damage;
    setMessage(`Usas ataque y haces ${damage} de daño al ${enemy.name}.`);
  }

  if (action === 'inventory') {
    if (state === 'combat') {
      const pIvs = player.iv ? `IVs — HP: ${player.iv.hp}  ATK: ${player.iv.atk}  DEF: ${player.iv.def}  SPD: ${player.iv.spd}` : 'IVs — N/A';
      const pStats = `Jugador (Lv ${player.level}) — HP ${player.health}/${player.maxHealth}  ATK ${player.attack}  DEF ${player.defense}  SPD ${player.speed}`;
      const status = player.statusEffects && player.statusEffects.length ? `Estado: ${player.statusEffects.join(', ')}` : 'Estado: Ninguno';
      const quality = `Calidad: ${player.quality || 'Normal'}`;
      setMessage(pIvs + '\n' + pStats + '\n' + status + '  ' + quality);
      return;
    }
    setMessage(`Inventario: ${player.wood} madera, ${player.stone} piedra, ${player.potions} pociones.`);
    return;
  }
  if (action === 'info') {
    if (!enemy) {
      setMessage('No hay enemigo activo.');
      return;
    }
    const ivs = enemy.iv
      ? `IVs — HP: ${enemy.iv.hp}  ATK: ${enemy.iv.atk}  DEF: ${enemy.iv.def}  SPD: ${enemy.iv.spd}`
      : 'IVs — N/A';
    const stats = `${enemy.name} (Lv ${enemy.level}) — HP ${enemy.health}/${enemy.maxHealth}  ATK ${enemy.attack}  DEF ${enemy.defense}  SPD ${enemy.speed}`;
    setMessage(ivs + '\n' + stats);
    return;
  }

  if (action === 'run') {
    const fleeChance = getRandomInt(0, 100);
    if (fleeChance > 50) {
      setMessage('Logras huir del combate. Vuelve a explorar.');
      state = 'explore';
      enemy = null;
      updateUI();
      return;
    }
    setMessage('No puedes huir. El enemigo ataca.');
    enemyAttack();
    return;
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
    // grant experience based on enemy level
    const gainedExp = enemy && enemy.level ? enemy.level * 10 : 10;
    state = 'explore';
    setMessage('Derrotaste al enemigo. Continúa explorando.');
    if (enemy) {
      gainExp(gainedExp);
    }
    enemy = null;
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

function gainExp(amount) {
  player.exp += amount;
  setMessage(`Ganas ${amount} de experiencia.`);
  checkLevelUp();
}

function checkLevelUp() {
  let leveled = false;
  while (player.exp >= player.expToNext) {
    player.exp -= player.expToNext;
    player.level += 1;
    player.expToNext = Math.floor(player.expToNext * 1.5);
    // recompute stats using formulas
    recomputeCharacterStats(player);
    // on level up restore to full
    player.health = player.maxHealth;
    leveled = true;
  }
  if (leveled) {
    setMessage(`¡Subes al nivel ${player.level}! Vida máxima: ${player.maxHealth}.`);
  }
  updateUI();
}

function restartGame() {
  buildMap();
  player = {
    x: 1,
    y: 14,
    level: 1,
    exp: 0,
    expToNext: 50,
    baseHP: 20,
    baseAttack: 12,
    baseDefense: 8,
    baseSpeed: 10,
    iv: { hp: 16, atk: 16, def: 16, spd: 16 },
    ev: { hp: 0, atk: 0, def: 0, spd: 0 },
    health: 0,
    maxHealth: 0,
    attack: 0,
    defense: 0,
    speed: 0,
    wood: 0,
    stone: 0,
    potions: 2
  };
  state = 'explore';
  enemy = null;
  setMessage('Juego reiniciado. Sigue explorando y recolectando recursos.');
  currentChapter = 0;
  applyChapter();
  recomputeCharacterStats(player);
  updateUI();
  draw();
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function updateMovement(delta) {
  if (!isMoving) return;
  moveProgress = Math.min(1, moveProgress + delta / moveDuration);
  if (moveProgress >= 1) {
    isMoving = false;
    moveStart.x = moveTarget.x;
    moveStart.y = moveTarget.y;
    moveProgress = 1;
  }
}

function gameLoop(timestamp) {
  const delta = timestamp - lastTimestamp;
  lastTimestamp = timestamp;
  updateMovement(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

document.addEventListener('keydown', (event) => {
  if (gameMode !== 'play') return;
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

startButton.addEventListener('click', startGame);

fightButton.addEventListener('click', () => {
  combatAction('fight');
  if (state !== 'dead') draw();
});

inventoryButton.addEventListener('click', () => {
  showInventory();
});

function showInventory() {
  if (state === 'combat') {
    const pIvs = player.iv ? `IVs — HP: ${player.iv.hp}  ATK: ${player.iv.atk}  DEF: ${player.iv.def}  SPD: ${player.iv.spd}` : 'IVs — N/A';
    const pStats = `Jugador (Lv ${player.level}) — HP ${player.health}/${player.maxHealth}  ATK ${player.attack}  DEF ${player.defense}  SPD ${player.speed}`;
    const status = player.statusEffects && player.statusEffects.length ? `Estado: ${player.statusEffects.join(', ')}` : 'Estado: Ninguno';
    const quality = `Calidad: ${player.quality || 'Normal'}`;
    setMessage(pIvs + '\n' + pStats + '\n' + status + '  ' + quality);
    return;
  }
  setMessage(`Inventario: ${player.wood} madera, ${player.stone} piedra, ${player.potions} pociones.`);
}

infoButton.addEventListener('click', () => {
  showEnemyInfo();
});

function showEnemyInfo() {
  try {
    console.log('showEnemyInfo called, state=', state, 'enemy=', enemy);
    if (state !== 'combat') {
      setMessage('No hay enemigo activo.');
      return;
    }
    if (!enemy) {
      setMessage('No hay enemigo activo.');
      return;
    }
    const ivs = enemy.iv
      ? `IVs — HP: ${enemy.iv.hp}  ATK: ${enemy.iv.atk}  DEF: ${enemy.iv.def}  SPD: ${enemy.iv.spd}`
      : 'IVs — N/A';
    const stats = `${enemy.name} (Lv ${enemy.level}) — HP ${enemy.health}/${enemy.maxHealth}  ATK ${enemy.attack}  DEF ${enemy.defense}  SPD ${enemy.speed}`;
    setMessage(ivs + '\n' + stats);
  } catch (err) {
    console.error('Error mostrando info enemigo:', err);
    setMessage('Error al mostrar información del enemigo. Abre la consola para más detalles.');
  }
}

runButton.addEventListener('click', () => {
  combatAction('run');
  if (state !== 'dead') draw();
});

applyChapter();
updateUI();
Set: enemy.iv.atk = (enemy.iv.atk || getRandomInt(1, 31)); enemy.iv.def = (enemy.iv.def || getRandomInt(1, 31)); enemy.iv.spd = (enemy.iv.spd || getRandomInt(1, 31)); recomputeCharacterStats(enemy);
