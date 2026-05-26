import { Container } from "pixi.js";
import _Game from "../Game/Game";
class Entity {
  constructor(node = null) {
    this.attachments = [];
    this.parent = null;
    this.isVisible = true;
    this.shouldCull = false;
    if (node) {
      this.setNode(node);
    } else {
      this.setNode(new Container());
    }
  }
  getNode() {
    return this.node;
  }
  setNode(node) {
    if (this.node) {
      this.node = null;
    }
    this.node = node;
  }
  getParent() {
    return this.parent;
  }
  setParent(parent) {
    this.parent = parent;
  }
  getAttachments() {
    return this.attachments;
  }
  addAttachment(attachment, zIndex = 0) {
    var node = attachment.getNode();
    node.zHack = zIndex;
    attachment.setParent(this);
    this.node.addChild(attachment.getNode());
    this.attachments.push(attachment);
    this.node.children.sort((a, b) => {
      if (a.zHack == b.zHack) {
        return 0;
      } else if (a.zHack < b.zHack) {
        return -1;
      } else {
        return 1;
      }
    });
  }
  removeAttachment(attachment) {
    if (attachment) {
      this.node.removeChild(attachment.getNode());
      attachment.setParent(null);
      var index = this.attachments.indexOf(attachment);
      if (index > -1) {
        this.attachments.splice(index, 1);
      }
    }
  }
  getRotation() {
    return (this.node.rotation * 180) / Math.PI;
  }
  setRotation(degrees) {
    this.node.rotation = (degrees * Math.PI) / 180;
  }
  getAlpha() {
    return this.node.alpha;
  }
  setAlpha(alpha) {
    this.node.alpha = alpha;
  }
  getScale() {
    return this.node.scale;
  }
  setScale(scale) {
    this.node.scale.x = scale;
    this.node.scale.y = scale;
  }
  getScaleX() {
    return this.node.scale.x;
  }
  setScaleX(scale) {
    this.node.scale.x = scale;
  }
  getScaleY() {
    return this.node.scale.y;
  }
  setScaleY(scale) {
    this.node.scale.y = scale;
  }
  getFilters() {
    return this.node.filters;
  }
  setFilters(filters) {
    this.node.filters = filters;
  }
  getPosition() {
    return this.node.position;
  }
  setPosition(x, y) {
    this.node.position.x = x;
    this.node.position.y = y;
  }
  getPositionX() {
    return this.getPosition().x;
  }
  setPositionX(x) {
    this.node.position.x = x;
  }
  getPositionY() {
    return this.getPosition().y;
  }
  setPositionY(y) {
    this.node.position.y = y;
  }
  getPivotPoint() {
    return this.node.pivot;
  }
  setPivotPoint(x, y) {
    this.node.pivot.x = x;
    this.node.pivot.y = y;
  }
  getVisible() {
    return this.isVisible;
  }
  setVisible(visible) {
    this.isVisible = visible;
    this.node.visible = visible;
  }
  getShouldCull() {
    return this.shouldCull;
  }
  setShouldCull(shouldCull) {
    this.shouldCull = shouldCull;
  }
  isInViewport() {
    var currentViewport = _Game.currentGame.renderer.getCurrentViewport();
    if (!currentViewport || !this.node) return true;
    var x = this.node.position.x;
    var y = this.node.position.y;
    var radius = 120; // safe padding radius
    return (
      x + radius >= currentViewport.x &&
      x - radius <= currentViewport.x + currentViewport.width &&
      y + radius >= currentViewport.y &&
      y - radius <= currentViewport.y + currentViewport.height
    );
  }
  update(dt, user) {
    if (this.shouldCull) {
      var inViewport = this.isInViewport();
      this.node.visible = this.isVisible && inViewport;
      if (!inViewport) {
        return;
      }
    }
    this.attachments.forEach((e) => {
      e.update(dt, user);
    });
  }
  destroy() {
    if (this.attachments) {
      this.attachments.forEach((attachment) => {
        if (attachment && typeof attachment.destroy === "function") {
          attachment.destroy();
        }
      });
      this.attachments = [];
    }
    if (this.node) {
      if (this.node.parent) {
        this.node.parent.removeChild(this.node);
      }
      if (typeof this.node.destroy === "function") {
        this.node.destroy({ children: true, texture: false, baseTexture: false });
      }
      this.node = null;
    }
    this.parent = null;
  }
}
export default Entity;
