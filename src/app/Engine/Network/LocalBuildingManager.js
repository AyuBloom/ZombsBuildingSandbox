import { TOWER_LIMITS, getInitialTowersLength } from "./LocalNetworkConfig";

export default class LocalBuildingManager {
  constructor(collisionChecker, entityManager, onMessageCallback) {
    this.collisionChecker = collisionChecker;
    this.entityManager = entityManager;
    this.onMessageCallback = onMessageCallback;
    this.buildings = {};
    this.goldstash = null;
    this.towersLength = getInitialTowersLength();
    this.towerLimits = TOWER_LIMITS;
  }

  reset() {
    this.buildings = {};
    this.goldstash = null;
    this.towersLength = getInitialTowersLength();
  }

  handleRpc(data, playerdata, playerUid) {
    if (data.name == "TeleportPlayer") {
      if (data.x >= 0 && data.x <= 24000 && data.y >= 0 && data.y <= 24000) {
        playerdata.position.x = data.x;
        playerdata.position.y = data.y;
        this.entityManager.markEntityDirty(playerUid);
      }
      return;
    }

    if (data.name == "OffsetGoldStash") {
      if (this.goldstash) {
        const dx = parseInt(data.x) || 0;
        const dy = parseInt(data.y) || 0;

        let newX = this.goldstash.x + dx;
        let newY = this.goldstash.y + dy;

        newX = Math.max(192, Math.min(23808, newX));
        newY = Math.max(192, Math.min(23808, newY));

        newX = Math.round(newX / 48) * 48;
        newY = Math.round(newY / 48) * 48;

        const actualDx = newX - this.goldstash.x;
        const actualDy = newY - this.goldstash.y;

        if (actualDx !== 0 || actualDy !== 0) {
          const oldX = this.goldstash.x;
          const oldY = this.goldstash.y;

          // Temporarily remove GoldStash position to check for collisions with other buildings/resources
          const oldKey = oldX + ", " + oldY;
          const savedStash = this.collisionChecker.activeBuildingsByPos[oldKey];
          delete this.collisionChecker.activeBuildingsByPos[oldKey];

          const isValid =
            this.collisionChecker.fixOccurredBuildingsByType(newX, newY, "GoldStash") &&
            this.collisionChecker.fixOccurredBuildingsForRssByType(newX, newY, "GoldStash");

          if (!isValid) {
            if (savedStash) {
              this.collisionChecker.activeBuildingsByPos[oldKey] = savedStash;
            }
            this.onMessageCallback({
              opcode: 9,
              name: "Failure",
              response: {
                category: "Placement",
                reason: "ObstructionsArePresent",
              },
            });
            return;
          }

          this.goldstash.x = newX;
          this.goldstash.y = newY;
          this.collisionChecker.activeBuildingsByPos[newX + ", " + newY] = this.goldstash;

          const stashEntity = this.entityManager.entities.get(this.goldstash.uid);
          if (stashEntity) {
            stashEntity.position.x = newX;
            stashEntity.position.y = newY;
            this.entityManager.markEntityDirty(this.goldstash.uid);
          }

          const buildingUids = Object.keys(this.buildings);
          for (let i = 0; i < buildingUids.length; i++) {
            const uid = Number(buildingUids[i]);
            const building = this.buildings[uid];
            if (!building || building.uid === this.goldstash.uid) continue;
            if (building.type === "Harvester") continue;

            const distX = Math.abs(building.x - newX);
            const distY = Math.abs(building.y - newY);
            if (distX >= 865 || distY >= 865) {
              building.dead = 1;
              this.onMessageCallback({
                name: "LocalBuilding",
                response: [building],
                opcode: 9,
              });
              --this.towersLength[building.type];
              delete this.collisionChecker.activeBuildingsByPos[
                building.x + ", " + building.y
              ];
              delete this.buildings[uid];
              this.entityManager.entities.delete(uid);
              this.entityManager.unchangedEntities.delete(uid);
              this.entityManager.dirtyEntities.delete(uid);
            }
          }

          this.onMessageCallback({
            name: "LocalBuilding",
            response: [this.goldstash],
            opcode: 9,
          });
        }
      }
      return;
    }

    if (data.name == "CastSpell") {
      if (data.type == "Tree" || data.type == "Stone") {
        if (
          data.x >= 0 &&
          data.x <= 24000 &&
          data.y >= 0 &&
          data.y <= 24000 &&
          !this.entityManager.newEntitiesByPos[data.x + ", " + data.y + ", " + data.type]
        ) {
          let _uid = this.entityManager.nextUid();
          let entity = window.toInclude({
            uid: _uid,
            position: {
              x: data.x,
              y: data.y,
            },
            model: data.type,
            partyId: 1,
          });
          this.entityManager.newEntities[_uid] = entity;
          this.entityManager.newEntitiesByPos[data.x + ", " + data.y + ", " + data.type] =
            entity;
          this.entityManager.entities.set(_uid, entity);
          this.entityManager.unchangedEntities.set(_uid, true);
          this.entityManager.markEntityDirty(_uid);
        }
      }
      return;
    }

    if (data.name == "MakeBuilding") {
      if (
        this.goldstash &&
        data.type !== "GoldStash" &&
        this.towersLength[data.type] >= this.towerLimits[data.type]
      ) {
        this.onMessageCallback({
          opcode: 9,
          name: "Failure",
          response: {
            category: "Placement",
            reason: "BuildingLimit",
          },
        });
        return;
      }
      if (this.goldstash && data.type == "GoldStash") {
        this.onMessageCallback({
          opcode: 9,
          name: "Failure",
          response: {
            category: "Placement",
            reason: "BuildingLimit",
          },
        });
        return;
      }
      if (
        !this.goldstash &&
        data.type == "GoldStash" &&
        data.x >= 192 &&
        data.x <= 23808 &&
        data.y >= 192 &&
        data.y <= 23808 &&
        this.collisionChecker.fixOccurredBuildingsForRssByType(data.x, data.y, data.type)
      ) {
        let _uid = this.entityManager.nextUid();
        let obj = {
          x: data.x,
          y: data.y,
          type: data.type,
          dead: 0,
          uid: _uid,
          tier: 1,
          yaw: data.yaw || 0,
        };
        this.goldstash = obj;
        this.buildings[_uid] = obj;
        this.collisionChecker.activeBuildingsByPos[data.x + ", " + data.y] = obj;
        this.entityManager.entities.set(
          _uid,
          this.entityManager.createBuildingEntity(
            _uid,
            data.x,
            data.y,
            data.type,
            data.yaw,
            1,
          ),
        );
        this.entityManager.unchangedEntities.set(_uid, true);
        this.entityManager.markEntityDirty(_uid);
        ++this.towersLength[data.type];
        this.onMessageCallback({
          name: "LocalBuilding",
          response: [obj],
          opcode: 9,
        });
        return;
      }
      if (
        this.goldstash &&
        data.type !== "GoldStash" &&
        !this.collisionChecker.activeBuildingsByPos[data.x + ", " + data.y] &&
        this.towersLength[data.type] < this.towerLimits[data.type] &&
        ((Math.abs(data.y - this.goldstash.y) < 865 &&
          Math.abs(data.x - this.goldstash.x) < 865) ||
          data.type == "Harvester") &&
        data.x >= 192 &&
        data.x <= 23808 &&
        data.y >= 192 &&
        data.y <= 23808 &&
        this.collisionChecker.fixOccurredBuildingsByType(data.x, data.y, data.type) &&
        this.collisionChecker.fixOccurredBuildingsForRssByType(data.x, data.y, data.type)
      ) {
        let _uid = this.entityManager.nextUid();
        let obj = {
          x: data.x,
          y: data.y,
          type: data.type,
          dead: 0,
          uid: _uid,
          tier: 1,
          yaw: data.yaw || 0,
        };
        this.buildings[_uid] = obj;
        this.collisionChecker.activeBuildingsByPos[data.x + ", " + data.y] = obj;
        this.entityManager.entities.set(
          _uid,
          this.entityManager.createBuildingEntity(
            _uid,
            data.x,
            data.y,
            data.type,
            data.yaw,
            1,
          ),
        );
        this.entityManager.unchangedEntities.set(_uid, true);
        this.entityManager.markEntityDirty(_uid);
        ++this.towersLength[data.type];
        this.onMessageCallback({
          name: "LocalBuilding",
          response: [obj],
          opcode: 9,
        });
        return;
      }
      return;
    }

    if (data.name == "DeleteBuilding") {
      if (this.buildings[data.uid]) {
        this.buildings[data.uid].dead = 1;
        this.onMessageCallback({
          name: "LocalBuilding",
          response: [this.buildings[data.uid]],
          opcode: 9,
        });
        --this.towersLength[this.buildings[data.uid].type];
        delete this.collisionChecker.activeBuildingsByPos[
          this.buildings[data.uid].x + ", " + this.buildings[data.uid].y
        ];
        delete this.buildings[data.uid];
        this.entityManager.entities.delete(data.uid);
        this.entityManager.unchangedEntities.delete(data.uid);
        this.entityManager.dirtyEntities.delete(data.uid);
        if (this.goldstash && data.uid == this.goldstash.uid) {
          this.goldstash = undefined;
          const buildingUids = Object.keys(this.buildings);
          this.collisionChecker.activeBuildingsByPos = {};
          for (let i = 0; i < buildingUids.length; i++) {
            const uid = buildingUids[i];
            this.buildings[uid].dead = 1;
            this.onMessageCallback({
              name: "LocalBuilding",
              response: [this.buildings[uid]],
              opcode: 9,
            });
            delete this.buildings[uid];
            this.entityManager.entities.delete(Number(uid));
            this.entityManager.unchangedEntities.delete(Number(uid));
            this.entityManager.dirtyEntities.delete(Number(uid));
          }
          for (let i in this.towersLength) {
            this.towersLength[i] = 0;
          }
        }
      }
      return;
    }

    if (data.name == "UpgradeBuilding") {
      if (
        this.buildings[data.uid] &&
        this.buildings[data.uid].tier < 8 &&
        (this.buildings[data.uid].tier < this.goldstash.tier ||
          this.goldstash.uid == data.uid)
      ) {
        let tier = this.buildings[data.uid].tier + 1;
        this.buildings[data.uid].tier = tier;
        this.collisionChecker.activeBuildingsByPos[
          this.buildings[data.uid].x + ", " + this.buildings[data.uid].y
        ].tier = tier;
        this.onMessageCallback({
          name: "LocalBuilding",
          response: [this.buildings[data.uid]],
          opcode: 9,
        });
        this.entityManager.entities.get(data.uid).tier = tier;
        this.entityManager.markEntityDirty(data.uid);
      }
      return;
    }
  }
}
