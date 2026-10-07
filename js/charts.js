/**
 * charts.js
 * Modul pembuat dan pengelola visualisasi data:
 * - Chart.js v4 (Line, Bar, Horizontal Bar, Donut, Stacked, Radar, Diverging, Scatter, Error Bar)
 * - Custom SVG (Bump Chart, Box Plot, Sparklines)
 * - Custom CSS/HTML Heatmap Matrix
 */

import { DATA, DB_COLORS } from './data.js';
import {
  formatIDN,
  formatPercent,
  formatDelta,
  mean,
  stdDev,
  calculateRelativeShare,
  calculateRankings,
  quartiles,
  linearRegression,
  pearsonCorrelation
} from './stats.js';

// Registry untuk melacak instance Chart.js agar bisa di-destroy sebelum re-render
const chartRegistry = {};

/**
 * Hancurkan instance chart jika sudah ada
 * @param {string} id 
 */
export function destroyChart(id) {
  if (chartRegistry[id]) {
    chartRegistry[id].destroy();
    delete chartRegistry[id];
  }
}

/**
 * Unduh canvas Chart.js atau elemen SVG sebagai file gambar PNG
 * @param {string} elementId ID dari canvas atau container SVG
 * @param {string} fileName Nama file tanpa ekstensi
 */
export function downloadChartAsPNG(elementId, fileName = "chart-statistik") {
  const el = document.getElementById(elementId);
  if (!el) return;

  if (el.tagName.toLowerCase() === "canvas") {
    // Canvas download
    const link = document.createElement("a");
    link.download = `${fileName}.png`;
    link.href = el.toDataURL("image/png", 1.0);
    link.click();
  } else {
    // SVG download
    const svgEl = el.querySelector("svg") || el;
    if (svgEl.tagName && svgEl.tagName.toLowerCase() === "svg") {
      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
      const DOMURL = window.URL || window.webkitURL || window;
      const url = DOMURL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = svgEl.clientWidth || 800;
        canvas.height = svgEl.clientHeight || 450;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#0F172A";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        DOMURL.revokeObjectURL(url);

        const a = document.createElement("a");
        a.download = `${fileName}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      };
      img.src = url;
    }
  }
}

/**
 * Dapatkan warna Chart.js yang disesuaikan dengan tema gelap/terang
 */
function getThemeColors(isDark = true) {
  return {
    textColor: isDark ? "#94A3B8" : "#475569",
    gridColor: isDark ? "rgba(51, 65, 85, 0.35)" : "rgba(203, 213, 225, 0.6)",
    tooltipBg: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
    tooltipText: isDark ? "#F8FAFC" : "#0F172A",
    tooltipBorder: isDark ? "#334155" : "#CBD5E1"
  };
}

/**
 * 1. LINE CHART MULTI-SERI (Tren Penggunaan 2023 -> 2025)
 */
export function renderTrendLineChart(canvasId, segment = "Pekerja", selectedDb = null, isDark = true) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const t = getThemeColors(isDark);
  const datasets = [];

  const addDataset = (db, segName, dash = [], labelSuffix = "") => {
    const isHighlighted = selectedDb === null || selectedDb === db;
    const color = DB_COLORS[db].hex;
    const dataVals = DATA.segments[segName][db];

    datasets.push({
      label: `${db}${labelSuffix}`,
      data: dataVals,
      borderColor: color,
      backgroundColor: isHighlighted ? `rgba(${DB_COLORS[db].rgb}, 0.12)` : 'transparent',
      borderWidth: isHighlighted ? (selectedDb === db ? 4 : 2.5) : 1,
      borderDash: dash,
      pointBackgroundColor: color,
      pointBorderColor: isDark ? "#0F172A" : "#FFFFFF",
      pointBorderWidth: 2,
      pointRadius: isHighlighted ? (selectedDb === db ? 7 : 5) : 2,
      pointHoverRadius: 9,
      tension: 0.35,
      fill: isHighlighted && dash.length === 0,
      opacity: isHighlighted ? 1 : 0.25
    });
  };

  if (segment === "Bandingkan") {
    DATA.databases.forEach(db => {
      addDataset(db, "Pekerja", [], " (Pekerja)");
      addDataset(db, "Pelajar", [5, 4], " (Pelajar)");
    });
  } else {
    DATA.databases.forEach(db => {
      addDataset(db, segment, [], "");
    });
  }

  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: DATA.years.map(y => `Tahun ${y}`),
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: t.textColor,
            usePointStyle: true,
            boxWidth: 8,
            font: { family: 'Plus Jakarta Sans', size: 12, weight: '500' }
          }
        },
        tooltip: {
          backgroundColor: t.tooltipBg,
          titleColor: t.tooltipText,
          bodyColor: t.tooltipText,
          borderColor: t.tooltipBorder,
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            label: function(context) {
              const val = context.parsed.y;
              const idx = context.dataIndex;
              let diffText = "";
              if (idx > 0) {
                const prev = context.dataset.data[idx - 1];
                const diff = val - prev;
                diffText = ` (${diff >= 0 ? '+' : ''}${formatIDN(diff, 1)} pp)`;
              }
              return ` ${context.dataset.label}: ${formatPercent(val, 1)}${diffText}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: t.gridColor },
          ticks: { color: t.textColor, font: { family: 'Plus Jakarta Sans', weight: '600' } }
        },
        y: {
          grid: { color: t.gridColor },
          ticks: {
            color: t.textColor,
            font: { family: 'JetBrains Mono' },
            callback: v => `${formatIDN(v, 0)}%`
          },
          suggestedMin: 5,
          suggestedMax: 65
        }
      }
    }
  });

  chartRegistry[canvasId] = chart;
}

/**
 * 2. GROUPED BAR CHART (6 Database x 3 Tahun)
 */
export function renderGroupedBarChart(canvasId, segment = "Pekerja", selectedDb = null, isDark = true) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const t = getThemeColors(isDark);
  const activeSegment = segment === "Bandingkan" ? "Pekerja" : segment;
  const datasets = [];

  const yearColors = [
    { alpha: 0.5, borderAlpha: 0.8 },
    { alpha: 0.75, borderAlpha: 0.95 },
    { alpha: 1.0, borderAlpha: 1.0 }
  ];

  DATA.years.forEach((yr, yrIdx) => {
    const dataVals = DATA.databases.map(db => DATA.segments[activeSegment][db][yrIdx]);
    const bgColors = DATA.databases.map(db => {
      const isHighlighted = selectedDb === null || selectedDb === db;
      return isHighlighted
        ? `rgba(${DB_COLORS[db].rgb}, ${yearColors[yrIdx].alpha})`
        : `rgba(${DB_COLORS[db].rgb}, 0.15)`;
    });
    const borderColors = DATA.databases.map(db => DB_COLORS[db].hex);

    datasets.push({
      label: `${yr}`,
      data: dataVals,
      backgroundColor: bgColors,
      borderColor: borderColors,
      borderWidth: 1.5,
      borderRadius: 6
    });
  });

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: DATA.databases,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: { color: t.textColor, font: { family: 'Plus Jakarta Sans', size: 12 } }
        },
        tooltip: {
          backgroundColor: t.tooltipBg,
          titleColor: t.tooltipText,
          bodyColor: t.tooltipText,
          borderColor: t.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatPercent(ctx.parsed.y, 1)}`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: t.textColor, font: { family: 'Plus Jakarta Sans', size: 11, weight: '500' } }
        },
        y: {
          grid: { color: t.gridColor },
          ticks: {
            color: t.textColor,
            font: { family: 'JetBrains Mono' },
            callback: v => `${v}%`
          }
        }
      }
    }
  });

  chartRegistry[canvasId] = chart;
}

/**
 * 3. HORIZONTAL BAR CHART (Peringkat Tahun Terpilih, Terurut Descending)
 */
export function renderHorizontalBarChart(canvasId, segment = "Pekerja", yearIndex = 2, selectedDb = null, isDark = true) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const t = getThemeColors(isDark);
  const activeSegment = segment === "Bandingkan" ? "Pekerja" : segment;

  // Siapkan dan urutkan data secara menurun
  const items = DATA.databases.map(db => ({
    db,
    val: DATA.segments[activeSegment][db][yearIndex],
    color: DB_COLORS[db].hex,
    rgb: DB_COLORS[db].rgb
  })).sort((a, b) => b.val - a.val);

  const labels = items.map(i => i.db);
  const data = items.map(i => i.val);
  const bgColors = items.map(i => {
    const isHighlighted = selectedDb === null || selectedDb === i.db;
    return isHighlighted ? `rgba(${i.rgb}, 0.85)` : `rgba(${i.rgb}, 0.2)`;
  });
  const borderColors = items.map(i => i.color);

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: `Penggunaan ${DATA.years[yearIndex]} (%)`,
        data,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: t.tooltipBg,
          titleColor: t.tooltipText,
          bodyColor: t.tooltipText,
          borderColor: t.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: ctx => ` Popularitas: ${formatPercent(ctx.parsed.x, 1)}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: t.gridColor },
          ticks: {
            color: t.textColor,
            font: { family: 'JetBrains Mono' },
            callback: v => `${v}%`
          },
          suggestedMax: Math.max(...data) + 8
        },
        y: {
          grid: { display: false },
          ticks: {
            color: t.textColor,
            font: { family: 'Plus Jakarta Sans', weight: '600' }
          }
        }
      }
    },
    plugins: [{
      id: 'barValueLabels',
      afterDatasetsDraw(chartInstance) {
        const { ctx } = chartInstance;
        chartInstance.data.datasets.forEach((dataset, i) => {
          const meta = chartInstance.getDatasetMeta(i);
          meta.data.forEach((bar, index) => {
            const value = dataset.data[index];
            ctx.fillStyle = t.textColor;
            ctx.font = '600 12px "JetBrains Mono"';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${formatPercent(value, 1)}`, bar.x + 8, bar.y);
          });
        });
      }
    }]
  });

  chartRegistry[canvasId] = chart;
}

/**
 * 4. DONUT CHART PANGSA RELATIF (dengan center text DB teratas)
 */
export function renderDonutShareChart(canvasId, segment = "Pekerja", yearIndex = 2, selectedDb = null, isDark = true) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const t = getThemeColors(isDark);
  const activeSegment = segment === "Bandingkan" ? "Pekerja" : segment;
  const relShare = calculateRelativeShare(DATA.segments[activeSegment], yearIndex);

  // Cari database teratas
  let topDb = "";
  let topShare = 0;
  DATA.databases.forEach(db => {
    if (relShare[db] > topShare) {
      topShare = relShare[db];
      topDb = db;
    }
  });

  const labels = DATA.databases;
  const data = labels.map(db => relShare[db]);
  const bgColors = labels.map(db => {
    const isHighlighted = selectedDb === null || selectedDb === db;
    return isHighlighted ? DB_COLORS[db].hex : `rgba(${DB_COLORS[db].rgb}, 0.25)`;
  });

  const chart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: bgColors,
        borderColor: isDark ? "#0F172A" : "#FFFFFF",
        borderWidth: 2,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          position: 'right',
          labels: {
            color: t.textColor,
            usePointStyle: true,
            boxWidth: 8,
            font: { family: 'Plus Jakarta Sans', size: 12 }
          }
        },
        tooltip: {
          backgroundColor: t.tooltipBg,
          titleColor: t.tooltipText,
          bodyColor: t.tooltipText,
          borderColor: t.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: ctx => ` Pangsa: ${formatPercent(ctx.parsed, 1)}`
          }
        }
      }
    },
    plugins: [{
      id: 'centerTextPlugin',
      beforeDraw(chartInstance) {
        const { width, height, ctx } = chartInstance;
        ctx.save();
        
        // Tentukan teks yang ditampilkan di tengah (DB terpilih atau DB teratas)
        const targetDb = selectedDb || topDb;
        const targetVal = relShare[targetDb];

        const centerX = chartInstance.getDatasetMeta(0).data[0] ? chartInstance.getDatasetMeta(0).data[0].x : width / 2;
        const centerY = chartInstance.getDatasetMeta(0).data[0] ? chartInstance.getDatasetMeta(0).data[0].y : height / 2;

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.font = '600 11px "Plus Jakarta Sans"';
        ctx.fillStyle = isDark ? "#94A3B8" : "#64748B";
        ctx.fillText(targetDb, centerX, centerY - 12);

        ctx.font = '700 20px "JetBrains Mono"';
        ctx.fillStyle = DB_COLORS[targetDb] ? DB_COLORS[targetDb].hex : (isDark ? "#FFFFFF" : "#0F172A");
        ctx.fillText(formatPercent(targetVal, 1), centerX, centerY + 12);

        ctx.restore();
      }
    }]
  });

  chartRegistry[canvasId] = chart;
}

/**
 * 5. 100% STACKED BAR CHART (Pergeseran Komposisi Pangsa Pasar per Tahun)
 */
export function renderStackedBarShareChart(canvasId, segment = "Pekerja", selectedDb = null, isDark = true) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const t = getThemeColors(isDark);
  const activeSegment = segment === "Bandingkan" ? "Pekerja" : segment;

  const datasets = DATA.databases.map(db => {
    const isHighlighted = selectedDb === null || selectedDb === db;
    const shareVals = DATA.years.map((_, yIdx) => {
      const shareMap = calculateRelativeShare(DATA.segments[activeSegment], yIdx);
      return shareMap[db];
    });

    return {
      label: db,
      data: shareVals,
      backgroundColor: isHighlighted ? DB_COLORS[db].hex : `rgba(${DB_COLORS[db].rgb}, 0.25)`,
      borderColor: isDark ? "#0F172A" : "#FFFFFF",
      borderWidth: 1.5
    };
  });

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: DATA.years.map(y => `Tahun ${y}`),
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: t.textColor,
            usePointStyle: true,
            boxWidth: 8,
            font: { family: 'Plus Jakarta Sans', size: 11 }
          }
        },
        tooltip: {
          backgroundColor: t.tooltipBg,
          titleColor: t.tooltipText,
          bodyColor: t.tooltipText,
          borderColor: t.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatPercent(ctx.parsed.y, 1)}`
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          grid: { display: false },
          ticks: { color: t.textColor, font: { family: 'Plus Jakarta Sans', weight: '600' } }
        },
        y: {
          stacked: true,
          max: 100,
          grid: { color: t.gridColor },
          ticks: {
            color: t.textColor,
            font: { family: 'JetBrains Mono' },
            callback: v => `${v}%`
          }
        }
      }
    }
  });

  chartRegistry[canvasId] = chart;
}

/**
 * 6. BUMP CHART / RANK CHANGE CHART (Custom SVG)
 */
export function renderBumpChart(containerId, segment = "Pekerja", selectedDb = null, onSelectDb = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const activeSegment = segment === "Bandingkan" ? "Pekerja" : segment;
  const ranks2023 = calculateRankings(DATA.segments[activeSegment], 0);
  const ranks2024 = calculateRankings(DATA.segments[activeSegment], 1);
  const ranks2025 = calculateRankings(DATA.segments[activeSegment], 2);

  const width = container.clientWidth || 650;
  const height = 320;
  const padLeft = 45;
  const padRight = 140;
  const padTop = 30;
  const padBottom = 30;

  const xCoords = [
    padLeft,
    padLeft + (width - padLeft - padRight) / 2,
    width - padRight
  ];

  // Y coords untuk ranks 1 s/d 6
  const getY = (rank) => padTop + (rank - 1) * ((height - padTop - padBottom) / 5);

  let pathsHtml = "";
  let nodesHtml = "";

  DATA.databases.forEach(db => {
    const r1 = ranks2023[db];
    const r2 = ranks2024[db];
    const r3 = ranks2025[db];

    const y1 = getY(r1);
    const y2 = getY(r2);
    const y3 = getY(r3);

    const isShifted = r1 !== r3;
    const isHighlighted = selectedDb === null || selectedDb === db;
    const color = DB_COLORS[db].hex;
    const opacity = isHighlighted ? 1 : 0.2;
    const strokeWidth = selectedDb === db ? 5 : (isShifted ? 3.5 : 2.5);

    // Spline kurva bezier dari (x1, y1) ke (x2, y2) ke (x3, y3)
    const midX1 = (xCoords[0] + xCoords[1]) / 2;
    const midX2 = (xCoords[1] + xCoords[2]) / 2;
    const d = `M ${xCoords[0]} ${y1} C ${midX1} ${y1}, ${midX1} ${y2}, ${xCoords[1]} ${y2} C ${midX2} ${y2}, ${midX2} ${y3}, ${xCoords[2]} ${y3}`;

    pathsHtml += `
      <path d="${d}" 
            fill="none" 
            stroke="${color}" 
            stroke-width="${strokeWidth}" 
            opacity="${opacity}" 
            stroke-linecap="round"
            class="bump-curve cursor-pointer transition-all duration-300"
            data-db="${db}" />
    `;

    // Titik lingkaran dengan angka peringkat
    const rankPoints = [
      { x: xCoords[0], y: y1, rank: r1 },
      { x: xCoords[1], y: y2, rank: r2 },
      { x: xCoords[2], y: y3, rank: r3 }
    ];

    rankPoints.forEach(pt => {
      nodesHtml += `
        <g class="cursor-pointer" data-db="${db}" opacity="${opacity}">
          <circle cx="${pt.x}" cy="${pt.y}" r="12" fill="${color}" stroke="#0F172A" stroke-width="2.5" />
          <text x="${pt.x}" y="${pt.y}" text-anchor="middle" dominant-baseline="central" fill="#FFFFFF" font-size="11" font-weight="700" font-family="'JetBrains Mono', monospace">${pt.rank}</text>
        </g>
      `;
    });

    // Label nama database di sebelah kanan
    const deltaRank = r1 - r3; // Positif berarti naik (misal r1=3, r3=2 -> +1)
    let deltaBadge = `<tspan fill="#94A3B8">●</tspan>`;
    if (deltaRank > 0) deltaBadge = `<tspan fill="#10B981">▲ +${deltaRank}</tspan>`;
    if (deltaRank < 0) deltaBadge = `<tspan fill="#F43F5E">▼ ${deltaRank}</tspan>`;

    nodesHtml += `
      <g class="cursor-pointer" data-db="${db}" opacity="${opacity}">
        <text x="${xCoords[2] + 20}" y="${y3}" dominant-baseline="central" fill="${isHighlighted ? '#F8FAFC' : '#94A3B8'}" font-size="12" font-weight="600" font-family="'Plus Jakarta Sans', sans-serif">
          ${db} ${deltaBadge}
        </text>
      </g>
    `;
  });

  // Label Tahun Sumbu X
  let yearsLabels = `
    <text x="${xCoords[0]}" y="${padTop - 12}" text-anchor="middle" fill="#94A3B8" font-size="12" font-weight="600" font-family="'JetBrains Mono'">2023</text>
    <text x="${xCoords[1]}" y="${padTop - 12}" text-anchor="middle" fill="#94A3B8" font-size="12" font-weight="600" font-family="'JetBrains Mono'">2024</text>
    <text x="${xCoords[2]}" y="${padTop - 12}" text-anchor="middle" fill="#94A3B8" font-size="12" font-weight="600" font-family="'JetBrains Mono'">2025</text>
  `;

  // Grid garis horisontal samar
  let gridLines = "";
  for (let r = 1; r <= 6; r++) {
    const y = getY(r);
    gridLines += `
      <line x1="${padLeft}" y1="${y}" x2="${xCoords[2]}" y2="${y}" stroke="rgba(51, 65, 85, 0.25)" stroke-dasharray="3,3" />
      <text x="${padLeft - 18}" y="${y}" dominant-baseline="central" text-anchor="end" fill="#64748B" font-size="11" font-family="'JetBrains Mono'">#${r}</text>
    `;
  }

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="w-full h-auto select-none" preserveAspectRatio="xMidYMid meet">
      ${gridLines}
      ${yearsLabels}
      ${pathsHtml}
      ${nodesHtml}
    </svg>
  `;

  // Event listener interaktif untuk SVG bump chart
  if (onSelectDb) {
    container.querySelectorAll('[data-db]').forEach(el => {
      el.addEventListener('click', (e) => {
        const targetDb = el.getAttribute('data-db');
        onSelectDb(targetDb);
      });
    });
  }
}

/**
 * 7. RADAR CHART (Pekerja vs Pelajar 6 Dimensi Database)
 */
export function renderRadarComparisonChart(canvasId, yearIndex = 2, isDark = true) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const t = getThemeColors(isDark);
  const dataPekerja = DATA.databases.map(db => DATA.segments.Pekerja[db][yearIndex]);
  const dataPelajar = DATA.databases.map(db => DATA.segments.Pelajar[db][yearIndex]);

  const chart = new Chart(canvas, {
    type: 'radar',
    data: {
      labels: DATA.databases,
      datasets: [
        {
          label: 'Pekerja (Profesional)',
          data: dataPekerja,
          borderColor: '#6366F1',
          backgroundColor: 'rgba(99, 102, 241, 0.25)',
          borderWidth: 2.5,
          pointBackgroundColor: '#6366F1',
          pointRadius: 4
        },
        {
          label: 'Pelajar (Edukasi)',
          data: dataPelajar,
          borderColor: '#06B6D4',
          backgroundColor: 'rgba(6, 182, 212, 0.25)',
          borderWidth: 2.5,
          borderDash: [5, 4],
          pointBackgroundColor: '#06B6D4',
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: t.textColor, font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' } }
        },
        tooltip: {
          backgroundColor: t.tooltipBg,
          titleColor: t.tooltipText,
          bodyColor: t.tooltipText,
          borderColor: t.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${formatPercent(ctx.parsed.r, 1)}`
          }
        }
      },
      scales: {
        r: {
          angleLines: { color: t.gridColor },
          grid: { color: t.gridColor },
          pointLabels: {
            color: t.textColor,
            font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' }
          },
          ticks: {
            backdropColor: 'transparent',
            color: isDark ? "#64748B" : "#94A3B8",
            font: { family: 'JetBrains Mono', size: 9 },
            callback: v => `${v}%`
          },
          suggestedMin: 0,
          suggestedMax: 60
        }
      }
    }
  });

  chartRegistry[canvasId] = chart;
}

/**
 * 8. DIVERGING / BUTTERFLY BAR CHART (Selisih Pekerja - Pelajar)
 */
export function renderDivergingBarChart(canvasId, yearIndex = 2, isDark = true) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const t = getThemeColors(isDark);
  const diffs = DATA.databases.map(db => ({
    db,
    diff: DATA.segments.Pekerja[db][yearIndex] - DATA.segments.Pelajar[db][yearIndex]
  })).sort((a, b) => b.diff - a.diff);

  const labels = diffs.map(d => d.db);
  const data = diffs.map(d => d.diff);
  const bgColors = data.map(v => v >= 0 ? 'rgba(99, 102, 241, 0.85)' : 'rgba(245, 158, 11, 0.85)');
  const borderColors = data.map(v => v >= 0 ? '#4F46E5' : '#D97706');

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Selisih (Pekerja - Pelajar)',
        data,
        backgroundColor: bgColors,
        borderColor: borderColors,
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: t.tooltipBg,
          titleColor: t.tooltipText,
          bodyColor: t.tooltipText,
          borderColor: t.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: ctx => {
              const val = ctx.parsed.x;
              const side = val >= 0 ? "Lebih dominan di Pekerja" : "Lebih dominan di Pelajar";
              return ` Selisih: ${formatDelta(val, 1)} (${side})`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: t.gridColor },
          ticks: {
            color: t.textColor,
            font: { family: 'JetBrains Mono' },
            callback: v => `${v > 0 ? '+' : ''}${v} pp`
          }
        },
        y: {
          grid: { display: false },
          ticks: { color: t.textColor, font: { family: 'Plus Jakarta Sans', weight: '600' } }
        }
      }
    }
  });

  chartRegistry[canvasId] = chart;
}

/**
 * 9. SCATTER PLOT DENGAN GARIS REGRESI LINEAR (Pekerja vs Pelajar)
 */
export function renderScatterRegressionChart(canvasId, yearIndex = 2, isDark = true) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return null;

  const t = getThemeColors(isDark);
  const xVals = DATA.databases.map(db => DATA.segments.Pekerja[db][yearIndex]);
  const yVals = DATA.databases.map(db => DATA.segments.Pelajar[db][yearIndex]);

  const reg = linearRegression(xVals, yVals);

  // Titik scatter 6 database
  const scatterPoints = DATA.databases.map(db => ({
    x: DATA.segments.Pekerja[db][yearIndex],
    y: DATA.segments.Pelajar[db][yearIndex],
    db
  }));

  // Garis regresi (2 titik ujung: min X dan max X)
  const minX = Math.min(...xVals) - 5;
  const maxX = Math.max(...xVals) + 5;
  const linePoints = [
    { x: minX, y: reg.slope * minX + reg.intercept },
    { x: maxX, y: reg.slope * maxX + reg.intercept }
  ];

  const chart = new Chart(canvas, {
    type: 'scatter',
    data: {
      datasets: [
        {
          type: 'line',
          label: `Tren Regresi (${reg.formula})`,
          data: linePoints,
          borderColor: '#F43F5E',
          borderWidth: 2,
          borderDash: [6, 4],
          fill: false,
          pointRadius: 0
        },
        {
          type: 'scatter',
          label: 'Database',
          data: scatterPoints,
          pointBackgroundColor: DATA.databases.map(db => DB_COLORS[db].hex),
          pointBorderColor: isDark ? "#0F172A" : "#FFFFFF",
          pointBorderWidth: 2,
          pointRadius: 8,
          pointHoverRadius: 11
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: t.textColor, font: { family: 'Plus Jakarta Sans', size: 12 } }
        },
        tooltip: {
          backgroundColor: t.tooltipBg,
          titleColor: t.tooltipText,
          bodyColor: t.tooltipText,
          borderColor: t.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: function(ctx) {
              const raw = ctx.raw;
              if (raw.db) {
                return ` ${raw.db}: Pekerja ${formatPercent(raw.x, 1)} | Pelajar ${formatPercent(raw.y, 1)}`;
              }
              return ` Regresi: y = ${formatIDN(raw.y, 1)}%`;
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Popularitas di Kalangan Pekerja (%)',
            color: t.textColor,
            font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' }
          },
          grid: { color: t.gridColor },
          ticks: {
            color: t.textColor,
            font: { family: 'JetBrains Mono' },
            callback: v => `${v}%`
          }
        },
        y: {
          title: {
            display: true,
            text: 'Popularitas di Kalangan Pelajar (%)',
            color: t.textColor,
            font: { family: 'Plus Jakarta Sans', size: 12, weight: '600' }
          },
          grid: { color: t.gridColor },
          ticks: {
            color: t.textColor,
            font: { family: 'JetBrains Mono' },
            callback: v => `${v}%`
          }
        }
      }
    }
  });

  chartRegistry[canvasId] = chart;
  return reg;
}

/**
 * 10. HEATMAP MATRIX (Database x [Tahun x Segmen])
 */
export function renderHeatmap(containerId, selectedDb = null, onSelectDb = null) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const cols = [
    { seg: "Pekerja", yrIdx: 0, label: "Pekerja '23" },
    { seg: "Pekerja", yrIdx: 1, label: "Pekerja '24" },
    { seg: "Pekerja", yrIdx: 2, label: "Pekerja '25" },
    { seg: "Pelajar", yrIdx: 0, label: "Pelajar '23" },
    { seg: "Pelajar", yrIdx: 1, label: "Pelajar '24" },
    { seg: "Pelajar", yrIdx: 2, label: "Pelajar '25" }
  ];

  // Cari min dan max global untuk interpolasi warna
  let minVal = 100;
  let maxVal = 0;
  DATA.databases.forEach(db => {
    cols.forEach(col => {
      const v = DATA.segments[col.seg][db][col.yrIdx];
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    });
  });

  // Fungsi penghitung warna interpolasi heat
  const getHeatColor = (val) => {
    const ratio = (val - minVal) / (maxVal - minVal);
    // Interpolasi dari slate gelap (ratio 0) ke indigo terang / cyan (ratio 1)
    const r = Math.round(30 + ratio * (99 - 30));
    const g = Math.round(41 + ratio * (102 - 41));
    const b = Math.round(59 + ratio * (241 - 59));
    const alpha = 0.25 + ratio * 0.75;
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  };

  let tableHtml = `
    <div class="overflow-x-auto">
      <table class="w-full text-sm border-separate border-spacing-2">
        <thead>
          <tr>
            <th class="p-2 text-left font-semibold text-slate-400">Database</th>
            ${cols.map(c => `
              <th class="p-2 text-center font-semibold text-slate-300 bg-slate-800/40 rounded-lg">
                <span class="block text-xs text-slate-400">${c.seg}</span>
                <span class="font-mono text-sm">${2023 + c.yrIdx}</span>
              </th>
            `).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  DATA.databases.forEach(db => {
    const isHighlighted = selectedDb === null || selectedDb === db;
    const rowClass = isHighlighted ? "" : "opacity-30";

    tableHtml += `
      <tr class="transition-opacity duration-300 ${rowClass}">
        <td class="p-2.5 font-medium flex items-center gap-2 cursor-pointer" data-db="${db}">
          <span class="w-3 h-3 rounded-full" style="background-color: ${DB_COLORS[db].hex}"></span>
          <span class="text-slate-200 hover:text-indigo-400 font-semibold">${db}</span>
        </td>
    `;

    cols.forEach(col => {
      const val = DATA.segments[col.seg][db][col.yrIdx];
      const heatBg = getHeatColor(val);
      const isTop = val > 45;

      tableHtml += `
        <td class="p-3 text-center heatmap-cell font-mono-num font-semibold text-slate-100 cursor-pointer"
            style="background: ${heatBg}; border: 1px solid rgba(99, 102, 241, 0.25);"
            title="${db} (${col.seg} ${2023 + col.yrIdx}): ${formatPercent(val, 1)}"
            data-db="${db}">
          ${formatPercent(val, 1)}
          ${isTop ? '<span class="text-[10px] ml-0.5 text-amber-300">★</span>' : ''}
        </td>
      `;
    });

    tableHtml += `</tr>`;
  });

  tableHtml += `
        </tbody>
      </table>
    </div>

    <!-- Skala Legenda Heatmap -->
    <div class="mt-4 flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/70">
      <div class="flex items-center gap-2">
        <span>Rendah (${formatPercent(minVal, 1)})</span>
        <div class="w-36 h-3 rounded-md" style="background: linear-gradient(to right, rgba(30, 41, 59, 0.4), rgba(99, 102, 241, 1));"></div>
        <span>Tinggi (${formatPercent(maxVal, 1)})</span>
      </div>
      <div class="text-[11px] text-slate-500">
        *Warna menunjukkan intensitas penetrasi penggunaan
      </div>
    </div>
  `;

  container.innerHTML = tableHtml;

  if (onSelectDb) {
    container.querySelectorAll('[data-db]').forEach(el => {
      el.addEventListener('click', () => {
        onSelectDb(el.getAttribute('data-db'));
      });
    });
  }
}

/**
 * 11. BOX-AND-WHISKER PLOT (Custom SVG untuk Distribusi Persentase per Tahun)
 */
export function renderBoxPlot(containerId, segment = "Pekerja", isDark = true) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const activeSegment = segment === "Bandingkan" ? "Pekerja" : segment;
  const width = container.clientWidth || 550;
  const height = 280;
  const padLeft = 60;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;

  // Nilai skala Y dari 0 s/d 65%
  const minY = 0;
  const maxY = 65;
  const scaleY = (v) => height - padBottom - ((v - minY) / (maxY - minY)) * (height - padTop - padBottom);

  const colWidth = (width - padLeft - padRight) / 3;

  let boxesHtml = "";
  let gridLines = "";

  // Garis kisi horisontal
  for (let tick = 0; tick <= 60; tick += 10) {
    const yPos = scaleY(tick);
    gridLines += `
      <line x1="${padLeft}" y1="${yPos}" x2="${width - padRight}" y2="${yPos}" stroke="rgba(51, 65, 85, 0.25)" stroke-dasharray="3,3" />
      <text x="${padLeft - 10}" y="${yPos}" dominant-baseline="central" text-anchor="end" fill="#64748B" font-size="11" font-family="'JetBrains Mono'">${tick}%</text>
    `;
  }

  DATA.years.forEach((yr, idx) => {
    const vals = DATA.databases.map(db => DATA.segments[activeSegment][db][idx]);
    const q = quartiles(vals);

    const xCenter = padLeft + idx * colWidth + colWidth / 2;
    const boxW = Math.min(60, colWidth * 0.45);

    const yMin = scaleY(q.min);
    const yMax = scaleY(q.max);
    const yQ1 = scaleY(q.q1);
    const yQ2 = scaleY(q.q2);
    const yQ3 = scaleY(q.q3);

    // Whiskers (garis vertikal Min ke Q1 dan Q3 ke Max)
    boxesHtml += `
      <!-- Whisker Min ke Q1 -->
      <line x1="${xCenter}" y1="${yMin}" x2="${xCenter}" y2="${yQ1}" stroke="#818CF8" stroke-width="2" />
      <line x1="${xCenter - 14}" y1="${yMin}" x2="${xCenter + 14}" y2="${yMin}" stroke="#818CF8" stroke-width="2" />

      <!-- Whisker Q3 ke Max -->
      <line x1="${xCenter}" y1="${yQ3}" x2="${xCenter}" y2="${yMax}" stroke="#818CF8" stroke-width="2" />
      <line x1="${xCenter - 14}" y1="${yMax}" x2="${xCenter + 14}" y2="${yMax}" stroke="#818CF8" stroke-width="2" />

      <!-- Kotak IQR (Q1 s/d Q3) -->
      <rect x="${xCenter - boxW / 2}" y="${yQ3}" width="${boxW}" height="${yQ1 - yQ3}" 
            fill="rgba(99, 102, 241, 0.25)" stroke="#6366F1" stroke-width="2" rx="4" />

      <!-- Garis Median (Q2) -->
      <line x1="${xCenter - boxW / 2}" y1="${yQ2}" x2="${xCenter + boxW / 2}" y2="${yQ2}" stroke="#F43F5E" stroke-width="3" />
    `;

    // Titik data mentah individual (Strip plot jittered overlay)
    vals.forEach((v, vIdx) => {
      const db = DATA.databases[vIdx];
      const yVal = scaleY(v);
      const jitterX = xCenter + (vIdx % 2 === 0 ? 1 : -1) * (14 + (vIdx % 3) * 6);
      boxesHtml += `
        <circle cx="${jitterX}" cy="${yVal}" r="4.5" fill="${DB_COLORS[db].hex}" stroke="#0F172A" stroke-width="1.5" opacity="0.9">
          <title>${db}: ${formatPercent(v, 1)}</title>
        </circle>
      `;
    });

    // Label Tahun
    boxesHtml += `
      <text x="${xCenter}" y="${height - 12}" text-anchor="middle" fill="#94A3B8" font-size="12" font-weight="600" font-family="'Plus Jakarta Sans'">
        Tahun ${yr}
      </text>
    `;
  });

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="w-full h-auto" preserveAspectRatio="xMidYMid meet">
      ${gridLines}
      ${boxesHtml}
    </svg>
    <div class="mt-2 text-center text-xs text-slate-400">
      <span class="inline-flex items-center gap-1.5 mr-4"><span class="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span> Garis Merah = Median (Q2)</span>
      <span class="inline-flex items-center gap-1.5"><span class="w-2.5 h-2.5 bg-indigo-500/40 border border-indigo-500 rounded-sm"></span> Kotak = Rentang Antarkuartil (IQR Q1–Q3)</span>
    </div>
  `;
}

/**
 * 12. ERROR-BAR CHART (Mean +/- SD per Database)
 */
export function renderErrorBarChart(canvasId, segment = "Pekerja", isDark = true) {
  destroyChart(canvasId);
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const t = getThemeColors(isDark);
  const activeSegment = segment === "Bandingkan" ? "Pekerja" : segment;

  const statsList = DATA.databases.map(db => {
    const vals = DATA.segments[activeSegment][db];
    const m = mean(vals);
    const sd = stdDev(vals, true);
    return { db, mean: m, sd };
  });

  const labels = statsList.map(s => s.db);
  const dataMeans = statsList.map(s => s.mean);

  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Rata-rata 3 Tahun (Mean)',
        data: dataMeans,
        backgroundColor: DATA.databases.map(db => `rgba(${DB_COLORS[db].rgb}, 0.65)`),
        borderColor: DATA.databases.map(db => DB_COLORS[db].hex),
        borderWidth: 1.5,
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: t.tooltipBg,
          titleColor: t.tooltipText,
          bodyColor: t.tooltipText,
          borderColor: t.tooltipBorder,
          borderWidth: 1,
          callbacks: {
            label: ctx => {
              const idx = ctx.dataIndex;
              const s = statsList[idx];
              return [
                ` Rata-rata: ${formatPercent(s.mean, 2)}`,
                ` Simpangan Baku (SD): ±${formatIDN(s.sd, 2)} pp`
              ];
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: t.textColor, font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
        },
        y: {
          grid: { color: t.gridColor },
          ticks: {
            color: t.textColor,
            font: { family: 'JetBrains Mono' },
            callback: v => `${v}%`
          },
          suggestedMax: 65
        }
      }
    },
    plugins: [{
      id: 'errorBarsPlugin',
      afterDatasetsDraw(chartInstance) {
        const { ctx } = chartInstance;
        const meta = chartInstance.getDatasetMeta(0);

        meta.data.forEach((bar, idx) => {
          const s = statsList[idx];
          const yAxis = chartInstance.scales.y;
          const yTop = yAxis.getPixelForValue(s.mean + s.sd);
          const yBottom = yAxis.getPixelForValue(Math.max(0, s.mean - s.sd));
          const x = bar.x;

          ctx.save();
          ctx.strokeStyle = isDark ? '#FFFFFF' : '#0F172A';
          ctx.lineWidth = 2;

          // Garis vertikal error
          ctx.beginPath();
          ctx.moveTo(x, yTop);
          ctx.lineTo(x, yBottom);
          ctx.stroke();

          // Cap atas
          ctx.beginPath();
          ctx.moveTo(x - 6, yTop);
          ctx.lineTo(x + 6, yTop);
          ctx.stroke();

          // Cap bawah
          ctx.beginPath();
          ctx.moveTo(x - 6, yBottom);
          ctx.lineTo(x + 6, yBottom);
          ctx.stroke();

          ctx.restore();
        });
      }
    }]
  });

  chartRegistry[canvasId] = chart;
}

/**
 * 13. SPARKLINE SVG MINI (Untuk Kartu KPI)
 */
export function renderSparklineSvg(dataPoints, colorHex = "#6366F1", width = 80, height = 30) {
  if (!dataPoints || dataPoints.length < 2) return "";
  const minVal = Math.min(...dataPoints);
  const maxVal = Math.max(...dataPoints);
  const rangeVal = maxVal - minVal || 1;

  const pad = 4;
  const points = dataPoints.map((val, idx) => {
    const x = pad + (idx / (dataPoints.length - 1)) * (width - 2 * pad);
    const y = height - pad - ((val - minVal) / rangeVal) * (height - 2 * pad);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return `
    <svg width="${width}" height="${height}" class="overflow-visible">
      <polyline points="${points.join(' ')}" fill="none" stroke="${colorHex}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${points[points.length - 1].split(',')[0]}" cy="${points[points.length - 1].split(',')[1]}" r="3" fill="${colorHex}" />
    </svg>
  `;
}
