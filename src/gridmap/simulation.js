import * as d3 from "d3";

import { ForceX } from "./forceX.js";
import { ForceY } from "./forceY.js";
import { ForceCollide } from "./forceCollide.js";
import { ForceCluster } from "./forceCluster.js"; // pas ouf non plus pour le moment
import { ForceTileRepel } from "./forceTileRepel.js"; //pas ouf pour le moment

export class Simulation {
  constructor(nodes, config) {
    this.nodes = nodes;

    // Initial simulation parameters
    this.nIterations = 300;

    this.alpha = null;
    this.alphaMin = 0.001;
    this.alphaDecay = 1 - Math.pow(this.alphaMin, 1 / this.nIterations);
    this.alphaTarget = 0;
    this.velocityDecay = 0.6;

    // Initialize the nodes; x,y and ox,oy are already defined (as well i,j)
    // Define the initial velocity, and the index
    this.nodes.forEach((node, idx) => {
      node.vx = 0;
      node.vy = 0;
      node.index = idx;
    });

    this.forces = new Map();
    this.forces.set("x", new ForceX(this.nodes, d => d.ox));
    this.forces.set("y", new ForceY(this.nodes, d => d.oy));

    // =====> nouvelle force de clustering par featureIdx
    // this.forces.set(
    //   "cluster",
    //   new ForceCluster(this.nodes, d => d.featureIdx, 0.12)
    // );
    this.forces.set(
      "collide",
      new ForceCollide(this.nodes, config.gridSize / 2)
    );
    // =====> On ajoute la force de répulsion par case (i,j)
    // ATTENTION POUR LE MOMENT LE TILE REPEL IL EST NUL A CHIER, IL SERT A RIEN
    this.forces.set(
      "tileRepel",
      new ForceTileRepel(
        this.nodes,
        d => ({ i: d.i, j: d.j }), // on lit les indices statiques
        1.2, // force relative (à ajuster)
        null // pas de mise à jour dynamique de i,j ici
      )
    );

    //this.forces.set("charge", d3.forceManyBody().strength(-10));

    this.stepper = null;
    this.running = false;

    this.event = d3.dispatch("tick", "end");

    this.random = lcg();
  }

  on(evt, callback) {
    this.event.on(evt, callback);
    return this;
  }

  run() {
    this.running = true;
    this.alpha = 1;
    this.stepper = d3.timer(this.step.bind(this));
  }

  step() {
    this.tick();
    this.event.call("tick", this);
    if (this.alpha < this.alphaMin) {
      this.stepper.stop();
      this.running = false;
      this.event.call("end", this);
    }
  }

  tick(iterations) {
    const iters = iterations || 1;

    for (let k = 0; k < iters; ++k) {
      this.alpha += (this.alphaTarget - this.alpha) * this.alphaDecay;

      this.forces.forEach(f => {
        f.apply(this.alpha);
      });

      for (let i = 0; i < this.nodes.length; ++i) {
        const node = this.nodes[i];
        node.vx *= this.velocityDecay;
        node.vy *= this.velocityDecay;
        node.x += node.vx;
        node.y += node.vy;
      }
    }
  }
}
/*    // Create the simulation
    this.simulation.instance = d3.forceSimulation(this.tiles)
      .force('x', d3.forceX(d => d.ox))
      .force('y', d3.forceY(d => d.oy))
      .force('collide', d3.forceCollide(this.gridSize / 2))
      //.force('charge', d3.forceManyBody().strength(-10))
      .on('tick', this.simulationTick.bind(this))

    this.simulation.running = true
*/

// https://en.wikipedia.org/wiki/Linear_congruential_generator#Parameters_in_common_use
const A = 1664525;
const C = 1013904223;
const M = 4294967296; // 2^32

function lcg() {
  let s = 1;
  return () => (s = (A * s + C) % M) / M;
}
