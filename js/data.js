/**
 * data.js
 * Sumber Data Mentah: Stack Overflow Developer Survey 2023, 2024, 2025
 * Kategori Database Relasional untuk segmen Pekerja (Professional Developers) dan Pelajar (Learning to code)
 */

export const DATA = {
  years: [2023, 2024, 2025],
  databases: [
    "PostgreSQL",
    "MySQL",
    "Microsoft SQL Server",
    "MariaDB",
    "Oracle",
    "SQLite"
  ],
  segments: {
    Pekerja: {
      "PostgreSQL": [50.0, 51.9, 58.2],
      "MySQL": [39.4, 39.4, 39.6],
      "Microsoft SQL Server": [29.0, 27.1, 30.9],
      "MariaDB": [17.3, 17.1, 21.7],
      "Oracle": [10.7, 10.3, 10.4],
      "SQLite": [32.2, 32.1, 36.9]
    },
    Pelajar: {
      "PostgreSQL": [23.4, 33.0, 39.2],
      "MySQL": [45.7, 45.0, 45.7],
      "Microsoft SQL Server": [12.4, 19.0, 18.5],
      "MariaDB": [12.3, 19.0, 19.2],
      "Oracle": [6.9, 9.0, 9.5],
      "SQLite": [26.9, 36.0, 26.9]
    }
  },
  sources: [
    { name: "Stack Overflow Developer Survey 2023", url: "https://survey.stackoverflow.co/2023/" },
    { name: "Stack Overflow Developer Survey 2024", url: "https://survey.stackoverflow.co/2024/" },
    { name: "Stack Overflow Developer Survey 2025", url: "https://survey.stackoverflow.co/2025/" }
  ]
};

// Skema warna konsisten untuk tiap database (kontras tinggi & ramah buta warna)
export const DB_COLORS = {
  "PostgreSQL": {
    hex: "#6366F1", // Indigo
    rgb: "99, 102, 241",
    bgLight: "rgba(99, 102, 241, 0.15)",
    border: "#4F46E5"
  },
  "MySQL": {
    hex: "#06B6D4", // Cyan
    rgb: "6, 182, 212",
    bgLight: "rgba(6, 182, 212, 0.15)",
    border: "#0891B2"
  },
  "Microsoft SQL Server": {
    hex: "#F43F5E", // Rose
    rgb: "244, 63, 94",
    bgLight: "rgba(244, 63, 94, 0.15)",
    border: "#E11D48"
  },
  "MariaDB": {
    hex: "#F59E0B", // Amber
    rgb: "245, 158, 11",
    bgLight: "rgba(245, 158, 11, 0.15)",
    border: "#D97706"
  },
  "Oracle": {
    hex: "#A855F7", // Purple (terpilih agar kontras dengan SQL Server)
    rgb: "168, 85, 247",
    bgLight: "rgba(168, 85, 247, 0.15)",
    border: "#9333EA"
  },
  "SQLite": {
    hex: "#10B981", // Emerald
    rgb: "16, 185, 129",
    bgLight: "rgba(16, 185, 129, 0.15)",
    border: "#059669"
  }
};
