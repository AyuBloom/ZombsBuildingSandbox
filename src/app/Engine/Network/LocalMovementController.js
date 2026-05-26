export default class LocalMovementController {
  constructor(entityManager) {
    this.entityManager = entityManager;
    this.yaw = 1;
    this.up = 0;
    this.down = 0;
    this.right = 0;
    this.left = 0;
    this.shift = 0;
    this.moveInterval = null;
  }

  reset() {
    this.yaw = 1;
    this.up = 0;
    this.down = 0;
    this.right = 0;
    this.left = 0;
    this.shift = 0;
    this.stop();
  }

  stop() {
    if (this.moveInterval) {
      clearInterval(this.moveInterval);
      this.moveInterval = null;
    }
  }

  updateInputs(data, playerdata) {
    this.yaw = 1;
    if (data.up) this.up = 1;
    if (data.down) this.down = 1;
    if (data.right) this.right = 1;
    if (data.left) this.left = 1;
    if (data.up === 0) this.up = 0;
    if (data.down === 0) this.down = 0;
    if (data.right === 0) this.right = 0;
    if (data.left === 0) this.left = 0;
    if (data.shift !== undefined) this.shift = data.shift;

    if (this.up && !this.down && !this.right && !this.left) this.yaw = 0;
    if (this.down && !this.up && !this.right && !this.left) this.yaw = 180;
    if (this.right && !this.up && !this.down && !this.left) this.yaw = 90;
    if (this.left && !this.up && !this.right && !this.down) this.yaw = 270;

    if (this.up && !this.down && this.right && !this.left) this.yaw = 45;
    if (this.up && !this.down && !this.right && this.left) this.yaw = 315;
    if (!this.up && this.down && this.right && !this.left) this.yaw = 135;
    if (!this.up && this.down && !this.right && this.left) this.yaw = 225;

    if (this.up && this.down && !this.right && this.left) this.yaw = 270;
    if (this.up && this.down && this.right && !this.left) this.yaw = 90;
    if (this.up && !this.down && this.right && this.left) this.yaw = 0;
    if (!this.up && this.down && this.right && this.left) this.yaw = 180;

    if (this.up && this.down && !this.right && !this.left) this.yaw = 1;
    if (!this.up && !this.down && this.right && this.left) this.yaw = 1;
    if (this.up && this.down && this.right && this.left) this.yaw = 1;

    if (playerdata) {
      playerdata.yaw = this.yaw;
    }
  }

  start(playerdata, playerUid) {
    this.stop();
    let lastTime = performance.now();
    this.moveInterval = setInterval(() => {
      const now = performance.now();
      let dt = now - lastTime;
      lastTime = now;

      // Clamp dt to a maximum of 100ms to avoid teleporting if the tab is frozen/suspended/lagged
      if (dt > 100) {
        dt = 100;
      }

      // 16.6667ms is the target duration for a single 60 FPS tick
      const factor = dt / 16.6667;
      const _speed = this.shift ? 30 : 10;
      const speed = Math.min(45, _speed) * factor;
      const oldX = playerdata.position.x;
      const oldY = playerdata.position.y;

      if (this.yaw === 0) {
        playerdata.position.y -= speed;
      }
      if (this.yaw === 45) {
        playerdata.position.x += speed / 1.5;
        playerdata.position.y -= speed / 1.5;
      }
      if (this.yaw === 90) {
        playerdata.position.x += speed;
      }
      if (this.yaw === 135) {
        playerdata.position.x += speed / 1.5;
        playerdata.position.y += speed / 1.5;
      }
      if (this.yaw === 180) {
        playerdata.position.y += speed;
      }
      if (this.yaw === 225) {
        playerdata.position.x -= speed / 1.5;
        playerdata.position.y += speed / 1.5;
      }
      if (this.yaw === 270) {
        playerdata.position.x -= speed;
      }
      if (this.yaw === 315) {
        playerdata.position.x -= speed / 1.5;
        playerdata.position.y -= speed / 1.5;
      }

      playerdata.position.x = Math.max(
        0,
        Math.min(24000, playerdata.position.x),
      );
      playerdata.position.y = Math.max(
        0,
        Math.min(24000, playerdata.position.y),
      );
      if (
        playerdata.position.x !== oldX ||
        playerdata.position.y !== oldY
      ) {
        this.entityManager.markEntityDirty(playerUid);
      }
    }, 16);
  }
}
