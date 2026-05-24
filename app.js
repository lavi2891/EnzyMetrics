import { initCanvasSimulation } from "./modules/canvas.js";
import {
  addExperimentPoint,
  initKineticsChart,
  resetExperimentPoints,
} from "./modules/chart.js";
import { generateQuizQuestion } from "./modules/quiz.js";
import {
  buildTeacherReport,
  buildWordleShareText,
  copyWordleShareText,
  getStopwatchTime,
  sendTeacherReport,
  setTelemetry,
  startStopwatch,
  trackQuizAnswer,
} from "./modules/share.js";

export const enzymeScenarios = [
  {
    id: 1,
    name: "Amylase",
    source: "Human Saliva",
    optimalTemp: 37,
    km: 0.2,
    desc:
      "Amylase digests starch in your mouth, turning long carbohydrate chains into smaller sugars before food reaches the stomach.",
    imgUrl:
      "https://commons.wikimedia.org/wiki/Special:Redirect/file/Salivary_alpha-amylase_1SMD.png",
  },
  {
    id: 2,
    name: "Pepsin",
    source: "Human Stomach",
    optimalTemp: 38,
    km: 0.5,
    desc:
      "Pepsin breaks down proteins in highly acidic stomach conditions, where many other enzymes would lose their shape.",
    imgUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Pepsin.jpg",
  },
  {
    id: 3,
    name: "Taq Polymerase",
    source: "Hot Springs Bacteria",
    optimalTemp: 72,
    km: 0.1,
    desc:
      "Taq Polymerase thrives at high temperatures and is used in PCR labs to copy DNA through repeated heating cycles.",
    imgUrl: "https://commons.wikimedia.org/wiki/Special:Redirect/file/Taq.png",
  },
];

const DEFAULT_SUBSTRATE_COUNT = 12;
const DEFAULT_TEACHER_EMAIL = "teacher@example.com";
const MAX_SUBSTRATE_COUNT = 60;
const MEASUREMENT_SECONDS = 10;

const state = {
  scenario: null,
  params: null,
  simulation: null,
  chart: null,
  challengeId: "",
  productsGenerated: 0,
  runProductsGenerated: 0,
  stageStartedAt: 0,
  currentQuiz: null,
  timerId: null,
  measurementId: null,
  measurementStartedAt: 0,
  measuring: false,
  initialSubstrateConcentration: 0,
  resizeFrameId: null,
};

function qs(...selectors) {
  return selectors.map((selector) => document.querySelector(selector)).find(Boolean) ?? null;
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function withNoise(value, percent = 0.05) {
  const multiplier = 1 + (Math.random() * 2 - 1) * percent;
  return Number((value * multiplier).toFixed(3));
}

function buildChallengeId(scenario, params) {
  const seed = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${scenario.name.replace(/\s+/g, "-").toUpperCase()}-${seed}-KM${params.km}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getTemperatureValue() {
  const input = qs(
    "#temp-slider",
    "#temperature-slider",
    "#temperatureSlider",
    "[data-control='temperature']",
  );
  return Number(input?.value ?? state.params?.optimalTemp ?? state.scenario?.optimalTemp ?? 37);
}

function getSubstrateCountValue() {
  const input = qs("#substrate-slider", "#substrateSlider", "[data-control='substrate']");
  const sliderValue = Number(input?.value);

  if (!Number.isFinite(sliderValue)) {
    return DEFAULT_SUBSTRATE_COUNT;
  }

  return Math.max(1, Math.round((clamp(sliderValue, 0, 100) / 100) * MAX_SUBSTRATE_COUNT));
}

function getEnzymeCountValue() {
  const input = qs("#enzyme-slider", "#enzymeSlider", "[data-control='enzyme']");
  return Math.max(1, Math.round(Number(input?.value ?? 6)));
}

function getInhibitorValue() {
  const input = qs("#inhibitor-slider", "#inhibitorSlider", "[data-control='inhibitor']");
  return clamp(Number(input?.value ?? 0) / 100, 0, 1);
}

function getTeacherEmail() {
  const input = qs("#teacher-email", "#teacherEmail", "[data-control='teacher-email']");
  return input?.value || DEFAULT_TEACHER_EMAIL;
}

function getStudentName() {
  const input = qs("#student-name", "#studentName", "[data-control='student-name']");
  return input?.value || "";
}

function calculateTemperatureModifier(temperature, optimalTemp) {
  const deviation = Math.abs(temperature - optimalTemp);
  const gradualSlowdown = clamp(1 - deviation * 0.035, 0.35, 1);
  const denaturationPenalty = deviation > 15 ? 0.35 : 1;

  return gradualSlowdown * denaturationPenalty;
}

function calculatePhysicsOptions(params) {
  const temperature = getTemperatureValue();
  const temperatureModifier = calculateTemperatureModifier(temperature, params.optimalTemp);
  const affinityModifier = clamp(1 / (1 + params.km), 0.5, 1.2);
  const inhibitorModifier = clamp(1 - getInhibitorValue() * 0.75, 0.25, 1);

  return {
    substrateCount: getSubstrateCountValue(),
    maxSubstrateCount: MAX_SUBSTRATE_COUNT,
    enzymeRadius: 16,
    substrateSize: 12,
    productRadius: 6,
    baseSpeed: 34 * temperatureModifier * affinityModifier * inhibitorModifier,
    brownianJitter: 18 * temperatureModifier * inhibitorModifier,
    enzymeCount: Math.max(1, Math.round(getEnzymeCountValue() * inhibitorModifier)),
  };
}

function applyPhysicsOptions() {
  if (!state.simulation || !state.params) {
    return;
  }

  const nextOptions = calculatePhysicsOptions(state.params);
  const oldBaseSpeed = state.simulation.options.baseSpeed || 42;
  const velocityScale = clamp(nextOptions.baseSpeed / oldBaseSpeed, 0.25, 2);

  state.simulation.options = {
    ...state.simulation.options,
    ...nextOptions,
  };

  [...state.simulation.enzymes, ...state.simulation.substrates].forEach((particle) => {
    if (particle.velocity) {
      particle.velocity.x *= velocityScale;
      particle.velocity.y *= velocityScale;
    }
  });

  updateParameterReadout();
}

function populateScenarioBar() {
  const nameEl = qs("#enzyme-name", "#enzymeName", "[data-field='enzyme-name']");
  const sourceEl = qs("#enzyme-source", "#enzymeSource", "[data-field='enzyme-source']");
  const descEl = qs(
    "#scenario-text",
    "#enzyme-desc",
    "#enzymeDesc",
    "#scenario-desc",
    "[data-field='enzyme-desc']",
  );
  const imageEl = qs("#enzyme-pic", "#enzymePic", "[data-field='enzyme-pic']");

  if (nameEl) {
    nameEl.textContent = state.scenario.name;
  }

  if (sourceEl) {
    sourceEl.textContent = state.scenario.source;
  }

  if (descEl) {
    descEl.textContent = state.scenario.desc;
  }

  if (imageEl) {
    imageEl.src = state.scenario.imgUrl;
    imageEl.alt = `${state.scenario.name} from ${state.scenario.source}`;
  }
}

function updateParameterReadout() {
  const readout = qs("#parameter-readout", "#parameterReadout", "[data-field='parameters']");

  if (!readout || !state.params) {
    return;
  }

  readout.textContent = [
    `Temp: ${getTemperatureValue()}C`,
    `Optimal: ${state.params.optimalTemp}C`,
    `Km: ${state.params.km}`,
    `Inhibitor: ${Math.round(getInhibitorValue() * 100)}%`,
  ].join(" | ");
}

function getReactionVelocity() {
  const elapsedSeconds = Math.max((performance.now() - state.stageStartedAt) / 1000, 1);
  return Number((state.productsGenerated / elapsedSeconds).toFixed(2));
}

function setExperimentStatus(message) {
  const status = qs("#experiment-status", "[data-field='experiment-status']");

  if (status) {
    status.textContent = message;
  }
}

function setMeasurementControlsDisabled(disabled) {
  [
    "#substrate-slider",
    "#enzyme-slider",
    "#temp-slider",
    "#inhibitor-slider",
    "#speed-selector",
    "#reset-btn",
  ].forEach((selector) => {
    const control = qs(selector);

    if (control) {
      control.disabled = disabled;
    }
  });
}

function recordExperimentPoint({ substrateConcentration, averageVelocity }) {
  addExperimentPoint({ substrateConcentration, averageVelocity });
}

function updateMeasurementPanel({
  substrateConcentration,
  productsFormed,
  measurementSeconds,
  averageVelocity,
}) {
  const emptyState = qs("#measurement-empty");
  const values = qs("#measurement-values");
  const substrate = qs("#measurement-substrate");
  const products = qs("#measurement-products");
  const time = qs("#measurement-time");
  const velocity = qs("#measurement-velocity");

  if (emptyState) {
    emptyState.hidden = true;
  }

  if (values) {
    values.hidden = false;
  }

  if (substrate) {
    substrate.textContent = String(substrateConcentration);
  }

  if (products) {
    products.textContent = String(productsFormed);
  }

  if (time) {
    time.textContent = `${measurementSeconds} sec`;
  }

  if (velocity) {
    velocity.textContent = `${averageVelocity} products/sec`;
  }
}

function instrumentProductGeneration(simulation) {
  const releaseProducts = simulation.releaseProducts.bind(simulation);

  simulation.releaseProducts = (enzyme) => {
    releaseProducts(enzyme);
    state.productsGenerated += 2;
    state.runProductsGenerated += 2;
  };
}

function getSimulationCanvas() {
  return qs(
    "#simCanvas",
    "#simulationCanvas",
    "#enzyme-canvas",
    "#canvas",
    "canvas[data-role='simulation']",
  );
}

function resizeCanvas() {
  const canvas = getSimulationCanvas();

  if (!canvas) {
    return false;
  }

  const rect = canvas.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }

  if (canvas.width === width && canvas.height === height) {
    return false;
  }

  canvas.width = width;
  canvas.height = height;

  return true;
}

function handleResize() {
  window.cancelAnimationFrame(state.resizeFrameId);
  state.resizeFrameId = window.requestAnimationFrame(() => {
    const changed = resizeCanvas();

    if (changed && state.simulation) {
      state.simulation.reset();
    }
  });
}

function createSimulation() {
  const canvas = getSimulationCanvas();

  if (!canvas) {
    return;
  }

  resizeCanvas();
  state.simulation?.destroy();
  state.simulation = initCanvasSimulation(canvas, calculatePhysicsOptions(state.params));
  instrumentProductGeneration(state.simulation);
  state.simulation.start();
}

function createChart() {
  const chartCanvas = qs("#kineticsChart");

  if (!chartCanvas || !window.Chart) {
    return;
  }

  state.chart = initKineticsChart(chartCanvas);
}

function resetStage({ clearGraph = false } = {}) {
  window.clearInterval(state.measurementId);
  state.measurementId = null;
  state.measuring = false;
  state.productsGenerated = 0;
  state.runProductsGenerated = 0;
  state.stageStartedAt = performance.now();
  startStopwatch();
  setMeasurementControlsDisabled(false);
  setExperimentStatus("Ready to measure.");

  if (clearGraph) {
    resetExperimentPoints();
  }

  createSimulation();
  setTelemetry({
    challengeId: state.challengeId,
    studentName: getStudentName(),
    enzymeParameters: state.params,
    quizAnswers: [],
  });
}

function finishExperiment() {
  window.clearInterval(state.measurementId);
  state.measurementId = null;
  state.measuring = false;

  const averageVelocity = Number((state.runProductsGenerated / MEASUREMENT_SECONDS).toFixed(2));
  const productsFormed = state.runProductsGenerated;
  recordExperimentPoint({
    substrateConcentration: state.initialSubstrateConcentration,
    averageVelocity,
  });
  updateMeasurementPanel({
    substrateConcentration: state.initialSubstrateConcentration,
    productsFormed,
    measurementSeconds: MEASUREMENT_SECONDS,
    averageVelocity,
  });

  setMeasurementControlsDisabled(false);
  setExperimentStatus(`Measured velocity: ${averageVelocity} products/sec`);
}

function updateMeasurementStatus() {
  const elapsedSeconds = Math.min(
    MEASUREMENT_SECONDS,
    Math.floor((performance.now() - state.measurementStartedAt) / 1000),
  );

  setExperimentStatus(`Measuring... ${elapsedSeconds} / ${MEASUREMENT_SECONDS} seconds`);

  if (elapsedSeconds >= MEASUREMENT_SECONDS) {
    finishExperiment();
  }
}

function runExperiment() {
  if (state.measuring) {
    return;
  }

  state.initialSubstrateConcentration = getSubstrateCountValue();
  state.runProductsGenerated = 0;
  state.measurementStartedAt = performance.now();
  state.measuring = true;

  setMeasurementControlsDisabled(true);
  updateMeasurementStatus();
  state.measurementId = window.setInterval(updateMeasurementStatus, 250);
}

function updateStopwatchDisplay() {
  const timer = qs("#stopwatch", "[data-field='stopwatch']");

  if (timer) {
    timer.textContent = getStopwatchTime();
  }
}

function startTimerDisplay() {
  window.clearInterval(state.timerId);
  updateStopwatchDisplay();
  state.timerId = window.setInterval(updateStopwatchDisplay, 250);
}

function renderQuizQuestion() {
  const questionEl = qs("#quiz-question", "#quizQuestion", "[data-field='quiz-question']");
  const choicesEl = qs("#quiz-choices", "#quizChoices", "[data-field='quiz-choices']");

  state.currentQuiz = generateQuizQuestion({
    vmax: getReactionVelocity(),
    substrateCount: getSubstrateCountValue(),
  });

  if (questionEl) {
    questionEl.textContent = state.currentQuiz.question;
  }

  if (!choicesEl) {
    return;
  }

  choicesEl.innerHTML = "";
  state.currentQuiz.choices.forEach((choice) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = choice.text;
    button.addEventListener("click", () => {
      trackQuizAnswer({
        question: state.currentQuiz.question,
        focus: state.currentQuiz.focus,
        selectedAnswer: choice.text,
        attempts: choice.correct ? 1 : 3,
      });
      button.dataset.correct = String(choice.correct);
    });
    choicesEl.append(button);
  });
}

function bindControls() {
  const speedControl = qs(
    "#speed-selector",
    "#speed-slider",
    "#speedSelector",
    "#speed",
    "[data-control='speed']",
  );
  const temperatureControl = qs(
    "#temp-slider",
    "#temperature-slider",
    "#temperatureSlider",
    "[data-control='temperature']",
  );
  const substrateControl = qs("#substrate-slider", "#substrateSlider", "[data-control='substrate']");
  const enzymeControl = qs("#enzyme-slider", "#enzymeSlider", "[data-control='enzyme']");
  const inhibitorControl = qs(
    "#inhibitor-slider",
    "#inhibitorSlider",
    "[data-control='inhibitor']",
  );
  const runExperimentButton = qs("#run-experiment-btn", "[data-action='run-experiment']");
  const resetButton = qs("#reset-btn", "#resetButton", "[data-action='reset']");
  const quizButton = qs("#quiz-btn", "#newQuizButton", "[data-action='quiz']");
  const shareButton = qs("#share-btn", "#shareButton", "[data-action='share']");
  const reportButton = qs("#teacher-report-btn", "#teacherReportButton", "[data-action='report']");

  speedControl?.addEventListener("input", () => {
    state.simulation?.setSpeedMultiplier(speedControl.value);
  });

  temperatureControl?.addEventListener("input", applyPhysicsOptions);
  enzymeControl?.addEventListener("input", applyPhysicsOptions);
  inhibitorControl?.addEventListener("input", applyPhysicsOptions);

  substrateControl?.addEventListener("input", () => {
    applyPhysicsOptions();
  });
  substrateControl?.addEventListener("change", () => resetStage());
  enzymeControl?.addEventListener("change", () => resetStage());

  runExperimentButton?.addEventListener("click", runExperiment);
  resetButton?.addEventListener("click", () => resetStage());
  quizButton?.addEventListener("click", renderQuizQuestion);

  shareButton?.addEventListener("click", async () => {
    const output = qs("#share-output", "#shareOutput", "[data-field='share-output']");
    const text = await copyWordleShareText({
      challengeId: state.challengeId,
      completionSeconds: Math.floor((performance.now() - state.stageStartedAt) / 1000),
    });

    if (output) {
      output.textContent = text;
    }
  });

  reportButton?.addEventListener("click", () => {
    const report = buildTeacherReport({
      studentName: getStudentName(),
      challengeId: state.challengeId,
      enzymeParameters: state.params,
    });

    sendTeacherReport({
      teacherEmail: getTeacherEmail(),
      subject: `EnzyMetrics Report ${state.challengeId}`,
      studentName: getStudentName(),
      challengeId: state.challengeId,
      enzymeParameters: state.params,
    });

    const output = qs("#teacher-report-output", "#teacherReportOutput", "[data-field='report-output']");
    if (output) {
      output.textContent = report;
    }
  });
}

function initScenario() {
  state.scenario = randomItem(enzymeScenarios);
  state.params = {
    optimalTemp: withNoise(state.scenario.optimalTemp),
    km: withNoise(state.scenario.km),
    source: state.scenario.source,
    enzyme: state.scenario.name,
  };
  state.challengeId = buildChallengeId(state.scenario, state.params);

  const temperatureControl = qs("#temp-slider", "#temperature-slider", "#temperatureSlider");
  if (temperatureControl) {
    temperatureControl.value = String(Math.round(state.params.optimalTemp));
  }

  populateScenarioBar();
  updateParameterReadout();
  setTelemetry({
    challengeId: state.challengeId,
    studentName: getStudentName(),
    enzymeParameters: state.params,
  });
}

function initApp() {
  initScenario();
  createChart();
  bindControls();
  window.addEventListener("resize", handleResize);
  resetStage({ clearGraph: true });
  startTimerDisplay();

  window.EnzyMetrics = {
    enzymeScenarios,
    getState: () => ({ ...state }),
    addExperimentPoint: recordExperimentPoint,
    buildWordleShareText,
    generateQuizQuestion: renderQuizQuestion,
    resetExperimentPoints,
    runExperiment,
    resetStage,
  };
}

document.addEventListener("DOMContentLoaded", initApp);
