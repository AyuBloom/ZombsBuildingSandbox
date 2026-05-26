export default class LocalCollisionChecker {
  constructor() {
    this.rss = {};
    this.activeBuildingsByPos = {};
  }

  reset() {
    this.rss = {};
    this.activeBuildingsByPos = {};
  }

  /**
   * Validates if a building placement grid is aligned and not obstructed by neighboring buildings.
   */
  fixOccurredBuildingsByType(x, y, type) {
    const isSmall = type === "Wall" || type === "Door" || type === "SlowTrap";
    const expectedMod = isSmall ? 24 : 0;
    
    // Ensure the placement aligns with the grid system rules
    if (x % 48 !== expectedMod || y % 48 !== expectedMod) {
      return false;
    }

    // Determine neighbor check range: small structures check 1 grid step (24px) away, 
    // large structures check both 1 grid step (24px) and 2 grid steps (48px) away.
    const steps = isSmall ? [24] : [24, 48];

    for (const step of steps) {
      const neighbors = [
        // Cardinal directions
        `${x + step}, ${y}`,
        `${x - step}, ${y}`,
        `${x}, ${y + step}`,
        `${x}, ${y - step}`,
        // Diagonal directions
        `${x + step}, ${y + step}`,
        `${x - step}, ${y + step}`,
        `${x + step}, ${y - step}`,
        `${x - step}, ${y - step}`
      ];

      for (const pos of neighbors) {
        if (this.activeBuildingsByPos[pos]) {
          return false; // Obstructed by another building
        }
      }
    }

    return true; // Position is clear
  }

  /**
   * Checks if a placed building overlaps/collides with a resource node using circle-to-rectangle bounds math.
   */
  checkOccupiedBuildingForRss(rss, x, y, type) {
    // 1. Resource node radius (Tree: 70px, Stone: 50px, Neutral Camp: 60px)
    let radius = 60;
    if (rss.model === "Tree") {
      radius = 70;
    } else if (rss.model === "Stone") {
      radius = 50;
    }

    // 2. Building bounding half-sizes (Wall, Door, Trap are 48x48; others are 96x96)
    const isSmallBuilding = type === "Wall" || type === "Door" || type === "SlowTrap";
    const halfSize = isSmallBuilding ? 24 : 48;

    // 3. Find closest point on building rectangle to resource center
    const closestX = Math.max(x - halfSize, Math.min(rss.position.x, x + halfSize));
    const closestY = Math.max(y - halfSize, Math.min(rss.position.y, y + halfSize));

    // 4. Calculate distance from closest point to resource center
    const distX = rss.position.x - closestX;
    const distY = rss.position.y - closestY;
    const distanceSquared = distX * distX + distY * distY;

    if (distanceSquared < radius * radius) {
      return 1; // Collision detected
    }
  }

  /**
   * Checks building placement validation against all known resources on the map.
   */
  fixOccurredBuildingsForRssByType(x, y, type) {
    for (const id in this.rss) {
      const resource = this.rss[id];
      if (this.checkOccupiedBuildingForRss(resource, x, y, type) === 1) {
        return false; // Overlaps with a resource node
      }
    }
    return true; // No overlap with resources
  }
}
