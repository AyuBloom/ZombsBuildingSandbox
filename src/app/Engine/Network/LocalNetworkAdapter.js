import _Game from "../Game/Game";
import _NetworkAdapter from "./NetworkAdapter";
import _PacketIds from "./PacketIds";

class LocalNetworkAdapter extends _NetworkAdapter {
    constructor() {
        super();
        this.connected = false;
        this.connecting = false;
        this.tickInterval = null;
        this.moveInterval = null;
        this.connectTimeout = null;
        this.preEnterWorldTimeout = null;
    }

    disconnect() {
        this.connected = false;
        this.connecting = false;
        if (this.connectTimeout) {
            clearTimeout(this.connectTimeout);
            this.connectTimeout = null;
        }
        if (this.preEnterWorldTimeout) {
            clearTimeout(this.preEnterWorldTimeout);
            this.preEnterWorldTimeout = null;
        }
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        if (this.moveInterval) {
            clearInterval(this.moveInterval);
            this.moveInterval = null;
        }
    }

    reconnect() {
        return this.connect(this.connectionOptions);
    }

    getPing() {
        return 0;
    }

    connect(options) {
        this.disconnect();
        this.connectionOptions = options;
        this.connecting = true;

        this.uid = 825;
        this.playerUid = ++this.uid;
        this.entities = new Map();
        this.unchangedEntities = new Map();
        this.dirtyEntities = new Set();
        this.fullEntitySyncPending = true;
        this.newEntities = {};
        this.newEntitiesByPos = {};
        this.buildings = {};
        this.activeBuildingsByPos = {};
        this.rss = {};
        this.rssNearStash = {};
        this.goldstash = null;

        this.towersLength = {
            Wall: 0,
            Door: 0,
            SlowTrap: 0,
            ArrowTower: 0,
            CannonTower: 0,
            MeleeTower: 0,
            MagicTower: 0,
            BombTower: 0,
            GoldMine: 0,
            Harvester: 0,
            GoldStash: 0
        };

        this.towerLimits = {
            Wall: 1000,
            Door: 160,
            SlowTrap: 48,
            ArrowTower: 24,
            CannonTower: 24,
            MeleeTower: 24,
            MagicTower: 24,
            BombTower: 24,
            GoldMine: 8,
            Harvester: 8,
            GoldStash: 1
        };

        this.connectpacketdata = {
            allowed: 1,
            chatChannel: 0,
            effectiveDisplayName: "Player",
            effectiveTickRate: 20,
            maxPlayers: 32,
            opcode: 4,
            players: 1,
            startingTick: 0,
            tickRate: 20,
            uid: this.playerUid,
            x1: 0,
            x2: 24000,
            y1: 0,
            y2: 24000
        };

        this.playerdata = {
            aimingYaw: 0,
            availableSkillPoints: 1,
            baseSpeed: 37.5,
            collisionRadius: 27,
            damage: 10,
            dead: 0,
            energy: 0,
            energyRegenerationRate: 0,
            entityClass: "PlayerEntity",
            experience: 0,
            firingTick: 0,
            gold: 0,
            hatName: "",
            health: 500,
            height: 32,
            isBuildingWalking: 0,
            isInvulnerable: 1,
            isPaused: 0,
            kills: 0,
            lastDamage: 0,
            lastDamageTarget: 0,
            lastDamageTick: 0,
            lastPetDamage: 0,
            lastPetDamageTarget: 0,
            lastPetDamageTick: 0,
            level: 1,
            maxEnergy: 0,
            maxHealth: 500,
            model: "GamePlayer",
            msBetweenFires: 300,
            name: "Player",
            partyId: 1,
            petUid: 0,
            position: {
                x: window.customSpawnPoint ? window.customSpawnPoint.x : 24000 / 2,
                y: window.customSpawnPoint ? window.customSpawnPoint.y : 24000 / 2
            },
            reconnectSecret: "",
            score: 0,
            slowed: 0,
            speedAttribute: 0,
            startChargingTick: 0,
            stone: 0,
            stunned: 0,
            timeDead: 0,
            token: 0,
            uid: this.playerUid,
            wave: 0,
            weaponName: "Pickaxe",
            weaponTier: 1,
            width: 32,
            wood: 0,
            yaw: 1,
            zombieShieldHealth: 0,
            zombieShieldMaxHealth: 0,
        };

        this.yaw = 1;
        this.up = 0;
        this.down = 0;
        this.right = 0;
        this.left = 0;
        this.ticks = 0;
        this.shift = 0;

        this.startMovementInterval();

        // Simulate connection open
        this.connectTimeout = setTimeout(() => {
            this.connectTimeout = null;
            this.connecting = false;
            this.connected = true;
            this.emitter.emit("connected");

            // Send PACKET_PRE_ENTER_WORLD (opcode 5)
            this.preEnterWorldTimeout = setTimeout(() => {
                this.preEnterWorldTimeout = null;
                this.onMessage({
                    opcode: 5,
                    extra: new Uint8Array([67])
                });
            }, 50);
        }, 50);
    }

    sendPacket(event, data) {
        if (!this.connected) return;

            if (event === 4) {
                const name = localStorage.getItem("name") || "Player";
                this.connectpacketdata.effectiveDisplayName = name;
                this.playerdata.name = name;

                this.onMessage({
                    ...this.connectpacketdata
                });

                this.onMessage({
                    name: 'SetItem',
                    response: {
                        itemName: 'Pickaxe',
                        tier: 1,
                        stacks: 1
                    },
                    opcode: 9
                });

                this.onMessage({
                    name: 'PartyInfo',
                    response: [{
                        playerUid: this.playerUid,
                        displayName: this.playerdata.name,
                        isLeader: 1,
                        canSell: 1
                    }],
                    opcode: 9
                });

                this.onMessage({
                    name: 'PartyShareKey',
                    response: {
                        partyShareKey: 'serverspots'
                    },
                    opcode: 9
                });

                this.onMessage({
                    name: 'DayCycle',
                    response: {
                        cycleStartTick: this.ticks,
                        nightEndTick: this.ticks + Infinity,
                        dayEndTick: 0,
                        isDay: 0
                    },
                    opcode: 9
                });

                this.onMessage({
                    name: 'BuildingShopPrices',
                    response: {
                        json: '[{"Name":"Wall","Class":"PlayerObject","GoldCosts":[0,5,30,60,80,100,250,800],"WoodCosts":[2,0,0,0,0,0,0,0],"StoneCosts":[0,2,0,0,0,0,0,0],"TokenCosts":[0,0,0,0,0,0,0,0],"Width":47.99,"Height":47.99,"Health":[150,200,300,400,600,800,1500,2500],"MsBeforeRegen":[10000,10000,10000,10000,10000,10000,10000,10000],"HealthRegenPerSecond":[5,7,12,17,25,40,80,250]},{"Name":"GoldStash","Class":"GoldStash","GoldCosts":[0,5000,10000,16000,20000,32000,100000,400000],"WoodCosts":[0,0,0,0,0,0,0,0],"StoneCosts":[0,0,0,0,0,0,0,0],"TokenCosts":[0,0,0,0,0,0,0,0],"Width":95.99,"Height":95.99,"Health":[1500,1800,2300,3000,5000,8000,12000,20000],"MsBeforeRegen":[10000,10000,10000,10000,10000,10000,10000,10000],"HealthRegenPerSecond":[50,60,70,90,110,150,400,700]},{"Name":"GoldMine","Class":"GoldMine","GoldCosts":[0,200,300,600,800,1200,8000,30000],"WoodCosts":[5,15,25,35,45,55,700,1600],"StoneCosts":[5,15,25,35,45,55,700,1600],"TokenCosts":[0,0,0,0,0,0,0,0],"Width":95.99,"Height":95.99,"Health":[150,250,350,500,800,1400,1800,2800],"GoldPerSecond":[4,6,7,10,12,15,25,35],"MsBeforeRegen":[10000,10000,10000,10000,10000,10000,10000,10000],"HealthRegenPerSecond":[5,7,12,17,25,40,70,120]},{"Name":"Door","Class":"Door","GoldCosts":[0,10,50,70,150,200,400,800],"WoodCosts":[5,5,0,0,0,0,0,0],"StoneCosts":[5,5,0,0,0,0,0,0],"TokenCosts":[0,0,0,0,0,0,0,0],"Width":47.99,"Height":47.99,"Health":[150,200,300,500,700,1000,1500,2000],"MsBeforeRegen":[10000,10000,10000,10000,10000,10000,10000,1000],"HealthRegenPerSecond":[5,7,12,17,25,40,70,100]},{"Name":"CannonTower","Class":"Tower","GoldCosts":[0,100,200,600,1200,2000,8000,35000],"WoodCosts":[15,25,30,40,60,80,300,800],"StoneCosts":[15,25,40,50,80,120,300,800],"TokenCosts":[0,0,0,0,0,0,0,0],"TowerRadius":[500,500,500,500,600,600,600,600],"MsBetweenFires":[1000,769,625,500,400,350,250,250],"Height":95.99,"Width":95.99,"Health":[150,200,400,800,1200,1600,2200,3600],"MsBeforeRegen":[10000,10000,10000,10000,10000,10000,10000,10000],"HealthRegenPerSecond":[2,5,10,20,40,80,110,150],"DamageToZombies":[20,30,50,70,120,150,200,300],"DamageToPlayers":[5,5,5,5,5,5,6,8],"DamageToPets":[5,5,5,5,5,5,6,8],"DamageToNeutrals":[250,350,450,550,650,750,850,1000],"ProjectileLifetime":[1000,1000,1000,1000,1000,1000,1000,1000],"ProjectileVelocity":[60,65,70,70,75,80,100,140],"ProjectileName":"CannonProjectile","ProjectileAoe":[true,true,true,true,true,true,true,true],"ProjectileAoeRadius":[250,250,250,250,250,250,250,250],"ProjectileCollisionRadius":[10,10,10,10,10,10,10,10]},{"Name":"ArrowTower","Class":"ArrowTower","GoldCosts":[0,100,200,600,1200,2000,8000,35000],"WoodCosts":[5,25,30,40,50,70,300,800],"StoneCosts":[5,20,30,40,60,80,300,800],"TokenCosts":[0,0,0,0,0,0,0,0],"TowerRadius":[600,650,700,750,800,850,900,1000],"MsBetweenFires":[400,333,285,250,250,250,250,250],"Height":95.99,"Width":95.99,"Health":[150,200,400,800,1200,1600,2200,3600],"MsBeforeRegen":[10000,10000,10000,10000,10000,10000,10000,10000],"HealthRegenPerSecond":[2,5,10,20,40,80,110,150],"DamageToZombies":[20,40,70,120,180,250,400,500],"DamageToPlayers":[5,5,5,5,5,5,6,6],"DamageToPets":[5,5,5,5,5,5,6,6],"DamageToNeutrals":[250,350,450,550,650,750,850,1000],"ProjectileLifetime":[1300,1300,1300,1300,1300,1300,1300,1300],"ProjectileVelocity":[60,65,70,70,75,80,120,140],"ProjectileName":"ArrowProjectile","ProjectileAoe":[false,false,false,false,false,false,false,false],"ProjectileCollisionRadius":[10,10,10,10,10,10,10,10]},{"Name":"Harvester","Class":"Harvester","GoldCosts":[0,100,200,600,1200,2000,8000,10000],"WoodCosts":[5,25,30,40,50,70,300,600],"StoneCosts":[5,20,30,40,60,80,300,600],"TokenCosts":[0,0,0,0,0,0,0,0],"Height":95.99,"Width":95.99,"Health":[150,200,400,800,1200,1600,2200,2800],"MsBeforeRegen":[10000,10000,10000,10000,10000,10000,10000,10000],"HealthRegenPerSecond":[2,5,10,20,40,80,110,130],"HarvestAmount":[2.5,4.65,4.55,7.2,8.25,10,13.5,16],"HarvestCooldown":[1500,1400,1300,1200,1100,1000,900,800],"HarvestMax":[400,800,1200,1600,2000,2400,2800,3600],"HarvestRange":[300,300,300,300,300,300,300,300],"DepositCostPerMinute":[200,300,350,500,600,700,1200,1400],"DepositMax":[800,1200,1400,2000,2400,2800,4800,6000],"MaxYawDeviation":[70,70,70,70,70,70,70,70]},{"Name":"BombTower","Class":"Tower","GoldCosts":[0,100,200,600,1200,2000,8000,35000],"WoodCosts":[10,25,40,50,80,120,300,800],"StoneCosts":[10,25,40,50,80,120,300,800],"TokenCosts":[0,0,0,0,0,0,0,0],"TowerRadius":[1000,1000,1000,1000,1000,1000,1000,1000],"MsBetweenFires":[1000,1000,1000,1000,1000,1000,900,900],"Height":95.99,"Width":95.99,"Health":[150,200,400,800,1200,1600,2200,3600],"MsBeforeRegen":[10000,10000,10000,10000,10000,10000,10000,10000],"HealthRegenPerSecond":[2,5,10,20,40,80,110,150],"DamageToZombies":[30,60,100,140,200,600,1200,1600],"DamageToPlayers":[10,10,10,10,10,10,10,10],"DamageToPets":[10,10,10,10,10,10,10,10],"DamageToNeutrals":[250,350,450,550,650,750,850,1000],"ProjectileLifetime":[1000,1000,1000,1000,1000,1000,1000,1000],"ProjectileVelocity":[20,20,20,20,20,20,20,20],"ProjectileName":"BombProjectile","ProjectileCollisionRadius":[10,10,10,10,10,10,10,10],"ProjectileMaxRange":[1000,1000,1000,1000,1000,1000,1000,1000]},{"Name":"MagicTower","Class":"MagicTower","GoldCosts":[0,100,200,600,1200,2000,8000,35000],"WoodCosts":[15,25,40,50,70,100,300,800],"StoneCosts":[15,25,40,50,70,100,300,800],"TokenCosts":[0,0,0,0,0,0,0,0],"TowerRadius":[400,400,400,400,400,400,400,400],"MsBetweenFires":[800,800,700,600,500,400,300,300],"Height":95.99,"Width":95.99,"Health":[150,200,400,800,1200,1600,2200,3600],"MsBeforeRegen":[10000,10000,10000,10000,10000,10000,10000,10000],"HealthRegenPerSecond":[2,5,10,20,40,80,110,150],"DamageToZombies":[10,20,40,50,70,80,120,160],"DamageToPlayers":[5,5,5,5,5,5,5,5],"DamageToPets":[5,5,5,5,5,5,5,5],"DamageToNeutrals":[250,350,450,550,650,750,850,1000],"ProjectileLifetime":[500,500,500,500,500,500,500,500],"ProjectileVelocity":[45,45,45,45,45,45,45,45],"ProjectileName":"FireballProjectile","ProjectileAoe":[true,true,true,true,true,true,true,true],"ProjectileAoeRadius":[100,100,100,100,100,100,100,100],"ProjectileCollisionRadius":[10,10,10,10,10,10,10,10]},{"Name":"MeleeTower","Class":"MeleeTower","GoldCosts":[0,100,200,600,1200,2000,8000,35000],"WoodCosts":[10,25,30,40,50,70,300,800],"StoneCosts":[10,20,30,40,60,80,300,800],"TokenCosts":[0,0,0,0,0,0,0,0],"TowerRadius":[110,110,110,110,110,110,110,110],"MsBetweenFires":[400,333,285,250,250,250,250,250],"Height":95.99,"Width":95.99,"Health":[200,400,800,1200,1600,2200,4000,9000],"MsBeforeRegen":[10000,10000,10000,10000,10000,10000,10000,10000],"HealthRegenPerSecond":[2,5,10,20,40,80,220,350],"DamageToZombies":[80,120,200,280,500,1000,2000,3000],"DamageToPlayers":[5,5,5,5,5,5,6,6],"DamageToPets":[5,5,5,5,5,5,6,6],"DamageToNeutrals":[250,350,450,550,650,750,850,1000],"MaxYawDeviation":[30,30,30,30,30,30,30,30]},{"Name":"SlowTrap","Class":"Trap","GoldCosts":[0,100,200,400,600,800,1000,1500],"WoodCosts":[5,25,30,40,50,70,300,800],"StoneCosts":[5,20,30,40,60,80,300,800],"TokenCosts":[0,0,0,0,0,0,0,0],"Height":47.99,"Width":47.99,"Health":[150,200,400,800,1200,1600,2200,3000],"MsBeforeRegen":[10000,10000,10000,10000,10000,10000,10000,10000],"HealthRegenPerSecond":[2,5,10,20,40,80,110,150],"SlowDuration":[2500,2500,2500,3000,3000,3250,3500,4000],"SlowAmount":[0.4,0.45,0.5,0.55,0.6,0.65,0.7,0.7]}]'
                    },
                    opcode: 9
                });

                this.onMessage({
                    name: 'ItemShopPrices',
                    response: {
                        json: '[{"Name":"Spear","Class":"MeleeWeapon","MsBetweenFires":[250,250,250,250,250,250,250],"DamageToZombies":[30,80,120,300,2000,8000,10000],"DamageToNeutrals":[50,80,100,200,250,400,600],"DamageToBuildings":[3,3.5,4,4.5,5,5.5,5.5],"DamageToPlayers":[15,16,17,18,20,22,22],"DamageToPets":[3,3.5,4,4.5,5,5.5,5.5],"GoldCosts":[100,400,3000,5000,25000,35000,90000],"StoneCosts":[0,0,0,0,0,0,0],"WoodCosts":[0,0,0,0,0,0,0],"TokenCosts":[0,0,0,0,0,0,0],"Range":[100,100,100,100,100,100,100],"MaxYawDeviation":[50,50,50,50,50,50,50]},{"Name":"Pickaxe","Class":"MeleeWeapon","MsBetweenFires":[300,300,285,250,200,200,200],"DamageToZombies":[20,20,20,20,20,20,20],"DamageToBuildings":[0,0,0,0,0,0,0],"DamageToPlayers":[0,0,0,0,0,0,0],"DamageToNeutrals":[10,10,10,10,10,10,10],"DamageToPets":[0,0,0,0,0,0,0],"GoldCosts":[0,1000,3000,6000,8000,24000,90000],"StoneCosts":[0,0,0,0,0,0,0],"WoodCosts":[0,0,0,0,0,0,0],"TokenCosts":[0,0,0,0,0,0,0],"Range":[100,100,100,100,100,100,100],"MaxYawDeviation":[70,70,70,70,70,70,70],"IsTool":true,"HarvestCount":[1,2,2,3,3,4,6]},{"Name":"Bow","Class":"RangedWeapon","DamageToZombies":[20,40,100,300,2400,10000,14000],"DamageToBuildings":[2,2.3,2.5,2.7,3,3,3],"DamageToPlayers":[22,24,26,28,30,32,32],"DamageToNeutrals":[50,100,150,200,250,400,700],"DamageToPets":[2,2.3,2.5,2.7,3,3,3],"GoldCosts":[100,400,2000,7000,24000,30000,90000],"StoneCosts":[0,0,0,0,0,0,0],"WoodCosts":[0,0,0,0,0,0,0],"TokenCosts":[0,0,0,0,0,0,0],"MsBetweenFires":[500,500,500,500,500,500,500],"ChargeTime":[150,150,150,150,150,150,150],"ProjectileVelocity":[100,100,100,100,100,100,100],"ProjectileName":"BowProjectile","ProjectileCollisionRadius":[10,10,10,10,10,10,10],"ProjectileLifetime":[550,550,550,550,550,550,550]},{"Name":"Crossbow","Class":"RangedWeapon","DamageToZombies":[10,10],"DamageToBuildings":[0,0],"DamageToPlayers":[0,0],"GoldCosts":[0,0],"StoneCosts":[0,0],"WoodCosts":[0,0],"TokenCosts":[0,0],"MsBetweenFires":[500,500],"ProjectileVelocity":[150,150],"ProjectileName":"BowProjectile","ProjectileCollisionRadius":[10,10],"ProjectileLifetime":[1000,1000]},{"Name":"Bomb","Class":"RangedWeapon","GoldCosts":[100,400,3000,5000,24000,30000,90000],"DamageToNeutrals":[50,100,150,200,250,300,500],"StoneCosts":[0,0,0,0,0,0,0],"WoodCosts":[0,0,0,0,0,0,0],"TokenCosts":[0,0,0,0,0,0,0],"MsBetweenFires":[500,500,500,500,500,500,500],"DamageToZombies":[10,30,80,150,1200,6000,9000],"DamageToBuildings":[1,1,1,1,1,1,1],"DamageToPlayers":[20,22,24,26,28,30,30],"DamageToPets":[1,1,1,1,1,1,1],"ProjectileVelocity":[40,40,40,40,40,40,40],"ProjectileName":"BombProjectile","ProjectileCollisionRadius":[10,10,10,10,10,10,10],"ProjectileLifetime":[700,700,700,700,700,700,700],"ProjectileAoe":[true,true,true,true,true,true,true],"ProjectileAoeRadius":[50,50,50,50,50,50,50],"ProjectileIgnoresCollisions":[false,false,false,false,false,false,false],"ProjectileMaxRange":[700,700,700,700,700,700,700]},{"Name":"HealthPotion","Class":"HealthPotion","GoldCosts":[100],"StoneCosts":[0],"WoodCosts":[0],"TokenCosts":[0],"PurchaseCooldown":15000},{"Name":"ZombieShield","Class":"ZombieShield","GoldCosts":[1000,3000,7000,14000,18000,22000,24000,30000,45000,70000],"StoneCosts":[0,0,0,0,0,0,0,0,0,0],"WoodCosts":[0,0,0,0,0,0,0,0,0,0],"TokenCosts":[0,0,0,0,0,0,0,0,0,0],"Health":[500,1000,1800,4000,10000,20000,35000,50000,65000,85000],"RechargePerSecond":[50,100,200,400,1000,2000,3500,5000,6500,8500],"MsBeforeRecharge":[10000,9000,8000,7000,6000,6000,6000,6000,6000,6000]},{"Name":"Pause","Class":"Pause","GoldCosts":[10000],"StoneCosts":[0],"WoodCosts":[0],"TokenCosts":[0],"PurchaseCooldown":240000},{"Name":"PetMiner","Class":"Pet","GoldCosts":[0,0,0,0,0,0,0,0],"WoodCosts":[0,0,0,0,0,0,0,0],"StoneCosts":[0,0,0,0,0,0,0,0],"TokenCosts":[0,100,100,100,100,200,200,300],"CollisionRadius":25,"Health":[400,800,1500,3000,5000,8000,10000,16000],"MsBeforeRegen":[8000,8000,8000,8000,8000,8000,8000,8000],"HealthRegenPerSecond":[5,5,5,5,5,5,5,5],"Speed":[30,32,34,35,35,37,37,38],"DamageToNeutrals":[80,100,150,200,250,400,500,600],"HarvestCount":[1,1,2,2,3,3,4,4],"Ranged":[false,false,false,false,false,false,false,false],"CanAttackPlayers":[false,false,false,false,false,false,false,false],"CanMine":[true,true,true,true,true,true,true,true],"LeashRange":[500,500,500,500,500,500,500,500],"HarvestLeashRange":[0,0,0,0,0,0,0,0],"AttackRange":[80,80,80,80,80,80,80,80],"MsBetweenFires":[500,450,450,400,400,380,380,350],"EvolvesAtLevel":[0,8,16,24,32,48,64,96],"ExperienceFromMiningPerHalfSecond":[1,1,1,1,1,1,1,1]},{"Name":"PetCARL","Class":"Pet","GoldCosts":[0,0,0,0,0,0,0,0],"WoodCosts":[0,0,0,0,0,0,0,0],"StoneCosts":[0,0,0,0,0,0,0,0],"TokenCosts":[0,100,100,100,100,200,200,300],"CollisionRadius":25,"Health":[400,800,1500,3000,5000,8000,10000,16000],"MsBeforeRegen":[8000,8000,8000,8000,8000,8000,8000,8000],"HealthRegenPerSecond":[5,5,5,5,5,5,5,5],"Speed":[30,32,34,35,35,37,37,38],"DamageToNeutrals":[80,100,150,200,250,400,500,600],"Ranged":[false,false,false,false,false,false,false,false],"CanAttackPlayers":[true,true,true,true,true,true,true,true],"LeashRange":[500,500,500,500,500,500,500,500],"AttackRange":[80,80,80,80,80,80,80,80],"MsBetweenFires":[500,490,490,490,480,480,470,470],"ProjectileLifetime":[1000,1000,1000,1000,1000,1000,1000,1000],"ProjectileVelocity":[60,60,60,60,60,60,60,60],"ProjectileName":"PetCARLProjectile","ProjectileAoe":[true,true,true,true,true,true,true,true],"ProjectileAoeRadius":[250,250,250,250,250,250,250,250],"ProjectileCollisionRadius":[10,10,10,10,10,10,10,10],"DamageToZombies":[30,100,400,600,1000,3000,6000,8000],"DamageToPlayers":[30,31,32,33,34,35,36,37],"DamageToBuildings":[2,2,2,3,3,3,4,4],"EvolvesAtLevel":[0,8,16,24,32,48,64,96],"ExperienceFromZombies":[30,28,25,25,25,25,25,25],"ExperienceFromNeutrals":[30,28,25,25,25,25,25,25]},{"Name":"HatHorns","Class":"Hat","GoldCosts":[0],"WoodCosts":[0],"StoneCosts":[0],"TokenCosts":[0]},{"Name":"PetHealthPotion","Class":"PetHealthPotion","GoldCosts":[100],"StoneCosts":[0],"WoodCosts":[0],"TokenCosts":[0]},{"Name":"PetWhistle","Class":"PetWhistle","GoldCosts":[0],"StoneCosts":[0],"WoodCosts":[0],"TokenCosts":[0]},{"Name":"PetRevive","Class":"PetRevive","GoldCosts":[0],"StoneCosts":[0],"WoodCosts":[0],"TokenCosts":[0]}]'
                    },
                    opcode: 9
                });

                this.onMessage({
                    name: 'Spells',
                    response: {
                        json: '[{"Name":"HealTowersSpell","VisualLifetime":10000,"VisualRadius":600,"Cooldown":[240000],"IsCooldownForParty":true,"Healing":[{"Type":"Tower","Amount":[50],"Over":[10000],"Radius":[600]}],"GoldCosts":[1000],"WoodCosts":[0],"StoneCosts":[0],"TokenCosts":[0]}]'
                    },
                    opcode: 9
                });

                this.onMessage({
                    name: 'SetPartyList',
                    response: [{
                        partyId: 1,
                        partyName: 'Party1',
                        isOpen: 0,
                        memberCount: 1
                    }],
                    opcode: 9
                });

                this.entities = new Map();
                this.unchangedEntities = new Map();
                this.dirtyEntities = new Set();
                this.fullEntitySyncPending = true;
                this.entities.set(this.playerUid, this.playerdata);
                this.unchangedEntities.set(this.playerUid, true);

                // Decode serverspots
                const currentServerId = _Game.currentGame.options.serverId;
                if (window.serverspots && window.serverspots[currentServerId] && window.serverspots[currentServerId].spotEncoded) {
                    const spots = window.decodeSpotJSON(window.serverspots[currentServerId].spotEncoded);
                    for (let i = 0; i < 825; i++) {
                        this.entities.delete(i + 1);
                        delete this.rss[i + 1];
                    }
                    for (let i in spots) {
                        const entity = window.toInclude(spots[i]);
                        this.entities.set(entity.uid, entity);
                        this.unchangedEntities.set(entity.uid, true);
                        this.rss[entity.uid] = entity;
                    }
                }

                _Game.currentGame.renderer.follow(_Game.currentGame.world.localPlayer.entity);

                // Tick interval
                this.tickInterval = setInterval(() => {
                    this.onMessage({
                        tick: this.ticks++,
                        entities: this.createEntityUpdate(),
                        byteSize: 48,
                        opcode: 0
                    });
                }, 50);
            }
            else if (event === 3) {
                // Movement inputs
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

                this.playerdata.yaw = this.yaw;
            }
            else if (event === 9) {
                // RPC inputs
                if (data.name == "TeleportPlayer") {
                    if (data.x >= 0 && data.x <= 24000 && data.y >= 0 && data.y <= 24000) {
                        this.playerdata.position.x = data.x;
                        this.playerdata.position.y = data.y;
                        this.markEntityDirty(this.playerUid);
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
                            const savedStash = this.activeBuildingsByPos[oldKey];
                            delete this.activeBuildingsByPos[oldKey];

                            const isValid = this.fixOccurredBuildingsByType(newX, newY, "GoldStash") && 
                                            this.fixOccurredBuildingsForRssByType(newX, newY, "GoldStash");

                            if (!isValid) {
                                if (savedStash) {
                                    this.activeBuildingsByPos[oldKey] = savedStash;
                                }
                                this.onMessage({
                                    opcode: 9,
                                    name: "Failure",
                                    response: {
                                        category: "Placement",
                                        reason: "ObstructionsArePresent"
                                    }
                                });
                                return;
                            }
                            
                            this.goldstash.x = newX;
                            this.goldstash.y = newY;
                            this.activeBuildingsByPos[newX + ", " + newY] = this.goldstash;
                            
                            const stashEntity = this.entities.get(this.goldstash.uid);
                            if (stashEntity) {
                                stashEntity.position.x = newX;
                                stashEntity.position.y = newY;
                                this.markEntityDirty(this.goldstash.uid);
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
                                    this.onMessage({
                                        name: 'LocalBuilding',
                                        response: [building],
                                        opcode: 9
                                    });
                                    --this.towersLength[building.type];
                                    delete this.activeBuildingsByPos[building.x + ", " + building.y];
                                    delete this.buildings[uid];
                                    this.entities.delete(uid);
                                    this.unchangedEntities.delete(uid);
                                    this.dirtyEntities.delete(uid);
                                }
                            }
                            
                            this.rssNearStash = {};
                            for (let i in this.rss) {
                                if (Math.abs(this.rss[i].position.y - this.goldstash.y) < 1225 && Math.abs(this.rss[i].position.x - this.goldstash.x) < 1225) {
                                    this.rssNearStash[i] = this.rss[i];
                                }
                            }
                            
                            this.onMessage({
                                name: 'LocalBuilding',
                                response: [this.goldstash],
                                opcode: 9
                            });
                        }
                    }
                    return;
                }
                if (data.name == "CastSpell") {
                    if (data.type == "Tree" || data.type == "Stone") {
                        if (data.x >= 0 && data.x <= 24000 && data.y >= 0 && data.y <= 24000 && !this.newEntitiesByPos[data.x + ", " + data.y + ", " + data.type]) {
                            let _uid = ++this.uid;
                            let entity = window.toInclude({
                                uid: _uid,
                                position: {
                                    x: data.x,
                                    y: data.y
                                },
                                model: data.type,
                                partyId: 1
                            });
                            this.newEntities[_uid] = entity;
                            this.newEntitiesByPos[data.x + ", " + data.y + ", " + data.type] = entity;
                            this.entities.set(_uid, entity);
                            this.unchangedEntities.set(_uid, true);
                            this.markEntityDirty(_uid);
                        }
                    }
                }
                else if (data.name == "MakeBuilding") {
                    if (this.goldstash && data.type !== "GoldStash" && this.towersLength[data.type] >= this.towerLimits[data.type]) {
                        this.onMessage({
                            opcode: 9,
                            name: "Failure",
                            response: {
                                category: "Placement",
                                reason: "BuildingLimit"
                            }
                        });
                        return;
                    }
                    if (this.goldstash && data.type == "GoldStash") {
                        this.onMessage({
                            opcode: 9,
                            name: "Failure",
                            response: {
                                category: "Placement",
                                reason: "BuildingLimit"
                            }
                        });
                        return;
                    }
                    if (!this.goldstash && data.type == "GoldStash" && data.x >= 192 && data.x <= 23808 && data.y >= 192 && data.y <= 23808 && this.fixOccurredBuildingsForRssByType(data.x, data.y, data.type)) {
                        let _uid = ++this.uid;
                        let obj = {
                            x: data.x,
                            y: data.y,
                            type: data.type,
                            dead: 0,
                            uid: _uid,
                            tier: 1,
                            yaw: data.yaw || 0
                        };
                        this.goldstash = obj;
                        this.buildings[_uid] = obj;
                        this.activeBuildingsByPos[data.x + ", " + data.y] = obj;
                        this.entities.set(_uid, this.createBuildingEntity(_uid, data.x, data.y, data.type, data.yaw, 1));
                        this.unchangedEntities.set(_uid, true);
                        this.markEntityDirty(_uid);
                        ++this.towersLength[data.type];
                        this.onMessage({
                            name: 'LocalBuilding',
                            response: [obj],
                            opcode: 9
                        });
                        this.rssNearStash = {};
                        for (let i in this.rss) {
                            if (Math.abs(this.rss[i].position.y - this.goldstash.y) < 1225 && Math.abs(this.rss[i].position.x - this.goldstash.x) < 1225) {
                                this.rssNearStash[i] = this.rss[i];
                            }
                        }
                    }
                    if (this.goldstash && data.type !== "GoldStash" && !this.activeBuildingsByPos[data.x + ", " + data.y] && this.towersLength[data.type] < this.towerLimits[data.type] && ((Math.abs(data.y - this.goldstash.y) < 865 && Math.abs(data.x - this.goldstash.x) < 865) || data.type == "Harvester") && data.x >= 192 && data.x <= 23808 && data.y >= 192 && data.y <= 23808 && this.fixOccurredBuildingsByType(data.x, data.y, data.type) && this.fixOccurredBuildingsForRssByType(data.x, data.y, data.type)) {
                        let _uid = ++this.uid;
                        let obj = {
                            x: data.x,
                            y: data.y,
                            type: data.type,
                            dead: 0,
                            uid: _uid,
                            tier: 1,
                            yaw: data.yaw || 0
                        };
                        this.buildings[_uid] = obj;
                        this.activeBuildingsByPos[data.x + ", " + data.y] = obj;
                        this.entities.set(_uid, this.createBuildingEntity(_uid, data.x, data.y, data.type, data.yaw, 1));
                        this.unchangedEntities.set(_uid, true);
                        this.markEntityDirty(_uid);
                        ++this.towersLength[data.type];
                        this.onMessage({
                            name: 'LocalBuilding',
                            response: [obj],
                            opcode: 9
                        });
                    }
                }
                else if (data.name == "DeleteBuilding") {
                    if (this.buildings[data.uid]) {
                        this.buildings[data.uid].dead = 1;
                        this.onMessage({
                            name: 'LocalBuilding',
                            response: [this.buildings[data.uid]],
                            opcode: 9
                        });
                        --this.towersLength[this.buildings[data.uid].type];
                        delete this.activeBuildingsByPos[this.buildings[data.uid].x + ", " + this.buildings[data.uid].y];
                        delete this.buildings[data.uid];
                        this.entities.delete(data.uid);
                        this.unchangedEntities.delete(data.uid);
                        this.dirtyEntities.delete(data.uid);
                        if (this.goldstash && data.uid == this.goldstash.uid) {
                            this.goldstash = undefined;
                            const buildingUids = Object.keys(this.buildings);
                            this.activeBuildingsByPos = {};
                            for (let i = 0; i < buildingUids.length; i++) {
                                const uid = buildingUids[i];
                                this.buildings[uid].dead = 1;
                                this.onMessage({
                                    name: 'LocalBuilding',
                                    response: [this.buildings[uid]],
                                    opcode: 9
                                });
                                delete this.buildings[uid];
                                this.entities.delete(Number(uid));
                                this.unchangedEntities.delete(Number(uid));
                                this.dirtyEntities.delete(Number(uid));
                            }
                            for (let i in this.towersLength) {
                                this.towersLength[i] = 0;
                            }
                        }
                    }
                }
                else if (data.name == "UpgradeBuilding") {
                    if (this.buildings[data.uid] && this.buildings[data.uid].tier < 8 && (this.buildings[data.uid].tier < this.goldstash.tier || this.goldstash.uid == data.uid)) {
                        let tier = this.buildings[data.uid].tier + 1;
                        this.buildings[data.uid].tier = tier;
                        this.activeBuildingsByPos[this.buildings[data.uid].x + ", " + this.buildings[data.uid].y].tier = tier;
                        this.onMessage({
                            name: 'LocalBuilding',
                            response: [this.buildings[data.uid]],
                            opcode: 9
                        });
                        this.entities.get(data.uid).tier = tier;
                        this.markEntityDirty(data.uid);
                    }
                }
            }
    }

    markEntityDirty(uid) {
        this.dirtyEntities.add(Number(uid));
    }

    createEntityUpdate() {
        if (this.fullEntitySyncPending) {
            this.fullEntitySyncPending = false;
            this.dirtyEntities.clear();
            return new Map(this.entities);
        }
        const update = new Map(this.unchangedEntities);
        update.set(this.playerUid, this.playerdata);
        for (const uid of this.dirtyEntities) {
            if (this.entities.has(uid)) {
                update.set(uid, this.entities.get(uid));
            }
        }
        this.dirtyEntities.clear();
        return update;
    }

    onMessage(message) {
        this.emitter.emit(_PacketIds[message.opcode], message);
    }

    startMovementInterval() {
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
            const oldX = this.playerdata.position.x;
            const oldY = this.playerdata.position.y;

            if (this.yaw === 0) {
                this.playerdata.position.y -= speed;
            }
            if (this.yaw === 45) {
                this.playerdata.position.x += speed / 1.5;
                this.playerdata.position.y -= speed / 1.5;
            }
            if (this.yaw === 90) {
                this.playerdata.position.x += speed;
            }
            if (this.yaw === 135) {
                this.playerdata.position.x += speed / 1.5;
                this.playerdata.position.y += speed / 1.5;
            }
            if (this.yaw === 180) {
                this.playerdata.position.y += speed;
            }
            if (this.yaw === 225) {
                this.playerdata.position.x -= speed / 1.5;
                this.playerdata.position.y += speed / 1.5;
            }
            if (this.yaw === 270) {
                this.playerdata.position.x -= speed;
            }
            if (this.yaw === 315) {
                this.playerdata.position.x -= speed / 1.5;
                this.playerdata.position.y -= speed / 1.5;
            }

            this.playerdata.position.x = Math.max(0, Math.min(24000, this.playerdata.position.x));
            this.playerdata.position.y = Math.max(0, Math.min(24000, this.playerdata.position.y));
            if (this.playerdata.position.x !== oldX || this.playerdata.position.y !== oldY) {
                this.markEntityDirty(this.playerUid);
            }
        }, 16);
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
                partyId: 1
            };
        }
        if (type === "ArrowTower" || type === "CannonTower" || type === "BombTower" || type === "MagicTower" || type === "MeleeTower") {
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
                healingTick: 0
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
                partyId: 1
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
                lastHarvestedBy: ""
            };
        }
    }

    fixOccurredBuildingsByType(x, y, type) {
        if (type === "Wall" || type === "Door" || type === "SlowTrap") {
            return x % 48 === 24 && y % 48 === 24 && !this.activeBuildingsByPos[(24 + x) + ", " + y] && !this.activeBuildingsByPos[(x - 24) + ", " + y] && !this.activeBuildingsByPos[x + ", " + (y + 24)] && !this.activeBuildingsByPos[x + ", " + (y - 24)] && !this.activeBuildingsByPos[(x - 24) + ", " + (y - 24)] && !this.activeBuildingsByPos[(24 + x) + ", " + (y + 24)] && !this.activeBuildingsByPos[(x - 24) + ", " + (y + 24)] && !this.activeBuildingsByPos[(24 + x) + ", " + (y - 24)];
        }
        return x % 48 === 0 && y % 48 === 0 && !this.activeBuildingsByPos[(24 + x) + ", " + y] && !this.activeBuildingsByPos[(x - 24) + ", " + y] && !this.activeBuildingsByPos[x + ", " + (y + 24)] && !this.activeBuildingsByPos[x + ", " + (y - 24)] && !this.activeBuildingsByPos[(x - 24) + ", " + (y - 24)] && !this.activeBuildingsByPos[(24 + x) + ", " + (y + 24)] && !this.activeBuildingsByPos[(x - 24) + ", " + (y + 24)] && !this.activeBuildingsByPos[(24 + x) + ", " + (y - 24)] && !this.activeBuildingsByPos[(48 + x) + ", " + y] && !this.activeBuildingsByPos[(x - 48) + ", " + y] && !this.activeBuildingsByPos[x + ", " + (y + 48)] && !this.activeBuildingsByPos[x + ", " + (y - 48)] && !this.activeBuildingsByPos[(x - 48) + ", " + (y - 48)] && !this.activeBuildingsByPos[(48 + x) + ", " + (y + 48)] && !this.activeBuildingsByPos[(x - 48) + ", " + (y + 48)] && !this.activeBuildingsByPos[(48 + x) + ", " + (y - 48)];
    }

    checkOccupiedBuildingForRss(rss, x, y, type) {
        // Define resource radius (Tree: 70, Stone: 50, NeutralCamp: 60)
        let radius = 60;
        if (rss.model === "Tree") {
            radius = 70;
        } else if (rss.model === "Stone") {
            radius = 50;
        }
        
        // Define building half-size (Wall, Door, SlowTrap are 48x48; others are 96x96)
        let hw = 48;
        let hh = 48;
        if (type === "Wall" || type === "Door" || type === "SlowTrap") {
            hw = 24;
            hh = 24;
        }
        
        // Bounding box of the building
        const minX = x - hw;
        const maxX = x + hw;
        const minY = y - hh;
        const maxY = y + hh;
        
        // Resource center coordinates
        const cx = rss.position.x;
        const cy = rss.position.y;
        
        // Closest point on building box to resource center
        const closestX = Math.max(minX, Math.min(cx, maxX));
        const closestY = Math.max(minY, Math.min(cy, maxY));
        
        // Distance from closest point to resource center
        const distX = cx - closestX;
        const distY = cy - closestY;
        
        if (distX * distX + distY * distY < radius * radius) {
            return 1; // Collision detected
        }
    }

    fixOccurredBuildingsForRssByType(x, y, type) {
        const source = this.goldstash ? this.rssNearStash : this.rss;
        for (let i in source) {
            if (this.checkOccupiedBuildingForRss(source[i], x, y, type) === 1) {
                return false;
            }
        }
        return true;
    }
}

export default LocalNetworkAdapter;
