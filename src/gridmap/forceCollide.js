import * as d3 from "d3";

export class ForceCollide {
  constructor(nodes, fn) {
    this.nodes = nodes;
    this.fn = typeof fn === "function" ? fn : () => fn;

    this.strength = 1;
    this.iterations = 1;

    this.radii = new Array(nodes.length);
    for (let i = 0; i < nodes.length; ++i) {
      const node = nodes[i];
      this.radii[node.index] = +this.fn(node, i, nodes);
    }
  }

  apply(_alpha) {
    for (let k = 0; k < this.iterations; ++k) {
      const tree = d3
        .quadtree(this.nodes, d => d.x + d.vx, d => d.y + d.vy)
        .visitAfter(this.prepare.bind(this));

      for (let i = 0; i < this.nodes.length; ++i) {
        const node = this.nodes[i];
        const ri = this.radii[node.index];
        const ri2 = ri * ri;
        const xi = node.x + node.vx;
        const yi = node.y + node.vy;

        tree.visit((quad, x0, y0, x1, y1) => {
          const data = quad.data;
          let rj = quad.r;
          let r = ri + rj;
          if (data) {
            if (data.index > node.index) {
              let x = xi - data.x - data.vx;
              let y = yi - data.y - data.vy;
              let l = x * x + y * y;
              if (l < r * r) {
                if (x === 0) {
                  x = (Math.random() - 0.5) * 1e-6;
                  l += x * x;
                }
                if (y === 0) {
                  y = (Math.random() - 0.5) * 1e-6;
                  l += y * y;
                }

                l = Math.sqrt(l);
                l = (r - l) / l * this.strength;

                x *= l;
                rj *= rj;
                r = rj / (ri2 + rj);
                node.vx += x * r;

                y *= l;
                node.vy += y * r;

                r = 1 - r;
                data.vx -= x * r;
                data.vy -= y * r;
              }
            }
            return;
          }

          return x0 > xi + r || x1 < xi - r || y0 > yi + r || y1 < yi - r;
        });
      }
    }
  }

  prepare(quad) {
    if (quad.data) {
      quad.r = this.radii[quad.data.index];
      return quad.r;
    }
    quad.r = 0;
    for (let i = 0; i < 4; ++i) {
      if (quad[i] && quad[i].r > quad.r) {
        quad.r = quad[i].r;
      }
    }
  }
}
