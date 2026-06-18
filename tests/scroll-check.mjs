import { spawn, spawnSync } from "node:child_process";
import { Buffer } from "node:buffer";
import process from "node:process";

const PORT = Number(process.env.SCROLL_TEST_PORT ?? 4173);
const DEBUG_PORT = Number(process.env.SCROLL_TEST_DEBUG_PORT ?? 9226);
const APP_QUERY = process.env.SCROLL_TEST_QUERY ?? "";
const EXPECTED_LEARNING_MODE = process.env.SCROLL_TEST_EXPECTED_MODE ?? "";
const SELECT_SCENARIO_ID = process.env.SCROLL_TEST_SCENARIO_ID ?? "";
const CHECK_GRAPH_SERIES_SPLIT = process.env.SCROLL_TEST_GRAPH_SERIES_SPLIT === "1";
const CHECK_SPEED_UNLOCK = process.env.SCROLL_TEST_SPEED_UNLOCK === "1";
const CHECK_NO_PREDICTION_PROMPT = process.env.SCROLL_TEST_NO_PREDICTION_PROMPT === "1";
const APP_URL = `http://127.0.0.1:${PORT}/index.html${APP_QUERY}`;
const DEBUG_URL = `http://127.0.0.1:${DEBUG_PORT}`;
const VIEWPORT = { width: 900, height: 650 };

function chromeCandidates() {
  if (process.env.CHROME_PATH) {
    return [process.env.CHROME_PATH];
  }

  if (process.platform === "win32") {
    return [
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    ];
  }

  if (process.platform === "darwin") {
    return [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    ];
  }

  return ["google-chrome", "chromium", "chromium-browser", "microsoft-edge"];
}

function spawnFirst(candidates, args, options = {}) {
  return new Promise((resolve, reject) => {
    const errors = [];

    function tryNext(index) {
      if (index >= candidates.length) {
        reject(new Error(`Unable to start process. Tried: ${candidates.join(", ")}. ${errors.join(" ")}`));
        return;
      }

      const child = spawn(candidates[index], args, options);
      let settled = false;

      child.once("spawn", () => {
        settled = true;
        resolve(child);
      });

      child.once("error", (error) => {
        errors.push(`${candidates[index]}: ${error.message}`);
        if (!settled) {
          tryNext(index + 1);
        }
      });
    }

    tryNext(0);
  });
}

async function waitForJson(url, timeoutMs = 10_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
    } catch {
      // Retry until the server or browser debug endpoint is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForHttp(url, timeoutMs = 10_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until the static server is ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function connectCdp(webSocketDebuggerUrl) {
  const ws = new WebSocket(webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const listeners = new Set();

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);

    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) {
        reject(new Error(JSON.stringify(message.error)));
      } else {
        resolve(message.result);
      }
    }

    listeners.forEach((listener) => listener(message));
  });

  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  function send(method, params = {}) {
    const messageId = ++id;
    ws.send(JSON.stringify({ id: messageId, method, params }));

    return new Promise((resolve, reject) => {
      pending.set(messageId, { resolve, reject });
    });
  }

  function onMessage(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return {
    opened,
    send,
    onMessage,
    close() {
      ws.close();
    },
  };
}

function killProcessTree(child) {
  if (!child?.pid) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      timeout: 5_000,
    });
    return;
  }

  child.kill("SIGKILL");
}

async function main() {
  const server = await spawnFirst(
    process.platform === "win32" ? ["python", "py"] : ["python3", "python"],
    ["-m", "http.server", String(PORT), "--bind", "127.0.0.1"],
    { cwd: process.cwd(), stdio: "ignore" },
  );

  let browser;
  let cdp;

  try {
    await waitForHttp(APP_URL, 10_000);

    browser = await spawnFirst(chromeCandidates(), [
      "--headless",
      "--disable-gpu",
      "--no-sandbox",
      "--no-first-run",
      "--disable-extensions",
      `--remote-debugging-address=127.0.0.1`,
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${process.env.TEMP ?? "/tmp"}/enzymetrics-scroll-check-${Date.now()}`,
      "about:blank",
    ], { stdio: "ignore" });

    const targets = await waitForJson(`${DEBUG_URL}/json/list`);
    const page = targets.find((target) => target.type === "page");

    if (!page?.webSocketDebuggerUrl) {
      throw new Error("No debuggable page target found.");
    }

    cdp = connectCdp(page.webSocketDebuggerUrl);
    await cdp.opened;

    cdp.onMessage((message) => {
      if (message.method !== "Fetch.requestPaused") {
        return;
      }

      const { requestId, request } = message.params;

      if (request.url.includes("chart.umd.min.js")) {
        const chartStub = [
          "window.Chart = function Chart(canvas, config) {",
          "this.canvas = canvas;",
          "this.data = config.data || {};",
          "this.options = config.options || {};",
          "this.update = function() {};",
          "this.destroy = function() {};",
          "};",
        ].join("");

        cdp.send("Fetch.fulfillRequest", {
          requestId,
          responseCode: 200,
          responseHeaders: [{ name: "Content-Type", value: "application/javascript" }],
          body: Buffer.from(chartStub).toString("base64"),
        }).catch(() => {});
        return;
      }

      cdp.send("Fetch.continueRequest", { requestId }).catch(() => {});
    });

    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Fetch.enable", { patterns: [{ urlPattern: "*chart.umd.min.js*" }] });
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send("Page.navigate", { url: APP_URL });
    await new Promise((resolve) => setTimeout(resolve, 1_500));

    if (CHECK_NO_PREDICTION_PROMPT) {
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          window.localStorage.clear();
          window.location.reload();
        })()`,
      });
      await new Promise((resolve) => setTimeout(resolve, 1_500));
    }

    if (SELECT_SCENARIO_ID) {
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          const selector = document.querySelector("#enzyme-selector");
          selector.value = ${JSON.stringify(SELECT_SCENARIO_ID)};
          selector.dispatchEvent(new Event("change", { bubbles: true }));
        })()`,
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (CHECK_GRAPH_SERIES_SPLIT) {
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          window.EnzyMetrics.addExperimentPoint({
            substrateConcentration: 12,
            averageVelocity: 1.2,
            productsFormed: 24,
            measurementSeconds: 20
          });
          const selector = document.querySelector("#enzyme-selector");
          selector.value = "3";
          selector.dispatchEvent(new Event("change", { bubbles: true }));
          window.EnzyMetrics.addExperimentPoint({
            substrateConcentration: 12,
            averageVelocity: 2.4,
            productsFormed: 48,
            measurementSeconds: 20
          });
        })()`,
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (CHECK_SPEED_UNLOCK) {
      await cdp.send("Runtime.evaluate", {
        expression: `(() => {
          window.localStorage.setItem("enzymetrics.roadmapProgress", JSON.stringify({
            completedMissionIds: [
              "intro-enzyme-system",
              "add-or-observe-enzymes",
              "set-ideal-temperature",
              "add-substrate",
              "run-first-experiment"
            ],
            updatedAt: new Date().toISOString()
          }));
          window.location.reload();
        })()`,
      });
      await new Promise((resolve) => setTimeout(resolve, 1_500));
      await cdp.send("Runtime.evaluate", {
        expression: `document.querySelector("#settings-btn")?.click()`,
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (CHECK_NO_PREDICTION_PROMPT) {
      if (EXPECTED_LEARNING_MODE === "guided") {
        await cdp.send("Runtime.evaluate", {
          expression: `(() => {
            window.localStorage.setItem("enzymetrics.roadmapProgress", JSON.stringify({
              completedMissionIds: [
                "intro-enzyme-system",
                "add-or-observe-enzymes",
                "set-ideal-temperature",
                "add-substrate"
              ],
              updatedAt: new Date().toISOString()
            }));
            window.location.reload();
          })()`,
        });
        await new Promise((resolve) => setTimeout(resolve, 1_500));
      }

      await cdp.send("Runtime.evaluate", {
        expression: `document.querySelector("#run-experiment-btn")?.click()`,
      });
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    const evaluation = await cdp.send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const metricsFor = (selector) => {
          const element = selector === "html"
            ? document.documentElement
            : selector === "body"
              ? document.body
              : document.querySelector(selector);

          if (!element) return null;

          return {
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
            overflowY: getComputedStyle(element).overflowY
          };
        };

        window.scrollTo(0, document.body.scrollHeight);

        return {
          viewport: { width: innerWidth, height: innerHeight },
          scrollY: window.scrollY,
          html: metricsFor("html"),
          body: metricsFor("body"),
          appShell: metricsFor("#app-shell"),
          mainGrid: metricsFor(".main-grid"),
          overlayHidden: document.querySelector("#roadmap-onboarding-overlay")?.hidden ?? null,
          overlayPointerEvents: document.querySelector("#roadmap-onboarding-overlay")
            ? getComputedStyle(document.querySelector("#roadmap-onboarding-overlay")).pointerEvents
            : null,
          learningMode: window.EnzyMetrics?.getState?.().learningMode,
          selectedScenarioId: document.querySelector("#enzyme-selector")?.value ?? null,
          enzymeSelectorHidden:
            document.querySelector("#enzyme-selector")?.closest(".enzyme-select-control")?.hidden ??
            null,
          enzymeSelectorDisabled: document.querySelector("#enzyme-selector")?.disabled ?? null,
          buildCurveHidden: document.querySelector(".build-curve-section")?.hidden ?? null,
          substrateSliderHidden: document.querySelector(".primary-control")?.hidden ?? null,
          substrateSliderDisabled: document.querySelector("#substrate-slider")?.disabled ?? null,
          runExperimentHidden: document.querySelector("#run-experiment-btn")?.hidden ?? null,
          runExperimentDisabled: document.querySelector("#run-experiment-btn")?.disabled ?? null,
          predictionPromptExists: Boolean(document.querySelector("#prediction-prompt")),
          predictionButtonCount: document.querySelectorAll("[data-prediction]").length,
          measuring: window.EnzyMetrics?.getState?.().measuring ?? null,
          settingsButtonHidden: document.querySelector("#settings-btn")?.hidden ?? null,
          settingsButtonDisabled: document.querySelector("#settings-btn")?.disabled ?? null,
          settingsModalOpen: document.querySelector("#settings-modal")?.open ?? null,
          temperatureSettingHidden:
            document.querySelector(".settings-temperature-control")?.hidden ?? null,
          inhibitorSettingHidden: document.querySelector(".settings-inhibitor-control")?.hidden ?? null,
          speedSettingHidden: document.querySelector(".settings-speed-control")?.hidden ?? null,
          measurementHidden: document.querySelector(".compact-measurement")?.hidden ?? null,
          debugMetricsHidden: document.querySelector("#debug-metrics")?.hidden ?? null,
          guidedAdvancedMeasurementsHidden: Array.from(
            document.querySelectorAll(".guided-advanced-measurement"),
          ).every((element) => element.hidden),
          insightHidden: document.querySelector(".insight-strip")?.hidden ?? null,
          simulationMetrics: window.EnzyMetrics?.getState?.().simulation?.getMetrics?.() ?? null,
          enzymeName: document.querySelector("#enzyme-name")?.textContent ?? "",
          enzymeSource: document.querySelector("#enzyme-source")?.textContent ?? "",
          scenarioText: document.querySelector("#scenario-text")?.textContent ?? "",
          scenarioFacts: document.querySelector("#scenario-facts")?.textContent ?? "",
          parameterReadout: document.querySelector("#parameter-readout")?.textContent ?? "",
          currentSeriesLabel: document.querySelector("#current-series-label")?.textContent ?? "",
          seriesLabels: window.EnzyMetrics?.getExperimentSeries?.().map((series) => series.label) ?? [],
          freeModeButtonHidden: document.querySelector("#free-mode-btn")?.hidden ?? null,
          quizButtonDisabled: document.querySelector("#quiz-btn")?.disabled ?? null,
          appShellDisplay: getComputedStyle(document.querySelector("#app-shell")).display
        };
      })()`,
    });

    const metrics = evaluation.result.value;
    console.log(JSON.stringify(metrics, null, 2));

    if (metrics.html.scrollHeight <= metrics.html.clientHeight) {
      throw new Error("Expected documentElement.scrollHeight to exceed clientHeight.");
    }

    if (metrics.scrollY <= 0) {
      throw new Error("Expected window.scrollTo to move window.scrollY below the fold.");
    }

    if (metrics.appShellDisplay === "none") {
      throw new Error("#app-shell is hidden at the test viewport.");
    }

    if (metrics.overlayHidden === false && metrics.overlayPointerEvents !== "none") {
      throw new Error("Visible onboarding overlay must not intercept pointer or wheel events.");
    }

    if (EXPECTED_LEARNING_MODE && metrics.learningMode !== EXPECTED_LEARNING_MODE) {
      throw new Error(
        `Expected learning mode ${EXPECTED_LEARNING_MODE}, got ${metrics.learningMode}.`,
      );
    }

    if (
      EXPECTED_LEARNING_MODE === "guided" &&
      !SELECT_SCENARIO_ID &&
      !CHECK_GRAPH_SERIES_SPLIT &&
      !CHECK_SPEED_UNLOCK &&
      !CHECK_NO_PREDICTION_PROMPT
    ) {
      if (
        metrics.buildCurveHidden !== true ||
        metrics.substrateSliderHidden !== true ||
        metrics.runExperimentHidden !== true ||
        metrics.temperatureSettingHidden !== true ||
        metrics.inhibitorSettingHidden !== true ||
        metrics.speedSettingHidden !== true
      ) {
        throw new Error("Expected guided mode to start with setup controls locked.");
      }

      if (metrics.freeModeButtonHidden !== false) {
        throw new Error("Expected guided mode skip button to stay reachable in the top navigation.");
      }

      if (metrics.debugMetricsHidden !== true || metrics.guidedAdvancedMeasurementsHidden !== true) {
        throw new Error("Expected guided mode to hide debug and advanced measurement details.");
      }

      if ((metrics.simulationMetrics?.substrateCount ?? 0) > 1) {
        throw new Error(
          `Expected guided mode to start empty or nearly empty, got ${metrics.simulationMetrics?.substrateCount} substrates.`,
        );
      }
    }

    if (EXPECTED_LEARNING_MODE === "free") {
      if (
        metrics.buildCurveHidden ||
        metrics.substrateSliderHidden ||
        metrics.runExperimentHidden ||
        metrics.temperatureSettingHidden ||
          metrics.inhibitorSettingHidden ||
          metrics.speedSettingHidden
      ) {
        throw new Error("Expected free mode controls to remain available.");
      }

      if (metrics.freeModeButtonHidden !== true) {
        throw new Error("Expected free mode skip button to stay hidden because free mode is already active.");
      }

      if (metrics.debugMetricsHidden !== true || metrics.guidedAdvancedMeasurementsHidden) {
        throw new Error("Expected free mode to hide debug metrics but keep advanced measurement details available.");
      }
    }

    if (CHECK_SPEED_UNLOCK) {
      if (metrics.settingsButtonHidden || metrics.settingsButtonDisabled) {
        throw new Error("Expected settings button to remain available after speed unlock.");
      }

      if (!metrics.settingsModalOpen) {
        throw new Error("Expected settings modal to open after speed unlock.");
      }

      if (metrics.speedSettingHidden) {
        throw new Error("Expected speed control to be visible inside settings after speed unlock.");
      }
    }

    if (CHECK_NO_PREDICTION_PROMPT) {
      if (metrics.predictionPromptExists) {
        throw new Error("Expected prediction prompt UI to be absent.");
      }

      if (metrics.predictionButtonCount !== 0) {
        throw new Error("Expected no prediction option buttons to exist.");
      }

      if (metrics.measuring !== true) {
        throw new Error("Expected run button to start measurement directly without a prediction step.");
      }
    }

    if (SELECT_SCENARIO_ID && metrics.selectedScenarioId !== SELECT_SCENARIO_ID) {
      throw new Error(
        `Expected selected scenario ${SELECT_SCENARIO_ID}, got ${metrics.selectedScenarioId}.`,
      );
    }

    if (CHECK_GRAPH_SERIES_SPLIT && metrics.seriesLabels.length < 2) {
      throw new Error(`Expected separate graph series, got ${metrics.seriesLabels.length}.`);
    }
  } finally {
    cdp?.close();
    killProcessTree(browser);
    killProcessTree(server);
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
