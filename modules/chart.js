let kineticsChart = null;
let experimentSeries = [];
let currentSeriesId = null;
let latestPointId = null;
let nextPointId = 1;
let nextSeriesId = 1;

const DEFAULT_CANVAS_SELECTOR = "#kineticsChart";
const DEFAULT_DATASET_LABEL = "Average Reaction Velocity";
const CURRENT_COLOR = "#2563eb";
const CURRENT_OLDER_POINT_COLOR = "#93c5fd";
const MUTED_SERIES_COLOR = "#94a3b8";

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

function normalizeSeries(series = {}) {
  const id = series.id ?? `series-${nextSeriesId++}`;
  const number = series.number ?? experimentSeries.length + 1;
  const conditions = series.conditions ?? {};
  const label =
    series.label ??
    `Series ${number} -- enzyme ${conditions.enzymeConcentration ?? "?"} | temp ${
      conditions.temperature ?? "?"
    }C | inhibitor ${conditions.inhibitorConcentration ?? "?"}%`;

  return {
    id,
    number,
    label,
    conditions,
    points: Array.isArray(series.points) ? series.points : [],
  };
}

function normalizeExperimentPoint(point) {
  const normalized = {
    id: point.id ?? `experiment-${nextPointId++}`,
    seriesId: point.seriesId ?? currentSeriesId,
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

function getSeriesById(seriesId) {
  return experimentSeries.find((series) => series.id === seriesId) ?? null;
}

function getSortedPoints(points) {
  return [...points].sort((a, b) => {
    const concentrationDifference = a.substrateConcentration - b.substrateConcentration;

    if (concentrationDifference !== 0) {
      return concentrationDifference;
    }

    return String(a.timestamp).localeCompare(String(b.timestamp));
  });
}

function getAllSortedPoints() {
  return experimentSeries.flatMap((series) =>
    getSortedPoints(series.points).map((point) => ({
      ...point,
      seriesLabel: series.label,
    })),
  );
}

function getHighestSubstrate() {
  return getAllSortedPoints().reduce(
    (highest, point) => Math.max(highest, point.substrateConcentration),
    0,
  );
}

function updateChartFromExperiments() {
  if (!kineticsChart) {
    return;
  }

  kineticsChart.data.datasets = experimentSeries.map((series) => {
    const isCurrentSeries = series.id === currentSeriesId;
    const points = getSortedPoints(series.points);

    return {
      label: series.label,
      data: points.map((point) => ({
        x: point.substrateConcentration,
        y: point.averageVelocity,
      })),
      borderColor: isCurrentSeries ? CURRENT_COLOR : MUTED_SERIES_COLOR,
      backgroundColor: isCurrentSeries
        ? "rgba(37, 99, 235, 0.16)"
        : "rgba(148, 163, 184, 0.1)",
      pointBackgroundColor: points.map((point) => {
        if (isCurrentSeries && point.id === latestPointId) {
          return CURRENT_COLOR;
        }

        return isCurrentSeries ? CURRENT_OLDER_POINT_COLOR : MUTED_SERIES_COLOR;
      }),
      pointBorderColor: isCurrentSeries ? "#1e3a8a" : "#64748b",
      pointRadius: points.map((point) => (isCurrentSeries && point.id === latestPointId ? 6 : 4)),
      pointHoverRadius: points.map((point) =>
        isCurrentSeries && point.id === latestPointId ? 8 : 6,
      ),
      borderWidth: isCurrentSeries ? 3 : 2,
      showLine: true,
      tension: 0.25,
    };
  });

  kineticsChart.options.scales.x.suggestedMax = Math.max(10, getHighestSubstrate());
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

export function createExperimentSeries(series = {}) {
  const experimentSeriesEntry = normalizeSeries(series);

  experimentSeries.push(experimentSeriesEntry);
  currentSeriesId = experimentSeriesEntry.id;
  latestPointId = null;
  updateChartFromExperiments();

  return experimentSeriesEntry;
}

export function updateKineticsChart(pointOrConcentration, velocity) {
  return addExperimentPoint(
    typeof pointOrConcentration === "object"
      ? pointOrConcentration
      : { substrateConcentration: pointOrConcentration, averageVelocity: velocity },
  );
}

export function addExperimentPoint(point) {
  if (!currentSeriesId) {
    createExperimentSeries();
  }

  const experimentPoint = normalizeExperimentPoint(point);
  const series = getSeriesById(experimentPoint.seriesId) ?? getSeriesById(currentSeriesId);

  if (!series) {
    return null;
  }

  experimentPoint.seriesId = series.id;
  series.points.push(experimentPoint);
  currentSeriesId = series.id;
  latestPointId = experimentPoint.id;
  updateChartFromExperiments();

  return experimentPoint;
}

export function resetCurrentSeries() {
  const series = getSeriesById(currentSeriesId);

  if (series) {
    series.points = [];
  }

  latestPointId = null;
  updateChartFromExperiments();
}

export function resetExperimentPoints() {
  experimentSeries = [];
  currentSeriesId = null;
  latestPointId = null;
  nextPointId = 1;
  nextSeriesId = 1;
  updateChartFromExperiments();
}

export function getExperimentPoints(options = {}) {
  if (options.seriesId) {
    return getSortedPoints(getSeriesById(options.seriesId)?.points ?? []);
  }

  return getAllSortedPoints();
}

export function getExperimentSeries() {
  return experimentSeries.map((series) => ({
    ...series,
    points: getSortedPoints(series.points),
    current: series.id === currentSeriesId,
  }));
}

export function exportExperimentPointsCsv(filename = "enzymetrics-experiments.csv") {
  const headers = [
    "series_label",
    "substrate_concentration",
    "average_velocity",
    "products_formed",
    "measurement_seconds",
    "speed_multiplier",
    "timestamp",
  ];
  const rows = getAllSortedPoints().map((point) => [
    point.seriesLabel,
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
      datasets: [],
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
            text: options.datasetLabel ?? DEFAULT_DATASET_LABEL,
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
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} products/sec`;
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
