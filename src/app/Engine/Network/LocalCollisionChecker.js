export default class LocalCollisionChecker {
  constructor() {
    this.rss = {};
    this.activeBuildingsByPos = {};
  }
  reset() {
    this.rss = {};
    this.activeBuildingsByPos = {};
  }
  fixOccurredBuildingsByType(x, y, type) {
    if (type === "Wall" || type === "Door" || type === "SlowTrap") {
      return (
        x % 48 === 24 &&
        y % 48 === 24 &&
        !this.activeBuildingsByPos[24 + x + ", " + y] &&
        !this.activeBuildingsByPos[x - 24 + ", " + y] &&
        !this.activeBuildingsByPos[x + ", " + (y + 24)] &&
        !this.activeBuildingsByPos[x + ", " + (y - 24)] &&
        !this.activeBuildingsByPos[x - 24 + ", " + (y - 24)] &&
        !this.activeBuildingsByPos[24 + x + ", " + (y + 24)] &&
        !this.activeBuildingsByPos[x - 24 + ", " + (y + 24)] &&
        !this.activeBuildingsByPos[24 + x + ", " + (y - 24)]
      );
    }
    return (
      x % 48 === 0 &&
      y % 48 === 0 &&
      !this.activeBuildingsByPos[24 + x + ", " + y] &&
      !this.activeBuildingsByPos[x - 24 + ", " + y] &&
      !this.activeBuildingsByPos[x + ", " + (y + 24)] &&
      !this.activeBuildingsByPos[x + ", " + (y - 24)] &&
      !this.activeBuildingsByPos[x - 24 + ", " + (y - 24)] &&
      !this.activeBuildingsByPos[24 + x + ", " + (y + 24)] &&
      !this.activeBuildingsByPos[x - 24 + ", " + (y + 24)] &&
      !this.activeBuildingsByPos[24 + x + ", " + (y - 24)] &&
      !this.activeBuildingsByPos[48 + x + ", " + y] &&
      !this.activeBuildingsByPos[x - 48 + ", " + y] &&
      !this.activeBuildingsByPos[x + ", " + (y + 48)] &&
      !this.activeBuildingsByPos[x + ", " + (y - 48)] &&
      !this.activeBuildingsByPos[x - 48 + ", " + (y - 48)] &&
      !this.activeBuildingsByPos[48 + x + ", " + (y + 48)] &&
      !this.activeBuildingsByPos[x - 48 + ", " + (y + 48)] &&
      !this.activeBuildingsByPos[48 + x + ", " + (y - 48)]
    );
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
    const source = this.rss;
    for (let i in source) {
      if (this.checkOccupiedBuildingForRss(source[i], x, y, type) === 1) {
        return false;
      }
    }
    return true;
  }
}
