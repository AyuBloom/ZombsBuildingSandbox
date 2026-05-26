import _Game from "../../Engine/Game/Game";
import _Util from "../../Engine/Util/Util";
import _UiComponent from "./UiComponent";
import _RangeIndicatorModel from "../Models/RangeIndicatorModel";
var Debugger = require("debug");
var debug = Debugger("Game:Ui/UiBuildingOverlay");
class UiBuildingOverlay extends _UiComponent {
  constructor(ui) {
    super(
      ui,
      '<div id="hud-building-overlay" class="hud-building-overlay hud-tooltip hud-tooltip-top"></div>',
    );
    this.shouldUpgradeAll = false;
    this.maxStashDistance = 18;
    this.extraRangeIndicators = {};
    this.componentElem.addEventListener(
      "mousedown",
      this.onMouseDown.bind(this),
    );
    this.componentElem.addEventListener("mouseup", this.onMouseUp.bind(this));
    _Game.currentGame.renderer.addTickCallback(this.onTick.bind(this));
    _Game.currentGame.renderer.on(
      "cameraUpdate",
      this.onCameraUpdate.bind(this),
    );
    this.ui.on("buildingsUpdate", this.onBuildingsUpdate.bind(this));
    this.ui.on("buildingSchemaUpdate", this.onBuildingSchemaUpdate.bind(this));
  }
  isActive() {
    return !!this.buildingUid;
  }
  getBuildingUid() {
    return this.buildingUid;
  }
  getShouldUpgradeAll() {
    return this.shouldUpgradeAll;
  }
  setShouldUpgradeAll(shouldUpgradeAll) {
    this.shouldUpgradeAll = shouldUpgradeAll;
    this.update();
  }
  update() {
    if (this.buildingUid) {
      var networkEntity = _Game.currentGame.world.getEntityByUid(
        this.buildingUid,
      );
      if (!networkEntity) {
        this.stopWatching();
        return;
      }
      var renderer = _Game.currentGame.renderer;
      var screenPos = renderer.worldToScreen(
        networkEntity.getPositionX(),
        networkEntity.getPositionY(),
      );
      var entityTick = networkEntity.getTargetTick();
      var buildingSchema = this.ui.getBuildingSchema();
      var buildings = this.ui.getBuildings();
      var schemaData = buildingSchema[this.buildingId];
      var buildingData = buildings[this.buildingUid];
      if (!buildingData) {
        this.stopWatching();
        return;
      }
      if (this.buildingTier !== buildingData.tier) {
        if (this.rangeIndicator) {
          _Game.currentGame.renderer.ground.removeAttachment(
            this.rangeIndicator,
          );
          this.rangeIndicator.destroy();
          delete this.rangeIndicator;
        }
        this.buildingTier = buildingData.tier;
        if (this.buildingId === "GoldStash") {
          var cellSize = _Game.currentGame.world.entityGrid.getCellSize();
          this.rangeIndicator = new _RangeIndicatorModel({
            width: this.maxStashDistance * cellSize * 2,
            height: this.maxStashDistance * cellSize * 2,
          });
          _Game.currentGame.renderer.ground.addAttachment(this.rangeIndicator);
        } else if (
          this.buildingId === "Harvester" ||
          this.buildingId === "MeleeTower"
        ) {
          var range =
            (schemaData.rangeTiers &&
              schemaData.rangeTiers[this.buildingTier - 1]) ||
            (this.buildingId === "Harvester" ? 300 : 110);
          var maxYawDeviation =
            (schemaData.maxYawDeviationTiers &&
              schemaData.maxYawDeviationTiers[this.buildingTier - 1]) ||
            (this.buildingId === "Harvester" ? 70 : 30);
          this.rangeIndicator = new _RangeIndicatorModel({
            isSector: true,
            radius: range,
            startAngle: -90 - maxYawDeviation,
            endAngle: -90 + maxYawDeviation,
          });
          _Game.currentGame.renderer.ground.addAttachment(this.rangeIndicator);
        } else if (schemaData.rangeTiers) {
          this.rangeIndicator = new _RangeIndicatorModel({
            isCircular: true,
            radius: schemaData.rangeTiers[this.buildingTier - 1],
          });
          _Game.currentGame.renderer.ground.addAttachment(this.rangeIndicator);
        }
      }
      var gridHeight = schemaData.gridHeight;
      var gridWidth = buildingSchema.gridWidth;
      var entityHeight =
        (gridHeight / 2) * 48 * (renderer.getScale() / window.devicePixelRatio);
      var currentTier = buildingData.tier;
      var nextTier = 1;
      var maxTier = false;
      var canUpgrade = false;
      var currentStats = {};
      var nextStats = {};
      var buildingsToUpgrade = 1;
      var statMap = {
        health: "Health",
        damage: "Damage",
        range: "Range",
        gps: "Gold/Sec",
        harvest: "Harvest/Sec",
        harvestCapacity: "Capacity",
      };
      if (schemaData.tiers) {
        var stashTier = this.getGoldStashTier();
        if (buildingData.tier < schemaData.tiers) {
          nextTier = buildingData.tier + 1;
          maxTier = false;
        } else {
          nextTier = buildingData.tier;
          maxTier = true;
        }
        canUpgrade =
          !maxTier &&
          (buildingData.tier < stashTier || this.buildingId === "GoldStash");
      }
      for (var key in statMap) {
        var current = "<small>&mdash;</small>";
        var next = "<small>&mdash;</small>";
        if (schemaData[key + "Tiers"]) {
          current = schemaData[key + "Tiers"][currentTier - 1].toLocaleString();
          if (!maxTier) {
            next = schemaData[key + "Tiers"][nextTier - 1].toLocaleString();
          }
          currentStats[key] =
            "<p>" +
            statMap[key] +
            ': <strong class="hud-stats-current">' +
            current +
            "</strong></p>";
          nextStats[key] =
            "<p>" +
            statMap[key] +
            ': <strong class="hud-stats-next">' +
            next +
            "</strong></p>";
        }
      }
      if (this.shouldUpgradeAll) {
        buildingsToUpgrade = 0;
        for (var uid in buildings) {
          if (
            buildings[uid].type === this.buildingId &&
            buildings[uid].tier === buildingData.tier
          ) {
            buildingsToUpgrade++;
          }
        }
      }
      var costsHtml = _Util.createResourceCostString(
        schemaData,
        nextTier,
        buildingsToUpgrade,
      );
      var refundsHtml = _Util.createResourceRefundString(
        schemaData,
        buildingData.tier,
      );
      var healthPercentage = Math.round(
        (entityTick.health / entityTick.maxHealth) * 100,
      );
      if (entityTick.partyId !== this.ui.getPlayerPartyId()) {
        this.actionsElem.style.display = "none";
      } else {
        this.actionsElem.style.display = "block";
      }
      this.tierElem.innerHTML = buildingData.tier.toString();
      this.buildingTier = buildingData.tier;
      this.healthBarElem.style.width = healthPercentage + "%";
      if (Object.keys(currentStats).length > 0) {
        var currentStatsHtml = "";
        var nextStatsHtml = "";
        for (var i in currentStats) {
          currentStatsHtml += currentStats[i];
        }
        for (var i in nextStats) {
          nextStatsHtml += nextStats[i];
        }
        this.statsElem.innerHTML =
          '\n                <div class="hud-stats-current hud-stats-values">\n                    ' +
          currentStatsHtml +
          '\n                </div>\n                <div class="hud-stats-next hud-stats-values">\n                    ' +
          nextStatsHtml +
          "\n                </div>\n            ";
      } else {
        this.statsElem.innerHTML = "";
      }
      if (canUpgrade) {
        this.upgradeElem.classList.remove("is-disabled");
      } else {
        this.upgradeElem.classList.add("is-disabled");
      }
      if (this.shouldUpgradeAll) {
        this.upgradeElem.innerHTML =
          "Upgrade All" +
          (costsHtml ? " <small>(" + costsHtml + ")</small>" : "");
      } else {
        this.upgradeElem.innerHTML =
          "Upgrade" + (costsHtml ? " <small>(" + costsHtml + ")</small>" : "");
      }
      if (this.buildingId == "GoldStash") {
        this.offsetElem.style.display = "block";
        if (this.ui.getPlayerPartyCanSell()) {
          this.sellElem.classList.remove("is-disabled");
          this.sellElem.innerHTML = "Sell";
        } else {
          this.sellElem.classList.add("is-disabled");
          this.sellElem.innerHTML = "Need Permission to Sell";
        }
      } else {
        this.offsetElem.style.display = "none";
        if (this.ui.getPlayerPartyCanSell()) {
          this.sellElem.classList.remove("is-disabled");
          if (this.shouldUpgradeAll) {
            this.sellElem.innerHTML = "Sell All";
          } else {
            this.sellElem.innerHTML = "Sell";
          }
        } else {
          this.sellElem.classList.add("is-disabled");
          this.sellElem.innerHTML = "Need Permission to Sell";
        }
      }
      this.componentElem.style.left =
        screenPos.x - this.componentElem.offsetWidth / 2 + "px";
      this.componentElem.style.top =
        screenPos.y -
        entityHeight -
        this.componentElem.offsetHeight -
        20 +
        "px";
      if (this.rangeIndicator) {
        this.rangeIndicator.setPosition(
          networkEntity.getPositionX(),
          networkEntity.getPositionY(),
        );
        if (
          this.buildingId === "Harvester" ||
          this.buildingId === "MeleeTower"
        ) {
          this.rangeIndicator.setRotation(networkEntity.getRotation());
        }
      }

      if (this.shouldUpgradeAll) {
        for (var uidStr in this.extraRangeIndicators) {
          var uid = parseInt(uidStr);
          if (
            !buildings[uid] ||
            buildings[uid].type !== this.buildingId ||
            uid === this.buildingUid
          ) {
            if (this.extraRangeIndicators[uid]) {
              _Game.currentGame.renderer.ground.removeAttachment(
                this.extraRangeIndicators[uid],
              );
            }
            delete this.extraRangeIndicators[uid];
          }
        }

        for (var uidStr in buildings) {
          var uid = parseInt(uidStr);
          if (
            buildings[uid].type === this.buildingId &&
            uid !== this.buildingUid
          ) {
            var otherBuilding = buildings[uid];
            var otherEntity = _Game.currentGame.world.getEntityByUid(uid);
            if (otherEntity) {
              var otherTier = otherBuilding.tier;
              var otherSchema = buildingSchema[this.buildingId];
              var existingIndicator = this.extraRangeIndicators[uid];

              if (!existingIndicator || existingIndicator.tier !== otherTier) {
                if (existingIndicator) {
                  _Game.currentGame.renderer.ground.removeAttachment(
                    existingIndicator,
                  );
                  existingIndicator.destroy();
                  delete this.extraRangeIndicators[uid];
                }

                var rangeIndicator = null;
                if (this.buildingId === "GoldStash") {
                  var cellSize =
                    _Game.currentGame.world.entityGrid.getCellSize();
                  rangeIndicator = new _RangeIndicatorModel({
                    width: this.maxStashDistance * cellSize * 2,
                    height: this.maxStashDistance * cellSize * 2,
                  });
                } else if (
                  this.buildingId === "Harvester" ||
                  this.buildingId === "MeleeTower"
                ) {
                  var range =
                    (otherSchema.rangeTiers &&
                      otherSchema.rangeTiers[otherTier - 1]) ||
                    (this.buildingId === "Harvester" ? 300 : 110);
                  var maxYawDeviation =
                    (otherSchema.maxYawDeviationTiers &&
                      otherSchema.maxYawDeviationTiers[otherTier - 1]) ||
                    (this.buildingId === "Harvester" ? 70 : 30);
                  rangeIndicator = new _RangeIndicatorModel({
                    isSector: true,
                    radius: range,
                    startAngle: -90 - maxYawDeviation,
                    endAngle: -90 + maxYawDeviation,
                    innerColor: null,
                  });
                } else if (otherSchema.rangeTiers) {
                  rangeIndicator = new _RangeIndicatorModel({
                    isCircular: true,
                    radius: otherSchema.rangeTiers[otherTier - 1],
                    innerColor: null,
                  });
                }

                if (rangeIndicator) {
                  rangeIndicator.tier = otherTier;
                  _Game.currentGame.renderer.ground.addAttachment(
                    rangeIndicator,
                  );
                  this.extraRangeIndicators[uid] = rangeIndicator;
                }
              }

              if (this.extraRangeIndicators[uid]) {
                this.extraRangeIndicators[uid].setPosition(
                  otherEntity.getPositionX(),
                  otherEntity.getPositionY(),
                );
                if (
                  this.buildingId === "Harvester" ||
                  this.buildingId === "MeleeTower"
                ) {
                  this.extraRangeIndicators[uid].setRotation(
                    otherEntity.getRotation(),
                  );
                }
              }
            } else {
              if (this.extraRangeIndicators[uid]) {
                _Game.currentGame.renderer.ground.removeAttachment(
                  this.extraRangeIndicators[uid],
                );
                this.extraRangeIndicators[uid].destroy();
                delete this.extraRangeIndicators[uid];
              }
            }
          }
        }
      } else {
        this.clearExtraRangeIndicators();
      }
    }
  }
  startWatching(buildingUid) {
    if (this.buildingUid) {
      this.stopWatching();
    }
    debug("Starting to watch building: %s", buildingUid);
    var buildings = this.ui.getBuildings();
    var buildingData = buildings[buildingUid];
    if (!buildingData) {
      debug(
        "Failed to watch building because it doesn't exist in known buildings...",
      );
      return;
    }
    this.buildingUid = buildingUid;
    this.buildingId = buildingData.type;
    this.buildingTier = buildingData.tier;
    var buildingSchema = this.ui.getBuildingSchema();
    var schemaData = buildingSchema[this.buildingId];
    if (this.buildingId == "GoldStash") {
      var cellSize = _Game.currentGame.world.entityGrid.getCellSize();
      this.rangeIndicator = new _RangeIndicatorModel({
        width: this.maxStashDistance * cellSize * 2,
        height: this.maxStashDistance * cellSize * 2,
      });
      _Game.currentGame.renderer.ground.addAttachment(this.rangeIndicator);
    } else if (
      this.buildingId === "Harvester" ||
      this.buildingId === "MeleeTower"
    ) {
      var range =
        (schemaData.rangeTiers &&
          schemaData.rangeTiers[this.buildingTier - 1]) ||
        (this.buildingId === "Harvester" ? 300 : 110);
      var maxYawDeviation =
        (schemaData.maxYawDeviationTiers &&
          schemaData.maxYawDeviationTiers[this.buildingTier - 1]) ||
        (this.buildingId === "Harvester" ? 70 : 30);
      this.rangeIndicator = new _RangeIndicatorModel({
        isSector: true,
        radius: range,
        startAngle: -90 - maxYawDeviation,
        endAngle: -90 + maxYawDeviation,
      });
      _Game.currentGame.renderer.ground.addAttachment(this.rangeIndicator);
    } else if (schemaData.rangeTiers) {
      this.rangeIndicator = new _RangeIndicatorModel({
        isCircular: true,
        radius: schemaData.rangeTiers[this.buildingTier - 1],
      });
      _Game.currentGame.renderer.ground.addAttachment(this.rangeIndicator);
    }
    this.componentElem.innerHTML =
      '<div class="hud-tooltip-building">\n            <h2>' +
      schemaData.name +
      '</h2>\n            <h3>Tier <span class="hud-building-tier">' +
      this.buildingTier +
      '</span> Building</h3>\n            <div class="hud-tooltip-health">\n                <span class="hud-tooltip-health-bar" style="width:100%;"></span>\n            </div>\n            <div class="hud-tooltip-body">\n                <div class="hud-building-stats"></div>\n                <p class="hud-building-actions">\n                    <a class="btn btn-green hud-building-upgrade">Upgrade</a>\n                    <a class="btn btn-blue hud-building-offset" style="display:none;">Offset</a>\n                    <a class="btn btn-red hud-building-sell">Sell</a>\n                </p>\n            </div>\n        </div>';
    this.tierElem = this.componentElem.querySelector(".hud-building-tier");
    this.healthBarElem = this.componentElem.querySelector(
      ".hud-tooltip-health-bar",
    );
    this.statsElem = this.componentElem.querySelector(".hud-building-stats");
    this.actionsElem = this.componentElem.querySelector(
      ".hud-building-actions",
    );
    this.upgradeElem = this.componentElem.querySelector(
      ".hud-building-upgrade",
    );
    this.offsetElem = this.componentElem.querySelector(".hud-building-offset");
    this.sellElem = this.componentElem.querySelector(".hud-building-sell");
    this.upgradeElem.addEventListener("click", this.upgradeBuilding.bind(this));
    this.offsetElem.addEventListener("click", this.offsetGoldStash.bind(this));
    this.sellElem.addEventListener("click", this.sellBuilding.bind(this));
    this.show();
    this.update();
  }
  stopWatching() {
    if (this.buildingUid) {
      debug("Stopping watching building: %s", this.buildingUid);
      if (this.rangeIndicator) {
        _Game.currentGame.renderer.ground.removeAttachment(this.rangeIndicator);
        this.rangeIndicator.destroy();
        delete this.rangeIndicator;
      }
      this.clearExtraRangeIndicators();
      this.componentElem.innerHTML = "";
      this.componentElem.style.left = "-1000px";
      this.componentElem.style.top = "-1000px";
      this.buildingUid = null;
      this.buildingId = null;
      this.buildingTier = null;
      this.hide();
    }
  }
  clearExtraRangeIndicators() {
    if (this.extraRangeIndicators) {
      for (var uid in this.extraRangeIndicators) {
        if (this.extraRangeIndicators[uid]) {
          _Game.currentGame.renderer.ground.removeAttachment(
            this.extraRangeIndicators[uid],
          );
          this.extraRangeIndicators[uid].destroy();
        }
      }
      this.extraRangeIndicators = {};
    }
  }
  upgradeBuilding() {
    if (this.buildingUid) {
      if (this.shouldUpgradeAll) {
        var buildings = this.ui.getBuildings();
        var uidsToUpgrade = [];
        debug(
          "Sending upgrade request for all buildings of type: %s, %d",
          this.buildingId,
          this.buildingTier,
        );
        for (var uid in buildings) {
          if (
            buildings[uid].type === this.buildingId &&
            buildings[uid].tier === this.buildingTier
          ) {
            uidsToUpgrade.push(parseInt(uid));
          }
        }
        for (var i = 0; i < uidsToUpgrade.length; i++) {
          _Game.currentGame.network.sendRpc({
            name: "UpgradeBuilding",
            uid: uidsToUpgrade[i],
          });
        }
      } else {
        debug("Sending upgrade request for building: %d", this.buildingUid);
        _Game.currentGame.network.sendRpc({
          name: "UpgradeBuilding",
          uid: this.buildingUid,
        });
      }
    }
  }
  sellBuilding() {
    if (this.buildingUid) {
      if (this.buildingId === "GoldStash") {
        var buildingUid = this.buildingUid;
        this.ui.components.PopupOverlay.showConfirmation(
          "Are you sure you want to sell all buildings?",
          5000,
          function () {
            debug("Selling GoldStash (sells entire base): %d", buildingUid);
            _Game.currentGame.network.sendRpc({
              name: "DeleteBuilding",
              uid: buildingUid,
            });
          },
        );
      } else if (this.shouldUpgradeAll) {
        var buildings = this.ui.getBuildings();
        var uidsToDelete = [];
        debug(
          "Sending delete request for all buildings of type: %s",
          this.buildingId,
        );
        for (var uid in buildings) {
          if (buildings[uid].type === this.buildingId) {
            uidsToDelete.push(parseInt(uid));
          }
        }
        for (var i = 0; i < uidsToDelete.length; i++) {
          _Game.currentGame.network.sendRpc({
            name: "DeleteBuilding",
            uid: uidsToDelete[i],
          });
        }
      } else {
        debug("Sending delete request for building: %d", this.buildingUid);
        _Game.currentGame.network.sendRpc({
          name: "DeleteBuilding",
          uid: this.buildingUid,
        });
      }
    }
  }
  getGoldStashTier() {
    var buildings = this.ui.getBuildings();
    for (var uid in buildings) {
      if (buildings[uid].type == "GoldStash") {
        return buildings[uid].tier;
      }
    }
    return 1;
  }
  onMouseDown(event) {
    event.stopPropagation();
  }
  onMouseUp(event) {
    event.stopPropagation();
  }
  onTick() {
    if (this.buildingUid) {
      var networkEntity = _Game.currentGame.world.getEntityByUid(
        this.buildingUid,
      );
      if (!networkEntity) {
        this.stopWatching();
        return;
      }
      var entityTick = networkEntity.getTargetTick();
      var healthPercentage = Math.round(
        (entityTick.health / entityTick.maxHealth) * 100,
      );
      if (this.healthBarElem) {
        this.healthBarElem.style.width = healthPercentage + "%";
      }
    }
  }
  onCameraUpdate() {
    this.update();
  }
  onBuildingsUpdate() {
    this.update();
  }
  offsetGoldStash() {
    if (this.buildingUid && this.buildingId === "GoldStash") {
      debug("Initiating placement-based GoldStash offset.");
      this.stopWatching();
      this.ui.components.PlacementOverlay.startOffsettingStash();
    }
  }
  onBuildingSchemaUpdate() {
    this.update();
  }
}
export default UiBuildingOverlay;
