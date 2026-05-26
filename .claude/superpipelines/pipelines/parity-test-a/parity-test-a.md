# parity-test-a

> Parity pipeline for Tier 1 (Claude Code). Sequential, 2 steps, no reviewer.
> Entry skill: `run-parity-test-a`

## Goal

Read a YAML file and produce a flat key-value summary of its top-level entries, written to `output/` as a text file.

## Steps

1. **reader** — Reads the YAML file, extracts top-level keys and their string-rendered values, writes `key-value-data.json` to temp.
2. **summarizer** — Renders an aligned plain-text summary table from `key-value-data.json`, writes `parity-test-a-summary.txt` to `output/`.

## Usage

Invoke via the `run-parity-test-a` skill. Supply the path to a YAML file when prompted.
