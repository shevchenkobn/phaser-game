const gameWidth = 600, gameHeight = 800;
const tankWidth = 600 / 8;
let bricksTopOffset;
let bricksYLimit;
const rows = 7, cols = 10;
const bulletHeight = 60;
const enemyWidth = 45;
const enemyAttackSpeed = 600;
const initialLives = 3;
const heartWidth = 36;
const textFontSizePx = 100;
const textIncrease = 15;

const game = new Phaser.Game(gameWidth, gameHeight, Phaser.AUTO, '', {
  preload,
  create,
  update,
});

let bricks;
let tank;
let cursors;
let bullet;
let bulletEmitter;
let brickEmitter;
let shootEmitter;
let enemyGroup;
const enemyMap = new Map();
let enemyScale;
let enemyExplode;
let livesGroup;
let lives;
let tankExplode;
let youDiedText;
let youDiedBackground;

function preload() {
  game.load.image('background', 'assets/background.jpg');
  game.load.image('brick', 'assets/brick.png');
  game.load.image('tank', 'assets/tank.png');
  game.load.image('bullet', 'assets/bullet.png');
  game.load.image('fire1', 'assets/fire1.png');
  game.load.image('fire2', 'assets/fire2.png');
  game.load.image('smoke1', 'assets/smoke1.png');
  game.load.image('red', 'assets/red.png');
  game.load.image('splinter', 'assets/splinter2.png');
  game.load.image('muzzleflash1', 'assets/muzzleflash3.png');
  game.load.image('muzzleflash2', 'assets/muzzleflash7.png');
  game.load.image('enemy', 'assets/invader.png');
  game.load.image('green', 'assets/green.png');
  game.load.image('heart', 'assets/heart.png');

  game.load.script('BlurY', 'filters/BlurY.js');
}

function create() {
  game.add.sprite(0, 0, 'background');

  game.physics.startSystem(Phaser.Physics.ARCADE);

  // Bricks initialization
  bricks = game.add.group();
  bricks.enableBody = true;

  let { width: brickWidth, height: brickHeight } = game.cache.getImage('brick');
  const brickScale = gameWidth / cols / brickWidth;
  brickWidth *= brickScale;
  brickHeight *= brickScale;
  enemyScale = enemyWidth / game.cache.getImage('enemy').width;
  bricksTopOffset = game.cache.getImage('enemy').height * enemyScale;
  bricksYLimit = bricksTopOffset + rows * brickHeight;
  for (let y = bricksTopOffset; y < bricksYLimit - 1; y += brickHeight) {
    for (let x = 0; x < gameWidth; x += brickWidth) {
      const brick = bricks.create(x, y, 'brick');
      brick.scale.setTo(brickScale, brickScale);
      brick.body.immovable = true;
    }
  }

  const tankScale = tankWidth / game.cache.getImage('tank').width;
  const tankHeight = tankScale * game.cache.getImage('tank').height;
  tank = game.add.sprite((gameWidth - tankWidth) / 2, gameHeight - tankHeight, 'tank');
  tank.scale.setTo(tankScale, tankScale);
  game.physics.arcade.enable(tank);
  tank.body.collideWorldBounds = true;
  cursors = game.input.keyboard.createCursorKeys();

  bullet = game.add.sprite(0, 0, 'bullet');
  game.physics.arcade.enable(bullet);

  const bulletScale = bulletHeight / game.cache.getImage('bullet').height;
  bullet.scale.setTo(bulletScale, bulletScale);
  bullet.body.updateBounds(bulletScale, bulletScale);
  bullet.checkWorldBounds = true;
  bullet.outOfBoundsKill = true;
  bullet.kill();

  bulletEmitter = game.add.emitter(0, 0, 800);
  bulletEmitter.makeParticles(['fire1', 'fire2', 'smoke1']);
  bulletEmitter.gravity = 200;
  bulletEmitter.setAlpha(1, 0, 3000);
  bulletEmitter.setScale(0.33, 0.66, 0.33, 0.66, 3000);
  bulletEmitter.start(false, 3000, 5);
  bulletEmitter.on = false;

  brickEmitter = game.add.emitter(0, 0, 400);
  brickEmitter.makeParticles(['red', 'splinter']);
  brickEmitter.gravity = 600;
  brickEmitter.maxParticleScale = 0.2;
  brickEmitter.minParticleScale = 0.4;

  bullet.events.onKilled.add(bullet => {
    bulletEmitter.on = false;
  });
  bullet.events.onRevived.add(bullet => {
    bulletEmitter.emitX = bullet.x + bullet.body.halfWidth;
    bulletEmitter.emitY = bullet.y + bullet.body.halfHeight;
    bulletEmitter.on = true;
  });

  shootEmitter = game.add.emitter(0, 0, 100);
  shootEmitter.makeParticles(['muzzleflash1', 'muzzleflash2']);
  shootEmitter.setAlpha(1, 0, 1500);
  shootEmitter.maxParticleScale = 0.4;
  shootEmitter.minParticleScale = 0.6;
  shootEmitter.gravity = 0;

  // Enemy initialization
  // game.physics.arcade.enable(enemyGroup);
  createEnemy(0, bricksYLimit, false);
  createEnemy(gameWidth - enemyWidth, bricksYLimit);
  for (let i = 0; i < 3; i++) {
    createEnemy(game.rnd.integerInRange(0, gameWidth - enemyWidth), 0, false);
  }

  enemyExplode = game.add.emitter(0, 0, 100);
  enemyExplode.makeParticles('red');
  enemyExplode.gravity = 600;
  enemyExplode.maxParticleScale = 0.4;
  enemyExplode.minParticleScale = 0.7;

  tankExplode = game.add.emitter(0, 0, 100);
  tankExplode.makeParticles(['fire1', 'fire2', 'smoke1']);
  tankExplode.gravity = 5;
  tankExplode.setScale(0.4, 1, 0.4, 1, 10000);
  tankExplode.setAlpha(1, 0, 10000);
  // tankExplode.maxParticleScale = 0.4;
  // tankExplode.minParticleScale = 0.7;

  const heartScale = heartWidth / game.cache.getImage('heart').width;
  livesGroup = game.add.group();
  const y = gameHeight - heartScale * game.cache.getImage('heart').height;
  for (let i = 0; i < initialLives; i++) {
    const heart = livesGroup.create(i * heartWidth, y, 'heart');
    heart.scale.setTo(heartScale, heartScale);
  }
  lives = initialLives;
}

function update() {
  game.physics.arcade.collide(bullet, bricks, (bullet, brick) => {
    brick.kill();
    bullet.kill();
    brickEmitter.emitX = brick.x + brick.body.halfWidth;
    brickEmitter.emitY = brick.y;
    brickEmitter.explode(3000, 10);
    if (game.rnd.integerInRange(0, 1)) {
      createEnemy(
        brick.centerX - enemyWidth / 2,
        brick.y
      );
    }
  });
  for (const [enemy, emitter] of enemyMap) {
    emitter.emitX = enemy.centerX;
    emitter.emitY = enemy.centerY;
    game.physics.arcade.collide(bricks, enemy);
    game.physics.arcade.collide(enemy, bullet, (enemy, bullet) => {
      bullet.kill();
      killEnemy(enemy, emitter);
    });
    game.physics.arcade.collide(enemy, tank, (enemy, tank) => {
      bullet.kill();
      killEnemy(enemy);
      hitTank();
      game.camera.flash(0xff0000, 500);
    });
  }

  tank.body.velocity.x = 0;
  if (cursors.left.isDown) {
    tank.body.velocity.x = -300;
  } else if (cursors.right.isDown) {
    tank.body.velocity.x = 300;
  }
  if (!bullet.alive) {
    if (tank.alive && cursors.up.isDown) {
      bullet.x = tank.centerX - bullet.width / 2;
      bullet.y = tank.y - bullet.height / 1.75;
      bullet.body.velocity.y = -1200;
      bullet.body.velocity.x = 0;
      bullet.revive();
      shootEmitter.emitX = tank.centerX;
      shootEmitter.emitY = tank.y;
      shootEmitter.explode(1500, 5);
    }
  } else {
    bulletEmitter.emitX = bullet.x + bullet.body.halfWidth;
    bulletEmitter.emitY = bullet.y + bullet.body.halfHeight;
  }
}

function createEnemy(x, y, randomVelocity = true) {
  let emitter, enemy;
  for (let [usedEnemy, usedEmitter] of enemyMap) {
    if (!usedEnemy.alive) {
      enemy = usedEnemy;
      emitter = usedEmitter;
    }
  }

  if (!enemy) {
    emitter = game.add.emitter(0, 0, 50);
    emitter.makeParticles('green');
    emitter.setAlpha(1, 0, 2000);
    emitter.setScale(0.33, 0.66, 0.33, 0.66, 2000);
    emitter.start(false, 2000, 35);

    enemy = game.add.sprite(x, y, 'enemy');
    game.physics.arcade.enable(enemy);
    enemy.body.collideWorldBounds = true;
    enemy.body.bounce.setTo(1, 1);
    enemy.scale.setTo(enemyScale, enemyScale);
    enemy.body.updateBounds(enemyScale, enemyScale);
    enemyMap.set(enemy, emitter);
  } else {
    emitter.on = true;
    enemy.x = x;
    enemy.y = y;
    enemy.revive();
  }

  if (randomVelocity) {
    enemy.body.velocity.x = game.rnd.between(enemyAttackSpeed / 2, enemyAttackSpeed * 0.8);
    enemy.body.velocity.y = -Math.sqrt(Math.pow(enemyAttackSpeed, 2) - Math.pow(enemy.body.velocity.x, 2));
  } else {
    enemyAttackTank(enemy);
  }
}

function enemyAttackTank(enemy) {
  const targetX = tank.centerX;
  const targetY = tank.centerY;
  const speedFactor = enemyAttackSpeed / Math.sqrt(
    Math.pow(targetX - enemy.x, 2)
    + Math.pow(targetY - enemy.y, 2)
  );
  enemy.body.velocity.x = (targetX - enemy.x) * speedFactor;
  enemy.body.velocity.y = (targetY - enemy.y) * speedFactor;

  let emitter = enemyMap.get(enemy);
  if (emitter) {
    emitter.emitX = enemy.centerX;
    emitter.emitY = enemy.centerY;
    emitter.on = true;
  }
}

function killEnemy(enemy, emitter) {
  enemy.kill();
  (emitter || enemyMap.get(enemy)).on = false;
  enemyExplode.emitX = enemy.centerX;
  enemyExplode.emitY = enemy.y;
  enemyExplode.explode(3000, 30);
}

function hitTank() {
  lives--;
  if (lives >= 0) {
    for (let i = lives; i < livesGroup.children.length; i++) {
      livesGroup.children[i].tint = '#ccc';
    }
    if (!lives) {
      tankExplode.emitX = tank.centerX;
      tankExplode.emitY = tank.centerY;
      tankExplode.explode(10000, 100);
      tank.kill();
      displayYouDied();
    }
  }
}

function displayYouDied() {
  youDiedBackground = game.add.graphics(0, 0);
  youDiedBackground.beginFill(0x000000);
  const rectangle = youDiedBackground.drawRect(0, (gameHeight - textFontSizePx) / 2, gameWidth, textFontSizePx);
  rectangle.alpha = 0;
  youDiedBackground.endFill();
  game.add.tween(rectangle).to({
    alpha: 0.6,
    height: textFontSizePx + textIncrease,
    y: -(textFontSizePx + textIncrease) / 2
  }, 1500, Phaser.Easing.Linear.None, true);
  // debugger;

  youDiedText = game.add.text(0, 0, 'YOU DIED', {
    font: textFontSizePx + 'px "Times New Roman"',
    fill: '#ff0000',
    boundsAlignH: 'center',
    boundsAlignV: 'middle',
    align: 'center'
  });
  youDiedText.alpha = 0;
  youDiedText.setTextBounds(0, 0, gameWidth, gameHeight);
  game.add.tween(youDiedText).to({
    alpha: 1,
    fontSize: textFontSizePx + textIncrease
  }, 1500, Phaser.Easing.Linear.None, true);
}
