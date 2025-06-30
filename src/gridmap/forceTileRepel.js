// forceTileRepel.js

export class ForceTileRepel {
  /**
   * @param {Array} nodes          : tableau de tous les nœuds
   * @param {Function} geoToGrid   : fonction ({x, y}) → { i, j }
   * @param {number} strength      : coefficient de répulsion (ex. 0.5 à 1.5)
   */
  constructor(nodes, geoToGrid, strength = 0.8) {
    this.nodes = nodes;
    this.geoToGrid = geoToGrid;
    this.strength = strength;
  }

  apply(alpha) {
    const byTile = new Map();
    const epsilon = 1e-4;

    this.nodes.forEach(node => {
      const keyPt = this.geoToGrid({
        x: node.x + (Math.random() - 0.5) * epsilon,
        y: node.y + (Math.random() - 0.5) * epsilon
      });
      const key = `${keyPt.i},${keyPt.j}`;
      if (!byTile.has(key)) byTile.set(key, []);
      byTile.get(key).push(node);
    });

    byTile.forEach((group, key) => {
      const n = group.length;
      if (n < 2) return;

      for (let a = 0; a < n; a++) {
        for (let b = a + 1; b < n; b++) {
          const nodeA = group[a];
          const nodeB = group[b];
          let dx = nodeA.x - nodeB.x;
          let dy = nodeA.y - nodeB.y;
          let dist = Math.hypot(dx, dy);

          if (dist < 1e-6) {
            dx = (Math.random() - 0.5) * 1e-2;
            dy = (Math.random() - 0.5) * 1e-2;
            dist = Math.hypot(dx, dy);
          }

          const force = this.strength * alpha * 10 / (dist * dist);

          const ux = dx / dist;
          const uy = dy / dist;

          nodeA.vx += ux * force;
          nodeA.vy += uy * force;
          nodeB.vx -= ux * force;
          nodeB.vy -= uy * force;
        }
      }
    });
  }
}
