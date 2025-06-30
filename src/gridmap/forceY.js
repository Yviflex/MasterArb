export class ForceY {
  constructor (nodes, fn) {
    this.nodes = nodes
    this.fn = fn

    this.strength = () => 0.1

    this.strengths = new Array(nodes.length)
    this.yz = new Array(nodes.length)

    for (let i = 0; i < nodes.length; ++i) {
      this.yz[i] = +this.fn(nodes[i], i, nodes)
      this.strengths[i] = isNaN(this.yz[i]) ? 0 : +this.strength(nodes[i], i, nodes)
    }
  }

  apply (alpha) {
    const n = this.nodes.length
    for (let i = 0; i < n; ++i) {
      const node = this.nodes[i]
      node.vy += (this.yz[i] - node.y) * this.strengths[i] * alpha
    }
  }
}
