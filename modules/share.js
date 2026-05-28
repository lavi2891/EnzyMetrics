import { t } from "../i18n/index.js";

const ATTEMPT_EMOJI = {
  solvedFirstTry: "🟩",
  solvedSecondTry: "🟨",
  neededSupport: "🟥",
};

let stopwatchStart = null;
let stopwatchElapsedMs = 0;
let stopwatchSpeedMultiplier = 1;

const telemetry = {
  challengeId: null,
  studentName: "",
  enzymeParameters: {},
  quizAnswers: [],
};

function now() {
  return performance.now();
}

function getElapsedMs() {
  if (stopwatchStart === null) {
    return stopwatchElapsedMs;
  }

  return stopwatchElapsedMs + (now() - stopwatchStart) * stopwatchSpeedMultiplier;
}

function padTimeUnit(value) {
  return String(value).padStart(2, "0");
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds)));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  return `${padTimeUnit(minutes)}:${padTimeUnit(remainingSeconds)}`;
}

function normalizeAttemptCount(value) {
  const attempts = Number(value);

  if (!Number.isFinite(attempts) || attempts < 1) {
    return 3;
  }

  return Math.ceil(attempts);
}

function attemptCountToEmoji(attemptCount) {
  const attempts = normalizeAttemptCount(attemptCount);

  if (attempts === 1) {
    return ATTEMPT_EMOJI.solvedFirstTry;
  }

  if (attempts === 2) {
    return ATTEMPT_EMOJI.solvedSecondTry;
  }

  return ATTEMPT_EMOJI.neededSupport;
}

function formatAttemptPattern(attemptCounts) {
  if (!Array.isArray(attemptCounts) || attemptCounts.length === 0) {
    return ATTEMPT_EMOJI.neededSupport;
  }

  return attemptCounts.map(attemptCountToEmoji).join("");
}

function sanitizeReportValue(value) {
  if (value === null || value === undefined || value === "") {
    return t("share.notProvided");
  }

  return String(value);
}

function formatKeyValueLines(values) {
  const entries = Object.entries(values ?? {});

  if (entries.length === 0) {
    return `- ${t("share.notProvided")}`;
  }

  return entries.map(([key, value]) => `- ${key}: ${sanitizeReportValue(value)}`).join("\n");
}

function formatQuizAnswerLines(answers) {
  if (!Array.isArray(answers) || answers.length === 0) {
    return `- ${t("share.noQuizAnswers")}`;
  }

  return answers
    .map((answer, index) => {
      if (typeof answer === "string") {
        return `- ${t("share.quizStringAnswer", { number: index + 1, answer })}`;
      }

      return [
        `- ${t("share.quizQuestion", {
          number: index + 1,
          question: sanitizeReportValue(answer.question ?? answer.prompt),
        })}`,
        `  ${t("share.quizFocus", { focus: sanitizeReportValue(answer.focus) })}`,
        `  ${t("share.quizSelected", {
          selected: sanitizeReportValue(answer.selectedAnswer ?? answer.selected),
        })}`,
        `  ${t("share.quizAttempts", { attempts: sanitizeReportValue(answer.attempts) })}`,
      ].join("\n");
    })
    .join("\n");
}

function encodeMailtoValue(value) {
  return encodeURIComponent(value).replace(/%20/g, "+");
}

export function startStopwatch() {
  stopwatchElapsedMs = 0;
  stopwatchStart = now();

  return getStopwatchTime();
}

export function setStopwatchSpeedMultiplier(value) {
  const multiplier = Number(value);
  const nextMultiplier = [1, 2, 5].includes(multiplier) ? multiplier : 1;

  if (stopwatchStart !== null) {
    stopwatchElapsedMs = getElapsedMs();
    stopwatchStart = now();
  }

  stopwatchSpeedMultiplier = nextMultiplier;

  return getStopwatchTime();
}

export function pauseStopwatch() {
  stopwatchElapsedMs = getElapsedMs();
  stopwatchStart = null;

  return getStopwatchTime();
}

export function resumeStopwatch() {
  if (stopwatchStart === null) {
    stopwatchStart = now();
  }

  return getStopwatchTime();
}

export function resetStopwatch() {
  stopwatchStart = null;
  stopwatchElapsedMs = 0;

  return getStopwatchTime();
}

export function getStopwatchSeconds() {
  return Math.floor(getElapsedMs() / 1000);
}

export function getStopwatchTime() {
  return formatDuration(getStopwatchSeconds());
}

export function setTelemetry({
  challengeId,
  studentName,
  enzymeParameters,
  quizAnswers,
} = {}) {
  if (challengeId !== undefined) {
    telemetry.challengeId = challengeId;
  }

  if (studentName !== undefined) {
    telemetry.studentName = studentName;
  }

  if (enzymeParameters !== undefined) {
    telemetry.enzymeParameters = { ...enzymeParameters };
  }

  if (quizAnswers !== undefined) {
    telemetry.quizAnswers = [...quizAnswers];
  }

  return getTelemetrySnapshot();
}

export function trackQuizAnswer(answer) {
  telemetry.quizAnswers.push({ ...answer });
  return getTelemetrySnapshot();
}

export function getTelemetrySnapshot() {
  return {
    challengeId: telemetry.challengeId,
    studentName: telemetry.studentName,
    enzymeParameters: { ...telemetry.enzymeParameters },
    quizAnswers: telemetry.quizAnswers.map((answer) => ({ ...answer })),
    completionTime: getStopwatchTime(),
    completionSeconds: getStopwatchSeconds(),
  };
}

export function buildWordleShareText({
  challengeId = telemetry.challengeId,
  attemptCounts = telemetry.quizAnswers.map((answer) => answer.attempts),
  completionSeconds = getStopwatchSeconds(),
  title = t("app.title"),
} = {}) {
  const seed = sanitizeReportValue(challengeId);
  const time = formatDuration(completionSeconds);
  const progress = formatAttemptPattern(attemptCounts);

  return [
    t("share.challengeTitle", { title, seed }),
    progress,
    t("share.solvedIn", { time }),
    "",
    `${ATTEMPT_EMOJI.solvedFirstTry} ${t("share.legend")}`,
  ].join("\n");
}

export async function copyWordleShareText(options = {}) {
  if (!navigator.clipboard?.writeText) {
    throw new Error(t("share.clipboardUnavailable"));
  }

  const shareText = buildWordleShareText(options);
  await navigator.clipboard.writeText(shareText);

  return shareText;
}

export function buildTeacherReport({
  studentName = telemetry.studentName,
  challengeId = telemetry.challengeId,
  completionSeconds = getStopwatchSeconds(),
  enzymeParameters = telemetry.enzymeParameters,
  quizAnswers = telemetry.quizAnswers,
} = {}) {
  return [
    t("share.reportTitle"),
    "",
    t("share.student", { student: sanitizeReportValue(studentName) }),
    t("share.challengeId", { challengeId: sanitizeReportValue(challengeId) }),
    t("share.completionTime", { time: formatDuration(completionSeconds) }),
    "",
    t("share.parametersTitle"),
    formatKeyValueLines(enzymeParameters),
    "",
    t("share.quizAnswersTitle"),
    formatQuizAnswerLines(quizAnswers),
  ].join("\n");
}

export function sendTeacherReport({
  teacherEmail,
  subject = t("share.reportSubject"),
  ...reportOptions
} = {}) {
  if (!teacherEmail) {
    throw new Error(t("share.teacherEmailRequired"));
  }

  const report = buildTeacherReport(reportOptions);
  const mailtoUrl = `mailto:${encodeURIComponent(teacherEmail)}?subject=${encodeMailtoValue(
    subject,
  )}&body=${encodeMailtoValue(report)}`;

  window.location.href = mailtoUrl;

  return report;
}
