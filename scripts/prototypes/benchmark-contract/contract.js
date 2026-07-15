const ACTIVE_KINDS = new Set(["orchestration", "model_dispatch"]);

function timestamp(value) {
  return Date.parse(value);
}

function closeSpan(open, event, expectedKind) {
  const started = open.get(event.span_id);
  if (!started || started.kind !== expectedKind) {
    throw new Error(`Cannot close ${event.span_id}; no matching ${expectedKind} span is open`);
  }
  open.delete(event.span_id);
  return { ...started, end: timestamp(event.at) };
}

function unionDuration(spans) {
  const sorted = spans
    .filter((span) => Number.isFinite(span.start) && Number.isFinite(span.end))
    .sort((left, right) => left.start - right.start);
  if (sorted.length === 0) return 0;

  let total = 0;
  let start = sorted[0].start;
  let end = sorted[0].end;
  for (const span of sorted.slice(1)) {
    if (span.start <= end) {
      end = Math.max(end, span.end);
    } else {
      total += end - start;
      start = span.start;
      end = span.end;
    }
  }
  return total + end - start;
}

export function initialState(fixtureName) {
  return {
    fixtureName,
    events: [],
    operation: null,
    currentPhase: null,
    phases: [],
    openWork: new Map(),
    work: [],
    openWaits: new Map(),
    waits: [],
    openProcesses: new Map(),
    processes: [],
    processActivity: new Map(),
    auditIterations: 0,
    failureDetectionPhase: null,
    optionalTelemetry: { token_cost: "unavailable", monetary_cost: "unavailable" },
  };
}

export function reduceEvent(state, event) {
  const next = {
    ...state,
    events: [...state.events, event],
    phases: [...state.phases],
    openWork: new Map(state.openWork),
    work: [...state.work],
    openWaits: new Map(state.openWaits),
    waits: [...state.waits],
    openProcesses: new Map(state.openProcesses),
    processes: [...state.processes],
    processActivity: new Map(
      [...state.processActivity].map(([key, values]) => [key, [...values]]),
    ),
  };

  switch (event.kind) {
    case "operation.started":
      next.operation = { id: event.operation_id, start: timestamp(event.at), end: null };
      break;
    case "operation.finished":
      next.operation = { ...next.operation, end: timestamp(event.at) };
      break;
    case "phase.entered":
      next.currentPhase = event.phase;
      if (!next.phases.includes(event.phase)) next.phases.push(event.phase);
      break;
    case "work.started":
      next.openWork.set(event.span_id, {
        kind: "work",
        work_kind: event.work_kind,
        phase: event.phase,
        start: timestamp(event.at),
      });
      break;
    case "work.finished":
      next.work.push(closeSpan(next.openWork, event, "work"));
      break;
    case "wait.started":
      next.openWaits.set(event.span_id, {
        kind: "wait",
        reason: event.reason,
        phase: event.phase,
        start: timestamp(event.at),
      });
      break;
    case "wait.finished":
      next.waits.push(closeSpan(next.openWaits, event, "wait"));
      break;
    case "tool_process.started":
      next.openProcesses.set(event.span_id, {
        kind: "tool_process",
        phase: event.phase,
        start: timestamp(event.at),
      });
      next.processActivity.set(event.span_id, [timestamp(event.at)]);
      break;
    case "tool_process.activity":
      next.processActivity.set(event.span_id, [
        ...(next.processActivity.get(event.span_id) ?? []),
        timestamp(event.at),
      ]);
      break;
    case "tool_process.finished": {
      const process = closeSpan(next.openProcesses, event, "tool_process");
      next.processes.push(process);
      next.processActivity.set(event.span_id, [
        ...(next.processActivity.get(event.span_id) ?? []),
        timestamp(event.at),
      ]);
      break;
    }
    case "audit.iteration":
      next.auditIterations += 1;
      break;
    case "failure.detected":
      next.failureDetectionPhase = event.phase;
      break;
    case "telemetry.observed":
      next.optionalTelemetry = {
        token_cost: event.token_cost ?? "unavailable",
        monetary_cost: event.monetary_cost ?? "unavailable",
      };
      break;
    default:
      throw new Error(`Unknown event kind: ${event.kind}`);
  }
  return next;
}

function maxActivityGap(activity) {
  let maximum = null;
  for (const points of activity.values()) {
    const ordered = [...points].sort((left, right) => left - right);
    for (let index = 1; index < ordered.length; index += 1) {
      maximum = Math.max(maximum ?? 0, ordered[index] - ordered[index - 1]);
    }
  }
  return maximum;
}

export function deriveMetrics(state) {
  const activeSpans = state.work.filter((span) => ACTIVE_KINDS.has(span.work_kind));
  const modelSpans = state.work.filter((span) => span.work_kind === "model_dispatch");
  const maximumGap = maxActivityGap(state.processActivity);
  return {
    wall_elapsed_ms:
      state.operation?.end == null ? null : state.operation.end - state.operation.start,
    active_elapsed_ms: unionDuration(activeSpans),
    waiting_ms: unionDuration(state.waits),
    tool_process_ms: unionDuration(state.processes),
    phase_count: state.phases.length,
    model_dispatch_count: modelSpans.length,
    audit_iterations: state.auditIterations,
    failure_detection_phase: state.failureDetectionPhase,
    max_process_activity_gap_ms: maximumGap,
    process_activity_within_30s: maximumGap == null ? null : maximumGap <= 30_000,
    optional_telemetry: state.optionalTelemetry,
  };
}
