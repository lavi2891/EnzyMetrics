const ATTEMPT_EMOJI = {
  solvedFirstTry: "🟩",
  solvedSecondTry: "🟨",
  neededSupport: "🟥",
};

let stopwatchStart = null;
let stopwatchElapsedMs = 0;

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

  return stopwatchElapsedMs + now() - stopwatchStart;
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
    return "Not provided";
  }

  return String(value);
}

function formatKeyValueLines(values) {
  const entries = Object.entries(values ?? {});

  if (entries.length === 0) {
    return "- Not provided";
  }

  return entries.map(([key, value]) => `- ${key}: ${sanitizeReportValue(value)}`).join("\n");
}

function formatQuizAnswerLines(answers) {
  if (!Array.isArray(answers) || answers.length === 0) {
    return "- No quiz answers recorded";
  }

  return answers
    .map((answer, index) => {
      if (typeof answer === "string") {
        return `- Q${index + 1}: ${answer}`;
      }

      return [
        `- Q${index + 1}: ${sanitizeReportValue(answer.question ?? answer.prompt)}`,
        `  Focus: ${sanitizeReportValue(answer.focus)}`,
        `  Selected: ${sanitizeReportValue(answer.selectedAnswer ?? answer.selected)}`,
        `  Attempts: ${sanitizeReportValue(answer.attempts)}`,
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
  title = "EnzyMetrics",
} = {}) {
  const seed = sanitizeReportValue(challengeId);
  const time = formatDuration(completionSeconds);
  const progress = formatAttemptPattern(attemptCounts);

  return [
    `${title} Challenge ${seed}`,
    progress,
    `Solved in ${time} minutes! ⏱️`,
    "",
    "🟩 1 try  🟨 2 tries  🟥 3+ tries",
  ].join("\n");
}

export async function copyWordleShareText(options = {}) {
  if (!navigator.clipboard?.writeText) {
    throw new Error("Clipboard sharing is unavailable in this browser.");
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
    "EnzyMetrics Teacher Report",
    "",
    `Student: ${sanitizeReportValue(studentName)}`,
    `Challenge Seed/ID: ${sanitizeReportValue(challengeId)}`,
    `Completion Time: ${formatDuration(completionSeconds)} minutes`,
    "",
    "Unique Enzyme Parameters:",
    formatKeyValueLines(enzymeParameters),
    "",
    "Selected Quiz Answers:",
    formatQuizAnswerLines(quizAnswers),
  ].join("\n");
}

export function sendTeacherReport({
  teacherEmail,
  subject = "EnzyMetrics Student Report",
  ...reportOptions
} = {}) {
  if (!teacherEmail) {
    throw new Error("sendTeacherReport requires a teacherEmail value.");
  }

  const report = buildTeacherReport(reportOptions);
  const mailtoUrl = `mailto:${encodeURIComponent(teacherEmail)}?subject=${encodeMailtoValue(
    subject,
  )}&body=${encodeMailtoValue(report)}`;

  window.location.href = mailtoUrl;

  return report;
}
