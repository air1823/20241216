// 角色1的設定
const PLAYER1_CONFIG = {
  idle: {
    spriteSheet: 'player1_idle.png',  // 待機動作圖片
    frameWidth: 40,                    // 單一幀寬度
    frameHeight: 36,                   // 單一幀高度
    frameCount: 6                      // 此動作共有幾幀
  },
  attack: {
    spriteSheet: 'player1_attack.png', // 攻擊動作圖片
    frameWidth: 39,
    frameHeight: 36,
    frameCount: 3
  },
  jump: {
    spriteSheet: 'player1_jump.png',   // 跳躍動作圖片
    frameWidth: 46,
    frameHeight: 42,
    frameCount: 9
  }
};

// 角色2的設定
const PLAYER2_CONFIG = {
  idle: {
    spriteSheet: 'player2_idle.png',
    frameWidth: 22,
    frameHeight: 24,
    frameCount: 5
  },
  attack: {
    spriteSheet: 'player2_attack.png',
    frameWidth: 27,
    frameHeight: 23,
    frameCount: 8
  },
  jump: {
    spriteSheet: 'player2_jump.png',
    frameWidth: 23,
    frameHeight: 25,
    frameCount: 6
  }
};

let player1Sprites = {};
let player2Sprites = {};
let player1, player2;
let gameOver = false;
let winner = '';

// 載入心形圖片
let heartImage;

// 新增背景相關變數
let bgImage;
let bgX = 0;
const bgSpeed = 0.5; // 背景移動速度係數

// 物理相關常數
const GRAVITY = 0.8;
const JUMP_FORCE = -15;
const GROUND_Y = 300; // 地面高度

// 新增特效相關
let effectSprites = []; // 儲存所有特效

// 新增變數
let gameEndAnimation = 0; // 用於結束動畫
const endScreenSpeed = 0.02; // 結束畫面動畫速度

class Effect {
  constructor(x, y, facingRight) {
    this.x = x;
    this.y = y;
    this.frame = 0;
    this.totalFrames = 5; // 特效總幀數
    this.size = 80; // 特效大小
    this.facingRight = facingRight;
    this.frameDelay = 3; // 控制特效動畫速度
    this.frameCount = 0;
  }

  update() {
    if (this.frameCount % this.frameDelay === 0) {
      this.frame++;
    }
    this.frameCount++;
  }

  display() {
    push();
    translate(this.x, this.y);
    if (!this.facingRight) {
      scale(-1, 1);
    }

    // 繪製特效
    noStroke();
    let alpha = map(this.frame, 0, this.totalFrames, 255, 0);
    fill(255, 165, 0, alpha); // 橙色特效

    // 特效形狀
    beginShape();
    for (let i = 0; i < 8; i++) {
      let angle = i * TWO_PI / 8;
      let rad = this.size * (1 - this.frame / this.totalFrames);
      let x = cos(angle) * rad;
      let y = sin(angle) * rad;
      vertex(x, y);
    }
    endShape(CLOSE);

    // 內層特效
    fill(255, 255, 0, alpha); // 黃色內層
    beginShape();
    for (let i = 0; i < 8; i++) {
      let angle = i * TWO_PI / 8;
      let rad = this.size * 0.6 * (1 - this.frame / this.totalFrames);
      let x = cos(angle) * rad;
      let y = sin(angle) * rad;
      vertex(x, y);
    }
    endShape(CLOSE);
    pop();
  }

  isDead() {
    return this.frame >= this.totalFrames;
  }
}

function preload() {
  // 載入玩家1的所有動作圖片
  for (let action in PLAYER1_CONFIG) {
    player1Sprites[action] = loadImage(PLAYER1_CONFIG[action].spriteSheet);
  }
  // 載入玩家2的所有動作圖片
  for (let action in PLAYER2_CONFIG) {
    player2Sprites[action] = loadImage(PLAYER2_CONFIG[action].spriteSheet);
  }
  
  // 載入心形圖片
  heartImage = loadImage('heart.png'); // 請替換成實際的心形圖片路徑

  // 載入背景圖片
  bgImage = loadImage('bg1.png'); // 請替換成實際的背景圖片路徑

}

class Character {
  constructor(config, sprites, x, y) {
    this.config = config;
    this.sprites = sprites;
    this.x = x;
    this.y = y;
    this.currentAction = 'idle';
    this.frame = 0;
    this.animationSpeed = 0.1;
    this.facingRight = true;
    
    // 跳躍相關屬性
    this.velocityY = 0;
    this.isJumping = false;
    
    // 新增生命值相關屬性
    this.hearts = 5;
    this.isAttacking = false;
    this.attackBox = {
      width: 60,
      height: 40
    };
    this.invincible = false;
    this.invincibleTime = 1000; // 無敵時間（毫秒）
    this.attackCooldown = 0;
    this.attackCooldownTime = 20; // 攻擊冷卻時間
  }

  display() {
    push();
    translate(this.x, this.y);
    
    if (!this.facingRight) {
      scale(-1, 1);
    }

    // 獲取當前動作的設定
    const actionConfig = this.config[this.currentAction];
    const currentSprite = this.sprites[this.currentAction];
    
    // 計算當前幀
    let currentFrame = floor(this.frame) % actionConfig.frameCount;
    
    // 繪製當前幀
    image(
      currentSprite,
      this.facingRight ? 0 : -actionConfig.frameWidth,
      0,
      actionConfig.frameWidth,
      actionConfig.frameHeight,
      currentFrame * actionConfig.frameWidth,
      0,
      actionConfig.frameWidth,
      actionConfig.frameHeight
    );
    
    pop();

    // 更新動畫幀
    this.frame += this.animationSpeed;
  }

  update() {
    // 應用重力
    this.velocityY += GRAVITY;
    this.y += this.velocityY;

    // 檢查是否著地
    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.velocityY = 0;
      this.isJumping = false;
    }

    // 更新攻擊冷卻
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }
  }

  jump() {
    if (!this.isJumping) {
      this.velocityY = JUMP_FORCE;
      this.isJumping = true;
      this.setAction('jump');
    }
  }

  move(dx) {
    this.x += dx;
    this.facingRight = dx > 0;
    this.x = constrain(this.x, 0, width - this.config[this.currentAction].frameWidth);
  }

  setAction(action) {
    if (this.currentAction !== action) {
      this.currentAction = action;
      this.frame = 0;
    }
  }

  attack() {
    if (!this.isAttacking && this.attackCooldown <= 0) {
      this.isAttacking = true;
      this.setAction('attack');
      
      // 創建攻擊特效
      let effectX = this.facingRight ? this.x + 60 : this.x - 60;
      effectSprites.push(new Effect(effectX, this.y + 30, this.facingRight));
      
      this.attackCooldown = this.attackCooldownTime;
      
      setTimeout(() => {
        this.isAttacking = false;
      }, 500);
    }
  }

  getHit() {
    if (!this.invincible) {
      this.hearts--;
      this.invincible = true;
      setTimeout(() => {
        this.invincible = false;
      }, this.invincibleTime);
    }
  }

  // 更新背景位置
  updateBackground(playerMovement) {
    bgX -= playerMovement * bgSpeed;
  }

  // 檢查攻擊碰撞
  checkAttackCollision(other) {
    if (this.isAttacking) {
      let attackX = this.facingRight ? this.x + 30 : this.x - this.attackBox.width;
      let attackY = this.y;
      
      if (
        attackX < other.x + 30 &&
        attackX + this.attackBox.width > other.x &&
        attackY < other.y + 60 &&
        attackY + this.attackBox.height > other.y
      ) {
        other.getHit();
      }
    }
  }

  // 繪製生命值
  drawHearts(offsetX) {
    for (let i = 0; i < this.hearts; i++) {
      image(heartImage, offsetX + i * 30, 20, 25, 25);
    }
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 創建角色實例
  player1 = new Character(PLAYER1_CONFIG, player1Sprites, 100, GROUND_Y);
  player2 = new Character(PLAYER2_CONFIG, player2Sprites, 600, GROUND_Y);
}

function draw() {
  // 清除背景
  clear();

  if (!gameOver) {
  let playerMovement = 0; // 追蹤玩家移動

  // 繪製背景
  drawBackground();


  // 繪製地面
  stroke(0);
  line(0, GROUND_Y + 32, width, GROUND_Y + 32);

  if (!gameOver) {
    // 玩家1控制
    if (keyIsDown(65)) { // A
      player1.move(-5);
    }
    if (keyIsDown(68)) { // D
      player1.move(5);
    }
    if (keyIsDown(87)) { // W
      player1.jump();
    }
    if (keyIsDown(83)) { // S
      player1.attack();
    } else if (!player1.isJumping && !player1.isAttacking) {
      player1.setAction('idle');
    }

    // 玩家2控制
    if (keyIsDown(LEFT_ARROW)) {
      player2.move(-5);
    }
    if (keyIsDown(RIGHT_ARROW)) {
      player2.move(5);
    }
    if (keyIsDown(UP_ARROW)) {
      player2.jump();
    }
    if (keyIsDown(32)) {
      player2.attack();
    } else if (!player2.isJumping && !player2.isAttacking) {
      player2.setAction('idle');
    }

    // 檢查攻擊碰撞
    player1.checkAttackCollision(player2);
    player2.checkAttackCollision(player1);

    // 更新角色物理
    player1.update();
    player2.update();

    // 顯示角色
    player1.display();
    player2.display();

    // 顯示生命值
    player1.drawHearts(50);
    player2.drawHearts(width - 200);

    // 更新和顯示特效
    for (let i = effectSprites.length - 1; i >= 0; i--) {
      effectSprites[i].update();
      effectSprites[i].display();
      
      // 移除已完成的特效
      if (effectSprites[i].isDead()) {
        effectSprites.splice(i, 1);
      }
    }

    // 檢查勝負
    if (player1.hearts <= 0 || player2.hearts <= 0) {
      gameOver = true;
      winner = player1.hearts <= 0 ? "Player 2" : "Player 1";
      gameEndAnimation = 0; // 重置動畫計時器
    }
  } else {
    // 遊戲結束畫面
    drawEndScreen();
  }
}

function drawEndScreen() {
  // 繼續顯示最後一幀的遊戲畫面
  player1.display();
  player2.display();
  
  // 顯示生命值
  player1.drawHearts(50);
  player2.drawHearts(width - 200);

  // 半透明遮罩效果
  push();
  gameEndAnimation = min(gameEndAnimation + endScreenSpeed, 1);
  fill(0, 0, 0, 150 * gameEndAnimation);
  rect(0, 0, width, height);
  
  // 勝利文字動畫
  textAlign(CENTER, CENTER);
  
  // 大標題
  let titleSize = map(gameEndAnimation, 0, 1, 0, 64);
  textSize(titleSize);
  fill(255, 215, 0); // 金色
  stroke(0);
  strokeWeight(3);
  text(winner + " WINS!", width/2, height/3);
  
  // 分數顯示
  if (gameEndAnimation > 0.3) {
    textSize(32);
    fill(255);
    noStroke();
    text("Player 1: " + player1.hearts + " hearts", width/2, height/2);
    text("Player 2: " + player2.hearts + " hearts", width/2, height/2 + 40);
  }
  
  // 重新開始提示
  if (gameEndAnimation > 0.6) {
    textSize(24);
    fill(255);
    let alpha = map(sin(frameCount * 0.1), -1, 1, 150, 255);
    fill(255, 255, 255, alpha);
    text("Press SPACE to restart", width/2, height * 0.8);
  }
  pop();
}

function resetGame() {
  // 重置所有遊戲狀態
  player1 = new Character(PLAYER1_CONFIG, player1Sprites, 100, GROUND_Y);
  player2 = new Character(PLAYER2_CONFIG, player2Sprites, 600, GROUND_Y);
  gameOver = false;
  winner = '';
  bgX = 0;
  effectSprites = [];
  gameEndAnimation = 0;

}

function drawBackground() {
  // Draw the background image twice to create seamless scrolling
  image(bgImage, bgX, 0, width, height);
  image(bgImage, bgX + width, 0, width, height);
  
  // Reset background position when it scrolls off screen
  if (bgX <= -width) {
    bgX = 0;
  }
}
function keyPressed() {
  // 重新開始遊戲
  if (gameOver && keyCode === 32) { // 空白鍵
    resetGame();
  }
}
}
