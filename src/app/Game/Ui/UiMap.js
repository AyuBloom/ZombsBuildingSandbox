import _Game from "../../Engine/Game/Game";
import _UiComponent from "./UiComponent";

class UiMap extends _UiComponent {
    constructor(ui) {
        super(ui, "<div id=\"hud-map\" class=\"hud-map\"></div>");
        this.playerElems = {};
        this.buildingElems = {};

        // Create coordinates hover tooltip for teleport
        this.teleportTooltip = this.ui.createElement("<div class=\"hud-tooltip hud-tooltip-top hud-map-teleport-tooltip\"><h4>Teleport</h4><h5>Click to Teleport</h5></div>");
        this.componentElem.appendChild(this.teleportTooltip);

        // Event listeners for interactive teleport system
        this.componentElem.addEventListener("mousemove", this.onMouseMove.bind(this));
        this.componentElem.addEventListener("mouseleave", this.onMouseLeave.bind(this));
        this.componentElem.addEventListener("click", this.onMapClick.bind(this));

        _Game.currentGame.renderer.addTickCallback(this.update.bind(this));
        this.ui.on("buildingsUpdate", this.onBuildingsUpdate.bind(this));
        this.ui.on("partyMembersUpdated", this.onPartyMembersUpdate.bind(this));
    }

    update() {
        for (var playerUid in this.playerElems) {
            var playerData = this.playerElems[playerUid];
            var networkEntity = _Game.currentGame.world.getEntityByUid(parseInt(playerUid));
            if (networkEntity) {
                var xPos = Math.round(networkEntity.getPositionX() / _Game.currentGame.world.getWidth() * 100);
                var yPos = Math.round(networkEntity.getPositionY() / _Game.currentGame.world.getHeight() * 100);
                playerData.marker.setAttribute("data-index", playerData.index.toString());
                playerData.marker.style.display = "block";
                playerData.marker.style.left = xPos + "%";
                playerData.marker.style.top = yPos + "%";
            } else {
                playerData.marker.style.display = "none";
            }
        }
    }

    onMouseMove(event) {
        var rect = this.componentElem.getBoundingClientRect();
        var clickX = event.clientX - rect.left;
        var clickY = event.clientY - rect.top;
        var pctX = clickX / rect.width;
        var pctY = clickY / rect.height;

        var worldWidth = _Game.currentGame.world.getWidth() || 24000;
        var worldHeight = _Game.currentGame.world.getHeight() || 24000;

        var targetX = Math.round(pctX * worldWidth);
        var targetY = Math.round(pctY * worldHeight);

        targetX = Math.max(0, Math.min(worldWidth, targetX));
        targetY = Math.max(0, Math.min(worldHeight, targetY));

        this.teleportTooltip.style.opacity = "1";
        this.teleportTooltip.style.left = (pctX * 100) + "%";
        this.teleportTooltip.style.top = (pctY * 100) + "%";
        this.teleportTooltip.innerHTML = "<h4>Teleport</h4><h5>X: " + targetX + ", Y: " + targetY + "</h5>";
    }

    onMouseLeave() {
        this.teleportTooltip.style.opacity = "0";
    }

    onMapClick(event) {
        var rect = this.componentElem.getBoundingClientRect();
        var clickX = event.clientX - rect.left;
        var clickY = event.clientY - rect.top;
        var pctX = clickX / rect.width;
        var pctY = clickY / rect.height;

        var worldWidth = _Game.currentGame.world.getWidth() || 24000;
        var worldHeight = _Game.currentGame.world.getHeight() || 24000;

        var targetX = Math.round(pctX * worldWidth);
        var targetY = Math.round(pctY * worldHeight);

        // Limit slightly within margins of the map
        targetX = Math.max(192, Math.min(worldWidth - 192, targetX));
        targetY = Math.max(192, Math.min(worldHeight - 192, targetY));

        _Game.currentGame.network.sendRpc({
            name: "TeleportPlayer",
            x: targetX,
            y: targetY
        });

        if (this.ui.components.PopupOverlay) {
            this.ui.components.PopupOverlay.showHint("Teleported to (" + targetX + ", " + targetY + ")", 2000);
        }
    }

    onBuildingsUpdate(buildings) {
        var staleElems = {};
        for (var buildingUid in this.buildingElems) {
            staleElems[buildingUid] = true;
        }
        for (var buildingUid in buildings) {
            delete staleElems[buildingUid];
            if (!this.buildingElems[buildingUid]) {
                var buildingElem = this.ui.createElement("<div class=\"hud-map-building\"></div>");
                var xPos = Math.round(buildings[buildingUid].x / _Game.currentGame.world.getWidth() * 100);
                var yPos = Math.round(buildings[buildingUid].y / _Game.currentGame.world.getHeight() * 100);
                buildingElem.style.left = xPos + "%";
                buildingElem.style.top = yPos + "%";
                this.componentElem.appendChild(buildingElem);
                this.buildingElems[buildingUid] = buildingElem;
            }
        }
        for (var buildingUid in staleElems) {
            if (this.buildingElems[buildingUid]) {
                this.buildingElems[buildingUid].remove();
                delete this.buildingElems[buildingUid];
            }
        }
    }

    onPartyMembersUpdate(partyMembers) {
        var staleElems = {};
        for (var playerUid in this.playerElems) {
            staleElems[playerUid] = true;
        }
        for (var memberUid in partyMembers) {
            var index = parseInt(memberUid);
            var playerUid = partyMembers[memberUid].playerUid;
            delete staleElems[playerUid];
            if (this.playerElems[playerUid]) {
                this.playerElems[playerUid].index = index;
            } else {
                var partyMemberElem = this.ui.createElement("<div class=\"hud-map-player\" data-index=\"" + index + "\"></div>");
                this.componentElem.appendChild(partyMemberElem);
                this.playerElems[playerUid] = {
                    index: index,
                    marker: partyMemberElem
                };
            }
        }
        for (var playerUid in staleElems) {
            if (this.playerElems[playerUid]) {
                this.playerElems[playerUid].marker.remove();
                delete this.playerElems[playerUid];
            }
        }
    }
}

export default UiMap;
