import _Game from "../Game/Game";
import _Entity from "./Entity";
import _Util from "../Util/Util";
var entities = require("../../Game/entities");
class NetworkEntity extends _Entity {
  constructor(tick) {
    super();
    this.uid = 0;
    this.uid = tick.uid;
    this.setShouldCull(true);
    this.setVisible(true);
    this.setTargetTick(tick);
  }
  reset() {
    this.uid = 0;
    this.currentModel = null;
    this.entityClass = null;
    this.fromTick = null;
    this.targetTick = null;
    this.setVisible(true);
  }
  isLocal() {
    var local = _Game.currentGame.world.getLocalPlayer();
    return !!local && !!local.getEntity() && this.uid == local.getEntity().uid;
  }
  getTargetTick() {
    return this.targetTick;
  }
  getFromTick() {
    return this.fromTick;
  }
  setTargetTick(tick) {
    if (!this.targetTick) {
      this.entityClass = tick.entityClass;
      this.targetTick = tick;
    }
    this.addMissingTickFields(tick, this.targetTick);
    this.fromTick = this.targetTick;
    this.targetTick = tick;
    if (tick.scale !== undefined) {
      this.setScale(tick.scale);
    }
    if (this.fromTick.model !== this.targetTick.model) {
      this.refreshModel(this.targetTick.model);
    }
    this.entityClass = this.targetTick.entityClass;
  }
  overrideFromTick(tick) {
    this.fromTick = tick;
  }
  overrideTargetTick(tick) {
    this.targetTick = tick;
  }
  tick(msInThisTick, msPerTick) {
    if (this.fromTick) {
      var tickPercent = msInThisTick / msPerTick;
      if (!this.isVisible) {
        this.setVisible(true);
      }
      this.setPositionX(
        _Util.lerp(
          this.fromTick.position.x,
          this.targetTick.position.x,
          tickPercent,
        ),
      );
      this.setPositionY(
        _Util.lerp(
          this.fromTick.position.y,
          this.targetTick.position.y,
          tickPercent,
        ),
      );
      this.setRotation(
        _Util.interpolateYaw(this.targetTick.yaw, this.fromTick.yaw),
      );
    }
  }
  isInViewport() {
    if (this.isLocal()) return true;
    return super.isInViewport();
  }
  update(dt, user) {
    if (this.fromTick) {
      this.fromTick.interpolatedYaw = this.getRotation();
    }
    var inViewport = this.isInViewport();
    this.node.visible = this.isVisible && inViewport;
    if (!inViewport) {
      return;
    }
    if (this.currentModel) {
      this.currentModel.update(dt, this.fromTick);
    }
  }
  refreshModel(networkModelName) {
    if (!(networkModelName in entities)) {
      throw new Error("Attempted to create unknown model: " + networkModelName);
    }
    var modelName = entities[networkModelName].model;
    if (this.currentModel) {
      var oldModel = this.currentModel;
      var parentEntity = this.parent;
      if (parentEntity && parentEntity.getNode()) {
        parentEntity.getNode().removeChild(oldModel.getNode());
      }
      if (_Game.currentGame.getModelEntityPooling(oldModel.modelName)) {
        oldModel.reset();
        if (!_Game.currentGame.world.modelEntityPool[oldModel.modelName]) {
          _Game.currentGame.world.modelEntityPool[oldModel.modelName] = [];
        }
        _Game.currentGame.world.modelEntityPool[oldModel.modelName].push(oldModel);
      } else {
        oldModel.destroy();
      }
      this.currentModel = null;
    }
    if (_Game.currentGame.getModelEntityPooling(modelName)) {
      this.currentModel = _Game.currentGame.world.getModelFromPool(modelName);
    }
    if (!this.currentModel) {
      var args = {};
      if ("args" in entities[networkModelName]) {
        args = entities[networkModelName].args;
      }
      args.modelName = networkModelName;
      this.currentModel = _Game.currentGame.assetManager.loadModel(
        modelName,
        args,
      );
      this.currentModel.modelName = modelName;
    }
    this.currentModel.setParent(this);
    this.setNode(this.currentModel.getNode());
    if (this.parent && this.parent.getNode()) {
      this.parent.getNode().addChild(this.currentModel.getNode());
    }
  }
  addMissingTickFields(tick, lastTick) {
    for (var key in lastTick) {
      var value = lastTick[key];
      if (!(key in tick)) {
        tick[key] = value;
      }
    }
  }
}
export default NetworkEntity;
