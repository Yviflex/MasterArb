export class ForceX {
  constructor (nodes, fn) {
    this.nodes = nodes
    this.fn = fn

    this.strength = () => 0.1

    this.strengths = new Array(nodes.length)
    this.xz = new Array(nodes.length)

    for (let i = 0; i < nodes.length; ++i) {
      this.xz[i] = +this.fn(nodes[i], i, nodes)
      this.strengths[i] = isNaN(this.xz[i]) ? 0 : +this.strength(nodes[i], i, nodes)
    }
  }

  apply (alpha) {
    const n = this.nodes.length
    for (let i = 0; i < n; ++i) {
      const node = this.nodes[i]
      node.vx += (this.xz[i] - node.x) * this.strengths[i] * alpha
    }
  }
}
