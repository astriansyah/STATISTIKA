/**
 * stats.js
 * Kumpulan fungsi statistik murni (pure functions) untuk analisis deskriptif,
 * korelasi, regresi, dan kalkulasi turunan popularitas database.
 */

/**
 * Format angka ke standar Indonesia (koma desimal)
 * @param {number} val 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatIDN(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return "-";
  return Number(val).toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Format persentase ke standar Indonesia (misal: "58,2%")
 * @param {number} val 
 * @param {number} decimals 
 * @returns {string}
 */
export function formatPercent(val, decimals = 1) {
  if (val === null || val === undefined || isNaN(val)) return "-";
  return `${formatIDN(val, decimals)}%`;
}

/**
 * Format perubahan delta dengan tanda + atau - (misal: "+8,2 pp")
 * @param {number} val 
 * @param {number} decimals 
 * @param {string} unit 
 * @returns {string}
 */
export function formatDelta(val, decimals = 1, unit = "pp") {
  if (val === null || val === undefined || isNaN(val)) return "-";
  const prefix = val > 0 ? "+" : "";
  return `${prefix}${formatIDN(val, decimals)} ${unit}`;
}

/**
 * Menghitung rata-rata (mean)
 * @param {number[]} arr 
 * @returns {number}
 */
export function mean(arr) {
  if (!arr || arr.length === 0) return 0;
  const sum = arr.reduce((acc, v) => acc + v, 0);
  return sum / arr.length;
}

/**
 * Menghitung median (nilai tengah)
 * @param {number[]} arr 
 * @returns {number}
 */
export function median(arr) {
  if (!arr || arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 !== 0) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Menghitung modus (nilai yang paling sering muncul)
 * @param {number[]} arr 
 * @returns {number[]|null} Mengembalikan array angka modus atau null jika tidak ada
 */
export function mode(arr) {
  if (!arr || arr.length === 0) return null;
  const counts = {};
  let maxCount = 0;

  for (const val of arr) {
    // Normalisasi floating point 1 desimal
    const key = val.toFixed(1);
    counts[key] = (counts[key] || 0) + 1;
    if (counts[key] > maxCount) {
      maxCount = counts[key];
    }
  }

  // Jika frekuensi maksimum hanya 1, berarti semua nilai unik (tidak ada modus)
  if (maxCount <= 1) return null;

  const modes = Object.keys(counts)
    .filter(k => counts[k] === maxCount)
    .map(Number);

  return modes.length > 0 ? modes : null;
}

/**
 * Nilai minimum
 * @param {number[]} arr 
 * @returns {number}
 */
export function min(arr) {
  if (!arr || arr.length === 0) return 0;
  return Math.min(...arr);
}

/**
 * Nilai maksimum
 * @param {number[]} arr 
 * @returns {number}
 */
export function max(arr) {
  if (!arr || arr.length === 0) return 0;
  return Math.max(...arr);
}

/**
 * Rentang (Range = Max - Min)
 * @param {number[]} arr 
 * @returns {number}
 */
export function range(arr) {
  if (!arr || arr.length === 0) return 0;
  return max(arr) - min(arr);
}

/**
 * Varians (sample n-1 atau population n)
 * @param {number[]} arr 
 * @param {boolean} isSample 
 * @returns {number}
 */
export function variance(arr, isSample = true) {
  if (!arr || arr.length === 0) return 0;
  const m = mean(arr);
  const denom = isSample ? Math.max(1, arr.length - 1) : arr.length;
  const sumSquares = arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0);
  return sumSquares / denom;
}

/**
 * Simpangan Baku (Standard Deviation)
 * @param {number[]} arr 
 * @param {boolean} isSample 
 * @returns {number}
 */
export function stdDev(arr, isSample = true) {
  return Math.sqrt(variance(arr, isSample));
}

/**
 * Koefisien Variasi (CV = SD / Mean * 100%)
 * Mengukur dispersi relatif
 * @param {number[]} arr 
 * @param {boolean} isSample 
 * @returns {number}
 */
export function coeffOfVariation(arr, isSample = true) {
  const m = mean(arr);
  if (m === 0) return 0;
  const sd = stdDev(arr, isSample);
  return (sd / m) * 100;
}

/**
 * Perubahan absolut dalam poin persentase (pp)
 * @param {number} vStart 
 * @param {number} vEnd 
 * @returns {number}
 */
export function absChange(vStart, vEnd) {
  return vEnd - vStart;
}

/**
 * Perubahan relatif persentase
 * @param {number} vStart 
 * @param {number} vEnd 
 * @returns {number}
 */
export function relChange(vStart, vEnd) {
  if (vStart === 0) return 0;
  return ((vEnd - vStart) / vStart) * 100;
}

/**
 * Compound Annual Growth Rate (CAGR)
 * Rumus: (V_akhir / V_awal)^(1 / periods) - 1
 * @param {number} vStart 
 * @param {number} vEnd 
 * @param {number} periods Jumlah periode interval tahun (default 2 untuk 2023->2025)
 * @returns {number} Dalam persen (%)
 */
export function cagr(vStart, vEnd, periods = 2) {
  if (vStart <= 0 || vEnd <= 0) return 0;
  return (Math.pow(vEnd / vStart, 1 / periods) - 1) * 100;
}

/**
 * Rata-rata Pertumbuhan Tahunan
 * ((g1 + g2) / 2)
 * @param {number[]} arr Array [2023, 2024, 2025]
 * @returns {number}
 */
export function avgAnnualGrowth(arr) {
  if (!arr || arr.length < 2) return 0;
  const growths = [];
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] > 0) {
      growths.push(((arr[i + 1] - arr[i]) / arr[i]) * 100);
    }
  }
  return growths.length > 0 ? mean(growths) : 0;
}

/**
 * Kuartil Q1, Q2 (Median), Q3 dan Rentang Antarkuartil (IQR)
 * Menggunakan metode Tukey hinges
 * @param {number[]} arr 
 * @returns {{q1: number, q2: number, q3: number, iqr: number, min: number, max: number}}
 */
export function quartiles(arr) {
  if (!arr || arr.length === 0) {
    return { q1: 0, q2: 0, q3: 0, iqr: 0, min: 0, max: 0 };
  }
  const sorted = [...arr].sort((a, b) => a - b);
  const q2 = median(sorted);
  const mid = Math.floor(sorted.length / 2);
  
  let lowerHalf = [];
  let upperHalf = [];

  if (sorted.length % 2 === 0) {
    lowerHalf = sorted.slice(0, mid);
    upperHalf = sorted.slice(mid);
  } else {
    lowerHalf = sorted.slice(0, mid);
    upperHalf = sorted.slice(mid + 1);
  }

  const q1 = median(lowerHalf);
  const q3 = median(upperHalf);
  const iqr = q3 - q1;

  return {
    q1,
    q2,
    q3,
    iqr,
    min: sorted[0],
    max: sorted[sorted.length - 1]
  };
}

/**
 * Skewness (Kemiringan distribusi)
 * Menggunakan koefisien kemiringan momen Pearson / Fisher-Pearson
 * @param {number[]} arr 
 * @param {boolean} isSample 
 * @returns {{value: number, type: string, description: string}}
 */
export function skewness(arr, isSample = true) {
  if (!arr || arr.length < 3) {
    return { value: 0, type: "Simetris", description: "Data tidak cukup" };
  }
  const m = mean(arr);
  const s = stdDev(arr, isSample);
  if (s === 0) {
    return { value: 0, type: "Simetris", description: "Distribusi seragam sempurna" };
  }
  const n = arr.length;
  const sumCubed = arr.reduce((acc, v) => acc + Math.pow((v - m) / s, 3), 0);
  
  // Fisher-Pearson adjusted skewness
  let g1;
  if (isSample && n > 2) {
    g1 = (n / ((n - 1) * (n - 2))) * sumCubed;
  } else {
    g1 = sumCubed / n;
  }

  let type = "Simetris";
  let description = "Distribusi simetris relatif merata di sekitar nilai tengah";

  if (g1 > 0.5) {
    type = "Positif (Miring ke Kanan)";
    description = "Sebagian besar nilai terkonsentrasi di angka rendah, dengan ekor panjang database berpangsa tinggi.";
  } else if (g1 < -0.5) {
    type = "Negatif (Miring ke Kiri)";
    description = "Sebagian besar nilai terkonsentrasi di angka tinggi, dengan ekor ke angka rendah.";
  } else {
    type = "Mendekati Simetris";
    description = "Penyebaran database cukup merata di kedua sisi nilai rata-rata.";
  }

  return { value: g1, type, description };
}

/**
 * Korelasi Pearson antara dua kumpulan data (panjang sama)
 * @param {number[]} arrX 
 * @param {number[]} arrY 
 * @returns {number}
 */
export function pearsonCorrelation(arrX, arrY) {
  if (!arrX || !arrY || arrX.length !== arrY.length || arrX.length === 0) return 0;
  const n = arrX.length;
  const mX = mean(arrX);
  const mY = mean(arrY);

  let num = 0;
  let denX = 0;
  let denY = 0;

  for (let i = 0; i < n; i++) {
    const dx = arrX[i] - mX;
    const dy = arrY[i] - mY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const denom = Math.sqrt(denX * denY);
  if (denom === 0) return 0;
  return num / denom;
}

/**
 * Regresi Linear Sederhana (y = m * x + c)
 * @param {number[]} arrX 
 * @param {number[]} arrY 
 * @returns {{slope: number, intercept: number, r: number, r2: number, formula: string}}
 */
export function linearRegression(arrX, arrY) {
  if (!arrX || !arrY || arrX.length !== arrY.length || arrX.length === 0) {
    return { slope: 0, intercept: 0, r: 0, r2: 0, formula: "y = 0" };
  }
  const n = arrX.length;
  const mX = mean(arrX);
  const mY = mean(arrY);

  let num = 0;
  let den = 0;

  for (let i = 0; i < n; i++) {
    const dx = arrX[i] - mX;
    const dy = arrY[i] - mY;
    num += dx * dy;
    den += dx * dx;
  }

  const slope = den !== 0 ? num / den : 0;
  const intercept = mY - slope * mX;
  const r = pearsonCorrelation(arrX, arrY);
  const r2 = r * r;

  const sign = intercept >= 0 ? "+" : "-";
  const formula = `y = ${slope.toFixed(3)}x ${sign} ${Math.abs(intercept).toFixed(2)}`;

  return {
    slope,
    intercept,
    r,
    r2,
    formula
  };
}

/**
 * Menghitung Pangsa Relatif (Relative Market Share)
 * Pangsa Relatif = Nilai database / Total keenam database pada tahun & segmen yang sama (total 100%)
 * @param {Object} segmentData { "PostgreSQL": [val23, val24, val25], ... }
 * @param {number} yearIndex 0 (2023), 1 (2024), 2 (2025)
 * @returns {{[db: string]: number}}
 */
export function calculateRelativeShare(segmentData, yearIndex) {
  const result = {};
  let totalSum = 0;

  for (const db in segmentData) {
    totalSum += segmentData[db][yearIndex];
  }

  for (const db in segmentData) {
    result[db] = totalSum > 0 ? (segmentData[db][yearIndex] / totalSum) * 100 : 0;
  }

  return result;
}

/**
 * Menghitung Peringkat Database (Rank 1 s.d. 6)
 * @param {Object} segmentData 
 * @param {number} yearIndex 
 * @returns {{[db: string]: number}}
 */
export function calculateRankings(segmentData, yearIndex) {
  const entries = Object.keys(segmentData).map(db => ({
    db,
    val: segmentData[db][yearIndex]
  }));

  // Urutkan nilai tertinggi ke terendah
  entries.sort((a, b) => b.val - a.val);

  const ranks = {};
  entries.forEach((item, idx) => {
    ranks[item.db] = idx + 1;
  });

  return ranks;
}

/**
 * Ringkasan Statistik Lengkap untuk Satu Database dalam Satu Segmen
 * @param {string} dbName 
 * @param {number[]} values [2023, 2024, 2025]
 * @param {boolean} isSample 
 */
export function calculateDbStats(dbName, values, isSample = true) {
  const m = mean(values);
  const med = median(values);
  const mod = mode(values);
  const mn = min(values);
  const mx = max(values);
  const rng = range(values);
  const v = variance(values, isSample);
  const sd = stdDev(values, isSample);
  const cv = coeffOfVariation(values, isSample);
  const deltaAbs = absChange(values[0], values[2]);
  const deltaRel = relChange(values[0], values[2]);
  const cagrVal = cagr(values[0], values[2], 2);
  const avgGrowth = avgAnnualGrowth(values);

  return {
    database: dbName,
    values,
    mean: m,
    median: med,
    mode: mod ? mod.map(v => formatIDN(v, 1)).join(", ") : "Tidak ada",
    min: mn,
    max: mx,
    range: rng,
    variance: v,
    stdDev: sd,
    cv,
    deltaAbs,
    deltaRel,
    cagr: cagrVal,
    avgAnnualGrowth: avgGrowth
  };
}
