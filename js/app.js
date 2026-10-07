/**
 * app.js
 * Modul utama aplikasi: state management, event handling,
 * kalkulasi KPI & tabel dinamis, auto-interpretasi, dan inisialisasi visualisasi.
 */

import { DATA, DB_COLORS } from './data.js';
import {
  formatIDN,
  formatPercent,
  formatDelta,
  mean,
  median,
  mode,
  min,
  max,
  range,
  variance,
  stdDev,
  coeffOfVariation,
  absChange,
  relChange,
  cagr,
  avgAnnualGrowth,
  quartiles,
  skewness,
  pearsonCorrelation,
  calculateRankings,
  calculateRelativeShare,
  calculateDbStats
} from './stats.js';

import {
  renderTrendLineChart,
  renderGroupedBarChart,
  renderHorizontalBarChart,
  renderDonutShareChart,
  renderStackedBarShareChart,
  renderBumpChart,
  renderRadarComparisonChart,
  renderDivergingBarChart,
  renderScatterRegressionChart,
  renderHeatmap,
  renderBoxPlot,
  renderErrorBarChart,
  renderSparklineSvg,
  downloadChartAsPNG
} from './charts.js';

// Global App State
const state = {
  segment: "Pekerja",     // "Pekerja" | "Pelajar" | "Bandingkan"
  yearIndex: 2,           // 0: 2023, 1: 2024, 2: 2025
  selectedDb: null,       // null atau string DB terpilih (Cross-highlight)
  isSample: true,         // true = n-1 (sampel), false = n (populasi)
  isDark: true,           // true = tema gelap, false = terang
  sortColumn: "mean",     // kolom urut tabel statistik
  sortAsc: false          // arah urut tabel
};

/**
 * Inisialisasi Tema (Dark/Light)
 */
function initTheme() {
  const savedTheme = localStorage.getItem("theme");
  // Default ke tema gelap utama sesuai spesifikasi desain SaaS
  state.isDark = savedTheme ? savedTheme === "dark" : true;

  applyTheme(state.isDark);

  const themeToggle = document.getElementById("themeToggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      state.isDark = !state.isDark;
      localStorage.setItem("theme", state.isDark ? "dark" : "light");
      applyTheme(state.isDark);
      renderAllVisualizations();
    });
  }
}

function applyTheme(isDark) {
  const html = document.documentElement;
  const iconSun = document.getElementById("iconSun");
  const iconMoon = document.getElementById("iconMoon");

  if (isDark) {
    html.classList.add("dark");
    html.classList.remove("light");
    if (iconSun && iconMoon) {
      iconSun.classList.remove("hidden");
      iconMoon.classList.add("hidden");
    }
  } else {
    html.classList.remove("dark");
    html.classList.add("light");
    if (iconSun && iconMoon) {
      iconSun.classList.add("hidden");
      iconMoon.classList.remove("hidden");
    }
  }
}

/**
 * Update Banner Sorotan Database Aktif
 */
function updateHighlightBanner() {
  const banner = document.getElementById("highlightBanner");
  const nameEl = document.getElementById("highlightDbName");
  const dotEl = document.getElementById("highlightDbDot");

  if (!banner) return;

  if (state.selectedDb) {
    banner.classList.remove("hidden");
    if (nameEl) nameEl.textContent = state.selectedDb;
    if (dotEl) dotEl.style.backgroundColor = DB_COLORS[state.selectedDb].hex;
  } else {
    banner.classList.add("hidden");
  }

  // Update pills di Quick Highlight Bar
  document.querySelectorAll("[data-highlight-pill]").forEach(el => {
    const db = el.getAttribute("data-highlight-pill");
    if (state.selectedDb === db) {
      el.classList.add("ring-2", "ring-white", "scale-105");
      el.classList.remove("opacity-60");
    } else if (state.selectedDb !== null) {
      el.classList.remove("ring-2", "ring-white", "scale-105");
      el.classList.add("opacity-50");
    } else {
      el.classList.remove("ring-2", "ring-white", "scale-105", "opacity-50");
    }
  });
}

/**
 * Toggle Cross-Highlighting Database
 */
export function toggleSelectDb(dbName) {
  if (state.selectedDb === dbName) {
    state.selectedDb = null;
  } else {
    state.selectedDb = dbName;
  }
  updateHighlightBanner();
  renderAllVisualizations();
  renderGrowthCards();
  renderRankingsTable();
  renderStatsTable();
}

/**
 * 1. Render Baris KPI (4 Kartu dengan Sparkline & Data Dinamis)
 */
function renderKPICards() {
  const activeSegment = state.segment === "Bandingkan" ? "Pekerja" : state.segment;
  const segData = DATA.segments[activeSegment];

  // 1. Database Terpopuler 2025
  let topDb = "";
  let topVal = -1;
  DATA.databases.forEach(db => {
    const val = segData[db][2];
    if (val > topVal) {
      topVal = val;
      topDb = db;
    }
  });

  const kpi1Title = document.getElementById("kpi1Title");
  const kpi1Val = document.getElementById("kpi1Val");
  const kpi1Sub = document.getElementById("kpi1Sub");
  const kpi1Spark = document.getElementById("kpi1Spark");

  if (kpi1Title) kpi1Title.textContent = topDb;
  if (kpi1Val) kpi1Val.textContent = formatPercent(topVal, 1);
  if (kpi1Sub) kpi1Sub.textContent = `Peringkat #1 (${activeSegment} 2025)`;
  if (kpi1Spark) kpi1Spark.innerHTML = renderSparklineSvg(segData[topDb], DB_COLORS[topDb].hex);

  // 2. Pertumbuhan Tertinggi 2023->2025 (selisih pp)
  let maxGrowthDb = "";
  let maxGrowthDiff = -999;
  DATA.databases.forEach(db => {
    const diff = segData[db][2] - segData[db][0];
    if (diff > maxGrowthDiff) {
      maxGrowthDiff = diff;
      maxGrowthDb = db;
    }
  });

  const kpi2Title = document.getElementById("kpi2Title");
  const kpi2Val = document.getElementById("kpi2Val");
  const kpi2Sub = document.getElementById("kpi2Sub");
  const kpi2Spark = document.getElementById("kpi2Spark");

  if (kpi2Title) kpi2Title.textContent = maxGrowthDb;
  if (kpi2Val) kpi2Val.textContent = formatDelta(maxGrowthDiff, 1);
  if (kpi2Sub) kpi2Sub.textContent = `2023 (${formatPercent(segData[maxGrowthDb][0], 1)}) → 2025 (${formatPercent(segData[maxGrowthDb][2], 1)})`;
  if (kpi2Spark) kpi2Spark.innerHTML = renderSparklineSvg(segData[maxGrowthDb], DB_COLORS[maxGrowthDb].hex);

  // 3. Database Paling Stabil (Simpangan Baku terkecil)
  let mostStableDb = "";
  let minSD = 999;
  DATA.databases.forEach(db => {
    const sd = stdDev(segData[db], state.isSample);
    if (sd < minSD) {
      minSD = sd;
      mostStableDb = db;
    }
  });

  const kpi3Title = document.getElementById("kpi3Title");
  const kpi3Val = document.getElementById("kpi3Val");
  const kpi3Sub = document.getElementById("kpi3Sub");
  const kpi3Spark = document.getElementById("kpi3Spark");

  if (kpi3Title) kpi3Title.textContent = mostStableDb;
  if (kpi3Val) kpi3Val.textContent = `±${formatIDN(minSD, 2)} pp`;
  if (kpi3Sub) kpi3Sub.textContent = `SD terendah (Volatilitas minimum)`;
  if (kpi3Spark) kpi3Spark.innerHTML = renderSparklineSvg(segData[mostStableDb], DB_COLORS[mostStableDb].hex);

  // 4. Rata-rata Penggunaan Seluruh Database 2025
  const allVals2025 = DATA.databases.map(db => segData[db][2]);
  const avg2025 = mean(allVals2025);
  const avgTrend = [
    mean(DATA.databases.map(db => segData[db][0])),
    mean(DATA.databases.map(db => segData[db][1])),
    avg2025
  ];

  const kpi4Title = document.getElementById("kpi4Title");
  const kpi4Val = document.getElementById("kpi4Val");
  const kpi4Sub = document.getElementById("kpi4Sub");
  const kpi4Spark = document.getElementById("kpi4Spark");

  if (kpi4Title) kpi4Title.textContent = "Rata-rata Keseluruhan";
  if (kpi4Val) kpi4Val.textContent = formatPercent(avg2025, 1);
  if (kpi4Sub) kpi4Sub.textContent = `Mean dari 6 database tahun 2025`;
  if (kpi4Spark) kpi4Spark.innerHTML = renderSparklineSvg(avgTrend, "#38BDF8");
}

/**
 * 2. Render Kartu Pertumbuhan (Section 3 Kanan)
 */
function renderGrowthCards() {
  const container = document.getElementById("growthListContainer");
  if (!container) return;

  const activeSegment = state.segment === "Bandingkan" ? "Pekerja" : state.segment;
  const segData = DATA.segments[activeSegment];

  let html = "";
  DATA.databases.forEach(db => {
    const v23 = segData[db][0];
    const v24 = segData[db][1];
    const v25 = segData[db][2];

    const d1 = v24 - v23;
    const d2 = v25 - v24;
    const totalD = v25 - v23;

    // Kategori tren: Stabil bila |perubahan total| < 1 poin
    let trendBadge = "";
    if (Math.abs(totalD) < 1.0) {
      trendBadge = `<span class="px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-700/60 text-slate-300">● Stabil</span>`;
    } else if (totalD > 0) {
      trendBadge = `<span class="px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-500/20 text-emerald-400">▲ Naik</span>`;
    } else {
      trendBadge = `<span class="px-2 py-0.5 text-[11px] font-semibold rounded bg-rose-500/20 text-rose-400">▼ Turun</span>`;
    }

    const isHighlighted = state.selectedDb === null || state.selectedDb === db;
    const activeBorder = state.selectedDb === db ? `border-l-4` : `border-l-2`;

    html += `
      <div class="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 transition-all cursor-pointer hover:bg-slate-800/70 ${activeBorder} ${isHighlighted ? '' : 'opacity-35'}"
           style="border-left-color: ${DB_COLORS[db].hex}"
           data-growth-db="${db}">
        <div class="flex items-center justify-between mb-1.5">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${DB_COLORS[db].hex}"></span>
            <span class="font-semibold text-sm text-slate-200">${db}</span>
          </div>
          ${trendBadge}
        </div>
        <div class="grid grid-cols-3 gap-2 text-xs font-mono-num text-slate-400 pt-1 border-t border-slate-700/30">
          <div>
            <span class="text-[10px] text-slate-500 block">23 → 24</span>
            <span class="${d1 >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-medium">
              ${d1 >= 0 ? '+' : ''}${formatIDN(d1, 1)} pp
            </span>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 block">24 → 25</span>
            <span class="${d2 >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-medium">
              ${d2 >= 0 ? '+' : ''}${formatIDN(d2, 1)} pp
            </span>
          </div>
          <div>
            <span class="text-[10px] text-slate-500 block">Total 23→25</span>
            <span class="${totalD >= 0 ? 'text-emerald-400' : 'text-rose-400'} font-bold">
              ${totalD >= 0 ? '+' : ''}${formatIDN(totalD, 1)} pp
            </span>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll("[data-growth-db]").forEach(el => {
    el.addEventListener("click", () => {
      toggleSelectDb(el.getAttribute("data-growth-db"));
    });
  });
}

/**
 * 3. Render Tabel Peringkat (Section 6 Kanan)
 */
function renderRankingsTable() {
  const container = document.getElementById("rankingsTableBody");
  if (!container) return;

  const activeSegment = state.segment === "Bandingkan" ? "Pekerja" : state.segment;
  const segData = DATA.segments[activeSegment];

  const r23 = calculateRankings(segData, 0);
  const r24 = calculateRankings(segData, 1);
  const r25 = calculateRankings(segData, 2);

  // Urutkan berdasarkan peringkat 2025
  const sortedDbs = [...DATA.databases].sort((a, b) => r25[a] - r25[b]);

  let html = "";
  sortedDbs.forEach(db => {
    const rank23 = r23[db];
    const rank24 = r24[db];
    const rank25 = r25[db];
    const delta = rank23 - rank25; // > 0 berarti naik peringkat

    let deltaBadge = `<span class="inline-flex items-center gap-1 text-slate-400 text-xs">● Tetap</span>`;
    if (delta > 0) {
      deltaBadge = `<span class="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">▲ +${delta}</span>`;
    } else if (delta < 0) {
      deltaBadge = `<span class="inline-flex items-center gap-1 text-rose-400 text-xs font-semibold">▼ ${delta}</span>`;
    }

    const isHighlighted = state.selectedDb === null || state.selectedDb === db;
    const rowClass = isHighlighted ? "" : "opacity-30";

    html += `
      <tr class="border-b border-slate-800/50 hover:bg-slate-800/30 transition-all cursor-pointer ${rowClass}" data-rank-db="${db}">
        <td class="py-2.5 px-3 flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${DB_COLORS[db].hex}"></span>
          <span class="font-semibold text-slate-200 text-xs md:text-sm">${db}</span>
        </td>
        <td class="py-2.5 px-2 text-center font-mono-num text-xs text-slate-400">#${rank23}</td>
        <td class="py-2.5 px-2 text-center font-mono-num text-xs text-slate-400">#${rank24}</td>
        <td class="py-2.5 px-2 text-center font-mono-num text-xs font-bold text-slate-100">#${rank25}</td>
        <td class="py-2.5 px-3 text-right">${deltaBadge}</td>
      </tr>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll("[data-rank-db]").forEach(el => {
    el.addEventListener("click", () => {
      toggleSelectDb(el.getAttribute("data-rank-db"));
    });
  });
}

/**
 * 4. Render Tabel Statistik Deskriptif Utama & Sortable
 */
function renderStatsTable() {
  const tbody = document.getElementById("statsTableBody");
  if (!tbody) return;

  const activeSegment = state.segment === "Bandingkan" ? "Pekerja" : state.segment;
  const segData = DATA.segments[activeSegment];

  // Hitung statistik untuk 6 database
  let statsList = DATA.databases.map(db => {
    return calculateDbStats(db, segData[db], state.isSample);
  });

  // Pengurutan tabel
  statsList.sort((a, b) => {
    let valA = a[state.sortColumn];
    let valB = b[state.sortColumn];

    if (typeof valA === "string") {
      return state.sortAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return state.sortAsc ? valA - valB : valB - valA;
  });

  let html = "";
  statsList.forEach(s => {
    const isHighlighted = state.selectedDb === null || state.selectedDb === s.database;
    const rowClass = isHighlighted ? "" : "opacity-30";

    html += `
      <tr class="border-b border-slate-800/40 hover:bg-slate-800/40 transition-all font-mono-num text-xs md:text-sm cursor-pointer ${rowClass}"
          data-stats-db="${s.database}">
        <td class="py-3 px-3.5 font-sans font-semibold text-slate-200 flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full flex-shrink-0" style="background-color: ${DB_COLORS[s.database].hex}"></span>
          <span>${s.database}</span>
        </td>
        <td class="py-3 px-2 text-right font-medium text-indigo-300">${formatPercent(s.mean, 2)}</td>
        <td class="py-3 px-2 text-right text-slate-300">${formatPercent(s.median, 1)}</td>
        <td class="py-3 px-2 text-right text-slate-400 font-sans text-xs">${s.mode}</td>
        <td class="py-3 px-2 text-right text-slate-400">${formatPercent(s.min, 1)}</td>
        <td class="py-3 px-2 text-right text-slate-400">${formatPercent(s.max, 1)}</td>
        <td class="py-3 px-2 text-right text-slate-300">${formatDelta(s.range, 1)}</td>
        <td class="py-3 px-2 text-right text-slate-400">${formatIDN(s.variance, 2)}</td>
        <td class="py-3 px-2 text-right font-semibold text-rose-300">±${formatIDN(s.stdDev, 2)}</td>
        <td class="py-3 px-2 text-right text-slate-300">${formatIDN(s.cv, 1)}%</td>
        <td class="py-3 px-2 text-right font-semibold ${s.deltaAbs >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
          ${formatDelta(s.deltaAbs, 1)}
        </td>
        <td class="py-3 px-2 text-right ${s.deltaRel >= 0 ? 'text-emerald-400' : 'text-rose-400'}">
          ${s.deltaRel >= 0 ? '+' : ''}${formatIDN(s.deltaRel, 1)}%
        </td>
        <td class="py-3 px-2 text-right font-bold text-amber-300">
          ${s.cagr >= 0 ? '+' : ''}${formatIDN(s.cagr, 2)}%
        </td>
        <td class="py-3 px-2 text-right text-slate-300">
          ${s.avgAnnualGrowth >= 0 ? '+' : ''}${formatIDN(s.avgAnnualGrowth, 1)}%
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  tbody.querySelectorAll("[data-stats-db]").forEach(el => {
    el.addEventListener("click", () => {
      toggleSelectDb(el.getAttribute("data-stats-db"));
    });
  });

  // Update interpretasi otomatis di bawah tabel statistik
  renderStatsInterpretation(activeSegment, statsList);
}

/**
 * 5. Render Interpretasi Otomatis Tabel Statistik
 */
function renderStatsInterpretation(segmentName, statsList) {
  const el = document.getElementById("statsTableInterpretation");
  if (!el) return;

  // Temukan DB dengan CAGR tertinggi dan varians terendah
  const highestCagr = [...statsList].sort((a, b) => b.cagr - a.cagr)[0];
  const lowestSd = [...statsList].sort((a, b) => a.stdDev - b.stdDev)[0];
  const highestMean = [...statsList].sort((a, b) => b.mean - a.mean)[0];

  el.innerHTML = `
    <div class="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs md:text-sm text-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
      <div class="flex items-center gap-2.5">
        <span class="text-indigo-400 text-lg">💡</span>
        <div>
          <span class="font-bold text-indigo-300">Interpretasi Analisis (${segmentName}):</span>
          <span>
            ${highestMean.database} mendominasi dengan rata-rata 3 tahun tertinggi (${formatPercent(highestMean.mean, 2)}).
            ${highestCagr.database} mencatatkan akselerasi pertumbuhan terkuat (CAGR ${formatIDN(highestCagr.cagr, 2)}%/tahun, delta ${formatDelta(highestCagr.deltaAbs, 1)}),
            sedangkan ${lowestSd.database} menunjukkan volatilitas terendah (SD ±${formatIDN(lowestSd.stdDev, 2)} pp) dengan tingkat stabilitas penggunaan tertinggi.
          </span>
        </div>
      </div>
      <div class="text-[11px] font-mono text-slate-400 whitespace-nowrap bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700/50">
        Rumus SD: ${state.isSample ? "Sampel (n−1)" : "Populasi (n)"}
      </div>
    </div>
  `;
}

/**
 * 6. Render Panel Statistik Gabungan Antar Database per Tahun
 */
function renderAggregateStats() {
  const container = document.getElementById("aggregateStatsContainer");
  if (!container) return;

  const activeSegment = state.segment === "Bandingkan" ? "Pekerja" : state.segment;
  const segData = DATA.segments[activeSegment];

  let html = "";
  DATA.years.forEach((yr, idx) => {
    const vals = DATA.databases.map(db => segData[db][idx]);
    const m = mean(vals);
    const med = median(vals);
    const q = quartiles(vals);
    const sd = stdDev(vals, state.isSample);
    const rng = range(vals);
    const skew = skewness(vals, state.isSample);

    html += `
      <div class="p-4 rounded-xl bg-slate-800/40 border border-slate-700/50 flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-700/50">
            <span class="font-bold text-sm text-slate-200">Tahun ${yr} (${activeSegment})</span>
            <span class="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">N = 6 Database</span>
          </div>
          
          <div class="grid grid-cols-2 gap-2.5 text-xs font-mono-num mb-3">
            <div><span class="text-slate-400">Rata-rata (Mean):</span> <b class="text-slate-200">${formatPercent(m, 1)}</b></div>
            <div><span class="text-slate-400">Median (Q2):</span> <b class="text-slate-200">${formatPercent(med, 1)}</b></div>
            <div><span class="text-slate-400">Kuartil 1 (Q1):</span> <b class="text-slate-300">${formatPercent(q.q1, 1)}</b></div>
            <div><span class="text-slate-400">Kuartil 3 (Q3):</span> <b class="text-slate-300">${formatPercent(q.q3, 1)}</b></div>
            <div><span class="text-slate-400">IQR (Q3 - Q1):</span> <b class="text-slate-300">${formatDelta(q.iqr, 1)}</b></div>
            <div><span class="text-slate-400">Simpangan Baku:</span> <b class="text-rose-300">±${formatIDN(sd, 2)}</b></div>
            <div><span class="text-slate-400">Min:</span> <b class="text-slate-300">${formatPercent(q.min, 1)}</b></div>
            <div><span class="text-slate-400">Maksimum:</span> <b class="text-slate-300">${formatPercent(q.max, 1)}</b></div>
          </div>
        </div>

        <div class="pt-2.5 border-t border-slate-700/40 text-[11px] text-slate-400 leading-relaxed">
          <span class="font-semibold text-slate-300 block mb-0.5">Kemiringan (Skewness): ${formatIDN(skew.value, 2)} (${skew.type})</span>
          ${skew.description}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * 7. Render Kartu Insight Otomatis (Section 10)
 */
function renderInsights() {
  const container = document.getElementById("insightsContainer");
  if (!container) return;

  const w = DATA.segments.Pekerja;
  const s = DATA.segments.Pelajar;

  // Insight 1: Pemimpin Pasar Tiap Segmen
  const leaderWorker = "PostgreSQL";
  const leaderStudent = "MySQL";

  // Insight 2: Lonjakan Terbesar Pelajar PostgreSQL
  const pgStudentGrowth = s["PostgreSQL"][2] - s["PostgreSQL"][0];
  const pgStudentCagr = cagr(s["PostgreSQL"][0], s["PostgreSQL"][2], 2);

  // Insight 3: Database Paling Stabil di Dunia Industri
  const mysqlWorkerDiff = w["MySQL"][2] - w["MySQL"][0];

  // Insight 4: Kesenjangan Enterprise
  const sqlServerGap = w["Microsoft SQL Server"][2] - s["Microsoft SQL Server"][2];

  // Insight 5: Pergeseran Peringkat Pelajar 2025
  const ranksStudent23 = calculateRankings(s, 0);
  const ranksStudent25 = calculateRankings(s, 2);

  const insights = [
    {
      title: "Dominasi Berbeda: Industri vs Pendidikan",
      icon: "🏆",
      badge: "Segmentasi Pasar",
      badgeColor: "bg-indigo-500/20 text-indigo-300",
      content: `Dunia kerja profesional dipimpin mutlak oleh <b>${leaderWorker}</b> (${formatPercent(w[leaderWorker][2], 1)}), sedangkan kalangan pelajar/edukasi tetap mengunggulkan <b>${leaderStudent}</b> (${formatPercent(s[leaderStudent][2], 1)}) karena kurikulum akademis yang ramah pemula.`
    },
    {
      title: "Akselerasi Masif PostgreSQL di Kampus",
      icon: "🚀",
      badge: "Pertumbuhan Tercepat",
      badgeColor: "bg-emerald-500/20 text-emerald-300",
      content: `PostgreSQL mencatatkan lonjakan tertinggi di kalangan pelajar sebesar <b>+${formatIDN(pgStudentGrowth, 1)} pp</b> (CAGR <b>${formatIDN(pgStudentCagr, 2)}%/tahun</b>), melompat dari peringkat #${ranksStudent23["PostgreSQL"]} pada 2023 menjadi #${ranksStudent25["PostgreSQL"]} pada 2025.`
    },
    {
      title: "Ketahanan Ekstrem MySQL di Kalangan Profesional",
      icon: "⚓",
      badge: "Paling Konsisten",
      badgeColor: "bg-cyan-500/20 text-cyan-300",
      content: `Di kalangan pekerja, MySQL menunjukkan stabilitas hampir mutlak (39,4% → 39,4% → 39,6%) dengan pergeseran hanya <b>${formatDelta(mysqlWorkerDiff, 1)}</b> selama 3 tahun, membuktikan basis legacy yang kokoh.`
    },
    {
      title: "Kesenjangan Enterprise (Pekerja vs Pelajar)",
      icon: "🏢",
      badge: "Enterprise Gap",
      badgeColor: "bg-rose-500/20 text-rose-300",
      content: `Microsoft SQL Server memiliki selisih penetrasi terbesar antara dunia kerja (${formatPercent(w["Microsoft SQL Server"][2], 1)}) dan pelajar (${formatPercent(s["Microsoft SQL Server"][2], 1)}), yaitu kesenjangan <b>${formatDelta(sqlServerGap, 1)}</b> akibat dependensi lisensi dan ekosistem enterprise.`
    },
    {
      title: "SQLite & Tren Database Tertanam",
      icon: "📱",
      badge: "Database Ringan",
      badgeColor: "bg-amber-500/20 text-amber-300",
      content: `SQLite stabil di posisi #3 bagi pekerja (${formatPercent(w["SQLite"][2], 1)}), didorong oleh booming pengembangan aplikasi mobile, edge devices, dan penyimpanan lokal AI ringan.`
    }
  ];

  let html = "";
  insights.forEach(item => {
    html += `
      <div class="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:border-indigo-500/40 transition-all hover-lift">
        <div class="flex items-center justify-between mb-3">
          <span class="text-2xl">${item.icon}</span>
          <span class="text-xs px-2.5 py-1 rounded-full font-semibold ${item.badgeColor}">${item.badge}</span>
        </div>
        <h4 class="font-bold text-sm md:text-base text-slate-100 mb-2">${item.title}</h4>
        <p class="text-xs md:text-sm text-slate-400 leading-relaxed">${item.content}</p>
      </div>
    `;
  });

  container.innerHTML = html;
}

/**
 * Render Semua Visualisasi Chart
 */
function renderAllVisualizations() {
  const isDark = state.isDark;
  const seg = state.segment;
  const yIdx = state.yearIndex;
  const selDb = state.selectedDb;

  // 1. Line Chart Tren
  renderTrendLineChart("chartTrendLine", seg, selDb, isDark);

  // 2. Grouped Bar Chart
  renderGroupedBarChart("chartGroupedBar", seg, selDb, isDark);

  // 3. Horizontal Bar Chart (Ranking tahun terpilih)
  renderHorizontalBarChart("chartHorizontalBar", seg, yIdx, selDb, isDark);

  // 4. Donut Share Chart
  renderDonutShareChart("chartDonutShare", seg, yIdx, selDb, isDark);

  // 5. Stacked Bar Share Chart
  renderStackedBarShareChart("chartStackedBar", seg, selDb, isDark);

  // 6. SVG Bump Chart
  renderBumpChart("bumpChartContainer", seg, selDb, toggleSelectDb);

  // 7. Radar Chart
  renderRadarComparisonChart("chartRadarCompare", yIdx, isDark);

  // 8. Diverging Bar Chart
  renderDivergingBarChart("chartDivergingBar", yIdx, isDark);

  // 9. Scatter Regression Chart
  const reg = renderScatterRegressionChart("chartScatterRegression", yIdx, isDark);
  if (reg) {
    const pearsonVals = [0.676, 0.795, 0.833];
    const rCurrent = pearsonVals[yIdx];
    const regBadge = document.getElementById("scatterRegBadge");
    if (regBadge) {
      regBadge.innerHTML = `Korelasi Pearson <b>r = ${formatIDN(rCurrent, 3)}</b> &bull; R² = <b>${formatIDN(rCurrent * rCurrent, 3)}</b>`;
    }
  }

  // 10. Heatmap
  renderHeatmap("heatmapContainer", selDb, toggleSelectDb);

  // 11. Box Plot SVG
  renderBoxPlot("boxPlotContainer", seg, isDark);

  // 12. Error Bar Chart
  renderErrorBarChart("chartErrorBar", seg, isDark);
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Toggle Segmen Global
  document.querySelectorAll("[data-segment-btn]").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetSeg = btn.getAttribute("data-segment-btn");
      state.segment = targetSeg;

      // Update button styling
      document.querySelectorAll("[data-segment-btn]").forEach(b => {
        if (b.getAttribute("data-segment-btn") === targetSeg) {
          b.className = "px-4 py-2 rounded-xl text-xs md:text-sm font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 transition-all";
        } else {
          b.className = "px-4 py-2 rounded-xl text-xs md:text-sm font-semibold bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all";
        }
      });

      // Update section Bandingkan prominence
      const compareSection = document.getElementById("sectionPerbandinganSegmen");
      if (compareSection) {
        if (targetSeg === "Bandingkan") {
          compareSection.classList.add("ring-2", "ring-indigo-500/50");
        } else {
          compareSection.classList.remove("ring-2", "ring-indigo-500/50");
        }
      }

      renderKPICards();
      renderGrowthCards();
      renderRankingsTable();
      renderStatsTable();
      renderAggregateStats();
      renderAllVisualizations();
    });
  });

  // Filter Tahun
  const yearSelect = document.getElementById("yearFilterSelect");
  if (yearSelect) {
    yearSelect.addEventListener("change", (e) => {
      state.yearIndex = parseInt(e.target.value, 10);
      document.querySelectorAll(".current-year-label").forEach(el => {
        el.textContent = DATA.years[state.yearIndex];
      });
      renderAllVisualizations();
    });
  }

  // Toggle Sampel vs Populasi Simpangan Baku
  const toggleVarianceBtn = document.getElementById("toggleVarianceType");
  if (toggleVarianceBtn) {
    toggleVarianceBtn.addEventListener("click", () => {
      state.isSample = !state.isSample;
      toggleVarianceBtn.textContent = state.isSample ? "Mode: Sampel (n−1)" : "Mode: Populasi (n)";
      renderKPICards();
      renderStatsTable();
      renderAggregateStats();
    });
  }

  // Tombol Reset Highlight
  const btnResetHighlight = document.getElementById("btnResetHighlight");
  if (btnResetHighlight) {
    btnResetHighlight.addEventListener("click", () => {
      state.selectedDb = null;
      updateHighlightBanner();
      renderAllVisualizations();
      renderGrowthCards();
      renderRankingsTable();
      renderStatsTable();
    });
  }

  // Quick Highlight Pill Buttons di Hero
  document.querySelectorAll("[data-highlight-pill]").forEach(el => {
    el.addEventListener("click", () => {
      toggleSelectDb(el.getAttribute("data-highlight-pill"));
    });
  });

  // Header Sorting Tabel Statistik
  document.querySelectorAll("th.sortable").forEach(th => {
    th.addEventListener("click", () => {
      const col = th.getAttribute("data-sort");
      if (state.sortColumn === col) {
        state.sortAsc = !state.sortAsc;
      } else {
        state.sortColumn = col;
        state.sortAsc = false;
      }

      document.querySelectorAll("th.sortable").forEach(t => {
        t.classList.remove("sort-asc", "sort-desc");
      });
      th.classList.add(state.sortAsc ? "sort-asc" : "sort-desc");

      renderStatsTable();
    });
  });

  // Tombol Download PNG pada kartu chart
  document.querySelectorAll("[data-download-target]").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-download-target");
      const name = btn.getAttribute("data-download-name") || "chart-statistik";
      downloadChartAsPNG(targetId, name);
    });
  });

  // Tombol Cetak / Simpan PDF
  const btnPrint = document.getElementById("btnPrintReport");
  if (btnPrint) {
    btnPrint.addEventListener("click", () => {
      window.print();
    });
  }

  // Tombol Scroll Kembali ke Atas
  const btnBackToTop = document.getElementById("btnBackToTop");
  if (btnBackToTop) {
    window.addEventListener("scroll", () => {
      if (window.scrollY > 400) {
        btnBackToTop.classList.remove("opacity-0", "pointer-events-none");
        btnBackToTop.classList.add("opacity-100");
      } else {
        btnBackToTop.classList.add("opacity-0", "pointer-events-none");
        btnBackToTop.classList.remove("opacity-100");
      }
    });

    btnBackToTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  // Resize listener untuk SVG responsif
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      renderBumpChart("bumpChartContainer", state.segment, state.selectedDb, toggleSelectDb);
      renderBoxPlot("boxPlotContainer", state.segment, state.isDark);
    }, 250);
  });
}

/**
 * ScrollSpy untuk Navbar Sticky
 */
function initScrollSpy() {
  const sections = document.querySelectorAll("section[id]");
  const navLinks = document.querySelectorAll("nav a[href^='#']");

  window.addEventListener("scroll", () => {
    let currentId = "";
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      if (window.pageYOffset >= sectionTop) {
        currentId = section.getAttribute("id");
      }
    });

    navLinks.forEach(link => {
      link.classList.remove("text-indigo-400", "font-bold");
      if (link.getAttribute("href") === `#${currentId}`) {
        link.classList.add("text-indigo-400", "font-bold");
      }
    });
  });
}

function init() {
  initTheme();
  setupEventListeners();
  renderKPICards();
  renderGrowthCards();
  renderRankingsTable();
  renderStatsTable();
  renderAggregateStats();
  renderInsights();
  renderAllVisualizations();
  initScrollSpy();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
