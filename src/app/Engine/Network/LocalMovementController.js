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
    if (data.up !== undefined) this.up = data.up;
    if (data.down !== undefined) this.down = data.down;
    if (data.right !== undefined) this.right = data.right;
    if (data.left !== undefined) this.left = data.left;
    if (data.shift !== undefined) this.shift = data.shift;

    const dx = this.right - this.left;
    const dy = this.down - this.up;

    if (dx === 0 && dy === 0) {
      this.yaw = 1;
    } else {
      let angle = Math.atan2(dx, -dy) * (180 / Math.PI);
      if (angle < 0) angle += 360;
      this.yaw = Math.round(angle);
    }

    if (playerdata) {
      playerdata.yaw = this.yaw;
    }
  }

  start(playerdata, playerUid, worldSize = 24000) {
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

      if (this.yaw !== 1) {
        const isDiagonal = this.yaw % 90 !== 0;
        const speedMultiplier = isDiagonal ? speed / 1.5 : speed;

        if (this.yaw === 0 || this.yaw === 45 || this.yaw === 315) playerdata.position.y -= speedMultiplier;
        if (this.yaw === 135 || this.yaw === 180 || this.yaw === 225) playerdata.position.y += speedMultiplier;
        if (this.yaw === 45 || this.yaw === 90 || this.yaw === 135) playerdata.position.x += speedMultiplier;
        if (this.yaw === 225 || this.yaw === 270 || this.yaw === 315) playerdata.position.x -= speedMultiplier;
      }

      playerdata.position.x = Math.max(0, Math.min(worldSize, playerdata.position.x));
      playerdata.position.y = Math.max(0, Math.min(worldSize, playerdata.position.y));

      if (playerdata.position.x !== oldX || playerdata.position.y !== oldY) {
        this.entityManager.markEntityDirty(playerUid);
      }
    }, 16);
  }
}
