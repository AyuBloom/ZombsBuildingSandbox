import _Game from "../../Engine/Game/Game";
import _UiComponent from "./UiComponent";
var request = require('browser-request');
class UiIntro extends _UiComponent {
    constructor(ui) {
        super(ui, "<span></span>");
        this.connecting = false;
        this.componentElem = document.querySelector(".hud-intro");
        this.nameInputElem = this.componentElem.querySelector(".hud-intro-name");
        this.serverElem = this.componentElem.querySelector(".hud-intro-server");
        this.submitElem = this.componentElem.querySelector(".hud-intro-play");
        this.errorElem = this.componentElem.querySelector(".hud-intro-error");

        this.canvas = document.getElementById("serverspot-canvas");
        this.overlay = document.getElementById("unusable-overlay");
        this.statsElem = this.componentElem.querySelector(".hud-intro-preview-stats");
        this.coordsElem = this.componentElem.querySelector(".hud-intro-preview-coords");

        if (this.canvas) {
            this.ctx = this.canvas.getContext("2d");
            this.canvas.addEventListener("mousemove", this.onCanvasMouseMove.bind(this));
            this.canvas.addEventListener("mouseleave", this.onCanvasMouseLeave.bind(this));
            this.canvas.addEventListener("click", this.onCanvasClick.bind(this));

            // Create floating magnifier DOM and Canvas elements
            this.magnifierPopup = document.createElement("div");
            this.magnifierPopup.id = "magnifier-popup";
            this.magnifierCanvas = document.createElement("canvas");
            this.magnifierCanvas.width = 220;
            this.magnifierCanvas.height = 220;
            this.magnifierPopup.appendChild(this.magnifierCanvas);
            this.canvas.parentNode.parentNode.appendChild(this.magnifierPopup);

            // Create offscreen canvas for O(1) rendering cache
            this.offscreenCanvas = document.createElement("canvas");
            this.offscreenCanvas.width = this.canvas.width;
            this.offscreenCanvas.height = this.canvas.height;
            this.offscreenCtx = this.offscreenCanvas.getContext("2d");
            this.lastServerId = null;
        }

        // Preload real resource SVGs
        this.treeImg = new Image();
        this.treeImg.src = "asset/image/ui/entities/entities-tree.svg";
        this.treeImg.onload = () => {
            this.preRenderCurrentServer();
            this.updatePreview();
        };

        this.stoneImg = new Image();
        this.stoneImg.src = "asset/image/ui/entities/entities-stone.svg";
        this.stoneImg.onload = () => {
            this.preRenderCurrentServer();
            this.updatePreview();
        };

        this.campImg = new Image();
        this.campImg.src = "asset/image/entity/neutral-camp/neutral-camp-base.svg";
        this.campImg.onload = () => {
            this.preRenderCurrentServer();
            this.updatePreview();
        };

        this.serverElem.addEventListener("change", this.onServerChange.bind(this));
        this.componentElem.addEventListener("wheel", this.onWheel.bind(this));
        this.nameInputElem.addEventListener("keyup", this.onNameInputKeyUp.bind(this));
        this.submitElem.addEventListener("click", this.onSubmitClick.bind(this));

        _Game.currentGame.network.addPreEnterWorldHandler(this.onConnectionStart.bind(this));
        _Game.currentGame.network.addErrorHandler(this.onConnectionError.bind(this));
        _Game.currentGame.network.addEnterWorldHandler(this.onEnterWorld.bind(this));

        this.checkForPartyInvitation();
        this.updateServerOptions();
        this.updatePreview();
    }
    updateServerOptions() {
        var options = this.serverElem.querySelectorAll("option");
        for (var i = 0; i < options.length; i++) {
            var opt = options[i];
            var serverId = opt.value;
            var hasSpots = window.serverspots && window.serverspots[serverId] && window.serverspots[serverId].spotEncoded;
            if (hasSpots) {
                opt.removeAttribute("disabled");
                opt.textContent = opt.textContent.replace(/\s*\(Locked\)$/, "");
            } else {
                opt.setAttribute("disabled", "true");
                if (!/\(Locked\)$/.test(opt.textContent)) {
                    opt.textContent = opt.textContent + " (Locked)";
                }
            }
        }
    }
    hide() {
        super.hide.call(this);
    }
    onNameInputKeyUp(event) {
        event.preventDefault();
        if (event.keyCode == 13 && !this.submitElem.hasAttribute("disabled")) {
            this.submitElem.click();
        }
    }
    onServerChange(event) {
        this.updatePreview();
    }
    updatePreview() {
        const serverId = this.serverElem.value;
        if (!window.serverspots || !window.serverspots[serverId] || !window.serverspots[serverId].spotEncoded) {
            if (this.overlay) this.overlay.style.display = "flex";
            if (this.statsElem) this.statsElem.innerText = "Unusable";
            if (this.ctx && this.canvas) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
            this.submitElem.setAttribute("disabled", "true");
            this.submitElem.style.opacity = "0.5";
            return;
        }

        if (this.overlay) this.overlay.style.display = "none";
        this.submitElem.removeAttribute("disabled");
        this.submitElem.style.opacity = "1";

        const info = window.serverspots[serverId].spotinfo || "825 entities";
        if (this.statsElem) this.statsElem.innerText = info;

        const spots = window.decodeSpotJSON(window.serverspots[serverId].spotEncoded);
        if (this.lastServerId !== serverId) {
            this.lastServerId = serverId;
            this.preRenderMap(spots);
        }

        this.drawSpots(serverId, spots);
    }
    preRenderCurrentServer() {
        const serverId = this.serverElem ? this.serverElem.value : null;
        if (serverId && window.serverspots && window.serverspots[serverId] && window.serverspots[serverId].spotEncoded) {
            const spots = window.decodeSpotJSON(window.serverspots[serverId].spotEncoded);
            this.preRenderMap(spots);
        }
    }
    preRenderMap(spots) {
        if (!this.offscreenCtx || !this.offscreenCanvas) return;
        const octx = this.offscreenCtx;
        const width = this.offscreenCanvas.width;
        const height = this.offscreenCanvas.height;
        octx.clearRect(0, 0, width, height);

        // Draw grid lines
        octx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        octx.lineWidth = 1;
        const gridSize = 26;
        for (let x = 0; x <= width; x += gridSize) {
            octx.beginPath();
            octx.moveTo(x, 0);
            octx.lineTo(x, height);
            octx.stroke();
        }
        for (let y = 0; y <= height; y += gridSize) {
            octx.beginPath();
            octx.moveTo(0, y);
            octx.lineTo(width, y);
            octx.stroke();
        }

        const scale = width / 24000;
        const treeSize = 192 * scale;
        const stoneSize = 144 * scale;
        const campSize = 144 * scale;

        // Render resource entities
        for (let id in spots) {
            const spot = spots[id];
            const px = spot.position.x * scale;
            const py = spot.position.y * scale;

            if (spot.model === "Tree") {
                if (this.treeImg && this.treeImg.complete) {
                    octx.drawImage(this.treeImg, px - treeSize / 2, py - treeSize / 2, treeSize, treeSize);
                } else {
                    octx.fillStyle = "#4e6437";
                    octx.beginPath();
                    octx.arc(px, py, treeSize / 2, 0, 2 * Math.PI);
                    octx.fill();
                }
            } else if (spot.model === "Stone") {
                if (this.stoneImg && this.stoneImg.complete) {
                    octx.drawImage(this.stoneImg, px - stoneSize / 2, py - stoneSize / 2, stoneSize, stoneSize);
                } else {
                    octx.fillStyle = "#b3b3b3";
                    octx.beginPath();
                    octx.arc(px, py, stoneSize / 2, 0, 2 * Math.PI);
                    octx.fill();
                }
            } else if (spot.model === "NeutralCamp") {
                if (this.campImg && this.campImg.complete) {
                    octx.drawImage(this.campImg, px - campSize / 2, py - campSize / 2, campSize, campSize);
                } else {
                    octx.fillStyle = "#ba363f";
                    octx.beginPath();
                    octx.arc(px, py, campSize / 2, 0, 2 * Math.PI);
                    octx.fill();
                }
            }
        }
    }
    drawSpots(serverId, spots) {
        if (!this.ctx || !this.canvas) return;
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        ctx.clearRect(0, 0, width, height);

        // Draw static pre-rendered map in one quick O(1) step
        if (this.offscreenCanvas) {
            ctx.drawImage(this.offscreenCanvas, 0, 0);
        }

        const scale = width / 24000;

        // Draw Player Spawn Indicator
        const spawnX = window.customSpawnPoint ? window.customSpawnPoint.x : 12000;
        const spawnY = window.customSpawnPoint ? window.customSpawnPoint.y : 12000;
        const sx = spawnX * scale;
        const sy = spawnY * scale;

        ctx.fillStyle = "#3498db";
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Render zoomed preview on floating magnifier canvas
        if (this.hovering && this.hoverX !== undefined && this.hoverY !== undefined && this.magnifierCanvas) {
            const mctx = this.magnifierCanvas.getContext("2d");
            const cx = this.hoverX;
            const cy = this.hoverY;

            mctx.fillStyle = "#16161a";
            mctx.fillRect(0, 0, 220, 220);

            // Compute zoom factor so visible diameter is exactly 1920 game units
            const mapVisibleSizeGameUnits = 1920;
            const mapVisibleSizeMainCanvasPixels = mapVisibleSizeGameUnits * scale;
            const zoomFactor = 220 / mapVisibleSizeMainCanvasPixels;

            mctx.save();
            // Center the zoom transform at the center of the magnifier context
            mctx.translate(110, 110);
            mctx.scale(zoomFactor, zoomFactor);
            mctx.translate(-cx, -cy);

            // Zoomed Grid Lines
            mctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
            mctx.lineWidth = 1 / zoomFactor;
            const gridSize = 26;
            for (let x = 0; x <= width; x += gridSize) {
                mctx.beginPath();
                mctx.moveTo(x, 0);
                mctx.lineTo(x, height);
                mctx.stroke();
            }
            for (let y = 0; y <= height; y += gridSize) {
                mctx.beginPath();
                mctx.moveTo(0, y);
                mctx.lineTo(width, y);
                mctx.stroke();
            }

            // Zoomed Spots with O(1) viewport culling logic
            const gameX = Math.round((cx / width) * 24000);
            const gameY = Math.round((cy / height) * 24000);
            const margin = 1100; // 960 game units radius + padding margin

            const treeSize = 192 * scale;
            const stoneSize = 144 * scale;
            const campSize = 144 * scale;

            for (let id in spots) {
                const spot = spots[id];

                // Viewport Culling Check: Skip drawing if resource is outside the zoomed viewport box
                if (Math.abs(spot.position.x - gameX) > margin || Math.abs(spot.position.y - gameY) > margin) {
                    continue;
                }

                const px = spot.position.x * scale;
                const py = spot.position.y * scale;

                if (spot.model === "Tree") {
                    if (this.treeImg && this.treeImg.complete) {
                        mctx.drawImage(this.treeImg, px - treeSize / 2, py - treeSize / 2, treeSize, treeSize);
                    } else {
                        mctx.fillStyle = "#6ca049";
                        mctx.beginPath();
                        mctx.arc(px, py, treeSize / 2, 0, 2 * Math.PI);
                        mctx.fill();
                    }
                } else if (spot.model === "Stone") {
                    if (this.stoneImg && this.stoneImg.complete) {
                        mctx.drawImage(this.stoneImg, px - stoneSize / 2, py - stoneSize / 2, stoneSize, stoneSize);
                    } else {
                        mctx.fillStyle = "#d3d3d3";
                        mctx.beginPath();
                        mctx.arc(px, py, stoneSize / 2, 0, 2 * Math.PI);
                        mctx.fill();
                    }
                } else if (spot.model === "NeutralCamp") {
                    if (this.campImg && this.campImg.complete) {
                        mctx.drawImage(this.campImg, px - campSize / 2, py - campSize / 2, campSize, campSize);
                    } else {
                        mctx.fillStyle = "#ff4d5a";
                        mctx.beginPath();
                        mctx.arc(px, py, campSize / 2, 0, 2 * Math.PI);
                        mctx.fill();
                    }
                }
            }

            // Zoomed Player Spawn Indicator
            mctx.fillStyle = "#3498db";
            mctx.beginPath();
            mctx.arc(sx, sy, 1, 0, 2 * Math.PI);
            mctx.fill();
            mctx.strokeStyle = "#ffffff";
            mctx.lineWidth = 0.5;
            mctx.stroke();

            mctx.restore();

            // Centered Crosshair
            mctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
            mctx.lineWidth = 1.2;
            mctx.beginPath();
            mctx.moveTo(110 - 6, 110);
            mctx.lineTo(110 + 6, 110);
            mctx.moveTo(110, 110 - 6);
            mctx.lineTo(110, 110 + 6);
            mctx.stroke();
        }
    }
    onCanvasClick(event) {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const cx = event.clientX - rect.left;
        const cy = event.clientY - rect.top;

        const gameX = Math.round((cx / this.canvas.width) * 24000);
        const gameY = Math.round((cy / this.canvas.height) * 24000);

        // Clamp coordinates
        const clampedX = Math.max(0, Math.min(24000, gameX));
        const clampedY = Math.max(0, Math.min(24000, gameY));

        window.customSpawnPoint = { x: clampedX, y: clampedY };
        this.updatePreview();
    }
    onCanvasMouseMove(event) {
        if (!this.canvas || !this.coordsElem) return;
        const rect = this.canvas.getBoundingClientRect();
        const cx = event.clientX - rect.left;
        const cy = event.clientY - rect.top;

        const gameX = Math.round((cx / this.canvas.width) * 24000);
        const gameY = Math.round((cy / this.canvas.height) * 24000);

        this.coordsElem.innerText = "X: " + gameX + " | Y: " + gameY;
        this.coordsElem.style.color = "#eee";

        this.hovering = true;
        this.hoverX = cx;
        this.hoverY = cy;

        // Position the floating magnifier popup centered on the cursor
        if (this.magnifierPopup) {
            const parentRect = this.canvas.parentNode.parentNode.getBoundingClientRect(); // .hud-intro-preview
            const xInParent = event.clientX - parentRect.left;
            const yInParent = event.clientY - parentRect.top;

            this.magnifierPopup.style.display = "block";
            this.magnifierPopup.style.left = (xInParent - 110) + "px";
            this.magnifierPopup.style.top = (yInParent - 110) + "px";
        }

        this.updatePreview();
    }
    onCanvasMouseLeave(event) {
        this.hovering = false;
        if (this.magnifierPopup) {
            this.magnifierPopup.style.display = "none";
        }
        if (this.coordsElem) {
            this.coordsElem.innerText = "Hover map to open a zoomed in view";
            this.coordsElem.style.color = "rgba(255, 255, 255, 0.5)";
        }
        this.updatePreview();
    }
    onSubmitClick(event) {
        var This = this;
        var serverId = this.serverElem.value;
        if (!window.serverspots || !window.serverspots[serverId] || !window.serverspots[serverId].spotEncoded) {
            this.errorElem.style.display = "block";
            this.errorElem.innerText = "This server is currently locked/unconfigured.";
            return;
        }
        var server = this.ui.getOption("servers")[serverId];
        if ("localStorage" in window) {
            window.localStorage.setItem("name", this.nameInputElem.value.trim());
        }
        if (!this.connecting) {
            this.connecting = true;
            this.connectionTimer = setTimeout(function () {
                This.connecting = false;
                _Game.currentGame.network.disconnect();
                This.submitElem.innerHTML = "Play";
                This.serverElem.classList.add("has-error");
                This.errorElem.style.display = "block";
                This.errorElem.innerText = "We failed to join the game - this is a known issue with anti-virus software. Please try disabling any web filtering features.";
            }, 15000);
            this.submitElem.innerHTML = "<span class=\"hud-loading\"></span>";
            this.errorElem.style.display = "none";
            this.ui.setOption("nickname", this.nameInputElem.value.trim());
            this.ui.setOption("serverId", this.serverElem.value);
            _Game.currentGame.network.connect(server);
        }
    }
    onConnectionStart(data) {
        _Game.currentGame.network.sendEnterWorld({
            displayName: this.ui.getOption("nickname"),
            extra: data.extra
        });
    }
    onConnectionError() {
        this.connecting = false;
        if (this.connectionTimer) {
            clearInterval(this.connectionTimer);
            delete this.connectionTimer;
        }
        this.submitElem.innerHTML = "Play";
        this.serverElem.classList.add("has-error");
        this.errorElem.style.display = "block";
        this.errorElem.innerText = "We were unable to connect to the gameserver. Please try another server.";
    }
    onEnterWorld(data) {
        this.connecting = false;
        if (this.connectionTimer) {
            clearInterval(this.connectionTimer);
            delete this.connectionTimer;
        }
        if (data.allowed) {
            this.hide();
            _Game.currentGame.network.sendEnterWorld2();
        } else {
            this.submitElem.innerHTML = "Play";
            this.serverElem.classList.add("has-error");
            this.errorElem.style.display = "block";
            this.errorElem.innerText = "This server is currently full. Please try again later or select another server.";
        }
        return;
    }
    checkForPartyInvitation() {
        var This = this;
        if (document.location.hash && !(document.location.hash.length < 2)) {
            var parts = document.location.hash.substring(2).split("/");
            var serverId = parts[0];
            var shareKey = parts[1];
            if (serverId && shareKey) {
                this.serverElem.setAttribute("disabled", "true");
                this.serverElem.querySelector("option[value=\"" + serverId + "\"]").setAttribute("selected", "true");
                this.partyShareKey = shareKey;
                _Game.currentGame.network.addEnterWorldHandler(function (data) {
                    if (data.allowed && !This.reconnectKey) {
                        _Game.currentGame.network.sendRpc({
                            name: "JoinPartyByShareKey",
                            partyShareKey: This.partyShareKey
                        });
                    }
                });
            }
        }
    }
    onWheel(event) {
        event.stopPropagation();
    }
}
export default UiIntro;
