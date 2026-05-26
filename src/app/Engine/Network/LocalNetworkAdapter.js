import _Game from "../Game/Game";
import _NetworkAdapter from "./NetworkAdapter";
import _PacketIds from "./PacketIds";

import LocalCollisionChecker from "./LocalCollisionChecker";
import LocalEntityManager from "./LocalEntityManager";
import LocalMovementController from "./LocalMovementController";
import LocalBuildingManager from "./LocalBuildingManager";
import {
  getInitialPlayerData,
  getInitialConnectPacketData,
  buildingShopPricesJson,
} from "./LocalNetworkConfig";

class LocalNetworkAdapter extends _NetworkAdapter {
  constructor() {
    super();
    this.ticks = 1;
    this.connected = false;
    this.connecting = false;
    this.tickInterval = null;

    this.collisionChecker = new LocalCollisionChecker();
    this.entityManager = new LocalEntityManager();
    this.movementController = new LocalMovementController(this.entityManager);
    this.buildingManager = new LocalBuildingManager(
      this.collisionChecker,
      this.entityManager,
      (msg) => this.onMessage(msg),
    );
  }

  // Backwards compatibility getters
  get buildings() {
    return this.buildingManager ? this.buildingManager.buildings : {};
  }

  get goldstash() {
    return this.buildingManager ? this.buildingManager.goldstash : null;
  }

  get towersLength() {
    return this.buildingManager ? this.buildingManager.towersLength : {};
  }

  get towerLimits() {
    return this.buildingManager ? this.buildingManager.towerLimits : {};
  }

  disconnect() {
    this.connected = false;
    this.connecting = false;
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.movementController) {
      this.movementController.stop();
    }
    this.emitter.emit("close");
  }

  reconnect() {
    return this.connect(this.connectionOptions);
  }

  connect(options) {
    this.connectionOptions = options;
    this.connecting = true;

    this.entityManager.reset();
    this.movementController.reset();
    this.buildingManager.reset();
    this.collisionChecker.reset();

    this.playerUid = this.entityManager.nextUid();
    this.playerdata = getInitialPlayerData(this.playerUid);
    this.connectpacketdata = getInitialConnectPacketData(this.playerUid);

    this.entityManager.entities.set(this.playerUid, this.playerdata);
    this.entityManager.unchangedEntities.set(this.playerUid, true);

    this.ticks = 1;

    this.movementController.start(this.playerdata, this.playerUid);

    // Simulate connection open
    this.connecting = false;
    this.connected = true;
    this.emitter.emit("connected");

    // Send PACKET_PRE_ENTER_WORLD (opcode 5)
    this.onMessage({
      opcode: 5,
      extra: new Uint8Array([67]),
    });
  }

  sendPacket(event, data) {
    if (!this.connected) return;

    if (event === 4) {
      this.onMessage({
        ...this.connectpacketdata,
      });

      this.entityManager.entities.set(this.playerUid, this.playerdata);
      this.entityManager.unchangedEntities.set(this.playerUid, true);

      // Decode serverspots
      const currentServerId = _Game.currentGame.options.serverId;
      if (
        window.serverspots &&
        window.serverspots[currentServerId] &&
        window.serverspots[currentServerId].spotEncoded
      ) {
        const spots = window.decodeSpotJSON(
          window.serverspots[currentServerId].spotEncoded,
        );
        for (let i = 0; i < 825; i++) {
          this.entityManager.entities.delete(i + 1);
          delete this.collisionChecker.rss[i + 1];
        }
        for (let i in spots) {
          const entity = window.toInclude(spots[i]);
          this.entityManager.entities.set(entity.uid, entity);
          this.entityManager.unchangedEntities.set(entity.uid, true);
          this.collisionChecker.rss[entity.uid] = entity;
        }
      }

      this.onMessage({
        name: "PartyInfo",
        response: [
          {
            playerUid: this.playerUid,
            displayName: this.playerdata.name,
            isLeader: 1,
            canSell: 1,
          },
        ],
        opcode: 9,
      });

      this.onMessage({
        name: "BuildingShopPrices",
        response: {
          json: buildingShopPricesJson,
        },
        opcode: 9,
      });

      // Tick interval
      this.tickInterval = setInterval(() => {
        this.onMessage({
          tick: this.ticks++,
          entities: this.entityManager.createEntityUpdate(
            this.playerUid,
            this.playerdata,
          ),
          opcode: 0,
        });
      }, 50);
    } else if (event === 3) {
      // Movement inputs
      this.movementController.updateInputs(data, this.playerdata);
    } else if (event === 9) {
      // RPC inputs
      this.buildingManager.handleRpc(data, this.playerdata, this.playerUid);
    }
  }

  onMessage(message) {
    this.emitter.emit(_PacketIds[message.opcode], message);
  }
}

export default LocalNetworkAdapter;
