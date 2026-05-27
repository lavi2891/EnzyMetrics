import { t } from "../i18n/index.js";

let kineticsChart = null;
let experimentSeries = [];
let currentSeriesId = null;
let latestPointId = null;
let nextPointId = 1;
let nextSeriesId = 1;

const DEFAULT_CANVAS_SELECTOR = "#kineticsChart";
const DEFAULT_DATASET_LABEL_KEY = "chart.datasetLabel";
const MUTED_SERIES_COLOR = "#94a3b8";
const SERIES_COLORS = [
  "#2563eb",
  "#16a34a",
  "#ca8a04",
  "#dc2626",
  "#7c3aed",
  "#0891b2",
];

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const parsed = Number.parseInt(value, 16);

  return {
    r: (parsed >> 16) & 255,
    g: (parsed >> 8) & 255,
    b: parsed & 255,
  };
}

function rgba(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

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
    t("series.label", {
      number,
      enzyme: conditions.enzymeConcentration ?? "?",
      temp: conditions.temperature ?? "?",
      inhibitor: conditions.inhibitorConcentration ?? "?",
    });

  return {
    id,
    number,
    label,
    color: series.color ?? SERIES_COLORS[(number - 1) % SERIES_COLORS.length],
    conditions,
    points: Array.isArray(series.points) ? series.points : [],
  };
}

function normalizeExperimentPoint(point) {
  const normalized = {
    id: point.id ?? `experiment-${nextPointId++}`,
    seriesId: point.seriesId ?? null,
    substrateConcentration: Number(
      point.x ?? point.concentration ?? point.substrateConcentration,
    ),
    averageVelocity: Number(point.y ?? point.velocity ?? point.averageVelocity),
    productsFormed: Number(point.productsFormed ?? 0),
    measurementSeconds: Number(point.measurementSeconds ?? 0),
    normalizedMeasurementSeconds: Number(
      point.normalizedMeasurementSeconds ?? point.measurementSeconds ?? 0,
    ),
    averageOccupancyPercent: Number(point.averageOccupancyPercent ?? 0),
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

function getCommittedSeries() {
  return experimentSeries.filter((series) => series.points.length > 0);
}

function normalizeConditions(conditions = {}) {
  return {
    enzymeConcentration: Number(conditions.enzymeConcentration),
    temperature: Number(conditions.temperature),
    inhibitorConcentration: Number(conditions.inhibitorConcentration),
  };
}

function conditionsMatch(a = {}, b = {}) {
  const left = normalizeConditions(a);
  const right = normalizeConditions(b);

  return (
    left.enzymeConcentration === right.enzymeConcentration &&
    left.temperature === right.temperature &&
    left.inhibitorConcentration === right.inhibitorConcentration
  );
}

function getSeriesByConditions(conditions) {
  return experimentSeries.find((series) => conditionsMatch(series.conditions, conditions)) ?? null;
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
  return getCommittedSeries().flatMap((series) =>
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

  const committedSeries = getCommittedSeries();

  kineticsChart.data.datasets = committedSeries.map((series) => {
    const isCurrentSeries = series.id === currentSeriesId;
    const points = getSortedPoints(series.points);
    const color = series.color;

    return {
      label: series.label,
      data: points.map((point) => ({
        x: point.substrateConcentration,
        y: point.averageVelocity,
      })),
      borderColor: isCurrentSeries ? color : rgba(color, 0.35),
      backgroundColor: isCurrentSeries
        ? rgba(color, 0.16)
        : "rgba(148, 163, 184, 0.1)",
      pointBackgroundColor: points.map((point) => {
        if (isCurrentSeries && point.id === latestPointId) {
          return color;
        }

        return isCurrentSeries ? rgba(color, 0.55) : MUTED_SERIES_COLOR;
      }),
      pointBorderColor: isCurrentSeries ? color : "#64748b",
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
  const experimentPoint = normalizeExperimentPoint(point);
  const conditions = point.seriesConditions ?? point.conditions;
  let series =
    getSeriesById(experimentPoint.seriesId) ??
    (conditions ? getSeriesByConditions(conditions) : null) ??
    (conditions ? null : getSeriesById(currentSeriesId));

  if (!series) {
    series = createExperimentSeries({
      conditions,
      label: point.seriesLabel,
    });
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
  return getCommittedSeries().map((series) => ({
    ...series,
    points: getSortedPoints(series.points),
    current: series.id === currentSeriesId,
  }));
}

export function exportExperimentPointsCsv(filename = "enzymetrics-experiments.csv") {
  const headers = [
    t("csv.seriesLabel"),
    t("csv.substrateConcentration"),
    t("csv.averageVelocity"),
    t("csv.productsFormed"),
    t("csv.measurementSeconds"),
    t("csv.normalizedMeasurementSeconds"),
    t("csv.averageOccupancyPercent"),
    t("csv.speedMultiplier"),
    t("csv.timestamp"),
  ];
  const rows = getAllSortedPoints().map((point) => [
    point.seriesLabel,
    point.substrateConcentration,
    point.averageVelocity,
    point.productsFormed,
    point.measurementSeconds,
    point.normalizedMeasurementSeconds,
    point.averageOccupancyPercent,
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
            text: t("chart.xAxis"),
          },
          beginAtZero: true,
        },
        y: {
          title: {
            display: true,
            text: options.datasetLabel ?? t(DEFAULT_DATASET_LABEL_KEY),
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
              return t("chart.tooltipVelocity", {
                label: context.dataset.label,
                velocity: context.parsed.y.toFixed(2),
              });
            },
            afterLabel(context) {
              const series = getCommittedSeries()[context.datasetIndex];
              const point = getSortedPoints(series?.points ?? [])[context.dataIndex];

              return point
                ? t("chart.tooltipDetails", {
                    occupancy: point.averageOccupancyPercent,
                    time: point.normalizedMeasurementSeconds,
                  })
                : "";
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
