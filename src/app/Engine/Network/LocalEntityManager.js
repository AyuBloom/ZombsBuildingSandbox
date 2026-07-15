export default class LocalEntityManager {
  constructor() {
    this.uid = 825;
    this.entities = new Map();
    this.unchangedEntities = new Map();
    this.dirtyEntities = new Set();
    this.fullEntitySyncPending = true;
    this.newEntities = {};
    this.newEntitiesByPos = {};
  }

  reset(maxResourceUid = 825) {
    this.uid = maxResourceUid;
    this.entities.clear();
    this.unchangedEntities.clear();
    this.dirtyEntities.clear();
    this.fullEntitySyncPending = true;
    this.newEntities = {};
    this.newEntitiesByPos = {};
  }

  nextUid() {
    return ++this.uid;
  }

  markEntityDirty(uid) {
    this.dirtyEntities.add(Number(uid));
  }

  createEntityUpdate(playerUid, playerdata) {
    if (this.fullEntitySyncPending) {
      this.fullEntitySyncPending = false;
      this.dirtyEntities.clear();
      return new Map(this.entities);
    }
    const update = new Map(this.unchangedEntities);
    update.set(playerUid, playerdata);
    for (const uid of this.dirtyEntities) {
      if (this.entities.has(uid)) {
        update.set(uid, this.entities.get(uid));
      }
    }
    this.dirtyEntities.clear();
    return update;
  }

  createBuildingEntity(uid, x, y, type, yaw, tier) {
    if (type === "GoldStash") {
      return {
        collisionRadius: 0,
        damage: 10,
        dead: 0,
        entityClass: "Prop",
        health: 1500,
        height: 95,
        interpolatedYaw: 0,
        maxHealth: 1500,
        model: type,
        partyId: 1,
        position: { x: x, y: y },
        slowed: 0,
        stunned: 0,
        tier: tier,
        timeDead: 0,
        uid: uid,
        width: 95,
        yaw: yaw,
      };
    }
    if (type === "Wall" || type === "Door" || type === "SlowTrap") {
      return {
        uid: uid,
        entityClass: "Prop",
        model: type,
        position: { x: x, y: y },
        yaw: yaw,
        health: 150,
        maxHealth: 150,
        damage: 10,
        height: 47,
        width: 47,
        collisionRadius: 0,
        dead: 0,
        timeDead: 0,
        slowed: 0,
        stunned: 0,
        tier: tier,
        partyId: 1,
      };
    }
    if (
      type === "ArrowTower" ||
      type === "CannonTower" ||
      type === "BombTower" ||
      type === "MagicTower" ||
      type === "MeleeTower"
    ) {
      return {
        uid: uid,
        entityClass: "Prop",
        model: type,
        position: { x: x, y: y },
        yaw: yaw,
        health: type === "MeleeTower" ? 200 : 150,
        maxHealth: type === "MeleeTower" ? 200 : 150,
        damage: 10,
        height: 95,
        width: 95,
        collisionRadius: 0,
        dead: 0,
        timeDead: 0,
        slowed: 0,
        stunned: 0,
        tier: tier,
        partyId: 1,
        towerYaw: 0,
        firingTick: 0,
        healingTick: 0,
      };
    }
    if (type === "GoldMine") {
      return {
        uid: uid,
        entityClass: "Prop",
        model: type,
        position: { x: x, y: y },
        yaw: yaw,
        health: 150,
        maxHealth: 150,
        damage: 10,
        height: 95,
        width: 95,
        collisionRadius: 0,
        dead: 0,
        timeDead: 0,
        slowed: 0,
        stunned: 0,
        tier: tier,
        partyId: 1,
      };
    }
    if (type === "Harvester") {
      return {
        uid: uid,
        entityClass: "Prop",
        model: type,
        position: { x: x, y: y },
        yaw: yaw,
        health: 150,
        maxHealth: 150,
        damage: 10,
        height: 95,
        width: 95,
        collisionRadius: 0,
        dead: 0,
        timeDead: 0,
        slowed: 0,
        stunned: 0,
        tier: tier,
        partyId: 1,
        harvestMax: 400,
        stone: 0,
        wood: 0,
        firingTick: 0,
        deposit: 0,
        depositMax: 800,
        lastHarvestedBy: "",
      };
    }
  }
}
