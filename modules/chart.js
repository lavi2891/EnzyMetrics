let kineticsChart = null;
let experimentPoints = [];
let latestPointId = null;
let nextPointId = 1;

const DEFAULT_CANVAS_SELECTOR = "#kineticsChart";
const DEFAULT_DATASET_LABEL = "Average Reaction Velocity";
const LATEST_POINT_COLOR = "#2563eb";
const OLDER_POINT_COLOR = "#94a3b8";

function getChartConstructor() {
  if (!window.Chart) {
    throw new Error("Chart.js must be loaded before initializing the kinetics chart.");
  }

  return window.Chart;
}

function getCanvas(canvasOrSelector = DEFAULT_CANVAS_SELECTOR) {
  if (canvasOrSelector instanceof HTMLCanvasElement) {
    return canvasOrSelector;
  }

  const canvas = document.querySelector(canvasOrSelector);

  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error(`Unable to find chart canvas: ${canvasOrSelector}`);
  }

  return canvas;
}

function normalizeExperimentPoint(point) {
  const normalized = {
    id: point.id ?? `experiment-${nextPointId++}`,
    substrateConcentration: Number(
      point.x ?? point.concentration ?? point.substrateConcentration,
    ),
    averageVelocity: Number(point.y ?? point.velocity ?? point.averageVelocity),
    productsFormed: Number(point.productsFormed ?? 0),
    measurementSeconds: Number(point.measurementSeconds ?? 0),
    speedMultiplier: Number(point.speedMultiplier ?? 1),
    timestamp: point.timestamp ?? new Date().toISOString(),
  };

  if (
    !Number.isFinite(normalized.substrateConcentration) ||
    !Number.isFinite(normalized.averageVelocity)
  ) {
    throw new TypeError(
      "Chart data points require numeric x/concentration and y/velocity values.",
    );
  }

  return normalized;
}

function getSortedExperimentPoints() {
  return [...experimentPoints].sort((a, b) => {
    const concentrationDifference = a.substrateConcentration - b.substrateConcentration;

    if (concentrationDifference !== 0) {
      return concentrationDifference;
    }

    return String(a.timestamp).localeCompare(String(b.timestamp));
  });
}

function updateChartFromExperiments() {
  if (!kineticsChart) {
    return;
  }

  const sortedPoints = getSortedExperimentPoints();
  const dataset = kineticsChart.data.datasets[0];
  const highestSubstrate = sortedPoints.reduce(
    (highest, point) => Math.max(highest, point.substrateConcentration),
    0,
  );

  dataset.data = sortedPoints.map((point) => ({
    x: point.substrateConcentration,
    y: point.averageVelocity,
  }));
  dataset.pointBackgroundColor = sortedPoints.map((point) =>
    point.id === latestPointId ? LATEST_POINT_COLOR : OLDER_POINT_COLOR,
  );
  dataset.pointBorderColor = sortedPoints.map((point) =>
    point.id === latestPointId ? "#1e3a8a" : "#64748b",
  );
  dataset.pointRadius = sortedPoints.map((point) => (point.id === latestPointId ? 6 : 4));
  dataset.pointHoverRadius = sortedPoints.map((point) => (point.id === latestPointId ? 8 : 6));

  kineticsChart.options.scales.x.suggestedMax = highestSubstrate > 0 ? highestSubstrate : 10;
  kineticsChart.update("none");
}

function csvEscape(value) {
  const text = String(value ?? "");

  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function initKineticsChart(canvasOrSelector = DEFAULT_CANVAS_SELECTOR, options = {}) {
  resetKineticsChart(canvasOrSelector, options);
  return kineticsChart;
}

export function updateKineticsChart(pointOrConcentration, velocity) {
  return addExperimentPoint(
    typeof pointOrConcentration === "object"
      ? pointOrConcentration
      : { substrateConcentration: pointOrConcentration, averageVelocity: velocity },
  );
}

export function addExperimentPoint(point) {
  const experimentPoint = normalizeExperimentPoint(point);

  experimentPoints.push(experimentPoint);
  latestPointId = experimentPoint.id;
  updateChartFromExperiments();

  return experimentPoint;
}

export function resetExperimentPoints() {
  experimentPoints = [];
  latestPointId = null;
  updateChartFromExperiments();
}

export function getExperimentPoints() {
  return getSortedExperimentPoints();
}

export function exportExperimentPointsCsv(filename = "enzymetrics-experiments.csv") {
  const headers = [
    "substrate_concentration",
    "average_velocity",
    "products_formed",
    "measurement_seconds",
    "speed_multiplier",
    "timestamp",
  ];
  const rows = getSortedExperimentPoints().map((point) => [
    point.substrateConcentration,
    point.averageVelocity,
    point.productsFormed,
    point.measurementSeconds,
    point.speedMultiplier,
    point.timestamp,
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map(csvEscape).join(","))
    .join("\n");
  const blob = new Blob([`${csv}\n`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function resetKineticsChart(canvasOrSelector = DEFAULT_CANVAS_SELECTOR, options = {}) {
  destroyKineticsChart();

  const Chart = getChartConstructor();
  const canvas = getCanvas(canvasOrSelector);

  kineticsChart = new Chart(canvas, {
    type: "scatter",
    data: {
      datasets: [
        {
          label: options.datasetLabel ?? DEFAULT_DATASET_LABEL,
          data: [],
          borderColor: "#2563eb",
          backgroundColor: "rgba(37, 99, 235, 0.18)",
          pointBackgroundColor: [],
          pointBorderColor: [],
          pointRadius: [],
          pointHoverRadius: [],
          showLine: true,
          tension: 0.25,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      parsing: false,
      scales: {
        x: {
          type: "linear",
          title: {
            display: true,
            text: "Initial Substrate Concentration",
          },
          beginAtZero: true,
        },
        y: {
          title: {
            display: true,
            text: "Average Reaction Velocity",
          },
          beginAtZero: true,
        },
      },
      plugins: {
        legend: {
          display: true,
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `Average velocity: ${context.parsed.y.toFixed(2)} products/sec`;
            },
          },
        },
      },
      ...options.chartOptions,
    },
  });

  updateChartFromExperiments();

  return kineticsChart;
}

export function destroyKineticsChart() {
  if (kineticsChart) {
    kineticsChart.destroy();
    kineticsChart = null;
  }
}

export function getKineticsChart() {
  return kineticsChart;
}
