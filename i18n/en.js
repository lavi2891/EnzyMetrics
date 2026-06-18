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

  "language.switcherLabel": "Language",
  "language.hebrew": "Hebrew",
  "language.english": "English",

  "onboarding.roadmapIntro":
    "This is where your investigation begins. Open the roadmap to start exploring how enzymes work.",
  "onboarding.dontShowAgain": "Don't show again",

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
  "section.roadmap.eyebrow": "Learning hub",
  "section.roadmap.title": "Roadmap",
  "section.roadmap.missions": "Missions",

  "legend.particle": "Particle legend",
  "legend.enzyme": "Blue circle = Enzyme",
  "legend.substrate": "Green triangle = Substrate",
  "legend.product": "Yellow half-circle = Product",
  "legend.notch": "Notch = Active site",

  "control.substrate": "Substrate Concentration",
  "control.enzyme": "Enzyme Concentration",
  "control.temperature": "Temperature",
  "control.inhibitor": "Inhibitor Concentration",
  "control.duration": "Measurement duration",
  "control.durationHelp": "Longer runs collect more simulated seconds before calculating average velocity.",
  "control.speed": "Speed",
  "control.speedHelp": "Speed changes how fast the simulation runs on screen. Results are measured in simulation time.",
  "control.enzymeSystem": "Enzyme system",
  "control.studentName": "Student Name",
  "control.teacherEmail": "Teacher Email",
  "control.optionalPlaceholder": "Optional",
  "control.teacherEmailPlaceholder": "teacher@example.com",

  "action.runExperiment": "Run Experiment",
  "action.roadmap": "Roadmap",
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
  "action.closeRoadmap": "Close roadmap",
  "action.closeCheckpoint": "Close checkpoint",
  "action.closeGuided": "Close guided explanation",
  "action.continue": "Continue",
  "action.newQuestion": "New Question",
  "action.skipToFree": "Skip to Free Exploration",

  "prediction.prompt": "What do you predict for this run?",
  "prediction.vmaxPrompt": "What will happen to the maximum velocity?",
  "prediction.increaseLot": "Velocity will increase a lot",
  "prediction.increaseSlightly": "Velocity will increase slightly",
  "prediction.staySimilar": "Velocity will stay similar",
  "prediction.decrease": "Velocity will decrease",
  "prediction.skip": "Run without prediction",

  "measurement.empty": "Run an experiment to measure reaction velocity.",
  "measurement.initialSubstrate": "Initial [S]",
  "measurement.enzymeCount": "Enzymes",
  "measurement.products": "Products",
  "measurement.time": "Time",
  "measurement.velocity": "Velocity",
  "measurement.occupancy": "Avg occupancy",
  "measurement.speed": "Speed",
  "measurement.seconds": "{seconds} sec",
  "measurement.velocityValue": "{velocity} products/sec",
  "measurement.occupancyValue": "{occupancy}%",
  "measurement.averageOccupancySummary": "Average enzyme occupancy: {occupancy}%",
  "measurement.occupancyMeterLabel": "Average enzyme occupancy",
  "measurement.occupancyMeaning":
    "Occupancy means what percentage of enzymes were busy during the experiment.",
  "measurement.speedValue": "x{speed}",

  "status.ready": "Ready to measure.",
  "status.currentSeriesCleared": "Current series cleared. Ready to measure.",
  "status.settingsUpdated": "Settings updated. Run an experiment to add this condition series.",
  "status.measuring": "Measuring... {elapsed} / {total} seconds",
  "status.measuredVelocity": "Measured velocity: {velocity} products/sec",

  "quiz.locked": "Complete at least 1 experiment to unlock checkpoint questions.",
  "quiz.complete":
    "You’ve completed all available checkpoint questions for the current experiments. To continue, change the experiment settings and run another measurement.",

  "series.pending":
    "Pending settings -- enzyme {enzyme} | temp {temp}°C | inhibitor {inhibitor}%",
  "series.label": "Series {number} -- enzyme {enzyme} | temp {temp}°C | inhibitor {inhibitor}%",
  "series.loading": "Series 1 -- loading conditions",
  "series.pending":
    "Pending settings -- {system} | enzyme {enzyme} | temp {temp} C | inhibitor {inhibitor}%",
  "series.label":
    "Series {number} -- {system} | enzyme {enzyme} | temp {temp} C | inhibitor {inhibitor}%",

  "parameter.temp": "Temp: {temp}°C",
  "parameter.optimal": "Optimal: {temp}°C",
  "parameter.km": "Km: {km}",
  "parameter.inhibitor": "Inhibitor: {inhibitor}%",
  "scenario.facts": "Substrate: {substrate} | Product: {product}",

  "debug.initial":
    "Active enzymes: -- | Occupied: -- | Enzyme occupancy: --% | Collision checks: -- | Bindings: --",
  "debug.activeEnzymes": "Active enzymes: {count}",
  "debug.speed": "Speed: x{speed}",
  "debug.simulatedElapsed": "Sim elapsed: {seconds}s",
  "debug.realElapsed": "Real elapsed: {seconds}s",
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
  "scenario.amylase.intro":
    "You are investigating how saliva begins chemical digestion before food reaches the stomach.",
  "scenario.amylase.substrate": "Starch, a long carbohydrate found in foods such as bread and crackers.",
  "scenario.amylase.product": "Smaller sugars that can continue through digestion.",
  "scenario.amylase.optimalConditions": "Warm, near-neutral mouth conditions.",
  "scenario.amylase.hook":
    "A cracker can start tasting sweet because amylase is already breaking starch into sugar.",
  "scenario.amylase.simulationView":
    "Blue amylase enzymes search for green starch pieces and release yellow sugar products.",
  "scenario.amylase.discoveryPrompt":
    "Find out when adding more starch stops making the reaction much faster.",
  "scenario.amylase.desc":
    "Amylase digests starch in your mouth, turning long carbohydrate chains into smaller sugars before food reaches the stomach.",
  "scenario.pepsin.name": "Pepsin",
  "scenario.pepsin.source": "Human Stomach",
  "scenario.pepsin.intro":
    "You are investigating protein digestion inside the acidic environment of the stomach.",
  "scenario.pepsin.substrate": "Proteins from food.",
  "scenario.pepsin.product": "Shorter peptide fragments that can be broken down further.",
  "scenario.pepsin.optimalConditions": "Strongly acidic stomach conditions.",
  "scenario.pepsin.hook":
    "Pepsin works where many enzymes would unfold, using stomach acid as part of its working environment.",
  "scenario.pepsin.simulationView":
    "Blue pepsin enzymes meet green protein pieces and turn them into yellow peptide products.",
  "scenario.pepsin.discoveryPrompt":
    "Test how quickly pepsin can work before its active sites become the limit.",
  "scenario.pepsin.desc":
    "Pepsin breaks down proteins in highly acidic stomach conditions, where many other enzymes would lose their shape.",
  "scenario.taq.name": "Taq Polymerase",
  "scenario.taq.source": "Hot Springs Bacteria",
  "scenario.taq.intro":
    "You are investigating a heat-stable enzyme used to copy DNA in biotechnology labs.",
  "scenario.taq.substrate": "DNA building blocks matched against a template DNA strand.",
  "scenario.taq.product": "Newly copied DNA strands.",
  "scenario.taq.optimalConditions": "High-temperature thermal cycling.",
  "scenario.taq.hook":
    "Taq polymerase made PCR practical because it survives repeated heating that would destroy many enzymes.",
  "scenario.taq.simulationView":
    "Blue Taq polymerase enzymes use green DNA building blocks to make yellow copied DNA products.",
  "scenario.taq.discoveryPrompt":
    "Discover how substrate supply and occupied enzymes shape the maximum copying rate.",
  "scenario.taq.desc":
    "Taq Polymerase thrives at high temperatures and is used in PCR labs to copy DNA through repeated heating cycles.",
  "scenario.imageAlt": "{enzyme} from {source}",

  "roadmapIntro.eyebrow": "Welcome scientist",
  "roadmapIntro.title": "Start with the biological story",
  "roadmapIntro.whatIsEnzyme": "What is this enzyme?",
  "roadmapIntro.whatBreaksDown": "What does it break down?",
  "roadmapIntro.whatSeeing": "What are you seeing in the simulation?",
  "roadmapIntro.tryDiscover": "What should you try to discover?",
  "roadmapIntro.legendEnzyme": "enzyme",
  "roadmapIntro.legendSubstrate": "substrate",
  "roadmapIntro.legendProduct": "product",

  "roadmap.introEnzymeSystem.title": "Open the Roadmap",
  "roadmap.introEnzymeSystem.description":
    "Start the guided investigation and meet the main parts of an enzyme reaction.",
  "roadmap.identifyParticles.title": "Identify enzyme, substrate, and product",
  "roadmap.identifyParticles.description":
    "Recognize the enzyme, substrate, and product particles in the molecular view.",
  "roadmap.observeEnzymes.title": "Add {targetEnzymeCount} enzymes",
  "roadmap.observeEnzymes.description":
    "Set the enzyme count to {targetEnzymeCount} so the reaction has workers ready.",
  "roadmap.setIdealTemperature.title": "Set {targetTemperature} C",
  "roadmap.setIdealTemperature.description":
    "Adjust the temperature to the current enzyme's optimal temperature.",
  "roadmap.addSubstrate.title": "Add {targetSubstrateCount} substrates",
  "roadmap.addSubstrate.description":
    "Add {targetSubstrateCount} substrate molecules so enzymes have something to act on.",
  "roadmap.runFirstExperiment.title": "Run low substrate experiment",
  "roadmap.runFirstExperiment.description":
    "Run a measurement at {lowSubstrateCount} substrates and record the first velocity point.",
  "roadmap.increaseSubstrate.title": "Run medium substrate experiment",
  "roadmap.increaseSubstrate.description":
    "Change only substrate concentration to {mediumSubstrateCount}, predict, and run again.",
  "roadmap.observeOccupancy.title": "Reach high enzyme occupancy",
  "roadmap.observeOccupancy.description":
    "Use your substrate curve to find a run where many enzymes are busy.",
  "roadmap.buildGraphPoints.title": "Run high substrate experiment",
  "roadmap.buildGraphPoints.description":
    "Change only substrate concentration to {highSubstrateCount}, predict, and add a high-substrate point.",
  "roadmap.noticeSaturation.title":
    "Test whether more substrate always increases velocity by the same amount",
  "roadmap.noticeSaturation.description":
    "Run a high-substrate experiment and compare whether the velocity gain stays large.",
  "roadmap.discoverVmax.title": "Discover Vmax",
  "roadmap.discoverVmax.description":
    "Connect high enzyme occupancy with the flattening curve to reason about maximum reaction velocity.",
  "roadmap.discoverVmaxLocked.title": "Name the pattern",
  "roadmap.discoverVmaxLocked.description":
    "Collect enough evidence from the curve before naming the limit.",
  "roadmap.increaseEnzyme.title": "Change enzyme count to {comparisonEnzymeCount}",
  "roadmap.increaseEnzyme.description":
    "Unlock enzyme concentration and create a new condition series.",
  "roadmap.compareEnzymeSeries.title": "Compare enzyme concentration series",
  "roadmap.compareEnzymeSeries.description":
    "Run {comparisonPointCount} measurements in the higher-enzyme series and compare its curve.",
  "roadmap.fact.enzyme": "Enzyme",
  "roadmap.fact.substrate": "Substrate",
  "roadmap.fact.product": "Product",
  "roadmap.fact.optimalConditions": "Optimal conditions",
  "roadmap.progress": "{completed} / {total} missions completed",
  "roadmap.status.locked": "Locked",
  "roadmap.status.available": "Available",
  "roadmap.status.completed": "Completed",

  "guided.welcome.eyebrow": "Welcome scientist",
  "guided.welcome.title": "Build an enzyme investigation",
  "guided.welcome.investigate":
    "You will build a small enzyme lab one part at a time.",
  "guided.welcome.enzyme":
    "Enzymes are molecules that help chemical reactions happen.",
  "guided.welcome.substrate":
    "Substrates are the molecules enzymes act on; products are what form after the reaction.",
  "guided.welcome.measure":
    "We will measure how many products form each second.",
  "guided.welcome.discover":
    "Your question: why does reaction velocity eventually stop increasing much?",
  "guided.welcome.action":
    "First action: open Experiment Settings and set the enzyme count to {targetEnzymeCount}.",
  "guided.mission.substrate.eyebrow": "Mission 2",
  "guided.mission.substrate.title": "Add substrates",
  "guided.mission.substrate.body":
    "Substrates are the molecules enzymes bind and change into products.",
  "guided.mission.substrate.action":
    "Next action: use the substrate slider to add {targetSubstrateCount} molecules.",
  "guided.mission.temperature.eyebrow": "Mission 3",
  "guided.mission.temperature.title": "Set ideal conditions",
  "guided.mission.temperature.body":
    "Enzymes work best under certain conditions, including temperature.",
  "guided.mission.temperature.action":
    "Next action: adjust the temperature to {targetTemperature} C.",
  "guided.mission.measurement.eyebrow": "Mission 4",
  "guided.mission.measurement.title": "Run the first measurement",
  "guided.mission.measurement.body":
    "Now we will measure how many products form during a fixed time window.",
  "guided.mission.measurement.action":
    "Next action: run the experiment and make a quick prediction first.",
  "guided.result.firstExperiment.eyebrow": "First data point",
  "guided.result.firstExperiment.title": "What did we measure?",
  "guided.result.firstExperiment.measured":
    "This run formed {productsFormed} products in {measurementSeconds} seconds.",
  "guided.result.firstExperiment.velocity":
    "Average velocity is products divided by time: {averageVelocity} products/sec.",
  "guided.result.firstExperiment.xAxis":
    "X-axis = initial substrate concentration.",
  "guided.result.firstExperiment.yAxis":
    "Y-axis = average reaction velocity.",
  "guided.result.firstExperiment.graph":
    "The graph point uses substrate count on the x-axis and average velocity on the y-axis.",
  "guided.result.firstExperiment.action":
    "Next action: open Checkpoint Questions to practice reading this point.",
  "guided.curve.comparison.eyebrow": "Curve building",
  "guided.curve.comparison.title": "Compare the new point",
  "guided.curve.comparison.substrate":
    "Substrate changed from {previousSubstrate} to {currentSubstrate} ({substrateDelta}).",
  "guided.curve.comparison.velocity":
    "Average velocity changed from {previousVelocity} to {currentVelocity} products/sec ({velocityDelta}).",
  "guided.curve.comparison.action":
    "Keep enzyme count, temperature, and inhibitor fixed. Change only substrate concentration for the next point.",
  "guided.occupancy.eyebrow": "New evidence",
  "guided.occupancy.title": "Enzymes can be free or occupied",
  "guided.occupancy.meaning":
    "Occupancy means what percentage of enzymes were busy during the experiment.",
  "guided.occupancy.action":
    "Use the meter and checkpoint questions to connect high occupancy with enzymes becoming the bottleneck.",
  "guided.speed.eyebrow": "Convenience tool",
  "guided.speed.title": "Simulation speed unlocked",
  "guided.speed.meaning":
    "Speed changes how fast the simulation runs on screen. Results are measured in simulation time.",
  "guided.speed.action":
    "Use speed when you want the animation to finish sooner; it is not a biological reaction condition.",
  "guided.enzymeComparison.eyebrow": "New condition",
  "guided.enzymeComparison.title": "Change enzyme concentration",
  "guided.enzymeComparison.series":
    "Changing enzyme count creates a new color-coded series because the whole curve can change.",
  "guided.enzymeComparison.action":
    "Next action: set enzyme concentration to {comparisonEnzymeCount} while keeping temperature and inhibitor fixed.",
  "guided.enzymeSeries.eyebrow": "Series comparison",
  "guided.enzymeSeries.title": "Predict the new maximum",
  "guided.enzymeSeries.prediction":
    "More enzymes usually provide more active sites, so the maximum velocity may be higher.",
  "guided.enzymeSeries.action":
    "Run at least {comparisonPointCount} measurements in the new series. Use high substrate for one of them.",

  "vmaxReveal.eyebrow": "Evidence unlocked",
  "vmaxReveal.title": "Discover Vmax",
  "vmaxReveal.explanation":
    "When most enzymes are occupied, the reaction approaches its maximum velocity. Scientists call this Vmax.",
  "vmaxReveal.estimate": "Estimated Vmax from your highest point: {vmax} products/sec.",
  "vmaxReveal.formulaSummary": "Optional formula",
  "vmaxReveal.formula": "v = Vmax[S] / (Km + [S])",

  "freeExplore.eyebrow": "Extension",
  "freeExplore.title": "Free Exploration unlocked",
  "freeExplore.description":
    "You have enough evidence for the core model. Keep experimenting, change conditions, and use advanced checkpoints.",
  "freeExplore.compareEnzymes": "Compare enzymes.",
  "freeExplore.moreEnzymes": "Try more enzymes by changing enzyme concentration.",
  "freeExplore.inhibitors": "Add inhibitors and compare how velocity changes.",
  "freeExplore.temperatures": "Test different temperatures around and away from the optimum.",
  "freeExplore.scenarios": "Try different enzyme scenarios and compare their behavior.",
  "freeExplore.twoCurves": "Create two curves and compare their shapes.",

  "insight.empty": "Run an experiment to get a short science insight.",
  "insight.inhibitor":
    "Inhibitors reduce successful enzyme-substrate interactions, so velocity may be lower.",
  "insight.temperature": "The enzyme is far from its optimal temperature, so it works less efficiently.",
  "insight.flattening":
    "The curve is flattening. Many enzymes are already occupied, so adding more substrate has less effect.",
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
  "csv.prediction": "prediction",
  "csv.timestamp": "timestamp",

  "quiz.plotPoint.question":
    "Given {enzyme} enzymes, {substrate} substrates, and {velocity} products/sec, which point appears on the graph?",
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
    "Substrate increased from {lowerSubstrate} to {higherSubstrate}, but velocity changed only from {lowerVelocity} to {higherVelocity} products/sec. Why did velocity stop increasing much?",
  "quiz.saturation.answer":
    "Many enzymes were already occupied, so extra substrate had fewer free enzymes to bind.",
  "quiz.saturation.d1": "The X-axis changed from substrate concentration to time.",
  "quiz.saturation.d2": "The inhibitor must have increased during the run.",
  "quiz.saturation.d3": "The products made enzymes disappear.",
  "quiz.saturation.explanation":
    "When many enzymes are occupied, enzymes become the bottleneck, so adding more substrate has less effect.",
  "quiz.occupancyMeaning.question":
    "A run had {occupancy}% average enzyme occupancy. What does high occupancy mean?",
  "quiz.occupancyMeaning.answer": "Most enzymes were busy during the experiment.",
  "quiz.occupancyMeaning.d1": "Most enzymes disappeared from the simulation.",
  "quiz.occupancyMeaning.d2": "The substrate concentration was zero.",
  "quiz.occupancyMeaning.d3": "The graph should use time on the X-axis.",
  "quiz.occupancyMeaning.explanation":
    "High occupancy means many enzyme active sites were busy with substrate during the run.",
  "quiz.occupancyLimit.question":
    "Why can high enzyme occupancy limit reaction speed?",
  "quiz.occupancyLimit.answer":
    "Few free enzymes are left, so extra substrate has to wait for an enzyme.",
  "quiz.occupancyLimit.d1": "High occupancy means there are no substrates.",
  "quiz.occupancyLimit.d2": "High occupancy makes enzymes stop existing.",
  "quiz.occupancyLimit.d3": "High occupancy changes the X-axis into temperature.",
  "quiz.occupancyLimit.explanation":
    "When most enzymes are occupied, enzymes become the bottleneck because there are fewer free active sites.",
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
  "quiz.enzymeSeriesHigher.question":
    "Based on the higher measured velocities, which series likely had more enzymes?",
  "quiz.enzymeSeriesHigher.answer": "{higherSeries}",
  "quiz.enzymeSeriesHigher.lower": "{lowerSeries}",
  "quiz.enzymeSeriesHigher.same": "They likely used the same enzyme count.",
  "quiz.enzymeSeriesHigher.substrate": "The series with the lowest substrate count.",
  "quiz.enzymeSeriesHigher.explanation":
    "With temperature and inhibitor fixed, the higher-enzyme series usually reaches the higher maximum velocity.",
  "quiz.enzymeCountEffect.question": "What changes when enzyme count increases?",
  "quiz.enzymeCountEffect.answer":
    "The condition series changes, and the curve can approach a higher maximum velocity.",
  "quiz.enzymeCountEffect.d1": "Only the X coordinate changes; the curve stays the same.",
  "quiz.enzymeCountEffect.d2": "The substrate becomes the enzyme.",
  "quiz.enzymeCountEffect.d3": "The graph must stop using average velocity.",
  "quiz.enzymeCountEffect.explanation":
    "Enzyme count is a condition for the series. More enzymes means more active sites can work at once.",
  "quiz.vmaxMeaning.question": "What does Vmax represent?",
  "quiz.vmaxMeaning.answer": "The maximum reaction velocity the enzyme system approaches under these conditions.",
  "quiz.vmaxMeaning.d1": "The substrate concentration at the first graph point.",
  "quiz.vmaxMeaning.d2": "The time needed for one substrate to appear.",
  "quiz.vmaxMeaning.d3": "The number of products before the experiment starts.",
  "quiz.vmaxMeaning.explanation":
    "Vmax is a limit the curve approaches after many enzymes are already busy.",
  "quiz.vmaxFlattening.question": "Why does the graph flatten near Vmax?",
  "quiz.vmaxFlattening.answer": "Most enzymes are occupied, so enzyme availability limits the reaction rate.",
  "quiz.vmaxFlattening.d1": "The X-axis stops measuring substrate.",
  "quiz.vmaxFlattening.d2": "Products stop being counted on the graph.",
  "quiz.vmaxFlattening.d3": "Every enzyme turns permanently inactive.",
  "quiz.vmaxFlattening.explanation":
    "Near Vmax, extra substrate often waits because few enzyme active sites are free.",
  "quiz.vmaxSubstrateLimit.question": "Why doesn't adding substrate always increase velocity much?",
  "quiz.vmaxSubstrateLimit.answer": "Once many enzymes are occupied, substrate is no longer the main bottleneck.",
  "quiz.vmaxSubstrateLimit.d1": "More substrate always lowers the temperature.",
  "quiz.vmaxSubstrateLimit.d2": "More substrate changes velocity into the X-axis.",
  "quiz.vmaxSubstrateLimit.d3": "Substrate molecules stop colliding with enzymes at high counts.",
  "quiz.vmaxSubstrateLimit.explanation":
    "Adding substrate helps most when enzymes are free; the effect shrinks as enzyme occupancy rises.",
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
  "share.roadmapMissions": "Missions completed: {completed} / {total}",
  "share.roadmapVmax": "Vmax discovered: {discovered}",
  "share.roadmapExperimentPoints": "Experiment points collected: {count}",
  "share.roadmapSummaryTitle": "Roadmap Progress:",
  "share.yes": "Yes",
  "share.no": "No",
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

en.insightMessages = {
  empty: en["insight.empty"],
  inhibitor: en["insight.inhibitor"],
  temperature: en["insight.temperature"],
  flattening: en["insight.flattening"],
  lowSubstrate: en["insight.lowSubstrate"],
  compare: en["insight.compare"],
};

en.quizTemplates = {
  plotGraphPoint: {
    question: en["quiz.plotPoint.question"],
    explanation: en["quiz.plotPoint.explanation"],
  },
  xAxisMeaning: {
    question: en["quiz.xAxis.question"],
    correctAnswer: en["quiz.xAxis.answer"],
    distractors: [en["quiz.xAxis.d1"], en["quiz.xAxis.d2"], en["quiz.xAxis.d3"]],
    explanation: en["quiz.xAxis.explanation"],
  },
  yAxisMeaning: {
    question: en["quiz.yAxis.question"],
    correctAnswer: en["quiz.yAxis.answer"],
    distractors: [en["quiz.yAxis.d1"], en["quiz.yAxis.d2"], en["quiz.yAxis.d3"]],
    explanation: en["quiz.yAxis.explanation"],
  },
  conditionNotCoordinate: {
    question: en["quiz.condition.question"],
    correctAnswer: en["quiz.condition.answer"],
    substrateDistractor: en["quiz.condition.substrate"],
    velocityDistractor: en["quiz.condition.velocity"],
    explanation: en["quiz.condition.explanation"],
  },
  saturationInference: {
    question: en["quiz.saturation.question"],
    correctAnswer: en["quiz.saturation.answer"],
    distractors: [
      en["quiz.saturation.d1"],
      en["quiz.saturation.d2"],
      en["quiz.saturation.d3"],
    ],
    explanation: en["quiz.saturation.explanation"],
  },
  highOccupancyMeaning: {
    question: en["quiz.occupancyMeaning.question"],
    correctAnswer: en["quiz.occupancyMeaning.answer"],
    distractors: [
      en["quiz.occupancyMeaning.d1"],
      en["quiz.occupancyMeaning.d2"],
      en["quiz.occupancyMeaning.d3"],
    ],
    explanation: en["quiz.occupancyMeaning.explanation"],
  },
  occupancyLimitsSpeed: {
    question: en["quiz.occupancyLimit.question"],
    correctAnswer: en["quiz.occupancyLimit.answer"],
    distractors: [
      en["quiz.occupancyLimit.d1"],
      en["quiz.occupancyLimit.d2"],
      en["quiz.occupancyLimit.d3"],
    ],
    explanation: en["quiz.occupancyLimit.explanation"],
  },
  temperatureDoesNotAlwaysHelp: {
    question: en["quiz.temperature.question"],
    correctAnswer: en["quiz.temperature.answer"],
    distractors: [
      en["quiz.temperature.d1"],
      en["quiz.temperature.d2"],
      en["quiz.temperature.d3"],
    ],
    explanation: en["quiz.temperature.explanation"],
  },
  substrateDoublingMisconception: {
    question: en["quiz.substrateDouble.question"],
    correctAnswer: en["quiz.substrateDouble.answer"],
    distractors: [
      en["quiz.substrateDouble.d1"],
      en["quiz.substrateDouble.d2"],
      en["quiz.substrateDouble.d3"],
    ],
    explanation: en["quiz.substrateDouble.explanation"],
  },
  compareEnzymeSeriesVmax: {
    question: en["quiz.compareEnzyme.question"],
    correctAnswer: en["quiz.compareEnzyme.answer"],
    distractors: [
      en["quiz.compareEnzyme.d1"],
      en["quiz.compareEnzyme.d2"],
      en["quiz.compareEnzyme.d3"],
    ],
    explanation: en["quiz.compareEnzyme.explanation"],
  },
  enzymeSeriesHigher: {
    question: en["quiz.enzymeSeriesHigher.question"],
    correctAnswer: en["quiz.enzymeSeriesHigher.answer"],
    lowerSeriesDistractor: en["quiz.enzymeSeriesHigher.lower"],
    sameDistractor: en["quiz.enzymeSeriesHigher.same"],
    substrateDistractor: en["quiz.enzymeSeriesHigher.substrate"],
    explanation: en["quiz.enzymeSeriesHigher.explanation"],
  },
  enzymeCountEffect: {
    question: en["quiz.enzymeCountEffect.question"],
    correctAnswer: en["quiz.enzymeCountEffect.answer"],
    distractors: [
      en["quiz.enzymeCountEffect.d1"],
      en["quiz.enzymeCountEffect.d2"],
      en["quiz.enzymeCountEffect.d3"],
    ],
    explanation: en["quiz.enzymeCountEffect.explanation"],
  },
  vmaxMeaning: {
    question: en["quiz.vmaxMeaning.question"],
    correctAnswer: en["quiz.vmaxMeaning.answer"],
    distractors: [
      en["quiz.vmaxMeaning.d1"],
      en["quiz.vmaxMeaning.d2"],
      en["quiz.vmaxMeaning.d3"],
    ],
    explanation: en["quiz.vmaxMeaning.explanation"],
  },
  vmaxFlattening: {
    question: en["quiz.vmaxFlattening.question"],
    correctAnswer: en["quiz.vmaxFlattening.answer"],
    distractors: [
      en["quiz.vmaxFlattening.d1"],
      en["quiz.vmaxFlattening.d2"],
      en["quiz.vmaxFlattening.d3"],
    ],
    explanation: en["quiz.vmaxFlattening.explanation"],
  },
  vmaxSubstrateLimit: {
    question: en["quiz.vmaxSubstrateLimit.question"],
    correctAnswer: en["quiz.vmaxSubstrateLimit.answer"],
    distractors: [
      en["quiz.vmaxSubstrateLimit.d1"],
      en["quiz.vmaxSubstrateLimit.d2"],
      en["quiz.vmaxSubstrateLimit.d3"],
    ],
    explanation: en["quiz.vmaxSubstrateLimit.explanation"],
  },
  compareInhibitorSeries: {
    question: en["quiz.compareInhibitor.question"],
    correctAnswer: en["quiz.compareInhibitor.answer"],
    distractors: [
      en["quiz.compareInhibitor.d1"],
      en["quiz.compareInhibitor.d2"],
      en["quiz.compareInhibitor.d3"],
    ],
    explanation: en["quiz.compareInhibitor.explanation"],
  },
};

export default en;
