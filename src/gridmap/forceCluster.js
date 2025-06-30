export class ForceCluster {
  /**
   * @param {Array} nodes        : tableau de tous les nœuds
   * @param {Function} idAccessor: fonction (node) => identifiant de groupe (ici featureIdx)
   * @param {number} strength    : coefficient d’attraction (ex. 0.08)
   */
  constructor(nodes, idAccessor, strength = 0.08) {
    this.nodes = nodes;
    this.idAccessor = idAccessor;
    this.strength = strength;
  }

  apply(alpha) {
    // 1) Regrouper tous les nœuds par identifiant (featureIdx)
    const clusters = new Map();
    this.nodes.forEach(node => {
      const id = this.idAccessor(node);
      if (!clusters.has(id)) {
        clusters.set(id, { sumX: 0, sumY: 0, count: 0, members: [] });
      }
      const group = clusters.get(id);
      group.sumX += node.x;
      group.sumY += node.y;
      group.count += 1;
      group.members.push(node);
    });

    // 2) Pour chaque groupe, calculer le centroïde (moyenne) et attirer chaque nœud vers ce centroïde
    clusters.forEach(group => {
      const cx = group.sumX / group.count;
      const cy = group.sumY / group.count;
      group.members.forEach(node => {
        const dx = cx - node.x;
        const dy = cy - node.y;
        // On incrémente la vélocité en direction du centroïde, proportionnel à alpha et à strength
        node.vx += dx * this.strength * alpha;
        node.vy += dy * this.strength * alpha;
      });
    });
  }
}
