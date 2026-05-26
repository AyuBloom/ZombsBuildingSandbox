import _NetworkEntity from "../Entity/NetworkEntity";
import _LocalPlayer from "../../Game/Entity/LocalPlayer";
import _Game from "./Game";
import _Replication from "../Network/Replication";
import _EntityGrid from "../Entity/EntityGrid";
import _GroundEntity from "../Entity/GroundEntity";
import _SpriteEntity from "../Entity/SpriteEntity";
import _RangeIndicatorModel from "../../Game/Models/RangeIndicatorModel";
var Debugger = require("debug");
var debug = Debugger("Engine:Game/World");
class World {
  constructor() {
    this.entities = new Map();
    this.inWorld = false;
    this.myUid = null;
    this.networkEntityPool = [];
    this.modelEntityPool = {};
    this.network = _Game.currentGame.network;
    this.renderer = _Game.currentGame.renderer;
    this.replicator = new _Replication();
    this.localPlayer = new _LocalPlayer();
    this.isInitialized = false;
    this.groundEntity = null;
    this.obstacleIndicators = {};
    this.resourceCollisionIndicators = {};
    this.groupingGridLoaded = false;
    this.blueGrid = null;
    this.purpleGrid = null;
    this.obstacleIndicatorColors = {
      stash: { r: 0x98, g: 0xfb, b: 0xcb },
      obstacle: { r: 0xff, g: 0x00, b: 0x00 },
    };
  }
  init() {
    this.replicator.setTargetTickUpdatedCallback(
      this.onEntityUpdate.bind(this),
    );
    this.replicator.init();
    this.network.addCloseHandler(this.onClose.bind(this));
    this.network.addEnterWorldHandler(this.onEnterWorld.bind(this));
    this.renderer.addTickCallback(this.onRendererTick.bind(this));
    _Game.currentGame.network.addEnterWorldHandler((data) => {
      if (data.allowed && !this.isInitialized) {
        this.groundEntity = new _GroundEntity();
        var borderTexture = new _SpriteEntity(
          "/asset/image/map/map-grass.png",
          true,
        );
        var grassTexture = new _SpriteEntity(
          "/asset/image/map/map-grass.png",
          true,
        );
        this.groundEntity.addAttachment(borderTexture);
        this.groundEntity.addAttachment(grassTexture);
        borderTexture.setDimensions(
          -960,
          -960,
          this.width + 1920,
          this.height + 1920,
        );
        borderTexture.setAnchor(0, 0);
        borderTexture.setAlpha(0.75);
        grassTexture.setDimensions(0, 0, this.width, this.height);
        grassTexture.setAnchor(0, 0);
        this.groundEntity.setVisible(
          !!_Game.currentGame.ui.getOption("showGround"),
        );
        this.renderer.add(this.groundEntity);
        this.makeGroupingGrid();
        this.isInitialized = true;
      }
    });
  }
  preloadNetworkEntities() {
    if (_Game.currentGame.getNetworkEntityPooling()) {
      debug("Preloading network entities...");
      var bsTick = {
        uid: 0,
        entityClass: null,
      };
      var poolSize = _Game.currentGame.getNetworkEntityPooling();
      for (var i = 0; i < poolSize; i++) {
        var entity = new _NetworkEntity(bsTick);
        entity.reset();
        this.networkEntityPool.push(entity);
      }
    }
  }
  preloadModelEntities() {
    var modelsToPool = _Game.currentGame.getModelEntityPooling();
    for (var modelName in modelsToPool) {
      var poolSize = modelsToPool[modelName];
      debug("Preloading model %s...", modelName);
      this.modelEntityPool[modelName] = [];
      for (var i = 0; i < poolSize; i++) {
        var model = _Game.currentGame.assetManager.loadModel(modelName);
        model.modelName = modelName;
        model.preload();
        this.modelEntityPool[modelName].push(model);
      }
    }
  }
  getMsPerTick() {
    return this.msPerTick;
  }
  getReplicator() {
    return this.replicator;
  }
  getHeight() {
    return this.height;
  }
  getWidth() {
    return this.width;
  }
  getLocalPlayer() {
    return this.localPlayer;
  }
  getInWorld() {
    return this.inWorld;
  }
  getMyUid() {
    return this.myUid;
  }
  getEntityByUid(uid) {
    return this.entities.get(uid);
  }
  getPooledNetworkEntityCount() {
    return this.networkEntityPool.length;
  }
  getModelFromPool(modelName) {
    if (this.modelEntityPool[modelName].length === 0) {
      return null;
    }
    return this.modelEntityPool[modelName].shift();
  }
  getPooledModelEntityCount(modelName) {
    if (!(modelName in this.modelEntityPool)) {
      return 0;
    }
    return this.modelEntityPool[modelName].length;
  }
  onClose() {
    for (let uid of this.entities.keys()) {
      this.removeEntity(uid);
    }
  }
  onEnterWorld(data) {
    if (data.allowed) {
      this.width = data.x2;
      this.height = data.y2;
      this.tickRate = data.tickRate;
      this.msPerTick = 1000 / data.tickRate;
      this.inWorld = true;
      this.myUid = data.uid;
    }
    this.entityGrid = new _EntityGrid(this.width, this.height, 48);
  }
  onEntityUpdate(data) {
    for (var uid of this.entities.keys()) {
      if (data.entities.has(uid)) {
        if (data.entities.get(uid) !== true) {
          this.updateEntity(uid, data.entities.get(uid));
        } else {
          this.updateEntity(uid, this.entities.get(uid).getTargetTick());
        }
      } else {
        this.removeEntity(uid);
      }
    }
    for (var uid of data.entities.keys()) {
      if (data.entities.get(uid) !== true) {
        if (!this.entities.has(uid)) {
          this.createEntity(data.entities.get(uid));
        }
        if (
          this.localPlayer != null &&
          this.localPlayer.getEntity() == this.entities.get(uid)
        ) {
          this.localPlayer.setTargetTick(data.entities.get(uid));
        }
      }
    }
  }
  createEntity(data) {
    var entity;
    if (
      _Game.currentGame.getNetworkEntityPooling() &&
      this.networkEntityPool.length > 0
    ) {
      entity = this.networkEntityPool.shift();
      entity.setTargetTick(data);
      entity.uid = data.uid;
    } else {
      entity = new _NetworkEntity(data);
    }
    entity.refreshModel(data.model);
    if (data.uid === this.myUid) {
      this.localPlayer.setEntity(entity);
      this.renderer.follow(entity);
    }
    this.entities.set(data.uid, entity);
    this.renderer.add(entity, data.entityClass);
    this.entityGrid.updateEntity(this.entities.get(data.uid));
    this.createObstacleIndicator(data);
    this.createResourceCollisionIndicator(data);
  }
  updateEntity(uid, data) {
    this.entities.get(uid).setTargetTick(data);
    this.entityGrid.updateEntity(this.entities.get(uid));
  }
  removeEntity(uid) {
    var entity = this.entities.get(uid);
    var model = entity.currentModel;
    this.renderer.remove(this.entities.get(uid));
    if (_Game.currentGame.getModelEntityPooling(model.modelName)) {
      model.reset();
      this.modelEntityPool[model.modelName].push(model);
    }
    if (_Game.currentGame.getNetworkEntityPooling()) {
      entity.reset();
      this.networkEntityPool.push(entity);
    }
    this.removeObstacleIndicator(uid);
    this.removeResourceCollisionIndicator(uid);
    this.entities.delete(uid);
    this.entityGrid.removeEntity(parseInt(uid));
  }
  getObstacleIndicatorBounds(data) {
    var schema =
      _Game.currentGame.ui && _Game.currentGame.ui.getBuildingSchema();
    var width = 0;
    var height = 0;
    var posX = 0;
    var posY = 0;
    var color = this.obstacleIndicatorColors.obstacle;
    if (schema && data.model in schema) {
      if (data.model === "Harvester" || data.model === "SlowTrap") {
        return null;
      }
      width = schema[data.model].gridWidth * 48;
      height = schema[data.model].gridHeight * 48;
      posX = data.position.x + 24;
      posY = data.position.y + 24;
      if (data.model === "GoldStash") {
        color = this.obstacleIndicatorColors.stash;
      }
    } else if (["Tree", "Stone", "NeutralCamp"].indexOf(data.model) > -1) {
      var minCx;
      var maxCx;
      var minCy;
      var maxCy;
      if (data.model === "NeutralCamp") {
        minCx = maxCx = Math.floor(data.position.x / 48);
        minCy = maxCy = Math.floor(data.position.y / 48);
      } else {
        var radius = data.model === "Tree" ? 70 : 50;
        minCx = Math.floor((data.position.x - radius) / 48);
        maxCx = Math.floor((data.position.x + radius) / 48);
        minCy = Math.floor((data.position.y - radius) / 48);
        maxCy = Math.floor((data.position.y + radius) / 48);
      }
      var minX = minCx * 48;
      var maxX = (maxCx + 1) * 48;
      var minY = minCy * 48;
      var maxY = (maxCy + 1) * 48;
      width = maxX - minX;
      height = maxY - minY;
      posX = (minX + maxX) * 0.5 + 24;
      posY = (minY + maxY) * 0.5 + 24;
    } else {
      return null;
    }
    return {
      width: width,
      height: height,
      x: posX,
      y: posY,
      color: color,
    };
  }
  createObstacleIndicator(data) {
    if (this.obstacleIndicators[data.uid]) {
      return;
    }
    var bounds = this.getObstacleIndicatorBounds(data);
    if (!bounds) {
      return;
    }
    var indicator = new _RangeIndicatorModel({
      width: bounds.width,
      height: bounds.height,
      innerColor: bounds.color,
      borderColor: bounds.color,
      lineWidth: 0,
    });
    indicator.setPosition(bounds.x, bounds.y);
    indicator.setVisible(
      !!_Game.currentGame.ui.getOption("obstacleIndicators"),
    );
    this.obstacleIndicators[data.uid] = indicator;
    this.renderer.ground.addAttachment(indicator);
  }
  removeObstacleIndicator(uid) {
    if (this.obstacleIndicators[uid]) {
      this.renderer.ground.removeAttachment(this.obstacleIndicators[uid]);
      delete this.obstacleIndicators[uid];
    }
  }
  setObstacleIndicatorsVisible(visible) {
    for (var uid in this.obstacleIndicators) {
      this.obstacleIndicators[uid].setVisible(visible);
    }
  }
  createResourceCollisionIndicator(data) {
    if (this.resourceCollisionIndicators[data.uid]) {
      return;
    }
    var radius = 0;
    if (data.model === "Tree") {
      radius = 70;
    } else if (data.model === "Stone") {
      radius = 50;
    } else if (data.model === "NeutralCamp") {
      radius = 60;
    } else {
      return;
    }
    var indicator = new _RangeIndicatorModel({
      isCircular: true,
      radius: radius,
      innerColor: { r: 0xff, g: 0x44, b: 0x44 },
      borderColor: { r: 0xff, g: 0x00, b: 0x00 },
      lineWidth: 2,
    });
    indicator.setPosition(data.position.x, data.position.y);
    indicator.setVisible(
      !!_Game.currentGame.ui.getOption("showResourceCollisions"),
    );
    this.resourceCollisionIndicators[data.uid] = indicator;
    this.renderer.npcs.addAttachment(indicator);
  }
  removeResourceCollisionIndicator(uid) {
    if (this.resourceCollisionIndicators[uid]) {
      this.renderer.npcs.removeAttachment(
        this.resourceCollisionIndicators[uid],
      );
      delete this.resourceCollisionIndicators[uid];
    }
  }
  setResourceCollisionIndicatorsVisible(visible) {
    for (var uid in this.resourceCollisionIndicators) {
      this.resourceCollisionIndicators[uid].setVisible(visible);
    }
  }
  makeGroupingGrid() {
    if (this.groupingGridLoaded) return;
    this.groupingGridLoaded = true;

    const blueCell = new _RangeIndicatorModel({
      width: 196,
      height: 196,
      innerColor: null,
      borderColor: { r: 111, g: 208, b: 247 },
      lineWidth: 4,
    });

    const purpleCell = new _RangeIndicatorModel({
      width: 196,
      height: 196,
      innerColor: null,
      borderColor: { r: 213, g: 118, b: 211 },
      lineWidth: 4,
    });

    this.blueGrid = new _SpriteEntity(blueCell.goldRegion.getTexture(), true);
    this.blueGrid.setDimensions(
      0,
      0,
      this.width || 24000,
      this.height || 24000,
    );
    this.blueGrid.setAnchor(0, 0);
    this.blueGrid.setAlpha(1.5);
    this.blueGrid.setVisible(
      !!_Game.currentGame.ui.getOption("showGroupingGrid"),
    );

    this.purpleGrid = new _SpriteEntity(
      purpleCell.goldRegion.getTexture(),
      true,
    );
    this.purpleGrid.setDimensions(
      48,
      48,
      (this.width || 24000) - 48,
      (this.height || 24000) - 48,
    );
    this.purpleGrid.setAnchor(0, 0);
    this.purpleGrid.setAlpha(1.75);
    this.purpleGrid.setVisible(
      !!_Game.currentGame.ui.getOption("showGroupingGrid"),
    );

    this.renderer.ground.addAttachment(this.blueGrid);
    this.renderer.ground.addAttachment(this.purpleGrid);
  }
  setGroupingGridVisible(visible) {
    if (this.blueGrid) {
      this.blueGrid.setVisible(visible);
    }
    if (this.purpleGrid) {
      this.purpleGrid.setVisible(visible);
    }
  }
  setGroundVisible(visible) {
    this.groundEntity.setVisible(visible);
  }
  onRendererTick(delta) {
    var msInThisTick = this.replicator.getMsInThisTick();
    for (var uid of this.entities.keys()) {
      this.entities.get(uid).tick(msInThisTick, this.msPerTick);
    }
  }
}
export default World;
