import _Game from "../Game/Game";
import { EventEmitter } from "events";
class InputManager extends EventEmitter {
  constructor() {
    super();
    this.mousePosition = {
      x: 0,
      y: 0,
    };
    this.mouseDown = false;
    this.mouseRightDown = false;
    this.keysDown = {};
    this.enabled = false;
    this.worldTouchId = null;
    document.onkeydown = this.onKeyPress.bind(this);
    document.onkeyup = this.onKeyRelease.bind(this);
    document.onmousedown = this.onMouseDown.bind(this);
    document.onmouseup = this.onMouseUp.bind(this);
    document.onmousemove = this.onMouseMoved.bind(this);
    
    document.addEventListener("touchstart", this.onTouchStart.bind(this), { passive: false });
    document.addEventListener("touchmove", this.onTouchMove.bind(this), { passive: false });
    document.addEventListener("touchend", this.onTouchEnd.bind(this), { passive: false });
    document.addEventListener("touchcancel", this.onTouchEnd.bind(this), { passive: false });

    _Game.currentGame.network.addEnterWorldHandler((data) => {
      if (data.allowed) {
        this.setEnabled(true);
      }
    });
  }
  getEnabled() {
    return this.enabled;
  }
  setEnabled(enabled) {
    if (!enabled && this.mouseDown) {
      this.mouseDown = false;
      this.emit("mouseUp", {
        clientX: this.mousePosition,
        clientY: this.mousePosition,
      });
    }
    this.enabled = enabled;
    _Game.currentGame.inputPacketCreator.setEnabled(this.enabled);
  }
  onKeyPress(event) {
    this.keysDown[event.keyCode] = true;
    this.emit("keyPress", event);
  }
  onKeyRelease(event) {
    this.keysDown[event.keyCode] = false;
    this.emit("keyRelease", event);
  }
  onMouseDown(event) {
    if (event.which == 3 || event.button == 2) {
      if (this.mouseRightDown) {
        this.emit("mouseRightUp", event);
      }
      this.mouseRightDown = true;
      this.emit("mouseRightDown", event);
      return;
    }
    if (this.mouseDown) {
      this.emit("mouseUp", event);
    }
    this.mousePosition = {
      x: event.clientX,
      y: event.clientY,
    };
    this.mouseDown = true;
    this.emit("mouseDown", event);
    return;
  }
  onMouseUp(event) {
    if (event.which == 3 || event.button == 2) {
      this.mouseRightDown = false;
      this.emit("mouseRightUp", event);
      return;
    }
    this.mousePosition = {
      x: event.clientX,
      y: event.clientY,
    };
    this.mouseDown = false;
    this.emit("mouseUp", event);
    return;
  }
  onMouseMoved(event) {
    this.mousePosition = {
      x: event.clientX,
      y: event.clientY,
    };
    if (this.mouseDown) {
      this.emit("mouseMovedWhileDown", event);
    } else {
      this.emit("mouseMoved", event);
    }
  }
  onTouchStart(event) {
    if (!this.enabled) return;
    for (var i = 0; i < event.changedTouches.length; i++) {
      var touch = event.changedTouches[i];
      var target = touch.target;
      var isInteractive = target.closest('a, button, input, select, textarea, .spotscout-modal, .joystick-outer, .joystick-inner, .hud-toolbar-building, .btn, .spotscout-dropzone, .hud-mobile-btn, .hud-menu-icon, .hud-menu');
      if (!isInteractive && this.worldTouchId === null) {
        this.worldTouchId = touch.identifier;
        event.preventDefault();
        var clientX = touch.clientX;
        var clientY = touch.clientY;
        this.mousePosition = { x: clientX, y: clientY };
        this.mouseDown = true;
        this.emit("mouseDown", {
          clientX: clientX,
          clientY: clientY,
          button: 0,
          which: 1,
          target: target,
          returnValue: true
        });
        break;
      }
    }
  }
  onTouchMove(event) {
    if (!this.enabled || this.worldTouchId === null) return;
    for (var i = 0; i < event.touches.length; i++) {
      var touch = event.touches[i];
      if (touch.identifier === this.worldTouchId) {
        event.preventDefault();
        var clientX = touch.clientX;
        var clientY = touch.clientY;
        this.mousePosition = { x: clientX, y: clientY };
        this.emit("mouseMovedWhileDown", {
          clientX: clientX,
          clientY: clientY,
          button: 0,
          which: 1,
          target: touch.target,
          returnValue: true
        });
        break;
      }
    }
  }
  onTouchEnd(event) {
    if (this.worldTouchId === null) return;
    for (var i = 0; i < event.changedTouches.length; i++) {
      var touch = event.changedTouches[i];
      if (touch.identifier === this.worldTouchId) {
        this.worldTouchId = null;
        this.mouseDown = false;
        this.emit("mouseUp", {
          clientX: this.mousePosition.x,
          clientY: this.mousePosition.y,
          button: 0,
          which: 1,
          target: touch.target,
          returnValue: true
        });
        break;
      }
    }
  }
}
export default InputManager;
