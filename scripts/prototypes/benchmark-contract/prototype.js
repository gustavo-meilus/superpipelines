import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { deriveMetrics, initialState, reduceEvent } from "./contract.js";

const directory = path.dirname(fileURLToPath(import.meta.url));
const fixtures = [
  { key: "1", name: "bounded-mutation", file: "bounded-mutation.jsonl" },
  { key: "2", name: "process-and-approval", file: "process-and-approval.jsonl" },
];

function loadFixture(fixture) {
  return fs
    .readFileSync(path.join(directory, "fixtures", fixture.file), "utf8")
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));
}

let selected = fixtures[0];
let events = loadFixture(selected);
let cursor = 0;
let state = initialState(selected.name);

function reset(fixture = selected) {
  selected = fixture;
  events = loadFixture(selected);
  cursor = 0;
  state = initialState(selected.name);
}

function advance() {
  if (cursor >= events.length) return;
  state = reduceEvent(state, events[cursor]);
  cursor += 1;
}

function render() {
  console.clear();
  const bold = "\x1b[1m";
  const dim = "\x1b[2m";
  const resetAnsi = "\x1b[0m";
  const last = state.events.at(-1) ?? null;
  console.log(`${bold}PROTOTYPE — Superpipelines benchmark contract${resetAnsi}`);
  console.log(`${dim}Synthetic trace replay; no model or consumer pipeline is invoked.${resetAnsi}\n`);
  console.log(`${bold}State${resetAnsi}`);
  console.log(JSON.stringify({
    fixture: selected.name,
    event: `${cursor}/${events.length}`,
    current_phase: state.currentPhase,
    last_event: last,
    open_work_spans: [...state.openWork.keys()],
    open_wait_spans: [...state.openWaits.keys()],
    open_process_spans: [...state.openProcesses.keys()],
    metrics: deriveMetrics(state),
  }, null, 2));
  console.log(`\n${bold}[1]${resetAnsi} mutation  ${bold}[2]${resetAnsi} process + approval  ${bold}[n]${resetAnsi} next  ${bold}[a]${resetAnsi} all  ${bold}[r]${resetAnsi} reset  ${bold}[q]${resetAnsi} quit`);
}

readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.on("keypress", (_text, key) => {
  if (key.ctrl && key.name === "c") process.exit(0);
  if (key.name === "q") process.exit(0);
  if (key.name === "1" || key.name === "2") reset(fixtures.find((item) => item.key === key.name));
  if (key.name === "n") advance();
  if (key.name === "a") while (cursor < events.length) advance();
  if (key.name === "r") reset();
  render();
});

render();
