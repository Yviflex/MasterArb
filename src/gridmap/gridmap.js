import * as d3 from "d3";
import * as turf from "@turf/turf";

import { geomArea } from "./area";
import { randomPointInPolygon } from "./random";
import { pointsAroundCentroid } from "./uniformDistrib.js";
import { Simulation } from "./simulation";

export class GridMap {
  constructor(layer, nProp) {
    // The layer is the GeoJSON representation of the input polygons
    this.layer = layer;

    // nProp is the name of the attribute in the layer which holds the number of grid cells
    // the polygon should have at the end.
    this.nProp = nProp;

    // Simulation status
    this.simulation = {
      running: false,
      // The simulation itself
      instance: null,
      // The update function which is called after each tick
      update: null
    };

    this.setup();
  }

  /**
   * @param {Point} geo A point in real-world coordinates as {x, y}
   * @returns the grid coordinates of the point as object {i, j}
   */
  geoToGrid(geo) {
    // Compute the grid coordinates of a point in real-world coordinates
    const x = geo.x - this.gridEnv[0];
    const y = geo.y - this.gridEnv[1];
    const i = Math.floor(x / this.gridSize);
    const j = Math.floor(y / this.gridSize);
    return { i, j };
  }

  /**
   * @param {Point} geo A point in real-world coordinates as {x, y}
   * @returns the screen coordinates of the point as object {x, y}
   */
  geoToScreen(geo) {
    // Compute the screen coordinates of a point in real-world coordinates
    const x = (geo.x - this.gridEnv[0]) / this.gridSize * this.scale;
    const y =
      this.height - (geo.y - this.gridEnv[1]) / this.gridSize * this.scale;
    return { x, y };
  }

  /**
   * @param {Point} pt A point in grid coordinates as {i, j}
   * @returns the screen coordinates of the point as object {x, y}
   */
  gridToScreen(pt) {
    // Compute the screen coordinates of a grid cell
    const x = pt.i * this.scale;
    const y = this.height - (pt.j + 1) * this.scale;
    return { x, y };
  }

  setup() {
    // Compute the sum of the nProp attribute for all polygons
    this.nSum = this.layer.features.reduce((acc, feature) => {
      return acc + feature.properties[this.nProp];
    }, 0);
    console.log("Sum of nProp:", this.nSum);

    // Compute the the area of all polygons and add it to the properties of each polygon
    this.layer.features.forEach(feature => {
      const area = geomArea(feature.geometry);
      feature.properties.area = area;
    });

    this.areaSum = this.layer.features.reduce((acc, feature) => {
      return acc + feature.properties.area;
    }, 0);
    console.log("Sum of area:", this.areaSum);

    // Compute the grid size which is the width or height of the grid cell in projected coordinates.
    // It is based on the idea that all grid cells should have the same area as the initial
    // features.
    this.gridSize = Math.sqrt(this.areaSum / this.nSum);
    console.log("Grid size:", this.gridSize);

    // Compute the bounding box of the layer
    this.layerEnv = turf.bbox(this.layer);
    console.log("Layer bounding box:", this.layerEnv);

    // Define the bounding box of the grid. This requires to compute the number of grid cells
    // in the x and y direction. We add 1 grid cell on each side.
    this.nX =
      Math.ceil((this.layerEnv[2] - this.layerEnv[0]) / this.gridSize) * 2;
    this.nY =
      Math.ceil((this.layerEnv[3] - this.layerEnv[1]) / this.gridSize) * 2;
    console.log(
      `Number of grid cells: ${this.nX} x ${this.nY} = ${this.nX * this.nY}`
    );

    // Compute the distance around the layer bounding box.
    this.paddingX =
      (this.nX * this.gridSize - (this.layerEnv[2] - this.layerEnv[0])) / 2;
    this.paddingY =
      (this.nY * this.gridSize - (this.layerEnv[3] - this.layerEnv[1])) / 2;

    // Compute the bounding box of the grid
    this.gridEnv = [
      this.layerEnv[0] - this.paddingX,
      this.layerEnv[1] - this.paddingY,
      this.layerEnv[2] + this.paddingX,
      this.layerEnv[3] + this.paddingY
    ];
    console.log("Grid bounding box:", this.gridEnv);

    this.setupGrid();
    this.setupTiles();
  }

  setupGrid() {
    // Define the grid cells. Each grid cell has its position i,j and the coordinates x,y of
    // its center. The grid cells are stored in a flat array and in a 2D array.
    this.gridArr = [];
    this.grid = new Array(this.nX);
    for (let i = 0; i < this.nX; i++) {
      this.grid[i] = new Array(this.nY);
    }

    for (let j = 0; j < this.nY; j++) {
      for (let i = 0; i < this.nX; i++) {
        const x = this.gridEnv[0] + (i + 0.5) * this.gridSize;
        const y = this.gridEnv[1] + (j + 0.5) * this.gridSize;
        const d = { i, j, x, y };
        this.gridArr.push(d);
        this.grid[i][j] = d;
      }
    }
  }

  setupTiles() {
    this.tiles = [];

    this.layer.features.forEach((feat, idx) => {
      const n = feat.properties[this.nProp];
      const points = pointsAroundCentroid(feat.geometry, n);

      console.log(`Feature ${idx}, demandé: ${n}, généré: ${points.length}`);

      points.forEach(geomPt => {
        const x0 = geomPt.coordinates[0];
        const y0 = geomPt.coordinates[1];
        const gridPt = this.geoToGrid({ x: x0, y: y0 });

        // ✅ Sécurité : ignore les points hors grille
        if (
          gridPt.i < 0 ||
          gridPt.j < 0 ||
          gridPt.i >= this.nX ||
          gridPt.j >= this.nY
        ) {
          console.warn("⚠️ Point ignoré (hors grille)", {
            x: x0,
            y: y0,
            i: gridPt.i,
            j: gridPt.j
          });
          return;
        }

        this.tiles.push({
          feature: feat,
          featureIdx: idx,
          x: x0,
          y: y0,
          ox: x0,
          oy: y0,
          i: gridPt.i,
          j: gridPt.j
        });
      });
    });
  }

  //   this.tiles = [];
  //   this.layer.features.forEach((feat, idx) => {
  //     const n = feat.properties[this.nProp];
  //     for (let i = 0; i < n; i++) {
  //       const pt = randomPointInPolygon(feat.geometry);
  //       const gridPt = this.geoToGrid({
  //         x: pt.coordinates[0],
  //         y: pt.coordinates[1]
  //       });
  //       this.tiles.push({
  //         feature: feat,
  //         featureIdx: idx,
  //         x: pt.coordinates[0],
  //         y: pt.coordinates[1],
  //         ox: pt.coordinates[0],
  //         oy: pt.coordinates[1],
  //         i: gridPt.i,
  //         j: gridPt.j
  //       });
  //     }
  //   });
  // }

  init(divElem) {
    divElem.innerHTML = `<svg>
      <g class="grid"></g>
      <g class="tiles"></g>
    </svg>`;
  }

  render(divElem) {
    console.log("Rendering grid map...");

    const svg = d3.select(divElem).select("svg").node();
    if (!svg) this.init(divElem);

    // Define the size of the SVG according to the width of the document and the height of the grid.
    this.width = divElem.clientWidth;
    this.scale = this.width / this.nX;

    this.height = this.nY * this.scale;
    d3
      .select(divElem)
      .select("svg")
      .attr("width", Math.ceil(this.width))
      .attr("height", Math.ceil(this.height));

    this.renderGrid(d3.select(divElem).select("svg g.grid").node());

    this.gTiles = d3.select(divElem).select("svg g.tiles");
    this.renderTiles(this.gTiles.node());

    // Start simulation
    this.runSimulation();
  }

  renderGrid(gElem) {
    // Draw the grid cells
    d3
      .select(gElem)
      .selectAll("rect")
      .data(this.gridArr)
      .join("rect")
      .each((d, i, nodes) => {
        const p = this.gridToScreen(d);
        d3
          .select(nodes[i])
          .attr("x", p.x)
          .attr("y", p.y)
          .attr("width", this.scale)
          .attr("height", this.scale)
          .attr("fill", "none")
          .attr("stroke", "#ccc")
          .attr("stroke-width", 0.5);
      });
  }

  renderTiles(gElem) {
    // Draw the tiles
    d3
      .select(gElem)
      .selectAll("rect")
      .data(this.tiles)
      .join("rect")
      .each((d, i, nodes) => {
        const p = this.gridToScreen(d);
        d3
          .select(nodes[i])
          .attr("x", p.x)
          .attr("y", p.y)
          .attr("width", this.scale)
          .attr("height", this.scale)
          .attr("fill", d.feature.properties.col || "steelblue")
          .attr("opacity", 0.5)
          .on("mouseover", (_evt, d) => {
            console.log("Feature:", d.feature.properties.name);
          });
      });

    // Draw the center ponits of the tiles
    d3
      .select(gElem)
      .selectAll("circle")
      .data(this.tiles)
      .join("circle")
      .each((d, i, nodes) => {
        const p = this.geoToScreen(d);
        d3
          .select(nodes[i])
          .attr("cx", p.x)
          .attr("cy", p.y)
          .attr("r", 2)
          .attr("fill", "black")
          .attr("opacity", 0.5);
      });
  }
  // original runsimulation
  // runSimulation() {
  //   // Create the simulation if it does not exist
  //   if (!this.simulation.instance) {
  //     this.simulation.instance = new Simulation(this.tiles, {
  //       gridSize: this.gridSize
  //     });
  //     this.simulation.instance.on("tick", this.simulationTick.bind(this));
  //   }

  //   this.simulation.instance.run();
  // }

  //runsimulation with simple instant snapping to nearest tile center
  // runSimulation() {
  //   // Crée la simulation une seule fois
  //   if (!this.simulation.instance) {
  //     this.simulation.instance = new Simulation(this.tiles, {
  //       gridSize: this.gridSize
  //     })
  //       // À chaque tick, on met à jour i,j et on redessine
  //       .on("tick", this.simulationTick.bind(this))
  //       // À la fin, on « snappe » chaque point au centre de sa tuile et on redessine une dernière fois
  //       .on("end", () => {
  //         this.tiles.forEach(tile => {
  //           // Récupère l’objet grid[i][j] qui contient x,y = centre réel du carreau
  //           const center = this.grid[tile.i][tile.j];
  //           tile.x = center.x;
  //           tile.y = center.y;
  //         });
  //         // Re‐dessine pour voir les points exactement alignés au centre
  //         this.renderTiles(this.gTiles.node());
  //       });
  //   }

  //   this.simulation.instance.run();
  // }

  runSimulation() {
    // Crée la simulation une seule fois, aide de chat
    if (!this.simulation.instance) {
      this.simulation.instance = new Simulation(this.tiles, {
        gridSize: this.gridSize
      })
        // À chaque tick, on met à jour i,j et on redessine
        .on("tick", this.simulationTick.bind(this))
        // À la fin, on « snappe » chaque point au centre de sa tuile avec easing cubic
        .on("end", () => {
          // 1) On récupère la position initiale de chaque tile avant le snapping
          const initialPositions = this.tiles.map(tile => ({
            x: tile.x,
            y: tile.y
          }));

          // 2) On calcule d’abord la position cible (centre de la tuile) pour chaque tile
          this.tiles.forEach(tile => {
            const center = this.grid[tile.i][tile.j];
            tile.targetX = center.x;
            tile.targetY = center.y;
          });

          // 3) On lance un petit timer pour interpoler de initial -> target
          const duration = 500; // durée en ms (ici 0.5s)
          const easeFunc = d3.easeCubicInOut; // easing cubic in/out
          const t0 = Date.now();

          d3.timer(
            function(elapsed) {
              // elapsed = temps écoulé (ms) depuis l’appel d3.timer
              const t = (Date.now() - t0) / duration;
              const tt = t >= 1 ? 1 : easeFunc(t); // on clamp t entre 0 et 1

              // On boucle sur chaque tile pour recalculer x,y intermédiaires
              this.tiles.forEach((tile, i) => {
                const xi = initialPositions[i].x;
                const yi = initialPositions[i].y;
                const xt = tile.targetX;
                const yt = tile.targetY;

                tile.x = xi + (xt - xi) * tt;
                tile.y = yi + (yt - yi) * tt;
              });

              // On redessine la frame courante
              this.renderTiles(this.gTiles.node());

              // Si t >= 1 => on a atteint la fin de la transition, on stoppe le timer
              if (t >= 1) {
                return true; // retourne true => d3.timer s’arrête
              }
              return false; // sinon, continue jusqu’à la prochaine frame
            }.bind(this)
          );

          // Note : on ne fait pas d’appel supplémentaire à renderTiles en dehors de ce timer,
          // car le timer s’occupe de redessiner à chaque frame intermédiaire puis à la fin.
        });
    }

    this.simulation.instance.run();
  }

  simulationTick() {
    // Compute the new grid coordinates of the tiles
    this.tiles.forEach(tile => {
      const gridPt = this.geoToGrid({ x: tile.x, y: tile.y });
      tile.i = gridPt.i;
      tile.j = gridPt.j;
    });

    // Compute the mean deviation of the node coordinates wrt the respective grid centers
    let dx = 0;
    let dy = 0;
    this.tiles.forEach(tile => {
      const gridPt = this.grid[tile.i][tile.j];
      dx += tile.x - gridPt.x;
      dy += tile.y - gridPt.y;
    });
    dx /= this.tiles.length;
    dy /= this.tiles.length;
    //console.log("Mean deviation:", dx, dy)

    // Draw the tiles
    this.renderTiles(this.gTiles.node());
  }
}
