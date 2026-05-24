let kineticsChart = null;

const DEFAULT_CANVAS_SELECTOR = "#kineticsChart";
const DEFAULT_DATASET_LABEL = "Reaction Velocity";

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

function normalizePoint(pointOrConcentration, velocity) {
  if (typeof pointOrConcentration === "object" && pointOrConcentration !== null) {
    return {
      x: Number(pointOrConcentration.x ?? pointOrConcentration.concentration),
      y: Number(pointOrConcentration.y ?? pointOrConcentration.velocity),
    };
  }

  return {
    x: Number(pointOrConcentration),
    y: Number(velocity),
  };
}

function assertValidPoint(point) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    throw new TypeError(
      "Chart data points require numeric x/concentration and y/velocity values.",
    );
  }
}

export function initKineticsChart(canvasOrSelector = DEFAULT_CANVAS_SELECTOR, options = {}) {
  resetKineticsChart(canvasOrSelector, options);
  return kineticsChart;
}

export function updateKineticsChart(pointOrConcentration, velocity) {
  if (!kineticsChart) {
    return null;
  }

  const point = normalizePoint(pointOrConcentration, velocity);
  assertValidPoint(point);

  kineticsChart.data.datasets[0].data.push(point);
  kineticsChart.update("none");

  return point;
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
          pointBackgroundColor: "#2563eb",
          pointBorderColor: "#1e3a8a",
          pointRadius: 4,
          pointHoverRadius: 6,
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
            text: "Reaction Velocity",
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
              return `Velocity: ${context.parsed.y.toFixed(2)} products/sec`;
            },
          },
        },
      },
      ...options.chartOptions,
    },
  });

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
