import _Game from "../../Engine/Game/Game";
import _UiComponent from "./UiComponent";

class UiMobileControls extends _UiComponent {
  constructor(ui) {
    super(
      ui,
      '<div id="hud-mobile-controls" class="hud-mobile-controls">\n' +
      '  <div class="hud-mobile-joystick-container">\n' +
      '    <div class="joystick-outer">\n' +
      '      <div class="joystick-inner"></div>\n' +
      '    </div>\n' +
      '  </div>\n' +
      '  <div class="hud-mobile-sidebar-container collapsed" id="hud-mobile-sidebar">\n' +
      '    <button type="button" class="hud-mobile-sidebar-toggle" id="hud-mobile-sidebar-toggle">⟨</button>\n' +
      '    <div class="hud-mobile-sidebar-drawer">\n' +
      '      <button type="button" class="hud-mobile-btn hud-btn-upgrade-all" id="hud-mobile-upgrade-all">\n' +
      '        <span class="btn-label">Upgrade All</span>\n' +
      '        <span class="btn-sublabel">OFF</span>\n' +
      '      </button>\n' +
      '      <button type="button" class="hud-mobile-btn hud-btn-sprint" id="hud-mobile-sprint">\n' +
      '        <span class="btn-label">Sprint</span>\n' +
      '        <span class="btn-sublabel">OFF</span>\n' +
      '      </button>\n' +
      '      <button type="button" class="hud-mobile-btn hud-btn-rotate" id="hud-mobile-rotate">Rotate</button>\n' +
      '      <button type="button" class="hud-mobile-btn hud-btn-cancel" id="hud-mobile-cancel">Unequip</button>\n' +
      '    </div>\n' +
      '  </div>\n' +
      '</div>'
    );

    this.joystickContainer = this.componentElem.querySelector(".hud-mobile-joystick-container");
    this.joystickOuter = this.componentElem.querySelector(".joystick-outer");
    this.joystickInner = this.componentElem.querySelector(".joystick-inner");
    
    this.sidebarContainer = this.componentElem.querySelector("#hud-mobile-sidebar");
    this.btnSidebarToggle = this.componentElem.querySelector("#hud-mobile-sidebar-toggle");
    
    this.btnUpgradeAll = this.componentElem.querySelector("#hud-mobile-upgrade-all");
    this.upgradeAllSublabel = this.btnUpgradeAll.querySelector(".btn-sublabel");
    this.btnSprint = this.componentElem.querySelector("#hud-mobile-sprint");
    this.sprintSublabel = this.btnSprint.querySelector(".btn-sublabel");
    this.btnRotate = this.componentElem.querySelector("#hud-mobile-rotate");
    this.btnCancel = this.componentElem.querySelector("#hud-mobile-cancel");

    this.joystickTouchId = null;
    this.upgradeAllToggled = false;
    this.sprintToggled = false;
    this.sidebarCollapsed = true;

    this.bindJoystickEvents();
    this.bindActionEvents();

    // Poll placement and touch status to update joystick opacity classes dynamically
    this.visibilityInterval = setInterval(this.updateJoystickVisibility.bind(this), 100);

    this.hide();
  }

  updateJoystickVisibility() {
    var placementOverlay = this.ui.getComponent("PlacementOverlay");
    var isPlacing = placementOverlay && placementOverlay.isActive();
    
    if (this.joystickTouchId !== null) {
      this.joystickContainer.className = "hud-mobile-joystick-container active";
    } else if (isPlacing) {
      this.joystickContainer.className = "hud-mobile-joystick-container semi-visible";
    } else {
      this.joystickContainer.className = "hud-mobile-joystick-container";
    }
  }

  bindJoystickEvents() {
    // Touch on fixed joystick
    this.joystickOuter.addEventListener("touchstart", this.onJoystickStart.bind(this), { passive: false });
    
    // Dynamic Touch on left screen area
    document.addEventListener("touchstart", this.onWorldTouchStart.bind(this), { passive: false });
    
    document.addEventListener("touchmove", this.onJoystickMove.bind(this), { passive: false });
    document.addEventListener("touchend", this.onJoystickEnd.bind(this), { passive: false });
    document.addEventListener("touchcancel", this.onJoystickEnd.bind(this), { passive: false });
  }

  onWorldTouchStart(event) {
    if (this.joystickTouchId !== null) return;
    
    var touch = event.changedTouches[0];
    
    // Joystick dynamic zone covers left half of the screen
    if (touch.clientX < window.innerWidth / 2) {
      var target = touch.target;
      var isInteractive = target.closest('a, button, input, select, textarea, .spotscout-modal, .hud-toolbar-building, .btn, .spotscout-dropzone, .hud-mobile-btn, .joystick-outer, .joystick-inner, .hud-mobile-sidebar-toggle');
      
      if (!isInteractive) {
        var placementOverlay = this.ui.getComponent("PlacementOverlay");
        var isPlacing = placementOverlay && placementOverlay.isActive();
        
        // Spawn Dynamic Joystick only if NOT placing buildings (weapon mode)
        if (!isPlacing) {
          event.preventDefault();
          event.stopPropagation();
          
          this.joystickTouchId = touch.identifier;
          
          // Re-center joystick container directly on touched screen coordinates
          this.joystickContainer.style.left = (touch.clientX - 80) + "px"; // 80 is half of 160px width
          this.joystickContainer.style.top = (touch.clientY - 80) + "px";
          this.joystickContainer.style.bottom = "auto";
          
          // Instantly show the joystick as active
          this.joystickContainer.className = "hud-mobile-joystick-container active";
          
          this.updateJoystick(touch.clientX, touch.clientY);
        }
      }
    }
  }

  onJoystickStart(event) {
    if (this.joystickTouchId !== null) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    var touch = event.changedTouches[0];
    this.joystickTouchId = touch.identifier;
    
    // Instantly show the joystick as active
    this.joystickContainer.className = "hud-mobile-joystick-container active";
    
    this.updateJoystick(touch.clientX, touch.clientY);
  }

  onJoystickMove(event) {
    if (this.joystickTouchId === null) return;
    
    for (var i = 0; i < event.touches.length; i++) {
      var touch = event.touches[i];
      if (touch.identifier === this.joystickTouchId) {
        event.preventDefault();
        event.stopPropagation();
        this.updateJoystick(touch.clientX, touch.clientY);
        break;
      }
    }
  }

  onJoystickEnd(event) {
    if (this.joystickTouchId === null) return;
    
    var ended = false;
    for (var i = 0; i < event.changedTouches.length; i++) {
      var touch = event.changedTouches[i];
      if (touch.identifier === this.joystickTouchId) {
        ended = true;
        break;
      }
    }

    if (ended) {
      event.preventDefault();
      event.stopPropagation();
      this.joystickTouchId = null;
      
      // Reset handle translation
      this.joystickInner.style.transform = "translate3d(0, 0, 0)";
      
      // Return joystick container to default bottom-left position
      this.joystickContainer.style.left = "40px";
      this.joystickContainer.style.bottom = "40px";
      this.joystickContainer.style.top = "auto";
      
      // Instantly apply correct visibility state to avoid flicker
      this.updateJoystickVisibility();
      
      // Reset inputs
      _Game.currentGame.network.sendInput({
        up: 0,
        down: 0,
        left: 0,
        right: 0
      });
    }
  }

  updateJoystick(clientX, clientY) {
    var rect = this.joystickOuter.getBoundingClientRect();
    var centerX = rect.left + rect.width / 2;
    var centerY = rect.top + rect.height / 2;
    
    var dx = clientX - centerX;
    var dy = clientY - centerY;
    var distance = Math.sqrt(dx * dx + dy * dy);
    var maxDistance = 45; // pixel limit
    
    var clampedX = dx;
    var clampedY = dy;
    var angle = Math.atan2(dy, dx);
    
    if (distance > maxDistance) {
      clampedX = Math.cos(angle) * maxDistance;
      clampedY = Math.sin(angle) * maxDistance;
    }
    
    this.joystickInner.style.transform = "translate3d(" + clampedX + "px, " + clampedY + "px, 0)";
    
    // Convert angle to normalized 0-360 degrees
    var angleDeg = (angle * 180) / Math.PI;
    if (angleDeg < 0) {
      angleDeg += 360;
    }
    
    var isUp = false;
    var isDown = false;
    var isLeft = false;
    var isRight = false;
    
    if (distance > 12) {
      if (angleDeg >= 337.5 || angleDeg < 22.5) {
        isRight = true;
      } else if (angleDeg >= 22.5 && angleDeg < 67.5) {
        isRight = true;
        isDown = true;
      } else if (angleDeg >= 67.5 && angleDeg < 112.5) {
        isDown = true;
      } else if (angleDeg >= 112.5 && angleDeg < 157.5) {
        isLeft = true;
        isDown = true;
      } else if (angleDeg >= 157.5 && angleDeg < 202.5) {
        isLeft = true;
      } else if (angleDeg >= 202.5 && angleDeg < 247.5) {
        isLeft = true;
        isUp = true;
      } else if (angleDeg >= 247.5 && angleDeg < 292.5) {
        isUp = true;
      } else if (angleDeg >= 292.5 && angleDeg < 337.5) {
        isRight = true;
        isUp = true;
      }

      // Update aiming yaw to match the movement vector
      var yaw = Math.round((360 + (angle * 180) / Math.PI + 90) % 360);
      var network = _Game.currentGame.network;
      if (_Game.currentGame.inputPacketCreator) {
        _Game.currentGame.inputPacketCreator.lastAnyYaw = yaw;
      }
      if (_Game.currentGame.inputManager.mouseDown) {
        network.sendInput({ mouseMovedWhileDown: yaw });
      } else {
        network.sendInput({ mouseMoved: yaw });
      }
    }
    
    _Game.currentGame.network.sendInput({
      up: isUp ? 1 : 0,
      down: isDown ? 1 : 0,
      left: isLeft ? 1 : 0,
      right: isRight ? 1 : 0
    });
  }

  bindActionEvents() {
    this.btnSidebarToggle.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.sidebarCollapsed = !this.sidebarCollapsed;
      
      if (this.sidebarCollapsed) {
        this.sidebarContainer.classList.add("collapsed");
        this.btnSidebarToggle.innerText = "⟨";
      } else {
        this.sidebarContainer.classList.remove("collapsed");
        this.btnSidebarToggle.innerText = "⟩";
      }
    });

    this.btnRotate.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      var placementOverlay = this.ui.getComponent("PlacementOverlay");
      if (placementOverlay && placementOverlay.isActive()) {
        placementOverlay.cycleDirection();
      }
    });

    this.btnCancel.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      var buildingOverlay = this.ui.getComponent("BuildingOverlay");
      var placementOverlay = this.ui.getComponent("PlacementOverlay");
      if (buildingOverlay) {
        buildingOverlay.stopWatching();
      }
      if (placementOverlay) {
        placementOverlay.cancelPlacing();
      }
    });

    this.btnUpgradeAll.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.upgradeAllToggled = !this.upgradeAllToggled;
      
      var buildingOverlay = this.ui.getComponent("BuildingOverlay");
      if (buildingOverlay) {
        buildingOverlay.setShouldUpgradeAll(this.upgradeAllToggled);
      }
      
      if (this.upgradeAllToggled) {
        this.btnUpgradeAll.classList.add("active");
        this.upgradeAllSublabel.innerText = "ON";
      } else {
        this.btnUpgradeAll.classList.remove("active");
        this.upgradeAllSublabel.innerText = "OFF";
      }
    });

    this.btnSprint.addEventListener("touchstart", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.sprintToggled = !this.sprintToggled;
      
      var network = _Game.currentGame.network;
      if (this.sprintToggled) {
        network.sendInput({ shift: 1 });
        this.btnSprint.classList.add("active");
        this.sprintSublabel.innerText = "ON";
      } else {
        network.sendInput({ shift: 0 });
        this.btnSprint.classList.remove("active");
        this.sprintSublabel.innerText = "OFF";
      }
    });
  }
}

export default UiMobileControls;
