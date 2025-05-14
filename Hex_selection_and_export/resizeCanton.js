// resizeCanton.js
// Redimensionne les cantons, évite les collisions, puis
// surligne en jaune les hexagones dont le centre tombe
// dans la bbox FINALE de chaque canton.

(function(global, d3) {
  // --- Helpers pour l'aire (shoelace) ---
  function ringArea(coords, projection) {
    let area = 0,
      n = coords.length;
    for (let i = 0; i < n; i++) {
      const [x0, y0] = projection(coords[i]);
      const [x1, y1] = projection(coords[(i + 1) % n]);
      area += x0 * y1 - x1 * y0;
    }
    return Math.abs(area) / 2;
  }
  function featureScreenArea(feature, projection) {
    let area = 0;
    const geom = feature.geometry;
    if (geom.type === "Polygon") {
      const [outer, ...holes] = geom.coordinates;
      area += ringArea(outer, projection);
      holes.forEach(h => (area -= ringArea(h, projection)));
    } else {
      // MultiPolygon
      geom.coordinates.forEach(poly => {
        const [outer, ...holes] = poly;
        area += ringArea(outer, projection);
        holes.forEach(h => (area -= ringArea(h, projection)));
      });
    }
    return area;
  }
  function intersects(a, b) {
    return !(
      a.right < b.left ||
      a.left > b.right ||
      a.bottom < b.top ||
      a.top > b.bottom
    );
  }

  // --- Fonction principale ---
  function applyCantonScaling(
    svg,
    suisseCantons,
    sièges,
    varTot,
    swissAreaPix
  ) {
    // 1) on supprime l'ancien calque
    svg.select("#cantons-scaled").remove();

    // 2) on collecte tous les hex-centers et reset couleur
    const hexCenters = d3.selectAll("circle.hex-center").nodes().map(node => {
      const r = node.getBoundingClientRect();
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        node
      };
    });
    // on remet tout en rouge
    d3.selectAll("circle.hex-center").attr("fill", "white");

    // 3) projection et données d'aire
    const W = window.innerWidth,
      H = window.innerHeight;
    const centerX = W / 2,
      centerY = H / 2;
    const projection = d3.geoMercator().fitSize([W, H], suisseCantons);
    const path = d3.geoPath(projection);

    const seatMap = new Map(
      sièges.nodes.map(d => [d.Kantonsnum, d.nbr_SIEG_1])
    );
    const screenAreaMap = {};
    suisseCantons.features.forEach(f => {
      const id = f.properties.KANTONSNUM || f.properties.Kantonsnum;
      screenAreaMap[id] = featureScreenArea(f, projection);
    });

    const placedBoxes = [];
    const group = svg.append("g").attr("id", "cantons-scaled");

    // 4) on dessine et met à l'échelle chaque canton
    group
      .selectAll("path")
      .data(suisseCantons.features)
      .join("path")
      .attr("d", path)
      .attr("fill", "none")
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("vector-effect", "non-scaling-stroke")
      .attr(
        "id",
        d => `canton-${d.properties.KANTONSNUM || d.properties.Kantonsnum}`
      )
      .attr(
        "data-kantonsnum",
        d => d.properties.KANTONSNUM || d.properties.Kantonsnum
      )
      .attr("data-nbr-sieg1", d => {
        const id = d.properties.KANTONSNUM;
        return seatMap.get(id) || 0;
      })
      // **nouveau** : on stocke l’abréviation du canton
      .attr("data-abr", d => d.properties.ABR)
      .each(function(feature) {
        const el = d3.select(this);
        const id =
          feature.properties.KANTONSNUM || feature.properties.Kantonsnum;
        const seats = seatMap.get(id) || 0;
        const curA = screenAreaMap[id] || 1;
        const tgtA = seats / varTot * swissAreaPix;
        const s = Math.sqrt(tgtA / curA);
        const [cx, cy] = path.centroid(feature);

        // a) on applique la scale seule
        let transform = `translate(${cx},${cy}) scale(${s}) translate(${-cx},${-cy})`;
        el.attr("transform", transform);

        // b) on résout les collisions : on translate jusqu'à plus d'intersection
        let bbox = this.getBoundingClientRect();
        const dirX = cx - centerX,
          dirY = cy - centerY;
        const len = Math.hypot(dirX, dirY) || 1;
        const stepX = dirX / len * 10,
          stepY = dirY / len * 10;
        while (placedBoxes.some(b => intersects(b, bbox))) {
          transform += ` translate(${stepX},${stepY})`;
          el.attr("transform", transform);
          bbox = this.getBoundingClientRect();
        }
        placedBoxes.push(bbox);

        // c) UNE FOIS QUE bbox est FINALE, on colorie les hex-centers dedans
        hexCenters.forEach(p => {
          if (
            p.x >= bbox.left &&
            p.x <= bbox.right &&
            p.y >= bbox.top &&
            p.y <= bbox.bottom
          ) {
            d3.select(p.node).attr("fill", "blue");
          }
        });

        // 4bis) stocker les paths transformés dans un objet global
        const scaledCantonsSVG = {};
        group.selectAll("path").each(function(feature) {
          const id =
            feature.properties.KANTONSNUM || feature.properties.Kantonsnum;
          // outerHTML contient le <path> complet, avec son d="…" et son transform="…"
          scaledCantonsSVG[id] = this.outerHTML;
        });
        // on expose pour pouvoir les réutiliser ailleurs
        window.scaledCantonsSVG = scaledCantonsSVG;
      });
  }

  // --- Auto-run sur load et resize ---
  global.applyCantonScaling = applyCantonScaling;
  function runScaling() {
    const svg = d3.select("svg");
    if (
      !svg.empty() &&
      global.suisseCantonsSimplified &&
      global.sièges &&
      global.swissAreaPix
    ) {
      applyCantonScaling(
        svg,
        global.suisseCantonsSimplified,
        global.sièges,
        200,
        global.swissAreaPix
      );
    }
  }
  window.addEventListener("DOMContentLoaded", runScaling);
  window.addEventListener("resize", runScaling);
})(window, d3);

// hexHighlight.js
(function() {
  // 1) Canvas hors-DOM pour faire les tests
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  // 2) Fonction qui recolore en jaune les cercles bleus
  function highlightHexInsidePaths() {
    // On ne traite que les hex-centers déjà bleus
    d3
      .selectAll("circle.hex-center")
      .filter(function() {
        return d3.select(this).attr("fill") === "blue";
      })
      .each(function() {
        const node = this;
        // Centre écran du cercle
        const { left, top, width, height } = node.getBoundingClientRect();
        const x = left + width / 2;
        const y = top + height / 2;

        // Test d’appartenance à **n’importe quel** path transformé
        let isInside = false;
        document.querySelectorAll("#cantons-scaled path").forEach(pathEl => {
          const d = pathEl.getAttribute("d");
          if (!d) return;
          const path2d = new Path2D(d);

          // On applique la même transformation écran que le <path>
          const m = pathEl.getScreenCTM();
          ctx.save();
          ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);

          if (ctx.isPointInPath(path2d, x, y)) {
            isInside = true;
          }
          ctx.restore();
        });

        // Si on est dedans, on passe en jaune
        if (isInside) {
          d3.select(node).attr("fill", "yellow");
        }
      });
  }

  // 3) On déclenche après chaque scaling
  const orig = window.applyCantonScaling;
  window.applyCantonScaling = function(...args) {
    // appel du code existant
    orig.apply(this, args);
    // puis surlignage des hex-centers
    highlightHexInsidePaths();
  };

  // 4) Aussi au chargement et au redimensionnement
  window.addEventListener("DOMContentLoaded", highlightHexInsidePaths);
  window.addEventListener("resize", highlightHexInsidePaths);
})();
