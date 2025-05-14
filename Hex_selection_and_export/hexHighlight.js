(function() {
  // Canvas hors-DOM pour les tests spatiaux
  const canvas = document.createElement("canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext("2d");

  // Recalcul des centres des hexagonaux
  function getHexCenters() {
    return d3.selectAll("circle.hex-center").nodes().map(node => {
      const r = node.getBoundingClientRect();
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
        node
      };
    });
  }

  function highlightHexSeats() {
    // Réinitialise les couleurs des hexagones de la grille
    d3.selectAll("#hexgrid path").attr("fill", "rgba(105,179,162,0.3)");

    const hexByKantonsNum = {};
    const hexCenters = getHexCenters();

    // Calcul approximatif du rayon de l’hexagone (à partir du cercle central)
    const sampleCircle = d3.select("circle.hex-center");
    const circleR = +sampleCircle.attr("r");
    const hexRadius = circleR / 0.2;

    // Prépare l’échelle de couleurs pour chaque canton en utilisant un dégradé Arc-en-ciel
    const kantons = Array.from(
      document.querySelectorAll("#cantons-scaled path")
    )
      .map(pathEl => pathEl.dataset.kantonsnum)
      .filter(k => k != null && k !== "");
    const uniqueKantons = Array.from(new Set(kantons));
    const palette = d3.quantize(d3.interpolateRainbow, uniqueKantons.length);
    const colorScale = d3.scaleOrdinal().domain(uniqueKantons).range(palette);

    // Parcourt chaque canton pour sélectionner ses sièges
    document.querySelectorAll("#cantons-scaled path").forEach(pathEl => {
      const seats = parseInt(pathEl.dataset.nbrSieg1, 10) || 0;
      if (seats <= 0) return;

      const kantonsnum = pathEl.dataset.kantonsnum;
      if (!kantonsnum) return;
      if (!hexByKantonsNum[kantonsnum]) {
        hexByKantonsNum[kantonsnum] = [];
      }

      // Prépare le Path2D du canton et transforme
      const d = pathEl.getAttribute("d");
      const path2d = new Path2D(d);
      const m = pathEl.getScreenCTM();

      // Centroid approximatif (centre du bbox)
      const bb = pathEl.getBoundingClientRect();
      const cx = bb.left + bb.width / 2;
      const cy = bb.top + bb.height / 2;

      const inside = [];
      const outside = [];

      // Sépare hexCenters selon qu'ils sont dans le canton
      hexCenters.forEach(p => {
        ctx.save();
        ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
        if (ctx.isPointInPath(path2d, p.x, p.y)) {
          inside.push(p);
        } else {
          outside.push(p);
        }
        ctx.restore();
      });

      // Pour chaque hexagone hors-centre, calcule un score d'intersection (
      // nombre de sommets dans le canton)
      outside.forEach(p => {
        let count = 0;
        for (let i = 0; i < 6; i++) {
          const angle = Math.PI / 6 + i * (Math.PI / 3);
          const sx = p.x + hexRadius * Math.cos(angle);
          const sy = p.y + hexRadius * Math.sin(angle);
          ctx.save();
          ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
          if (ctx.isPointInPath(path2d, sx, sy)) count++;
          ctx.restore();
        }
        p._intersectCount = count;
      });

      // Trie par distance au centroïde (pour inside) et par intersectCount puis distance (pour outside)
      inside.sort(
        (a, b) =>
          (a.x - cx) ** 2 +
          (a.y - cy) ** 2 -
          ((b.x - cx) ** 2 + (b.y - cy) ** 2)
      );
      outside.sort((a, b) => {
        const diff = b._intersectCount - a._intersectCount;
        if (diff !== 0) return diff;
        return (
          (a.x - cx) ** 2 +
          (a.y - cy) ** 2 -
          ((b.x - cx) ** 2 + (b.y - cy) ** 2)
        );
      });

      // Sélectionne les meilleurs 'seats' hexagones
      const selected =
        inside.length >= seats
          ? inside.slice(0, seats)
          : inside.concat(outside.slice(0, seats - inside.length));

      // Colorie les hexagones correspondants
      selected.forEach(p => {
        d3.selectAll("#hexgrid path").each(function() {
          const hexPathEl = this;
          const hd = hexPathEl.getAttribute("d");
          const hexPath2d = new Path2D(hd);
          const mHex = hexPathEl.getScreenCTM();
          ctx.save();
          ctx.setTransform(mHex.a, mHex.b, mHex.c, mHex.d, mHex.e, mHex.f);
          if (ctx.isPointInPath(hexPath2d, p.x, p.y)) {
            d3.select(hexPathEl).attr("fill", colorScale(kantonsnum));
          }
          ctx.restore();
        });

        hexByKantonsNum[kantonsnum].push({ x: p.x, y: p.y });
      });
    });

    // Expose le résultat
    window.hexByKantonsNum = hexByKantonsNum;
  }

  // Remplace la fonction applyCantonScaling pour ajouter notre highlight
  const orig = window.applyCantonScaling;
  window.applyCantonScaling = function(...args) {
    orig.apply(this, args);
    highlightHexSeats();
  };

  // Sur chargement et redimensionnement
  window.addEventListener("DOMContentLoaded", highlightHexSeats);
  window.addEventListener("resize", highlightHexSeats);
  (function() {
    // Canvas hors-DOM pour les tests spatiaux
    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext("2d");

    // Recalcul des centres des hexagonaux
    function getHexCenters() {
      return d3.selectAll("circle.hex-center").nodes().map(node => {
        const r = node.getBoundingClientRect();
        return {
          x: r.left + r.width / 2,
          y: r.top + r.height / 2,
          node
        };
      });
    }

    function highlightHexSeats() {
      // Réinitialise les couleurs des hexagones de la grille
      d3.selectAll("#hexgrid path").attr("fill", "rgba(105,179,162,0.3)");

      const hexByKantonsNum = {};
      const hexCenters = getHexCenters();

      // Calcul approximatif du rayon de l’hexagone (à partir du cercle central)
      const sampleCircle = d3.select("circle.hex-center");
      const circleR = +sampleCircle.attr("r");
      const hexRadius = circleR / 0.2;

      // Prépare l’échelle de couleurs pour chaque canton en utilisant un dégradé Arc-en-ciel
      const kantons = Array.from(
        document.querySelectorAll("#cantons-scaled path")
      )
        .map(pathEl => pathEl.dataset.kantonsnum)
        .filter(k => k != null && k !== "");
      const uniqueKantons = Array.from(new Set(kantons));
      const palette = d3.quantize(d3.interpolateRainbow, uniqueKantons.length);
      const colorScale = d3.scaleOrdinal().domain(uniqueKantons).range(palette);

      // Parcourt chaque canton pour sélectionner ses sièges
      document.querySelectorAll("#cantons-scaled path").forEach(pathEl => {
        const seats = parseInt(pathEl.dataset.nbrSieg1, 10) || 0;
        if (seats <= 0) return;

        const kantonsnum = pathEl.dataset.kantonsnum;
        if (!kantonsnum) return;
        if (!hexByKantonsNum[kantonsnum]) {
          hexByKantonsNum[kantonsnum] = [];
        }

        // Prépare le Path2D du canton et transforme
        const d = pathEl.getAttribute("d");
        const path2d = new Path2D(d);
        const m = pathEl.getScreenCTM();

        // Centroid approximatif (centre du bbox)
        const bb = pathEl.getBoundingClientRect();
        const cx = bb.left + bb.width / 2;
        const cy = bb.top + bb.height / 2;

        const inside = [];
        const outside = [];

        // Sépare hexCenters selon qu'ils sont dans le canton
        hexCenters.forEach(p => {
          ctx.save();
          ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
          if (ctx.isPointInPath(path2d, p.x, p.y)) {
            inside.push(p);
          } else {
            outside.push(p);
          }
          ctx.restore();
        });

        // Pour chaque hexagone hors-centre, calcule un score d'intersection (
        // nombre de sommets dans le canton)
        outside.forEach(p => {
          let count = 0;
          for (let i = 0; i < 6; i++) {
            const angle = Math.PI / 6 + i * (Math.PI / 3);
            const sx = p.x + hexRadius * Math.cos(angle);
            const sy = p.y + hexRadius * Math.sin(angle);
            ctx.save();
            ctx.setTransform(m.a, m.b, m.c, m.d, m.e, m.f);
            if (ctx.isPointInPath(path2d, sx, sy)) count++;
            ctx.restore();
          }
          p._intersectCount = count;
        });

        // Trie par distance au centroïde (pour inside) et par intersectCount puis distance (pour outside)
        inside.sort(
          (a, b) =>
            (a.x - cx) ** 2 +
            (a.y - cy) ** 2 -
            ((b.x - cx) ** 2 + (b.y - cy) ** 2)
        );
        outside.sort((a, b) => {
          const diff = b._intersectCount - a._intersectCount;
          if (diff !== 0) return diff;
          return (
            (a.x - cx) ** 2 +
            (a.y - cy) ** 2 -
            ((b.x - cx) ** 2 + (b.y - cy) ** 2)
          );
        });

        // Sélectionne les meilleurs 'seats' hexagones
        const selected =
          inside.length >= seats
            ? inside.slice(0, seats)
            : inside.concat(outside.slice(0, seats - inside.length));

        // Colorie les hexagones correspondants
        selected.forEach(p => {
          d3.selectAll("#hexgrid path").each(function() {
            const hexPathEl = this;
            const hd = hexPathEl.getAttribute("d");
            const hexPath2d = new Path2D(hd);
            const mHex = hexPathEl.getScreenCTM();
            ctx.save();
            ctx.setTransform(mHex.a, mHex.b, mHex.c, mHex.d, mHex.e, mHex.f);
            if (ctx.isPointInPath(hexPath2d, p.x, p.y)) {
              d3.select(hexPathEl).attr("fill", colorScale(kantonsnum));
            }
            ctx.restore();
          });

          hexByKantonsNum[kantonsnum].push({ x: p.x, y: p.y });
        });
      });

      // Expose le résultat
      window.hexByKantonsNum = hexByKantonsNum;
    }

    // Remplace la fonction applyCantonScaling pour ajouter notre highlight
    const orig = window.applyCantonScaling;
    window.applyCantonScaling = function(...args) {
      orig.apply(this, args);
      highlightHexSeats();
    };

    // Sur chargement et redimensionnement
    window.addEventListener("DOMContentLoaded", () => {
      highlightHexSeats();
      createExportButton();
    });
    window.addEventListener("resize", highlightHexSeats);

    // Création du bouton d'export
    function createExportButton() {
      const btn = document.createElement("button");
      btn.id = "export-hexagons-btn";
      btn.textContent = "Exporter les hexagones";
      Object.assign(btn.style, {
        position: "fixed",
        top: "10px",
        right: "10px",
        zIndex: "1000",
        padding: "8px 12px",
        backgroundColor: "#69b3a2",
        color: "#fff",
        border: "none",
        borderRadius: "4px",
        cursor: "pointer"
      });
      btn.addEventListener("click", () => {
        if (!window.hexByKantonsNum) {
          alert("Les données ne sont pas pas encore disponibles.");
          return;
        }
        const data = window.hexByKantonsNum;
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "hexagons_by_kantons.json";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
      document.body.appendChild(btn);
    }
  })();
})();
