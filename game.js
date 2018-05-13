const gameWidth = 600, gameHeight = 800;
const tankWidth = 600 / 8;
const rows = 7, cols = 10;
const bulletHeight = 60;
const enemyWidth = 45;
const enemyAttackSpeed = 300;

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
const enemyGroup = new Map();
let enemyScale;
let enemyEmitter;

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
  game.load.image('enemy', 'assets/angry.png');
  game.load.image('green', 'assets/green.png');
}

function create() {
  game.add.sprite(0, 0, 'background');

  game.physics.startSystem(Phaser.Physics.ARCADE);

  bricks = game.add.group();
  bricks.enableBody = true;

  let { width: brickWidth, height: brickHeight } = game.cache.getImage('brick');
  const brickScale = gameWidth / cols / brickWidth;
  brickWidth *= brickScale;
  brickHeight *= brickScale;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const brick = bricks.create(j * brickWidth, i * brickHeight, 'brick');
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
  enemyScale = enemyWidth / game.cache.getImage('enemy').width;
  // game.physics.arcade.enable(enemyGroup);
  createEnemy(0, 0);
}

function update() {  
  game.physics.arcade.collide(bullet, bricks, (bullet, brick) => {
    brick.kill();
    bullet.kill();
    brickEmitter.emitX = brick.x + brick.body.halfWidth;
    brickEmitter.emitY = brick.y;
    brickEmitter.explode(3000, 10);
  });

  tank.body.velocity.x = 0;
  if (cursors.left.isDown) {
    tank.body.velocity.x = -300;
  } else if (cursors.right.isDown) {
    tank.body.velocity.x = 300;
  }
  if (!bullet.alive) {
    if (cursors.up.isDown) {
      bullet.x = tank.centerX - bullet.width / 2;
      bullet.y = tank.y - bullet.height / 1.75;
      bullet.body.velocity.y = -1200;
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

function createEnemy(x, y) {
  const enemy = game.add.sprite(x, y, 'enemy');
  game.physics.arcade.enable(enemy);
  enemy.body.collideWorldBounds = true;
  enemy.body.bounce.setTo(1,1);
  enemy.scale.setTo(enemyScale, enemyScale);
  enemyGroup.set(enemy);
  enemyAttackTank(enemy);
}

function enemyAttackTank(enemy) {
  const targetX = tank.centerX;
  const targetY = tank.centerY;
  const speedFactor = Math.sqrt(
    Math.pow(targetX - enemy.x, 2)
    + Math.pow(targetY - enemy.y, 2)
  ) / enemyAttackSpeed;
  enemy.body.velocity.x = targetX - enemy.x;
  enemy.body.velocity.y = targetY - enemy.y;

  let emitter = enemyGroup.get(enemy);
  if (emitter) { //TODO: add emitter here, handle bounce borders and update and harm tank
    emitter.emitX = enemy.centerX;
    emitter.emitY = enemy.centerY;
  } else {
    emitter = game.add.emitter(0, 0, 6);
    enemyGroup.set(enemy, emitter);
  }
}