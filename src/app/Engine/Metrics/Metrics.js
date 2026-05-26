import _Game from "../Game/Game";
var Debugger = require("debug");
var debug = Debugger("Engine:Metrics/Metrics");
class Metrics {
  constructor() {
    this.metrics = null;
    this.fpsSum = 0;
    this.fpsSamples = 0;
    this.reset();
    _Game.currentGame.network.addEnterWorldHandler(() => {
      this.reset();
    });
    _Game.currentGame.network.addCloseHandler(() => {
        this.reset();
    });
    _Game.currentGame.network.addErrorHandler(() => {
      this.reset();
    });
  }
  getFramesExtrapolated() {
    return this.metrics.framesExtrapolated || 0;
  }
  reset() {
    this.fpsSum = 0;
    this.fpsSamples = 0;
    this.metrics = {
      name: "Metrics",
      minFps: null,
      maxFps: null,
      currentFps: null,
      averageFps: null,
      framesRendered: 0,
      framesInterpolated: 0,
      framesExtrapolated: 0,
      allocatedNetworkEntities: null,
      longFrames: 0,
      stutters: 0,
      isMobile: 0,
      group: 0,
      timeResets: 0,
      maxExtrapolationTime: 0,
      totalExtrapolationTime: 0,
      extrapolationIncidents: 0,
      differenceInClientTime: 0,
    };
  }
  updateMetrics() {
    if (!_Game.currentGame.world.getReplicator().isFpsReady()) {
      return false;
    }
    if (!_Game.currentGame.world.getReplicator().getTickIndex()) {
      return false;
    }
    var fps = _Game.currentGame.world.getReplicator().getFps();
    var tickEntities = _Game.currentGame.world
      .getReplicator()
      .getTickEntities();
    var pooledNetworkEntityCount =
      _Game.currentGame.world.getPooledNetworkEntityCount();
    var clientTime = _Game.currentGame.world.getReplicator().getClientTime();
    if (fps < this.metrics.minFps || this.metrics.minFps === null) {
      this.metrics.minFps = fps;
    }
    if (fps > this.metrics.maxFps || this.metrics.maxFps === null) {
      this.metrics.maxFps = fps;
    }
    this.metrics.currentFps = fps;
    this.fpsSamples++;
    this.fpsSum += fps;
    this.metrics.averageFps = this.fpsSum / this.fpsSamples;
    if (_Game.currentGame.world.getReplicator().getInterpolating()) {
      this.metrics.framesInterpolated++;
    } else {
      this.metrics.framesExtrapolated++;
    }
    this.metrics.framesRendered++;
    this.metrics.allocatedNetworkEntities =
      tickEntities + pooledNetworkEntityCount;
    this.metrics.stutters = _Game.currentGame.world
      .getReplicator()
      .getFrameStutters();
    this.metrics.timeResets = _Game.currentGame.world
      .getReplicator()
      .getClientTimeResets();
    this.metrics.longFrames = _Game.currentGame.renderer.getLongFrames();
    this.metrics.maxExtrapolationTime = _Game.currentGame.world
      .getReplicator()
      .getMaxExtrapolationTime();
    this.metrics.totalExtrapolationTime = _Game.currentGame.world
      .getReplicator()
      .getTotalExtrapolationTime();
    this.metrics.extrapolationIncidents = _Game.currentGame.world
      .getReplicator()
      .getExtrapolationIncidents();
    this.metrics.differenceInClientTime = _Game.currentGame.world
      .getReplicator()
      .getDifferenceInClientTime();
    return true;
  }
}
export default Metrics;
