const en = {
  "app.title": "EnzyMetrics",
  "app.mobileTitle": "Rotate or switch devices",
  "app.mobileMessage":
    "EnzyMetrics is designed for a landscape classroom screen. Please use a wider display.",
  "app.labName": "EnzyMetrics Lab",
  "app.challengeTitle": "Enzyme Kinetics Challenge",
  "app.loadingEnzyme": "Loading enzyme...",
  "app.enzymeContextAlt": "Enzyme Context",
  "app.challengeStopwatch": "Challenge stopwatch",
  "app.time": "Time",

  "language.hebrew": "Hebrew",
  "language.english": "English",

  "section.simulation.title": "Molecular Simulation",
  "section.simulation.subtitle": "Blue enzymes bind green substrates at active-site notches.",
  "section.chart.title": "Michaelis-Menten Graph",
  "section.chart.subtitle": "Each experiment adds one point to the graph.",
  "section.buildCurve.eyebrow": "Build the curve",
  "section.buildCurve.helper":
    "Change substrate concentration between experiments to build the Michaelis-Menten curve.",
  "section.insight.label": "Insight",
  "section.share.summary": "Sharing and teacher report",
  "section.settings.eyebrow": "Experiment Settings",
  "section.settings.title": "Fixed curve conditions",
  "section.settings.helper":
    "Changing enzyme concentration, temperature, or inhibitor concentration starts a new color-coded series because the curve itself changes.",
  "section.checkpoint.eyebrow": "Checkpoint",
  "section.checkpoint.title": "Graph reasoning",

  "legend.particle": "Particle legend",
  "legend.enzyme": "Blue circle = Enzyme",
  "legend.substrate": "Green triangle = Substrate",
  "legend.product": "Yellow half-circle = Product",
  "legend.notch": "Notch = Active site",

  "control.substrate": "Substrate Concentration",
  "control.enzyme": "Enzyme Concentration",
  "control.temperature": "Temperature",
  "control.inhibitor": "Inhibitor Concentration",
  "control.speed": "Speed",
  "control.speedHelp": "Speed changes animation pace only; results are normalized.",
  "control.studentName": "Student Name",
  "control.teacherEmail": "Teacher Email",
  "control.optionalPlaceholder": "Optional",
  "control.teacherEmailPlaceholder": "teacher@example.com",

  "action.runExperiment": "Run Experiment",
  "action.settings": "Experiment Settings",
  "action.checkpointQuestions": "Checkpoint Questions",
  "action.more": "More",
  "action.resetExperiment": "Reset Experiment",
  "action.resetCurrentSeries": "Reset Current Series",
  "action.resetAllSeries": "Reset All Series",
  "action.exportCsv": "Export CSV",
  "action.copyShare": "Copy Share",
  "action.emailReport": "Email Report",
  "action.closeSettings": "Close settings",
  "action.closeCheckpoint": "Close checkpoint",
  "action.newQuestion": "New Question",

  "measurement.empty": "Run an experiment to measure reaction velocity.",
  "measurement.initialSubstrate": "Initial [S]",
  "measurement.products": "Products",
  "measurement.time": "Time",
  "measurement.velocity": "Velocity",
  "measurement.occupancy": "Occupancy",
  "measurement.speed": "Speed",
  "measurement.seconds": "{seconds} sec",
  "measurement.velocityValue": "{velocity} products/sec",
  "measurement.occupancyValue": "{occupancy}%",
  "measurement.speedValue": "x{speed}",

  "status.ready": "Ready to measure.",
  "status.currentSeriesCleared": "Current series cleared. Ready to measure.",
  "status.settingsUpdated": "Settings updated. Run an experiment to add this condition series.",
  "status.measuring": "Measuring... {elapsed} / {total} seconds",
  "status.measuredVelocity": "Measured velocity: {velocity} products/sec",

  "quiz.locked": "Complete at least 1 experiment to unlock checkpoint questions.",

  "series.pending":
    "Pending settings -- enzyme {enzyme} | temp {temp}°C | inhibitor {inhibitor}%",
  "series.label": "Series {number} -- enzyme {enzyme} | temp {temp}°C | inhibitor {inhibitor}%",
  "series.loading": "Series 1 -- loading conditions",

  "parameter.temp": "Temp: {temp}°C",
  "parameter.optimal": "Optimal: {temp}°C",
  "parameter.km": "Km: {km}",
  "parameter.inhibitor": "Inhibitor: {inhibitor}%",

  "debug.initial":
    "Active enzymes: -- | Occupied: -- | Enzyme occupancy: --% | Collision checks: -- | Bindings: --",
  "debug.activeEnzymes": "Active enzymes: {count}",
  "debug.occupied": "Occupied: {occupied}/{total}",
  "debug.occupancy": "Enzyme occupancy: {occupancy}%",
  "debug.collisionChecks": "Collision checks: {count}",
  "debug.bindings": "Bindings: {count}",
  "debug.reactionTime": "Reaction time: {seconds}s",

  "value.particles": "{count} particles",
  "value.enzymes": "{count} enzymes",
  "value.temperature": "{temp}°C",
  "value.percent": "{percent}%",
  "value.speed": "x{speed}",

  "scenario.amylase.name": "Amylase",
  "scenario.amylase.source": "Human Saliva",
  "scenario.amylase.desc":
    "Amylase digests starch in your mouth, turning long carbohydrate chains into smaller sugars before food reaches the stomach.",
  "scenario.pepsin.name": "Pepsin",
  "scenario.pepsin.source": "Human Stomach",
  "scenario.pepsin.desc":
    "Pepsin breaks down proteins in highly acidic stomach conditions, where many other enzymes would lose their shape.",
  "scenario.taq.name": "Taq Polymerase",
  "scenario.taq.source": "Hot Springs Bacteria",
  "scenario.taq.desc":
    "Taq Polymerase thrives at high temperatures and is used in PCR labs to copy DNA through repeated heating cycles.",
  "scenario.imageAlt": "{enzyme} from {source}",

  "insight.empty": "Run an experiment to get a short science insight.",
  "insight.inhibitor":
    "Inhibitors reduce successful enzyme-substrate interactions, so velocity may be lower.",
  "insight.temperature": "The enzyme is far from its optimal temperature, so it works less efficiently.",
  "insight.flattening":
    "The curve is flattening: many enzymes are already occupied, so adding more substrate has little effect.",
  "insight.lowSubstrate":
    "At low substrate concentration, adding more substrate usually increases reaction velocity because many enzymes are still free.",
  "insight.compare": "Compare this point with earlier points to see how conditions changed reaction velocity.",

  "chart.datasetLabel": "Average Reaction Velocity",
  "chart.xAxis": "Initial Substrate Concentration",
  "chart.tooltipVelocity": "{label}: {velocity} products/sec",
  "chart.tooltipDetails": "Occupancy: {occupancy}% | Time: {time}s",

  "csv.seriesLabel": "series_label",
  "csv.substrateConcentration": "substrate_concentration",
  "csv.averageVelocity": "average_velocity",
  "csv.productsFormed": "products_formed",
  "csv.measurementSeconds": "measurement_seconds",
  "csv.normalizedMeasurementSeconds": "normalized_measurement_seconds",
  "csv.averageOccupancyPercent": "average_occupancy_percent",
  "csv.speedMultiplier": "speed_multiplier",
  "csv.timestamp": "timestamp",

  "quiz.plotPoint.question":
    "In this experiment there were {enzyme} enzymes, {substrate} substrates, and the measured average velocity was {velocity} products/sec. Which point should be plotted on the graph?",
  "quiz.plotPoint.explanation":
    "The graph point is (initial substrate concentration, average velocity). Enzyme count is a condition for the series, not the X coordinate.",
  "quiz.xAxis.question": "On the Michaelis-Menten graph, what belongs on the X-axis?",
  "quiz.xAxis.answer": "Initial substrate concentration for each experiment.",
  "quiz.xAxis.d1": "Average reaction velocity in products/sec.",
  "quiz.xAxis.d2": "Number of enzymes used in the condition series.",
  "quiz.xAxis.d3": "Total products formed after the run ends.",
  "quiz.xAxis.explanation":
    "The X-axis is the independent variable: the substrate concentration chosen before the experiment.",
  "quiz.yAxis.question": "On the Michaelis-Menten graph, what belongs on the Y-axis?",
  "quiz.yAxis.answer": "Average reaction velocity in products/sec.",
  "quiz.yAxis.d1": "Initial substrate concentration.",
  "quiz.yAxis.d2": "Enzyme concentration for the series.",
  "quiz.yAxis.d3": "Temperature in °C.",
  "quiz.yAxis.explanation":
    "The Y-axis is the dependent variable: the measured average velocity caused by the chosen substrate concentration.",
  "quiz.condition.question":
    "This run used {substrate} substrates, measured {velocity} products/sec, and had inhibitor at {inhibitor}%. Which value is a condition, not a plotted coordinate?",
  "quiz.condition.answer": "{inhibitor}% inhibitor",
  "quiz.condition.substrate": "{substrate} substrates",
  "quiz.condition.velocity": "{velocity} products/sec",
  "quiz.condition.explanation":
    "Substrate and velocity make the plotted point. Inhibitor level is part of the condition series.",
  "quiz.saturation.question":
    "Two experiments used the same enzyme settings. Substrate increased from {lowerSubstrate} to {higherSubstrate}, but velocity changed only from {lowerVelocity} to {higherVelocity} products/sec. What does this suggest?",
  "quiz.saturation.answer":
    "Many enzymes are already occupied, so the reaction is approaching Vmax.",
  "quiz.saturation.d1": "Velocity should always double whenever substrate doubles.",
  "quiz.saturation.d2": "The inhibitor must be increasing the reaction velocity.",
  "quiz.saturation.d3": "The X-axis should be changed from substrate concentration to time.",
  "quiz.saturation.explanation":
    "A flattening curve at high substrate means enzyme availability is becoming the limiting factor.",
  "quiz.temperature.question":
    "A series was measured at {temp} °C. Which statement is best when interpreting temperature effects on velocity?",
  "quiz.temperature.answer":
    "Temperature helps only up to the enzyme's useful range; too far from optimal can lower velocity.",
  "quiz.temperature.d1": "Higher temperature always increases enzyme velocity.",
  "quiz.temperature.d2": "Temperature belongs on the X-axis of this Michaelis-Menten graph.",
  "quiz.temperature.d3": "Temperature is the measured Y-axis value.",
  "quiz.temperature.explanation":
    "Temperature is a series condition. It can change the curve, but it is not automatically beneficial at every value.",
  "quiz.substrateDouble.question":
    "In one series, substrate changed from {lowerSubstrate} to {higherSubstrate}. What should you check before claiming velocity should double?",
  "quiz.substrateDouble.answer":
    "Whether the curve is nearing saturation, because occupied enzymes can limit further increases.",
  "quiz.substrateDouble.d1": "Only whether the enzyme count can be used as the X coordinate.",
  "quiz.substrateDouble.d2": "Whether inhibitor concentration increased velocity.",
  "quiz.substrateDouble.d3": "Whether temperature should replace velocity on the Y-axis.",
  "quiz.substrateDouble.explanation":
    "Substrate increases often raise velocity at low substrate, but the effect shrinks as enzyme active sites become occupied.",
  "quiz.compareEnzyme.question":
    "Two series have the same temperature and inhibitor level. One uses {lowerEnzyme} enzymes and the other uses {higherEnzyme} enzymes. What should usually happen to Vmax?",
  "quiz.compareEnzyme.answer":
    "The series with more enzymes should reach a higher maximum velocity.",
  "quiz.compareEnzyme.d1": "The series with fewer enzymes should always reach the higher Vmax.",
  "quiz.compareEnzyme.d2": "Changing enzyme concentration should move points to a different X-axis value.",
  "quiz.compareEnzyme.d3": "More enzymes should make inhibitor increase velocity.",
  "quiz.compareEnzyme.explanation":
    "More enzymes provide more active sites, so the maximum possible velocity usually increases.",
  "quiz.compareInhibitor.question":
    "When comparing two condition series on the same graph, which interpretation is most reasonable if one series has more inhibitor?",
  "quiz.compareInhibitor.answer":
    "The higher-inhibitor series will usually have lower velocities because successful enzyme-substrate interactions are reduced.",
  "quiz.compareInhibitor.d1": "More inhibitor should increase velocity by creating more active sites.",
  "quiz.compareInhibitor.d2": "Inhibitor concentration should be plotted as the Y coordinate for each point.",
  "quiz.compareInhibitor.d3": "The point from {firstSeries} must always be higher than the point from {secondSeries}.",
  "quiz.compareInhibitor.explanation":
    "Inhibitor is a condition that can lower the curve; it is not a plotted coordinate.",
  "quiz.defaultSeries": "Series",

  "share.notProvided": "Not provided",
  "share.noQuizAnswers": "No quiz answers recorded",
  "share.quizStringAnswer": "Q{number}: {answer}",
  "share.quizQuestion": "Q{number}: {question}",
  "share.quizFocus": "Focus: {focus}",
  "share.quizSelected": "Selected: {selected}",
  "share.quizAttempts": "Attempts: {attempts}",
  "share.challengeTitle": "{title} Challenge {seed}",
  "share.solvedIn": "Solved in {time} minutes!",
  "share.legend": "1 try / 2 tries / 3+ tries",
  "share.reportTitle": "EnzyMetrics Teacher Report",
  "share.student": "Student: {student}",
  "share.challengeId": "Challenge Seed/ID: {challengeId}",
  "share.completionTime": "Completion Time: {time} minutes",
  "share.parametersTitle": "Unique Enzyme Parameters:",
  "share.quizAnswersTitle": "Selected Quiz Answers:",
  "share.reportSubject": "EnzyMetrics Student Report",
  "share.clipboardUnavailable": "Clipboard sharing is unavailable in this browser.",
  "share.teacherEmailRequired": "sendTeacherReport requires a teacherEmail value.",
};

export default en;
