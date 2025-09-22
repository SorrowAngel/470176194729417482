#!/usr/bin/env node
const readline = require("readline");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));
const { config_domain, config_port, defaultPower } = require("./config.json");

let availableToys = [];
let domain, port, platform;
let demoMode = process.argv.includes("--demo");
let currentVibration = null;
let randomSequenceRunning = false;

// ------------------ Recent commands log ------------------
let recentCommands = [];
const MAX_RECENT = 10;
const MAX_RANDOM_LOGS = 10;
let randomLogs = [];
function logCommand(action, toy, power = null) {
  const timestamp = new Date().toTimeString().split(" ")[0];
  const entry = power !== null
    ? `[${timestamp}] ${action} ${toy} @ power ${power}`
    : `[${timestamp}] ${action} ${toy}`;
  recentCommands.push(entry);
  if (recentCommands.length > MAX_RECENT) recentCommands.shift();
}

const greetings = [
  "Cassidy is online — type 'help' for commands.",
  "Cassidy wants to play — type 'help' for a list of pleasures.",
  "Cassidy is here to serve you — type 'help' for commands.",
  "Cassidy is ready to please you — type 'help' for a list of naughtiness.",
  "I hope you got your squirting panties on! - type 'help' for a list of commands.",
  "You are such a slut! — type 'help' to see options."
];

function printRecentCommands() {
  console.log("\nRecent commands:");
  recentCommands.forEach(c => console.log("  " + c));
  console.log("-------------------------------");
}

const helpMessages = {
  main: `
Available commands:
  vibrate [toy] [power]  - Start vibrating a toy with optional power (0-20)
  pulse [toy] [power]    - Pulse preset
  circle [toy] [power]   - Circle preset
  grind [toy] [power]    - Grind preset

  pattern [toy] [name]   - Start a pattern on a toy
  random [toy]           - Continuous random vibration
  surprise [toy]         - Random surprise bursts
  mood [toy] [mode]      - Set a preset vibration pattern
  countdown [toy]        - Gradually increase power over time
  roll [toy]             - Roll a number and vibrate
  doubleroll [toy]       - Roll two dice (0-6 each); vibrates for the sum in seconds and power. Snake Eyes (1+1) = 17 power for 30s!
  riskyroll [toy] [maxRoll]  - Roll a number (1-maxRoll, default 100) and vibrate for that many seconds (max 60) power 1-20
  highlow [toy]          - Guess if next number is higher/lower
  treasure [toy]         - Dig for treasure!
  roulette [toy]         - Spin the roulette wheel
  dungeon [toy]          - Explore the dungeon!
  shockortreat [toy]     - Random shock or treat
  moods [toy]            - Continuous random mood mode
  whisper [toy]          - Gentle, unpredictable bursts
  horoscope [toy]        - Naughty horoscope reading
  date [toy]             - Go on a naughty date

  stop [toy]             - Stop current vibration
  status                 - Show current connection and toy details
  battery                - Show battery levels
  meow                   - [easter egg]
  exit                   - Exit the program

Use 'help <command>' for detailed information about a specific command
Example: 'help surprise' or 'help countdown'
  `,
  vibrate: `
Vibrate Command:
  Usage: vibrate [toy] [power]
  Description: Start vibrating a toy with a specific power level
  Parameters:
    toy: Which toy to use (defaults to ALL)
    power: Power level (0-20, must not exceed 20)
  Example: 'vibrate Bunny 15'
  `,
  pattern: `
Pattern Command:
  Usage: pattern [toy] [name]
  Description: Start a preset vibration pattern
  Available patterns:
    wave: Gentle up-and-down pattern (5-15 seconds per cycle)
    tease: Quick changes with varying intensities (0.8s per step)
    build: Gradual increase and decrease (1.5s per step)
  Parameters:
    toy: Which toy to use (defaults to ALL)
    name: Pattern name (wave, tease, or build)
  Example: 'pattern Bunny wave'
  `,
  random: `
Random Command:
  Usage: random [toy] [delay(s)] [maxPower]
  Description: Continuous random vibration
  Parameters:
    toy: Which toy to use (defaults to ALL)
    delay: Time between changes in seconds (default: 20)
    maxPower: Maximum power level (0-20, must not exceed 20)
  Example: 'random Bunny 10 15'
  `,
  surprise: `
Surprise Mode:
  Usage: surprise [toy] [minDelay(m)] [maxDelay(m)] [burstDuration(s)] [maxPower]
  Description: Random surprise bursts at varying intervals
  Parameters:
    toy: Which toy to use (defaults to ALL)
    minDelay: Minimum delay between bursts in minutes (default: 4)
    maxDelay: Maximum delay between bursts in minutes (default: 15)
    burstDuration: How long each burst lasts in seconds (default: 30)
    maxPower: Maximum power level (0-20, must not exceed 20)
  Example: 'surprise Bunny 2 10 20 15'
  `,
  countdown: `
Countdown Mode:
  Usage: countdown [toy] [timeInMinutes] [maxPower]
  Description: Gradually increase power over a set countdown
  Parameters:
    toy: Which toy to use (defaults to ALL)
    timeInMinutes: Duration of countdown
    maxPower: Maximum power level (0-20, must not exceed 20)
  Example: 'countdown Bunny 5 15'
  `,
  roll: `
Roll Command:
  Usage: roll [toy]
  Description: Roll a number and vibrate for that many seconds
  Parameters:
    toy: Which toy to use (defaults to ALL)
  Note: Power is random (1-10) and duration matches the roll (max 60s)
  Example: 'roll Bunny'
  `,
  doubleroll: `
Double Roll:
  Usage: doubleroll [toy]
  Description: Roll two dice and play with the results
  Parameters:
    toy: Which toy to use (defaults to ALL)
  Special feature: Snake Eyes (1+1) gives maximum power for 30s!
  Example: 'doubleroll Bunny'
  `,

  riskyroll: `
Risky Roll:
  Usage: riskyroll [toy] [maxRoll]
  Description: Roll a number and take a risk
  Parameters:
    toy: Which toy to use (defaults to ALL)
    maxRoll: Maximum number to roll (default: 100)
  Note: Power and duration match the roll (max 60s)
  Example: 'riskyroll Bunny 50'
  `,

  meow: `
Meow Command:
  Usage: meow [toy]
  Description: A cute little kitty purr
  Parameters:
    toy: Which toy to use (defaults to ALL)
  Note: Fixed power (13) and duration (2s)
  Example: 'meow Bunny'
  `,
  highlow: `
High/Low Game:
  Usage: highlow [toy]
  Description: Guess if next number is higher or lower
  Parameters:
    toy: Which toy to use (defaults to ALL)
  Note: Winning gives gentle teasing (power 5), losing gives stronger stimulation (power 15)
  Example: 'highlow Bunny'
  `,
  treasure: `
Treasure Hunt:
  Usage: treasure [toy]
  Description: Dig for treasure with naughty rewards
  Parameters:
    toy: Which toy to use (defaults to ALL)
  Possible outcomes:
    Dirt (no buzz)
    Silver (medium power)
    Gold (strong power)
    Diamond (intense power)
  Example: 'treasure Bunny'
  `,
  roulette: `
Roulette:
  Usage: roulette [toy]
  Description: Spin the naughty roulette wheel
  Parameters:
    toy: Which toy to use (defaults to ALL)
  Slots:
    Black: Low power (5)
    Red: Medium power (10)
    Green: Jackpot! (20)
  Example: 'roulette Bunny'
  `,
  dungeon: `
Dungeon Adventure:
  Usage: dungeon [toy]
  Description: Explore the dungeon and encounter naughty monsters
  Parameters:
    toy: Which toy to use (defaults to ALL)
  Note: Each monster's level determines power and duration
  Example: 'dungeon Bunny'
  `,
  shockortreat: `
Shock or Treat:
  Usage: shockortreat [toy]
  Description: Randomly receive a shock or treat
  Parameters:
    toy: Which toy to use (defaults to ALL)
  Possible outcomes:
    Treat (gentle buzz)
    Shock (strong buzz)
    Mega Treat (extended gentle)
    Punishing Shock (intense)
  Example: 'shockortreat Bunny'
  `,
  moods: `
Mood Mode:
  Usage: moods [toy]
  Description: Continuous random mood changes
  Parameters:
    toy: Which toy to use (defaults to ALL)
  Moods:
    relaxed: Gentle teasing
    teasing: Playful vibes
    naughty: Intense stimulation
    spicy: Maximum pleasure
  Example: 'moods Bunny'
  `,
  whisper: `
Whisper Mode:
  Usage: whisper [toy] [silent]
  Description: Gentle, unpredictable bursts of teasing
  Parameters:
    toy: Which toy to use (defaults to ALL)
    silent: Optional flag to hide messages
  Example: 'whisper Bunny' or 'whisper Bunny silent'
  `,
  horoscope: `
Horoscope:
  Usage: horoscope [toy]
  Description: Get a naughty horoscope reading
  Parameters:
    toy: Which toy to use (defaults to ALL)
  Note: Each sign has its own naughty interpretation
  Example: 'horoscope Bunny'
  `,
  date: `
Date Night:
  Usage: date [toy]
  Description: Go on a naughty date adventure
  Parameters:
    toy: Which toy to use (defaults to ALL)
  Note: Outcomes vary from gentle teasing to intense pleasure
  Example: 'date Bunny'
  `
};

// ------------------ Demo toys ------------------
const demoToys = {
  ABC123: {
    id: "ABC123",
    name: "Hush",
    nickName: "Bunny",
    battery: 87,
    status: 1,
    version: "1.0",
    firmware: "v2.3.1"
  },
};

const patterns = {
  wave: {
    sequence: [5, 10, 15, 10, 5],
    interval: 1000,
    description: "Gentle wave pattern"
  },
  tease: {
    sequence: [2, 8, 3, 12, 5, 15, 2],
    interval: 800,
    description: "Teasing pattern with varying intensities"
  },
  build: {
    sequence: [5, 7, 9, 11, 13, 15, 13, 11, 9, 7],
    interval: 1500,
    description: "Gradual build-up pattern"
  }
};

// ------------------ Helpers ------------------
function getToyName(id) {
  if (id === "ALL") return "All Toys";
  const toy = availableToys.find(t => t.id === id);
  return toy ? (toy.nickName || toy.toy) : null;
}

function stopCurrentVibration() {
  if (currentVibration) {
    if (currentVibration.interval) clearInterval(currentVibration.interval);
    if (currentVibration.pattern) {
      currentVibration.pattern = null;
      currentVibration.index = null;
    }
    currentVibration = null;
  }
  if (randomSequenceRunning) {
    randomSequenceRunning = false;
    console.log("Previous random sequence stopped.");
  }
  console.log("Previous vibration stopped.");
}

function showStatus() {
  console.log("Lovense Details:");
  console.log("  Domain:", domain);
  console.log("  Port:", port);
  console.log("  Platform:", platform);
  console.log("");//shaxzy
  console.log("  Toys:");
  for (const t of availableToys) {
    const name = t.nickName || t.toy;
    const id = t.id || "Unknown";//start shaxzy
    const battery = t.battery !== undefined ? t.battery + "%" : "Unknown";
    const version = t.version || "Unknown";
    const firmware = t.firmware || "Unknown";//stop shaxzy
    /*console.log(`  ${name}: (${t.id}) [Battery: ${t.battery}%]`);
    console.log("  Status: connected");*/
    console.log(`  Name: ${name}`);
    console.log(`  ID: ${t.id}`);
    console.log(`  Battery: ${t.battery !== undefined ? t.battery + "%" : "Unknown"}`);
    console.log(`  Version: ${t.version || "Unknown"}`);
    console.log(`  Firmware: ${t.firmware || "Unknown"}`);
    console.log("  Status: connected");
    console.log(""); // blank line for readability between toys
  }
}

function showHelp(cmd) {
  if (!cmd) {
    console.log(helpMessages.main);
    return;
  }

  const helpText = helpMessages[cmd.toLowerCase()];
  if (helpText) {
    console.log(`\n${helpText}`);
  } else {
    console.log(`\nNo additional help available for '${cmd}'`);
  }
}

// ------------------ Power bar helper ------------------
function printPowerBar(power, max = 20) {
  const filled = "█".repeat(power);
  const empty = "-".repeat(max - power);
  return `[${filled}${empty}] (${power}/${max})`;
}

// ------------------ Start vibration ------------------
async function startVibration(name, power, modeName = "Vibrating") {
  stopCurrentVibration();
  logCommand(modeName, name, power);
  console.log(`${demoMode ? "[Demo]" : ""} ${modeName} "${name}" at power ${power}...`);
  console.log(`Power: ${printPowerBar(power)}`); // Print only once

  currentVibration = { toy: name, power }; // No interval for non-random
}

// ------------------ Start random vibration ------------------
async function startRandomVibration(toy, delay = 20000, maxPower = 20) {
  stopCurrentVibration();
  randomSequenceRunning = true;

  const toyName = getToyName(toy) || toy;
  currentVibration = { toy, power: 0 };

  (async function randomLoop() {
    while (randomSequenceRunning) {
      const power = Math.floor(Math.random() * maxPower) + 1;
      currentVibration.power = power;

      console.log(`[${new Date().toTimeString().split(" ")[0]}] Random power now: ${toyName} ${printPowerBar(power)}`);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  })();
}

async function startPattern(toy, patternName) {
  const pattern = patterns[patternName];
  if (!pattern) {
    console.log("Pattern not found!");
    return;
  }

  stopCurrentVibration();
  console.log(`Starting pattern: ${patternName} - ${pattern.description}`);

  currentVibration = { toy, pattern, index: 0 };
  randomSequenceRunning = true;

  try {
    await (async function patternLoop() {
      while (randomSequenceRunning && currentVibration && currentVibration.pattern) {
        const power = pattern.sequence[currentVibration.index];
        currentVibration.power = power;
        console.log(`Pattern power: ${power}`);

        await new Promise(resolve => setTimeout(resolve, pattern.interval));
        if (!currentVibration || !currentVibration.pattern) return;
        currentVibration.index = (currentVibration.index + 1) % pattern.sequence.length;
      }
    })();
  } catch (error) {
    console.error("Pattern loop error:", error);
  }
}

// ------------------ Startup ------------------
(async function init() {
  if (demoMode) {
    console.log("Running in DEMO mode — no network calls.\n");
    domain = "demo.local";
    port = 30010;
    platform = "pc";
    availableToys = Object.values(demoToys).map(t => ({
      toy: t.name,
      nickName: t.nickName,
      id: t.id,
      battery: t.battery || 0,
      version: t.version || "Unknown",
      firmware: t.firmware || "Unknown"
    }));
    printToyList(demoToys);
    startCLI();
    return;
  }

  try {
    const response = await fetch("https://api.lovense.com/api/lan/getToys");
    const lovenseConfig = await response.json();
    const keys = Object.keys(lovenseConfig);

    if (keys.length === 0) {
      if (config_domain && config_port) await directConfig();
      else throw new Error("No toys found and no direct config supplied.");
    } else if (keys.length > 1) {
      throw new Error("Multiple users on network are not supported.");
    } else {
      domain = keys[0];
      const lovenseDetails = lovenseConfig[domain];
      port = lovenseDetails.httpsPort;
      platform = lovenseDetails.platform;
      printToyList(lovenseDetails.toys);
      startCLI();
    }
  } catch (e) {
    console.error("Error loading toys:", e.message);
    process.exit(1);
  }
})();

async function directConfig() {
  const res = await fetch(`https://${config_domain}:${config_port}/GetToys`);
  const json = await res.json();
  if (json.code !== "200") throw new Error(`Unexpected code ${json.code}`);

  domain = config_domain;
  port = config_port;
  platform = config_domain.includes("127-0-0-1") ? "pc" : "mobile?";
  printToyList(json.data);
  startCLI();
}

function printToyList(toys) {
  console.log("Lovense Details:");
  console.log("  Domain:", domain);
  console.log("  Port:", port);
  console.log("  Platform:", platform);
  console.log("  Toys:");
  for (const [id, toy] of Object.entries(toys)) {
    const name = toy.nickName || toy.name;
    console.log(`  ${name}: (${id}) [Battery: ${toy.battery}%]`);
    console.log("  Status: connected");
    if (!availableToys.find(t => t.id === id)) {
      availableToys.push({ toy: name, nickName: toy.nickName, id, battery: toy.battery || 0 });
    }
  }
}

// ------------------ CLI ------------------
function startCLI() {
  const greeting = greetings[Math.floor(Math.random() * greetings.length)];
  console.log(`\n${greeting}\n`);
  console.log('\nPress f1 or f4 to quickly exit the program.');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    process.stdin.on('keypress', (str, key) => {
        if (key.name === 'f1' || key.name === 'f4') {
            console.log('\nPanic key activated! Goodbye!');
            rl.close();
            process.exit(0);
        }
    });

    process.stdin.on('close', () => {
        process.exit(0);
    });

  rl.prompt();
  rl.on("line", async (line) => {
    const [cmd, ...args] = line.trim().split(/\s+/);
    console.clear(); // <-- new: clear screen before handling the command
    try {
      switch (cmd) {
        case "exit":
          rl.close();
          return;

        case "battery":
          await showBattery();
          break;

        case "status":
          showStatus();
          break;

        case "s": //shaxzy
        case "stop":
          stopCurrentVibration();
          break;

        case "vibrate": {
          let toy = args[0] || "ALL";
          let power = Math.min(Math.max(parseInt(args[1], 10) || 10, 0), 20);
          const name = getToyName(toy) || toy;
          await startVibration(name, power, "Vibrating");
          break;
        }

        case "pulse":
        case "circle":
        case "grind": {
          let toy = args[0] || "ALL";
          let power = Math.min(Math.max(parseInt(args[1], 10) || 10, 0), 20);
          const name = getToyName(toy) || toy;
          const modeName = cmd.charAt(0).toUpperCase() + cmd.slice(1) + "ing";
          await startVibration(name, power, modeName);
          break;
        }

        case "random": {
          let toy = args[0] || "ALL";

          // Optional arguments
          const delay = args[1] ? parseInt(args[1], 10) * 1000 : 20000; // default 20s
          const maxPower = args[2] ? Math.min(Math.max(parseInt(args[2], 10), 0), 20) : 20; // default 20

          const toyName = getToyName(toy) || toy;
          currentVibration = { toy, power: 0 };

          // Print activation message showing the values being used
          console.log(`\nRandom vibration mode activated!\nToy: "${toyName}"`);
          console.log(`- Delay between updates: ${delay / 1000} seconds`);
          console.log(`- Maximum power: ${maxPower}/20`);
          console.log(`- Runs indefinitely until you type "stop"\n`);

          await startRandomVibration(toy, delay, maxPower);
          break;
        }

        case "surprise": {
          stopCurrentVibration();
          randomSequenceRunning = true;

          let toy = args[0] || "ALL";
          const toyName = getToyName(toy) || toy;

          // Optional arguments (reordered)
          const minDelay = args[1] ? parseInt(args[1], 10) * 60000 : 4 * 60 * 1000;   // 4 min default
          const maxDelay = args[2] ? parseInt(args[2], 10) * 60000 : 30 * 60 * 1000;  // 30 min default
          const burstDuration = args[3] ? Math.min(Math.max(parseInt(args[3], 10), 1), 60) * 1000 : 30 * 1000; // 30s default
          const maxPower = args[4] ? Math.min(Math.max(parseInt(args[4], 10), 0), 20) : 20;  // 20 default

          currentVibration = { toy, power: 0 };

          // Print a clear activation message showing all key parameters
          console.log(`\nSurprise mode activated!\nToy: "${toyName}"`);
          console.log(`- Min delay between bursts: ${minDelay / 60000} minutes`);
          console.log(`- Max delay between bursts: ${maxDelay / 60000} minutes`);
          console.log(`- Each burst lasts: ${burstDuration / 1000} seconds`);
          console.log(`- Max power: ${maxPower}/20`);
          console.log(`- Runs until you type "stop"\n`);

          (async function surpriseLoop() {
            while (randomSequenceRunning) {
              const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
              await new Promise(resolve => setTimeout(resolve, delay));
              if (!randomSequenceRunning) break;

              const power = Math.floor(Math.random() * maxPower) + 1;
              currentVibration.power = power;

              console.log(`[${new Date().toTimeString().split(" ")[0]}] Surprise! Power: ${toyName} ${printPowerBar(power)}`);

              await new Promise(resolve => setTimeout(resolve, burstDuration)); // Use user-defined burst duration
              currentVibration.power = 0;
              console.log(`[${new Date().toTimeString().split(" ")[0]}] Surprise finished: ${toyName} is resting... for now *wink*`);
            }
          })();

          break;
        }

        case "mood": {
          stopCurrentVibration();

          let toy = args[0] || "ALL";
          const toyName = getToyName(toy) || toy;

          let mode = args[1];
          if (!mode || !["gentle", "intense", "teasing"].includes(mode.toLowerCase())) {
            console.log("Invalid mode. Available modes: gentle, intense, teasing");
            break;
          }

          const maxPower = args[2] ? Math.min(Math.max(parseInt(args[2], 10), 0), 20) : 10;

          currentVibration = { toy, power: 0 };
          randomSequenceRunning = true;

          // Dynamic activation message
          console.log(`\nMood mode activated!`);
          console.log(`- Toy: ${toyName}`);
          console.log(`- Mode: ${mode}`);
          console.log(`- Max power: ${maxPower}/20`);
          console.log(`- Runs indefinitely until you type "stop"\n`);

          (async function moodLoop() {
            while (randomSequenceRunning) {
              let power;
              switch (mode.toLowerCase()) {
                case "gentle":
                  power = Math.floor(Math.random() * (maxPower / 2)) + 1; // soft and slow
                  await new Promise(resolve => setTimeout(resolve, 15000)); // 15s interval
                  break;
                case "intense":
                  power = Math.floor(Math.random() * maxPower) + 1; // strong, random bursts
                  await new Promise(resolve => setTimeout(resolve, 7000)); // 7s interval
                  break;
                case "teasing":
                  power = Math.floor(Math.random() * maxPower) + 1;
                  await new Promise(resolve => setTimeout(resolve, Math.floor(Math.random() * 55000) + 5000)); // 5-25s random interval
                  break;
              }

              currentVibration.power = power;
              console.log(`[${new Date().toTimeString().split(" ")[0]}] Mood "${mode}": ${toyName} ${printPowerBar(power)}`);
            }
          })();

          break;
        }

        case "countdown": {
          stopCurrentVibration();
          let toy = args[0] || "ALL";
          const toyName = getToyName(toy) || toy;

          const totalMinutes = args[1] ? parseFloat(args[1]) : null;
          if (!totalMinutes || totalMinutes <= 0) {
            console.log("Please provide a valid countdown time in minutes.");
            break;
          }

          const maxPower = args[2] ? Math.min(Math.max(parseInt(args[2], 10), 0), 20) : 10;

          currentVibration = { toy, power: 0 };
          randomSequenceRunning = true;

          console.log(`\nCountdown Tease activated!\nToy: "${toyName}"`);
          console.log(`- Duration: ${totalMinutes} minute(s)`);
          console.log(`- Max power: ${maxPower}/20`);
          console.log(`- Runs until the countdown ends or you type "stop"\n`);

          const totalTimeMs = totalMinutes * 60 * 1000;
          const intervalMs = 5000; // update every 5 seconds
          const steps = totalTimeMs / intervalMs;
          let currentStep = 0;

          (async function countdownLoop() {
            while (randomSequenceRunning && currentStep <= steps) {
              const power = Math.ceil((currentStep / steps) * maxPower);
              currentVibration.power = power;

              console.log(`[${new Date().toTimeString().split(" ")[0]}] Countdown power: ${toyName} ${printPowerBar(power)}`);

              await new Promise(resolve => setTimeout(resolve, intervalMs));
              currentStep++;
            }

            if (randomSequenceRunning) {
              console.log(`\nCountdown finished: ${toyName} reached max power ${maxPower}!`);
              currentVibration.power = 0;
              randomSequenceRunning = false;
            }
          })();

          break;
        }

        case "recent":
          printRecentCommands();
          break;

        case "meow": {
          stopCurrentVibration();

          // Choose toy or default to ALL
          const toy = args[0] || "ALL";

          // Fixed power & duration
          const power = 13;
          const durationMs = 2000; // 2 seconds

          currentVibration = { toy, power };

          console.log('Meow!~ Kitten is purring >.<');

          setTimeout(() => {
            currentVibration.power = 0;
            currentVibration = null;
          }, durationMs);

          break;
        }

        case "riskyroll": {
          stopCurrentVibration();

          const toy = args[0] || "ALL";
          const maxRoll = Math.min(Math.max(parseInt(args[1], 10) || 100, 1), 100);

          const result = Math.floor(Math.random() * maxRoll) + 1;
          const durationSec = Math.min(result, 60);
          const power = Math.floor(Math.random() * 20) + 1;

          console.log(`Risky Roll! Rolled ${result}.`);
          console.log(`Vibrating ${getToyName(toy) || toy} at power ${power} for ${durationSec}s...`);

          currentVibration = { toy, power };

          setTimeout(() => {
            currentVibration.power = 0;
            currentVibration = null;
            console.log("Roll finished.");
          }, durationSec * 1000);

          break;
        }

        case "roll": {
          stopCurrentVibration();

          const toy = args[0] || "ALL";
          const result = Math.floor(Math.random() * 20) + 1; // 1–20
          const durationSec = result; // <= 20
          const power = Math.floor(Math.random() * 10) + 1; // 1–10

          console.log(`Roll! You got ${result}.`);
          console.log(`Vibrating ${getToyName(toy) || toy} at power ${power} for ${durationSec}s...`);

          currentVibration = { toy, power };

          setTimeout(() => {
            currentVibration.power = 0;
            currentVibration = null;
            console.log("Roll finished.");
          }, durationSec * 1000);

          break;
        }

        case "highlow": {
          const toy = args[0] || "ALL";

          // Two random numbers (1–20)
          const shown = Math.floor(Math.random() * 20) + 1;
          const hidden = Math.floor(Math.random() * 20) + 1;

          console.log(`High/Low! The number is ${shown}. Will the next be higher or lower? (Type 'h' or 'l')`);

          // Wait for one keypress from stdin
          process.stdin.once("data", (input) => {
            const guess = input.toString().trim().toLowerCase();
            const isHigher = hidden > shown;
            const correct = (guess === "h" && isHigher) || (guess === "l" && !isHigher);

            const durationSec = correct ? 5 : 3;
            const power = correct ? 5 : 15;

            console.log(`The hidden number was ${hidden}. ${correct ? "You guessed right!" : "Wrong guess!"}`);
            console.log(`Vibrating ${getToyName(toy) || toy} at power ${power} for ${durationSec}s...`);

            stopCurrentVibration();
            currentVibration = { toy, power };

            setTimeout(() => {
              currentVibration.power = 0;
              currentVibration = null;
              console.log("High/Low round finished.");
            }, durationSec * 1000);
          });

          break;
        }

        case "treasure": {
          stopCurrentVibration();

          const toy = args[0] || "ALL";
          const toyName = getToyName(toy) || toy;

          // Random outcome
          const roll = Math.random(); // 0–1
          let outcome, power, duration;

          if (roll < 0.01) {           // 1% chance
            outcome = "Diamond";
            power = 18;
            duration = 30;             // seconds
          } else if (roll < 0.16) {    // 15% chance
            outcome = "Gold";
            power = 12;
            duration = 8;              // seconds
          } else if (roll < 0.51) {    // 35% chance
            outcome = "Silver";
            power = 7;
            duration = 5;              // seconds
          } else {                      // 49% chance
            outcome = "Dirt";
            power = 0;
            duration = 0;
          }

          console.log(`You dug up: ${outcome}!`);

          if (power > 0) {
            console.log(`Vibrating ${toyName} at power ${power} for ${duration}s...`);
            currentVibration = { toy, power };

            setTimeout(() => {
              currentVibration.power = 0;
              currentVibration = null;
              console.log("Treasure dig finished!");
            }, duration * 1000);
          }

          break;
        }

        case "doubleroll": {
          stopCurrentVibration();

          const toy = args[0] || "ALL";
          const toyName = getToyName(toy) || toy;

          // Roll two dice (0–6)
          const die1 = Math.floor(Math.random() * 7);
          const die2 = Math.floor(Math.random() * 7);
          const sum = die1 + die2;

          let outcome, power, duration;

          if (die1 === 1 && die2 === 1) {
            outcome = "Snake Eyes!";
            power = 17;
            duration = 30;
          } else {
            outcome = `You rolled ${die1} + ${die2} = ${sum}`;
            power = sum;
            duration = sum; // seconds
          }

          console.log(outcome);
          console.log(`Vibrating ${toyName} at power ${power} for ${duration}s...`);

          if (power > 0) {
            currentVibration = { toy, power };

            setTimeout(() => {
              currentVibration.power = 0;
              currentVibration = null;
              console.log("Double roll finished!");
            }, duration * 1000);
          }

          break;
        }

        case "roulette": {
          stopCurrentVibration();

          const toy = args[0] || "ALL";
          const toyName = getToyName(toy) || toy;

          // Define the wheel slots (you can tweak probabilities by duplicating/removing slots)
          const wheel = [
            { color: "Black", power: 5, duration: 5 },   // low power
            { color: "Red", power: 10, duration: 8 },    // medium
            { color: "Red", power: 10, duration: 8 },
            { color: "Black", power: 5, duration: 5 },
            { color: "Green", power: 20, duration: 12 }, // jackpot
            { color: "Black", power: 5, duration: 5 },
            { color: "Red", power: 10, duration: 8 },
            { color: "Black", power: 5, duration: 5 }
          ];

          const slot = wheel[Math.floor(Math.random() * wheel.length)];

          console.log(`Roulette spin landed on ${slot.color}!`);
          console.log(`Vibrating ${toyName} at power ${slot.power} for ${slot.duration}s...`);

          if (slot.power > 0) {
            currentVibration = { toy, power: slot.power };

            setTimeout(() => {
              currentVibration.power = 0;
              currentVibration = null;
              console.log("Roulette spin finished!");
            }, slot.duration * 1000);
          }

          break;
        }

        case "doubleornothing": {
          stopCurrentVibration();

          const toy = args[0] || "ALL";
          const toyName = getToyName(toy) || toy;

          let currentPower = 5;    // starting power
          let currentDuration = 5; // starting duration
          let streak = 0;
          const MAX_STREAK = 3;

          console.log(`Double or Nothing activated on ${toyName}! Starting power: ${currentPower}, duration: ${currentDuration}s.`);

          (async function playStreak() {
            while (streak < MAX_STREAK) {
              const flip = Math.random() < 0.5 ? "Heads" : "Tails";
              console.log(`Coin flip: ${flip}`);

              if (flip === "Heads") {
                currentPower = Math.min(currentPower * 2, 20);       // cap power at 20
                currentDuration = Math.min(currentDuration * 2, 30); // cap duration at 30s
                streak++;
                console.log(`Heads! Power and duration doubled to ${currentPower}/${currentDuration}s. Current streak: ${streak}`);
                currentVibration = { toy, power: currentPower };

                await new Promise(resolve => setTimeout(resolve, currentDuration * 1000));
              } else {
                console.log("Tails! Vibration stopped. You lose the streak.");
                currentVibration = null;
                break;
              }
            }

            console.log("Double or Nothing round finished!");
          })();

          break;
        }

        case "dungeon": {
          stopCurrentVibration();

          const toy = args[0] || "ALL";
          const toyName = getToyName(toy) || toy;

          // Define monsters (level 1 → 15)
          const monsters = [
            { name: "Slime", level: 1 },
            { name: "Goblin", level: 2 },
            { name: "Kobold", level: 3 },
            { name: "Skeleton", level: 4 },
            { name: "Orc", level: 5 },
            { name: "Troll", level: 6 },
            { name: "Witch", level: 7 },
            { name: "Vampire Bat", level: 8 },
            { name: "Ghost", level: 9 },
            { name: "Golem", level: 10 },
            { name: "Dragon Whelp", level: 11 },
            { name: "Demon", level: 12 },
            { name: "Hydra", level: 13 },
            { name: "Lich", level: 14 },
            { name: "Ancient Dragon", level: 15 }
          ];

          // Pick a random monster
          const monster = monsters[Math.floor(Math.random() * monsters.length)];
          const power = monster.level;
          const duration = monster.level;

          console.log(`You encountered a Level ${monster.level} ${monster.name}!`);

          // Determine if defeated (5% chance)
          const defeated = Math.random() < 0.05;

          if (defeated) {
            const punishPower = 20;
            const punishDuration = 30;

            // Random defeat message
            const defeatMessages = [
              `You fought bravely, but Level ${monster.level} ${monster.name} was braver!`,
              `You never stood a chance against Level ${monster.level} ${monster.name}!`,
              `The Level ${monster.level} ${monster.name} defeated you swiftly!`,
              `Level ${monster.level} ${monster.name} was too powerful for you!`,
              `You tried, but Level ${monster.level} ${monster.name} bested you!`
            ];

            const message = defeatMessages[Math.floor(Math.random() * defeatMessages.length)];

            console.log(message);
            console.log(`Punished with ${punishPower} power for ${punishDuration}s.`);

            currentVibration = { toy, power: punishPower };
            setTimeout(() => {
              currentVibration.power = 0;
              currentVibration = null;
              console.log("Dungeon encounter finished!");
            }, punishDuration * 1000);

          } else {
            console.log(`Vibrating ${toyName} at power ${power} for ${duration}s...`);
            currentVibration = { toy, power };

            setTimeout(() => {
              currentVibration.power = 0;
              currentVibration = null;
              console.log("Monster successfully slayed!");
            }, duration * 1000);
          }

          break;
        }

        case "shockortreat": {
          stopCurrentVibration();

          const toy = args[0] || "ALL";
          const toyName = getToyName(toy) || toy;

          // Random roll (0-99)
          const roll = Math.floor(Math.random() * 100);
          let event = "";
          let power = 0;
          let duration = 0;

          if (roll < 5) { // 5% Punishing Shock
            event = "Punishing Shock!";
            power = 15;
            duration = 30;
          } else if (roll < 10) { // 5% Mega Treat
            event = "Mega Treat!";
            power = 5;
            duration = 30;
          } else if (roll < 55) { // 45% Shock
            event = "Shock!";
            power = 10;
            duration = 10;
          } else { // 45% Treat
            event = "Treat!";
            power = 5;
            duration = 10;
          }

          console.log(`Event: ${event} on ${toyName}`);
          console.log(`Vibrating at power ${power} for ${duration}s...`);

          if (power > 0) {
            currentVibration = { toy, power };
            setTimeout(() => {
              currentVibration.power = 0;
              currentVibration = null;
              console.log(`${event} finished!`);
            }, duration * 1000);
          }

          break;
        }

        case "moods": {
          stopCurrentVibration(); // Stop any previous sequences

          const toy = args[0] || "ALL";
          const toyName = getToyName(toy) || toy;

          // Fixed greeting
          const welcomeMessage = "Mood swings incoming… enjoy!";
          console.log(`\n${welcomeMessage}`);
          console.log(`Moods mode activated for ${toyName}. The mood will change at random intervals!\n`);

          const moods = {
            default: { power: 5, duration: 10, message: "Relaxed vibes activated." },
            teasing: { power: 7, duration: 15, message: "Teasing mode on… prepare yourself!" },
            playful: { power: 6, duration: 12, message: "Playful fun in progress!" },
            naughty: { power: 10, duration: 20, message: "Naughty mode engaged… ooh!" },
            spicy: { power: 12, duration: 18, message: "Spicy mode active… enjoy the heat!" }
          };

          const moodKeys = Object.keys(moods);

          randomSequenceRunning = true;

          (async function moodLoop() {
            while (randomSequenceRunning) {
              const selectedMoodKey = moodKeys[Math.floor(Math.random() * moodKeys.length)];
              const selectedMood = moods[selectedMoodKey];

              console.log(`\nMood changed to: ${selectedMoodKey.charAt(0).toUpperCase() + selectedMoodKey.slice(1)}`);
              console.log(selectedMood.message);
              console.log(`Vibrating ${toyName} at power ${selectedMood.power} for ${selectedMood.duration}s...`);

              currentVibration = { toy, power: selectedMood.power };

              await new Promise(resolve => setTimeout(resolve, selectedMood.duration * 1000));

              const minDelay = 2 * 60 * 1000;
              const maxDelay = 5 * 60 * 1000;
              const randomDelay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

              await new Promise(resolve => setTimeout(resolve, randomDelay));
            }
          })();

          break;
        }

        case "whisper": {
          stopCurrentVibration(); // Stop any previous sequences

          const toy = args[0] || "ALL";
          const silentMode = args[1] === "silent"; // Check if silent mode is enabled
          const toyName = getToyName(toy) || toy;

          // Array of playful start messages
          const startGreetings = [
            "Soft whispers incoming… shh!",
            "Psst… gentle teasing starts now!",
            "Quiet mischief is in the air…",
            "Shhh… Bunny is about to purr!",
            "Gentle vibes coming your way…",
            "Tiny sparks of fun are on the horizon!",
            "Hold tight… subtle teasing begins!",
            "A gentle surprise awaits you…",
            "Prepare for soft mischief!",
            "The whispering winds are here…"
          ];

          // Array of playful burst messages
          const burstMessages = [
            "Purring softly…",
            "A tiny tickle for you!",
            "Gentle teasing underway…",
            "Soft vibes activated!",
            "Whispering secrets…",
            "A subtle spark appears…",
            "Mini buzz incoming!",
            "Delicate fun in progress…",
            "Tiny mischief engaged!",
            "A soft surprise awaits…"
          ];

          if (!silentMode) {
            const welcomeMessage = startGreetings[Math.floor(Math.random() * startGreetings.length)];
            console.log(`\n${welcomeMessage}`);
            console.log(`Whisper mode activated for ${toyName}. Gentle teasing in progress…`);
          }

          randomSequenceRunning = true;

          (async function whisperLoop() {
            while (randomSequenceRunning) {
              const power = Math.floor(Math.random() * 5) + 1;
              const duration = Math.floor(Math.random() * 3) + 1; // 1–3 seconds

              if (!silentMode) {
                const burstMessage = burstMessages[Math.floor(Math.random() * burstMessages.length)];
                console.log(`${burstMessage} ${toyName} at power ${power} for ${duration}s...`);
              }

              currentVibration = { toy, power };

              // Wait for burst duration
              await new Promise(resolve => setTimeout(resolve, duration * 1000));

              currentVibration.power = 0;

              // Random interval 5–15 seconds
              const interval = Math.floor(Math.random() * 11000) + 5000;
              await new Promise(resolve => setTimeout(resolve, interval));
            }
          })();

          break;
        }

        case "horoscope": {
          const toy = args[0] || "ALL";
          const toyName = getToyName(toy) || toy;

          // Array of playful, naughty horoscopes
          const horoscopes = [
            {
              sign: "Aries",
              message: "Fiery energy today… someone deserves a naughty punishment!",
              power: 12,
              duration: 15
            },
            {
              sign: "Taurus",
              message: "Steady and obedient… gentle teasing for you, cutie <3",
              power: 5,
              duration: 10
            },
            {
              sign: "Gemini",
              message: "Double trouble! Two bursts of playful mischief are coming!",
              power: 7,
              duration: 12
            },
            {
              sign: "Cancer",
              message: "Emotional waves incoming… soft and submissive teasing awaits you.",
              power: 6,
              duration: 12
            },
            {
              sign: "Leo",
              message: "Bold and daring… maximum naughty vibes for the brave one!",
              power: 14,
              duration: 20
            },
            {
              sign: "Virgo",
              message: "Precise and teasing… careful, or you might get punished!",
              power: 8,
              duration: 12
            },
            {
              sign: "Libra",
              message: "Balanced fun… gentle rhythm, just enough to keep you on edge.",
              power: 6,
              duration: 12
            },
            {
              sign: "Scorpio",
              message: "Intense and seductive… brace yourself for a strong punishment!",
              power: 13,
              duration: 18
            },
            {
              sign: "Sagittarius",
              message: "Adventurous vibes! Expect an unpredictable naughty surprise.",
              power: 9,
              duration: 15
            },
            {
              sign: "Capricorn",
              message: "Slow buildup… teasing until you beg for mercy!",
              power: 7,
              duration: 12
            },
            {
              sign: "Aquarius",
              message: "Unpredictable fun… anything naughty can happen!",
              power: 10,
              duration: 15
            },
            {
              sign: "Pisces",
              message: "Dreamy and submissive… gentle waves of delight await you.",
              power: 5,
              duration: 10
            }
          ];

          // Pick a random horoscope
          const chosen = horoscopes[Math.floor(Math.random() * horoscopes.length)];

          console.log(`\nHoroscope for ${toyName}: ${chosen.sign}`);
          console.log(chosen.message);
          console.log(`Sending ${toyName} vibrations: power ${chosen.power} for ${chosen.duration}s...\n`);

          // Send vibration burst
          currentVibration = { toy, power: chosen.power };

          // Stop vibration after duration
          setTimeout(() => {
            currentVibration.power = 0;
          }, chosen.duration * 1000);

          break;
        }

        case "date": {
          const toy = args[0] || "ALL";
          const toyName = getToyName(toy) || toy;

          // List of random partners
          const partners = [
            "Alex", "Jamie", "Taylor", "Riley", "Jordan", "Casey",
            "Morgan", "Dakota", "Avery", "Quinn"
          ];

          // Randomly pick a partner
          const partner = partners[Math.floor(Math.random() * partners.length)];

          console.log(`\nYou're going on a date with ${partner}…`);

          const roll = Math.random(); // 0-1 for outcome determination

          if (roll < 0.05) {
            // Rare super-lucky event (5%)
            const superLuckyPhrases = [
              `Your date went beyond amazing! ${partner} gives you all of their loving!`,
              `Incredible! ${partner} couldn't resist… ultimate pleasure incoming!`,
              `A magical night with ${partner}! Prepare for intense vibrations!`,
              `Everything went perfectly! ${partner} spoils you with passion!`
            ];
            const phrase = superLuckyPhrases[Math.floor(Math.random() * superLuckyPhrases.length)];

            const power = Math.floor(Math.random() * 6) + 15; // 15-20
            const duration = Math.floor(Math.random() * 6) + 20; // 20-25 seconds

            console.log(phrase);
            currentVibration = { toy, power };
            setTimeout(() => {
              currentVibration.power = 0;
              console.log(`\nDate night is over... are you ready to go again?`);
            }, duration * 1000);
          } else if (roll < 0.25) {
            // Lucky outcome (20% chance)
            const luckyPhrases = [
              `Your date went amazing! ${partner} took you back to their place…`,
              `You hit it off with ${partner}! Pleasure awaits…`,
              `Wow! ${partner} couldn't resist you… naughty fun incoming!`,
              `The chemistry was off the charts! ${partner} sends you strong vibes…`,
              `You and ${partner} shared a steamy moment! Prepare for intense fun!`
            ];
            const phrase = luckyPhrases[Math.floor(Math.random() * luckyPhrases.length)];

            const power = Math.floor(Math.random() * 6) + 10; // 10-15
            const duration = Math.floor(Math.random() * 6) + 15; // 15-20 seconds

            console.log(phrase);
            currentVibration = { toy, power };
            setTimeout(() => {
              currentVibration.power = 0;
              console.log(`\nThe evening has ended... want to go again?`);
            }, duration * 1000);
          } else {
            // Unlucky outcome (75%)
            const unluckyPhrases = [
              `Your date with ${partner} was awkward… yikes. You end up going home alone.`,
              `The date didn't go well… just a tiny tease for your troubles.`,
              `Not quite lucky… ${partner} wasn't impressed. Soft vibes only.`,
              `A quiet evening… ${partner} left early, you barely got a buzz.`,
              `Oh no! ${partner} wasn't feeling it… gentle teasing to console you.`,
              `${partner} didn't vibe with you… weak waves of pleasure instead.`
            ];
            const phrase = unluckyPhrases[Math.floor(Math.random() * unluckyPhrases.length)];

            const power = Math.floor(Math.random() * 5) + 1; // 1-5
            const duration = Math.floor(Math.random() * 5) + 3; // 3-7 seconds

            console.log(phrase);
            currentVibration = { toy, power };
            setTimeout(() => {
              currentVibration.power = 0;
              console.log(`\nTime to say goodnight... unless you're ready to try again?`);
            }, duration * 1000);
          }

          break;
        }

        case "pattern": {
          const toy = args[0] || "ALL";
          const patternName = args[1];
          if (!patternName) {
            console.log("Available patterns:");
            Object.entries(patterns).forEach(([name, pattern]) => {
              console.log(`- ${name}: ${pattern.description}`);
            });
            return;
          }
          await startPattern(toy, patternName);
          break;
        }

        case "help":
          const cmd = args[0];
          showHelp(cmd);
          break;

        default:
          console.log("Unknown command. Type 'help' for a list.");
      }
    } catch (e) {
      console.error("Error:", e.message);
    }
    rl.prompt();
  });
}

// ------------------ Show battery ------------------
async function showBattery() {
  console.log("\nBattery levels:");
  for (const toy of availableToys) {
    console.log(`  ${toy.nickName || toy.toy}: ${toy.battery !== undefined ? toy.battery + "%" : "Unknown"}`);
  }
  console.log("-------------------------------");
}

// ------------------ Helpers ------------------
function lovenseUrl(endpoint, values) {
  let ep = endpoint;
  if (endpoint.startsWith("A") && platform == "pc") ep = endpoint.substring(1);
  return (
    `https://${domain}:${port}/${ep}` +
    (Object.keys(values).length > 0
      ? `?${Object.entries(values).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`
      : "")
  );
}

//
function getToyName(id) {
  if (id === "ALL" || !id) {
    // If exactly one toy is connected, return its nickname/name
    if (availableToys.length === 1) {
      return availableToys[0].nickName || availableToys[0].toy;
    }
    // If there are several toys, keep "All Toys"
    return "All Toys";
  }
  const toy = availableToys.find(t => t.id === id);
  return toy ? (toy.nickName || toy.toy) : null;
}
