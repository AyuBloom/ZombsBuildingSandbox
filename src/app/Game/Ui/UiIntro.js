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
        }

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
        
        this.drawSpots(serverId);
    }
    drawSpots(serverId) {
        if (!this.ctx || !this.canvas) return;
        const ctx = this.ctx;
        const width = this.canvas.width;
        const height = this.canvas.height;
        ctx.clearRect(0, 0, width, height);
        
        ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        ctx.lineWidth = 1;
        const gridSize = 26;
        for (let x = 0; x <= width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
        }
        for (let y = 0; y <= height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }
        
        const spots = window.decodeSpotJSON(window.serverspots[serverId].spotEncoded);
        const scale = width / 24000;
        
        for (let id in spots) {
            const spot = spots[id];
            const px = spot.position.x * scale;
            const py = spot.position.y * scale;
            
            if (spot.model === "Tree") {
                ctx.fillStyle = "#2ecc71";
                ctx.beginPath();
                ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
                ctx.fill();
            } else if (spot.model === "Stone") {
                ctx.fillStyle = "#95a5a6";
                ctx.beginPath();
                ctx.arc(px, py, 2.5, 0, 2 * Math.PI);
                ctx.fill();
            } else if (spot.model === "NeutralCamp") {
                ctx.fillStyle = "#f1c40f";
                ctx.beginPath();
                ctx.arc(px, py, 4, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
        
        ctx.fillStyle = "#3498db";
        ctx.beginPath();
        ctx.arc(width / 2, height / 2, 5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.stroke();
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
    }
    onCanvasMouseLeave(event) {
        if (this.coordsElem) {
            this.coordsElem.innerText = "Hover map to view coordinates";
            this.coordsElem.style.color = "rgba(255, 255, 255, 0.5)";
        }
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