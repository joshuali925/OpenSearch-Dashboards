// package.json
var package_default = {
  name: "opensearch-observability-stack-mcp",
  version: "1.0.0",
  type: "module",
  description: "MCP server providing OpenSearch UI apps (traces, etc.) over a SigV4-authenticated connection to an OpenSearch UI application.",
  bin: {
    "opensearch-observability-stack-mcp": "dist/server.js"
  },
  main: "dist/server.js",
  files: [
    "dist",
    "manifest.json",
    "README.md"
  ],
  engines: {
    node: ">=22"
  },
  publishConfig: {
    access: "public"
  },
  "npm-pretty-much": {
    allowUnsafeName: "This package is never distributed via npm \u2014 it ships only as a .mcpb bundle through S3/CloudFront, so there is no `npm install` workflow that could be subverted by an external name collision. The npm `name` is the user-visible bundle/manifest identity (opensearch-observability-stack-mcp); an @amzn/ rename would change what users see. The Brazil build exists solely for CRUX's dry-run gate and vends no artifact other Brazil packages consume. See NodeJS/NpmNameConflicts."
  },
  scripts: {
    version: "node scripts/sync-version.mjs && git add manifest.json",
    codegen: "tsx scripts/codegen-entries.ts && tsx scripts/codegen-llm-spec.ts && tsx packages/ui/scripts/codegen.ts",
    build: `npm run codegen && tsc --noEmit -p tsconfig.build.json && node scripts/build-ui.mjs && esbuild src/main.ts --bundle --platform=node --target=node22 --format=esm --define:__IS_PROD_BUILD__=true --outfile=dist/server.js --banner:js="#!/usr/bin/env node
import{createRequire}from 'node:module';const require=createRequire(import.meta.url);" && node -e "require('node:fs').copyFileSync('manifest.json','dist/manifest.json')" && node scripts/obfuscate.mjs && node -e "require('node:fs').chmodSync('dist/server.js',0o755)" && node scripts/pack-mcpb.mjs`,
    "build:osd-lib": "npm run codegen && node scripts/build-osd-lib.mjs && tsc -p tsconfig.osd-lib.json",
    serve: 'cross-env NODE_ENV=development concurrently "npm run codegen && node scripts/build-ui.mjs --watch" "node scripts/watch-codegen.mjs" "tsx --watch src/main.ts --http"',
    "serve:stdio": "tsx src/main.ts --stdio",
    test: "npm run codegen && vitest run",
    "test:watch": "vitest",
    "test:coverage": "npm run codegen && vitest run --coverage",
    gallery: "npm run codegen && vite --config packages/ui/gallery/vite.gallery.config.ts",
    prepare: "node scripts/install-hooks.mjs",
    prepublishOnly: "npm run build"
  },
  dependencies: {
    "@aws-crypto/sha256-js": "^5.2.0",
    "@aws-sdk/credential-providers": "^3.1057.0",
    "@modelcontextprotocol/ext-apps": "^1.7.2",
    "@modelcontextprotocol/sdk": "^1.29.0",
    "@opentelemetry/api": "^1.9.0",
    "@opentelemetry/exporter-trace-otlp-grpc": "^0.52.1",
    "@opentelemetry/exporter-trace-otlp-http": "^0.52.1",
    "@opentelemetry/resources": "^1.30.1",
    "@opentelemetry/sdk-trace-base": "^1.30.1",
    "@opentelemetry/sdk-trace-node": "^1.30.1",
    "@opentelemetry/semantic-conventions": "^1.41.1",
    "@smithy/protocol-http": "^5.0.0",
    "@smithy/signature-v4": "^5.0.0",
    "chrome-launcher": "^1.2.1",
    cors: "^2.8.6",
    express: "^5.2.1",
    zod: "^4.4.3"
  },
  devDependencies: {
    "@radix-ui/react-separator": "^1.1.8",
    "@radix-ui/react-tabs": "^1.1.13",
    "@smithy/types": "^4.0.0",
    "@tailwindcss/vite": "^4.3.0",
    "@testing-library/dom": "^10.4.1",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "@types/cors": "^2.8.19",
    "@types/express": "^5.0.6",
    "@types/node": "^25.9.1",
    "@types/react": "^18.3.29",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react": "^6.0.2",
    "@vitest/coverage-v8": "^4.1.8",
    "chart.js": "^4.5.1",
    "class-variance-authority": "^0.7.1",
    clsx: "^2.1.1",
    concurrently: "^10.0.3",
    "cross-env": "^10.1.0",
    esbuild: "^0.28.0",
    "framer-motion": "^12.40.0",
    "javascript-obfuscator": "^5.4.3",
    jsdom: "^29.1.1",
    react: "^18.3.1",
    "react-chartjs-2": "^5.3.1",
    "react-dom": "^18.3.1",
    "tailwind-merge": "^3.6.0",
    tailwindcss: "^4.3.0",
    tsx: "^4.22.3",
    typescript: "^6.0.3",
    vite: "^8.0.14",
    "vite-plugin-singlefile": "^2.3.3",
    vitest: "^4.1.8"
  }
};

// src/connection/os-ui/constants.ts
var SIGV4_SERVICE = "opensearch";
var LOGIN_PATH = "/_login/";
var ANONYMOUS_LOGIN_PATH = "/auth/anonymous";
var ANONYMOUS_COOKIE_NAME = "security_authentication";
var PPL_SEARCH_PATH = "/api/enhancements/search/ppl";
var PROMQL_SEARCH_PATH = "/api/enhancements/search/promql";
var SAVED_OBJECTS_FIND_PATH = "/api/saved_objects/_find";
var WORKSPACES_LIST_PATH = "/api/workspaces/_list";
var UNIFIED_ALERTS_PATH = "/api/alerting/unified/alerts";
var SLO_BASE = "/api/observability/v1/slos";
var ENHANCEMENTS_RESOURCES_PATH = "/api/enhancements/resources";
var CONSOLE_PROXY_PATH = "/api/console/proxy";
var APP_USER_AGENT_TOKEN = `${package_default.name}/${package_default.version}`;
var BROWSER_USER_AGENT = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 ${APP_USER_AGENT_TOKEN}`;

// src/connection/os-ui/cluster-diagnostics.ts
var DIAGNOSTICS = {
  "cluster-health": {
    path: "_cluster/health",
    format: "native",
    isCat: false,
    description: "Overall cluster status (green/yellow/red), shard counts, pending tasks."
  },
  "cluster-state": {
    // Limit to the routing_table / routing_nodes / cluster_manager-name slice
    // to keep payloads small. The full state is huge.
    path: "_cluster/state/master_node,nodes,routing_table,routing_nodes",
    format: "native",
    isCat: false,
    description: "Cluster state summary \u2014 elected manager, nodes, routing/shard allocation."
  },
  "cluster-stats": {
    path: "_cluster/stats",
    format: "native",
    isCat: false,
    description: "Aggregate cluster stats (indices, shards, JVM, OS, fs)."
  },
  "cluster-pending-tasks": {
    path: "_cluster/pending_tasks",
    format: "native",
    isCat: false,
    description: "Pending cluster-state updates (queued mappings, shard moves)."
  },
  "cluster-allocation-explain": {
    path: "_cluster/allocation/explain",
    format: "native",
    isCat: false,
    description: "Explain why an unassigned shard cannot be allocated. (Picks an unassigned shard automatically.)"
  },
  "nodes-info": {
    path: "_nodes",
    format: "native",
    isCat: false,
    description: "Per-node info \u2014 version, OS, JVM, settings, plugins."
  },
  "nodes-stats": {
    path: "_nodes/stats",
    format: "native",
    isCat: false,
    description: "Per-node runtime stats \u2014 JVM, indices, OS, fs, thread pools, breakers."
  },
  "nodes-hot-threads": {
    // Hot threads returns text/plain by default. The console proxy still
    // forwards it as the body — callers get a string blob (not JSON). It's
    // the canonical "what's the cluster doing right now?" diagnostic.
    path: "_nodes/hot_threads",
    format: "native",
    isCat: false,
    description: "Hot-thread stack samples per node \u2014 what's burning CPU right now."
  },
  "cat-nodes": {
    path: "_cat/nodes",
    format: "json",
    isCat: true,
    description: "Tabular per-node summary \u2014 heap %, CPU, load, role, master flag."
  },
  "cat-cluster-manager": {
    path: "_cat/cluster_manager",
    format: "json",
    isCat: true,
    description: "Currently-elected cluster manager (master) node."
  },
  "cat-indices": {
    path: "_cat/indices",
    format: "json",
    isCat: true,
    target: "index",
    description: "Per-index summary \u2014 health, doc count, store size, primary/replica counts."
  },
  "cat-shards": {
    path: "_cat/shards",
    format: "json",
    isCat: true,
    target: "index",
    description: "Per-shard placement \u2014 node, state (STARTED/RELOCATING/INITIALIZING/UNASSIGNED), reason."
  },
  "cat-allocation": {
    path: "_cat/allocation",
    format: "json",
    isCat: true,
    description: "Disk usage and shard count per node."
  },
  "cat-recovery": {
    path: "_cat/recovery",
    format: "json",
    isCat: true,
    target: "index",
    description: "In-flight shard recoveries \u2014 bytes/files/translog progress."
  },
  "cat-segments": {
    path: "_cat/segments",
    format: "json",
    isCat: true,
    target: "index",
    description: "Lucene segment-level info per shard."
  },
  "cat-thread-pool": {
    path: "_cat/thread_pool",
    format: "json",
    isCat: true,
    description: "Per-node thread pool queue + active counts (search, write, etc.)."
  },
  "cat-pending-tasks": {
    path: "_cat/pending_tasks",
    format: "json",
    isCat: true,
    description: "Tabular form of cluster-pending-tasks."
  },
  "cat-templates": {
    path: "_cat/templates",
    format: "json",
    isCat: true,
    description: "Index templates registered on the cluster."
  },
  "cat-aliases": {
    path: "_cat/aliases",
    format: "json",
    isCat: true,
    description: "Index alias mappings."
  },
  "cat-repositories": {
    path: "_cat/repositories",
    format: "json",
    isCat: true,
    description: "Snapshot repositories registered on the cluster."
  },
  "cat-snapshots": {
    // _cat/snapshots requires a repository name; pass it via `target`.
    path: "_cat/snapshots/{target}",
    format: "json",
    isCat: true,
    target: "index",
    // misnomer here — accepts a repository name
    description: "Snapshots in a given repository (pass the repository name as `target`)."
  },
  "cat-plugins": {
    path: "_cat/plugins",
    format: "json",
    isCat: true,
    description: "Installed plugins per node."
  },
  "cat-count": {
    path: "_cat/count",
    format: "json",
    isCat: true,
    target: "index",
    description: "Document count per index (or whole cluster when no target)."
  },
  tasks: {
    path: "_tasks?detailed=true&group_by=parents",
    format: "native",
    isCat: false,
    description: "Currently-running tasks across the cluster."
  }
};
function resolveDiagnosticPath(kind, target) {
  const spec = DIAGNOSTICS[kind];
  if (!spec) {
    throw new Error(
      `Unknown diagnostic kind: ${String(kind)}. Allowed: ${Object.keys(DIAGNOSTICS).join(", ")}.`
    );
  }
  let path = spec.path;
  const hasPlaceholder = path.includes("{target}");
  if (hasPlaceholder) {
    if (!target?.trim()) {
      throw new Error(
        `Diagnostic '${kind}' requires a 'target' (e.g. an index pattern or repository name).`
      );
    }
    const t = target.trim();
    if (!/^[A-Za-z0-9_*.,\-+]+$/.test(t)) {
      throw new Error(
        `Diagnostic 'target' contains unsafe characters; only [A-Za-z0-9_*.,-+] are allowed.`
      );
    }
    path = path.replace("{target}", t);
  } else if (target?.trim() && spec.target) {
    const t = target.trim();
    if (!/^[A-Za-z0-9_*.,\-+]+$/.test(t)) {
      throw new Error(
        `Diagnostic 'target' contains unsafe characters; only [A-Za-z0-9_*.,-+] are allowed.`
      );
    }
    path = `${path}/${t}`;
  }
  if (spec.format === "json") {
    path = path.includes("?") ? `${path}&format=json` : `${path}?format=json`;
  }
  return { path, spec };
}
function runDiagnostic(transport, kind, target) {
  const { path, spec } = resolveDiagnosticPath(kind, target);
  return transport.withRetry(async () => {
    const data = await transport.cookieFetch({
      // The console proxy is a POST endpoint that takes the upstream method
      // as a query-string param. We hard-code `method=GET` here; the proxy
      // refuses anything else from this code path.
      method: "POST",
      path: CONSOLE_PROXY_PATH,
      query: { path, method: "GET" },
      // hot_threads (and a few others) return text/plain; capture the raw
      // body so callers don't lose the stack samples.
      rawResponse: kind === "nodes-hot-threads"
    });
    return { kind, path, spec, data };
  });
}

// src/connection/errors.ts
function errorMessage(err) {
  if (err instanceof Error) return err.message;
  return String(err);
}
var OsHttpError = class extends Error {
  constructor(status, body) {
    super(`OpenSearch ${status}: ${body.slice(0, 500)}`);
    this.status = status;
    this.body = body;
    this.name = "OsHttpError";
  }
  status;
  body;
};
function isDateBucketParseBug(err) {
  if (!(err instanceof OsHttpError)) return false;
  const b = err.body.toLowerCase();
  return b.includes("failed to parse date field") || b.includes("date_time_parse_exception") || b.includes("datetimeparseexception");
}
function isMissingDataSource(err) {
  if (!(err instanceof OsHttpError) || err.status !== 404) return false;
  const b = err.body.toLowerCase();
  return b.includes("saved object") && b.includes("data-source");
}
function fieldNotFoundName(body) {
  const m2 = /Field \[([^\]]+)\] not found/i.exec(body);
  return m2 ? m2[1] : null;
}
function isReferencedAfterStats(query, field) {
  const lower = query.toLowerCase();
  const statsIdx = lower.search(/\|\s*(stats|eventstats)\b/);
  if (statsIdx < 0) return false;
  const afterStats = query.slice(statsIdx);
  const nextPipe = afterStats.indexOf("|", 1);
  if (nextPipe < 0) return false;
  const downstream = afterStats.slice(nextPipe).toLowerCase();
  const re = new RegExp(`\\b${field.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  return re.test(downstream);
}
function pplErrorHint(err, dataset, query) {
  const base2 = errorMessage(err);
  const ds = dataset ? ` on \`${dataset}\`` : "";
  if (err instanceof OsHttpError) {
    if (isMissingDataSource(err)) {
      return base2 + "\n\nThe `dataSourceId` does not resolve to an OpenSearch data source \u2014 the id is wrong (likely a guessed/fabricated UUID, a stale one, or a `data-connection` id passed to a PPL tool), NOT a field or query problem. Do NOT call `describe_fields`. Call `list_data_sources`:\n  - For PPL \u2192 use a `kind: data-source` `id` (OpenSearch).\n  - For PromQL \u2192 use a `kind: data-connection` `id` (Prometheus).\nInside `report_dashboard`, the `score` scope and each `kpis` card may carry a per-call `dataSourceId` override. Never invent the id.";
    }
    if (isDateBucketParseBug(err)) {
      return base2 + "\n\nThis is a deterministic OpenSearch PPL relative-date push-down bug, NOT a transient error \u2014 retrying the same query will fail again. It fires when a `DATE_SUB(NOW(), \u2026)` time filter is combined with a multi-term boolean plan, in either of two shapes:\n  1. an `eval` BEFORE a `stats count()/sum() ... by span(<timeField>, \u2026)` \u2014 fix by removing that `eval` (drop it if unused, or move the math AFTER the aggregation); or\n  2. a multi-value `<field> IN (a, b, \u2026)` (\u22652 values) or `<field>=a OR <field>=b` disjunction \u2014 fix by NOT filtering on that field and instead grouping `by <field>` (e.g. `... | stats count() as errors by span(startTime, 5m), serviceName` with no `serviceName IN (...)`), or use a single value, or `like(<field>, 'prefix%')`.\nA single-value `IN (a)` and `AND` across different fields are unaffected, as are `percentile`/`avg`.";
    }
    if (err.status === 400) {
      if (/but got \[\s*STRUCT/i.test(err.body) || /\[\s*STRUCT\s*,/i.test(err.body)) {
        return base2 + `

The query compares a NESTED OBJECT field to a scalar \u2014 the field name resolves to a struct (an object), not a comparable value. Call \`describe_fields\` (dataSourceId, dataset${ds ? "" : ", <this index>"}, optional \`keyword\`) and pick the scalar LEAF instead. Common cases: logs use \`severityText\` (string), not \`severity\` (object); the service field is \`resource.attributes.service.name\`, not \`resource.attributes.service\`.`;
      }
      if (/SyntaxCheckException/i.test(err.body) || /is not a valid term/i.test(err.body)) {
        return base2 + "\n\nThe PPL is malformed, not a data problem. A common cause is arithmetic on an aggregate inside `stats` (e.g. `percentile(durationInNanos,95) / 1000000`), which PPL rejects. Rescale the field FIRST in an `eval`, then aggregate the scaled field: `\u2026 | eval ms = durationInNanos/1000000 | stats percentile(ms,95) as p95 \u2026`.";
      }
      if (/FIELD_NOT_FOUND/i.test(err.body)) {
        const field = fieldNotFoundName(err.body);
        if (field && query && isReferencedAfterStats(query, field)) {
          return base2 + `

The field \`${field}\` exists on the index but is out of scope here: after \`stats ... by <group>\`, only the grouped and aggregated columns remain, so a later \`sort\`/\`where\`/\`fields\` on a pre-aggregation field fails as FIELD_NOT_FOUND. Do NOT call \`describe_fields\` \u2014 the field is real. Fix the query STRUCTURE: name the group column and reference that name downstream, e.g. \`... | stats count() as c by span(${field}, 1m) as ts | sort ts\` (not \`sort ${field}\`).`;
        }
        return base2 + `

A field in the query does not exist${ds}. Call \`describe_fields\` (dataSourceId, dataset${ds ? "" : ", <this index>"}, optional \`keyword\`) for the real field names, then rebuild. Logs and spans differ \u2014 the logs service field is often nested (\`resource.attributes.service.name\`), not \`serviceName\`.`;
      }
    }
  }
  return base2;
}
function promqlErrorHint(err) {
  const base2 = errorMessage(err);
  if (err instanceof OsHttpError && err.status === 503) {
    const b = err.body.toLowerCase();
    if (b.includes("datasourcetype") || b.includes("failed to parse result from")) {
      return base2 + "\n\nThis `dataSourceId` is not a Prometheus data connection. Call `list_data_sources` and use the `id` of a `kind: data-connection` entry (type `Prometheus`) \u2014 that id is the connection name, not a UUID. If there is no `data-connection`, answer metric questions with `ppl_query` instead.";
    }
  }
  return base2;
}
var DataSourceResolutionError = class extends Error {
  constructor(message, action = "list_data_sources") {
    super(message);
    this.action = action;
    this.name = "DataSourceResolutionError";
  }
  action;
};
var SsoLoginRequiredError = class extends Error {
  constructor(reason, message) {
    super(
      message ?? "AWS SSO session is unavailable. Run the `opensearch_login` tool to sign in."
    );
    this.reason = reason;
    this.name = "SsoLoginRequiredError";
  }
  reason;
};

// src/connection/os-ui/data-sources.ts
function listDataSources(transport, workspace) {
  return transport.withRetry(async () => {
    const url = new URL(
      `${SAVED_OBJECTS_FIND_PATH}?per_page=100`,
      transport.endpoint
    );
    url.searchParams.append("type", "data-source");
    url.searchParams.append("type", "data-connection");
    const res = await transport.cookieFetch({
      method: "GET",
      path: url.pathname + url.search,
      workspace
    });
    return (res.saved_objects ?? []).map((o) => {
      if (o.type === "data-connection") {
        const connId = o.attributes.connectionId ?? o.id;
        return {
          id: connId,
          title: connId,
          endpoint: "",
          // e.g. "Prometheus" — surfaced so the model knows PromQL applies.
          type: o.attributes.type ?? "data-connection",
          kind: "data-connection"
        };
      }
      return {
        id: o.id,
        title: o.attributes.title ?? o.id,
        endpoint: o.attributes.endpoint ?? "",
        type: o.attributes.dataSourceEngineType ?? o.type,
        kind: "data-source"
      };
    });
  });
}

// src/connection/os-ui/index-patterns.ts
function listIndexPatterns(transport, dataSourceId, workspace) {
  return transport.withRetry(async () => {
    const res = await transport.cookieFetch({
      method: "GET",
      path: SAVED_OBJECTS_FIND_PATH,
      query: {
        type: "index-pattern",
        per_page: "1000"
      },
      workspace
    });
    return (res.saved_objects ?? []).filter((o) => {
      if (!dataSourceId) return true;
      const dsRefs = (o.references ?? []).filter((r) => r.type === "data-source");
      return dsRefs.length === 0 || dsRefs.some((r) => r.id === dataSourceId);
    }).map((o) => {
      const dsRef = (o.references ?? []).find((r) => r.type === "data-source");
      return {
        id: o.id,
        title: o.attributes.title ?? o.id,
        timeFieldName: o.attributes.timeFieldName,
        dataSourceRef: dsRef?.id
      };
    });
  });
}
function matchIndexPattern(patterns, datasetTitle, dataSourceId) {
  const candidates = dataSourceId ? patterns.filter((p) => !p.dataSourceRef || p.dataSourceRef === dataSourceId) : patterns;
  const want = datasetTitle.trim();
  const norm = (s) => s.replace(/[*\-_]/g, "").toLowerCase();
  const target = norm(want);
  const titleMatches = candidates.filter(
    (p) => p.title === want || norm(p.title) === target
  );
  if (titleMatches.length === 0) return void 0;
  if (titleMatches.length === 1) return titleMatches[0];
  if (dataSourceId) {
    const explicit = titleMatches.find((p) => p.dataSourceRef === dataSourceId);
    if (explicit) return explicit;
  }
  return titleMatches.find((p) => p.title === want) ?? titleMatches[0];
}

// src/connection/os-ui/alerts.ts
function listUnifiedAlerts(transport, opts = {}) {
  return transport.withRetry(async () => {
    const query = {
      dsIds: opts.dsIds && opts.dsIds.length > 0 ? opts.dsIds.join(",") : void 0,
      startTime: opts.startTime,
      endTime: opts.endTime,
      timeout: opts.timeout !== void 0 ? String(opts.timeout) : void 0,
      maxResults: opts.maxResults !== void 0 ? String(opts.maxResults) : void 0
    };
    const res = await transport.cookieFetch({
      method: "GET",
      path: UNIFIED_ALERTS_PATH,
      query
    });
    return {
      alerts: res.results ?? [],
      datasourceStatus: res.datasourceStatus ?? [],
      totalDatasources: res.totalDatasources ?? 0,
      completedDatasources: res.completedDatasources ?? 0
    };
  });
}

// src/connection/os-ui/slo.ts
function listSlos(transport, opts = {}) {
  return transport.withRetry(async () => {
    const query = {
      service: opts.service && opts.service.length > 0 ? opts.service.join(",") : void 0,
      state: opts.state && opts.state.length > 0 ? opts.state.join(",") : void 0,
      datasourceId: opts.datasourceId,
      enabled: opts.enabled !== void 0 ? String(opts.enabled) : void 0,
      search: opts.search,
      pageSize: opts.pageSize !== void 0 ? String(opts.pageSize) : void 0
    };
    const res = await transport.cookieFetch({
      method: "GET",
      path: SLO_BASE,
      query
    });
    return {
      slos: res.results ?? [],
      total: res.total ?? (res.results?.length ?? 0),
      hasMore: res.hasMore ?? false
    };
  });
}
function getSlo(transport, id) {
  return transport.withRetry(async () => {
    return await transport.cookieFetch({
      method: "GET",
      path: `${SLO_BASE}/${encodeURIComponent(id)}`
    });
  });
}

// src/connection/os-ui/data-frame.ts
function dataFrameToPplResult(res) {
  const fields = res.body?.fields ?? [];
  const schema = res.body?.schema ?? fields.map((f) => ({ name: f.name, type: f.type }));
  const size = res.body?.size ?? fields[0]?.values?.length ?? 0;
  const datarows = [];
  for (let r = 0; r < size; r++) {
    datarows.push(fields.map((f) => f.values?.[r]));
  }
  return { schema, datarows, total: size, size };
}

// src/connection/os-ui/ppl.ts
function runPpl(transport, dataSourceId, query, datasetTitle) {
  return transport.withRetry(async () => {
    const res = await transport.cookieFetch({
      method: "POST",
      path: PPL_SEARCH_PATH,
      body: {
        query: {
          query,
          language: "PPL",
          format: "jdbc",
          dataset: {
            id: datasetTitle,
            title: datasetTitle,
            type: "INDEX_PATTERN",
            dataSource: { id: dataSourceId, type: "DATA_SOURCE" }
          }
        }
      }
    });
    return dataFrameToPplResult(res);
  });
}
function runPromql(transport, dataSourceId, query, connectionTitle, timeRange, queryType = "range") {
  return transport.withRetry(async () => {
    const res = await transport.cookieFetch({
      method: "POST",
      path: PROMQL_SEARCH_PATH,
      body: {
        query: {
          query,
          language: "PROMQL",
          format: "jdbc",
          dataset: {
            id: connectionTitle,
            title: connectionTitle,
            type: "PROMETHEUS",
            dataSource: { id: dataSourceId, type: "DATA_SOURCE" }
          }
        },
        timeRange: { from: timeRange.from, to: timeRange.to },
        options: { queryType: queryType.toUpperCase(), time: timeRange.to }
      }
    });
    return dataFrameToPplResult(res);
  });
}
async function describeFields(transport, dataSourceId, dataset, keyword) {
  const ppl2 = await runPpl(transport, dataSourceId, `describe ${dataset}`, dataset);
  const idx = /* @__PURE__ */ new Map();
  ppl2.schema.forEach((f, i) => idx.set(f.name, i));
  const get = (row, name) => {
    const i = idx.get(name);
    return i === void 0 ? void 0 : row[i];
  };
  const needle = keyword?.trim().toLowerCase();
  const out = [];
  for (const row of ppl2.datarows) {
    const field = String(
      get(row, "COLUMN_NAME") ?? get(row, "column_name") ?? ""
    );
    if (!field) continue;
    if (needle && !field.toLowerCase().includes(needle)) continue;
    const type = String(
      get(row, "TYPE_NAME") ?? get(row, "type_name") ?? get(row, "DATA_TYPE") ?? ""
    );
    out.push({ field, type });
  }
  return out;
}

// src/connection/os-ui/metrics.ts
async function describeMetrics(transport, opts) {
  const { dataSourceId, kind, metric, label, match, start, end } = opts;
  const metricSelector = metric ? `{__name__="${metric.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"}` : void 0;
  let resourceName;
  let resourceType;
  const content = {};
  if (start !== void 0 && end !== void 0) {
    content.start = start;
    content.end = end;
  }
  switch (kind) {
    case "metrics":
      resourceType = "metrics";
      break;
    case "labels":
      resourceType = "labels";
      resourceName = metric;
      break;
    case "label_values":
      if (!label) throw new Error("describeMetrics(label_values) requires `label`.");
      resourceType = "label_values";
      resourceName = label;
      if (metricSelector) content["match[]"] = metricSelector;
      break;
    case "series": {
      const selector = match ?? metricSelector;
      if (!selector) {
        throw new Error("describeMetrics(series) requires `match` or `metric`.");
      }
      resourceType = "series";
      resourceName = selector;
      break;
    }
  }
  const data = await prometheusResource(
    transport,
    dataSourceId,
    resourceType,
    resourceName,
    Object.keys(content).length ? content : void 0
  );
  if (kind === "series") {
    return Array.isArray(data) ? data : [];
  }
  const list = Array.isArray(data) ? data : [];
  return kind === "labels" ? list.filter((l) => l !== "__name__") : list;
}
function prometheusResource(transport, dataConnectionId, resourceType, resourceName, content) {
  return transport.withRetry(async () => {
    const res = await transport.cookieFetch({
      method: "POST",
      path: ENHANCEMENTS_RESOURCES_PATH,
      body: {
        connection: { id: dataConnectionId, type: "prometheus" },
        resource: { type: resourceType, name: resourceName },
        ...content && { content }
      }
    });
    return res?.data;
  });
}

// scripts/osd-aws-stub.mjs
var unreachable = (what) => {
  throw new Error(
    `[osd-lib] ${what} is not available in OpenSearch Dashboards host mode (SigV4 disabled). This indicates a non-"host" auth path was taken.`
  );
};
var SignatureV4 = class {
  constructor() {
  }
  async sign() {
    unreachable("SignatureV4.sign");
  }
};
var Sha256 = class {
  constructor() {
    unreachable("Sha256");
  }
};
var HttpRequest = class {
  constructor(args) {
    Object.assign(this, args ?? {});
  }
};
var fromNodeProviderChain = () => async () => unreachable("fromNodeProviderChain");

// src/connection/os-ui/cookies.ts
function parseSetCookies(headers) {
  const out = [];
  for (const raw of headers.getSetCookie()) {
    const pair = raw.split(";", 1)[0];
    const eq = pair.indexOf("=");
    if (eq <= 0) continue;
    out.push({ name: pair.slice(0, eq).trim(), value: pair.slice(eq + 1).trim() });
  }
  return out;
}
function collectSetCookies(headers) {
  const out = /* @__PURE__ */ new Map();
  for (const c of parseSetCookies(headers)) out.set(c.name, c.value);
  return out;
}

// src/connection/os-ui/endpoint.ts
function normalizeEndpoint(rawEndpoint, authMode) {
  const hasScheme = /^https?:\/\//.test(rawEndpoint);
  const defaultScheme = authMode === "none" || authMode === "basic" || authMode === "host" ? "http://" : "https://";
  const url = new URL(hasScheme ? rawEndpoint : `${defaultScheme}${rawEndpoint}`);
  return { host: url.host, origin: url.origin };
}

// src/connection/os-ui/transport.ts
var OsUiTransport = class {
  endpoint;
  host;
  loginUrl;
  signer;
  cookies = /* @__PURE__ */ new Map();
  cookieHeader = "";
  cookieReady = false;
  // When true, the cookie session was supplied directly (IDC browser login) and
  // must NOT be refreshed via the SigV4 `/_login/` handshake — that path is for
  // IAM/SigV4 principals only. A 401 here means the session expired and the
  // user must run `opensearch_login` again.
  externalSession = false;
  inflightLogin = null;
  // Current auth mode. `idc-cookie` is set at runtime by `setSessionCookies()`.
  authMode;
  // Precomputed `Basic base64(user:pass)` header for `basic` mode (else undefined).
  basicAuthHeader;
  // HTTP client every request runs through. Defaults to the global `fetch`; a
  // host (OSD) injects its own authenticated client for `host` mode.
  fetchImpl;
  constructor(rawEndpoint, region, config) {
    const { host, origin } = normalizeEndpoint(rawEndpoint, config.authMode);
    this.endpoint = origin;
    this.host = host;
    this.loginUrl = `${this.endpoint}${LOGIN_PATH}`;
    this.authMode = config.authMode;
    this.fetchImpl = config.fetchImpl ?? ((url, init) => fetch(url, init));
    this.basicAuthHeader = config.authMode === "basic" ? `Basic ${Buffer.from(`${config.username ?? ""}:${config.password ?? ""}`).toString("base64")}` : void 0;
    this.signer = new SignatureV4({
      // SignatureV4 re-invokes this provider on every sign(), so a missing
      // credential chain surfaces lazily (as SsoLoginRequiredError) on the
      // first signed call rather than at construction.
      credentials: () => this.resolveCredentials(),
      region,
      service: SIGV4_SERVICE,
      sha256: Sha256
    });
  }
  static validateConfig(rawEndpoint, region, options) {
    if (!rawEndpoint) throw new Error("OS UI endpoint not set.");
    const authMode = options.authMode ?? "aws-sigv4";
    if (authMode === "aws-sigv4" && !region) throw new Error("AWS region not set.");
    if (authMode === "basic" && (!options.username || !options.password)) {
      throw new Error(
        "HTTP basic auth requires username and password (set --username/--password or OS_UI_USERNAME/OS_UI_PASSWORD)."
      );
    }
    if (authMode === "host" && !options.fetchImpl) {
      throw new Error('Auth mode "host" requires a fetchImpl.');
    }
    return {
      authMode,
      username: options.username,
      password: options.password,
      fetchImpl: options.fetchImpl
    };
  }
  /**
   * Install a Dashboards session harvested from an interactive IDC browser
   * login. These cookies authorize API calls directly, so no SigV4 `/_login/`
   * handshake is performed.
   */
  setSessionCookies(cookies) {
    this.cookies = new Map(cookies);
    this.rebuildCookieHeader();
    this.cookieReady = true;
    this.externalSession = true;
    this.authMode = "idc-cookie";
  }
  /**
   * Whether this connection can serve a request without an interactive login.
   * Stateless modes (none/basic) are always ready; the cookie modes are ready
   * once a session has been established (SigV4 `/_login/`, anonymous bootstrap,
   * or an injected IDC browser session). Used by `list_opensearch_ui_endpoints` to
   * surface which endpoints already have a live session — purely informational,
   * never triggers a login.
   */
  isSessionReady() {
    if (this.authMode === "none" || this.authMode === "basic" || this.authMode === "host") {
      return true;
    }
    return this.cookieReady;
  }
  // IAM/SigV4 credentials from the default Node provider chain (AWS_PROFILE,
  // env vars, EC2/ECS, etc.). When the chain is empty we surface a typed error
  // so the tool layer can route the user to the IDC browser login instead of a
  // cryptic SigV4 failure.
  async resolveCredentials() {
    try {
      return await fromNodeProviderChain()();
    } catch (err) {
      throw new SsoLoginRequiredError(
        "missing",
        `No AWS credentials found, and you are not signed in. Run the \`opensearch_login\` tool to sign in via your browser. (${errorMessage(err)})`
      );
    }
  }
  /**
   * Best-effort `sts:GetCallerIdentity` against the same creds the signer is
   * using, so a 403 message can name the actual principal (full ARN) instead
   * of just an access-key id. Falls back to the access-key id (or "unknown")
   * if the call fails — never throws.
   */
  async describeCallerIdentity() {
    let creds;
    try {
      creds = await this.resolveCredentials();
    } catch {
      return "unknown principal (credential chain failed)";
    }
    const accessKey = creds.accessKeyId;
    try {
      const stsSigner = new SignatureV4({
        credentials: creds,
        // STS global endpoint is region-flexible; us-east-1 always works.
        region: "us-east-1",
        service: "sts",
        sha256: Sha256
      });
      const body = "Action=GetCallerIdentity&Version=2011-06-15";
      const unsigned = new HttpRequest({
        method: "POST",
        protocol: "https:",
        hostname: "sts.amazonaws.com",
        path: "/",
        headers: {
          host: "sts.amazonaws.com",
          "content-type": "application/x-www-form-urlencoded; charset=utf-8",
          "content-length": String(Buffer.byteLength(body))
        },
        body
      });
      const signed = await stsSigner.sign(unsigned);
      const res = await fetch("https://sts.amazonaws.com/", {
        method: "POST",
        headers: signed.headers,
        body
      });
      const text = await res.text();
      if (!res.ok) return `${accessKey} (sts ${res.status}: ${text.slice(0, 200)})`;
      const arn = /<Arn>([^<]+)<\/Arn>/.exec(text)?.[1];
      return arn ? `${arn} (access key ${accessKey})` : `access key ${accessKey}`;
    } catch (err) {
      return `${accessKey} (sts probe failed: ${errorMessage(err)})`;
    }
  }
  /**
   * Issue an authenticated request to an OSD route. API modules call this
   * directly; the transport prepends the `/w/<id>` workspace prefix, attaches
   * the right auth header for the current mode, captures rotated cookies, and
   * decodes the response.
   */
  async cookieFetch(opts) {
    const ws = opts.workspace?.trim();
    const prefix = ws ? `/w/${ws}` : "";
    const url = new URL(`${prefix}${opts.path}`, this.endpoint);
    for (const [k, v] of Object.entries(opts.query ?? {})) {
      if (v !== void 0) url.searchParams.set(k, v);
    }
    const headers = {
      Accept: "application/json",
      // OSD core requires this header for non-GET API calls (CSRF guard). It is
      // part of OSD's HTTP lifecycle, independent of the security plugin and of
      // the auth mode — a presence-only check, so the value is arbitrary. In
      // `host` mode the injected client supplies its own xsrf token, so we omit
      // it here to avoid clobbering it.
      ...this.authMode === "host" ? {} : { "osd-xsrf": "osd-fetch" },
      // Identify these data requests as coming from this MCP app server-side.
      "user-agent": BROWSER_USER_AGENT
    };
    switch (this.authMode) {
      case "aws-sigv4":
      case "idc-cookie":
      case "anonymous":
        headers.Cookie = this.cookieHeader;
        break;
      case "basic":
        if (this.basicAuthHeader) headers.Authorization = this.basicAuthHeader;
        break;
      case "none":
      // `host` delegates all auth to the injected fetchImpl (session cookie +
      // CSRF already attached by the host's HTTP client); no header here.
      case "host":
        break;
    }
    if (opts.body !== void 0) headers["Content-Type"] = "application/json";
    const res = await this.fetchImpl(url, {
      method: opts.method,
      headers,
      body: opts.body !== void 0 ? JSON.stringify(opts.body) : void 0
    });
    const rotated = parseSetCookies(res.headers);
    if (rotated.length > 0) {
      let changed = false;
      for (const c of rotated) {
        if (this.cookies.get(c.name) !== c.value) {
          this.cookies.set(c.name, c.value);
          changed = true;
        }
      }
      if (changed) this.rebuildCookieHeader();
    }
    const text = await res.text();
    if (!res.ok) throw new OsHttpError(res.status, text);
    if (opts.rawResponse) return text;
    return text.length === 0 ? null : JSON.parse(text);
  }
  /**
   * Wrap an API call so it (1) lazily logs in on first use and (2) re-attempts
   * once on a 401 by clearing the cookie and re-running the login. Every API
   * module routes its calls through this — `cookieFetch` itself does not
   * know about login.
   */
  async withRetry(fn) {
    await this.ensureLoggedIn();
    try {
      return await fn();
    } catch (err) {
      if (err instanceof OsHttpError && err.status === 401 && this.authMode !== "none" && this.authMode !== "basic" && this.authMode !== "host") {
        this.cookieReady = false;
        await this.ensureLoggedIn();
        return await fn();
      }
      throw err;
    }
  }
  /** Coalesce concurrent logins so N parallel calls trigger one _login/. */
  ensureLoggedIn() {
    if (this.authMode === "none" || this.authMode === "basic" || this.authMode === "host") {
      return Promise.resolve();
    }
    if (this.cookieReady) return Promise.resolve();
    if (this.externalSession) {
      return Promise.reject(
        new SsoLoginRequiredError(
          "expired",
          "Your OpenSearch sign-in session has expired. Run the `opensearch_login` tool to sign in again."
        )
      );
    }
    const doLogin = this.authMode === "anonymous" ? () => this.loginAnonymous() : () => this.login();
    this.inflightLogin ??= doLogin().finally(() => {
      this.inflightLogin = null;
    });
    return this.inflightLogin;
  }
  async login() {
    const unsigned = new HttpRequest({
      method: "GET",
      protocol: "https:",
      hostname: this.host,
      path: LOGIN_PATH,
      headers: { host: this.host }
    });
    const signed = await this.signer.sign(unsigned);
    const res = await fetch(this.loginUrl, {
      method: "GET",
      headers: {
        ...signed.headers,
        "user-agent": BROWSER_USER_AGENT
      },
      redirect: "manual"
    });
    if (res.status >= 400) {
      const body = await res.text();
      if (res.status === 403) {
        const principal = await this.describeCallerIdentity();
        throw new SsoLoginRequiredError(
          "missing",
          `The AWS credentials in use are not authorized for this OpenSearch UI application (${this.endpoint} returned 403 as ${principal}). Run the \`opensearch_login\` tool to sign in through your browser with an authorized identity (IAM Identity Center). If you instead expect your current AWS principal to have access, it must be mapped in the application's access policy. Response: ${body.slice(0, 500) || "(empty)"}`
        );
      }
      throw new OsHttpError(
        res.status,
        `OS UI login failed at ${this.loginUrl}: ${body.slice(0, 500)}`
      );
    }
    const fresh = collectSetCookies(res.headers);
    if (fresh.size === 0) {
      throw new Error(
        `OS UI login at ${this.loginUrl} returned ${res.status} but no Set-Cookie headers \u2014 auth shape may have changed`
      );
    }
    this.setCookies(fresh);
    this.cookieReady = true;
  }
  // Bootstrap an anonymous session: GET /auth/anonymous 302s and sets the
  // `security_authentication` cookie that authorizes subsequent API calls. No
  // SigV4 signing and no credentials — the endpoint grants the cookie on a
  // plain GET when anonymous access is enabled. `redirect: "manual"` so we
  // capture Set-Cookie on the 302 before it would follow to "/".
  async loginAnonymous() {
    const res = await fetch(`${this.endpoint}${ANONYMOUS_LOGIN_PATH}`, {
      method: "GET",
      headers: { "user-agent": BROWSER_USER_AGENT },
      redirect: "manual"
    });
    const fresh = collectSetCookies(res.headers);
    if (!fresh.has(ANONYMOUS_COOKIE_NAME)) {
      throw new OsHttpError(
        res.status,
        `Anonymous login at ${this.endpoint}${ANONYMOUS_LOGIN_PATH} returned ${res.status} but no ${ANONYMOUS_COOKIE_NAME} cookie \u2014 anonymous access may be disabled on this endpoint.`
      );
    }
    this.setCookies(fresh);
    this.cookieReady = true;
  }
  setCookies(next) {
    this.cookies = next;
    this.rebuildCookieHeader();
  }
  rebuildCookieHeader() {
    this.cookieHeader = Array.from(this.cookies, ([k, v]) => `${k}=${v}`).join("; ");
  }
};

// src/connection/os-ui/workspaces.ts
function listWorkspaces(transport) {
  return transport.withRetry(async () => {
    const res = await transport.cookieFetch({
      method: "POST",
      path: WORKSPACES_LIST_PATH,
      // perPage/page are camelCase here (workspaces route schema), unlike the
      // snake_case saved-objects _find params.
      body: { perPage: 100, page: 1 }
    });
    return (res.result?.workspaces ?? []).map((w) => ({
      id: w.id,
      name: w.name ?? w.id,
      description: w.description ?? "",
      features: w.features ?? []
    }));
  });
}
function selectObservabilityWorkspace(workspaces) {
  if (workspaces.length === 0) return void 0;
  const isObservability = (w) => w.features.some(
    (f) => f === "use-case-observability" || f === "use-case-all" || f === "*"
  );
  const candidates = workspaces.filter(isObservability);
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const named = candidates.find(
      (w) => w.name.toLowerCase().includes("observability")
    );
    return named ?? candidates[0];
  }
  return workspaces[0];
}
function workspaceIdFromSavedObjectId(id) {
  const m2 = /^([A-Za-z0-9]{6})_/.exec(id);
  return m2 ? m2[1] : void 0;
}

// src/connection/os-ui/connection.ts
var OsUiConnection = class _OsUiConnection extends OsUiTransport {
  // Cached result of `resolveObservabilityWorkspaceId()`. `resolved` distinguishes
  // "not looked up yet" from "looked up, no workspace" (a valid undefined result).
  workspaceResolved = false;
  observabilityWorkspaceId;
  // Cached index-pattern list for `resolveIndexPattern()` deep-link building.
  // Null = not fetched yet; an array (possibly empty) = fetched.
  indexPatternCache = null;
  // The workspace id the index pattern cache was fetched under. When the caller
  // passes a different workspace, the cache is invalidated and re-fetched.
  indexPatternCacheWorkspace;
  // Cached data-source list keyed by id, populated lazily by
  // `getDataSourceById()` for deep-link building (the dataset block needs the
  // source's title + engine type to bind to the right cluster in Explore).
  dataSourceByIdCache = null;
  /**
   * Build a connection synchronously. Validates inputs and constructs the
   * object — it performs NO I/O (authentication is deferred to the first data
   * call), so it is safe to call lazily from the connection registry without
   * an await. Throws on missing/invalid config.
   */
  static create(rawEndpoint, region, options = {}) {
    const config = OsUiTransport.validateConfig(rawEndpoint, region, options);
    return new _OsUiConnection(rawEndpoint, region, config);
  }
  // ─── PPL / PromQL ──────────────────────────────────────────────────────────
  runPpl(dataSourceId, query, datasetTitle) {
    return runPpl(this, dataSourceId, query, datasetTitle);
  }
  runPromql(dataSourceId, query, connectionTitle, timeRange, queryType = "range") {
    return runPromql(this, dataSourceId, query, connectionTitle, timeRange, queryType);
  }
  describeFields(dataSourceId, dataset, keyword) {
    return describeFields(this, dataSourceId, dataset, keyword);
  }
  describeMetrics(opts) {
    return describeMetrics(this, opts);
  }
  // ─── Saved-object listings ────────────────────────────────────────────────
  listWorkspaces() {
    return listWorkspaces(this);
  }
  listDataSources(workspace) {
    return listDataSources(this, workspace);
  }
  listIndexPatterns(dataSourceId, workspace) {
    return listIndexPatterns(this, dataSourceId, workspace);
  }
  // ─── Alerts ────────────────────────────────────────────────────────────────
  listUnifiedAlerts(opts = {}) {
    return listUnifiedAlerts(this, opts);
  }
  // ─── SLOs ──────────────────────────────────────────────────────────────────
  listSlos(opts = {}) {
    return listSlos(this, opts);
  }
  getSlo(id) {
    return getSlo(this, id);
  }
  // ─── Cluster diagnostics ──────────────────────────────────────────────────
  runDiagnostic(kind, target) {
    return runDiagnostic(this, kind, target);
  }
  // ─── Cached deep-link resolution ──────────────────────────────────────────
  /**
   * Resolve the workspace id to use when DEEP-LINKING into the OSD UI, or
   * `undefined` when the endpoint has no workspaces (the feature is off).
   *
   * Why this is needed: the apps these links target — Explore (traces/logs/
   * metrics), the APM application-map, the alerting app — are registered
   * `WorkspaceAvailability.insideWorkspace` in OSD, so they only mount under a
   * `/w/<id>` path. A link without that segment lands on "Application Not Found".
   * (Requests don't need this — the `/api/...` routes work workspace-less — but
   * the human-facing UI URL does.)
   *
   * Selection: prefer a workspace whose use-case features include observability
   * (`use-case-observability`, or the catch-all `use-case-all` / `*`), since that
   * is where these apps are enabled. Fall back to the sole workspace when there
   * is exactly one (the common single-workspace cluster, e.g. the playground's
   * "Observability Stack"). Result is cached — workspaces don't change per call,
   * and a failed lookup (e.g. feature disabled → empty list) caches as undefined
   * so a missing-link path never repeatedly probes.
   */
  async resolveObservabilityWorkspaceId() {
    if (this.workspaceResolved) return this.observabilityWorkspaceId;
    let workspaces;
    try {
      workspaces = await this.listWorkspaces();
    } catch {
      return void 0;
    }
    this.observabilityWorkspaceId = selectObservabilityWorkspace(workspaces)?.id;
    this.workspaceResolved = true;
    return this.observabilityWorkspaceId;
  }
  /**
   * Fetches and caches the workspace-scoped index-pattern list for downstream
   * resolvers. The cache is invalidated when the workspace changes; a fetch
   * failure leaves the cache unset so a later call can retry. Returns `null`
   * on fetch failure (callers surface that as `undefined` to the tool).
   */
  async ensurePatternCache(workspaceId) {
    const ws = workspaceId ?? await this.resolveObservabilityWorkspaceId();
    if (this.indexPatternCache !== null && this.indexPatternCacheWorkspace !== ws) {
      this.indexPatternCache = null;
    }
    if (this.indexPatternCache === null) {
      try {
        this.indexPatternCache = await this.listIndexPatterns(void 0, ws);
        this.indexPatternCacheWorkspace = ws;
      } catch {
        return null;
      }
    }
    return this.indexPatternCache;
  }
  /**
   * Resolve the real index-pattern saved object for a dataset. See
   * `matchIndexPattern` for the matching rules; this method just feeds it the
   * connection's cached pattern list.
   */
  async resolveIndexPattern(datasetTitle, dataSourceId, workspaceId) {
    const patterns = await this.ensurePatternCache(workspaceId);
    if (!patterns) return void 0;
    return matchIndexPattern(patterns, datasetTitle, dataSourceId);
  }
  async getIndexPatternById(id, workspaceId) {
    const patterns = await this.ensurePatternCache(workspaceId);
    return patterns?.find((p) => p.id === id);
  }
  /**
   * Resolve a data source's title + engine type by id, for deep-link building.
   * Explore won't auto-select an MDS-scoped index pattern unless the dataset
   * carries a `dataSource:(title,type)` block — those values come from this
   * lookup. Cached for the connection's lifetime; failures degrade to
   * undefined so the link falls back to a local-pattern shape rather than
   * breaking. */
  async getDataSourceById(id) {
    try {
      return (await this.ensureDataSourceCache()).get(id);
    } catch {
      return void 0;
    }
  }
  /**
   * Populate (once) and return the data-source-by-id cache. Unlike
   * `getDataSourceById`, this propagates listing failures so the resolver below
   * can surface them rather than silently defaulting.
   */
  async ensureDataSourceCache() {
    if (this.dataSourceByIdCache === null) {
      const sources = await this.listDataSources();
      this.dataSourceByIdCache = new Map(sources.map((s) => [s.id, s]));
    }
    return this.dataSourceByIdCache;
  }
  /**
   * Resolve the OpenSearch `dataSourceId` to use for a PPL / trace query,
   * defaulting it when the model omitted one and validating it when supplied.
   * This is the single guard that stops the model from FABRICATING an id (the
   * failure mode where it guessed `ObservabilityStack` from an SLO row's
   * Prometheus connection id and 404'd twice before recovering).
   *
   * Rules — over the OpenSearch `data-source`s only (Prometheus
   * `data-connection`s are never valid for PPL):
   *  - supplied + a real `data-source`  → use it.
   *  - supplied + a `data-connection`   → reject: it's a PromQL connection id,
   *    not an OpenSearch source (the exact SLO-id-to-traces mistake).
   *  - supplied + unknown               → reject and list the real ids (catches
   *    fabricated / stale ids).
   *  - omitted + exactly one source     → use it silently (the common
   *    single-cluster / playground case; no round-trip, no guessing).
   *  - omitted + zero sources           → reject: nothing to query.
   *  - omitted + two or more sources    → reject and list them so the model
   *    picks the right one (no safe heuristic exists — picking one could query
   *    the wrong cluster).
   *
   * Throws {@link DataSourceResolutionError} with a complete, model-facing hint.
   */
  async resolveDataSourceId(supplied) {
    const given = supplied?.trim();
    let cache;
    try {
      cache = await this.ensureDataSourceCache();
    } catch (err) {
      if (err instanceof SsoLoginRequiredError) throw err;
      throw new DataSourceResolutionError(
        "Could not list data sources to resolve `dataSourceId`: " + errorMessage(err) + "\nCall `list_data_sources` and pass a `kind: data-source` `id` explicitly."
      );
    }
    const sources = [...cache.values()];
    const osSources = sources.filter((s) => s.kind === "data-source");
    if (given) {
      const hit = cache.get(given);
      if (hit?.kind === "data-source") return hit.id;
      if (hit?.kind === "data-connection") {
        throw new DataSourceResolutionError(
          `\`${given}\` is a Prometheus data CONNECTION id, not an OpenSearch data source \u2014 PPL / trace tools can't query it. ` + osSourceList(osSources) + "\n(That `data-connection` id is for PromQL on `metrics_query` / `report_dashboard`.)"
        );
      }
      throw new DataSourceResolutionError(
        `\`${given}\` is not a known OpenSearch data source (it may be fabricated or stale). Do NOT guess an id. ` + osSourceList(osSources)
      );
    }
    if (osSources.length === 1) return osSources[0].id;
    if (osSources.length === 0) {
      throw new DataSourceResolutionError(
        "No OpenSearch data source is attached to this endpoint, so PPL / trace queries have nothing to run against. Confirm with `list_data_sources`."
      );
    }
    throw new DataSourceResolutionError(
      "Multiple OpenSearch data sources are attached \u2014 pass `dataSourceId` explicitly so the query targets the right cluster. " + osSourceList(osSources)
    );
  }
  /**
   * One-stop resolution for deep-link context: workspace + index pattern +
   * data-source title/type. Honors explicit model-supplied overrides (from
   * AppContext) and falls back to the heuristic resolver when a hint is
   * omitted OR resolves to nothing (e.g. the model passes an id that doesn't
   * exist in the cached list) — a stale or wrong hint should degrade to a
   * heuristic link rather than break.
   *
   * Workspace fallback: `resolveObservabilityWorkspaceId()` requires the
   * `/api/workspaces/_list` route, which is unreachable on some endpoints
   * (e.g. AOSS-managed Application clusters reachable only as ARN-routed
   * gateways). When the API returns nothing, we mine the workspace prefix off
   * the resolved index-pattern id — OSD's workspace plugin stamps every
   * workspace-scoped saved object with `<wsId>_<rest>`, and Explore happily
   * accepts that prefix as the `/w/<wsId>` segment in the URL.
   *
   * Data-source: when the index pattern has a `dataSourceRef`, we look up the
   * referenced source so the URL builder can emit the
   * `dataSource:(title,type,version)` sub-object Explore needs to bind the
   * dataset to the correct cluster.
   */
  async resolveDeepLinkContext(hints, datasetTitle, dataSourceId) {
    let workspaceId = hints.workspaceId ?? await this.resolveObservabilityWorkspaceId();
    let indexPattern;
    if (hints.indexPatternId) {
      indexPattern = await this.getIndexPatternById(hints.indexPatternId, workspaceId);
    }
    if (!indexPattern) {
      indexPattern = await this.resolveIndexPattern(datasetTitle, dataSourceId, workspaceId);
    }
    if (!workspaceId && indexPattern) {
      workspaceId = workspaceIdFromSavedObjectId(indexPattern.id);
    }
    let dataSourceTitle;
    let dataSourceType;
    const refId = indexPattern?.dataSourceRef ?? dataSourceId;
    if (refId) {
      const ds = await this.getDataSourceById(refId);
      if (ds && ds.kind === "data-source") {
        dataSourceTitle = ds.title;
        dataSourceType = ds.type;
      }
    }
    return { workspaceId, indexPattern, dataSourceTitle, dataSourceType };
  }
};
function osSourceList(osSources) {
  if (osSources.length === 0) {
    return "There are no OpenSearch data sources \u2014 call `list_data_sources` to confirm.";
  }
  const rows = osSources.map((s) => `  - \`${s.id}\`${s.title && s.title !== s.id ? ` (${s.title})` : ""}`).join("\n");
  return `Available OpenSearch data sources (pass one as \`dataSourceId\`):
${rows}`;
}

// packages/ui/src/framework/defineApp.ts
function defineApp(spec) {
  return spec;
}
function defineRoute(spec) {
  return spec;
}

// packages/ui/src/framework/useAppProps.ts
import { useApp } from "@modelcontextprotocol/ext-apps/react";
import { applyDocumentTheme } from "@modelcontextprotocol/ext-apps";
import { useEffect, useRef, useState } from "react";

// packages/ui/src/framework/FollowupContext.tsx
import { createContext, useContext } from "react";
import { jsx } from "react/jsx-runtime";
var FollowupContext = createContext({
  sendFollowup: async () => false,
  canSendFollowup: false
});
function FollowupProvider({
  value,
  children
}) {
  return /* @__PURE__ */ jsx(FollowupContext.Provider, { value, children });
}
function useFollowup() {
  return useContext(FollowupContext);
}

// packages/ui/src/framework/LinkContext.tsx
import { createContext as createContext2, useContext as useContext2 } from "react";
import { jsx as jsx2 } from "react/jsx-runtime";
var OpenLinkContext = createContext2({
  openLink: async () => false,
  canOpenLink: false
});
function OpenLinkProvider({
  value,
  children
}) {
  return /* @__PURE__ */ jsx2(OpenLinkContext.Provider, { value, children });
}
function useOpenLink() {
  return useContext2(OpenLinkContext);
}

// packages/ui/src/framework/CallToolContext.tsx
import { createContext as createContext3, useContext as useContext3 } from "react";
import { jsx as jsx3 } from "react/jsx-runtime";
var CallToolContext = createContext3({
  callTool: async () => ({
    structuredContent: { error: "No host connection." },
    isError: true
  }),
  canCallTool: false
});
function CallToolProvider({
  value,
  children
}) {
  return /* @__PURE__ */ jsx3(CallToolContext.Provider, { value, children });
}
function useCallTool() {
  return useContext3(CallToolContext);
}

// packages/ui/src/framework/ModelContext.tsx
import { createContext as createContext4, useContext as useContext4 } from "react";
import { jsx as jsx4 } from "react/jsx-runtime";
var ModelContext = createContext4({
  addToContext: async () => false,
  canAddToContext: false
});
function ModelContextProvider({
  value,
  children
}) {
  return /* @__PURE__ */ jsx4(ModelContext.Provider, { value, children });
}
function useModelContext() {
  return useContext4(ModelContext);
}

// packages/ui/src/framework/types.ts
var URI_SCHEME_PREFIX = "ui://opensearch-mcp";
function routeUri(appId, routeId) {
  return `${URI_SCHEME_PREFIX}/${appId}/${routeId}.html`;
}
function toolName(appId, routeId) {
  return `${appId}_${routeId}`;
}

// packages/ui/src/framework/detect-theme.ts
import { applyDocumentTheme as applyDocumentTheme2 } from "@modelcontextprotocol/ext-apps";

// packages/ui/src/apps/traces/shared/ppl_to_spans.ts
function convertTimestampToNanos(timestamp) {
  if (!timestamp) return 0;
  try {
    let time;
    if (typeof timestamp === "string") {
      if (/^\d+$/.test(timestamp)) {
        time = parseInt(timestamp, 10);
      } else {
        let dateString = timestamp;
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/.test(timestamp)) {
          dateString = timestamp.replace(" ", "T") + "Z";
        }
        time = new Date(dateString).getTime();
        if (isNaN(time)) {
          const direct = Date.parse(timestamp);
          if (!isNaN(direct)) time = direct;
          else return 0;
        }
      }
    } else {
      time = timestamp;
    }
    if (time > 1e15) return time;
    return time * 1e6;
  } catch {
    return 0;
  }
}
function hasNanoPrecision(t) {
  if (!t) return false;
  if (typeof t === "number") return t > 1e15;
  if (/^\d+$/.test(t) && t.length > 13) return true;
  if (/\.\d{4,}/.test(t)) return true;
  if (/^\d{19}$/.test(t)) return true;
  return false;
}
function extractStatusCode(status) {
  if (typeof status === "number") return status;
  if (status && typeof status === "object") {
    const s = status;
    if (typeof s.code === "string") {
      const c = s.code.toLowerCase();
      return c === "error" ? 2 : c === "ok" ? 1 : 0;
    }
    if (typeof s.code === "number") return s.code;
    if (typeof s.status_code === "number") return s.status_code;
  }
  return 0;
}
function resolveDuration(startTime, endTime, durationInNanos, durationNano) {
  if (startTime && endTime) {
    const startNanos = convertTimestampToNanos(startTime);
    const endNanos = convertTimestampToNanos(endTime);
    const startNano = hasNanoPrecision(startTime);
    const endNano = hasNanoPrecision(endTime);
    if (startNano && endNano && startNanos > 0 && endNanos > startNanos) {
      return endNanos - startNanos;
    }
    if ((!startNano || !endNano) && (durationInNanos || durationNano)) {
      return durationInNanos || durationNano || 0;
    }
    if (startNanos > 0 && endNanos > startNanos) {
      return endNanos - startNanos;
    }
  }
  return durationInNanos || durationNano || 0;
}
function transformPplToSpans(ppl2, fallbackTraceId) {
  const idx = /* @__PURE__ */ new Map();
  ppl2.schema.forEach((f, i) => idx.set(f.name, i));
  const get = (row, name) => {
    const i = idx.get(name);
    return i === void 0 ? void 0 : row[i];
  };
  const spans = [];
  let rangeStart = Number.POSITIVE_INFINITY;
  let rangeEnd = 0;
  for (const row of ppl2.datarows) {
    try {
      const resource = get(row, "resource") || {};
      const serviceName = resource?.attributes?.service?.name || // Some pipelines keep the full dotted attribute key, nesting it under
      // `resource` instead of flattening to `service.name`.
      resource?.attributes?.resource?.service?.name || get(row, "serviceName") || "";
      const startTime = (get(row, "startTime") || get(row, "startTimeUnixNano") || "") + "";
      const endTime = (get(row, "endTime") || get(row, "endTimeUnixNano") || "") + "";
      const durationInNanos = resolveDuration(
        startTime,
        endTime,
        get(row, "durationInNanos"),
        get(row, "durationNano")
      );
      const status = get(row, "status");
      const statusCode = extractStatusCode(status);
      const statusMessage = status && typeof status === "object" ? status.message || "" : "";
      const startNanos = convertTimestampToNanos(startTime);
      const endNanos = startNanos + durationInNanos;
      if (startNanos > 0) {
        rangeStart = Math.min(rangeStart, startNanos);
        rangeEnd = Math.max(rangeEnd, endNanos);
      }
      spans.push({
        traceId: (get(row, "traceId") || fallbackTraceId) + "",
        spanId: (get(row, "spanId") || "") + "",
        parentSpanId: (get(row, "parentSpanId") || "") + "",
        name: (get(row, "name") || "") + "",
        serviceName,
        startTime,
        endTime,
        durationInNanos,
        statusCode,
        statusMessage,
        kind: (get(row, "kind") || "") + "",
        traceGroup: (get(row, "traceGroup") || "") + "",
        attributes: get(row, "attributes") || void 0,
        resource: get(row, "resource") || void 0,
        events: get(row, "events") || void 0,
        links: get(row, "links") || void 0
      });
    } catch {
    }
  }
  spans.sort((a, b) => {
    const sa = convertTimestampToNanos(a.startTime);
    const sb = convertTimestampToNanos(b.startTime);
    return sa - sb;
  });
  if (rangeStart === Number.POSITIVE_INFINITY) rangeStart = 0;
  return { spans, rangeStartNanos: rangeStart, rangeEndNanos: rangeEnd };
}

// packages/ui/src/apps/agent-trace/shared/categories.ts
var CATEGORY_MAP = {
  invoke_agent: { id: "agent", label: "Agent", tone: "accent" },
  create_agent: { id: "agent", label: "Agent", tone: "accent" },
  chat: { id: "llm", label: "LLM", tone: "info" },
  text_completion: { id: "content", label: "Content", tone: "neutral" },
  generate_content: { id: "content", label: "Content", tone: "neutral" },
  execute_tool: { id: "tool", label: "Tool", tone: "warn" },
  embeddings: { id: "embeddings", label: "Embeddings", tone: "success" },
  retrieval: { id: "retrieval", label: "Retrieval", tone: "danger" }
};
var DEFAULT_CATEGORY = { id: "other", label: "Span", tone: "neutral" };
function categoryOf(operationName) {
  if (!operationName) return DEFAULT_CATEGORY;
  return CATEGORY_MAP[operationName] ?? DEFAULT_CATEGORY;
}
function dig(obj, ...keys) {
  let cur = obj;
  for (const k of keys) {
    if (cur == null || typeof cur !== "object") return void 0;
    cur = cur[k];
  }
  return cur;
}
function extractGenAiFields(attributes) {
  if (!attributes) return {};
  const opName = attributes["gen_ai.operation.name"] ?? dig(attributes, "gen_ai", "operation", "name");
  const model = attributes["gen_ai.request.model"] ?? dig(attributes, "gen_ai", "request", "model");
  const provider = attributes["gen_ai.provider.name"] ?? dig(attributes, "gen_ai", "provider", "name");
  const inTok = attributes["gen_ai.usage.input_tokens"] ?? dig(attributes, "gen_ai", "usage", "input_tokens");
  const outTok = attributes["gen_ai.usage.output_tokens"] ?? dig(attributes, "gen_ai", "usage", "output_tokens");
  const tool = attributes["gen_ai.tool.name"] ?? dig(attributes, "gen_ai", "tool", "name");
  const agent = attributes["gen_ai.agent.name"] ?? dig(attributes, "gen_ai", "agent", "name");
  const inputMsg = attributes["gen_ai.input.messages"] ?? dig(attributes, "gen_ai", "input", "messages");
  const outputMsg = attributes["gen_ai.output.messages"] ?? dig(attributes, "gen_ai", "output", "messages");
  return {
    operationName: opName,
    model,
    provider,
    inputTokens: inTok,
    outputTokens: outTok,
    toolName: tool,
    agentName: agent,
    inputMessages: inputMsg,
    outputMessages: outputMsg
  };
}

// packages/ui/src/apps/agent-trace/details/schema.ts
import { z as z4 } from "zod";

// packages/ui/src/apps/_shared/data-source.ts
import { z } from "zod";
function dataSourceIdField(opts) {
  const kind = opts?.kind ?? "opensearch";
  const required = opts?.required ?? kind === "prometheus";
  const note = opts?.note ? ` ${opts.note}` : "";
  let description;
  switch (kind) {
    case "prometheus":
      description = "Prometheus `data-connection` id from `list_data_sources` (`kind: data-connection`) \u2014 the id IS the connection name, not a UUID." + note;
      break;
    case "either":
      description = "Data source id from `list_data_sources`. PPL \u2192 a `kind: data-source` id (optional, auto-resolved when only one exists); PromQL \u2192 a `kind: data-connection` id." + note;
      break;
    case "opensearch":
    default:
      description = "OpenSearch `data-source` id from `list_data_sources`. Optional \u2014 the lone source auto-resolves; pass one only when several exist. Not an index-pattern id (`list_index_patterns`) nor a Prometheus `data-connection` id." + note;
      break;
  }
  return required ? z.string().describe(description) : z.string().optional().describe(description);
}

// packages/ui/src/apps/traces/shared/span.ts
import { z as z2 } from "zod";
var spanSchema = z2.object({
  traceId: z2.string(),
  spanId: z2.string(),
  parentSpanId: z2.string().optional().default(""),
  name: z2.string().optional().default(""),
  serviceName: z2.string().optional().default(""),
  startTime: z2.string().optional().default(""),
  endTime: z2.string().optional().default(""),
  durationInNanos: z2.number().default(0),
  statusCode: z2.number().default(0),
  statusMessage: z2.string().optional().default(""),
  kind: z2.string().optional().default(""),
  traceGroup: z2.string().optional().default(""),
  attributes: z2.record(z2.string(), z2.unknown()).optional(),
  resource: z2.record(z2.string(), z2.unknown()).optional(),
  events: z2.array(z2.unknown()).optional(),
  links: z2.array(z2.unknown()).optional()
}).passthrough();
var SPAN_STATUS = { UNSET: 0, OK: 1, ERROR: 2 };
function isSpanError(statusCode) {
  return statusCode === SPAN_STATUS.ERROR;
}

// packages/ui/src/apps/_shared/presentation.ts
import { z as z3 } from "zod";
var presentationInputFields = {
  narrative: z3.string().optional().describe(
    "Your analysis: root cause / explanation / recommendation shown under the headline. Plain text, no markdown. Write analysis HERE, not in chat. (The headline itself is derived from the data \u2014 you don't supply it.)"
  ),
  suggestions: z3.array(z3.string()).max(3).optional().describe(
    "Up to 3 follow-up prompts as clickable pills. ONLY on final answer; OMIT on interim renders."
  )
};
var presentationPropsFields = {
  narrative: z3.string().optional(),
  suggestions: z3.array(z3.string()).optional()
};
var presentationPropsSchema = z3.object(presentationPropsFields);

// packages/ui/src/apps/agent-trace/details/schema.ts
var inputSchema = {
  dataSourceId: dataSourceIdField(),
  traceId: z4.string().describe("The agent trace ID to load."),
  dataset: z4.string().optional().describe("Index pattern (e.g. `otel-v1-apm-span-*`). Defaults to `otel-v1-apm-span*`."),
  ...presentationInputFields
};
var propsSchema = z4.object({
  ...presentationPropsFields,
  traceId: z4.string(),
  dataset: z4.string(),
  spans: z4.array(spanSchema),
  rangeStartNanos: z4.number(),
  rangeEndNanos: z4.number(),
  totalTokens: z4.number(),
  spanCount: z4.number(),
  error: z4.string().optional()
});

// packages/ui/src/apps/agent-trace/details/view.tsx
import { useMemo as useMemo5, useState as useState8 } from "react";

// packages/ui/src/components/ui/button.tsx
import { cva } from "class-variance-authority";

// packages/ui/src/lib/utils.ts
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// packages/ui/src/components/motion/index.tsx
import * as React from "react";
import {
  LazyMotion,
  MotionConfig,
  domAnimation,
  m,
  AnimatePresence,
  useReducedMotion,
  animate
} from "framer-motion";
import { jsx as jsx5 } from "react/jsx-runtime";
function MotionProvider({ children }) {
  return /* @__PURE__ */ jsx5(LazyMotion, { features: domAnimation, children: /* @__PURE__ */ jsx5(MotionConfig, { reducedMotion: "user", children }) });
}
var spring = {
  type: "spring",
  stiffness: 420,
  damping: 34,
  mass: 0.9
};
var springSoft = {
  type: "spring",
  stiffness: 260,
  damping: 30
};
var ease = {
  duration: 0.28,
  ease: [0.2, 0.7, 0.2, 1]
};
var easeOut = {
  duration: 0.4,
  ease: [0.2, 0.7, 0.2, 1]
};
var fadeInUp = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: easeOut }
};
var fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: ease }
};
var scaleIn = {
  hidden: { opacity: 0, scale: 0.94 },
  visible: { opacity: 1, scale: 1, transition: spring }
};
var staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.045, delayChildren: 0.02 }
  }
};
var staggerItem = fadeInUp;
var rowEntrance = {
  hidden: { opacity: 0, y: 8 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { ...easeOut, delay: Math.min(i, 12) * 0.04 }
  })
};
function AnimatedNumber({
  value,
  decimals = 0,
  format,
  duration = 0.9,
  ...rest
}) {
  const reduce = useReducedMotion();
  const fmt = React.useCallback(
    (v) => format ? format(v) : v.toFixed(decimals),
    [format, decimals]
  );
  const [display, setDisplay] = React.useState(() => fmt(value));
  const prev = React.useRef(value);
  React.useEffect(() => {
    const from = prev.current;
    prev.current = value;
    if (reduce || from === value) {
      setDisplay(fmt(value));
      return;
    }
    const controls = animate(from, value, {
      duration,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (v) => setDisplay(fmt(v))
    });
    return () => controls.stop();
  }, [value, reduce, duration, fmt]);
  return /* @__PURE__ */ jsx5("span", { ...rest, children: display });
}

// packages/ui/src/components/ui/button.tsx
import { jsx as jsx6 } from "react/jsx-runtime";
var buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] text-sm font-medium tracking-[-0.05px] transition-colors focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus-ring)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-[var(--accent-bright)] text-white shadow-sm hover:opacity-90",
        destructive: "bg-[var(--danger)] text-white hover:opacity-90",
        outline: "border border-[var(--surface-border)] bg-[var(--surface)] text-[var(--ink-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
        secondary: "bg-[var(--surface-muted)] border border-[var(--surface-border)] text-[var(--ink-soft)] hover:bg-[var(--glass-hi)] hover:text-[var(--ink)]",
        ghost: "text-[var(--ink-soft)] hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
        link: "text-[var(--accent-bright)] hover:underline underline-offset-4"
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-[6px] px-3 text-xs",
        lg: "h-10 rounded-[8px] px-6",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);
function Button({ className, variant, size, animate: animate2 = false, ...props }) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (!animate2) {
    return /* @__PURE__ */ jsx6("button", { className: classes, ...props });
  }
  return /* @__PURE__ */ jsx6(
    m.button,
    {
      className: classes,
      whileHover: { scale: 1.03 },
      whileTap: { scale: 0.97 },
      transition: spring,
      ...props
    }
  );
}

// packages/ui/src/components/ui/card.tsx
import * as React2 from "react";
import { jsx as jsx7 } from "react/jsx-runtime";
var Card = React2.forwardRef(
  ({ className, elevated = false, animate: animate2 = true, ...props }, ref) => {
    const classes = cn(
      "rounded-[12px] border border-[var(--surface-border)] bg-[var(--surface)] text-card-foreground",
      elevated ? "shadow-[var(--shadow-surface-hi)]" : "shadow-[var(--shadow-surface)]",
      className
    );
    if (!animate2) {
      return /* @__PURE__ */ jsx7("div", { ref, className: classes, ...props });
    }
    return /* @__PURE__ */ jsx7(
      m.div,
      {
        ref,
        className: classes,
        variants: fadeInUp,
        initial: "hidden",
        animate: "visible",
        ...props
      }
    );
  }
);
Card.displayName = "Card";
var CardHeader = React2.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx7("div", { ref, className: cn("flex flex-col space-y-1.5 p-6", className), ...props })
);
CardHeader.displayName = "CardHeader";
var CardTitle = React2.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx7("div", { ref, className: cn("font-semibold leading-tight tracking-[-0.15px] text-[var(--ink-bright)]", className), ...props })
);
CardTitle.displayName = "CardTitle";
var CardContent = React2.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx7("div", { ref, className: cn("p-6 pt-0", className), ...props })
);
CardContent.displayName = "CardContent";

// packages/ui/src/components/ui/tabs.tsx
import * as TabsPrimitive from "@radix-ui/react-tabs";
import * as React3 from "react";
import { jsx as jsx8 } from "react/jsx-runtime";
var Tabs = TabsPrimitive.Root;
var TabsList = React3.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx8(
  TabsPrimitive.List,
  {
    ref,
    className: cn(
      // Glass segmented control: muted track holding the pills
      "inline-flex h-9 items-center justify-center rounded-[10px] bg-[var(--surface-muted)] p-1 text-[var(--ink-mute)] border border-[var(--surface-border)]",
      className
    ),
    ...props
  }
));
TabsList.displayName = TabsPrimitive.List.displayName;
var TabsTrigger = React3.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx8(
  TabsPrimitive.Trigger,
  {
    ref,
    className: cn(
      // active = solid surface + soft shadow + ink
      "inline-flex items-center justify-center whitespace-nowrap rounded-[7px] px-3 py-1 text-[13px] font-semibold tracking-[-0.05px] transition-all duration-200 ease-[cubic-bezier(.2,.7,.2,1)] focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus-ring)] disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-[var(--surface)] data-[state=active]:text-[var(--ink-bright)] data-[state=active]:shadow-[var(--shadow-surface)]",
      className
    ),
    ...props
  }
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
var TabsContent = React3.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ jsx8(
  TabsPrimitive.Content,
  {
    ref,
    className: cn(
      "mt-2 focus-visible:outline-none focus-visible:shadow-[var(--shadow-focus-ring)]",
      className
    ),
    ...props,
    children: /* @__PURE__ */ jsx8(
      m.div,
      {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: easeOut,
        children
      }
    )
  }
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

// packages/ui/src/components/ui/badge.tsx
import { cva as cva2 } from "class-variance-authority";
import { jsx as jsx9 } from "react/jsx-runtime";
var badgeVariants = cva2(
  "inline-flex items-center gap-1 rounded-[6px] border px-2 py-0.5 text-xs font-semibold tracking-[-0.05px] transition-colors focus:outline-none focus:shadow-[var(--shadow-focus-ring)]",
  {
    variants: {
      variant: {
        // accent-soft tint + accent text
        default: "border-transparent bg-[var(--accent-soft)] text-[var(--accent-bright)]",
        // neutral pill: surface-muted + hairline + ink-soft
        secondary: "border-[var(--surface-border)] bg-[var(--surface-muted)] text-[var(--ink-soft)]",
        // danger-soft tint + danger text
        destructive: "border-transparent bg-[var(--danger-soft)] text-[var(--danger)]",
        // success-soft + success text
        success: "border-transparent bg-[var(--success-soft)] text-[var(--success)]",
        // warn-soft + warn text + leading dot
        warning: "border-transparent bg-[var(--warn-soft)] text-[var(--warn)] before:h-1.5 before:w-1.5 before:rounded-full before:bg-[var(--warn)]",
        // info-soft + info text
        info: "border-transparent bg-[var(--info-soft)] text-[var(--info)]",
        // hairline only
        outline: "border-[var(--surface-border)] text-[var(--ink-soft)]"
      }
    },
    defaultVariants: { variant: "default" }
  }
);
function Badge({ className, variant, animate: animate2 = true, ...props }) {
  const classes = cn(badgeVariants({ variant }), className);
  if (!animate2) {
    return /* @__PURE__ */ jsx9("div", { className: classes, ...props });
  }
  return /* @__PURE__ */ jsx9(
    m.div,
    {
      className: classes,
      variants: scaleIn,
      initial: "hidden",
      animate: "visible",
      ...props
    }
  );
}

// packages/ui/src/components/glass/WidgetBox.tsx
import * as React4 from "react";
import { jsx as jsx10, jsxs } from "react/jsx-runtime";
var WidgetBox = React4.forwardRef(
  ({ className, title, hoverLift = false, children, ...props }, ref) => /* @__PURE__ */ jsxs(
    m.div,
    {
      ref,
      variants: fadeInUp,
      initial: "hidden",
      animate: "visible",
      whileHover: hoverLift ? { y: -2 } : void 0,
      transition: spring,
      className: cn(
        "rounded-[14px] border border-[var(--glass-border)] bg-[var(--glass)] p-4 text-[var(--ink)] shadow-[var(--shadow-widget)] backdrop-blur-[22px] backdrop-saturate-[170%]",
        className
      ),
      ...props,
      children: [
        title != null && /* @__PURE__ */ jsx10("div", { className: "mb-2 text-[13px] font-semibold leading-[1.3] tracking-[-0.15px] text-[var(--ink-bright)]", children: title }),
        children
      ]
    }
  )
);
WidgetBox.displayName = "WidgetBox";

// packages/ui/src/components/glass/SuggestionPills.tsx
import * as React5 from "react";
import { jsx as jsx11, jsxs as jsxs2 } from "react/jsx-runtime";
function SuggestionPills({
  suggestions,
  label,
  className
}) {
  const { sendFollowup, canSendFollowup } = useFollowup();
  const [pending, setPending] = React5.useState(null);
  const [failed, setFailed] = React5.useState(() => /* @__PURE__ */ new Set());
  const items = (suggestions ?? []).map((s) => s.trim()).filter((s) => s.length > 0);
  if (items.length === 0) return null;
  async function onClick(text) {
    if (pending) return;
    setPending(text);
    setFailed((prev) => {
      if (!prev.has(text)) return prev;
      const next = new Set(prev);
      next.delete(text);
      return next;
    });
    try {
      const ok = await sendFollowup(text);
      if (!ok) markFailed(text);
    } catch {
      markFailed(text);
    } finally {
      setPending(null);
    }
  }
  function markFailed(text) {
    setFailed((prev) => {
      const next = new Set(prev);
      next.add(text);
      return next;
    });
  }
  const base2 = "inline-flex items-center gap-1.5 rounded-[8px] border px-[11px] py-[5px] text-[12px] font-medium tracking-[-0.05px] transition-colors";
  return /* @__PURE__ */ jsxs2(
    m.div,
    {
      variants: staggerContainer,
      initial: "hidden",
      animate: "visible",
      className: cn("flex flex-wrap items-center gap-1.5", className),
      children: [
        label && /* @__PURE__ */ jsx11(
          m.span,
          {
            variants: staggerItem,
            className: "text-[11px] font-medium uppercase tracking-[0.4px] text-[var(--ink-mute)]",
            children: label
          }
        ),
        items.map((text, i) => {
          if (!canSendFollowup) {
            return /* @__PURE__ */ jsx11(
              m.span,
              {
                variants: staggerItem,
                className: cn(
                  base2,
                  "border-[var(--surface-border)] bg-[var(--surface-muted)] text-[var(--ink-soft)]"
                ),
                children: text
              },
              i
            );
          }
          const isPending = pending === text;
          const didFail = failed.has(text);
          return /* @__PURE__ */ jsxs2(
            m.button,
            {
              type: "button",
              disabled: !!pending,
              onClick: () => onClick(text),
              title: didFail ? "Couldn't send \u2014 click to retry" : text,
              variants: staggerItem,
              whileHover: pending ? void 0 : { y: -1 },
              whileTap: pending ? void 0 : { scale: 0.97 },
              transition: spring,
              className: cn(
                base2,
                "cursor-pointer border-[var(--surface-border)] bg-[var(--surface-muted)] text-[var(--ink-soft)]",
                "hover:border-transparent hover:bg-[var(--accent-soft)] hover:text-[var(--accent-bright)]",
                "disabled:cursor-default disabled:opacity-50",
                didFail && "border-[var(--danger)] text-[var(--danger)] hover:text-[var(--danger)]"
              ),
              children: [
                isPending && /* @__PURE__ */ jsx11(
                  m.span,
                  {
                    variants: scaleIn,
                    initial: "hidden",
                    animate: {
                      opacity: [1, 0.4, 1],
                      scale: 1,
                      transition: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                    },
                    className: "h-1.5 w-1.5 rounded-full bg-[var(--accent-bright)]"
                  }
                ),
                /* @__PURE__ */ jsx11("span", { children: text }),
                didFail && /* @__PURE__ */ jsx11("span", { "aria-hidden": true, children: "\xB7 retry" })
              ]
            },
            i
          );
        })
      ]
    }
  );
}

// packages/ui/src/components/glass/Stat.tsx
import * as React6 from "react";

// packages/ui/src/components/glass/tokens.ts
var GLASS_TONES = ["accent", "warn", "success", "danger", "info", "neutral"];
var TONE_VARS = {
  accent: { color: "var(--accent-bright)", soft: "var(--accent-soft)" },
  warn: { color: "var(--warn)", soft: "var(--warn-soft)" },
  success: { color: "var(--success)", soft: "var(--success-soft)" },
  danger: { color: "var(--danger)", soft: "var(--danger-soft)" },
  info: { color: "var(--info)", soft: "var(--info-soft)" },
  neutral: { color: "var(--ink-soft)", soft: "var(--surface-muted)" }
};
function toneVars(tone) {
  return TONE_VARS[tone];
}
function toneTextColor(tone, neutralVar = "var(--ink-bright)") {
  return tone === "neutral" ? neutralVar : TONE_VARS[tone].color;
}
var DOT_CLASS_FOR_TONE = {
  accent: "bg-[var(--accent-bright)]",
  warn: "bg-[var(--warn)]",
  success: "bg-[var(--success)]",
  danger: "bg-[var(--danger)]",
  info: "bg-[var(--info)]",
  neutral: "bg-[var(--ink-soft)]"
};
var BADGE_VARIANT_FOR_TONE = {
  accent: "default",
  info: "info",
  success: "success",
  warn: "warning",
  danger: "destructive",
  neutral: "secondary"
};

// packages/ui/src/components/glass/Stat.tsx
import { jsx as jsx12, jsxs as jsxs3 } from "react/jsx-runtime";
var Stat = React6.forwardRef(
  ({
    className,
    value,
    label,
    delta,
    deltaTone = "neutral",
    size = "xl",
    animateValue = true,
    valueDecimals = 0,
    ...props
  }, ref) => {
    const t = toneVars(deltaTone);
    return /* @__PURE__ */ jsxs3(
      m.div,
      {
        ref,
        variants: scaleIn,
        initial: "hidden",
        animate: "visible",
        transition: spring,
        className: cn("flex flex-col gap-1", className),
        ...props,
        children: [
          /* @__PURE__ */ jsxs3("div", { className: "flex items-baseline gap-2", children: [
            /* @__PURE__ */ jsx12(
              "span",
              {
                className: cn(
                  "font-semibold leading-none text-[var(--ink-bright)] [font-feature-settings:'tnum'_1,'lnum'_1]",
                  size === "xl" ? "text-[34px] tracking-[-1px]" : "text-[26px] tracking-[-0.8px]"
                ),
                children: animateValue && typeof value === "number" ? /* @__PURE__ */ jsx12(AnimatedNumber, { value, decimals: valueDecimals }) : value
              }
            ),
            delta != null && /* @__PURE__ */ jsx12(
              "span",
              {
                className: "font-[family-name:var(--font-mono)] text-[12px] font-medium tracking-[0.1px]",
                style: { color: t.color },
                children: delta
              }
            )
          ] }),
          label != null && /* @__PURE__ */ jsx12("span", { className: "text-[12.5px] tracking-[-0.05px] text-[var(--ink-mute)]", children: label })
        ]
      }
    );
  }
);
Stat.displayName = "Stat";

// packages/ui/src/components/glass/HBar.tsx
import * as React7 from "react";
import { jsx as jsx13 } from "react/jsx-runtime";
var HBar = React7.forwardRef(
  ({ className, fraction, value, max = 100, tone = "accent", height = 7, ...props }, ref) => {
    const raw = fraction != null ? fraction : value != null ? value / max : 0;
    const pct = Math.max(0, Math.min(1, raw)) * 100;
    const t = toneVars(tone);
    return /* @__PURE__ */ jsx13(
      "div",
      {
        ref,
        role: "progressbar",
        "aria-valuenow": Math.round(pct),
        "aria-valuemin": 0,
        "aria-valuemax": 100,
        className: cn("group/hbar w-full overflow-hidden rounded-[3px] bg-[var(--surface-muted)]", className),
        style: { height },
        ...props,
        children: /* @__PURE__ */ jsx13(
          m.div,
          {
            className: "h-full min-w-[3px] rounded-[3px] opacity-90 transition-opacity duration-500 ease-[cubic-bezier(.2,.7,.2,1)] group-hover/hbar:opacity-100",
            style: { backgroundColor: t.color },
            initial: { width: "0%" },
            animate: { width: `${pct}%` },
            transition: easeOut
          }
        )
      }
    );
  }
);
HBar.displayName = "HBar";

// packages/ui/src/components/glass/BudgetBar.tsx
import * as React8 from "react";
import { jsx as jsx14, jsxs as jsxs4 } from "react/jsx-runtime";
var BudgetBar = React8.forwardRef(
  ({ remaining, warnAtConsumed: warnAtConsumed2 = null, last24hConsumed = null, className }, ref) => {
    const consumed = Math.max(0, 1 - remaining);
    const overBudget = consumed > 1;
    const warnFraction = warnAtConsumed2 !== null && warnAtConsumed2 >= 0 && warnAtConsumed2 <= 1 ? warnAtConsumed2 : null;
    const greenWidthPct = (warnFraction ?? 1) * 100;
    const amberWidthPct = warnFraction !== null ? (1 - warnFraction) * 100 : 0;
    const overflowAbs = overBudget ? consumed - 1 : 0;
    const overflowRenderedPct = Math.min(overflowAbs, 0.2) * 100;
    const overflowClipped = overflowAbs > 0.2;
    const show24h = last24hConsumed != null && Number.isFinite(last24hConsumed);
    const last24hPct = show24h ? Math.min(100, Math.max(0, last24hConsumed) * 100) : 0;
    const success = toneVars("success");
    const warn = toneVars("warn");
    const danger = toneVars("danger");
    const info = toneVars("info");
    const fillColor = overBudget ? danger.color : consumed > (warnFraction ?? 1) ? warn.color : success.color;
    const zoneStyle = { position: "absolute", top: 0, bottom: 0 };
    const glyphGutterPx = overflowClipped ? 16 : 0;
    const trackWidth = overBudget ? `calc((100% - ${glyphGutterPx}px) / ${(1 + overflowRenderedPct / 100).toFixed(4)})` : "100%";
    return /* @__PURE__ */ jsxs4("div", { ref, className, "data-testid": "budget-bar", children: [
      /* @__PURE__ */ jsxs4(
        "div",
        {
          className: "relative rounded-[4px] bg-[var(--surface-muted)]",
          style: { height: 14, width: trackWidth, overflow: "visible" },
          children: [
            /* @__PURE__ */ jsx14(
              "div",
              {
                style: {
                  ...zoneStyle,
                  left: 0,
                  width: `${greenWidthPct}%`,
                  background: success.soft,
                  borderTopLeftRadius: 4,
                  borderBottomLeftRadius: 4,
                  borderTopRightRadius: amberWidthPct > 0 || overBudget ? 0 : 4,
                  borderBottomRightRadius: amberWidthPct > 0 || overBudget ? 0 : 4
                }
              }
            ),
            amberWidthPct > 0 && /* @__PURE__ */ jsx14(
              "div",
              {
                style: {
                  ...zoneStyle,
                  left: `${greenWidthPct}%`,
                  width: `${amberWidthPct}%`,
                  background: warn.soft,
                  borderTopRightRadius: overBudget ? 0 : 4,
                  borderBottomRightRadius: overBudget ? 0 : 4
                }
              }
            ),
            overBudget && /* @__PURE__ */ jsx14(
              "div",
              {
                style: {
                  ...zoneStyle,
                  left: "100%",
                  width: `${overflowRenderedPct}%`,
                  background: danger.soft,
                  borderTopRightRadius: 4,
                  borderBottomRightRadius: 4
                }
              }
            ),
            /* @__PURE__ */ jsx14(
              m.div,
              {
                className: "absolute left-0 top-0 bottom-0 rounded-l-[4px]",
                style: { background: fillColor, opacity: 0.55 },
                initial: { width: "0%" },
                animate: { width: `${Math.min(100, consumed * 100)}%` },
                transition: easeOut
              }
            ),
            warnFraction !== null && /* @__PURE__ */ jsx14(
              "div",
              {
                className: "absolute",
                style: { left: `${warnFraction * 100}%`, top: -2, bottom: -2, width: 0, borderLeft: `1px dashed ${warn.color}` }
              }
            ),
            /* @__PURE__ */ jsx14(
              "div",
              {
                className: "absolute",
                style: { left: "100%", top: -2, bottom: -2, width: 0, borderLeft: `1px dashed ${danger.color}` }
              }
            ),
            overflowClipped && /* @__PURE__ */ jsx14(
              "div",
              {
                className: "absolute flex items-center",
                style: {
                  left: `${100 + overflowRenderedPct}%`,
                  top: 0,
                  bottom: 0,
                  paddingLeft: 2,
                  fontSize: 10,
                  lineHeight: 1,
                  color: danger.color
                },
                "aria-label": "budget consumed far exceeds 100%",
                children: "\u25B6"
              }
            )
          ]
        }
      ),
      show24h && /* @__PURE__ */ jsx14(
        "div",
        {
          className: "relative overflow-hidden rounded-[2px] bg-[var(--surface-muted)]",
          style: { height: 3, marginTop: 2 },
          children: /* @__PURE__ */ jsx14(
            "div",
            {
              className: "absolute left-0 top-0 bottom-0",
              style: { width: `${last24hPct}%`, background: info.color }
            }
          )
        }
      )
    ] });
  }
);
BudgetBar.displayName = "BudgetBar";

// packages/ui/src/components/glass/MetricCards.tsx
import { jsx as jsx15, jsxs as jsxs5 } from "react/jsx-runtime";
function MetricCards({ cards, className }) {
  if (cards.length === 0) return null;
  return /* @__PURE__ */ jsx15(
    m.div,
    {
      variants: staggerContainer,
      initial: "hidden",
      animate: "visible",
      className: cn("flex flex-wrap gap-2", className),
      children: cards.map((c, i) => {
        const valueTone = c.valueTone ?? "neutral";
        const deltaTone = c.deltaTone ?? "neutral";
        return /* @__PURE__ */ jsxs5(
          m.div,
          {
            variants: staggerItem,
            className: "flex min-w-[100px] flex-1 flex-col gap-0.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5",
            children: [
              /* @__PURE__ */ jsx15("span", { className: "text-[10px] uppercase leading-[1.4] tracking-[0.05em] text-[var(--ink-mute)]", children: c.label }),
              /* @__PURE__ */ jsx15(
                "span",
                {
                  className: "font-[family-name:var(--font-mono)] text-[18px] font-bold leading-[1.2] [font-feature-settings:'tnum'_1,'lnum'_1]",
                  style: { color: toneTextColor(valueTone) },
                  children: typeof c.value === "number" ? /* @__PURE__ */ jsx15(AnimatedNumber, { value: c.value }) : c.value
                }
              ),
              c.delta != null && /* @__PURE__ */ jsx15(
                "span",
                {
                  className: "text-[10px] font-semibold leading-[1.4]",
                  style: { color: toneTextColor(deltaTone, "var(--ink-mute)") },
                  children: c.delta
                }
              )
            ]
          },
          i
        );
      })
    }
  );
}

// packages/ui/src/components/glass/CodeBlock.tsx
import * as React9 from "react";

// packages/ui/src/components/glass/highlight.tsx
import { jsx as jsx16 } from "react/jsx-runtime";
var KIND_VAR = {
  keyword: "var(--code-keyword)",
  string: "var(--code-string)",
  number: "var(--code-number)",
  property: "var(--code-property)",
  punct: "var(--code-punct)",
  comment: "var(--code-comment)",
  boolean: "var(--code-boolean)",
  fn: "var(--code-fn)",
  plain: void 0
  // inherits --code-fg
};
var SQL_KEYWORDS = new Set(
  "select from where group by order asc desc limit offset having join left right inner outer on as and or not in is null like between union all distinct case when then else end with insert update delete set values into count sum avg min max".split(/\s+/)
);
var PPL_KEYWORDS = new Set(
  "search source where stats by sort head tail eval fields dedup rename top rare parse grok eventstats fillnull table join lookup as and or not in like isnull isnotnull case if span count sum avg min max dc earliest latest now date_sub date_add".split(/\s+/)
);
var PROMQL_KEYWORDS = new Set(
  "by without on ignoring group_left group_right offset bool and or unless".split(/\s+/)
);
var PROMQL_FUNCS = new Set(
  "sum rate irate increase avg min max count count_values stddev stdvar topk bottomk quantile histogram_quantile sum_over_time avg_over_time max_over_time min_over_time count_over_time delta deriv predict_linear abs ceil floor round clamp_max clamp_min label_replace label_join time".split(/\s+/)
);
function tokenizeJson(src) {
  const tokens = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (c === " " || c === "\n" || c === "	" || c === "\r") {
      let j = i + 1;
      while (j < n && /\s/.test(src[j])) j++;
      tokens.push({ kind: "plain", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === '"') {
          j++;
          break;
        }
        j++;
      }
      const str = src.slice(i, j);
      let k = j;
      while (k < n && /\s/.test(src[k])) k++;
      tokens.push({ kind: src[k] === ":" ? "property" : "string", value: str });
      i = j;
      continue;
    }
    if (c === "-" || c >= "0" && c <= "9") {
      let j = i + 1;
      while (j < n && /[0-9.eE+\-]/.test(src[j])) j++;
      tokens.push({ kind: "number", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[a-z]/.test(c)) {
      let j = i + 1;
      while (j < n && /[a-z]/.test(src[j])) j++;
      const word = src.slice(i, j);
      tokens.push({
        kind: word === "true" || word === "false" || word === "null" ? "boolean" : "plain",
        value: word
      });
      i = j;
      continue;
    }
    tokens.push({ kind: "punct", value: c });
    i++;
  }
  return tokens;
}
function tokenizeQuery(src, keywords, funcs) {
  const tokens = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const c = src[i];
    if (/\s/.test(c)) {
      let j = i + 1;
      while (j < n && /\s/.test(src[j])) j++;
      tokens.push({ kind: "plain", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "-" && src[i + 1] === "-" || c === "#") {
      let j = i + 1;
      while (j < n && src[j] !== "\n") j++;
      tokens.push({ kind: "comment", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === "'" || c === '"' || c === "`") {
      const quote = c;
      let j = i + 1;
      while (j < n) {
        if (src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === quote) {
          j++;
          break;
        }
        j++;
      }
      tokens.push({ kind: "string", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c >= "0" && c <= "9") {
      let j = i + 1;
      while (j < n && /[0-9.]/.test(src[j])) j++;
      while (j < n && /[a-z]/i.test(src[j])) j++;
      tokens.push({ kind: "number", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[a-z_$]/i.test(c)) {
      let j = i + 1;
      while (j < n && /[a-z0-9_$.]/i.test(src[j])) j++;
      const word = src.slice(i, j);
      const lower = word.toLowerCase();
      let k = j;
      while (k < n && src[k] === " ") k++;
      let kind = "plain";
      if (keywords.has(lower)) kind = "keyword";
      else if (funcs?.has(lower)) kind = "fn";
      else if (src[k] === "(") kind = "fn";
      tokens.push({ kind, value: word });
      i = j;
      continue;
    }
    tokens.push({ kind: "punct", value: c });
    i++;
  }
  return tokens;
}
function tokenizeLog(src) {
  const tokens = [];
  let i = 0;
  const n = src.length;
  const LEVELS = /^(TRACE|DEBUG|INFO|NOTICE|WARN|WARNING|ERROR|FATAL|CRITICAL)$/i;
  while (i < n) {
    const c = src[i];
    if (/\s/.test(c)) {
      let j = i + 1;
      while (j < n && /\s/.test(src[j])) j++;
      tokens.push({ kind: "plain", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < n && src[j] !== quote) {
        if (src[j] === "\\") j++;
        j++;
      }
      j = Math.min(j + 1, n);
      tokens.push({ kind: "string", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (c >= "0" && c <= "9") {
      let j = i + 1;
      while (j < n && /[0-9.:TZ+\-]/.test(src[j])) j++;
      tokens.push({ kind: "number", value: src.slice(i, j) });
      i = j;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_.]/.test(src[j])) j++;
      const word = src.slice(i, j);
      const isKey = src[j] === "=";
      tokens.push({
        kind: LEVELS.test(word) ? "keyword" : isKey ? "property" : "plain",
        value: word
      });
      i = j;
      continue;
    }
    tokens.push({ kind: "punct", value: c });
    i++;
  }
  return tokens;
}
function tokenize(src, lang) {
  switch (lang) {
    case "json":
      return tokenizeJson(src);
    case "sql":
      return tokenizeQuery(src, SQL_KEYWORDS);
    case "ppl":
      return tokenizeQuery(src, PPL_KEYWORDS);
    case "promql":
      return tokenizeQuery(src, PROMQL_KEYWORDS, PROMQL_FUNCS);
    case "log":
      return tokenizeLog(src);
    case "text":
    default:
      return [{ kind: "plain", value: src }];
  }
}
function highlight(code, lang) {
  if (lang === "text") return [code];
  const tokens = tokenize(code, lang);
  const out = [];
  tokens.forEach((t, idx) => {
    const color = KIND_VAR[t.kind];
    if (!color) {
      out.push(t.value);
    } else {
      out.push(
        /* @__PURE__ */ jsx16("span", { style: { color }, children: t.value }, idx)
      );
    }
  });
  return out;
}

// packages/ui/src/components/glass/CodeBlock.tsx
import { jsx as jsx17 } from "react/jsx-runtime";
var CodeBlock = React9.forwardRef(
  ({ code, language = "text", wrap = false, maxHeight = "360px", className, style, ...props }, ref) => {
    const text = typeof code === "string" ? code : JSON.stringify(code ?? {}, null, 2);
    const highlighted = React9.useMemo(() => highlight(text, language), [text, language]);
    return /* @__PURE__ */ jsx17(
      m.pre,
      {
        ref,
        variants: fadeIn,
        initial: "hidden",
        animate: "visible",
        className: cn(
          "glass-code overflow-auto rounded-[8px] border border-[var(--surface-border)] bg-[var(--surface-subtle)] p-3 text-[12.5px] leading-[1.6] text-[var(--code-fg)]",
          wrap ? "whitespace-pre-wrap break-words" : "whitespace-pre",
          className
        ),
        style: { maxHeight, ...style },
        ...props,
        children: /* @__PURE__ */ jsx17("code", { className: "glass-code", children: highlighted })
      }
    );
  }
);
CodeBlock.displayName = "CodeBlock";

// packages/ui/src/components/glass/Timeline.tsx
import { jsx as jsx18, jsxs as jsxs6 } from "react/jsx-runtime";

// packages/ui/src/components/glass/ScoreGauge.tsx
import { jsx as jsx19, jsxs as jsxs7 } from "react/jsx-runtime";

// packages/ui/src/components/glass/EvidenceBlock.tsx
import { jsx as jsx20, jsxs as jsxs8 } from "react/jsx-runtime";
function EvidenceBlock({
  badge,
  badgeTone = "neutral",
  caption,
  code,
  language = "text",
  maxHeight = "200px",
  className
}) {
  return /* @__PURE__ */ jsxs8(
    m.div,
    {
      variants: fadeIn,
      initial: "hidden",
      animate: "visible",
      className: cn(
        "overflow-hidden rounded-[8px] border border-[var(--surface-border)] bg-[var(--surface-subtle)]",
        className
      ),
      children: [
        (badge || caption != null) && /* @__PURE__ */ jsxs8("div", { className: "flex items-center gap-2 border-b border-[var(--surface-border)] px-2.5 py-1.5", children: [
          badge && /* @__PURE__ */ jsx20(
            Badge,
            {
              variant: BADGE_VARIANT_FOR_TONE[badgeTone],
              animate: false,
              className: "shrink-0 px-1.5 py-0 text-[10px]",
              children: badge
            }
          ),
          caption != null && /* @__PURE__ */ jsx20("span", { className: "min-w-0 flex-1 truncate text-[11px] text-[var(--ink-mute)]", children: caption })
        ] }),
        /* @__PURE__ */ jsx20(
          CodeBlock,
          {
            code,
            language,
            wrap: true,
            maxHeight,
            className: "rounded-none border-0 bg-transparent"
          }
        )
      ]
    }
  );
}

// packages/ui/src/components/glass/ComparisonPanel.tsx
import { jsx as jsx21, jsxs as jsxs9 } from "react/jsx-runtime";
function ComparisonPanel({ sides, className }) {
  if (sides.length === 0) return null;
  return /* @__PURE__ */ jsx21(
    m.div,
    {
      variants: staggerContainer,
      initial: "hidden",
      animate: "visible",
      className: cn(
        "grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-2.5",
        className
      ),
      children: sides.map((side, i) => {
        const dotColor = toneVars(side.tone ?? "neutral").color;
        return /* @__PURE__ */ jsxs9(
          m.div,
          {
            variants: staggerItem,
            className: "rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2.5",
            children: [
              /* @__PURE__ */ jsxs9("div", { className: "mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-[var(--ink-soft)]", children: [
                /* @__PURE__ */ jsx21(
                  "span",
                  {
                    className: "h-1.5 w-1.5 shrink-0 rounded-full",
                    style: { backgroundColor: dotColor },
                    "aria-hidden": true
                  }
                ),
                /* @__PURE__ */ jsx21("span", { className: "min-w-0 truncate", children: side.label })
              ] }),
              /* @__PURE__ */ jsx21("div", { className: "flex flex-col gap-1", children: side.metrics.map((row, ri) => /* @__PURE__ */ jsxs9("div", { className: "flex items-baseline justify-between gap-3 text-[12px]", children: [
                /* @__PURE__ */ jsx21("span", { className: "text-[var(--ink-mute)]", children: row.label }),
                /* @__PURE__ */ jsx21(
                  "span",
                  {
                    className: "font-[family-name:var(--font-mono)] font-semibold [font-feature-settings:'tnum'_1,'lnum'_1]",
                    style: { color: toneTextColor(row.valueTone ?? "neutral") },
                    children: row.value
                  }
                )
              ] }, ri)) })
            ]
          },
          i
        );
      })
    }
  );
}

// packages/ui/src/components/glass/chart-core.tsx
import * as React10 from "react";
import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  LineController,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip
} from "chart.js";
import { color as chartColor } from "chart.js/helpers";
import { Bar, Line } from "react-chartjs-2";
import { jsx as jsx22 } from "react/jsx-runtime";
ChartJS.register(
  LineController,
  LineElement,
  BarController,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Filler,
  Tooltip
);
var TONE_VAR = {
  accent: "--accent-bright",
  warn: "--warn",
  success: "--success",
  danger: "--danger",
  info: "--info",
  neutral: "--ink-soft"
};
var ECHARTS_CATEGORIES_LIGHT = [
  "#5470c6",
  "#91cc75",
  "#fac858",
  "#ee6666",
  "#73c0de",
  "#3ba272",
  "#fc8452",
  "#9a60b4",
  "#ea7ccc"
];
var ECHARTS_CATEGORIES_DARK = [
  "#7289ab",
  "#dd6b66",
  "#e69d87",
  "#8dc1a9",
  "#ea7e53",
  "#eedd78",
  "#73a373",
  "#73b9bc",
  "#759aa0",
  "#91ca8c",
  "#f49f42"
];
function readVar(name) {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}
function isDark() {
  if (typeof window === "undefined") return false;
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return true;
  if (attr === "light") return false;
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
}
function seriesPalette() {
  return isDark() ? ECHARTS_CATEGORIES_DARK : ECHARTS_CATEGORIES_LIGHT;
}
function toneColor(tone) {
  return readVar(TONE_VAR[tone]) || "#6366f1";
}
function withAlpha(c, alpha) {
  const parsed = chartColor(c);
  return parsed.valid ? parsed.alpha(alpha).rgbString() : c;
}
function monoFont() {
  return readVar("--font-mono") || "monospace";
}
function readPalette() {
  return {
    grid: readVar("--ink-hairline") || "rgba(0,0,0,0.07)",
    text: readVar("--ink-mute") || "rgba(0,0,0,0.46)",
    surface: readVar("--surface") || "#fff",
    hairline: readVar("--ink-hairline") || "rgba(0,0,0,0.1)",
    inkBright: readVar("--ink-bright") || "#0a0a0a"
  };
}
function useThemeTick() {
  const [tick, setTick] = React10.useState(0);
  React10.useEffect(() => {
    const bump = () => setTick((t) => t + 1);
    const observer = new MutationObserver(bump);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class", "style"]
    });
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", bump);
    return () => {
      observer.disconnect();
      mq?.removeEventListener?.("change", bump);
    };
  }, []);
  return tick;
}
function valueAxisTicks(pal) {
  return {
    color: pal.text,
    font: { family: monoFont(), size: 9 },
    maxTicksLimit: 4,
    padding: 4
  };
}
function categoryAxisTicks(pal) {
  return {
    color: pal.text,
    font: { family: monoFont(), size: 9 },
    maxRotation: 0,
    autoSkip: true,
    maxTicksLimit: 8
  };
}
function valueAxisGrid(pal, show, dashed = false) {
  return {
    display: show,
    color: pal.grid,
    lineWidth: 1,
    drawTicks: false,
    ...dashed ? { tickBorderDash: [4, 4] } : {}
  };
}
function valueAxisBorder(dashed) {
  return { display: false, ...dashed ? { dash: [4, 4] } : {} };
}
function tooltipStyle(pal) {
  const mono = monoFont();
  return {
    enabled: true,
    mode: "index",
    intersect: false,
    usePointStyle: true,
    backgroundColor: pal.surface,
    borderColor: pal.hairline,
    borderWidth: 1,
    titleColor: pal.text,
    bodyColor: pal.inkBright,
    footerColor: pal.inkBright,
    padding: 8,
    cornerRadius: 5,
    titleFont: { family: mono, size: 10 },
    bodyFont: { family: mono, size: 11, weight: 600 },
    footerFont: { family: mono, size: 11, weight: 600 }
  };
}
function toValues(values) {
  const finite = values.map((v) => Number.isFinite(v) ? v : null);
  if (finite.length === 1) return [finite[0] ?? 0, finite[0] ?? 0];
  return finite;
}
var thresholdPlugin = {
  id: "glassThreshold",
  afterDatasetsDraw(chart) {
    const opts = chart.options.plugins?.glassThreshold;
    const value = opts?.value;
    if (value === void 0 || !Number.isFinite(value)) return;
    const yScale = chart.scales.y;
    const area = chart.chartArea;
    if (!yScale || !area) return;
    const y = yScale.getPixelForValue(value);
    if (y < area.top || y > area.bottom) return;
    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = opts?.color || "#dc2626";
    ctx.moveTo(area.left, y);
    ctx.lineTo(area.right, y);
    ctx.stroke();
    ctx.restore();
  }
};
var axisPointerPlugin = {
  id: "glassAxisPointer",
  afterDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.() ?? [];
    if (!active.length) return;
    const { x, y } = active[0].element;
    const area = chart.chartArea;
    if (!area) return;
    const opts = chart.options.plugins?.glassAxisPointer;
    const ctx = chart.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([3, 3]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = opts?.color || "rgba(0,0,0,0.2)";
    ctx.moveTo(x, area.top);
    ctx.lineTo(x, area.bottom);
    ctx.moveTo(area.left, y);
    ctx.lineTo(area.right, y);
    ctx.stroke();
    ctx.restore();
  }
};
function GlassChart({
  series,
  kind = "line",
  area = false,
  threshold,
  thresholdTone = "danger",
  height = 140,
  grid = true,
  xLabels,
  xAxis,
  formatValue,
  className,
  style
}) {
  const themeTick = useThemeTick();
  const isBar = kind === "bar";
  const useArea = kind === "area" || area && series.length <= 1;
  const { data, options } = React10.useMemo(() => {
    const pal = readPalette();
    const cats = seriesPalette();
    const longest = series.reduce((m2, s) => Math.max(m2, s.values.length), 0);
    const labels = xLabels && xLabels.length ? xLabels : Array.from({ length: Math.max(longest, 2) }, (_, i) => i);
    const datasets = series.map((s, i) => {
      const stroke = s.tone ? toneColor(s.tone) : cats[i % cats.length];
      if (isBar) {
        return {
          label: s.label,
          data: toValues(s.values),
          backgroundColor: withAlpha(stroke, 0.75),
          borderColor: stroke,
          borderWidth: 0,
          // Slim bars with a touch of rounding — readable when many series group.
          borderRadius: 1,
          categoryPercentage: 0.85,
          barPercentage: 0.95
        };
      }
      return {
        label: s.label,
        data: toValues(s.values),
        borderColor: stroke,
        // OSD's SparklineChart draws ECharts lines at `lineStyle.width: 1`.
        borderWidth: 1,
        // ECharts sparklines are not smoothed — keep the polyline literal so
        // peaks/dips read at their true position.
        tension: 0,
        spanGaps: true,
        fill: useArea ? "origin" : false,
        // ECharts `areaStyle: { opacity: 0.2 }` — a flat translucent fill, not a
        // gradient. We match that single semi-opaque tint under the line.
        backgroundColor: useArea ? withAlpha(stroke, 0.2) : "transparent",
        pointRadius: 0,
        pointHoverRadius: 3,
        pointHoverBackgroundColor: stroke,
        pointHoverBorderColor: pal.surface,
        pointHoverBorderWidth: 1,
        pointHitRadius: 8
      };
    });
    const showValueAxis = grid && !!formatValue;
    const hasXLabels = !!(xLabels && xLabels.length);
    const showXAxis = xAxis ?? hasXLabels;
    const opts = {
      responsive: true,
      maintainAspectRatio: false,
      // ECharts' default animationDuration is 500ms.
      animation: { duration: 500 },
      interaction: { mode: "index", intersect: false },
      layout: { padding: { top: 4, bottom: 2 } },
      scales: {
        x: showXAxis ? {
          display: true,
          grid: { display: false },
          border: { display: false },
          ticks: categoryAxisTicks(pal)
        } : { display: false, grid: { display: false } },
        y: {
          display: showValueAxis,
          // OSD's SparklineChart puts the value axis on the LEFT.
          position: "left",
          border: valueAxisBorder(grid),
          grid: valueAxisGrid(pal, grid, true),
          ticks: {
            ...valueAxisTicks(pal),
            display: showValueAxis,
            callback: (v) => formatValue ? formatValue(typeof v === "number" ? v : Number(v)) : String(v)
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle(pal),
          // Single series: bare value; multi-series: prefix the line name.
          // Surface the hovered category (time) label as the title whenever
          // labels exist — even when the tick axis itself is hidden.
          callbacks: {
            title: (items) => hasXLabels && items.length ? String(items[0].label ?? "") : "",
            label: (item) => {
              const raw = item.parsed.y;
              if (raw === null || raw === void 0) return "";
              const val = formatValue ? formatValue(raw) : String(raw);
              const name = item.dataset.label;
              return name ? `${name}  ${val}` : val;
            }
          }
        },
        // ECharts-style vertical axis-pointer crosshair (inline plugin above).
        glassAxisPointer: { color: pal.grid },
        // Consumed by the inline threshold plugin above.
        ...threshold !== void 0 && Number.isFinite(threshold) ? { glassThreshold: { value: threshold, color: toneColor(thresholdTone) } } : {}
      }
    };
    return {
      data: { labels, datasets },
      options: opts
    };
  }, [series, isBar, useArea, grid, xLabels, xAxis, formatValue, threshold, thresholdTone, themeTick]);
  return /* @__PURE__ */ jsx22(
    m.div,
    {
      variants: fadeIn,
      initial: "hidden",
      animate: "visible",
      className: cn("relative block w-full", className),
      style: { height, minHeight: height, ...style },
      children: isBar ? /* @__PURE__ */ jsx22(
        Bar,
        {
          data,
          options,
          plugins: [thresholdPlugin]
        }
      ) : /* @__PURE__ */ jsx22(Line, { data, options, plugins: [axisPointerPlugin, thresholdPlugin] })
    }
  );
}

// packages/ui/src/components/glass/MultiLineChart.tsx
import { jsx as jsx23 } from "react/jsx-runtime";
function MultiLineChart({
  series,
  kind = "line",
  xLabels,
  xAxis,
  threshold,
  thresholdTone = "danger",
  height = 150,
  grid = true,
  formatValue,
  className,
  style
}) {
  const minPoints = kind === "bar" ? 1 : 2;
  const lines = series.filter((s) => s.points.length >= minPoints).map((s) => ({ label: s.label, values: s.points, tone: s.tone }));
  return /* @__PURE__ */ jsx23(
    GlassChart,
    {
      series: lines,
      kind,
      xLabels,
      xAxis,
      threshold,
      thresholdTone,
      height,
      grid,
      formatValue,
      className,
      style
    }
  );
}

// packages/ui/src/components/glass/StackedBars.tsx
import * as React11 from "react";
import {
  BarController as BarController2,
  BarElement as BarElement2,
  CategoryScale as CategoryScale2,
  Chart as ChartJS2,
  LinearScale as LinearScale2,
  Tooltip as Tooltip2
} from "chart.js";
import { Bar as Bar2 } from "react-chartjs-2";
import { jsx as jsx24 } from "react/jsx-runtime";
ChartJS2.register(BarController2, BarElement2, CategoryScale2, LinearScale2, Tooltip2);
var shadowPointerPlugin = {
  id: "glassShadowPointer",
  beforeDatasetsDraw(chart) {
    const active = chart.tooltip?.getActiveElements?.() ?? [];
    if (!active.length) return;
    const xScale = chart.scales.x;
    const area = chart.chartArea;
    if (!xScale || !area) return;
    const index = active[0].index;
    const center = xScale.getPixelForValue(index);
    const slot = typeof xScale.width === "number" && chart.data.labels?.length ? xScale.width / chart.data.labels.length : 24;
    const opts = chart.options.plugins?.glassShadowPointer;
    const ctx = chart.ctx;
    ctx.save();
    ctx.fillStyle = opts?.color || "rgba(0,0,0,0.06)";
    ctx.fillRect(center - slot / 2, area.top, slot, area.bottom - area.top);
    ctx.restore();
  }
};
function StackedBars({
  className,
  style,
  data,
  series,
  height = 150,
  grid = true,
  xAxis = false,
  formatValue = String
}) {
  const themeTick = useThemeTick();
  const { chartData, options } = React11.useMemo(() => {
    const pal = readPalette();
    const labels = data.map((d) => d.label);
    const datasets = series.map((s, si) => ({
      label: s.key,
      data: data.map((d) => d.values[si] ?? 0),
      backgroundColor: toneColor(s.tone),
      borderRadius: 1,
      // Thin bars with breathing room, echoing the old 64%-of-slot look.
      categoryPercentage: 0.7,
      barPercentage: 0.9
    }));
    const opts = {
      responsive: true,
      maintainAspectRatio: false,
      // ECharts' default animationDuration is 500ms.
      animation: { duration: 500 },
      interaction: { mode: "index", intersect: false },
      layout: { padding: { top: 4, bottom: 2 } },
      scales: {
        x: {
          stacked: true,
          display: xAxis,
          grid: { display: false },
          border: { display: false },
          ticks: categoryAxisTicks(pal)
        },
        y: {
          stacked: true,
          beginAtZero: true,
          border: { display: false },
          grid: valueAxisGrid(pal, grid),
          ticks: {
            ...valueAxisTicks(pal),
            callback: (v) => formatValue(typeof v === "number" ? v : Number(v))
          }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          ...tooltipStyle(pal),
          callbacks: {
            // The x-axis ticks are hidden, so surface the hovered bucket label
            // as the tooltip title (it lives on each datum, fed in as `labels`).
            title: (items) => items.length ? String(items[0].label ?? "") : "",
            // Only segments with a value contribute a row; the footer carries
            // the bucket total (matches the old "label · total" tooltip).
            label: (item) => {
              const raw = item.parsed.y;
              if (!raw) return "";
              return `${item.dataset.label}  ${formatValue(raw)}`;
            },
            footer: (items) => {
              const total = items.reduce((sum, it) => sum + (it.parsed.y || 0), 0);
              return `total ${formatValue(total)}`;
            }
          }
        },
        // ECharts-style shadow axis-pointer band (inline plugin above).
        glassShadowPointer: { color: pal.grid }
      }
    };
    return {
      chartData: { labels, datasets },
      options: opts
    };
  }, [data, series, grid, xAxis, formatValue, themeTick]);
  return /* @__PURE__ */ jsx24(
    m.div,
    {
      variants: fadeIn,
      initial: "hidden",
      animate: "visible",
      className: cn("relative block w-full", className),
      style: { height, ...style },
      children: /* @__PURE__ */ jsx24(Bar2, { data: chartData, options, plugins: [shadowPointerPlugin] })
    }
  );
}

// packages/ui/src/components/glass/DAGChart.tsx
import * as React12 from "react";
import { jsx as jsx25, jsxs as jsxs10 } from "react/jsx-runtime";
var NODE_W = 170;
var NODE_H = 52;
var H_GAP = 30;
var V_GAP = 60;
var PAD = 30;
function layoutDag(nodes, edges, direction) {
  if (nodes.length === 0) return { nodes: [], width: 200, height: 100 };
  const children = /* @__PURE__ */ new Map();
  const inDegree = /* @__PURE__ */ new Map();
  for (const n of nodes) {
    children.set(n.id, []);
    inDegree.set(n.id, 0);
  }
  for (const e of edges) {
    children.get(e.from)?.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  }
  const roots = nodes.filter((n) => (inDegree.get(n.id) ?? 0) === 0);
  if (roots.length === 0 && nodes.length > 0) roots.push(nodes[0]);
  const depth = /* @__PURE__ */ new Map();
  const queue = roots.map((r) => ({ id: r.id, d: 0 }));
  while (queue.length > 0) {
    const { id, d } = queue.shift();
    const cur = depth.get(id) ?? -1;
    if (d <= cur) continue;
    depth.set(id, d);
    for (const child of children.get(id) ?? []) {
      queue.push({ id: child, d: d + 1 });
    }
  }
  for (const n of nodes) {
    if (!depth.has(n.id)) depth.set(n.id, 0);
  }
  const maxDepth = Math.max(0, ...depth.values());
  const levels = Array.from({ length: maxDepth + 1 }, () => []);
  for (const n of nodes) {
    levels[depth.get(n.id)].push(n);
  }
  const isHorizontal = direction === "LR";
  const primaryDim = isHorizontal ? NODE_W : NODE_H;
  const secondaryDim = isHorizontal ? NODE_H : NODE_W;
  const primaryGap = isHorizontal ? H_GAP : V_GAP;
  const secondaryGap = isHorizontal ? V_GAP : H_GAP;
  const maxPerLevel = levels.reduce((m2, l) => Math.max(m2, l.length), 1);
  const canvasSecondary = Math.max(
    300,
    PAD * 2 + maxPerLevel * (secondaryDim + secondaryGap) - secondaryGap
  );
  const canvasPrimary = PAD * 2 + (maxDepth + 1) * (primaryDim + primaryGap) - primaryGap;
  const positioned = [];
  levels.forEach((level, d) => {
    const totalSecondary = level.length * secondaryDim + (level.length - 1) * secondaryGap;
    const startSecondary = (canvasSecondary - totalSecondary) / 2;
    level.forEach((node, i) => {
      const primary = PAD + d * (primaryDim + primaryGap);
      const secondary = startSecondary + i * (secondaryDim + secondaryGap);
      positioned.push({
        x: isHorizontal ? primary : secondary,
        y: isHorizontal ? secondary : primary,
        node
      });
    });
  });
  return {
    nodes: positioned,
    width: isHorizontal ? canvasPrimary : canvasSecondary,
    height: isHorizontal ? canvasSecondary : canvasPrimary
  };
}
function edgePath(from, to, direction) {
  if (direction === "LR") {
    const x12 = from.x + NODE_W;
    const y12 = from.y + NODE_H / 2;
    const x22 = to.x;
    const y22 = to.y + NODE_H / 2;
    const mx = (x12 + x22) / 2;
    return `M${x12},${y12} C${mx},${y12} ${mx},${y22} ${x22},${y22}`;
  }
  const x1 = from.x + NODE_W / 2;
  const y1 = from.y + NODE_H;
  const x2 = to.x + NODE_W / 2;
  const y2 = to.y;
  const my = (y1 + y2) / 2;
  return `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
}
var DAGChart = React12.forwardRef(
  ({
    nodes,
    edges,
    direction = "TB",
    height = 400,
    selected,
    onSelect,
    toolbar = true,
    draggable = true,
    flow = false,
    className,
    ...props
  }, ref) => {
    const layout = React12.useMemo(
      () => layoutDag(nodes, edges, direction),
      [nodes, edges, direction]
    );
    const containerRef = React12.useRef(null);
    const [scale, setScale] = React12.useState(1);
    const [pan, setPan] = React12.useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = React12.useState(false);
    const panStart = React12.useRef({ x: 0, y: 0, px: 0, py: 0 });
    const [overrides, setOverrides] = React12.useState(/* @__PURE__ */ new Map());
    const [dragging, setDragging] = React12.useState(null);
    const dragOffset = React12.useRef({ x: 0, y: 0 });
    React12.useEffect(() => {
      setOverrides(/* @__PURE__ */ new Map());
    }, [layout]);
    const positioned = React12.useMemo(
      () => layout.nodes.map((ln) => {
        const o = overrides.get(ln.node.id);
        return o ? { ...ln, x: o.x, y: o.y } : ln;
      }),
      [layout, overrides]
    );
    const posMap = React12.useMemo(() => {
      const map = /* @__PURE__ */ new Map();
      positioned.forEach((n) => map.set(n.node.id, n));
      return map;
    }, [positioned]);
    React12.useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const viewW = el.clientWidth;
      const viewH = height;
      const fitScale = Math.max(
        0.35,
        Math.min(1, (viewW - 20) / layout.width, (viewH - 20) / layout.height) * 0.9
      );
      if (fitScale < 0.95) {
        setScale(fitScale);
        setPan({
          x: Math.max(0, (viewW - layout.width * fitScale) / 2),
          y: Math.max(0, (viewH - layout.height * fitScale) / 2)
        });
      } else {
        setScale(1);
        setPan({
          x: Math.max(0, (viewW - layout.width) / 2),
          y: Math.max(0, (viewH - layout.height) / 2)
        });
      }
    }, [layout, height]);
    const handleWheel = (e) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      const ns = Math.max(0.25, Math.min(2.5, scale * delta));
      setPan((p) => ({
        x: mx - (mx - p.x) * (ns / scale),
        y: my - (my - p.y) * (ns / scale)
      }));
      setScale(ns);
    };
    const handleMouseDown = (e) => {
      if (e.target.closest("[data-dag-node]")) return;
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    };
    const startDrag = (id, e) => {
      if (!draggable) return;
      e.stopPropagation();
      const pos = posMap.get(id);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!pos || !rect) return;
      setDragging(id);
      dragOffset.current = {
        x: (e.clientX - rect.left - pan.x) / scale - pos.x,
        y: (e.clientY - rect.top - pan.y) / scale - pos.y
      };
    };
    const handleMouseMove = (e) => {
      if (dragging) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = (e.clientX - rect.left - pan.x) / scale - dragOffset.current.x;
        const y = (e.clientY - rect.top - pan.y) / scale - dragOffset.current.y;
        setOverrides((prev) => new Map(prev).set(dragging, { x, y }));
        return;
      }
      if (!isPanning) return;
      setPan({
        x: panStart.current.px + (e.clientX - panStart.current.x),
        y: panStart.current.py + (e.clientY - panStart.current.y)
      });
    };
    const handleMouseUp = () => {
      setIsPanning(false);
      setDragging(null);
    };
    const fit = () => {
      setOverrides(/* @__PURE__ */ new Map());
      const el = containerRef.current;
      if (!el) return;
      const viewW = el.clientWidth;
      const viewH = height;
      const fitScale = Math.max(
        0.35,
        Math.min(1, (viewW - 20) / layout.width, (viewH - 20) / layout.height) * 0.9
      );
      setScale(fitScale);
      setPan({
        x: Math.max(0, (viewW - layout.width * fitScale) / 2),
        y: Math.max(0, (viewH - layout.height * fitScale) / 2)
      });
    };
    return /* @__PURE__ */ jsxs10(
      "div",
      {
        ref: (el) => {
          containerRef.current = el;
          if (typeof ref === "function") ref(el);
          else if (ref) ref.current = el;
        },
        className: cn(
          "relative overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)]",
          className
        ),
        style: { height, cursor: isPanning ? "grabbing" : "grab" },
        onMouseDown: handleMouseDown,
        onMouseMove: handleMouseMove,
        onMouseUp: handleMouseUp,
        onMouseLeave: handleMouseUp,
        onWheel: handleWheel,
        ...props,
        children: [
          toolbar && /* @__PURE__ */ jsxs10(
            m.div,
            {
              className: "absolute top-2 right-2 z-10 flex items-center gap-1",
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: easeOut,
              children: [
                /* @__PURE__ */ jsx25(
                  "button",
                  {
                    className: "flex h-6 items-center gap-1 rounded border border-[var(--surface-border)] bg-[var(--surface)] px-2 text-[10px] font-medium text-[var(--ink-soft)] hover:bg-[var(--glass-hi)] hover:text-[var(--ink)]",
                    onClick: fit,
                    children: "Fit"
                  }
                ),
                /* @__PURE__ */ jsx25(
                  "button",
                  {
                    className: "flex h-6 w-6 items-center justify-center rounded border border-[var(--surface-border)] bg-[var(--surface)] text-[11px] text-[var(--ink-soft)] hover:bg-[var(--glass-hi)] hover:text-[var(--ink)]",
                    onClick: () => setScale((s) => Math.min(2.5, s * 1.2)),
                    children: "+"
                  }
                ),
                /* @__PURE__ */ jsx25(
                  "button",
                  {
                    className: "flex h-6 w-6 items-center justify-center rounded border border-[var(--surface-border)] bg-[var(--surface)] text-[11px] text-[var(--ink-soft)] hover:bg-[var(--glass-hi)] hover:text-[var(--ink)]",
                    onClick: () => setScale((s) => Math.max(0.25, s * 0.85)),
                    children: "\u2212"
                  }
                ),
                /* @__PURE__ */ jsxs10("span", { className: "ml-1 text-[10px] text-[var(--ink-mute)]", children: [
                  nodes.length,
                  " nodes"
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxs10(
            "div",
            {
              style: {
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                transformOrigin: "0 0",
                position: "relative",
                width: layout.width,
                height: layout.height
              },
              children: [
                /* @__PURE__ */ jsxs10(
                  "svg",
                  {
                    width: layout.width,
                    height: layout.height,
                    viewBox: `0 0 ${layout.width} ${layout.height}`,
                    style: { position: "absolute", inset: 0, pointerEvents: "none" },
                    children: [
                      /* @__PURE__ */ jsx25("defs", { children: /* @__PURE__ */ jsx25(
                        "marker",
                        {
                          id: "dag-arrow",
                          viewBox: "0 0 8 8",
                          refX: "7",
                          refY: "4",
                          markerWidth: "5",
                          markerHeight: "5",
                          orient: "auto",
                          children: /* @__PURE__ */ jsx25(
                            "path",
                            {
                              d: "M1 1L7 4L1 7",
                              fill: "none",
                              strokeWidth: "1.5",
                              strokeLinecap: "round",
                              strokeLinejoin: "round",
                              stroke: "var(--ink-soft)"
                            }
                          )
                        }
                      ) }),
                      edges.map((edge, i) => {
                        const fromNode = posMap.get(edge.from);
                        const toNode = posMap.get(edge.to);
                        if (!fromNode || !toNode) return null;
                        const d = edgePath(fromNode, toNode, direction);
                        const t = toneVars(edge.tone ?? "neutral");
                        return /* @__PURE__ */ jsxs10("g", { children: [
                          /* @__PURE__ */ jsx25(
                            m.path,
                            {
                              d,
                              fill: "none",
                              stroke: t.color,
                              strokeWidth: 1.5,
                              strokeDasharray: edge.dashed ? "5 4" : void 0,
                              markerEnd: "url(#dag-arrow)",
                              initial: { pathLength: 0, opacity: 0 },
                              animate: { pathLength: 1, opacity: 1 },
                              transition: { duration: 0.5, delay: Math.min(i, 12) * 0.04, ease: "easeOut" }
                            }
                          ),
                          flow && /* @__PURE__ */ jsx25(
                            m.circle,
                            {
                              r: 2.5,
                              fill: t.color,
                              initial: { opacity: 0 },
                              animate: { opacity: 0.9 },
                              transition: { ...easeOut, delay: Math.min(i, 12) * 0.04 + 0.3 },
                              children: /* @__PURE__ */ jsx25("animateMotion", { dur: "2.5s", repeatCount: "indefinite", path: d })
                            }
                          )
                        ] }, `${edge.from}-${edge.to}-${i}`);
                      })
                    ]
                  }
                ),
                positioned.map((ln, i) => {
                  const t = toneVars(ln.node.tone ?? "neutral");
                  const isSelected = selected === ln.node.id;
                  const isDragging = dragging === ln.node.id;
                  return /* @__PURE__ */ jsx25(
                    m.div,
                    {
                      "data-dag-node": true,
                      initial: { opacity: 0, scale: 0.8 },
                      animate: { opacity: 1, scale: 1 },
                      transition: { ...spring, delay: Math.min(i, 16) * 0.035 },
                      whileHover: isDragging ? void 0 : { scale: 1.04 },
                      onMouseDown: (e) => startDrag(ln.node.id, e),
                      onClick: () => onSelect?.(ln.node.id),
                      className: cn(
                        "absolute select-none",
                        draggable ? isDragging ? "cursor-grabbing" : "cursor-grab" : "cursor-pointer"
                      ),
                      style: {
                        left: ln.x,
                        top: ln.y,
                        width: NODE_W,
                        height: NODE_H
                      },
                      children: /* @__PURE__ */ jsxs10(
                        "div",
                        {
                          className: cn(
                            "flex h-full items-center gap-2 rounded-lg border px-3",
                            "bg-[var(--surface)] transition-shadow",
                            isSelected ? "border-[var(--accent-bright)] shadow-[0_0_0_1px_var(--accent-bright)]" : "border-[var(--surface-border)] hover:border-[var(--ink-mute)]"
                          ),
                          children: [
                            /* @__PURE__ */ jsx25(
                              "span",
                              {
                                className: "h-2 w-2 shrink-0 rounded-full",
                                style: { backgroundColor: t.color }
                              }
                            ),
                            /* @__PURE__ */ jsxs10("div", { className: "min-w-0 flex-1", children: [
                              /* @__PURE__ */ jsx25("div", { className: "truncate text-[11px] font-semibold text-[var(--ink-bright)]", children: ln.node.label }),
                              ln.node.sublabel && /* @__PURE__ */ jsx25("div", { className: "truncate text-[9px] text-[var(--ink-mute)]", children: ln.node.sublabel })
                            ] }),
                            ln.node.badge && /* @__PURE__ */ jsx25(
                              "span",
                              {
                                className: "shrink-0 rounded px-1 py-[1px] text-[8px] font-bold",
                                style: {
                                  backgroundColor: toneVars(ln.node.badgeTone ?? ln.node.tone ?? "danger").color,
                                  color: "#fff"
                                },
                                children: ln.node.badge
                              }
                            )
                          ]
                        }
                      )
                    },
                    ln.node.id
                  );
                })
              ]
            }
          )
        ]
      }
    );
  }
);
DAGChart.displayName = "DAGChart";

// packages/ui/src/components/glass/ChartPanel.tsx
import * as React13 from "react";
import { jsx as jsx26, jsxs as jsxs11 } from "react/jsx-runtime";
function LegendChips({
  series,
  threshold,
  thresholdLabel,
  thresholdTone,
  onSelect,
  active,
  framed
}) {
  const facet = !!onSelect;
  const anyActive = facet && !!active && active.size > 0;
  return /* @__PURE__ */ jsxs11(
    "div",
    {
      className: cn(
        "flex flex-wrap items-center gap-3 text-[10px] text-[var(--ink-soft)]",
        framed && "border-t border-[var(--surface-border)] px-3 py-2"
      ),
      children: [
        series.map((s) => {
          const swatch = /* @__PURE__ */ jsx26(
            "span",
            {
              className: "inline-block h-[3px] w-[10px] rounded-[1px]",
              style: { backgroundColor: toneVars(s.tone ?? "accent").color }
            }
          );
          if (facet) {
            const isActive = active?.has(s.label) ?? false;
            return /* @__PURE__ */ jsxs11(
              "button",
              {
                type: "button",
                "aria-pressed": isActive,
                onClick: () => onSelect(s.label),
                title: `Filter to ${s.label}`,
                className: cn(
                  "flex items-center gap-1.5 transition-opacity",
                  anyActive && !isActive && "opacity-55"
                ),
                children: [
                  swatch,
                  /* @__PURE__ */ jsx26("span", { className: "capitalize", children: s.label }),
                  isActive && /* @__PURE__ */ jsx26("span", { className: "text-[var(--accent-bright)]", children: "\xD7" })
                ]
              },
              s.label
            );
          }
          return /* @__PURE__ */ jsxs11("div", { className: "flex items-center gap-1.5", children: [
            swatch,
            s.label
          ] }, s.label);
        }),
        threshold != null && /* @__PURE__ */ jsxs11("div", { className: "flex items-center gap-1.5", children: [
          /* @__PURE__ */ jsx26(
            "span",
            {
              className: "inline-block h-[2px] w-[10px] border-t border-dashed",
              style: { borderColor: toneVars(thresholdTone).color }
            }
          ),
          thresholdLabel ?? "Threshold"
        ] })
      ]
    }
  );
}
var ChartPanel = React13.forwardRef(
  ({
    title,
    meta,
    series,
    xLabels,
    kind = "line",
    xAxis,
    threshold,
    thresholdLabel,
    thresholdTone = "warn",
    legend = true,
    onLegendSelect,
    legendActive,
    caption,
    frame = true,
    height = 150,
    formatValue,
    className
  }, ref) => {
    const chart = kind === "stacked" ? /* @__PURE__ */ jsx26(
      StackedBars,
      {
        data: toStackData(series, xLabels),
        series: series.map((s) => ({
          key: s.label,
          tone: s.tone ?? "neutral"
        })),
        height,
        xAxis: xAxis ?? !!(xLabels && xLabels.length),
        formatValue,
        className: "w-full"
      }
    ) : /* @__PURE__ */ jsx26(
      MultiLineChart,
      {
        series,
        kind,
        xLabels,
        xAxis,
        threshold,
        thresholdTone,
        height,
        grid: true,
        formatValue,
        className: "w-full"
      }
    );
    const legendNode = legend ? /* @__PURE__ */ jsx26(
      LegendChips,
      {
        series,
        threshold,
        thresholdLabel,
        thresholdTone,
        onSelect: onLegendSelect,
        active: legendActive,
        framed: frame
      }
    ) : null;
    const captionNode = caption ? /* @__PURE__ */ jsxs11(
      "div",
      {
        className: cn(
          "flex justify-between font-[family-name:var(--font-mono)] text-[10.5px] text-[var(--ink-mute)]",
          frame && "px-3 pb-2"
        ),
        children: [
          /* @__PURE__ */ jsx26("span", { children: caption[0] }),
          /* @__PURE__ */ jsx26("span", { children: caption[1] })
        ]
      }
    ) : null;
    if (!frame) {
      return /* @__PURE__ */ jsxs11("div", { ref, className: cn("flex flex-col gap-2", className), children: [
        chart,
        captionNode,
        legendNode
      ] });
    }
    return /* @__PURE__ */ jsxs11(
      "div",
      {
        ref,
        className: cn(
          "overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)]",
          className
        ),
        children: [
          title && /* @__PURE__ */ jsxs11("div", { className: "flex items-center justify-between border-b border-[var(--surface-border)] px-3 py-2", children: [
            /* @__PURE__ */ jsx26("span", { className: "text-[12px] font-semibold text-[var(--ink-bright)]", children: title }),
            meta && /* @__PURE__ */ jsx26("span", { className: "text-[10px] text-[var(--ink-mute)]", children: meta })
          ] }),
          /* @__PURE__ */ jsx26("div", { className: "px-3 py-2", children: chart }),
          captionNode,
          legendNode
        ]
      }
    );
  }
);
ChartPanel.displayName = "ChartPanel";
function toStackData(series, xLabels) {
  const buckets = xLabels ?? series[0]?.points.map((_, i) => String(i)) ?? [];
  return buckets.map((label, i) => ({
    label,
    values: series.map((s) => s.points[i] ?? 0)
  }));
}

// packages/ui/src/components/glass/Mono.tsx
import * as React14 from "react";
import { jsx as jsx27 } from "react/jsx-runtime";
var Mono = React14.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx27(
    "span",
    {
      ref,
      className: cn(
        "font-[family-name:var(--font-mono)] tracking-[0.1px] [font-feature-settings:'tnum'_1,'lnum'_1]",
        className
      ),
      ...props
    }
  )
);
Mono.displayName = "Mono";

// packages/ui/src/components/glass/Eyebrow.tsx
import * as React15 from "react";
import { jsx as jsx28 } from "react/jsx-runtime";
var Eyebrow = React15.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx28(
    m.div,
    {
      ref,
      variants: fadeIn,
      initial: "hidden",
      animate: "visible",
      className: cn(
        "font-[family-name:var(--font-mono)] text-[10.5px] font-medium uppercase leading-[1.4] tracking-[1px] text-[var(--ink-mute)]",
        className
      ),
      ...props
    }
  )
);
Eyebrow.displayName = "Eyebrow";

// packages/ui/src/components/glass/OpenSearchLogo.tsx
import { jsx as jsx29, jsxs as jsxs12 } from "react/jsx-runtime";
var OpenSearchLogo = ({ size = 20, className }) => /* @__PURE__ */ jsxs12(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    fill: "none",
    className,
    style: {
      "--os-logo-primary": "var(--os-primary, #005EB8)",
      "--os-logo-secondary": "var(--os-secondary, #003B5C)"
    },
    children: [
      /* @__PURE__ */ jsx29(
        "path",
        {
          d: "M61.7374 23.5C60.4878 23.5 59.4748 24.513 59.4748 25.7626C59.4748 44.3813 44.3813 59.4748 25.7626 59.4748C24.513 59.4748 23.5 60.4878 23.5 61.7374C23.5 62.987 24.513 64 25.7626 64C46.8805 64 64 46.8805 64 25.7626C64 24.513 62.987 23.5 61.7374 23.5Z",
          fill: "var(--os-logo-primary)"
        }
      ),
      /* @__PURE__ */ jsx29(
        "path",
        {
          d: "M48.0814 38C50.2572 34.4505 52.3615 29.7178 51.9475 23.0921C51.0899 9.36725 38.6589 -1.04463 26.9206 0.0837327C22.3253 0.525465 17.6068 4.2712 18.026 10.9805C18.2082 13.8961 19.6352 15.6169 21.9544 16.9399C24.1618 18.1992 26.9978 18.9969 30.2128 19.9011C34.0962 20.9934 38.6009 22.2203 42.063 24.7717C46.2125 27.8295 49.0491 31.3743 48.0814 38Z",
          fill: "var(--os-logo-secondary)"
        }
      ),
      /* @__PURE__ */ jsx29(
        "path",
        {
          d: "M3.91861 14C1.74276 17.5495 -0.361506 22.2822 0.0524931 28.9079C0.910072 42.6327 13.3411 53.0446 25.0794 51.9163C29.6747 51.4745 34.3932 47.7288 33.974 41.0195C33.7918 38.1039 32.3647 36.3831 30.0456 35.0601C27.8382 33.8008 25.0022 33.0031 21.7872 32.0989C17.9038 31.0066 13.3991 29.7797 9.93694 27.2283C5.78746 24.1704 2.95092 20.6257 3.91861 14Z",
          fill: "var(--os-logo-primary)"
        }
      )
    ]
  }
);
OpenSearchLogo.displayName = "OpenSearchLogo";

// packages/ui/src/components/glass/PrometheusLogo.tsx
import { jsx as jsx30, jsxs as jsxs13 } from "react/jsx-runtime";
var PrometheusLogo = ({
  size = 20,
  className
}) => /* @__PURE__ */ jsxs13(
  "svg",
  {
    width: size,
    height: size,
    viewBox: "0 0 64 64",
    fill: "none",
    className,
    children: [
      /* @__PURE__ */ jsx30(
        "path",
        {
          d: "M32 2C15.43 2 2 15.43 2 32s13.43 30 30 30 30-13.43 30-30S48.57 2 32 2Z",
          fill: "#E6522C"
        }
      ),
      /* @__PURE__ */ jsx30("rect", { x: "22", y: "45", width: "20", height: "6", rx: "3", fill: "#fff" }),
      /* @__PURE__ */ jsx30(
        "path",
        {
          d: "M19 38h26c-1.2 2.8-3.6 4.6-3.6 4.6H22.6S20.2 40.8 19 38Z",
          fill: "#fff"
        }
      ),
      /* @__PURE__ */ jsx30(
        "path",
        {
          d: "M32 12c4 4.2 6 8.4 6 12.6 0 3.3-1.3 6.2-3.6 8.4 4-0.6 7.6-3.8 7.6-9.1 2.4 3 3 6.4 1.8 9.8-0.6 1.7-1.7 3.2-3 4.3H22.2c-2.9-2.2-4.6-5.6-4.6-9.3 0-3.5 1.5-6.7 3.9-9-0.4 2.2 0 4.2 1.3 5.7-0.6-4.7 1.2-9.5 5.1-13.1 0.7 2.7 0.4 5.2-0.6 7.4 1.9-2.6 3.4-5.9 4.7-9.4Z",
          fill: "#fff"
        }
      )
    ]
  }
);
PrometheusLogo.displayName = "PrometheusLogo";

// packages/ui/src/components/glass/TruncationFooter.tsx
import { jsx as jsx31, jsxs as jsxs14 } from "react/jsx-runtime";
function TruncationFooter({ showing, limit, offset = 0, total, noun = "results" }) {
  if (showing < limit && offset === 0) return null;
  const start = offset + 1;
  const end = offset + showing;
  return /* @__PURE__ */ jsxs14("div", { className: "flex items-center gap-1.5 px-3 py-2 text-xs text-[var(--ink-mute)]", children: [
    /* @__PURE__ */ jsxs14("span", { className: "shrink-0", children: [
      "Showing ",
      noun
    ] }),
    /* @__PURE__ */ jsxs14(Mono, { children: [
      start,
      "\u2013",
      end
    ] }),
    total != null && total > end ? /* @__PURE__ */ jsxs14("span", { children: [
      "of ",
      total.toLocaleString(),
      "."
    ] }) : showing >= limit ? /* @__PURE__ */ jsx31("span", { children: "\u2014 ask for the next page or narrow your filters." }) : null
  ] });
}

// packages/ui/src/components/ui/separator.tsx
import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as React16 from "react";
import { jsx as jsx32 } from "react/jsx-runtime";
var Separator = React16.forwardRef(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => (
  // asChild lets the Radix Root delegate to an `m.div` so the divider fades in
  // while Radix keeps owning the role/orientation semantics.
  /* @__PURE__ */ jsx32(SeparatorPrimitive.Root, { asChild: true, decorative, orientation, children: /* @__PURE__ */ jsx32(
    m.div,
    {
      ref,
      className: cn(
        // ink-hairline divider — the system's internal section rule
        "shrink-0 bg-[var(--ink-hairline)]",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      ),
      variants: fadeIn,
      initial: "hidden",
      animate: "visible",
      ...props
    }
  ) })
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

// packages/ui/src/apps/_shared/PresentationFrame.tsx
import { useState as useState7, useRef as useRef4, useEffect as useEffect5 } from "react";

// packages/ui/src/apps/_shared/DashboardLink.tsx
import * as React17 from "react";
import { Fragment, jsx as jsx33, jsxs as jsxs15 } from "react/jsx-runtime";
function DashboardLink({ url, label, compact, noLogo }) {
  const { openLink, canOpenLink } = useOpenLink();
  const [pending, setPending] = React17.useState(false);
  const [failed, setFailed] = React17.useState(false);
  const href = url?.trim();
  if (!href) return null;
  const text = label ?? "View in OpenSearch Dashboards";
  const content = /* @__PURE__ */ jsxs15(Fragment, { children: [
    !noLogo && /* @__PURE__ */ jsx33(OpenSearchLogo, { size: 14, className: "shrink-0" }),
    /* @__PURE__ */ jsx33("span", { children: text }),
    /* @__PURE__ */ jsx33(
      m.span,
      {
        "aria-hidden": true,
        className: "text-[var(--ink-mute)]",
        variants: { rest: { x: 0 }, hover: { x: 2 } },
        transition: spring,
        children: "\u2197"
      }
    ),
    failed && /* @__PURE__ */ jsx33("span", { className: "text-[var(--danger)]", "aria-hidden": true, children: "\xB7 couldn't open" })
  ] });
  const className = "inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--ink-soft)] transition-colors hover:text-[var(--accent-bright)]";
  if (!canOpenLink) {
    const anchor = /* @__PURE__ */ jsx33(
      m.a,
      {
        href,
        target: "_blank",
        rel: "noopener noreferrer",
        className,
        initial: "rest",
        whileHover: "hover",
        children: content
      }
    );
    if (compact) return anchor;
    return /* @__PURE__ */ jsx33(m.div, { className: "pt-0.5", variants: fadeIn, initial: "hidden", animate: "visible", children: anchor });
  }
  async function onClick() {
    if (pending) return;
    setPending(true);
    setFailed(false);
    try {
      const ok = await openLink(href);
      if (!ok) setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setPending(false);
    }
  }
  const btn = /* @__PURE__ */ jsx33(
    m.button,
    {
      type: "button",
      disabled: pending,
      onClick,
      title: failed ? "Couldn't open \u2014 click to retry" : href,
      className: className + " cursor-pointer disabled:opacity-50",
      initial: "rest",
      whileHover: "hover",
      whileTap: { scale: 0.98 },
      transition: spring,
      children: content
    }
  );
  if (compact) return btn;
  return /* @__PURE__ */ jsx33(m.div, { className: "pt-0.5", variants: fadeIn, initial: "hidden", animate: "visible", children: btn });
}

// packages/ui/src/apps/_shared/AnalysisCard.tsx
import { Fragment as Fragment2, jsx as jsx34, jsxs as jsxs16 } from "react/jsx-runtime";
function AnalysisCard({ text, ai }) {
  return /* @__PURE__ */ jsxs16("div", { className: "rounded-[8px] border border-[var(--glass-border)] bg-[var(--surface)] px-3 py-2.5", children: [
    /* @__PURE__ */ jsx34("div", { className: "mb-1.5 flex items-center gap-1.5", children: ai ? /* @__PURE__ */ jsxs16(Fragment2, { children: [
      /* @__PURE__ */ jsx34(
        "span",
        {
          "aria-hidden": true,
          className: "shrink-0 text-[11px] leading-none text-[var(--ink-mute)]",
          children: "\u2726"
        }
      ),
      /* @__PURE__ */ jsx34("span", { className: "text-[10px] font-medium uppercase tracking-[0.04em] text-[var(--ink-mute)]", children: "AI Analysis" }),
      /* @__PURE__ */ jsxs16(
        "span",
        {
          tabIndex: 0,
          role: "img",
          "aria-label": "AI-generated interpretation based on OpenSearch evidence",
          className: "group/aitip relative ml-0.5 flex h-3.5 w-3.5 shrink-0 cursor-default items-center justify-center rounded-full border border-[var(--ink-hairline)] text-[9px] leading-none text-[var(--ink-mute)] focus:outline-none focus-visible:shadow-[var(--shadow-focus-ring)]",
          children: [
            "i",
            /* @__PURE__ */ jsx34(
              "span",
              {
                role: "tooltip",
                className: "pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-[6px] bg-[var(--ink-bright)] px-2 py-1 text-[10px] font-normal normal-case leading-[1.4] tracking-normal text-[var(--surface)] opacity-0 shadow-md transition-opacity duration-150 group-hover/aitip:opacity-100 group-focus-visible/aitip:opacity-100",
                children: "AI-generated interpretation based on OpenSearch evidence"
              }
            )
          ]
        }
      )
    ] }) : /* @__PURE__ */ jsxs16(Fragment2, { children: [
      /* @__PURE__ */ jsx34("span", { className: "inline-block shrink-0 opacity-50", children: /* @__PURE__ */ jsx34(OpenSearchLogo, { size: 12 }) }),
      /* @__PURE__ */ jsx34("span", { className: "text-[10px] font-medium uppercase tracking-[0.04em] text-[var(--ink-mute)]", children: "Analysis" })
    ] }) }),
    /* @__PURE__ */ jsx34("p", { className: "whitespace-pre-wrap text-[13px] leading-[1.6] text-[var(--ink)]", children: text })
  ] });
}

// packages/ui/src/apps/_shared/PresentationFrame.tsx
import { jsx as jsx35, jsxs as jsxs17 } from "react/jsx-runtime";
var MAX_VIEWPORT_HEIGHT = 480;
var EXPANDED_VIEWPORT_HEIGHT = 630;
function PresentationFrame({
  presentation,
  category,
  title,
  osdUrl,
  fallbackHeadline,
  children
}) {
  const { narrative, suggestions } = presentation;
  const [expanded, setExpanded] = useState7(false);
  const [overflows, setOverflows] = useState7(false);
  const viewportRef = useRef4(null);
  const lastInteraction = useRef4(0);
  const collapse = () => {
    setExpanded(false);
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  };
  useEffect5(() => {
    const el = viewportRef.current;
    if (!el) return;
    const mark = () => {
      lastInteraction.current = Date.now();
    };
    el.addEventListener("pointerdown", mark);
    el.addEventListener("keydown", mark);
    let prevOverflow = el.scrollHeight > MAX_VIEWPORT_HEIGHT;
    setOverflows(prevOverflow);
    const ro = new ResizeObserver(() => {
      const next = el.scrollHeight > MAX_VIEWPORT_HEIGHT;
      if (next === prevOverflow) return;
      prevOverflow = next;
      setOverflows(next);
      if (next && Date.now() - lastInteraction.current < 1e3) setExpanded(true);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      el.removeEventListener("pointerdown", mark);
      el.removeEventListener("keydown", mark);
    };
  }, [children]);
  const displayTitle = title || fallbackHeadline || "OpenSearch Observability";
  return /* @__PURE__ */ jsxs17("div", { className: "app flex flex-col gap-0 overflow-hidden bg-[var(--surface)] !p-0 !max-w-none", children: [
    /* @__PURE__ */ jsxs17("div", { className: "flex items-center gap-2.5 px-4 py-2.5 border-b border-[var(--surface-border)] bg-[var(--surface-muted)]", children: [
      /* @__PURE__ */ jsx35(OpenSearchLogo, { size: 18, className: "shrink-0" }),
      category && /* @__PURE__ */ jsx35(Badge, { animate: false, className: "shrink-0 text-[10px] uppercase tracking-[0.04em]", children: category }),
      /* @__PURE__ */ jsx35("span", { className: "min-w-0 flex-1 truncate text-[13px] font-semibold text-[var(--ink)]", children: displayTitle }),
      /* @__PURE__ */ jsx35(DashboardLink, { url: osdUrl, label: "View in OpenSearch", compact: true, noLogo: true })
    ] }),
    /* @__PURE__ */ jsxs17(
      "div",
      {
        ref: viewportRef,
        className: cn("relative px-4 py-3", expanded ? "overflow-auto" : "overflow-hidden"),
        style: { maxHeight: expanded ? EXPANDED_VIEWPORT_HEIGHT : MAX_VIEWPORT_HEIGHT },
        children: [
          /* @__PURE__ */ jsx35(
            m.div,
            {
              className: "flex flex-col gap-3",
              variants: fadeInUp,
              initial: "hidden",
              animate: "visible",
              children
            }
          ),
          expanded && overflows && /* @__PURE__ */ jsx35("div", { className: "mt-2 flex justify-center", children: /* @__PURE__ */ jsx35(Button, { variant: "ghost", className: "cursor-pointer gap-1 text-[11px] text-[var(--ink-mute)] hover:text-[var(--ink)]", onClick: collapse, children: "\u25B4 Show less" }) }),
          !expanded && overflows && // The fade strip already overlays the clipped content's bottom 16
          // (it's absolute) — so it was eating those clicks anyway. Promoting the
          // whole strip to the expand control turns that dead zone into the hit
          // target without stealing any click from the still-interactive rows
          // above it. The inner pill is the visible affordance + focus surface.
          /* @__PURE__ */ jsx35(
            "button",
            {
              type: "button",
              "aria-label": "Expand",
              onClick: () => setExpanded(true),
              className: "group absolute inset-x-0 bottom-0 flex h-16 cursor-pointer items-end justify-center bg-gradient-to-t from-[var(--surface)] to-transparent focus-visible:outline-none",
              children: /* @__PURE__ */ jsx35("span", { className: "mb-2 inline-flex items-center rounded-[8px] border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-2 text-[11px] text-[var(--ink-soft)] transition-colors group-hover:bg-[var(--surface-muted)] group-hover:text-[var(--ink)] group-focus-visible:shadow-[var(--shadow-focus-ring)]", children: "Click to expand" })
            }
          )
        ]
      }
    ),
    (narrative || suggestions && suggestions.length > 0) && /* @__PURE__ */ jsxs17("div", { className: "flex flex-col gap-2.5 border-t border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3", children: [
      narrative && /* @__PURE__ */ jsx35(AnalysisCard, { text: narrative, ai: true }),
      /* @__PURE__ */ jsx35(SuggestionPills, { suggestions, label: "Next" })
    ] })
  ] });
}

// packages/ui/src/apps/_shared/ViewGuard.tsx
import { Fragment as Fragment3, jsx as jsx36 } from "react/jsx-runtime";
function ViewGuard({
  props,
  children,
  loading = "Waiting for tool result\u2026"
}) {
  if (!props) {
    return /* @__PURE__ */ jsx36("div", { className: "app", children: /* @__PURE__ */ jsx36("span", { className: "app-muted", children: loading }) });
  }
  if (typeof props.error === "string" && props.error) {
    return /* @__PURE__ */ jsx36("div", { className: "app app--collapse", children: /* @__PURE__ */ jsx36("div", { className: "app-error", children: props.error }) });
  }
  return /* @__PURE__ */ jsx36(Fragment3, { children: children(props) });
}
function EmptyState({ children }) {
  return /* @__PURE__ */ jsx36("div", { className: "app app--collapse", children: /* @__PURE__ */ jsx36("span", { className: "app-muted", children }) });
}

// packages/ui/src/apps/_shared/ppl.ts
function pplRows(result) {
  const idx = /* @__PURE__ */ new Map();
  result.schema.forEach((f, i) => idx.set(f.name, i));
  return result.datarows.map((raw) => makeRow(raw, idx));
}
function makeRow(raw, idx) {
  return {
    raw,
    get(name) {
      const i = idx.get(name);
      return i === void 0 ? void 0 : raw[i];
    },
    getString(name) {
      const i = idx.get(name);
      return i === void 0 ? "" : asString(raw[i]);
    },
    getNumber(name) {
      const i = idx.get(name);
      return i === void 0 ? 0 : toNumber(raw[i]);
    }
  };
}
function pplQuote(v) {
  return v.replace(/"/g, '\\"');
}
var DEFAULT_DATASET = "otel-v1-apm-span-*";
async function resolveServiceField(describe2, dataset) {
  let fields;
  try {
    fields = await describe2(dataset, "service");
  } catch {
    return "serviceName";
  }
  const names = fields.map((f) => f.field);
  if (names.includes("serviceName")) return "serviceName";
  const nested = names.filter((n) => n.toLowerCase().endsWith("service.name")).sort((a, b) => a.length - b.length);
  return nested[0] ?? "serviceName";
}
function pplField(name) {
  return `\`${name}\``;
}
function datasetFromQuery(query) {
  const m2 = /source\s*=\s*([^\s|]+)/i.exec(query);
  return m2 ? m2[1].trim() : null;
}
function detectQueryLanguage(query) {
  const head = query.trim().slice(0, 32).toLowerCase();
  return head.startsWith("source") || head.startsWith("describe ") ? "ppl" : "promql";
}
function asString(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map(asString).join(", ");
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
function toNumber(v) {
  if (typeof v === "number" && isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return isFinite(n) ? n : 0;
  }
  return 0;
}
function formatDurationNanos(nanos) {
  if (!isFinite(nanos) || nanos <= 0) return "\u2014";
  if (nanos < 1e3) return `${Math.round(nanos)}ns`;
  if (nanos < 1e6) return `${(nanos / 1e3).toFixed(2)}\xB5s`;
  if (nanos < 1e9) return `${(nanos / 1e6).toFixed(2)}ms`;
  return `${(nanos / 1e9).toFixed(2)}s`;
}
function isDurationNanosColumn(name) {
  const n = (name || "").toLowerCase();
  if (/(count|cnt|occurrence|total|errors?|sum|qty|^num|requests?|hits?)/.test(n)) {
    return false;
  }
  return /(duration|latency|elapsed|nanos?$|_ns$|^p\d{2,3}$)/.test(n);
}

// packages/ui/src/apps/agent-trace/shared/AgentCategoryBadge.tsx
import { jsx as jsx37 } from "react/jsx-runtime";
var TONE_BG = {
  accent: "bg-[var(--accent-soft)] text-[var(--accent-bright)]",
  info: "bg-[var(--info-soft)] text-[var(--info)]",
  success: "bg-[var(--success-soft)] text-[var(--success)]",
  warn: "bg-[var(--warn-soft)] text-[var(--warn)]",
  danger: "bg-[var(--danger-soft)] text-[var(--danger)]",
  neutral: "bg-[var(--surface-muted)] text-[var(--ink-soft)]"
};
function AgentCategoryBadge({ operationName, className }) {
  const cat = categoryOf(operationName);
  return /* @__PURE__ */ jsx37(
    "span",
    {
      className: cn(
        "inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide",
        TONE_BG[cat.tone],
        className
      ),
      children: cat.label
    }
  );
}

// packages/ui/src/apps/agent-trace/shared/dag.ts
function spansToDag(spans) {
  const byId = new Set(spans.map((s) => s.spanId));
  const nodes = spans.map((s) => {
    const genAi = extractGenAiFields(s.attributes);
    const error = isSpanError(s.statusCode);
    const opSuffix = genAi.operationName ? ` \xB7 ${genAi.operationName}` : "";
    return {
      id: s.spanId,
      label: s.name,
      sublabel: `${formatDurationNanos(s.durationInNanos)}${opSuffix}`,
      tone: error ? "danger" : categoryOf(genAi.operationName).tone
    };
  });
  const edges = [];
  for (const s of spans) {
    if (!s.parentSpanId || !byId.has(s.parentSpanId)) continue;
    const error = isSpanError(s.statusCode);
    edges.push({
      from: s.parentSpanId,
      to: s.spanId,
      tone: error ? "danger" : "neutral",
      dashed: error
    });
  }
  return { nodes, edges };
}

// packages/ui/src/apps/agent-trace/details/view.tsx
import { Fragment as Fragment4, jsx as jsx38, jsxs as jsxs18 } from "react/jsx-runtime";
function DetailsView({ props }) {
  return /* @__PURE__ */ jsx38(ViewGuard, { props, loading: "Loading agent trace\u2026", children: (p) => /* @__PURE__ */ jsx38(DetailsViewInner, { props: p }, p.traceId) });
}
function DetailsViewInner({ props }) {
  if (props.spans.length === 0) return /* @__PURE__ */ jsxs18(EmptyState, { children: [
    "No spans found for trace ",
    props.traceId
  ] });
  const [selected, setSelected] = useState8(props.spans[0]?.spanId ?? null);
  const byId = new Map(props.spans.map((s) => [s.spanId, s]));
  const selectedSpan = selected ? byId.get(selected) ?? null : null;
  const rootSpan = props.spans.find((s) => !s.parentSpanId) ?? props.spans[0];
  const rootGenAi = extractGenAiFields(rootSpan.attributes);
  const dag = useMemo5(() => spansToDag(props.spans), [props.spans]);
  return /* @__PURE__ */ jsxs18(PresentationFrame, { presentation: props, fallbackHeadline: `Agent trace \xB7 ${props.spanCount} spans`, children: [
    /* @__PURE__ */ jsxs18("div", { className: "flex flex-wrap items-center gap-2 text-[12px]", children: [
      /* @__PURE__ */ jsx38(AgentCategoryBadge, { operationName: rootGenAi.operationName }),
      /* @__PURE__ */ jsx38("span", { className: "font-semibold text-[var(--ink-bright)]", children: rootSpan.name }),
      /* @__PURE__ */ jsx38(Badge, { variant: isSpanError(rootSpan.statusCode) ? "destructive" : "outline", className: "text-[9px]", children: isSpanError(rootSpan.statusCode) ? "Error" : "Success" }),
      /* @__PURE__ */ jsx38(Separator, { orientation: "vertical", className: "h-4" }),
      /* @__PURE__ */ jsx38(Mono, { className: "text-[var(--ink-soft)]", children: "DURATION" }),
      /* @__PURE__ */ jsx38(Mono, { className: "font-semibold", children: formatDurationNanos(props.rangeEndNanos - props.rangeStartNanos) }),
      /* @__PURE__ */ jsx38(Separator, { orientation: "vertical", className: "h-4" }),
      /* @__PURE__ */ jsx38(Mono, { className: "text-[var(--ink-soft)]", children: "SPANS" }),
      /* @__PURE__ */ jsx38(Mono, { className: "font-semibold", children: props.spanCount }),
      /* @__PURE__ */ jsx38(Separator, { orientation: "vertical", className: "h-4" }),
      /* @__PURE__ */ jsx38(Mono, { className: "text-[var(--ink-soft)]", children: "TOKENS" }),
      /* @__PURE__ */ jsx38(Mono, { className: "font-semibold", children: props.totalTokens.toLocaleString() })
    ] }),
    /* @__PURE__ */ jsxs18(Tabs, { defaultValue: "tree", children: [
      /* @__PURE__ */ jsxs18(TabsList, { children: [
        /* @__PURE__ */ jsx38(TabsTrigger, { value: "tree", children: "Trace Tree" }),
        /* @__PURE__ */ jsx38(TabsTrigger, { value: "map", children: "Trace Map" }),
        /* @__PURE__ */ jsx38(TabsTrigger, { value: "timeline", children: "Timeline" })
      ] }),
      /* @__PURE__ */ jsx38(TabsContent, { value: "tree", className: "mt-3", children: /* @__PURE__ */ jsx38(AgentTree, { spans: props.spans, selected, onSelect: setSelected }) }),
      /* @__PURE__ */ jsx38(TabsContent, { value: "map", className: "mt-3", children: /* @__PURE__ */ jsxs18("div", { className: "grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]", children: [
        /* @__PURE__ */ jsx38(
          DAGChart,
          {
            nodes: dag.nodes,
            edges: dag.edges,
            direction: "TB",
            height: 550,
            selected,
            onSelect: setSelected
          }
        ),
        selectedSpan && /* @__PURE__ */ jsx38(Card, { animate: false, className: "max-h-[550px] overflow-auto", children: /* @__PURE__ */ jsx38(SpanDetailPanel, { span: selectedSpan }) })
      ] }) }),
      /* @__PURE__ */ jsx38(TabsContent, { value: "timeline", className: "mt-3", children: /* @__PURE__ */ jsxs18("div", { className: "grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]", children: [
        /* @__PURE__ */ jsx38(AgentGantt, { spans: props.spans, rangeStartNanos: props.rangeStartNanos, rangeEndNanos: props.rangeEndNanos, onSelect: (id) => setSelected(id), selected }),
        selectedSpan && /* @__PURE__ */ jsx38(Card, { animate: false, className: "max-h-[550px] overflow-auto", children: /* @__PURE__ */ jsx38(SpanDetailPanel, { span: selectedSpan }) })
      ] }) })
    ] })
  ] });
}
function AgentTree({ spans, selected, onSelect }) {
  const [expanded, setExpanded] = useState8(() => new Set(spans.map((s) => s.spanId)));
  const byId = new Map(spans.map((s) => [s.spanId, s]));
  const childrenOf = /* @__PURE__ */ new Map();
  const roots = [];
  for (const s of spans) {
    if (!s.parentSpanId || !byId.has(s.parentSpanId)) {
      roots.push(s);
    } else {
      const list = childrenOf.get(s.parentSpanId) ?? [];
      list.push(s);
      childrenOf.set(s.parentSpanId, list);
    }
  }
  function renderSpan(span, level) {
    const children = childrenOf.get(span.spanId) ?? [];
    const hasChildren = children.length > 0;
    const isExpanded = expanded.has(span.spanId);
    const isSelected = selected === span.spanId;
    const genAi = extractGenAiFields(span.attributes);
    const error = isSpanError(span.statusCode);
    const tokens = (genAi.inputTokens ?? 0) + (genAi.outputTokens ?? 0);
    return /* @__PURE__ */ jsxs18("div", { children: [
      /* @__PURE__ */ jsxs18(
        "div",
        {
          className: `flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px] cursor-pointer transition-colors ${isSelected ? "bg-[var(--accent-soft)] border-l-2 border-[var(--accent-bright)]" : "hover:bg-[var(--surface-muted)] border-l-2 border-transparent"}`,
          style: { paddingLeft: `${8 + level * 16}px` },
          onClick: () => onSelect(span.spanId),
          children: [
            hasChildren ? /* @__PURE__ */ jsx38(
              Button,
              {
                variant: "ghost",
                size: "icon",
                className: "w-4 h-4 shrink-0 text-[var(--ink-soft)] hover:text-[var(--ink)]",
                onClick: (e) => {
                  e.stopPropagation();
                  setExpanded((prev) => {
                    const next = new Set(prev);
                    if (next.has(span.spanId)) next.delete(span.spanId);
                    else next.add(span.spanId);
                    return next;
                  });
                },
                children: isExpanded ? "\u25BE" : "\u25B8"
              }
            ) : /* @__PURE__ */ jsx38("span", { className: "w-4 shrink-0" }),
            /* @__PURE__ */ jsx38(AgentCategoryBadge, { operationName: genAi.operationName }),
            /* @__PURE__ */ jsx38("span", { className: "font-medium text-[var(--ink-bright)] truncate", children: span.name }),
            genAi.toolName && /* @__PURE__ */ jsxs18("span", { className: "text-[var(--ink-soft)] truncate", children: [
              "(",
              genAi.toolName,
              ")"
            ] }),
            error && /* @__PURE__ */ jsx38(Badge, { variant: "destructive", className: "text-[8px] px-1 py-0 shrink-0", children: "error" }),
            tokens > 0 && /* @__PURE__ */ jsxs18("span", { className: "ml-auto shrink-0 flex items-center gap-0.5 text-[var(--ink-soft)]", children: [
              /* @__PURE__ */ jsx38("span", { className: "text-[9px]", children: "\u25CE" }),
              /* @__PURE__ */ jsx38("span", { className: "text-[10px] font-medium", children: tokens.toLocaleString() })
            ] }),
            /* @__PURE__ */ jsx38("span", { className: "shrink-0 text-[10px] text-[var(--ink-soft)] tabular-nums ml-2 min-w-[50px] text-right", children: formatDurationNanos(span.durationInNanos) })
          ]
        }
      ),
      hasChildren && isExpanded && children.map((c) => renderSpan(c, level + 1))
    ] }, span.spanId);
  }
  const selSpan = selected ? byId.get(selected) : null;
  return /* @__PURE__ */ jsxs18("div", { className: "grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]", children: [
    /* @__PURE__ */ jsx38(Card, { animate: false, className: "max-h-[550px] overflow-auto", children: roots.map((r) => renderSpan(r, 0)) }),
    selSpan && /* @__PURE__ */ jsx38(Card, { animate: false, className: "max-h-[550px] overflow-auto", children: /* @__PURE__ */ jsx38(SpanDetailPanel, { span: selSpan }) })
  ] });
}
function SpanDetailPanel({ span }) {
  const genAi = extractGenAiFields(span.attributes);
  const error = isSpanError(span.statusCode);
  const input = genAi.inputMessages;
  const output = genAi.outputMessages;
  return /* @__PURE__ */ jsxs18("div", { className: "flex flex-col gap-3 p-3 text-[11px]", children: [
    /* @__PURE__ */ jsxs18("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx38(AgentCategoryBadge, { operationName: genAi.operationName }),
      /* @__PURE__ */ jsx38("span", { className: "font-semibold text-[13px] text-[var(--ink-bright)]", children: span.name }),
      /* @__PURE__ */ jsx38(Badge, { variant: error ? "destructive" : "outline", className: "text-[9px] ml-auto", children: error ? "Error" : "Success" })
    ] }),
    /* @__PURE__ */ jsxs18("div", { className: "rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2.5", children: [
      /* @__PURE__ */ jsx38(Eyebrow, { className: "mb-1.5", children: "Metadata" }),
      /* @__PURE__ */ jsxs18("div", { className: "grid grid-cols-2 gap-x-3 gap-y-1", children: [
        genAi.operationName && /* @__PURE__ */ jsxs18(Fragment4, { children: [
          /* @__PURE__ */ jsx38("span", { className: "text-[var(--ink-soft)]", children: "Operation" }),
          /* @__PURE__ */ jsx38(Mono, { className: "font-semibold", children: genAi.operationName })
        ] }),
        /* @__PURE__ */ jsx38("span", { className: "text-[var(--ink-soft)]", children: "Duration" }),
        /* @__PURE__ */ jsx38(Mono, { className: "font-semibold", children: formatDurationNanos(span.durationInNanos) }),
        genAi.model && /* @__PURE__ */ jsxs18(Fragment4, { children: [
          /* @__PURE__ */ jsx38("span", { className: "text-[var(--ink-soft)]", children: "Model" }),
          /* @__PURE__ */ jsx38(Mono, { children: genAi.model })
        ] }),
        genAi.provider && /* @__PURE__ */ jsxs18(Fragment4, { children: [
          /* @__PURE__ */ jsx38("span", { className: "text-[var(--ink-soft)]", children: "Provider" }),
          /* @__PURE__ */ jsx38(Mono, { children: genAi.provider })
        ] }),
        genAi.toolName && /* @__PURE__ */ jsxs18(Fragment4, { children: [
          /* @__PURE__ */ jsx38("span", { className: "text-[var(--ink-soft)]", children: "Tool" }),
          /* @__PURE__ */ jsx38(Mono, { children: genAi.toolName })
        ] }),
        genAi.agentName && /* @__PURE__ */ jsxs18(Fragment4, { children: [
          /* @__PURE__ */ jsx38("span", { className: "text-[var(--ink-soft)]", children: "Agent" }),
          /* @__PURE__ */ jsx38(Mono, { children: genAi.agentName })
        ] }),
        (genAi.inputTokens ?? 0) > 0 && /* @__PURE__ */ jsxs18(Fragment4, { children: [
          /* @__PURE__ */ jsx38("span", { className: "text-[var(--ink-soft)]", children: "Tokens" }),
          /* @__PURE__ */ jsxs18(Mono, { children: [
            genAi.inputTokens,
            "\u2193 ",
            genAi.outputTokens,
            "\u2191 (",
            (genAi.inputTokens ?? 0) + (genAi.outputTokens ?? 0),
            " total)"
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx38(Separator, { className: "my-2" }),
      /* @__PURE__ */ jsxs18("div", { className: "grid grid-cols-2 gap-x-3 gap-y-1 text-[10px]", children: [
        /* @__PURE__ */ jsx38("span", { className: "text-[var(--ink-soft)]", children: "Span ID" }),
        /* @__PURE__ */ jsx38(Mono, { className: "truncate", children: span.spanId }),
        span.parentSpanId && /* @__PURE__ */ jsxs18(Fragment4, { children: [
          /* @__PURE__ */ jsx38("span", { className: "text-[var(--ink-soft)]", children: "Parent span" }),
          /* @__PURE__ */ jsx38(Mono, { className: "truncate", children: span.parentSpanId })
        ] }),
        /* @__PURE__ */ jsx38("span", { className: "text-[var(--ink-soft)]", children: "Start time" }),
        /* @__PURE__ */ jsx38(Mono, { children: span.startTime }),
        /* @__PURE__ */ jsx38("span", { className: "text-[var(--ink-soft)]", children: "End time" }),
        /* @__PURE__ */ jsx38(Mono, { children: span.endTime })
      ] })
    ] }),
    (input != null || output != null) && /* @__PURE__ */ jsxs18("div", { className: "rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)] p-2.5", children: [
      /* @__PURE__ */ jsx38(Eyebrow, { className: "mb-1.5", children: "Input / Output" }),
      input != null && /* @__PURE__ */ jsxs18("div", { className: "mb-2", children: [
        /* @__PURE__ */ jsx38("span", { className: "text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]", children: "Input" }),
        /* @__PURE__ */ jsx38(CodeBlock, { code: input, className: "mt-1 max-h-[150px] text-[10px]" })
      ] }),
      output != null && /* @__PURE__ */ jsxs18("div", { children: [
        /* @__PURE__ */ jsx38("span", { className: "text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]", children: "Output" }),
        /* @__PURE__ */ jsx38(CodeBlock, { code: output, className: "mt-1 max-h-[150px] text-[10px]" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs18("details", { className: "rounded-md border border-[var(--surface-border)] bg-[var(--surface-muted)]", children: [
      /* @__PURE__ */ jsx38("summary", { className: "cursor-pointer px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]", children: "Raw Span" }),
      /* @__PURE__ */ jsx38("div", { className: "px-2.5 pb-2.5", children: /* @__PURE__ */ jsx38(CodeBlock, { code: { ...span, attributes: span.attributes, resource: span.resource }, className: "max-h-[250px] text-[9px]" }) })
    ] })
  ] });
}
function AgentGantt({ spans, rangeStartNanos, rangeEndNanos, onSelect, selected }) {
  const totalRange = rangeEndNanos - rangeStartNanos || 1;
  const sorted = [...spans].sort((a, b) => nanosOf(a.startTime) - nanosOf(b.startTime));
  return /* @__PURE__ */ jsx38(Card, { animate: false, className: "max-h-[500px] overflow-auto", children: sorted.map((span) => {
    const genAi = extractGenAiFields(span.attributes);
    const error = isSpanError(span.statusCode);
    const startNanos = nanosOf(span.startTime);
    const left = Math.max(0, (startNanos - rangeStartNanos) / totalRange * 100);
    const width = Math.max(0.8, span.durationInNanos / totalRange * 100);
    return /* @__PURE__ */ jsxs18("div", { className: `flex items-center gap-2 border-b px-2 py-1.5 last:border-0 cursor-pointer transition-colors ${error ? "border-[var(--danger)]/30 bg-[var(--danger-soft)]/30" : "border-[var(--ink-hairline)]"} ${selected === span.spanId ? "bg-[var(--accent-soft)]" : "hover:bg-[var(--surface-muted)]"}`, onClick: () => onSelect?.(span.spanId), children: [
      /* @__PURE__ */ jsxs18("div", { className: "w-[200px] shrink-0 flex items-center gap-1.5 overflow-hidden", children: [
        /* @__PURE__ */ jsx38(AgentCategoryBadge, { operationName: genAi.operationName }),
        /* @__PURE__ */ jsx38("span", { className: `truncate text-[10px] font-medium ${error ? "text-[var(--danger)]" : "text-[var(--ink-bright)]"}`, children: span.name }),
        error && /* @__PURE__ */ jsx38("span", { className: "shrink-0 text-[8px] font-semibold text-[var(--danger)]", children: "\u2717" })
      ] }),
      /* @__PURE__ */ jsx38("div", { className: "relative flex-1 h-4 bg-[var(--surface-muted)] rounded-sm", children: /* @__PURE__ */ jsx38(
        "div",
        {
          className: "absolute top-0.5 h-3 rounded-sm transition-all",
          style: {
            left: `${Math.min(left, 99)}%`,
            width: `${Math.min(width, 100 - left)}%`,
            backgroundColor: error ? "var(--danger)" : genAi.operationName ? "var(--accent-bright)" : "var(--ink-hairline)",
            opacity: error ? 1 : 0.8
          }
        }
      ) }),
      /* @__PURE__ */ jsx38("span", { className: `w-[55px] shrink-0 text-right text-[9px] tabular-nums ${error ? "text-[var(--danger)] font-semibold" : "text-[var(--ink-soft)]"}`, children: formatDurationNanos(span.durationInNanos) })
    ] }, span.spanId);
  }) });
}
function nanosOf(timestamp) {
  if (!timestamp) return 0;
  if (/^\d+$/.test(timestamp)) {
    const n = parseInt(timestamp, 10);
    return n > 1e15 ? n : n * 1e6;
  }
  let s = timestamp;
  if (/^\d{4}-\d{2}-\d{2} /.test(timestamp)) s = timestamp.replace(" ", "T") + "Z";
  const t = new Date(s).getTime();
  return isNaN(t) ? 0 : t * 1e6;
}

// src/apps/agent-trace/details/tool.ts
var DEFAULT_DATASET2 = "otel-v1-apm-span*";
var detailsRoute = defineRoute({
  id: "details",
  tool: {
    title: "Agent trace details",
    description: "PRESENTATION: render AI agent trace as tree/flow/timeline with GenAI fields (model, tokens, tool calls, I/O). Pass `dataSourceId`, `traceId`.",
    inputSchema
  },
  propsSchema,
  view: DetailsView,
  handler: async ({ dataSourceId: suppliedDataSourceId, traceId, dataset, narrative, suggestions }, ctx) => {
    const dataSourceId = await ctx.osUi.resolveDataSourceId(suppliedDataSourceId);
    const ds = dataset?.trim() || DEFAULT_DATASET2;
    const safeId = traceId.replace(/"/g, '\\"');
    const query = `source = ${ds} | where traceId = "${safeId}" | head 1000`;
    ctx.logger.log(`[agent-trace.details] PPL: ${query}`);
    try {
      const result = await ctx.osUi.runPpl(dataSourceId, query, ds);
      const { spans, rangeStartNanos, rangeEndNanos } = transformPplToSpans(result, traceId);
      let totalTokens = 0;
      for (const span of spans) {
        const genAi = extractGenAiFields(span.attributes);
        totalTokens += (genAi.inputTokens ?? 0) + (genAi.outputTokens ?? 0);
      }
      const agentSpans = spans.filter((s) => {
        const op = s.attributes?.["gen_ai.operation.name"];
        return op !== void 0;
      });
      const props = {
        traceId,
        dataset: ds,
        spans,
        rangeStartNanos,
        rangeEndNanos,
        totalTokens,
        spanCount: spans.length,
        narrative,
        suggestions: suggestions ?? [
          "Show me the LLM calls in this trace",
          "Which tool calls failed?",
          "What was the total token cost?"
        ]
      };
      const text = spans.length === 0 ? `No spans found for agent trace ${traceId}` : `Agent trace ${traceId.slice(0, 8)}\u2026: ${spans.length} spans (${agentSpans.length} GenAI), ${totalTokens} tokens, duration ${Math.round((rangeEndNanos - rangeStartNanos) / 1e6)}ms`;
      return { props, text };
    } catch (err) {
      const msg = pplErrorHint(err, ds, query);
      ctx.logger.error("[agent-trace.details] failed: " + msg);
      const props = {
        traceId,
        dataset: ds,
        spans: [],
        rangeStartNanos: 0,
        rangeEndNanos: 0,
        totalTokens: 0,
        spanCount: 0,
        error: msg
      };
      return { props, text: "Failed to load agent trace: " + msg, isError: true };
    }
  }
});

// packages/ui/src/apps/agent-trace/evidence/schema.ts
import { z as z5 } from "zod";
var codeLangEnum = z5.enum(["text", "json", "ppl", "promql", "sql"]);
var toneEnum = z5.enum(["accent", "danger", "warn", "success", "info", "neutral"]);
var evidenceKindEnum = z5.enum(["tool-args", "tool-result", "exception"]);
var inputSchema2 = {
  dataSourceId: dataSourceIdField(),
  traceId: z5.string().describe("Trace ID (from `agent-trace_finder`). The handler fetches its spans and extracts excerpts."),
  dataset: z5.string().optional().describe("Trace index pattern. Default `otel-v1-apm-span*`."),
  kinds: z5.array(evidenceKindEnum).optional().describe(
    "Which excerpt kinds to surface (1\u20134 blocks total after filtering). `tool-args` = tool-call input JSON; `tool-result` = tool-call output JSON; `exception` = error span `status.message`. Default: all three."
  ),
  spanFilter: z5.string().optional().describe("Restrict to spans whose name contains this substring (e.g. `payment_authorize`)."),
  ...presentationInputFields
};
var evidenceBlockRendered = z5.object({
  badge: z5.string().optional(),
  badgeTone: toneEnum.optional(),
  caption: z5.string().optional(),
  code: z5.string(),
  language: codeLangEnum.optional()
});
var propsSchema2 = z5.object({
  ...presentationPropsFields,
  traceId: z5.string(),
  evidence: z5.array(evidenceBlockRendered),
  error: z5.string().optional()
});

// packages/ui/src/apps/agent-trace/evidence/view.tsx
import { jsx as jsx39, jsxs as jsxs19 } from "react/jsx-runtime";
function EvidenceView({ props }) {
  return /* @__PURE__ */ jsx39(ViewGuard, { props, loading: "Pulling evidence\u2026", children: (p) => /* @__PURE__ */ jsx39(EvidenceViewInner, { props: p }) });
}
function EvidenceViewInner({ props }) {
  return /* @__PURE__ */ jsx39(
    PresentationFrame,
    {
      presentation: props,
      category: "Evidence",
      fallbackHeadline: `Evidence \xB7 ${props.evidence.length} excerpt(s)`,
      children: props.evidence.length === 0 ? /* @__PURE__ */ jsxs19(EmptyState, { children: [
        "No evidence excerpts for trace ",
        props.traceId
      ] }) : /* @__PURE__ */ jsx39("div", { className: "flex flex-col gap-2.5", children: props.evidence.map((b, i) => /* @__PURE__ */ jsx39(
        EvidenceBlock,
        {
          badge: b.badge,
          badgeTone: b.badgeTone,
          caption: b.caption,
          code: b.code,
          language: b.language
        },
        i
      )) })
    }
  );
}

// src/apps/agent-trace/evidence/tool.ts
var DEFAULT_DATASET3 = "otel-v1-apm-span*";
var DEFAULT_LIMIT = 500;
var MAX_BLOCKS = 4;
var CODE_MAX_CHARS = 1200;
function clip(s) {
  return s.length > CODE_MAX_CHARS ? s.slice(0, CODE_MAX_CHARS) + "\n\u2026" : s;
}
function stringifyAttr(v) {
  if (v == null) return "";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
function extractFromSpan(span, kinds) {
  const blocks = [];
  const gen = extractGenAiFields(span.attributes);
  const caption = gen.toolName || gen.agentName || span.name;
  if (kinds.has("tool-args") && gen.inputMessages !== void 0) {
    const code = stringifyAttr(gen.inputMessages);
    if (code) {
      blocks.push({ badge: "arguments", badgeTone: "neutral", caption, code: clip(code), language: "json" });
    }
  }
  if (kinds.has("tool-result") && gen.outputMessages !== void 0) {
    const code = stringifyAttr(gen.outputMessages);
    if (code) {
      blocks.push({ badge: "result", badgeTone: "neutral", caption, code: clip(code), language: "json" });
    }
  }
  if (kinds.has("exception") && isSpanError(span.statusCode)) {
    const msg = span.statusMessage || span.attributes?.["error.message"];
    if (typeof msg === "string" && msg.length > 0) {
      blocks.push({ badge: "exception", badgeTone: "danger", caption, code: clip(msg), language: "text" });
    }
  }
  return blocks;
}
async function buildEvidenceBlocks(ctx, dataSourceId, panel) {
  const dataset = panel.dataset?.trim() || DEFAULT_DATASET3;
  const safeId = pplQuote(panel.traceId);
  const query = `source = ${dataset} | where traceId = "${safeId}" | head ${DEFAULT_LIMIT}`;
  ctx.logger.log(`[agent-trace.evidence] PPL: ${query}`);
  const kinds = new Set(panel.kinds ?? ["tool-args", "tool-result", "exception"]);
  try {
    const result = await ctx.osUi.runPpl(dataSourceId, query, dataset);
    const { spans } = transformPplToSpans(result, panel.traceId);
    if (spans.length === 0) {
      return { evidence: [], error: `No spans found for traceId=${panel.traceId} in ${dataset}.` };
    }
    const filtered = panel.spanFilter ? spans.filter((s) => s.name?.toLowerCase().includes(panel.spanFilter.toLowerCase())) : spans;
    const ordered = [...filtered].sort((a, b) => {
      const ae = isSpanError(a.statusCode) ? 0 : 1;
      const be = isSpanError(b.statusCode) ? 0 : 1;
      return ae - be;
    });
    const out = [];
    for (const s of ordered) {
      if (out.length >= MAX_BLOCKS) break;
      for (const b of extractFromSpan(s, kinds)) {
        if (out.length >= MAX_BLOCKS) break;
        out.push(b);
      }
    }
    if (out.length === 0) {
      return { evidence: [], error: `No matching evidence in ${spans.length} span(s) for the requested kinds.` };
    }
    return { evidence: out };
  } catch (err) {
    const msg = pplErrorHint(err, dataset, query);
    ctx.logger.error(`[agent-trace.evidence] failed: ${msg}`);
    return { evidence: [], error: msg };
  }
}
var evidenceRoute = defineRoute({
  id: "evidence",
  tool: {
    title: "Agent trace evidence",
    description: "PRESENTATION: surface curated excerpts from one trace's spans \u2014 tool-call arguments, tool-call results, and exception messages \u2014 as labeled code blocks. PROVENANCE: every excerpt is read from telemetry; the agent supplies the `traceId` (+ optional `kinds`/`spanFilter`) and writes only `narrative` + `suggestions`. VALIDATE the trace exists via `agent-trace_finder`/`ppl_query` first. Use `agent-trace_details` for the full span tree/timeline; use this when you want just the raw I/O behind a finding.",
    inputSchema: inputSchema2
  },
  propsSchema: propsSchema2,
  view: EvidenceView,
  handler: async ({ dataSourceId: suppliedDataSourceId, traceId, dataset, kinds, spanFilter, narrative, suggestions }, ctx) => {
    const dataSourceId = await ctx.osUi.resolveDataSourceId(suppliedDataSourceId);
    const { evidence, error } = await buildEvidenceBlocks(ctx, dataSourceId, { traceId, dataset, kinds, spanFilter });
    const props = { narrative, suggestions, traceId, evidence, error };
    const text = error ? `Evidence for trace ${traceId} could not be loaded: ${error}` : `Evidence for trace ${traceId}: ${evidence.length} block(s).`;
    return {
      props,
      text: text + (narrative ? `
${narrative}` : "") + (error ? `

The widget is showing a 'failed to load' state \u2014 fix the input and re-present:
${error}` : ""),
      isError: Boolean(error)
    };
  }
});

// packages/ui/src/apps/_shared/pagination.ts
import { z as z6 } from "zod";
function paginationInputFields(opts) {
  const noun = opts.noun ?? "results";
  return {
    limit: z6.number().int().positive().max(opts.limitMax).optional().describe(`Max ${noun} to return (default ${opts.limitDefault}).`),
    offset: z6.number().int().min(0).optional().describe(
      `0-based offset to page through ${noun} (e.g. offset=${opts.limitDefault} for page 2).`
    )
  };
}
var paginationPropsFields = {
  resultLimit: z6.number().optional(),
  resultOffset: z6.number().optional()
};
function pplHeadClause(limit, offset) {
  return offset > 0 ? `head ${limit} from ${offset}` : `head ${limit}`;
}
function paginationProps(resultCount, limit, offset) {
  return {
    resultLimit: resultCount >= limit ? limit : void 0,
    resultOffset: offset || void 0
  };
}

// packages/ui/src/apps/agent-trace/finder/schema.ts
import { z as z8 } from "zod";

// packages/ui/src/apps/_shared/time-range.ts
import { z as z7 } from "zod";
var UNIT_RE = "[smhdwMy]";
var TimeRangeError = class extends Error {
};
function timeRangeFields(defaultLabel) {
  return {
    timeRange: z7.string().optional().describe(
      `Relative lookback \`<n><unit>\` (e.g. \`1h\`, \`7d\`). Defaults to ${defaultLabel}. \`all\` = no filter. Use \`from\`/\`to\` for bounded windows.`
    ),
    from: z7.string().optional().describe(
      "Window start: date-math (`now-1h`, `now-1d/d`, `now/w`) or absolute UTC (`2026-06-03T00:00:00Z`). Overrides `timeRange`."
    ),
    to: z7.string().optional().describe(
      "Window end (same syntax). Defaults to `now`."
    )
  };
}
function resolveTimeRange(input, opts = {}) {
  const now = opts.now ?? /* @__PURE__ */ new Date();
  let fromExpr;
  let toExpr;
  if (input.from != null || input.to != null) {
    fromExpr = (input.from ?? opts.defaultFrom ?? "now").trim();
    toExpr = (input.to ?? "now").trim();
  } else if (input.timeRange != null && input.timeRange.trim() !== "") {
    const tr = input.timeRange.trim();
    if (tr.toLowerCase() === "all") return { filtered: false, label: "all" };
    if (new RegExp(`^(\\d+)\\s*(${UNIT_RE})$`).test(tr)) {
      fromExpr = `now-${tr.replace(/\s+/g, "")}`;
      toExpr = "now";
    } else {
      fromExpr = tr;
      toExpr = "now";
    }
  } else if (opts.defaultFrom && opts.defaultFrom.toLowerCase() !== "all") {
    fromExpr = opts.defaultFrom;
    toExpr = opts.defaultTo ?? "now";
  } else {
    return { filtered: false, label: "all" };
  }
  const from = parseDateMath(fromExpr, now);
  const to = parseDateMath(toExpr, now);
  if (from.getTime() > to.getTime()) {
    throw new TimeRangeError(
      `Time window start (${fromExpr}) is after end (${toExpr}).`
    );
  }
  return { filtered: true, from, to, fromExpr, toExpr, label: describe(fromExpr, toExpr) };
}
function pplTimePredicate(field, r) {
  if (!r.filtered || !r.from || !r.to) return null;
  return `\`${field}\` >= "${pplLiteral(r.from)}" and \`${field}\` < "${pplLiteral(r.to)}"`;
}
function dateMathWindow(r) {
  if (!r.filtered || r.fromExpr == null || r.toExpr == null) return void 0;
  return { from: r.fromExpr, to: r.toExpr };
}
function windowMinutes(r) {
  if (!r.filtered || !r.from || !r.to) return 0;
  return (r.to.getTime() - r.from.getTime()) / 6e4;
}
function pplLiteral(d) {
  return d.toISOString().replace("T", " ").replace("Z", "");
}
function describe(fromExpr, toExpr) {
  const lookback = /^now-(\d+\s*[smhdwMy])$/.exec(fromExpr.replace(/\s+/g, ""));
  if (toExpr === "now" && lookback) return `last ${lookback[1]}`;
  return `${fromExpr} \u2192 ${toExpr}`;
}
function parseDateMath(expr, now) {
  const s = expr.trim();
  if (s === "") throw new TimeRangeError("Empty time expression.");
  let date;
  let rest;
  if (s.slice(0, 3).toLowerCase() === "now") {
    date = new Date(now.getTime());
    rest = s.slice(3);
  } else {
    const sep = s.indexOf("||");
    date = parseAbsolute(sep === -1 ? s : s.slice(0, sep));
    rest = sep === -1 ? "" : s.slice(sep + 2);
  }
  const opRe = new RegExp(`([+\\-])(\\d+)(${UNIT_RE})|/(${UNIT_RE})`, "g");
  let consumed = 0;
  let m2;
  while ((m2 = opRe.exec(rest)) !== null) {
    if (m2.index !== consumed) break;
    consumed = opRe.lastIndex;
    if (m2[4]) snapDown(date, m2[4]);
    else applyOffset(date, m2[1], Number(m2[2]), m2[3]);
  }
  if (consumed !== rest.length) {
    throw new TimeRangeError(
      `Invalid time expression "${expr}". Use date-math like \`now-1d/d\` or an absolute UTC instant like \`2026-06-03T00:00:00Z\`.`
    );
  }
  return date;
}
function parseAbsolute(raw) {
  let v = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) v += "T00:00:00Z";
  else {
    v = v.replace(" ", "T");
    if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(v)) v += "Z";
  }
  const t = Date.parse(v);
  if (Number.isNaN(t)) {
    throw new TimeRangeError(
      `Could not parse absolute timestamp "${raw}". Use ISO-8601 UTC, e.g. \`2026-06-03T00:00:00Z\`.`
    );
  }
  return new Date(t);
}
function applyOffset(d, sign, n, unit) {
  const k = sign === "-" ? -n : n;
  switch (unit) {
    case "s":
      d.setUTCSeconds(d.getUTCSeconds() + k);
      break;
    case "m":
      d.setUTCMinutes(d.getUTCMinutes() + k);
      break;
    case "h":
      d.setUTCHours(d.getUTCHours() + k);
      break;
    case "d":
      d.setUTCDate(d.getUTCDate() + k);
      break;
    case "w":
      d.setUTCDate(d.getUTCDate() + k * 7);
      break;
    case "M":
      d.setUTCMonth(d.getUTCMonth() + k);
      break;
    case "y":
      d.setUTCFullYear(d.getUTCFullYear() + k);
      break;
  }
}
function snapDown(d, unit) {
  switch (unit) {
    case "s":
      d.setUTCMilliseconds(0);
      break;
    case "m":
      d.setUTCSeconds(0, 0);
      break;
    case "h":
      d.setUTCMinutes(0, 0, 0);
      break;
    case "d":
      d.setUTCHours(0, 0, 0, 0);
      break;
    case "w": {
      d.setUTCHours(0, 0, 0, 0);
      const dow = (d.getUTCDay() + 6) % 7;
      d.setUTCDate(d.getUTCDate() - dow);
      break;
    }
    case "M":
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      break;
    case "y":
      d.setUTCMonth(0, 1);
      d.setUTCHours(0, 0, 0, 0);
      break;
  }
}

// packages/ui/src/apps/agent-trace/finder/schema.ts
var inputSchema3 = {
  dataSourceId: dataSourceIdField(),
  dataset: z8.string().optional().describe("Index pattern (e.g. `otel-v1-apm-span-*`). Defaults to `otel-v1-apm-span*`."),
  ...timeRangeFields("`1h`"),
  agentName: z8.string().optional().describe("Filter to a specific agent name (gen_ai.agent.name)."),
  status: z8.enum(["all", "error", "ok"]).optional().describe("Filter by status. Defaults to all."),
  ...paginationInputFields({ limitDefault: 30, limitMax: 500, noun: "traces" }),
  ...presentationInputFields
};
var traceRowSchema = z8.object({
  traceId: z8.string(),
  rootName: z8.string(),
  agentName: z8.string(),
  model: z8.string(),
  status: z8.string(),
  durationNanos: z8.number(),
  totalTokens: z8.number(),
  inputTokens: z8.number(),
  outputTokens: z8.number(),
  spanCount: z8.number(),
  startTime: z8.string(),
  inputPreview: z8.string().optional(),
  outputPreview: z8.string().optional()
});
var propsSchema3 = z8.object({
  ...presentationPropsFields,
  dataset: z8.string(),
  timeRange: z8.string(),
  traces: z8.array(traceRowSchema),
  ...paginationPropsFields,
  stats: z8.object({
    totalTraces: z8.number(),
    totalSpans: z8.number(),
    totalTokens: z8.number(),
    errors: z8.number(),
    latencyP50Nanos: z8.number(),
    latencyP99Nanos: z8.number()
  }).optional(),
  error: z8.string().optional()
});

// packages/ui/src/components/ui/table.tsx
import * as React18 from "react";
import { jsx as jsx40 } from "react/jsx-runtime";
var Table = React18.forwardRef(
  ({ className, ...props }, ref) => /* @__PURE__ */ jsx40("div", { className: "relative w-full overflow-auto", children: /* @__PURE__ */ jsx40("table", { ref, className: cn("w-full caption-bottom text-sm", className), ...props }) })
);
Table.displayName = "Table";
var TableHeader = React18.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx40("thead", { ref, className: cn("[&_tr]:border-b [&_tr]:border-[var(--surface-border)]", className), ...props }));
TableHeader.displayName = "TableHeader";
var TableBody = React18.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx40("tbody", { ref, className: cn("[&_tr:last-child]:border-0", className), ...props }));
TableBody.displayName = "TableBody";
var TableRow = React18.forwardRef(
  ({ className, animate: animate2 = false, ...props }, ref) => {
    const classes = cn(
      "border-b border-[var(--ink-hairline)] transition-colors hover:bg-[var(--surface-muted)] data-[state=selected]:bg-[var(--accent-soft)]",
      className
    );
    if (!animate2) {
      return /* @__PURE__ */ jsx40("tr", { ref, className: classes, ...props });
    }
    return /* @__PURE__ */ jsx40(
      m.tr,
      {
        ref,
        className: classes,
        variants: staggerItem,
        ...props
      }
    );
  }
);
TableRow.displayName = "TableRow";
var TableHead = React18.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx40(
  "th",
  {
    ref,
    className: cn(
      "h-10 px-2 text-left align-middle font-semibold text-[var(--ink-soft)] font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.4px] [&:has([role=checkbox])]:pr-0",
      className
    ),
    ...props
  }
));
TableHead.displayName = "TableHead";
var TableCell = React18.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx40(
  "td",
  {
    ref,
    className: cn("p-2 align-middle [&:has([role=checkbox])]:pr-0", className),
    ...props
  }
));
TableCell.displayName = "TableCell";

// packages/ui/src/apps/agent-trace/finder/view.tsx
import { Fragment as Fragment5, jsx as jsx41, jsxs as jsxs20 } from "react/jsx-runtime";
function formatTokens(n) {
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return String(n);
}
function FinderView({ props }) {
  return /* @__PURE__ */ jsx41(ViewGuard, { props, loading: "Searching agent traces\u2026", children: (p) => /* @__PURE__ */ jsx41(FinderViewInner, { props: p }) });
}
function FinderViewInner({ props }) {
  return /* @__PURE__ */ jsxs20(PresentationFrame, { presentation: props, fallbackHeadline: `${props.traces.length} agent traces`, children: [
    props.stats && /* @__PURE__ */ jsxs20("div", { className: "flex flex-wrap items-start gap-6 rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3", children: [
      /* @__PURE__ */ jsx41(StatBlock, { label: "Traces (page)", value: String(props.stats.totalTraces) }),
      /* @__PURE__ */ jsx41(StatBlock, { label: "Spans (page)", value: String(props.stats.totalSpans), sub: props.stats.errors > 0 ? `${props.stats.errors} errors` : void 0, subColor: "var(--danger)" }),
      /* @__PURE__ */ jsx41(StatBlock, { label: "Tokens (page)", value: formatTokens(props.stats.totalTokens) }),
      /* @__PURE__ */ jsx41(StatBlock, { label: "Latency P50", value: formatDurationNanos(props.stats.latencyP50Nanos) }),
      /* @__PURE__ */ jsx41(StatBlock, { label: "Latency P99", value: formatDurationNanos(props.stats.latencyP99Nanos) })
    ] }),
    props.traces.length === 0 ? /* @__PURE__ */ jsxs20("div", { className: "app-muted", children: [
      "No agent traces found in the last ",
      props.timeRange,
      "."
    ] }) : /* @__PURE__ */ jsxs20(Fragment5, { children: [
      /* @__PURE__ */ jsxs20(Table, { children: [
        /* @__PURE__ */ jsx41(TableHeader, { children: /* @__PURE__ */ jsxs20(TableRow, { children: [
          /* @__PURE__ */ jsx41(TableHead, { className: "px-3 py-2", children: "Time" }),
          /* @__PURE__ */ jsx41(TableHead, { className: "px-3 py-2", children: "Agent / Name" }),
          /* @__PURE__ */ jsx41(TableHead, { className: "px-3 py-2", children: "Model" }),
          /* @__PURE__ */ jsx41(TableHead, { className: "px-2 py-2 text-right", children: "Status" }),
          /* @__PURE__ */ jsx41(TableHead, { className: "px-2 py-2 text-right", children: "Latency" }),
          /* @__PURE__ */ jsx41(TableHead, { className: "px-2 py-2 text-right", children: "Tokens" }),
          /* @__PURE__ */ jsx41(TableHead, { className: "px-3 py-2", children: "Input" }),
          /* @__PURE__ */ jsx41(TableHead, { className: "px-3 py-2", children: "Output" })
        ] }) }),
        /* @__PURE__ */ jsx41(TableBody, { children: props.traces.map((t, i) => /* @__PURE__ */ jsx41(TraceRow, { trace: t }, i)) })
      ] }),
      (props.resultLimit || props.resultOffset) && /* @__PURE__ */ jsx41(TruncationFooter, { showing: props.traces.length, limit: props.resultLimit ?? props.traces.length, offset: props.resultOffset, noun: "traces" })
    ] })
  ] });
}
function StatBlock({ label, value, sub, subColor }) {
  return /* @__PURE__ */ jsxs20("div", { className: "flex flex-col", children: [
    /* @__PURE__ */ jsx41("span", { className: "text-[10px] font-medium uppercase tracking-wide text-[var(--ink-soft)]", children: label }),
    /* @__PURE__ */ jsx41("span", { className: "text-[18px] font-bold text-[var(--ink-bright)]", children: value }),
    sub && /* @__PURE__ */ jsx41("span", { className: "text-[10px] font-medium", style: { color: subColor }, children: sub })
  ] });
}
function TraceRow({ trace }) {
  return /* @__PURE__ */ jsxs20(TableRow, { children: [
    /* @__PURE__ */ jsx41(TableCell, { className: "px-3 py-2", children: /* @__PURE__ */ jsx41(Mono, { className: "text-[11px] text-[var(--ink-soft)]", children: trace.startTime.slice(11, 19) }) }),
    /* @__PURE__ */ jsx41(TableCell, { className: "px-3 py-2", children: /* @__PURE__ */ jsxs20("div", { className: "flex flex-col", children: [
      /* @__PURE__ */ jsx41(Mono, { className: "text-[11px] font-semibold text-[var(--ink-bright)]", children: trace.rootName }),
      /* @__PURE__ */ jsx41("span", { className: "text-[10px] text-[var(--ink-soft)]", children: trace.agentName })
    ] }) }),
    /* @__PURE__ */ jsx41(TableCell, { className: "px-3 py-2", children: /* @__PURE__ */ jsx41(Mono, { className: "text-[11px] text-[var(--ink)]", children: trace.model }) }),
    /* @__PURE__ */ jsx41(TableCell, { className: "px-2 py-2 text-right", children: /* @__PURE__ */ jsx41(Badge, { variant: trace.status === "error" ? "destructive" : "outline", className: "text-[9px]", children: trace.status }) }),
    /* @__PURE__ */ jsx41(TableCell, { className: "px-2 py-2 text-right", children: /* @__PURE__ */ jsx41(Mono, { className: "text-[11px] text-[var(--ink)]", children: formatDurationNanos(trace.durationNanos) }) }),
    /* @__PURE__ */ jsx41(TableCell, { className: "px-2 py-2 text-right", children: /* @__PURE__ */ jsxs20(Mono, { className: "text-[11px] text-[var(--ink)]", children: [
      trace.totalTokens.toLocaleString(),
      trace.inputTokens > 0 && /* @__PURE__ */ jsxs20("span", { className: "ml-1 text-[9px] text-[var(--ink-soft)]", children: [
        "(",
        trace.inputTokens,
        "\u2193 ",
        trace.outputTokens,
        "\u2191)"
      ] })
    ] }) }),
    /* @__PURE__ */ jsx41(TableCell, { className: "max-w-[150px] px-3 py-2", children: /* @__PURE__ */ jsx41("span", { className: "block truncate text-[10px] text-[var(--ink-soft)]", children: trace.inputPreview || "\u2014" }) }),
    /* @__PURE__ */ jsx41(TableCell, { className: "max-w-[150px] px-3 py-2", children: /* @__PURE__ */ jsx41("span", { className: "block truncate text-[10px] text-[var(--ink-soft)]", children: trace.outputPreview || "\u2014" }) })
  ] });
}

// src/apps/agent-trace/finder/tool.ts
var DEFAULT_DATASET4 = "otel-v1-apm-span*";
var DEFAULT_LIMIT2 = 30;
var finderRoute = defineRoute({
  id: "finder",
  tool: {
    title: "Find agent traces",
    description: "Find AI agent traces (GenAI spans) filtered by agent name, status, time. Returns ranked list with model, latency, tokens. Drill in via `agent-trace_details`.",
    inputSchema: inputSchema3
  },
  propsSchema: propsSchema3,
  view: FinderView,
  handler: async ({ dataSourceId: suppliedDataSourceId, dataset, timeRange, agentName, status, limit, offset, narrative, suggestions }, ctx) => {
    const dataSourceId = await ctx.osUi.resolveDataSourceId(suppliedDataSourceId);
    const ds = dataset?.trim() || DEFAULT_DATASET4;
    const lim = limit ?? DEFAULT_LIMIT2;
    const off = offset ?? 0;
    const range = timeRange ?? "1h";
    const tField = "startTime";
    const filters = [`isnotnull(attributes.gen_ai.operation.name)`];
    if (agentName) filters.push(`serviceName = "${agentName}"`);
    if (status === "error") filters.push(`status.code = 2`);
    else if (status === "ok") filters.push(`status.code != 2`);
    const query = `source = ${ds} | where ${filters.join(" and ")} | stats count() as spans, max(attributes.gen_ai.request.model) as model, sum(attributes.gen_ai.usage.input_tokens) as inp_tokens, sum(attributes.gen_ai.usage.output_tokens) as out_tokens, max(${tField}) as lastSeen, max(durationInNanos) as maxDuration, max(serviceName) as svc, max(traceGroup) as rootName, max(attributes.gen_ai.input.messages) as inputMsg, max(attributes.gen_ai.output.messages) as outputMsg, sum(if(status.code = 2, 1, 0)) as errCount by traceId | sort - lastSeen | ${pplHeadClause(lim, off)}`;
    ctx.logger.log(`[agent-trace.finder] PPL: ${query}`);
    try {
      const result = await ctx.osUi.runPpl(dataSourceId, query, ds);
      const rows = pplRows(result);
      const traces = rows.map((r) => {
        const inputTokens = r.getNumber("inp_tokens");
        const outputTokens = r.getNumber("out_tokens");
        const errCount = r.getNumber("errCount");
        let inputPreview = "";
        let outputPreview = "";
        try {
          const rawInput = r.getString("inputMsg");
          if (rawInput) {
            const parsed = JSON.parse(rawInput);
            inputPreview = parsed?.[0]?.parts?.[0]?.content?.slice(0, 80) ?? "";
          }
        } catch {
        }
        try {
          const rawOutput = r.getString("outputMsg");
          if (rawOutput) {
            const parsed = JSON.parse(rawOutput);
            outputPreview = parsed?.[0]?.parts?.[0]?.content?.slice(0, 80) ?? "";
          }
        } catch {
        }
        return {
          traceId: r.getString("traceId"),
          rootName: r.getString("rootName") || "agent trace",
          agentName: r.getString("svc") || "\u2014",
          model: r.getString("model") || "\u2014",
          status: errCount > 0 ? "error" : "ok",
          durationNanos: r.getNumber("maxDuration"),
          totalTokens: inputTokens + outputTokens,
          inputTokens,
          outputTokens,
          spanCount: r.getNumber("spans"),
          startTime: r.getString("lastSeen"),
          inputPreview,
          outputPreview
        };
      });
      const totalSpans = traces.reduce((s, t) => s + t.spanCount, 0);
      const totalTokens = traces.reduce((s, t) => s + t.totalTokens, 0);
      const errors = traces.filter((t) => t.status === "error").length;
      const durations = traces.map((t) => t.durationNanos).filter((d) => d > 0).sort((a, b) => a - b);
      const p50 = durations.length > 0 ? durations[Math.floor(durations.length * 0.5)] : 0;
      const p99 = durations.length > 0 ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.99))] : 0;
      const props = {
        dataset: ds,
        timeRange: range,
        traces,
        ...paginationProps(traces.length, lim, off),
        stats: {
          totalTraces: traces.length,
          totalSpans,
          totalTokens,
          errors,
          latencyP50Nanos: p50,
          latencyP99Nanos: p99
        },
        narrative,
        suggestions: suggestions ?? [
          ...errors > 0 ? [`Show me the ${errors} error trace${errors > 1 ? "s" : ""} to investigate`] : [],
          ...traces.length > 0 ? [`Show agent trace details for ${traces[0]?.traceId}`] : [],
          ...traces.length > 0 && !errors ? ["Show only error traces"] : [],
          "Which agent is the slowest?"
        ]
      };
      const text = traces.length === 0 ? `No agent traces found in ${ds} for the last ${range}.` : `${traces.length} agent trace(s). Top: ${traces.slice(0, 3).map((t) => `${t.rootName} (${t.model}, ${t.totalTokens} tokens)`).join("; ")}.`;
      return { props, text };
    } catch (err) {
      const msg = pplErrorHint(err, ds, query);
      ctx.logger.error("[agent-trace.finder] failed: " + msg);
      const props = {
        dataset: ds,
        timeRange: range,
        traces: [],
        error: msg
      };
      return { props, text: "Failed to find agent traces: " + msg, isError: true };
    }
  }
});

// src/apps/agent-trace/index.ts
var agentTraceApp = defineApp({
  id: "agent-trace",
  title: "Agent Trace",
  description: "Visualize AI agent execution traces instrumented with OpenTelemetry GenAI semantic conventions. Shows agent workflows as a tree, flow graph (DAG), and timeline with category-colored spans (Agent/LLM/Tool/Retrieval/Embeddings). Debug agent behavior, inspect tool calls, and analyze token usage.",
  routes: [finderRoute, detailsRoute, evidenceRoute]
});

// packages/ui/src/apps/_shared/osd-links.ts
var EXPLORE_APP = "explore";
var APM_MAP_APP = "observability-apm-application-map";
var ALERTING_APP = "observability-alerting";
var SLO_APP = "observability-apm-slo";
var DEFAULT_FROM = "now-24h";
var DEFAULT_TO = "now";
function rq(v) {
  return "'" + v.replace(/!/g, "!!").replace(/'/g, "!'") + "'";
}
function rquery(q) {
  return rq(encodeURIComponent(q.trim()));
}
function base(origin, workspaceId) {
  const o = origin.replace(/\/+$/, "");
  const ws = workspaceId?.trim();
  return ws ? `${o}/w/${encodeURIComponent(ws)}` : o;
}
function globalTime(from, to) {
  const f = from ?? DEFAULT_FROM;
  const t = to ?? DEFAULT_TO;
  return `_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:${rq(f)},to:${rq(t)}))`;
}
function datasetId(dataSourceId, title) {
  return `${dataSourceId}::${title}`;
}
function exploreQ(a, signalType, defaultTimeField) {
  const timeField = a.timeFieldName ?? defaultTimeField;
  if (a.indexPatternId) {
    const dsBlock = a.indexPatternDataSourceTitle && a.indexPatternDataSourceType ? `dataSource:(id:${rq(a.dataSourceId)},title:${rq(a.indexPatternDataSourceTitle)},type:${rq(a.indexPatternDataSourceType)},version:''),` : "";
    return `_q=(dataset:(${dsBlock}id:${rq(a.indexPatternId)},signalType:${signalType},timeFieldName:${rq(timeField)},title:${rq(a.datasetTitle)},type:INDEX_PATTERN),language:PPL,query:${rquery(a.query)})`;
  }
  return `_q=(dataset:(dataSource:(id:${rq(a.dataSourceId)},title:'',type:OpenSearch),id:${rq(datasetId(a.dataSourceId, a.datasetTitle))},signalType:${signalType},timeFieldName:${rq(timeField)},title:${rq(a.datasetTitle)},type:INDEX_PATTERN),language:PPL,query:${rquery(a.query)})`;
}
function exploreTracesUrl(a) {
  const q = exploreQ(a, "traces", "endTime");
  const appState = `_a=(legacy:(columns:!(spanId,status.code,attributes.http.status_code,resource.attributes.service.name,kind,name,durationNano,durationInNanos),interval:auto,isDirty:!f,sort:!()),tab:(logs:(),patterns:(usingRegexPatterns:!f)),ui:(activeTabId:logs,showHistogram:!t))`;
  return `${base(a.origin, a.workspaceId)}/app/${EXPLORE_APP}/traces/#?${globalTime(a.from, a.to)}&${q}&${appState}`;
}
function exploreLogsUrl(a) {
  const q = exploreQ(a, "logs", "time");
  const appState = `_a=(legacy:(columns:!(body,severityText,resource.attributes.service.name),interval:auto,isDirty:!f,sort:!()),tab:(logs:(),patterns:(usingRegexPatterns:!f)),ui:(activeTabId:logs,showHistogram:!t))`;
  return `${base(a.origin, a.workspaceId)}/app/${EXPLORE_APP}/logs/#?${globalTime(a.from, a.to)}&${q}&${appState}`;
}
function traceDetailsUrl(a) {
  const timeField = a.timeFieldName ?? "endTime";
  const dataset = a.indexPatternId ? (() => {
    const dsBlock = a.indexPatternDataSourceTitle && a.indexPatternDataSourceType ? `,dataSource:(id:${rq(a.dataSourceId)},title:${rq(a.indexPatternDataSourceTitle)},type:${rq(a.indexPatternDataSourceType)},version:'')` : "";
    return `dataset:(id:${rq(a.indexPatternId)},title:${rq(a.datasetTitle)},type:'INDEX_PATTERN',timeFieldName:${rq(timeField)}${dsBlock})`;
  })() : `dataset:(id:${rq(datasetId(a.dataSourceId, a.datasetTitle))},title:${rq(a.datasetTitle)},type:'INDEX_PATTERN',timeFieldName:${rq(timeField)},dataSource:(id:${rq(a.dataSourceId)},title:'',type:'OpenSearch'))`;
  const appState = `_a=(${dataset},spanId:${rq(a.spanId ?? "")},traceId:${rq(a.traceId)})`;
  return `${base(a.origin, a.workspaceId)}/app/${EXPLORE_APP}/traces/traceDetails#/?${appState}`;
}
function serviceMapUrl(a) {
  const params = new URLSearchParams();
  if (a.serviceName) {
    params.set("service", a.serviceName);
    params.set("focus", a.serviceName);
  }
  if (a.from) params.set("from", a.from);
  if (a.to) params.set("to", a.to);
  const qs = params.toString();
  return `${base(a.origin, a.workspaceId)}/app/${APM_MAP_APP}#/application-map${qs ? `?${qs}` : ""}`;
}
function alertsUrl(a) {
  const qs = a.dataSourceId ? `?ds=${encodeURIComponent(a.dataSourceId)}` : "";
  return `${base(a.origin, a.workspaceId)}/app/${ALERTING_APP}#/alerts${qs}`;
}
function sloUrl(a) {
  return `${base(a.origin, a.workspaceId)}/app/${SLO_APP}#/slos`;
}
function sloDetailUrl(a) {
  return `${base(a.origin, a.workspaceId)}/app/${SLO_APP}#/slos/${encodeURIComponent(a.sloId)}`;
}
function sloBurnRateRuleUrl(a) {
  const q = `slo_id:${a.sloId} slo_burn_rate_multiplier:${a.burnRateMultiplier}`;
  const params = new URLSearchParams({ q });
  return `${base(a.origin, a.workspaceId)}/app/${ALERTING_APP}#/rules?${params.toString()}`;
}

// packages/ui/src/apps/_shared/severity.ts
var SEVERITY_ASC = ["info", "low", "medium", "high", "critical"];
var SEVERITY_ORDER = [...SEVERITY_ASC].reverse();
function severityRank(sev) {
  const i = SEVERITY_ASC.indexOf(sev);
  return i === -1 ? 99 : i;
}

// src/apps/alerts-feed/shared.ts
function rollupSeverity(alerts) {
  const counts = /* @__PURE__ */ new Map();
  for (const a of alerts) {
    const sev = a.severity || "\u2014";
    counts.set(sev, (counts.get(sev) ?? 0) + 1);
  }
  return [...counts.entries()].map(([severity, count]) => ({ severity, count })).sort(
    (a, b) => severityRank(b.severity) - severityRank(a.severity) || a.severity.localeCompare(b.severity)
  );
}
function toStatusRows(status) {
  return status.map((s) => ({
    datasourceId: s.datasourceId,
    datasourceName: s.datasourceName,
    datasourceType: s.datasourceType,
    status: s.status,
    error: s.error,
    truncated: s.truncated
  }));
}
function toAlertRow(a) {
  return {
    id: a.id,
    source: a.datasourceType,
    datasourceId: a.datasourceId,
    name: a.name,
    severity: a.severity,
    state: a.state,
    message: a.message ?? "",
    startTime: a.startTime,
    lastUpdated: a.lastUpdated,
    monitorId: a.monitorId,
    labels: a.labels ?? {}
  };
}
async function fetchAlerts(ctx, opts) {
  const time = resolveTimeRange({
    timeRange: opts.timeRange,
    from: opts.from,
    to: opts.to
  });
  const window2 = dateMathWindow(time);
  const appliedRange = time.label;
  const result = await ctx.osUi.listUnifiedAlerts({
    dsIds: opts.dataSourceId ? [opts.dataSourceId] : void 0,
    startTime: window2?.from,
    endTime: window2?.to
  });
  ctx.logger.log(
    `${opts.logTag} unified alerts: ${result.alerts.length} across ${result.completedDatasources}/${result.totalDatasources} datasources`
  );
  let alerts = result.alerts.map(toAlertRow);
  if (opts.severity) alerts = alerts.filter((a) => a.severity === opts.severity);
  if (opts.state) alerts = alerts.filter((a) => a.state === opts.state);
  alerts.sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));
  const bySeverity = rollupSeverity(alerts);
  const datasourceStatus = toStatusRows(result.datasourceStatus);
  const failures = datasourceStatus.filter(
    (s) => s.status === "error" || s.status === "timeout"
  );
  return {
    alerts,
    bySeverity,
    datasourceStatus,
    failures,
    appliedRange,
    appliedWindowMinutes: windowMinutes(time),
    windowFromMs: time.from?.getTime(),
    windowToMs: time.to?.getTime()
  };
}

// packages/ui/src/apps/alerts-feed/list/schema.ts
import { z as z9 } from "zod";
var inputSchema4 = {
  dataSourceId: z9.string().optional().describe("Scope to one datasource. Omit for all."),
  severity: z9.enum(["critical", "high", "medium", "low", "info"]).optional().describe("Severity filter."),
  state: z9.enum([
    "active",
    "pending",
    "acknowledged",
    "silenced",
    "resolved",
    "error"
  ]).optional().describe("State filter. Omit for all states."),
  ...timeRangeFields("`all` (no time filter)"),
  ...presentationInputFields
};
var alertSchema = z9.object({
  id: z9.string(),
  /** Backend the alert came from. */
  source: z9.enum(["opensearch", "prometheus"]),
  /** Datasource UUID the alert belongs to. */
  datasourceId: z9.string(),
  /** Human label, e.g. "<monitor> — <trigger>" or the Prometheus alertname. */
  name: z9.string(),
  /** Unified severity: critical/high/medium/low/info. */
  severity: z9.string(),
  /** Unified state: active/pending/acknowledged/silenced/resolved/error. */
  state: z9.string(),
  /** Short message/annotation, when present. */
  message: z9.string(),
  /** ISO 8601 — when the alert first fired. */
  startTime: z9.string(),
  /** ISO 8601 — last notification / update. */
  lastUpdated: z9.string(),
  /** Monitor id (OpenSearch alerting), when present. */
  monitorId: z9.string().optional(),
  /** Raw labels (monitor_name/trigger_name/severity/etc.) for the detail panel. */
  labels: z9.record(z9.string(), z9.string())
});
var severityBucketSchema = z9.object({
  severity: z9.string(),
  count: z9.number()
});
var datasourceStatusSchema = z9.object({
  datasourceId: z9.string(),
  datasourceName: z9.string(),
  datasourceType: z9.enum(["opensearch", "prometheus"]),
  status: z9.enum(["pending", "loading", "success", "error", "timeout"]),
  error: z9.string().optional(),
  truncated: z9.boolean().optional()
});
var histogramSchema = z9.object({
  /** Bucket interval used (e.g. `5m`, `2h`, `1d`). */
  interval: z9.string(),
  /** Ordered bucket-start labels (ISO-ish timestamps). */
  buckets: z9.array(z9.string()),
  series: z9.array(
    z9.object({
      severity: z9.string(),
      counts: z9.array(z9.number())
    })
  )
});
var propsSchema4 = z9.object({
  ...presentationPropsFields,
  /** State actually applied (`all` when no state filter). */
  state: z9.string(),
  /** Lookback window actually applied (`all` when no time filter). */
  timeRange: z9.string(),
  alerts: z9.array(alertSchema),
  bySeverity: z9.array(severityBucketSchema),
  /** Per-datasource fetch outcomes (errors/timeouts/truncation). */
  datasourceStatus: z9.array(datasourceStatusSchema),
  /** Firing-activity histogram. Omitted when bucketing yields nothing. */
  histogram: histogramSchema.optional(),
  /** Deep link to the OpenSearch Dashboards alerting app's alerts view. */
  osdUrl: z9.string().optional(),
  error: z9.string().optional()
});

// packages/ui/src/apps/alerts-feed/list/view.tsx
import { Fragment as Fragment6, useEffect as useEffect6, useMemo as useMemo6, useRef as useRef5, useState as useState10 } from "react";

// packages/ui/src/components/ui/input.tsx
import * as React19 from "react";
import { jsx as jsx42 } from "react/jsx-runtime";
var Input = React19.forwardRef(
  ({ className, type, ...props }, ref) => /* @__PURE__ */ jsx42(
    m.input,
    {
      ref,
      type,
      className: cn(
        "flex h-9 w-full rounded-[14px] border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1",
        "text-[13px] text-[var(--ink)] tracking-[-0.05px] transition-all duration-200",
        "placeholder:text-[var(--ink-mute)]",
        "focus-visible:outline-none focus-visible:border-[var(--accent-bright)] focus-visible:shadow-[var(--shadow-focus-ring)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      ),
      whileFocus: { scale: 1.005 },
      transition: spring,
      ...props
    }
  )
);
Input.displayName = "Input";

// packages/ui/src/apps/_shared/format.tsx
function formatDuration(nanos) {
  return formatDurationNanos(nanos);
}
function formatInt(n) {
  return Math.round(n).toLocaleString();
}
function formatCount(n) {
  if (!Number.isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs === 0) return "0";
  if (abs >= 1) return Math.round(n).toLocaleString();
  return n.toLocaleString(void 0, { maximumSignificantDigits: 2 });
}
function pctOf(rate) {
  return `${Math.round(rate * 100)}%`;
}
function formatMetric(v, fractionDigits = 3) {
  if (!isFinite(v)) return String(v);
  if (Math.abs(v) >= 1e3 || v !== 0 && Math.abs(v) < 0.01) {
    return v.toExponential(2);
  }
  return v.toLocaleString(void 0, { maximumFractionDigits: fractionDigits });
}
function formatBytes(v) {
  const neg = v < 0 ? "-" : "";
  let n = Math.abs(v);
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${neg}${n.toLocaleString(void 0, { maximumFractionDigits: i === 0 ? 0 : 2 })}${units[i]}`;
}
function formatMetricValue(v, unit, fractionDigits = 3) {
  if (!isFinite(v)) return formatMetric(v, fractionDigits);
  if (unit === "seconds") {
    if (v === 0) return "0ms";
    const s = formatDurationNanos(Math.abs(v) * 1e9);
    return v < 0 ? `-${s}` : s;
  }
  if (unit === "bytes") return formatBytes(v);
  return formatMetric(v, fractionDigits);
}
function formatTimeTick(ts) {
  let d;
  if (/^\d{10,13}$/.test(ts.trim())) {
    const n = Number(ts.trim());
    d = new Date(ts.trim().length <= 10 ? n * 1e3 : n);
  } else {
    const iso = ts.includes("T") ? ts : ts.replace(" ", "T") + "Z";
    d = new Date(iso);
  }
  if (Number.isNaN(d.getTime())) return ts;
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}
function formatTimeAgo(ts, now = Date.now()) {
  if (!ts) return "\u2014";
  const iso = ts.includes("T") ? ts : ts.replace(" ", "T") + "Z";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return ts;
  const secs = Math.max(0, Math.round((now - then) / 1e3));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

// packages/ui/src/apps/_shared/DetailActions.tsx
import { useState as useState9 } from "react";

// packages/ui/src/framework/icons.tsx
import { jsx as jsx43, jsxs as jsxs21 } from "react/jsx-runtime";
function SearchIcon() {
  return /* @__PURE__ */ jsxs21(
    "svg",
    {
      width: "13",
      height: "13",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
      children: [
        /* @__PURE__ */ jsx43("circle", { cx: "11", cy: "11", r: "7" }),
        /* @__PURE__ */ jsx43("path", { d: "m21 21-4.3-4.3" })
      ]
    }
  );
}
function PlusIcon() {
  return /* @__PURE__ */ jsx43(
    "svg",
    {
      width: "13",
      height: "13",
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: "2",
      strokeLinecap: "round",
      strokeLinejoin: "round",
      "aria-hidden": true,
      children: /* @__PURE__ */ jsx43("path", { d: "M12 5v14M5 12h14" })
    }
  );
}

// packages/ui/src/apps/_shared/DetailActions.tsx
import { jsx as jsx44, jsxs as jsxs22 } from "react/jsx-runtime";
var ACTION_BASE = "inline-flex items-center gap-1.5 rounded-[8px] border px-[11px] py-[6px] text-[12px] font-medium tracking-[-0.05px] transition-colors disabled:cursor-default disabled:opacity-50";
function DetailActions({
  investigatePrompt,
  contextText,
  investigateTitle = "Ask the assistant to investigate this now",
  contextTitle = "Add this to the assistant's context for your next message",
  showInvestigate = true,
  className
}) {
  const { sendFollowup, canSendFollowup } = useFollowup();
  const { addToContext, canAddToContext } = useModelContext();
  const [investigate, setInvestigate] = useState9("idle");
  const [context, setContext] = useState9("idle");
  const wantInvestigate = showInvestigate && canSendFollowup;
  if (!wantInvestigate && !canAddToContext) return null;
  async function onInvestigate() {
    if (investigate === "pending") return;
    setInvestigate("pending");
    try {
      const ok = await sendFollowup(investigatePrompt);
      setInvestigate(ok ? "idle" : "failed");
    } catch {
      setInvestigate("failed");
    }
  }
  async function onAddToContext() {
    if (context === "pending") return;
    setContext("pending");
    try {
      const ok = await addToContext(contextText);
      setContext(ok ? "done" : "failed");
    } catch {
      setContext("failed");
    }
  }
  return /* @__PURE__ */ jsxs22(
    m.div,
    {
      variants: staggerContainer,
      initial: "hidden",
      animate: "visible",
      className: cn("flex flex-wrap items-center gap-1.5", className),
      children: [
        wantInvestigate && /* @__PURE__ */ jsxs22(
          m.button,
          {
            type: "button",
            disabled: investigate === "pending",
            onClick: onInvestigate,
            title: investigateTitle,
            variants: staggerItem,
            whileHover: { scale: 1.03 },
            whileTap: { scale: 0.97 },
            transition: spring,
            className: cn(
              ACTION_BASE,
              "cursor-pointer border-transparent bg-[var(--accent-soft)] text-[var(--accent-bright)]",
              "hover:opacity-90",
              investigate === "failed" && "border-[var(--danger)] bg-transparent text-[var(--danger)]"
            ),
            children: [
              /* @__PURE__ */ jsx44(SearchIcon, {}),
              /* @__PURE__ */ jsx44("span", { children: investigate === "pending" ? "Investigating\u2026" : investigate === "failed" ? "Couldn't send \u2014 retry" : "Investigate" })
            ]
          }
        ),
        canAddToContext && /* @__PURE__ */ jsxs22(
          m.button,
          {
            type: "button",
            disabled: context === "pending",
            onClick: onAddToContext,
            title: contextTitle,
            variants: staggerItem,
            whileHover: { scale: 1.03 },
            whileTap: { scale: 0.97 },
            transition: spring,
            className: cn(
              ACTION_BASE,
              "cursor-pointer border-[var(--surface-border)] bg-[var(--surface-muted)] text-[var(--ink-soft)]",
              "hover:border-transparent hover:bg-[var(--accent-soft)] hover:text-[var(--accent-bright)]",
              context === "done" && "border-transparent bg-[var(--accent-soft)] text-[var(--accent-bright)]",
              context === "failed" && "border-[var(--danger)] text-[var(--danger)]"
            ),
            children: [
              /* @__PURE__ */ jsx44(PlusIcon, {}),
              /* @__PURE__ */ jsx44("span", { children: context === "pending" ? "Adding\u2026" : context === "done" ? "Added to context" : context === "failed" ? "Couldn't add \u2014 retry" : "Add to context" })
            ]
          }
        )
      ]
    }
  );
}

// packages/ui/src/apps/alerts-feed/list/severity.ts
function severityTone(sev) {
  if (sev === "critical") return "danger";
  if (sev === "high") return "warn";
  if (sev === "medium") return "info";
  return "neutral";
}
var DOT_CLASS = {
  danger: DOT_CLASS_FOR_TONE.danger,
  warn: DOT_CLASS_FOR_TONE.warn,
  info: DOT_CLASS_FOR_TONE.info,
  neutral: DOT_CLASS_FOR_TONE.neutral
};
var BADGE_VARIANT = {
  danger: "destructive",
  warn: "warning",
  info: "info",
  neutral: "secondary"
};
var STAT_TONE = {
  danger: "danger",
  warn: "warn",
  info: "info",
  neutral: "neutral"
};
var STATE_VARIANT = {
  active: "destructive",
  error: "destructive",
  pending: "warning",
  acknowledged: "secondary",
  silenced: "secondary",
  resolved: "success"
};
function stateVariant(state) {
  return STATE_VARIANT[state] ?? "secondary";
}
var SOURCE_LABEL = {
  opensearch: "OpenSearch",
  prometheus: "Prometheus"
};
var STATE_ORDER = [
  "active",
  "pending",
  "acknowledged",
  "silenced",
  "resolved",
  "error"
];
var SOURCE_ORDER = ["opensearch", "prometheus"];
function alertScope(a) {
  const labels = a.labels ?? {};
  return labels.service || labels.instance || labels.pod || labels.job || "";
}

// packages/ui/src/apps/alerts-feed/list/AlertDetail.tsx
import { jsx as jsx45, jsxs as jsxs23 } from "react/jsx-runtime";
function SourceIcon({ source, size = 16 }) {
  const title = SOURCE_LABEL[source] ?? source;
  const Logo = source === "opensearch" ? OpenSearchLogo : source === "prometheus" ? PrometheusLogo : null;
  if (!Logo) return null;
  return /* @__PURE__ */ jsx45("span", { title, className: "inline-flex shrink-0", children: /* @__PURE__ */ jsx45(Logo, { size }) });
}
function DetailField({
  label,
  children
}) {
  return /* @__PURE__ */ jsxs23("div", { className: "flex flex-col gap-0.5", children: [
    /* @__PURE__ */ jsx45(Eyebrow, { children: label }),
    /* @__PURE__ */ jsx45("div", { className: "text-[13px] text-[var(--ink)]", children })
  ] });
}
function describeAlert(alert) {
  const lines = [
    `Alert: ${alert.name || alert.message || alert.id}`,
    `Source: ${SOURCE_LABEL[alert.source] ?? alert.source}`,
    `Severity: ${alert.severity || "unknown"} \xB7 State: ${alert.state || "unknown"}`
  ];
  if (alert.message && alert.message !== alert.name) {
    lines.push(`Message: ${alert.message}`);
  }
  if (alert.startTime) lines.push(`Fired: ${alert.startTime}`);
  if (alert.monitorId) lines.push(`Monitor: ${alert.monitorId}`);
  const labelEntries = Object.entries(alert.labels ?? {}).filter(
    ([, v]) => v != null && v !== ""
  );
  if (labelEntries.length > 0) {
    lines.push(
      `Labels: ${labelEntries.map(([k, v]) => `${k}=${v}`).join(", ")}`
    );
  }
  return lines.join("\n");
}
function AlertDetail({ alert }) {
  const tone = severityTone(alert.severity);
  const labelEntries = Object.entries(alert.labels ?? {}).filter(
    ([, v]) => v != null && v !== ""
  );
  const detail = describeAlert(alert);
  return /* @__PURE__ */ jsxs23(
    m.div,
    {
      className: "flex flex-col gap-3 px-3 py-3",
      variants: staggerContainer,
      initial: "hidden",
      animate: "visible",
      children: [
        /* @__PURE__ */ jsxs23(m.div, { variants: staggerItem, className: "flex items-start gap-3", children: [
          alert.message && /* @__PURE__ */ jsx45("div", { className: "text-[13px] leading-[1.45] text-[var(--ink-soft)]", children: alert.message }),
          /* @__PURE__ */ jsx45(
            DetailActions,
            {
              className: "ml-auto shrink-0",
              investigatePrompt: `Investigate this alert and explain the likely root cause, then suggest next steps:

${detail}`,
              contextText: `Selected alert:
${detail}`,
              investigateTitle: "Ask the assistant to investigate this alert now",
              contextTitle: "Add this alert to the assistant's context for your next message"
            }
          )
        ] }),
        /* @__PURE__ */ jsxs23(
          m.div,
          {
            variants: staggerItem,
            className: "grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4",
            children: [
              /* @__PURE__ */ jsx45(DetailField, { label: "Severity", children: /* @__PURE__ */ jsx45(Badge, { variant: BADGE_VARIANT[tone], className: "capitalize", children: alert.severity || "unknown" }) }),
              /* @__PURE__ */ jsx45(DetailField, { label: "State", children: /* @__PURE__ */ jsx45(Badge, { variant: stateVariant(alert.state), className: "capitalize", children: alert.state || "unknown" }) }),
              /* @__PURE__ */ jsx45(DetailField, { label: "Source", children: SOURCE_LABEL[alert.source] ?? alert.source }),
              /* @__PURE__ */ jsx45(DetailField, { label: "Fired", children: /* @__PURE__ */ jsx45(Mono, { title: alert.startTime || void 0, children: formatTimeAgo(alert.startTime) }) }),
              /* @__PURE__ */ jsx45(DetailField, { label: "Last updated", children: /* @__PURE__ */ jsx45(Mono, { title: alert.lastUpdated || void 0, children: formatTimeAgo(alert.lastUpdated) }) }),
              alert.monitorId && /* @__PURE__ */ jsx45(DetailField, { label: "Monitor", children: /* @__PURE__ */ jsx45(Mono, { className: "break-all text-[12px] text-[var(--ink-soft)]", children: alert.monitorId }) })
            ]
          }
        ),
        labelEntries.length > 0 && /* @__PURE__ */ jsx45(m.div, { variants: staggerItem, children: /* @__PURE__ */ jsx45(DetailField, { label: "Labels", children: /* @__PURE__ */ jsx45("div", { className: "flex flex-wrap gap-1.5", children: labelEntries.map(([k, v]) => /* @__PURE__ */ jsxs23(
          "span",
          {
            className: "rounded-[6px] border border-[var(--surface-border)] px-1.5 py-0.5 text-[11px] text-[var(--ink-soft)]",
            children: [
              /* @__PURE__ */ jsx45("span", { className: "text-[var(--ink-mute)]", children: k }),
              "=",
              v
            ]
          },
          k
        )) }) }) })
      ]
    }
  );
}

// packages/ui/src/apps/alerts-feed/list/facets.tsx
import { jsx as jsx46, jsxs as jsxs24 } from "react/jsx-runtime";
function tallyFacet(alerts, pick, order) {
  const counts = /* @__PURE__ */ new Map();
  for (const a of alerts) {
    const v = pick(a) || "\u2014";
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => {
    const ra = order.indexOf(a.value);
    const rb = order.indexOf(b.value);
    if (ra !== -1 || rb !== -1) {
      return (ra === -1 ? 99 : ra) - (rb === -1 ? 99 : rb);
    }
    return b.count - a.count || a.value.localeCompare(b.value);
  });
}
function FacetGroup({
  label,
  values,
  selected,
  onToggle,
  format
}) {
  if (values.length <= 1) return null;
  return /* @__PURE__ */ jsxs24("div", { className: "flex flex-wrap items-center gap-1.5", children: [
    /* @__PURE__ */ jsx46(Eyebrow, { className: "mr-0.5", children: label }),
    values.map(({ value, count }) => {
      const active = selected.has(value);
      return /* @__PURE__ */ jsxs24(
        m.button,
        {
          type: "button",
          "aria-pressed": active,
          onClick: () => onToggle(value),
          whileHover: { scale: 1.04 },
          whileTap: { scale: 0.96 },
          transition: spring,
          className: cn(
            "inline-flex items-center gap-1 rounded-[8px] border px-2 py-0.5 text-xs capitalize transition-colors",
            active ? "border-[var(--accent-bright)] bg-[var(--accent-soft)] text-[var(--accent-bright)]" : "border-[var(--surface-border)] text-[var(--ink-soft)] hover:bg-[var(--surface-muted)]"
          ),
          children: [
            format ? format(value) : value,
            /* @__PURE__ */ jsx46(Mono, { className: "text-[10.5px] text-[var(--ink-mute)]", children: count })
          ]
        },
        value
      );
    })
  ] });
}

// packages/ui/src/apps/alerts-feed/list/panels.tsx
import { jsx as jsx47, jsxs as jsxs25 } from "react/jsx-runtime";
function bucketLabel(ts, interval) {
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return ts;
  const d = new Date(t);
  const dayOrCoarser = interval.endsWith("d") || interval.endsWith("w");
  return dayOrCoarser ? d.toLocaleDateString(void 0, { month: "short", day: "numeric" }) : d.toLocaleTimeString(void 0, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}
function FiringHistogram({
  histogram,
  sevFilter,
  onToggleSeverity
}) {
  const series = histogram.series.map((s) => ({
    label: s.severity,
    points: s.counts,
    tone: STAT_TONE[severityTone(s.severity)]
  }));
  const xLabels = histogram.buckets.map((b) => bucketLabel(b, histogram.interval));
  const totalFirings = histogram.series.reduce(
    (sum, s) => sum + s.counts.reduce((a, b) => a + b, 0),
    0
  );
  return /* @__PURE__ */ jsx47(m.div, { variants: fadeInUp, initial: "hidden", animate: "visible", children: /* @__PURE__ */ jsx47(
    ChartPanel,
    {
      title: "Firing activity",
      meta: /* @__PURE__ */ jsxs25("span", { children: [
        /* @__PURE__ */ jsx47(Mono, { children: formatInt(totalFirings) }),
        " firings \xB7",
        " ",
        /* @__PURE__ */ jsx47(Mono, { children: histogram.interval }),
        " buckets"
      ] }),
      kind: "stacked",
      series,
      xLabels,
      onLegendSelect: onToggleSeverity,
      legendActive: sevFilter,
      height: 150,
      formatValue: formatInt
    }
  ) });
}
function DatasourceStatusBanner({
  statuses
}) {
  const failures = statuses.filter(
    (s) => s.status === "error" || s.status === "timeout"
  );
  const truncated = statuses.filter((s) => s.truncated);
  if (failures.length === 0 && truncated.length === 0) return null;
  return /* @__PURE__ */ jsxs25(
    m.div,
    {
      variants: fadeIn,
      initial: "hidden",
      animate: "visible",
      className: "flex flex-col gap-1 rounded-[10px] border border-[var(--warn)] bg-[var(--warn-soft)] px-3 py-2 text-[12px] text-[var(--ink)]",
      children: [
        failures.map((f) => /* @__PURE__ */ jsxs25("div", { children: [
          /* @__PURE__ */ jsx47("strong", { children: f.datasourceName || f.datasourceId }),
          " (",
          f.datasourceType,
          ") failed to load",
          f.error ? `: ${f.error}` : ` (${f.status})`,
          "."
        ] }, `err-${f.datasourceId}`)),
        truncated.map((t) => /* @__PURE__ */ jsxs25("div", { children: [
          /* @__PURE__ */ jsx47("strong", { children: t.datasourceName || t.datasourceId }),
          " hit the result cap \u2014 narrow the time range to see all alerts."
        ] }, `trunc-${t.datasourceId}`))
      ]
    }
  );
}

// packages/ui/src/apps/alerts-feed/list/view.tsx
import { jsx as jsx48, jsxs as jsxs26 } from "react/jsx-runtime";
function buildTitle(total, state, timeRange) {
  const window2 = timeRange === "all" ? "" : ` in the last ${timeRange}`;
  const stateWord = state === "all" ? "" : `${state} `;
  return `${formatInt(total)} ${stateWord}${total === 1 ? "alert" : "alerts"}${window2}`;
}
function AlertTableRow({
  alert,
  isOpen,
  onToggle,
  index
}) {
  const tone = severityTone(alert.severity);
  const scope = alertScope(alert);
  return /* @__PURE__ */ jsxs26(Fragment6, { children: [
    /* @__PURE__ */ jsxs26(
      m.tr,
      {
        "data-state": isOpen ? "selected" : void 0,
        onClick: onToggle,
        className: cn(
          "cursor-pointer border-b border-[var(--ink-hairline)] transition-colors hover:bg-[var(--surface-muted)] data-[state=selected]:bg-[var(--accent-soft)]"
        ),
        custom: index,
        variants: rowEntrance,
        initial: "hidden",
        animate: "visible",
        children: [
          /* @__PURE__ */ jsx48(TableCell, { className: "w-[20px] px-2 py-1.5 text-lg text-[var(--ink-mute)]", children: /* @__PURE__ */ jsx48(
            "span",
            {
              className: cn(
                "inline-block transition-transform",
                isOpen && "rotate-90"
              ),
              "aria-hidden": true,
              children: "\u203A"
            }
          ) }),
          /* @__PURE__ */ jsx48(TableCell, { children: /* @__PURE__ */ jsx48(
            "span",
            {
              className: cn("ml-1 inline-block h-[8px] w-[8px] rounded-full", DOT_CLASS[tone]),
              title: alert.severity || "unknown"
            }
          ) }),
          /* @__PURE__ */ jsxs26(TableCell, { children: [
            /* @__PURE__ */ jsxs26("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx48(SourceIcon, { source: alert.source }),
              /* @__PURE__ */ jsx48("span", { className: "truncate font-medium text-[var(--ink)]", children: alert.name || alert.message || "\u2014" }),
              scope && /* @__PURE__ */ jsx48("span", { className: "shrink-0 rounded-[6px] bg-[var(--surface-muted)] px-1.5 py-0.5 text-[11px] text-[var(--ink-soft)]", children: scope })
            ] }),
            alert.message && alert.name && /* @__PURE__ */ jsx48("div", { className: "truncate pl-[24px] text-[12px] text-[var(--ink-mute)]", children: alert.message })
          ] }),
          /* @__PURE__ */ jsx48(TableCell, { children: /* @__PURE__ */ jsx48(Badge, { variant: stateVariant(alert.state), className: "capitalize", children: alert.state || "\u2014" }) }),
          /* @__PURE__ */ jsx48(TableCell, { className: "text-right", children: /* @__PURE__ */ jsx48(
            Mono,
            {
              className: "text-[12px] text-[var(--ink-mute)]",
              title: alert.startTime || void 0,
              children: formatTimeAgo(alert.startTime)
            }
          ) })
        ]
      }
    ),
    /* @__PURE__ */ jsx48(TableRow, { className: "border-0 hover:bg-transparent", children: /* @__PURE__ */ jsx48(TableCell, { colSpan: 5, className: "bg-transparent p-0", children: /* @__PURE__ */ jsx48(AnimatePresence, { initial: false, children: isOpen && /* @__PURE__ */ jsx48(
      m.div,
      {
        initial: { height: 0, opacity: 0 },
        animate: { height: "auto", opacity: 1 },
        exit: { height: 0, opacity: 0 },
        transition: springSoft,
        style: { overflow: "hidden" },
        children: /* @__PURE__ */ jsx48(AlertDetail, { alert })
      },
      "detail"
    ) }) }) })
  ] });
}
function toggleIn(setter) {
  return (value) => setter((cur) => {
    const next = new Set(cur);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
}
function ListView({ props }) {
  return /* @__PURE__ */ jsx48(ViewGuard, { props, children: (p) => /* @__PURE__ */ jsx48(ListViewInner, { props: p }) });
}
function ListViewInner({ props }) {
  const [query, setQuery] = useState10("");
  const [sevFilter, setSevFilter] = useState10(/* @__PURE__ */ new Set());
  const [stateFilter, setStateFilter] = useState10(/* @__PURE__ */ new Set());
  const [sourceFilter, setSourceFilter] = useState10(/* @__PURE__ */ new Set());
  const [openKey, setOpenKey] = useState10(null);
  const appliedStateDefault = useRef5(false);
  useEffect6(() => {
    if (appliedStateDefault.current) return;
    const list = props?.alerts;
    if (!list || list.length === 0) return;
    appliedStateDefault.current = true;
    if (list.some((a) => a.state === "active")) setStateFilter(/* @__PURE__ */ new Set(["active"]));
  }, [props]);
  const alerts = useMemo6(
    () => (props?.alerts ?? []).map((a, i) => ({ ...a, rowKey: `${a.id}#${i}` })),
    [props]
  );
  const severityFacets = useMemo6(() => tallyFacet(alerts, (a) => a.severity, SEVERITY_ORDER), [alerts]);
  const stateFacets = useMemo6(() => tallyFacet(alerts, (a) => a.state, STATE_ORDER), [alerts]);
  const sourceFacets = useMemo6(() => tallyFacet(alerts, (a) => a.source, SOURCE_ORDER), [alerts]);
  const filtered = useMemo6(() => {
    const q = query.trim().toLowerCase();
    return alerts.filter((a) => {
      if (sevFilter.size > 0 && !sevFilter.has(a.severity)) return false;
      if (stateFilter.size > 0 && !stateFilter.has(a.state)) return false;
      if (sourceFilter.size > 0 && !sourceFilter.has(a.source)) return false;
      if (!q) return true;
      return a.name.toLowerCase().includes(q) || a.message.toLowerCase().includes(q) || a.source.toLowerCase().includes(q) || alertScope(a).toLowerCase().includes(q);
    });
  }, [alerts, query, sevFilter, stateFilter, sourceFilter]);
  if (props.alerts.length === 0) {
    return /* @__PURE__ */ jsxs26(EmptyState, { children: [
      "No ",
      props.state === "all" ? "" : `${props.state} `,
      "alerts."
    ] });
  }
  const toggleSeverity = toggleIn(setSevFilter);
  const toggleState = toggleIn(setStateFilter);
  const toggleSource = toggleIn(setSourceFilter);
  const hasActiveFilter = sevFilter.size > 0 || stateFilter.size > 0 || sourceFilter.size > 0;
  const clearAll = () => {
    setSevFilter(/* @__PURE__ */ new Set());
    setStateFilter(/* @__PURE__ */ new Set());
    setSourceFilter(/* @__PURE__ */ new Set());
  };
  return /* @__PURE__ */ jsxs26(
    PresentationFrame,
    {
      presentation: props,
      category: "Alerts",
      title: buildTitle(props.alerts.length, props.state, props.timeRange),
      osdUrl: props.osdUrl,
      children: [
        /* @__PURE__ */ jsx48(DatasourceStatusBanner, { statuses: props.datasourceStatus }),
        props.histogram && props.histogram.buckets.length > 0 && /* @__PURE__ */ jsx48(
          FiringHistogram,
          {
            histogram: props.histogram,
            sevFilter,
            onToggleSeverity: toggleSeverity
          }
        ),
        /* @__PURE__ */ jsxs26(Card, { children: [
          /* @__PURE__ */ jsx48(CardHeader, { className: "px-3 py-2", children: /* @__PURE__ */ jsxs26(CardTitle, { className: "text-sm", children: [
            /* @__PURE__ */ jsx48(Mono, { children: /* @__PURE__ */ jsx48(AnimatedNumber, { value: filtered.length, format: formatInt }) }),
            " ",
            filtered.length === 1 ? "alert" : "alerts"
          ] }) }),
          /* @__PURE__ */ jsxs26(CardContent, { className: "flex flex-col gap-3 p-3", children: [
            /* @__PURE__ */ jsx48("div", { className: "flex flex-wrap items-center gap-3", children: /* @__PURE__ */ jsx48(
              Input,
              {
                value: query,
                onChange: (e) => setQuery(e.target.value),
                placeholder: "Search alerts by name, message, or source\u2026",
                "aria-label": "Search alerts",
                className: "max-w-[360px] flex-1"
              }
            ) }),
            /* @__PURE__ */ jsxs26("div", { className: "flex flex-wrap items-center gap-x-5 gap-y-2", children: [
              /* @__PURE__ */ jsx48(FacetGroup, { label: "Severity", values: severityFacets, selected: sevFilter, onToggle: toggleSeverity }),
              /* @__PURE__ */ jsx48(FacetGroup, { label: "State", values: stateFacets, selected: stateFilter, onToggle: toggleState }),
              /* @__PURE__ */ jsx48(
                FacetGroup,
                {
                  label: "Source",
                  values: sourceFacets,
                  selected: sourceFilter,
                  onToggle: toggleSource,
                  format: (v) => SOURCE_LABEL[v] ?? v
                }
              ),
              hasActiveFilter && /* @__PURE__ */ jsx48(Button, { variant: "link", className: "text-[12px]", onClick: clearAll, children: "Clear filters" })
            ] }),
            /* @__PURE__ */ jsxs26(Table, { className: "table-fixed", children: [
              /* @__PURE__ */ jsx48(TableHeader, { children: /* @__PURE__ */ jsxs26(TableRow, { children: [
                /* @__PURE__ */ jsx48(TableHead, { className: "w-[20px] px-2 py-2" }),
                /* @__PURE__ */ jsx48(TableHead, { className: "w-[44px]", children: "Sev" }),
                /* @__PURE__ */ jsx48(TableHead, { children: "Alert" }),
                /* @__PURE__ */ jsx48(TableHead, { className: "w-[110px]", children: "State" }),
                /* @__PURE__ */ jsx48(TableHead, { className: "w-[104px] text-right", children: "Fired" })
              ] }) }),
              /* @__PURE__ */ jsx48(TableBody, { children: filtered.length === 0 ? /* @__PURE__ */ jsx48(TableRow, { className: "hover:bg-transparent", children: /* @__PURE__ */ jsx48(TableCell, { colSpan: 5, className: "py-6 text-center text-[var(--ink-mute)]", children: "No alerts match your filters." }) }) : filtered.map((a, i) => /* @__PURE__ */ jsx48(
                AlertTableRow,
                {
                  alert: a,
                  index: i,
                  isOpen: openKey === a.rowKey,
                  onToggle: () => setOpenKey(openKey === a.rowKey ? null : a.rowKey)
                },
                a.rowKey
              )) })
            ] })
          ] })
        ] })
      ]
    }
  );
}

// src/apps/alerts-feed/list/tool.ts
function spanForWindowMinutes(windowMins) {
  const totalMins = windowMins > 0 ? windowMins : 1440 * 16;
  const targetMins = totalMins / 16;
  const choices = [
    [1, "1m"],
    [5, "5m"],
    [10, "10m"],
    [30, "30m"],
    [60, "1h"],
    [180, "3h"],
    [360, "6h"],
    [720, "12h"],
    [1440, "1d"],
    [10080, "1w"]
  ];
  for (const [mins, label] of choices) {
    if (targetMins <= mins) return { minutes: mins, label };
  }
  return { minutes: 10080, label: "1w" };
}
function buildHistogram(alerts, intervalMinutes, intervalLabel, windowFromMs, windowToMs) {
  const intervalMs = intervalMinutes * 6e4;
  if (intervalMs <= 0) return void 0;
  const floorMs = windowFromMs !== void 0 ? Math.floor(windowFromMs / intervalMs) * intervalMs : void 0;
  const byBucket = /* @__PURE__ */ new Map();
  const sevSet = /* @__PURE__ */ new Set();
  let any = false;
  for (const a of alerts) {
    const t = Date.parse(a.startTime);
    if (Number.isNaN(t)) continue;
    const bucketMs = Math.floor(t / intervalMs) * intervalMs;
    const placedMs = floorMs !== void 0 && bucketMs < floorMs ? floorMs : bucketMs;
    any = true;
    const sev = a.severity || "\u2014";
    sevSet.add(sev);
    const m2 = byBucket.get(placedMs) ?? /* @__PURE__ */ new Map();
    m2.set(sev, (m2.get(sev) ?? 0) + 1);
    byBucket.set(placedMs, m2);
  }
  if (!any) return void 0;
  const contiguous = (startMs, endMs) => {
    const axis = [];
    for (let ms = startMs; ms <= endMs; ms += intervalMs) axis.push(ms);
    return axis;
  };
  const dataKeys = [...byBucket.keys()].sort((a, b) => a - b);
  const dataExtent = () => {
    if (dataKeys.length === 0) return dataKeys;
    const filled = contiguous(dataKeys[0], dataKeys[dataKeys.length - 1]);
    return filled.length > 240 ? dataKeys : filled;
  };
  let bucketMsOrder;
  if (floorMs !== void 0 && windowToMs !== void 0) {
    bucketMsOrder = contiguous(floorMs, windowToMs);
    if (bucketMsOrder.length > 240 || bucketMsOrder.length === 0) {
      bucketMsOrder = dataExtent();
    }
  } else {
    bucketMsOrder = dataExtent();
  }
  const buckets = bucketMsOrder.map((ms) => new Date(ms).toISOString());
  const severities = [...sevSet].sort(
    (a, b) => severityRank(a) - severityRank(b)
  );
  const series = severities.map((severity) => ({
    severity,
    counts: bucketMsOrder.map((ms) => byBucket.get(ms)?.get(severity) ?? 0)
  }));
  return { interval: intervalLabel, buckets, series };
}
function summarize(alerts, bySeverity, state, appliedRange, failures) {
  const window2 = appliedRange === "all" ? " (all time \u2014 no time filter applied)" : ` for ${appliedRange}`;
  const scope = state ? `${state} ` : "";
  if (alerts.length === 0) return `No ${scope}alerts found${window2}.`;
  const breakdown = bySeverity.map((b) => `${b.severity}: ${b.count}`).join(", ");
  const osCount = alerts.filter((a) => a.source === "opensearch").length;
  const promCount = alerts.length - osCount;
  const bySource = `${osCount} from OpenSearch alerting, ${promCount} from Prometheus`;
  const warn = failures.length > 0 ? ` Note: ${failures.length} datasource(s) failed to load (${failures.map((f) => f.datasourceName || f.datasourceId).join(", ")}).` : "";
  return `${alerts.length} ${scope}alert(s)${window2} (${bySource}). By severity \u2014 ${breakdown}.${warn}`;
}
var listRoute = defineRoute({
  id: "list",
  tool: {
    title: "Present triggered alerts",
    description: "PRESENTATION: browsable alerts feed widget (unified API: OpenSearch alerting + Prometheus). Omit `dataSourceId` for all datasources. Filter: `severity`, `state`, `timeRange` (default `all`). For text investigation use `alerts-feed_search`.",
    inputSchema: inputSchema4
  },
  propsSchema: propsSchema4,
  view: ListView,
  handler: async ({ dataSourceId, severity, state, timeRange, from, to, narrative, suggestions }, ctx) => {
    const workspaceId = ctx.workspaceId ?? await ctx.osUi.resolveObservabilityWorkspaceId();
    const baseProps = {
      narrative,
      suggestions,
      state: state ?? "all",
      timeRange: "all",
      // Deep link to the OSD alerting app's alerts view, scoped to the same
      // datasource when one was given.
      osdUrl: alertsUrl({ origin: ctx.osUi.endpoint, workspaceId, dataSourceId })
    };
    try {
      const {
        alerts,
        bySeverity,
        datasourceStatus,
        failures,
        appliedRange,
        appliedWindowMinutes,
        windowFromMs,
        windowToMs
      } = await fetchAlerts(ctx, {
        dataSourceId,
        severity,
        state,
        timeRange,
        from,
        to,
        logTag: "[alerts-feed.list]"
      });
      baseProps.timeRange = appliedRange;
      const { minutes, label } = spanForWindowMinutes(appliedWindowMinutes);
      const histogram = buildHistogram(
        alerts,
        minutes,
        label,
        windowFromMs,
        windowToMs
      );
      const props = {
        ...baseProps,
        alerts,
        bySeverity,
        datasourceStatus,
        histogram
      };
      return {
        props,
        text: summarize(alerts, bySeverity, state, appliedRange, failures)
      };
    } catch (err) {
      const msg = errorMessage(err);
      ctx.logger.error("[alerts-feed.list] unified alerts failed: " + msg);
      const props = {
        ...baseProps,
        alerts: [],
        bySeverity: [],
        datasourceStatus: [],
        error: msg
      };
      return {
        props,
        text: "Failed to load alerts from the unified alerting API: " + msg,
        isError: true
      };
    }
  }
});

// packages/ui/src/apps/alerts-feed/search/schema.ts
import { z as z10 } from "zod";
var inputSchema5 = {
  dataSourceId: z10.string().optional().describe("Scope to one datasource. Omit for all."),
  severity: z10.enum(["critical", "high", "medium", "low", "info"]).optional().describe("Severity filter."),
  state: z10.enum([
    "active",
    "pending",
    "acknowledged",
    "silenced",
    "resolved",
    "error"
  ]).optional().describe("State filter. Omit for all states."),
  ...timeRangeFields("`all` (no time filter)")
};

// src/apps/alerts-feed/search/tool.ts
function summarize2(alerts, bySeverity, state, appliedRange, failures) {
  const window2 = appliedRange === "all" ? " (all time \u2014 no time filter applied)" : ` for ${appliedRange}`;
  const scope = state ? `${state} ` : "";
  if (alerts.length === 0) return `No ${scope}alerts found${window2}.`;
  const breakdown = bySeverity.map((b) => `${b.severity}: ${b.count}`).join(", ");
  const osCount = alerts.filter((a) => a.source === "opensearch").length;
  const promCount = alerts.length - osCount;
  const bySource = `${osCount} from OpenSearch alerting, ${promCount} from Prometheus`;
  const warn = failures.length > 0 ? ` Note: ${failures.length} datasource(s) failed to load (${failures.map((f) => f.datasourceName || f.datasourceId).join(", ")}).` : "";
  return `${alerts.length} ${scope}alert(s)${window2} (${bySource}). By severity \u2014 ${breakdown}.`.concat(warn);
}
var searchRoute = defineRoute({
  id: "search",
  tool: {
    title: "Search triggered alerts",
    description: "Search alerts (unified API: OpenSearch + Prometheus) as text rows. No widget \u2014 call freely. Filter: `severity`, `state`, `timeRange` (default `all`). To present as widget: `alerts-feed_list`.",
    inputSchema: inputSchema5
  },
  // No pagination on the unified API — narrowing is the only way to the rest.
  echoHint: "\u21B3 Only the first alerts are shown \u2014 NOT the full set. Re-call with a tighter filter (a specific `severity`, `state`, single `dataSourceId`, or shorter `timeRange`) to surface the alerts not listed above.",
  handler: async ({ dataSourceId, severity, state, timeRange, from, to }, ctx) => {
    try {
      const { alerts, bySeverity, failures, appliedRange } = await fetchAlerts(
        ctx,
        {
          dataSourceId,
          severity,
          state,
          timeRange,
          from,
          to,
          logTag: "[alerts-feed.search]"
        }
      );
      return {
        props: { alerts },
        text: summarize2(alerts, bySeverity, state, appliedRange, failures)
      };
    } catch (err) {
      const msg = errorMessage(err);
      ctx.logger.error("[alerts-feed.search] unified alerts failed: " + msg);
      return {
        props: { error: msg },
        text: "Failed to search alerts from the unified alerting API: " + msg,
        isError: true
      };
    }
  }
});

// src/apps/alerts-feed/index.ts
var alertsFeedApp = defineApp({
  id: "alerts-feed",
  title: "Alerts feed",
  description: "Firing alerts merged from the observability plugin's unified alerting API (OpenSearch alerting monitors + Prometheus). Two routes: `alerts-feed_search` returns alerts as TEXT for the agent to investigate on its own (no widget), and `alerts-feed_list` PRESENTS them to the user as a feed widget. For ad-hoc grouping/summarizing, write a PPL query and run `ppl_query` instead.",
  routes: [searchRoute, listRoute]
});

// packages/ui/src/apps/instrumentation-score/evaluate/schema.ts
import { z as z11 } from "zod";
var inputSchema6 = {
  dataSourceId: dataSourceIdField(),
  traceIndex: z11.string().optional().describe("Trace index (default `otel-v1-apm-span*`)."),
  logIndex: z11.string().optional().describe("Log index. Omit to skip log rules."),
  prometheusConnection: z11.string().optional().describe("Prometheus data-connection name for metric rules."),
  serviceName: z11.string().optional().describe("Filter to one service. Omit for all."),
  ...presentationInputFields
};
var ruleSchema = z11.object({
  id: z11.string(),
  name: z11.string(),
  category: z11.enum(["resource", "span", "metric", "log"]),
  impact: z11.enum(["critical", "important", "normal", "low"]),
  passed: z11.boolean().nullable(),
  detail: z11.string(),
  remediation: z11.string().optional()
});
var propsSchema5 = z11.object({
  ...presentationPropsFields,
  score: z11.number(),
  category: z11.string(),
  serviceName: z11.string().optional(),
  rules: z11.array(ruleSchema),
  breakdown: z11.object({
    resource: z11.object({ passed: z11.number(), failed: z11.number(), skipped: z11.number() }),
    span: z11.object({ passed: z11.number(), failed: z11.number(), skipped: z11.number() }),
    log: z11.object({ passed: z11.number(), failed: z11.number(), skipped: z11.number() }),
    metric: z11.object({ passed: z11.number(), failed: z11.number(), skipped: z11.number() })
  })
});

// packages/ui/src/apps/instrumentation-score/evaluate/view.tsx
import { jsx as jsx49, jsxs as jsxs27 } from "react/jsx-runtime";
var IMPACT_VARIANT = {
  critical: "destructive",
  important: "warning",
  normal: "secondary",
  low: "secondary"
};
function EvaluateView({ props }) {
  return /* @__PURE__ */ jsx49(ViewGuard, { props, loading: "Evaluating instrumentation quality\u2026", children: (p) => /* @__PURE__ */ jsx49(EvaluateViewInner, { props: p }) });
}
function EvaluateViewInner({ props }) {
  return /* @__PURE__ */ jsxs27(PresentationFrame, { presentation: props, category: "Score", title: "Instrumentation", children: [
    /* @__PURE__ */ jsxs27(
      m.div,
      {
        className: "flex items-center gap-6 rounded-xl border border-[var(--surface-border)] bg-[var(--glass)] p-5",
        variants: fadeInUp,
        initial: "hidden",
        animate: "visible",
        children: [
          /* @__PURE__ */ jsx49(ScoreGauge2, { score: props.score, category: props.category }),
          /* @__PURE__ */ jsxs27("div", { className: "flex flex-1 flex-col gap-2", children: [
            /* @__PURE__ */ jsx49(
              m.div,
              {
                className: "grid grid-cols-4 gap-2",
                variants: staggerContainer,
                initial: "hidden",
                animate: "visible",
                children: ["resource", "span", "log", "metric"].map((cat) => {
                  const b = props.breakdown[cat];
                  const evaluated = b.passed + b.failed;
                  return /* @__PURE__ */ jsxs27(
                    m.div,
                    {
                      className: "flex flex-col items-center rounded-lg bg-[var(--surface-muted)] p-2",
                      variants: scaleIn,
                      children: [
                        /* @__PURE__ */ jsx49("span", { className: "text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]", children: cat }),
                        /* @__PURE__ */ jsxs27("span", { className: "text-[16px] font-bold text-[var(--ink-bright)]", children: [
                          /* @__PURE__ */ jsx49(AnimatedNumber, { value: b.passed }),
                          "/",
                          evaluated
                        ] }),
                        b.skipped > 0 && /* @__PURE__ */ jsxs27("span", { className: "text-[9px] text-[var(--ink-mute)]", children: [
                          b.skipped,
                          " skipped"
                        ] })
                      ]
                    },
                    cat
                  );
                })
              }
            ),
            props.serviceName && /* @__PURE__ */ jsxs27("span", { className: "text-[11px] text-[var(--ink-soft)]", children: [
              "Service: ",
              props.serviceName
            ] })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsxs27("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ jsx49(Eyebrow, { children: "Rule Results" }),
      /* @__PURE__ */ jsx49(
        m.div,
        {
          className: "flex flex-col gap-2",
          variants: staggerContainer,
          initial: "hidden",
          animate: "visible",
          children: [
            ...props.rules.filter((r) => r.passed === false),
            ...props.rules.filter((r) => r.passed === true),
            ...props.rules.filter((r) => r.passed === null)
          ].map((r) => /* @__PURE__ */ jsx49(m.div, { variants: staggerItem, children: /* @__PURE__ */ jsx49(RuleCard, { rule: r }) }, r.id))
        }
      )
    ] })
  ] });
}
function ScoreGauge2({ score, category }) {
  const reduce = useReducedMotion();
  const color = score >= 90 ? "var(--success)" : score >= 75 ? "var(--accent-bright)" : score >= 50 ? "var(--warn)" : "var(--danger)";
  const circumference = 2 * Math.PI * 40;
  const offset = circumference - score / 100 * circumference;
  return /* @__PURE__ */ jsxs27("div", { className: "relative flex shrink-0 flex-col items-center", children: [
    /* @__PURE__ */ jsxs27("svg", { width: "100", height: "100", viewBox: "0 0 100 100", children: [
      /* @__PURE__ */ jsx49("circle", { cx: "50", cy: "50", r: "40", fill: "none", stroke: "var(--surface-muted)", strokeWidth: "8" }),
      /* @__PURE__ */ jsx49(
        m.circle,
        {
          cx: "50",
          cy: "50",
          r: "40",
          fill: "none",
          stroke: color,
          strokeWidth: "8",
          strokeLinecap: "round",
          strokeDasharray: circumference,
          transform: "rotate(-90 50 50)",
          initial: { strokeDashoffset: reduce ? offset : circumference },
          animate: { strokeDashoffset: offset },
          transition: { duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }
        }
      )
    ] }),
    /* @__PURE__ */ jsxs27("div", { className: "absolute inset-0 flex flex-col items-center justify-center", children: [
      /* @__PURE__ */ jsx49("span", { className: "text-[22px] font-bold", style: { color }, children: /* @__PURE__ */ jsx49(AnimatedNumber, { value: score }) }),
      /* @__PURE__ */ jsx49("span", { className: "text-[9px] text-[var(--ink-soft)]", children: "/100" })
    ] }),
    /* @__PURE__ */ jsx49("span", { className: "mt-1 text-[11px] font-medium", style: { color }, children: category })
  ] });
}
function RuleCard({ rule }) {
  const icon = rule.passed === true ? "\u2705" : rule.passed === false ? "\u274C" : "\u23ED\uFE0F";
  const borderColor = rule.passed === false ? "border-[var(--danger)]/30" : rule.passed === true ? "border-[var(--success)]/30" : "border-[var(--surface-border)]";
  return /* @__PURE__ */ jsxs27("div", { className: `flex flex-col gap-0.5 rounded-lg border ${borderColor} bg-[var(--surface-muted)] p-2.5`, children: [
    /* @__PURE__ */ jsxs27("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx49("span", { className: "text-[13px]", children: icon }),
      /* @__PURE__ */ jsx49("span", { className: "text-[11px] font-semibold text-[var(--ink-bright)]", children: rule.id }),
      /* @__PURE__ */ jsx49("span", { className: "text-[11px] text-[var(--ink)]", children: rule.name }),
      /* @__PURE__ */ jsx49(Badge, { variant: IMPACT_VARIANT[rule.impact], className: "ml-auto text-[9px]", children: rule.impact })
    ] }),
    /* @__PURE__ */ jsx49("p", { className: "pl-6 text-[10px] text-[var(--ink-soft)]", children: rule.detail }),
    rule.remediation && rule.passed === false && /* @__PURE__ */ jsxs27("p", { className: "pl-6 text-[10px] font-medium text-[var(--accent-bright)]", children: [
      "\u2192 ",
      rule.remediation
    ] })
  ] });
}

// src/apps/instrumentation-score/evaluate/tool.ts
var WEIGHTS = { critical: 40, important: 30, normal: 20, low: 10 };
async function ppl(ctx, dataSourceId, query, dataset) {
  try {
    return await ctx.osUi.runPpl(dataSourceId, query, dataset);
  } catch (err) {
    ctx.logger.warn(`[score] PPL failed: ${query.slice(0, 80)} \u2014 ${err}`);
    return null;
  }
}
function firstNum(result) {
  return result?.datarows?.[0]?.[0] ?? 0;
}
async function resourceRules(ctx, dsId, idx, svcFilter) {
  const results = [];
  const total = firstNum(await ppl(ctx, dsId, `source = ${idx} ${svcFilter} | stats count() as c`, idx));
  const noSvc = firstNum(await ppl(
    ctx,
    dsId,
    `source = ${idx} ${svcFilter} | where isnull(serviceName) or serviceName = "" | stats count() as c`,
    idx
  ));
  results.push({
    id: "RES-005",
    name: "service.name is present",
    category: "resource",
    impact: "critical",
    passed: total > 0 ? noSvc === 0 : null,
    detail: total > 0 ? noSvc === 0 ? `All ${total} spans have service.name` : `${noSvc}/${total} spans missing service.name` : "No spans found",
    remediation: noSvc > 0 ? "Set OTEL_SERVICE_NAME env var or configure resource attributes in SDK." : void 0
  });
  const noInst = firstNum(await ppl(
    ctx,
    dsId,
    `source = ${idx} ${svcFilter} | where isnull(resource.service.instance.id) | head 1000 | stats count() as c`,
    idx
  ));
  results.push({
    id: "RES-001",
    name: "service.instance.id is present",
    category: "resource",
    impact: "normal",
    passed: total > 0 ? noInst === 0 : null,
    detail: noInst === 0 ? "service.instance.id present" : `${noInst} spans missing service.instance.id`,
    remediation: noInst > 0 ? "Add service.instance.id to resource attributes (hostname or pod UID)." : void 0
  });
  const badLevel = firstNum(await ppl(
    ctx,
    dsId,
    `source = ${idx} ${svcFilter} | where isnotnull(attributes.service.name) | head 1 | stats count() as c`,
    idx
  ));
  results.push({
    id: "RES-004",
    name: "Attributes at correct semantic level",
    category: "resource",
    impact: "important",
    passed: total > 0 ? badLevel === 0 : null,
    detail: badLevel > 0 ? "service.name found as span attribute (should be resource level)" : "Attributes at correct levels",
    remediation: badLevel > 0 ? "Move service.name from span to resource attributes in SDK config." : void 0
  });
  return results;
}
async function spanRules(ctx, dsId, idx, svcFilter) {
  const results = [];
  const clientRoots = firstNum(await ppl(
    ctx,
    dsId,
    `source = ${idx} ${svcFilter} | where (isnull(parentSpanId) or parentSpanId = "") and kind = "CLIENT" | stats count() as c`,
    idx
  ));
  const totalRoots = firstNum(await ppl(
    ctx,
    dsId,
    `source = ${idx} ${svcFilter} | where isnull(parentSpanId) or parentSpanId = "" | stats count() as c`,
    idx
  ));
  results.push({
    id: "SPA-004",
    name: "Root spans are not CLIENT kind",
    category: "span",
    impact: "important",
    passed: totalRoots > 0 ? clientRoots === 0 : null,
    detail: clientRoots === 0 ? `${totalRoots} root spans have correct kind` : `${clientRoots} root spans have kind=CLIENT (broken trace context)`,
    remediation: clientRoots > 0 ? "Entry-point services should create SERVER/INTERNAL root spans, not CLIENT." : void 0
  });
  const cardResult = await ppl(
    ctx,
    dsId,
    `source = ${idx} ${svcFilter} | stats distinct_count(name) as names, count() as total`,
    idx
  );
  const uniqueNames = cardResult?.datarows?.[0]?.[0] ?? 0;
  const spanTotal = cardResult?.datarows?.[0]?.[1] ?? 0;
  const ratio = spanTotal > 0 ? uniqueNames / spanTotal : 0;
  results.push({
    id: "SPA-003",
    name: "Span name cardinality bounded",
    category: "span",
    impact: "important",
    passed: spanTotal > 0 ? ratio < 0.5 : null,
    detail: `${uniqueNames} unique names / ${spanTotal} spans (${(ratio * 100).toFixed(1)}%)`,
    remediation: ratio >= 0.5 ? "Use parametrized span names (e.g. 'GET /users/{id}' not 'GET /users/12345')." : void 0
  });
  const badTraces = firstNum(await ppl(
    ctx,
    dsId,
    `source = ${idx} ${svcFilter} | where kind = "INTERNAL" and durationInNanos < 5000000 | stats count() as c by traceId | where c > 20 | stats count() as bad`,
    idx
  ));
  results.push({
    id: "SPA-005",
    name: "No excessive short internal spans",
    category: "span",
    impact: "important",
    passed: badTraces === 0,
    detail: badTraces === 0 ? "No traces with >20 short (<5ms) internal spans" : `${badTraces} traces with excessive short spans`,
    remediation: badTraces > 0 ? "Reduce internal span creation for trivial operations." : void 0
  });
  results.push({
    id: "SPA-002",
    name: "No orphan spans",
    category: "span",
    impact: "normal",
    passed: null,
    detail: "Requires cross-span join \u2014 inspect individual traces to verify.",
    remediation: "Ensure all services propagate W3C TraceContext headers."
  });
  return results;
}
async function logRules(ctx, dsId, idx, svcFilter) {
  const results = [];
  const total = firstNum(await ppl(ctx, dsId, `source = ${idx} ${svcFilter} | stats count() as c`, idx));
  const unset = firstNum(await ppl(
    ctx,
    dsId,
    `source = ${idx} ${svcFilter} | where severity_text = "UNSET" or isnull(severity_text) | stats count() as c`,
    idx
  ));
  results.push({
    id: "LOG-002",
    name: "Severity number is set",
    category: "log",
    impact: "important",
    passed: total > 0 ? unset === 0 : null,
    detail: total > 0 ? unset === 0 ? `All ${total} logs have severity` : `${unset}/${total} logs have UNSET severity` : "No logs found",
    remediation: unset > 0 ? "Map framework log levels (INFO, WARN, ERROR) to OTel severity numbers." : void 0
  });
  const debug = firstNum(await ppl(
    ctx,
    dsId,
    `source = ${idx} ${svcFilter} | where severity_text = "DEBUG" | stats count() as c`,
    idx
  ));
  results.push({
    id: "LOG-001",
    name: "No debug logs in production",
    category: "log",
    impact: "important",
    passed: total > 0 ? debug === 0 : null,
    detail: debug === 0 ? "No DEBUG logs found" : `${debug} DEBUG logs (should not persist in production)`,
    remediation: debug > 0 ? "Set log level to INFO+ in production. Use collector log-level filter." : void 0
  });
  return results;
}
async function metricRules(ctx, promConn, _svcFilter) {
  const results = [];
  try {
    const allMetrics = await ctx.osUi.runPromql(
      promConn,
      'count({__name__=~".+"}) by (__name__)',
      promConn,
      { from: "now-1h", to: "now" },
      "instant"
    );
    const metricCount = allMetrics.datarows.length;
    const badNames = allMetrics.datarows.filter((row) => {
      const name = String(row[0] ?? "");
      return /_seconds_|_bytes_|_milliseconds_/.test(name) && /_total$|_count$/.test(name);
    });
    results.push({
      id: "MET-005",
      name: "Metric names don't embed units redundantly",
      category: "metric",
      impact: "normal",
      passed: badNames.length === 0,
      detail: badNames.length === 0 ? `${metricCount} metrics follow naming conventions` : `${badNames.length} metrics embed units in name (unit is a separate field)`,
      remediation: badNames.length > 0 ? "Use the unit field on meters instead of embedding units in metric names." : void 0
    });
    const noUnit = allMetrics.datarows.filter((row) => {
      const name = String(row[0] ?? "");
      return !/_seconds|_bytes|_milliseconds|_total|_count|_ratio|_percent/.test(name) && !name.includes("_bucket");
    });
    results.push({
      id: "MET-002",
      name: "Metrics have units",
      category: "metric",
      impact: "important",
      passed: metricCount > 0 ? noUnit.length < metricCount * 0.5 : null,
      detail: `${metricCount - noUnit.length}/${metricCount} metrics have recognizable units in naming`,
      remediation: noUnit.length >= metricCount * 0.5 ? "Specify units when creating meters (e.g. 'ms', 'By', '1')." : void 0
    });
  } catch (err) {
    ctx.logger.warn(`[score] PromQL failed: ${err}`);
    results.push(
      { id: "MET-002", name: "Metrics have units", category: "metric", impact: "important", passed: null, detail: "PromQL query failed" },
      { id: "MET-005", name: "Metric names don't embed units", category: "metric", impact: "normal", passed: null, detail: "PromQL query failed" }
    );
  }
  return results;
}
function computeScore(rules) {
  const evaluated = rules.filter((r) => r.passed !== null);
  if (evaluated.length === 0) return { score: 0, category: "No data" };
  let weightedPassed = 0, weightedTotal = 0;
  for (const r of evaluated) {
    const w = WEIGHTS[r.impact] ?? 20;
    weightedTotal += w;
    if (r.passed) weightedPassed += w;
  }
  const score = Math.round(weightedPassed / weightedTotal * 100);
  const category = score >= 90 ? "Excellent" : score >= 75 ? "Good" : score >= 50 ? "Needs Improvement" : "Poor";
  return { score, category };
}
function formatReport(rules, score, category, serviceName) {
  const lines = [
    `# Instrumentation Score: ${score}/100 (${category})`,
    "",
    serviceName ? `**Service:** ${serviceName}` : "**Scope:** All services",
    "",
    `**Evaluated:** ${rules.filter((r) => r.passed !== null).length} rules | **Passed:** ${rules.filter((r) => r.passed === true).length} | **Failed:** ${rules.filter((r) => r.passed === false).length} | **Skipped:** ${rules.filter((r) => r.passed === null).length}`,
    ""
  ];
  for (const cat of ["resource", "span", "log", "metric"]) {
    const catRules = rules.filter((r) => r.category === cat);
    if (catRules.length === 0) continue;
    const passed = catRules.filter((r) => r.passed === true).length;
    lines.push(`## ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${passed}/${catRules.length})`);
    for (const r of catRules) {
      const icon = r.passed === true ? "\u2705" : r.passed === false ? "\u274C" : "\u23ED\uFE0F";
      lines.push(`${icon} **${r.id}** ${r.name} [${r.impact}]`);
      lines.push(`   ${r.detail}`);
      if (r.remediation && r.passed === false) {
        lines.push(`   \u2192 Fix: ${r.remediation}`);
      }
    }
    lines.push("");
  }
  const failed = rules.filter((r) => r.passed === false);
  if (failed.length > 0) {
    lines.push("## Recommendations");
    lines.push("");
    for (const r of failed) {
      if (r.remediation) lines.push(`- **${r.id}**: ${r.remediation}`);
    }
  }
  return lines.join("\n");
}
async function runScoreEvaluation(ctx, scope) {
  const { dataSourceId, traceIndex, logIndex, prometheusConnection, serviceName } = scope;
  const traceIdx = traceIndex?.trim() || "otel-v1-apm-span*";
  const svcFilter = serviceName ? `| where serviceName = "${serviceName}"` : "";
  const [resRules, spaRules, logRuleResults, metricRuleResults] = await Promise.all([
    resourceRules(ctx, dataSourceId, traceIdx, svcFilter),
    spanRules(ctx, dataSourceId, traceIdx, svcFilter),
    logIndex ? logRules(ctx, dataSourceId, logIndex, svcFilter) : Promise.resolve([
      { id: "LOG-001", name: "No debug logs in production", category: "log", impact: "important", passed: null, detail: "Skipped (no logIndex)" },
      { id: "LOG-002", name: "Severity number is set", category: "log", impact: "important", passed: null, detail: "Skipped (no logIndex)" }
    ]),
    prometheusConnection ? metricRules(ctx, prometheusConnection, svcFilter) : Promise.resolve([
      { id: "MET-002", name: "Metrics have units", category: "metric", impact: "important", passed: null, detail: "Skipped (no prometheusConnection)" },
      { id: "MET-005", name: "Metric names don't embed units", category: "metric", impact: "normal", passed: null, detail: "Skipped (no prometheusConnection)" }
    ])
  ]);
  const allRules = [...resRules, ...spaRules, ...logRuleResults, ...metricRuleResults];
  const { score, category } = computeScore(allRules);
  const breakdownFor = (cat) => {
    const inCat = allRules.filter((r) => r.category === cat);
    return {
      passed: inCat.filter((r) => r.passed === true).length,
      failed: inCat.filter((r) => r.passed === false).length,
      skipped: inCat.filter((r) => r.passed === null).length
    };
  };
  const breakdown = {
    resource: breakdownFor("resource"),
    span: breakdownFor("span"),
    log: breakdownFor("log"),
    metric: breakdownFor("metric")
  };
  return { score, category, rules: allRules, breakdown };
}
var evaluateRoute = defineRoute({
  id: "evaluate",
  tool: {
    title: "Evaluate instrumentation score",
    description: "PRESENTATION: evaluate OTel instrumentation quality (0\u2013100 score) with rule breakdown and remediation. Checks resource/span/metric/log categories. Pass `dataSourceId`; optionally `traceIndex`, `logIndex`, `prometheusConnection`, `serviceName`.",
    inputSchema: inputSchema6
  },
  propsSchema: propsSchema5,
  view: EvaluateView,
  handler: async ({ dataSourceId: suppliedDataSourceId, traceIndex, logIndex, prometheusConnection, serviceName, narrative, suggestions }, ctx) => {
    const dataSourceId = await ctx.osUi.resolveDataSourceId(suppliedDataSourceId);
    const traceIdx = traceIndex?.trim() || "otel-v1-apm-span*";
    const svcFilter = serviceName ? `| where serviceName = "${serviceName}"` : "";
    ctx.logger.log(`[score] Evaluating against ${traceIdx} on ${dataSourceId}${serviceName ? ` for ${serviceName}` : ""}`);
    const coverageLines = ["## Telemetry Coverage Analysis", ""];
    const svcResult = await ppl(ctx, dataSourceId, `source = ${traceIdx} | stats count() as spans, distinct_count(serviceName) as services`, traceIdx);
    const totalSpans = svcResult?.datarows?.[0]?.[0] ?? 0;
    const serviceCount = svcResult?.datarows?.[0]?.[1] ?? 0;
    coverageLines.push(`- **Spans:** ${totalSpans.toLocaleString()} total across **${serviceCount}** service(s)`);
    const nameResult = await ppl(ctx, dataSourceId, `source = ${traceIdx} ${svcFilter} | stats count() as c by name | sort - c | head 5`, traceIdx);
    if (nameResult && nameResult.datarows.length > 0) {
      const topNames = nameResult.datarows.map((r) => `${r[1] ?? "?"} (${r[0]})`).join(", ");
      coverageLines.push(`- **Top span names:** ${topNames}`);
    }
    const timeResult = await ppl(
      ctx,
      dataSourceId,
      `source = ${traceIdx} ${svcFilter} | stats min(startTime) as earliest, max(startTime) as latest`,
      traceIdx
    );
    if (timeResult && timeResult.datarows[0]) {
      coverageLines.push(`- **Time range:** ${timeResult.datarows[0][0]} \u2192 ${timeResult.datarows[0][1]}`);
    }
    if (prometheusConnection) {
      try {
        const metResult = await ctx.osUi.runPromql(
          prometheusConnection,
          'count({__name__=~".+"})',
          prometheusConnection,
          { from: "now-1h", to: "now" },
          "instant"
        );
        const lastRow = metResult.datarows[0];
        const seriesCount = lastRow ? Number(lastRow[lastRow.length - 1]) || metResult.datarows.length : 0;
        coverageLines.push(`- **Prometheus:** ${seriesCount} active metric series`);
      } catch {
      }
    }
    if (logIndex) {
      const logTotal = firstNum(await ppl(ctx, dataSourceId, `source = ${logIndex} ${svcFilter} | stats count() as c`, logIndex));
      coverageLines.push(`- **Logs:** ${logTotal.toLocaleString()} records`);
    }
    coverageLines.push("");
    const { score, category, rules: allRules, breakdown } = await runScoreEvaluation(ctx, {
      dataSourceId,
      traceIndex,
      logIndex,
      prometheusConnection,
      serviceName
    });
    const report = coverageLines.join("\n") + "\n" + formatReport(allRules, score, category, serviceName);
    const failed = allRules.filter((r) => r.passed === false);
    const autoNarrative = failed.length > 0 ? `${failed.length} rule(s) need attention: ${failed.map((r) => `${r.id} (${r.name})`).join(", ")}. ${failed[0].remediation ?? ""}` : "All evaluated rules pass \u2014 instrumentation follows OpenTelemetry best practices.";
    const props = {
      score,
      category,
      serviceName,
      rules: allRules,
      breakdown,
      narrative: narrative ?? autoNarrative,
      suggestions: suggestions ?? [
        ...failed.length > 0 ? ["How do I fix the failing rules?"] : [],
        "Show recent traces for this service",
        "Query Prometheus metrics for this service"
      ]
    };
    return { props, text: report };
  }
});

// src/apps/instrumentation-score/index.ts
var instrumentationScoreApp = defineApp({
  id: "instrumentation-score",
  title: "Instrumentation Score",
  description: "Evaluate telemetry instrumentation quality against the Instrumentation Score specification (https://github.com/instrumentation-score/spec). Discovers data sources and connections, runs PPL queries on trace/log indices and PromQL on Prometheus connections, evaluates 19 rules across resource, span, metric, log, and SDK categories, then produces a scored report with actionable remediation recommendations.",
  routes: [evaluateRoute]
});

// packages/ui/src/apps/metrics/query/schema.ts
import { z as z12 } from "zod";
var inputSchema7 = {
  dataSourceId: dataSourceIdField({ kind: "prometheus" }),
  query: z12.string().describe("PromQL expression to execute."),
  ...timeRangeFields("`1h`"),
  queryType: z12.enum(["instant", "range"]).optional().describe("`range` (default) or `instant` (latest value per series).")
};

// src/apps/metrics/query/tool.ts
var DEFAULT_RANGE = "1h";
var MAX_SERIES_IN_SUMMARY = 3;
function summarize3(rows, query) {
  if (rows.length === 0) return `PromQL returned no datapoints for \`${query}\`.`;
  const order = [];
  const lastBySeries = /* @__PURE__ */ new Map();
  for (const r of rows) {
    const key = r.series || r.labels || "(series)";
    if (!lastBySeries.has(key)) order.push(key);
    lastBySeries.set(key, r.value);
  }
  const top = order.slice(0, MAX_SERIES_IN_SUMMARY).map((s) => `${s} (latest ${formatMetric(lastBySeries.get(s))})`).join(", ");
  return `${order.length} series, ${rows.length} datapoint(s). ${top}.`;
}
var queryRoute = defineRoute({
  id: "query",
  tool: {
    title: "Run PromQL query",
    description: "Execute PromQL and return datapoints as text. No chart \u2014 call freely for exploration. Present as chart via `report_dashboard` (`kind: query`, `renderAs: timeseries`). `dataSourceId` must be a `kind: data-connection` (Prometheus) \u2014 not a data-source (OpenSearch). Use `describe_metrics` to discover metric/label names.",
    inputSchema: inputSchema7
  },
  // A range query emits one row per series per step — easily hundreds. Cut rows
  // by reducing the window, switching to an instant query, or aggregating.
  echoHint: "\u21B3 Only the first datapoints are shown \u2014 a `range` query emits one row per series per step. For the latest value per series use `queryType: instant`; otherwise shorten `timeRange`, or aggregate series in PromQL (e.g. `sum by (...) (...)`) to fit the answer.",
  handler: async ({ dataSourceId, query, timeRange, from, to, queryType }, ctx) => {
    const conn = dataSourceId;
    const qType = queryType ?? "range";
    let window2;
    let range;
    try {
      if (qType === "instant") {
        const at = (to ?? "now").trim();
        window2 = { from: at, to: at };
        range = `at ${at}`;
      } else {
        const time = resolveTimeRange(
          { timeRange, from, to },
          { defaultFrom: `now-${DEFAULT_RANGE}` }
        );
        const dm = dateMathWindow(time);
        window2 = dm ?? { from: `now-${DEFAULT_RANGE}`, to: "now" };
        range = dm ? time.label : `last ${DEFAULT_RANGE}`;
      }
    } catch (err) {
      const msg = errorMessage(err);
      const echo = {
        query,
        table: { columns: ["Series", "Labels", "Value", "Time"], rows: [] }
      };
      return { props: echo, text: "Invalid time range: " + msg, isError: true };
    }
    ctx.logger.log(`[metrics.query] PromQL (${qType}, ${range}): ${query}`);
    try {
      const result = await ctx.osUi.runPromql(
        dataSourceId,
        query,
        conn,
        window2,
        qType
      );
      const rows = pplRows(result).map((r) => ({
        series: r.getString("Series"),
        labels: asString(r.get("Labels")),
        value: r.getNumber("Value"),
        time: r.getString("Time")
      }));
      const echo = {
        query,
        table: {
          columns: ["Series", "Labels", "Value", "Time"],
          rows: rows.map((r) => [r.series, r.labels, r.value, r.time])
        }
      };
      return { props: echo, text: summarize3(rows, query) };
    } catch (err) {
      const msg = promqlErrorHint(err);
      ctx.logger.error("[metrics.query] PromQL failed: " + errorMessage(err));
      const echo = {
        query,
        table: { columns: ["Series", "Labels", "Value", "Time"], rows: [] }
      };
      return { props: echo, text: "Failed to run PromQL: " + msg, isError: true };
    }
  }
});

// src/apps/metrics/index.ts
var metricsApp = defineApp({
  id: "metrics",
  title: "PromQL query",
  description: "Run an arbitrary PromQL query against a Prometheus data connection and read the resulting series as text. The agent's free-form metric exploration tool; renders no chart.",
  routes: [queryRoute]
});

// packages/ui/src/apps/_shared/infer-viz.ts
var TIME_NAME_RE = /(^|[_.])(bucket|timestamp|time|@timestamp|date|starttime|endtime)$/i;
var TIME_TYPE_RE = /(date|timestamp|time)/i;
function classify(name, type, values) {
  const t = (type || "").toLowerCase();
  if (TIME_NAME_RE.test(name) || TIME_TYPE_RE.test(t)) return "time";
  if (/(long|integer|int|short|byte|double|float|half_float|scaled_float|number)/.test(t)) {
    return "number";
  }
  if (/(keyword|text|string|ip|boolean)/.test(t)) return "string";
  const nonNull = values.filter((v) => v !== null && v !== void 0 && v !== "");
  if (nonNull.length > 0 && nonNull.every((v) => typeof v === "number" || typeof v === "string" && v !== "" && !isNaN(Number(v)))) {
    return "number";
  }
  return "string";
}
function fmtNumber(v) {
  if (!isFinite(v)) return String(v);
  if (Number.isInteger(v)) return v.toLocaleString();
  if (Math.abs(v) >= 1e3) return Math.round(v).toLocaleString();
  return v.toLocaleString(void 0, { maximumFractionDigits: 3 });
}
function trailingPartialBuckets(buckets) {
  if (buckets.length < 3) return 0;
  const ts = buckets.map((b) => Date.parse(b));
  if (ts.some((t) => Number.isNaN(t))) return 0;
  const gaps = [];
  for (let i = 1; i < ts.length; i++) gaps.push(ts[i] - ts[i - 1]);
  if (gaps.some((g) => g <= 0)) return 0;
  const sorted = [...gaps].sort((a, b) => a - b);
  const interval = sorted[Math.floor(sorted.length / 2)];
  if (interval <= 0) return 0;
  if (gaps.some((g) => Math.abs(g - interval) > interval * 0.5)) return 0;
  const lastStart = ts[ts.length - 1];
  return lastStart + interval > Date.now() + 1e3 ? 1 : 0;
}
function trimTrailing(ts, n) {
  if (n <= 0) return ts;
  return {
    ...ts,
    buckets: ts.buckets.slice(0, -n),
    lines: ts.lines.map((l) => ({ ...l, points: l.points.slice(0, -n) }))
  };
}
function inferViz(result) {
  const colDefs = result.schema ?? [];
  const datarows = result.datarows ?? [];
  const columns = colDefs.map((c, i) => ({
    name: c.name,
    type: c.type,
    role: classify(c.name, c.type, datarows.map((r) => r[i]))
  }));
  const table = {
    columns: columns.map((c) => c.name),
    rows: datarows.map((r) => r.map((v) => asString(v)))
  };
  const numberCols = columns.filter((c) => c.role === "number");
  const stringCols = columns.filter((c) => c.role === "string");
  const timeCols = columns.filter((c) => c.role === "time");
  const idxOf = (name) => columns.findIndex((c) => c.name === name);
  const base2 = {
    kind: "table",
    columns,
    rowCount: datarows.length,
    table
  };
  if (timeCols.length >= 1 && numberCols.length >= 1 && datarows.length >= 2) {
    const timeCol = timeCols[0];
    const tIdx = idxOf(timeCol.name);
    if (stringCols.length === 1 && numberCols.length === 1) {
      const keyIdx = idxOf(stringCols[0].name);
      const valIdx = idxOf(numberCols[0].name);
      const bucketOrder = [];
      const seenBucket = /* @__PURE__ */ new Set();
      const byKey = /* @__PURE__ */ new Map();
      for (const r of datarows) {
        const bucket = asString(r[tIdx]);
        const key = asString(r[keyIdx]) || "(empty)";
        const val = toNumber(r[valIdx]);
        if (!seenBucket.has(bucket)) {
          seenBucket.add(bucket);
          bucketOrder.push(bucket);
        }
        let cells = byKey.get(key);
        if (!cells) byKey.set(key, cells = /* @__PURE__ */ new Map());
        cells.set(bucket, (cells.get(bucket) ?? 0) + val);
      }
      const keysByTotal = [...byKey.entries()].map(([k, cells]) => ({ k, total: [...cells.values()].reduce((a, b) => a + b, 0) })).sort((a, b) => b.total - a.total).slice(0, 8).map((x) => x.k);
      const lines2 = keysByTotal.map((k) => {
        const cells = byKey.get(k);
        return { label: k, points: bucketOrder.map((b) => cells.get(b) ?? 0) };
      });
      const valueUnit2 = isDurationNanosColumn(numberCols[0].name) ? "nanos" : "count";
      let timeseries2 = {
        buckets: bucketOrder,
        lines: lines2,
        timeColumn: timeCol.name,
        valueUnit: valueUnit2
      };
      const drop2 = trailingPartialBuckets(bucketOrder);
      if (drop2 && bucketOrder.length - drop2 >= 2) {
        timeseries2 = trimTrailing(timeseries2, drop2);
      }
      return { ...base2, kind: "timeseries", timeseries: timeseries2 };
    }
    const buckets = datarows.map((r) => asString(r[tIdx]));
    const lines = numberCols.map((c) => {
      const ci = idxOf(c.name);
      return { label: c.name, points: datarows.map((r) => toNumber(r[ci])) };
    });
    const valueUnit = numberCols.every((c) => isDurationNanosColumn(c.name)) ? "nanos" : "count";
    let timeseries = {
      buckets,
      lines,
      timeColumn: timeCol.name,
      valueUnit
    };
    const drop = trailingPartialBuckets(buckets);
    if (drop && buckets.length - drop >= 2) {
      timeseries = trimTrailing(timeseries, drop);
    }
    return { ...base2, kind: "timeseries", timeseries };
  }
  if (stringCols.length === 1 && numberCols.length === 1 && datarows.length > 1) {
    const labelIdx = idxOf(stringCols[0].name);
    const valIdx = idxOf(numberCols[0].name);
    const bars = datarows.map((r) => ({ label: asString(r[labelIdx]) || "(empty)", value: toNumber(r[valIdx]) })).sort((a, b) => b.value - a.value);
    const total = bars.reduce((s, b) => s + b.value, 0);
    return {
      ...base2,
      kind: "bars",
      bars: { labelColumn: stringCols[0].name, valueColumn: numberCols[0].name, bars, total }
    };
  }
  if (datarows.length === 1 && numberCols.length >= 1 && stringCols.length === 0 && timeCols.length === 0) {
    const row = datarows[0];
    const stats = numberCols.map((c) => {
      const v = toNumber(row[idxOf(c.name)]);
      const display = isDurationNanosColumn(c.name) ? formatDurationNanos(v) : fmtNumber(v);
      return { label: c.name, value: v, display };
    });
    return { ...base2, kind: "stat", stat: { stats } };
  }
  return base2;
}
function vizFromRows(columns, rows, hint) {
  const schema = columns.map((name) => ({ name, type: "" }));
  const nat = inferViz({ schema, datarows: rows, total: rows.length, size: rows.length });
  if (!hint || hint === nat.kind) return nat;
  const idxOf = (name) => nat.columns.findIndex((c) => c.name === name);
  const numberCols = nat.columns.filter((c) => c.role === "number");
  const stringCols = nat.columns.filter((c) => c.role === "string");
  const timeCols = nat.columns.filter((c) => c.role === "time");
  if (hint === "table") return { ...nat, kind: "table" };
  if (hint === "bars" && stringCols.length >= 1 && numberCols.length >= 1) {
    const labelIdx = idxOf(stringCols[0].name);
    const valIdx = idxOf(numberCols[0].name);
    const bars = rows.map((r) => ({ label: asString(r[labelIdx]) || "(empty)", value: toNumber(r[valIdx]) })).sort((a, b) => b.value - a.value);
    return {
      ...nat,
      kind: "bars",
      bars: {
        labelColumn: stringCols[0].name,
        valueColumn: numberCols[0].name,
        bars,
        total: bars.reduce((s, b) => s + b.value, 0)
      }
    };
  }
  if (hint === "stat" && numberCols.length >= 1 && rows.length >= 1) {
    const row = rows[0];
    const stats = numberCols.map((c) => {
      const v = toNumber(row[idxOf(c.name)]);
      const display = isDurationNanosColumn(c.name) ? formatDurationNanos(v) : fmtNumber(v);
      return { label: c.name, value: v, display };
    });
    return { ...nat, kind: "stat", stat: { stats } };
  }
  if (hint === "timeseries" && numberCols.length >= 1) {
    const timeCol = timeCols[0] ?? nat.columns[0];
    const tIdx = idxOf(timeCol.name);
    const buckets = rows.map((r) => asString(r[tIdx]));
    const lines = numberCols.map((c) => {
      const ci = idxOf(c.name);
      return { label: c.name, points: rows.map((r) => toNumber(r[ci])) };
    });
    const valueUnit = numberCols.every((c) => isDurationNanosColumn(c.name)) ? "nanos" : "count";
    return {
      ...nat,
      kind: "timeseries",
      timeseries: { buckets, lines, timeColumn: timeCol.name, valueUnit }
    };
  }
  return nat;
}

// packages/ui/src/apps/ppl/query/schema.ts
import { z as z13 } from "zod";
var inputSchema8 = {
  dataSourceId: dataSourceIdField(),
  query: z13.string().describe(
    "Complete PPL query starting with `source = <index>`. Time: `DATE_SUB(NOW(), INTERVAL n UNIT)` or literal UTC. Never use `now-1h`. Viz inferred: `stats\u2026by span(time,Nm)` \u2192 line; `stats\u2026by field` \u2192 bars; single row \u2192 stat cards; else table."
  ),
  dataset: z13.string().optional().describe("Index pattern title (the `source = \u2026` value). Defaults to parsing from query."),
  title: z13.string().optional().describe("Short title shown as card header.")
};

// src/apps/ppl/query/tool.ts
function summarize4(viz, title) {
  if (viz.rowCount === 0) return `${title}: query returned no rows.`;
  switch (viz.kind) {
    case "bars": {
      const top = (viz.bars?.bars ?? []).slice(0, 3).map((b) => `${b.label} (${Math.round(b.value).toLocaleString()})`).join(", ");
      const total = viz.bars ? Math.round(viz.bars.total).toLocaleString() : "0";
      return `${title}: ${viz.rowCount} groups, total ${total}. Top: ${top}.`;
    }
    case "stat": {
      const parts = (viz.stat?.stats ?? []).map((s) => `${s.label} = ${s.display}`).join(", ");
      return parts || `${title}: 1 row.`;
    }
    case "timeseries": {
      const series = (viz.timeseries?.lines ?? []).map((l) => l.label).join(", ");
      return `${title}: time series over ${viz.timeseries?.buckets.length ?? 0} buckets \u2014 ${series}.`;
    }
    default:
      return `${title}: ${viz.rowCount} row(s), columns: ${viz.columns.map((c) => c.name).join(", ")}.`;
  }
}
var queryRoute2 = defineRoute({
  id: "query",
  tool: {
    title: "Run PPL query",
    description: "Execute a PPL query and return rows + shape summary. Primary exploration tool \u2014 renders no widget, call freely. After exploring, present with the specialized widget for the shape (`traces_*`, `agent-trace_*`, `instrumentation-score_evaluate`, etc.) or `report_dashboard` (query/kpis/comparison). Use `describe_fields` to confirm field names. Time filters: `DATE_SUB(NOW(), INTERVAL n UNIT)` \u2014 never `now-1h`. Sort by alias: `stats count() as cnt | sort - cnt`. Rescale in `eval` BEFORE `stats` (PPL rejects arithmetic on aggregates). Integer division floors: a ratio of two integer columns (e.g. `errors / total`) yields 0 \u2014 multiply by `1.0` first (`errors * 1.0 / total`). For a trace waterfall: `traces_details`; spans+logs: `traces_cross-signal-join`.",
    inputSchema: inputSchema8
  },
  // The echo caps at ~30 rows. PPL paginates with `head <size> from <offset>`
  // (offset is 0-based; see sql/docs/user/ppl/cmd/head.md), so the model can
  // walk a long result deterministically instead of assuming it saw everything.
  echoHint: "\u21B3 Only the first rows are shown. PPL paginates: append `| head <size> from <offset>` to page through the rest (offset is 0-based, e.g. `| head 30 from 30` for the next 30). Add a `sort` first for a stable order, or narrow with `where`/a shorter time window to fit the whole answer.",
  handler: async ({ dataSourceId: suppliedDataSourceId, query, dataset, title }, ctx) => {
    const dataSourceId = await ctx.osUi.resolveDataSourceId(suppliedDataSourceId);
    const q = query.trim();
    const ds = dataset?.trim() || datasetFromQuery(q) || DEFAULT_DATASET;
    const label = title?.trim() || "PPL result";
    ctx.logger.log("[ppl.query] PPL: " + q);
    try {
      const result = await ctx.osUi.runPpl(dataSourceId, q, ds);
      const viz = inferViz(result);
      return {
        props: { query: q, title: label, table: viz.table },
        text: summarize4(viz, label)
      };
    } catch (err) {
      const msg = pplErrorHint(err, ds, q);
      ctx.logger.error("[ppl.query] PPL failed: " + msg);
      return {
        props: { query: q, title: label, error: msg },
        text: "PPL query failed: " + msg,
        isError: true
      };
    }
  }
});

// src/apps/ppl/index.ts
var pplApp = defineApp({
  id: "ppl",
  title: "PPL query",
  description: "Run an arbitrary PPL query and render the result as the best-fit widget (line chart, bars, stat cards, or table). The model writes the PPL; the viz is inferred from the result shape.",
  routes: [queryRoute2]
});

// packages/ui/src/apps/report/dashboard/schema.ts
import { z as z15 } from "zod";

// packages/ui/src/apps/_shared/viz-schema.ts
import { z as z14 } from "zod";
var columnSchema = z14.object({
  name: z14.string(),
  role: z14.enum(["number", "string", "time"]),
  type: z14.string()
});
var tableSchema = z14.object({
  columns: z14.array(z14.string()),
  rows: z14.array(z14.array(z14.string()))
});
var barsSchema = z14.object({
  labelColumn: z14.string(),
  valueColumn: z14.string(),
  bars: z14.array(z14.object({ label: z14.string(), value: z14.number() })),
  total: z14.number()
});
var statSchema = z14.object({
  stats: z14.array(
    z14.object({ label: z14.string(), value: z14.number(), display: z14.string() })
  )
});
var timeseriesSchema = z14.object({
  buckets: z14.array(z14.string()),
  lines: z14.array(z14.object({ label: z14.string(), points: z14.array(z14.number()) })),
  timeColumn: z14.string(),
  valueUnit: z14.enum(["nanos", "count"]),
  /**
   * Optional baseline / SLO reference value, drawn as a dashed line on the
   * shared y-scale. Not produced by `inferViz` (which only sees the result
   * shape) — a caller like `report_dashboard` injects it from a user-supplied
   * panel threshold.
   */
  threshold: z14.number().optional(),
  /**
   * The OSD metrics-view "Metric/Value" table: EVERY result series as a light
   * label + latest-value row (`null` → "—"), even when `lines` charts only the
   * top-N by magnitude. Lets a many-series PromQL render stay readable (capped
   * chart) without hiding data (full table beneath). Absent for small results
   * where `lines` already covers every series. Populated by the `query`
   * panel-builder, not `inferViz`.
   */
  seriesTable: z14.array(z14.object({ series: z14.string(), value: z14.number().nullable() })).optional(),
  /** True total distinct series — `≥ lines.length` when the chart is capped. */
  seriesCount: z14.number().optional()
});
var queriesSchema = z14.array(
  z14.object({
    label: z14.string(),
    query: z14.string(),
    language: z14.enum(["ppl", "promql"])
  })
).optional();
var vizFields = {
  kind: z14.enum(["timeseries", "bars", "stat", "table"]),
  columns: z14.array(columnSchema),
  rowCount: z14.number(),
  table: tableSchema,
  bars: barsSchema.optional(),
  stat: statSchema.optional(),
  timeseries: timeseriesSchema.optional(),
  queries: queriesSchema
};
var vizSchema = z14.object(vizFields);

// packages/ui/src/apps/report/dashboard/schema.ts
var toneEnum2 = z15.enum(["accent", "danger", "warn", "success", "info", "neutral"]);
var KPI_GOOD_WHEN = z15.enum(["higher", "lower"]).optional().describe(
  "Which delta direction is favorable, so the delta is colored from the data: `higher` (e.g. throughput, score) \u2014 positive delta is success; `lower` (e.g. error rate, latency) \u2014 negative delta is success. Omit when there is no good/bad direction."
);
var kpiCardInputRef = z15.object({
  label: z15.string().describe("Uppercase metric name (e.g. `P50 LATENCY`, `ERROR RATE`)."),
  query: z15.string().describe(
    "PPL (`source = \u2026`) OR PromQL (instant) that returns a single scalar. The first numeric column of the first row is the headline value."
  ),
  language: z15.enum(["ppl", "promql"]).optional().describe("Override auto-detected language."),
  dataSourceId: dataSourceIdField({ kind: "either", note: "Per-card override." }),
  dataset: z15.string().optional().describe("PPL dataset; ignored for PromQL."),
  unit: z15.enum(["ms", "ns", "s", "bytes", "pct", "count"]).optional().describe(
    "How to format the returned scalar: `ms`/`ns`/`s` \u2192 human duration, `bytes` \u2192 MB/GB, `pct` \u2192 percent (multiply by 100 if the value is 0..1), `count` \u2192 grouped integer. Default: format as a plain number with grouping."
  ),
  compareWindow: z15.string().optional().describe(
    'Optional prior window for delta (PromQL only, e.g. `24h` \u2192 "vs 24h ago"). PPL panels: bake the comparison into the query itself (e.g. two stats in one row).'
  ),
  goodWhen: KPI_GOOD_WHEN
});
var kpisInput = z15.object({
  kind: z15.literal("kpis"),
  kpis: z15.array(kpiCardInputRef).min(1).max(6).describe(
    "1\u20136 KPI cards. Each card declares a `query` returning a single scalar; the handler runs it and renders the value. The displayed number is NEVER typed by the agent \u2014 it comes from the API."
  )
});
var querySpecRef = z15.object({
  label: z15.string().describe("Series/card label (e.g. `p99`, `errors`, `REQUESTS`). Used as the line/stat/bar name."),
  query: z15.string().describe("PPL (`source = \u2026`) OR PromQL. Auto-detected; override via `language`."),
  language: z15.enum(["ppl", "promql"]).optional().describe("Override auto-detected language."),
  dataSourceId: dataSourceIdField({ kind: "either", note: "Per-query override." }),
  dataset: z15.string().optional().describe("PPL index pattern; ignored for PromQL.")
});
var queryInput = z15.object({
  kind: z15.literal("query"),
  renderAs: z15.enum(["timeseries", "bars", "stat", "table"]).describe(
    "How to render the query results: `timeseries` \u2014 overlay query line(s) on ONE chart, joined on a shared time axis. ONLY overlay COMMENSURABLE series: same unit AND same source/step (e.g. p50/p95/p99 latency from one Prometheus). Series on different y-scales (req/s vs error-count) squash each other flat, and series from different backends (PPL\u2192OpenSearch vs PromQL\u2192Prometheus) rarely share timestamps \u2192 sparse, jagged lines. For unlike metrics, use SEPARATE charts (one report_dashboard call each), not one overlay. `stat` \u2014 each query \u2192 one stat card (its first numeric scalar); mixing units/sources is fine here. `bars` \u2014 ONE query whose rows are (category, value) \u2192 ranked bars, or many scalar queries \u2192 one bar each; `table` \u2014 exactly ONE query rendered as its raw result rows."
  ),
  queries: z15.array(querySpecRef).min(1).max(6).describe(
    "1\u20136 queries. `stat` and scalar `bars` happily mix units/sources; `timeseries` should overlay only commensurable same-source series (see `renderAs`); `table` and categorical `bars` take exactly one. VALIDATE each via `ppl_query`/`metrics_query` first \u2014 a broken query shows an error in place."
  ),
  timeRange: z15.string().optional().describe("PromQL window shorthand (e.g. `1h`, `24h`). PPL queries ignore this \u2014 put time filters in the PPL itself."),
  from: z15.string().optional().describe("PromQL window start (date-math or absolute UTC). PPL ignores."),
  to: z15.string().optional().describe("PromQL window end. PPL ignores."),
  threshold: z15.number().optional().describe("Optional SLO/baseline dashed line on a `timeseries` render (native y units, e.g. nanoseconds).")
});
var metricUnitEnum = z15.enum(["ms", "ns", "s", "bytes", "pct", "count"]);
var comparisonCellInput = z15.object({
  query: z15.string().optional().describe("PPL (`source = \u2026`) OR PromQL returning a single scalar for this (row \xD7 side) cell. Auto-detected; override via `language`."),
  language: z15.enum(["ppl", "promql"]).optional().describe("Override auto-detected language."),
  dataSourceId: dataSourceIdField({ kind: "either", note: "Per-cell override; defaults to the dashboard-level id." }),
  dataset: z15.string().optional().describe("PPL dataset; ignored for PromQL."),
  value: z15.string().optional().describe("ESCAPE HATCH for a value no query can reach (an offline eval target, a typed SLA). Renders verbatim and UNTONED. Prefer `query` \u2014 the value is data only when fetched.")
});
var comparisonMetricInput = z15.object({
  label: z15.string().describe("Row label (e.g. `Score`, `Safety`, `p95 latency`). The SAME label runs across every side."),
  unit: metricUnitEnum.optional().describe("How to format each cell's returned scalar (see `kpis` units). Default: plain number with grouping."),
  goodWhen: z15.enum(["higher", "lower"]).optional().describe("Which direction is favorable, so each non-baseline cell's tone is derived from its delta vs the baseline column: `higher` (e.g. score) \u2192 an increase is success; `lower` (e.g. latency, error rate) \u2192 a decrease is success. Omit when there is no good/bad direction."),
  cells: z15.array(comparisonCellInput).min(2).max(3).describe("One cell per side, INDEX-ALIGNED to `sides` (cells[0] is the baseline column). Each cell declares a `query`; the handler runs it and renders the value.")
});
var comparisonSideInput = z15.object({
  label: z15.string().describe("Column title (e.g. `Run #45 (baseline)`). Side 0 is the baseline the others are toned against."),
  tone: toneEnum2.optional().describe("Tone of the leading dot beside the column label (e.g. `success` baseline, `danger` regressed). Default `neutral`.")
});
var comparisonInput = z15.object({
  kind: z15.literal("comparison"),
  sides: z15.array(comparisonSideInput).min(2).max(3).describe("2\u20133 columns (the A/B/C sides). Side 0 is the baseline; other columns' cell values are colored by their delta vs it."),
  metrics: z15.array(comparisonMetricInput).min(1).max(12).describe("Metric rows. Each row runs one query per side (index-aligned to `sides`); the handler fetches every cell and derives the diff tone. The displayed numbers are NEVER typed by the agent \u2014 they come from the API.")
});
var reportInput = z15.discriminatedUnion("kind", [
  queryInput,
  kpisInput,
  comparisonInput
]);
var inputSchema9 = {
  dataSourceId: dataSourceIdField({
    kind: "either",
    note: "Dashboard default; override per query/cell. PromQL queries need a `data-connection` id here or per cell."
  }),
  ...presentationInputFields,
  /**
   * The discriminated payload — `kind` plus that kind's fields, flat at the
   * top level. Zod's `extend` is not safe over a discriminated union, so this
   * isn't expressible as `inputSchema = {...input, ...}`; the route's inputSchema
   * field carries the union directly via `report` below, and `dataSourceId` /
   * `narrative` / `suggestions` are passed through the route wrapper.
   */
  report: reportInput.describe(
    "Pick `kind` first, then fill that kind's fields: `query` (1\u20136 PPL/PromQL queries rendered via `renderAs` as a line chart / bars / stat cards / table; overlay only commensurable same-source series on a `timeseries`), `kpis` (1\u20136 instant-query cards with optional delta vs a prior window), `comparison` (2\u20133 side-by-side columns over shared metric rows \u2014 one query per cell; non-baseline values are colored by their delta vs the baseline column). PROVENANCE: every displayed value comes from the API; the agent supplies queries/ids/scope and writes only `narrative` and `suggestions`. Headline metric first \u2014 for multi-pattern stories, call this tool once per pattern in sequence. To render a TRACE (steps/excerpts) use `agent-trace_details`/`agent-trace_evidence`; for an instrumentation score use `instrumentation-score_evaluate`."
  )
};
var kpiCardRendered = z15.object({
  label: z15.string(),
  value: z15.string(),
  delta: z15.string().optional(),
  deltaTone: toneEnum2.optional(),
  valueTone: toneEnum2.optional()
});
var comparisonMetricRendered = z15.object({
  label: z15.string(),
  value: z15.string(),
  valueTone: toneEnum2.optional()
});
var comparisonSideRendered = z15.object({
  label: z15.string(),
  tone: toneEnum2.optional(),
  metrics: z15.array(comparisonMetricRendered)
});
var patternKindEnum = z15.enum(["query", "kpis", "comparison"]);
var propsSchema6 = z15.object({
  ...presentationPropsFields,
  kind: patternKindEnum,
  /** `query` payload — the inferred viz (chart/bars/stat/table) from the API. */
  viz: vizSchema.optional(),
  /** `kpis` payload — the rendered metric cards. */
  kpis: z15.array(kpiCardRendered).optional(),
  /** `comparison` payload — sides with API-fetched, diff-toned metric rows. */
  comparison: z15.array(comparisonSideRendered).optional(),
  /**
   * Source queries for a `kpis` or `comparison` panel, shown verbatim as a
   * footer beneath the cards/matrix (the `query` kind carries its own queries
   * inside `viz.queries`). Handler-populated from the agent's query specs.
   */
  queries: queriesSchema,
  /** A panel-level error message — surfaces when the fetch failed but the
   *  widget should still render something. */
  error: z15.string().optional(),
  /** Deep link opening the underlying data in OpenSearch Dashboards' Explore view. */
  osdUrl: z15.string().optional()
});

// packages/ui/src/apps/_shared/QueryList.tsx
import { jsx as jsx50, jsxs as jsxs28 } from "react/jsx-runtime";
function QueryList({ queries }) {
  if (!queries || queries.length === 0) return null;
  return /* @__PURE__ */ jsx50("div", { className: "flex flex-col gap-2 border-t border-[var(--surface-border)] px-3 py-2", children: queries.map((q, i) => /* @__PURE__ */ jsxs28("div", { className: "flex flex-col gap-1", children: [
    /* @__PURE__ */ jsxs28("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ jsx50("span", { className: "glass-eyebrow text-[var(--ink-mute)]", children: q.label }),
      /* @__PURE__ */ jsx50("span", { className: "rounded-[4px] bg-[var(--surface-border)] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-[var(--ink-soft)]", children: q.language })
    ] }),
    /* @__PURE__ */ jsx50(CodeBlock, { code: q.query, language: q.language, wrap: true, maxHeight: "none" })
  ] }, i)) });
}

// packages/ui/src/apps/_shared/VizPanel.tsx
import { Fragment as Fragment7, useMemo as useMemo7, useState as useState11 } from "react";
import { Fragment as Fragment8, jsx as jsx51, jsxs as jsxs29 } from "react/jsx-runtime";
var LINE_TONES = ["info", "accent", "danger", "warn", "success"];
var CHART_KINDS = [
  { id: "line", label: "Line" },
  { id: "bar", label: "Bar" },
  { id: "area", label: "Area" },
  { id: "metric", label: "Metric" }
];
function lastFinite(points) {
  for (let i = points.length - 1; i >= 0; i--) {
    if (Number.isFinite(points[i])) return points[i];
  }
  return null;
}
function VizPanel({
  title,
  viz,
  subtitle
}) {
  const bodyKind = viz.rowCount === 0 ? "empty" : viz.kind;
  const metaText = subtitle ?? `${viz.kind} \xB7 ${formatInt(viz.rowCount)} row${viz.rowCount === 1 ? "" : "s"}`;
  const isChart = bodyKind === "timeseries" && (viz.timeseries?.lines.length ?? 0) > 0;
  if (isChart) {
    return /* @__PURE__ */ jsx51(m.div, { variants: fadeInUp, initial: "hidden", animate: "visible", children: /* @__PURE__ */ jsx51(TimeSeries, { viz, title, meta: metaText }) });
  }
  return /* @__PURE__ */ jsx51(m.div, { variants: fadeInUp, initial: "hidden", animate: "visible", children: /* @__PURE__ */ jsxs29(Card, { children: [
    /* @__PURE__ */ jsx51(CardHeader, { className: "px-3 py-2", children: /* @__PURE__ */ jsxs29(CardTitle, { className: "text-sm", children: [
      title,
      /* @__PURE__ */ jsx51("span", { className: "ml-2 font-normal text-[var(--ink-mute)]", children: metaText })
    ] }) }),
    /* @__PURE__ */ jsxs29(CardContent, { className: "p-3", children: [
      /* @__PURE__ */ jsx51(AnimatePresence, { mode: "wait", initial: false, children: /* @__PURE__ */ jsx51(
        m.div,
        {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          exit: { opacity: 0 },
          transition: ease,
          children: viz.rowCount === 0 ? /* @__PURE__ */ jsx51("div", { className: "app-muted", children: "Query returned no rows." }) : viz.kind === "stat" ? /* @__PURE__ */ jsx51(StatCards, { viz }) : viz.kind === "bars" ? /* @__PURE__ */ jsx51(Bars, { viz }) : viz.kind === "timeseries" ? /* @__PURE__ */ jsx51(TimeSeries, { viz }) : /* @__PURE__ */ jsx51(ResultTable, { viz, title })
        },
        bodyKind
      ) }),
      viz.queries && viz.queries.length > 0 && // Flush the query footer to the card edges so it reads as a footer
      // band beneath the body (cards, bars, or table), like the chart panel.
      /* @__PURE__ */ jsx51("div", { className: "-mx-3 -mb-3 mt-3", children: /* @__PURE__ */ jsx51(QueryList, { queries: viz.queries }) })
    ] })
  ] }) });
}
function StatCards({ viz }) {
  const stats = viz.stat?.stats ?? [];
  return /* @__PURE__ */ jsx51("div", { className: "flex flex-wrap gap-3", children: stats.map((s) => /* @__PURE__ */ jsx51(
    "div",
    {
      className: "min-w-[120px] flex-1 rounded-lg border border-[var(--ink-hairline)] bg-[var(--surface-muted)] px-4 py-3",
      children: /* @__PURE__ */ jsx51(Stat, { label: s.label, value: s.display, size: "md" })
    },
    s.label
  )) });
}
var BARS_LIMIT = 30;
function Bars({ viz }) {
  const bars = viz.bars?.bars ?? [];
  const max = bars.reduce((m2, b) => b.value > m2 ? b.value : m2, 0) || 1;
  const total = viz.bars?.total || 1;
  const shown = bars.slice(0, BARS_LIMIT);
  return /* @__PURE__ */ jsxs29(Fragment8, { children: [
    /* @__PURE__ */ jsx51("div", { className: "flex flex-col gap-1.5", children: shown.map((b, i) => /* @__PURE__ */ jsxs29(
      m.div,
      {
        initial: { opacity: 0, x: -6 },
        animate: { opacity: 1, x: 0 },
        transition: { ...ease, delay: Math.min(i, 12) * 0.03 },
        className: "flex items-center gap-2 text-xs",
        children: [
          /* @__PURE__ */ jsx51(
            "div",
            {
              className: "w-40 shrink-0 truncate font-[family-name:var(--font-mono)] text-[var(--ink-soft)]",
              title: b.label,
              children: b.label
            }
          ),
          /* @__PURE__ */ jsx51("div", { className: "flex-1", children: /* @__PURE__ */ jsx51(HBar, { value: b.value, max, height: 14 }) }),
          /* @__PURE__ */ jsxs29(Mono, { className: "w-14 shrink-0 text-right text-[var(--ink-mute)]", children: [
            Math.round(b.value / total * 100),
            "%"
          ] }),
          /* @__PURE__ */ jsx51(Mono, { className: "w-16 shrink-0 text-right font-semibold text-[var(--ink-bright)]", children: formatInt(b.value) })
        ]
      },
      i
    )) }),
    bars.length > BARS_LIMIT && /* @__PURE__ */ jsx51(TruncationFooter, { showing: shown.length, limit: BARS_LIMIT, total: bars.length, noun: "bars" })
  ] });
}
function TimeSeries({
  viz,
  title,
  meta
}) {
  const ts = viz.timeseries;
  const [kind, setKind] = useState11("line");
  const [wrap, setWrap] = useState11(false);
  const themeTick = useThemeTick();
  const palette = useMemo7(() => seriesPalette(), [themeTick]);
  if (!ts || ts.lines.length === 0) return /* @__PURE__ */ jsx51(ResultTable, { viz });
  const formatValue = ts.valueUnit === "nanos" ? formatDurationNanos : formatCount;
  const series = ts.lines.map((l, i) => ({
    label: l.label,
    points: l.points,
    tone: LINE_TONES[i % LINE_TONES.length]
  }));
  const colorFor = (i) => series[i].tone ? toneColor(series[i].tone) : palette[i % palette.length];
  const seriesCount = ts.seriesCount ?? ts.lines.length;
  const capped = seriesCount > ts.lines.length;
  const tableRows = ts.seriesTable ?? ts.lines.map((l) => ({ series: l.label, value: lastFinite(l.points) }));
  const xLabels = ts.buckets.map(formatTimeTick);
  const chartBody = kind === "metric" ? /* @__PURE__ */ jsx51(MetricGrid, { series: ts.lines, colorFor, format: formatValue }) : /* @__PURE__ */ jsx51(
    ChartPanel,
    {
      frame: false,
      legend: false,
      series,
      kind,
      xLabels,
      threshold: ts.threshold,
      thresholdLabel: ts.threshold !== void 0 ? `baseline ${formatValue(ts.threshold)}` : void 0,
      thresholdTone: "danger",
      height: 220,
      formatValue
    }
  );
  const panel = /* @__PURE__ */ jsxs29("div", { className: "overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)]", children: [
    title !== void 0 && /* @__PURE__ */ jsxs29("div", { className: "flex items-center justify-between border-b border-[var(--surface-border)] px-3 py-2", children: [
      /* @__PURE__ */ jsx51("span", { className: "text-[12px] font-semibold text-[var(--ink-bright)]", children: title }),
      meta && /* @__PURE__ */ jsx51("span", { className: "text-[10px] text-[var(--ink-mute)]", children: meta })
    ] }),
    /* @__PURE__ */ jsxs29("div", { className: "p-3", children: [
      /* @__PURE__ */ jsx51("div", { className: "mb-2 flex justify-end", children: /* @__PURE__ */ jsx51(ChartKindToggle, { kind, onChange: setKind }) }),
      /* @__PURE__ */ jsx51(AnimatePresence, { mode: "wait", initial: false, children: /* @__PURE__ */ jsx51(m.div, { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: ease, children: chartBody }, kind) }),
      /* @__PURE__ */ jsx51(
        ResultSeriesLegend,
        {
          series: ts.lines,
          seriesCount,
          colorFor,
          wrap,
          onToggleWrap: () => setWrap((w) => !w),
          thresholdLabel: ts.threshold !== void 0 ? `baseline ${formatValue(ts.threshold)}` : void 0
        }
      ),
      /* @__PURE__ */ jsx51("div", { className: "-mx-3 mt-3 border-t border-[var(--surface-border)]", children: /* @__PURE__ */ jsx51(MetricValueTable, { rows: tableRows, wrap, format: formatValue, capped, chartedCount: ts.lines.length }) })
    ] }),
    viz.queries && viz.queries.length > 0 && /* @__PURE__ */ jsx51(QueryList, { queries: viz.queries })
  ] });
  return panel;
}
function ChartKindToggle({
  kind,
  onChange
}) {
  return /* @__PURE__ */ jsx51("div", { className: "inline-flex overflow-hidden rounded-[8px] border border-[var(--surface-border)] text-[12px]", children: CHART_KINDS.map((ck) => /* @__PURE__ */ jsx51(
    Button,
    {
      variant: kind === ck.id ? "default" : "outline",
      size: "sm",
      onClick: () => onChange(ck.id),
      className: cn(
        "rounded-none border-l border-[var(--surface-border)] first:rounded-l-[8px] first:border-l-0 last:rounded-r-[8px]",
        kind === ck.id ? "" : "bg-[var(--surface)]"
      ),
      children: ck.label
    },
    ck.id
  )) });
}
function ResultSeriesLegend({
  series,
  seriesCount,
  colorFor,
  wrap,
  onToggleWrap,
  thresholdLabel
}) {
  const capped = seriesCount > series.length;
  return /* @__PURE__ */ jsxs29("div", { className: "mt-2", children: [
    /* @__PURE__ */ jsxs29("div", { className: "mb-1.5 flex items-center gap-3", children: [
      /* @__PURE__ */ jsx51("span", { className: "text-[12.5px] text-[var(--ink-soft)]", children: capped ? /* @__PURE__ */ jsxs29(Fragment8, { children: [
        "showing top ",
        /* @__PURE__ */ jsx51("strong", { className: "text-[var(--ink-bright)]", children: formatInt(series.length) }),
        " of",
        " ",
        /* @__PURE__ */ jsx51("strong", { className: "text-[var(--ink-bright)]", children: formatInt(seriesCount) }),
        " result series"
      ] }) : /* @__PURE__ */ jsxs29(Fragment8, { children: [
        /* @__PURE__ */ jsx51("strong", { className: "text-[var(--ink-bright)]", children: formatInt(seriesCount) }),
        " result series"
      ] }) }),
      /* @__PURE__ */ jsxs29(
        "button",
        {
          type: "button",
          onClick: onToggleWrap,
          className: "flex items-center gap-1.5 text-[11.5px] text-[var(--ink-mute)] transition-colors hover:text-[var(--ink)]",
          children: [
            /* @__PURE__ */ jsx51(
              "span",
              {
                className: cn(
                  "inline-flex h-3 w-5 items-center rounded-full px-[1px] transition-colors",
                  wrap ? "bg-[var(--accent-bright)]" : "bg-[var(--surface-border)]"
                ),
                children: /* @__PURE__ */ jsx51(
                  "span",
                  {
                    className: cn(
                      "h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-transform",
                      wrap ? "translate-x-2" : "translate-x-0"
                    )
                  }
                )
              }
            ),
            "Wrap labels"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs29("div", { className: "flex flex-wrap gap-x-4 gap-y-1", children: [
      series.map((s, i) => /* @__PURE__ */ jsxs29("span", { className: "flex items-center gap-1.5", title: s.label, children: [
        /* @__PURE__ */ jsx51(
          "span",
          {
            className: "inline-block h-[6px] w-[14px] shrink-0 rounded-[1px]",
            style: { backgroundColor: colorFor(i) }
          }
        ),
        /* @__PURE__ */ jsx51(
          Mono,
          {
            className: cn(
              "text-[11px] text-[var(--ink-soft)]",
              wrap ? "whitespace-pre-wrap break-all" : "max-w-[280px] truncate"
            ),
            children: s.label
          }
        )
      ] }, i)),
      thresholdLabel && /* @__PURE__ */ jsxs29("span", { className: "flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx51(
          "span",
          {
            className: "inline-block h-[2px] w-[14px] shrink-0 border-t border-dashed",
            style: { borderColor: toneColor("danger") }
          }
        ),
        /* @__PURE__ */ jsx51("span", { className: "text-[11px] text-[var(--ink-soft)]", children: thresholdLabel })
      ] })
    ] })
  ] });
}
function MetricValueTable({
  rows,
  wrap,
  format,
  capped,
  chartedCount
}) {
  return /* @__PURE__ */ jsxs29(Fragment8, { children: [
    capped && /* @__PURE__ */ jsxs29("div", { className: "px-3 py-2 text-[11.5px] text-[var(--ink-mute)]", children: [
      "charting top ",
      /* @__PURE__ */ jsx51("strong", { className: "text-[var(--ink-bright)]", children: formatInt(chartedCount) }),
      " of",
      " ",
      /* @__PURE__ */ jsx51("strong", { className: "text-[var(--ink-bright)]", children: formatInt(rows.length) }),
      " result series"
    ] }),
    /* @__PURE__ */ jsxs29(Table, { className: "text-xs", children: [
      /* @__PURE__ */ jsx51(TableHeader, { children: /* @__PURE__ */ jsxs29(TableRow, { className: "glass-eyebrow text-[var(--ink-mute)]", children: [
        /* @__PURE__ */ jsx51(TableHead, { className: "py-2", children: "Metric" }),
        /* @__PURE__ */ jsx51(TableHead, { className: "py-2 text-right", children: "Value" })
      ] }) }),
      /* @__PURE__ */ jsx51(TableBody, { children: rows.slice(0, 200).map((r, i) => /* @__PURE__ */ jsxs29(TableRow, { className: "border-b border-[var(--ink-hairline)] last:border-0", children: [
        /* @__PURE__ */ jsx51(TableCell, { className: "px-3 py-1.5", children: /* @__PURE__ */ jsx51(Mono, { className: cn("text-[var(--ink)]", wrap ? "whitespace-pre-wrap break-all" : "break-all"), children: r.series }) }),
        /* @__PURE__ */ jsx51(TableCell, { className: "px-3 py-1.5 text-right", children: /* @__PURE__ */ jsx51(Mono, { className: "font-semibold text-[var(--ink-bright)]", children: r.value == null ? "\u2014" : format(r.value) }) })
      ] }, i)) })
    ] }),
    rows.length > 200 ? /* @__PURE__ */ jsx51(TruncationFooter, { showing: 200, limit: 200, total: rows.length, noun: "series" }) : /* @__PURE__ */ jsxs29("div", { className: "px-3 py-2 text-[11.5px] text-[var(--ink-mute)]", children: [
      formatInt(rows.length),
      " result series"
    ] })
  ] });
}
function MetricGrid({
  series,
  colorFor,
  format
}) {
  return /* @__PURE__ */ jsx51(
    m.div,
    {
      className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3",
      variants: staggerContainer,
      initial: "hidden",
      animate: "visible",
      children: series.map((s, i) => {
        const v = lastFinite(s.points);
        return /* @__PURE__ */ jsx51(m.div, { variants: scaleIn, children: /* @__PURE__ */ jsxs29(WidgetBox, { className: "flex flex-col gap-1 p-3", children: [
          /* @__PURE__ */ jsxs29("span", { className: "flex items-center gap-1.5", title: s.label, children: [
            /* @__PURE__ */ jsx51(
              "span",
              {
                className: "inline-block h-[6px] w-[14px] shrink-0 rounded-[1px]",
                style: { backgroundColor: colorFor(i) }
              }
            ),
            /* @__PURE__ */ jsx51(Mono, { className: "truncate text-[10.5px] text-[var(--ink-mute)]", children: s.label })
          ] }),
          /* @__PURE__ */ jsx51(Stat, { size: "md", value: v == null ? "\u2014" : format(v) })
        ] }) }, i);
      })
    }
  );
}
function describeRow(columns, row, title) {
  const lines = columns.map((c, i) => `${c}: ${row[i] ?? ""}`).filter((l) => !l.endsWith(": "));
  const head = title ? `Row from "${title}":` : "Selected row:";
  return `${head}
${lines.join("\n")}`;
}
function RowDetail({
  columns,
  row,
  colSpan,
  title
}) {
  const obj = {};
  columns.forEach((c, i) => {
    obj[c] = row[i] ?? "";
  });
  const detail = describeRow(columns, row, title);
  return /* @__PURE__ */ jsx51("td", { colSpan, className: "bg-transparent p-0", children: /* @__PURE__ */ jsx51(
    m.div,
    {
      variants: fadeInUp,
      initial: "hidden",
      animate: "visible",
      className: "flex flex-col gap-3 px-2 py-3",
      children: /* @__PURE__ */ jsxs29(Tabs, { defaultValue: "fields", children: [
        /* @__PURE__ */ jsxs29("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxs29(TabsList, { children: [
            /* @__PURE__ */ jsx51(TabsTrigger, { value: "fields", children: "Fields" }),
            /* @__PURE__ */ jsx51(TabsTrigger, { value: "raw", children: "Raw" })
          ] }),
          /* @__PURE__ */ jsx51(
            DetailActions,
            {
              className: "shrink-0",
              investigatePrompt: `Investigate this result row and explain what it indicates, then suggest next steps:

${detail}`,
              contextText: detail,
              investigateTitle: "Ask the assistant to investigate this row now",
              contextTitle: "Add this row to the assistant's context for your next message"
            }
          )
        ] }),
        /* @__PURE__ */ jsx51(TabsContent, { value: "fields", className: "mt-3", children: /* @__PURE__ */ jsx51("div", { className: "grid max-h-[360px] grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5 overflow-auto text-xs", children: columns.map((c, i) => /* @__PURE__ */ jsxs29("div", { className: "contents", children: [
          /* @__PURE__ */ jsx51("div", { className: "break-all text-[var(--ink-mute)]", children: c }),
          /* @__PURE__ */ jsx51("div", { className: "break-all whitespace-pre-wrap text-[var(--ink)]", children: row[i] || "\u2014" })
        ] }, c)) }) }),
        /* @__PURE__ */ jsx51(TabsContent, { value: "raw", className: "mt-3", children: /* @__PURE__ */ jsx51(CodeBlock, { code: obj, language: "json", maxHeight: "360px" }) })
      ] })
    }
  ) });
}
function ResultTable({ viz, title }) {
  const { columns, rows } = viz.table;
  const [openIdx, setOpenIdx] = useState11(null);
  const colSpan = columns.length + 1;
  return /* @__PURE__ */ jsxs29(Fragment8, { children: [
    /* @__PURE__ */ jsxs29(Table, { className: "text-xs", children: [
      /* @__PURE__ */ jsx51(TableHeader, { children: /* @__PURE__ */ jsxs29(TableRow, { className: "glass-eyebrow text-[var(--ink-mute)]", children: [
        /* @__PURE__ */ jsx51(TableHead, { className: "w-[20px] py-2" }),
        columns.map((c) => /* @__PURE__ */ jsx51(TableHead, { className: "py-2 whitespace-nowrap", children: c }, c))
      ] }) }),
      /* @__PURE__ */ jsx51(TableBody, { children: rows.slice(0, 200).map((row, ri) => {
        const isOpen = openIdx === ri;
        return /* @__PURE__ */ jsxs29(Fragment7, { children: [
          /* @__PURE__ */ jsxs29(
            TableRow,
            {
              "data-state": isOpen ? "selected" : void 0,
              onClick: () => setOpenIdx(isOpen ? null : ri),
              className: "cursor-pointer align-top",
              children: [
                /* @__PURE__ */ jsx51(TableCell, { className: "px-2 py-1.5 text-[var(--ink-mute)]", children: /* @__PURE__ */ jsx51(
                  "span",
                  {
                    className: cn(
                      "inline-block transition-transform",
                      isOpen && "rotate-90"
                    ),
                    "aria-hidden": true,
                    children: "\u203A"
                  }
                ) }),
                row.map((cell, ci) => /* @__PURE__ */ jsx51(TableCell, { className: "px-2 py-1.5 break-all", children: /* @__PURE__ */ jsx51("span", { className: "line-clamp-2", children: cell || "\u2014" }) }, ci))
              ]
            }
          ),
          isOpen && /* @__PURE__ */ jsx51(TableRow, { className: "border-0 hover:bg-transparent", children: /* @__PURE__ */ jsx51(
            RowDetail,
            {
              columns,
              row,
              colSpan,
              title
            }
          ) })
        ] }, ri);
      }) })
    ] }),
    rows.length > 200 && /* @__PURE__ */ jsx51(TruncationFooter, { showing: 200, limit: 200, total: rows.length, noun: "rows" })
  ] });
}

// packages/ui/src/apps/report/dashboard/view.tsx
import { Fragment as Fragment9, jsx as jsx52, jsxs as jsxs30 } from "react/jsx-runtime";
function DashboardView({ props }) {
  return /* @__PURE__ */ jsx52(ViewGuard, { props, children: (p) => /* @__PURE__ */ jsx52(DashboardViewInner, { props: p }) });
}
function DashboardViewInner({ props }) {
  return /* @__PURE__ */ jsx52(PresentationFrame, { presentation: props, category: "Report", osdUrl: props.osdUrl, children: /* @__PURE__ */ jsx52(PatternBody, { props }) });
}
function PatternBody({ props }) {
  switch (props.kind) {
    // The `query` kind carries its source queries inside the viz, so VizPanel
    // renders the footer itself. `kpis`/`comparison` are also query-backed but
    // their card/matrix bodies don't, so append the shared QueryList footer here
    // (every query-backed pattern shows the exact PPL/PromQL behind its numbers).
    case "query":
      return props.viz ? /* @__PURE__ */ jsx52(VizPanel, { title: "", viz: props.viz }) : null;
    case "kpis":
      return /* @__PURE__ */ jsxs30(Fragment9, { children: [
        /* @__PURE__ */ jsx52(MetricCards, { cards: props.kpis ?? [] }),
        /* @__PURE__ */ jsx52(QueryFooter, { queries: props.queries })
      ] });
    case "comparison":
      return /* @__PURE__ */ jsxs30(Fragment9, { children: [
        /* @__PURE__ */ jsx52(ComparisonPanel, { sides: props.comparison ?? [] }),
        /* @__PURE__ */ jsx52(QueryFooter, { queries: props.queries })
      ] });
  }
}
function QueryFooter({ queries }) {
  if (!queries || queries.length === 0) return null;
  return /* @__PURE__ */ jsx52("div", { className: "mt-3", children: /* @__PURE__ */ jsx52(QueryList, { queries }) });
}

// src/apps/report/dashboard/panel-builders/query.ts
var DEFAULT_PROMQL_RANGE = "1h";
var MAX_CHART_SERIES = 15;
async function runOne(ctx, defaultDataSourceId, spec, queryType, panel) {
  const q = spec.query.trim();
  const ds = spec.dataSourceId?.trim() || defaultDataSourceId;
  const language = spec.language ?? detectQueryLanguage(q);
  if (language === "promql") {
    if (!ds) {
      return {
        spec,
        language,
        error: "PromQL needs a Prometheus `data-connection` id \u2014 none was supplied. Call `list_data_sources` and set this query's `dataSourceId` (or the dashboard default) to a `kind: data-connection` id."
      };
    }
    let window2;
    try {
      const time = resolveTimeRange(
        { timeRange: panel.timeRange, from: panel.from, to: panel.to },
        { defaultFrom: `now-${DEFAULT_PROMQL_RANGE}` }
      );
      window2 = dateMathWindow(time) ?? { from: `now-${DEFAULT_PROMQL_RANGE}`, to: "now" };
    } catch (err) {
      return { spec, language, error: "Invalid time range: " + errorMessage(err) };
    }
    try {
      const result = await ctx.osUi.runPromql(ds, q, ds, window2, queryType);
      const series = promqlSeries(result, spec.label);
      const viz = promqlViz(series, queryType);
      return { spec, language, viz, series };
    } catch (err) {
      const msg = promqlErrorHint(err);
      ctx.logger.error(`[report.dashboard] query "${spec.label}" (promql) failed: ${msg}`);
      return { spec, language, error: msg };
    }
  }
  const dataset = spec.dataset?.trim() || datasetFromQuery(q) || DEFAULT_DATASET;
  try {
    const pplDs = await ctx.osUi.resolveDataSourceId(ds);
    const result = await ctx.osUi.runPpl(pplDs, q, dataset);
    const viz = inferViz(result);
    return { spec, language, viz, series: pplSeries(viz, spec.label) };
  } catch (err) {
    const msg = pplErrorHint(err, dataset);
    ctx.logger.error(`[report.dashboard] query "${spec.label}" (ppl) failed: ${msg}`);
    return { spec, language, error: msg };
  }
}
function promqlSeries(result, specLabel) {
  const bySeries = /* @__PURE__ */ new Map();
  for (const r of pplRows(result)) {
    const name = r.getString("Series") || asString(r.get("Labels")) || "(series)";
    const time = r.getString("Time");
    const value = r.getNumber("Value");
    if (!time || !Number.isFinite(value)) continue;
    let m2 = bySeries.get(name);
    if (!m2) bySeries.set(name, m2 = /* @__PURE__ */ new Map());
    m2.set(time, value);
  }
  const names = [...bySeries.keys()];
  return names.map((name) => ({
    label: names.length > 1 ? `${specLabel} \xB7 ${name}` : specLabel,
    bucketValues: bySeries.get(name),
    valueUnit: "count"
  }));
}
function pplSeries(viz, specLabel) {
  const ts = viz.timeseries;
  if (!ts || ts.lines.length === 0) return [];
  return ts.lines.map((line) => {
    const bucketValues = /* @__PURE__ */ new Map();
    ts.buckets.forEach((b, i) => {
      const v = line.points[i];
      if (Number.isFinite(v)) bucketValues.set(b, v);
    });
    return {
      label: ts.lines.length > 1 ? `${specLabel} \xB7 ${line.label}` : specLabel,
      bucketValues,
      valueUnit: ts.valueUnit
    };
  });
}
function promqlViz(series, queryType) {
  if (queryType === "instant" || series.length === 0) {
    const rows = series.map((s) => [s.label, [...s.bucketValues.values()].at(-1) ?? null]);
    return vizFromRows(["series", "value"], rows, rows.length === 1 ? "stat" : "bars");
  }
  return mergeTimeseries(series).viz;
}
function mergeTimeseries(allSeries) {
  const latestOf = (s) => {
    let last = null;
    for (const v of s.bucketValues.values()) if (Number.isFinite(v)) last = v;
    return last;
  };
  const magnitudeOf = (s) => {
    let peak = 0;
    for (const v of s.bucketValues.values()) {
      const a = Math.abs(v);
      if (Number.isFinite(a) && a > peak) peak = a;
    }
    return peak;
  };
  const seriesTable = allSeries.map((s) => ({ series: s.label, value: latestOf(s) }));
  const seriesCount = allSeries.length;
  const charted = allSeries.length > MAX_CHART_SERIES ? (() => {
    const top = new Set(
      [...allSeries].sort((a, b) => magnitudeOf(b) - magnitudeOf(a)).slice(0, MAX_CHART_SERIES)
    );
    return allSeries.filter((s) => top.has(s));
  })() : allSeries;
  const buckets = [...new Set(charted.flatMap((s) => [...s.bucketValues.keys()]))].sort(
    (a, b) => a.localeCompare(b)
  );
  const columns = ["Time", ...charted.map((s) => s.label)];
  const rows = buckets.map((b) => [b, ...charted.map((s) => s.bucketValues.get(b) ?? null)]);
  const viz = vizFromRows(columns, rows, "timeseries");
  if (viz.timeseries) {
    if (charted.some((s) => s.valueUnit === "nanos")) {
      viz.timeseries.valueUnit = "nanos";
    }
    viz.timeseries.seriesTable = seriesTable;
    viz.timeseries.seriesCount = seriesCount;
  }
  return { viz, alignmentWarning: alignmentWarning(charted, buckets) };
}
function alignmentWarning(allSeries, buckets) {
  if (allSeries.length < 2 || buckets.length === 0) return void 0;
  let fullyCovered = 0;
  for (const key of buckets) {
    if (allSeries.every((s) => s.bucketValues.has(key))) fullyCovered++;
  }
  const ratio = fullyCovered / buckets.length;
  if (ratio >= 0.5) return void 0;
  return `The ${allSeries.length} series share only ${Math.round(ratio * 100)}% of their time buckets \u2014 they are likely on different time grids (e.g. PPL vs PromQL hit different backends/steps), so the overlaid lines will look sparse. Re-issue the queries on a common step/window, or render them as separate charts.`;
}
function firstScalar(viz) {
  if (viz.stat?.stats.length) return viz.stat.stats[0].value;
  if (viz.bars?.bars.length) return viz.bars.bars[0].value;
  const numIdx = viz.columns.findIndex((c) => c.role === "number");
  if (numIdx >= 0 && viz.table.rows[0]) return toNumber(viz.table.rows[0][numIdx]);
  return Number.NaN;
}
function coerceKind(viz, kind) {
  return kind === viz.kind ? viz : vizFromRows(viz.table.columns, viz.table.rows, kind);
}
async function buildQueryPanel(ctx, defaultDataSourceId, panel) {
  const queryType = panel.renderAs === "timeseries" ? "range" : "instant";
  const runs = await Promise.all(
    panel.queries.map((spec) => runOne(ctx, defaultDataSourceId, spec, queryType, panel))
  );
  const ok = runs.filter((r) => !r.error);
  if (ok.length === 0) {
    return { error: runs[0]?.error ?? "All queries failed." };
  }
  let viz;
  let warning;
  switch (panel.renderAs) {
    case "timeseries": {
      const { viz: merged, alignmentWarning: alignmentWarning2 } = mergeTimeseries(ok.flatMap((r) => r.series ?? []));
      if (merged.timeseries && panel.threshold !== void 0) {
        merged.timeseries.threshold = panel.threshold;
      }
      viz = merged;
      warning = alignmentWarning2;
      break;
    }
    case "stat": {
      const columns = ok.map((r) => r.spec.label);
      const row = ok.map((r) => firstScalar(r.viz));
      viz = vizFromRows(columns, [row], "stat");
      break;
    }
    case "bars": {
      if (ok.length === 1) {
        viz = coerceKind(ok[0].viz, "bars");
      } else {
        const rows = ok.map((r) => [r.spec.label, firstScalar(r.viz)]);
        viz = vizFromRows(["series", "value"], rows, "bars");
      }
      break;
    }
    case "table":
      viz = coerceKind(ok[0].viz, "table");
      break;
  }
  viz.queries = ok.map((r) => ({
    label: r.spec.label,
    query: r.spec.query.trim(),
    language: r.language
  }));
  return {
    viz,
    osdUrl: await leadPplDeepLink(ctx, defaultDataSourceId, panel),
    error: partialError(runs),
    warning
  };
}
function partialError(runs) {
  const failed = runs.filter((r) => r.error);
  if (failed.length === 0) return void 0;
  return failed.map((r) => `"${r.spec.label}": ${r.error}`).join("; ");
}
async function leadPplDeepLink(ctx, defaultDataSourceId, panel) {
  const lead = panel.queries.find(
    (s) => (s.language ?? detectQueryLanguage(s.query.trim())) === "ppl" && s.query.trim()
  );
  if (!lead) return void 0;
  const query = lead.query.trim();
  const dataset = lead.dataset?.trim() || datasetFromQuery(query) || DEFAULT_DATASET;
  try {
    const dsId = await ctx.osUi.resolveDataSourceId(lead.dataSourceId?.trim() || defaultDataSourceId);
    const { workspaceId, indexPattern, dataSourceTitle, dataSourceType } = await ctx.osUi.resolveDeepLinkContext(ctx, dataset, dsId);
    return exploreLogsUrl({
      origin: ctx.osUi.endpoint,
      workspaceId,
      dataSourceId: dsId,
      datasetTitle: indexPattern?.title ?? dataset,
      indexPatternId: indexPattern?.id,
      indexPatternDataSourceTitle: dataSourceTitle,
      indexPatternDataSourceType: dataSourceType,
      timeFieldName: indexPattern?.timeFieldName,
      query
    });
  } catch (err) {
    ctx.logger.warn(`[report.dashboard] deep link failed: ${errorMessage(err)}`);
    return void 0;
  }
}

// src/apps/report/dashboard/panel-builders/scalar.ts
function formatScalar(v, unit) {
  if (!Number.isFinite(v)) return "\u2014";
  switch (unit) {
    case "ns":
      return formatDurationNanos(v);
    case "ms":
      return formatDurationNanos(v * 1e6);
    case "s":
      return formatDurationNanos(v * 1e9);
    case "bytes":
      return formatMetricValue(v, "bytes");
    case "pct":
      return `${formatMetric(Math.abs(v) <= 1 ? v * 100 : v, 2)}%`;
    case "count":
      return formatCount(v);
    default:
      return Math.abs(v) >= 1e3 ? v.toLocaleString(void 0, { maximumFractionDigits: 2 }) : formatMetric(v);
  }
}
function firstNumberFromPpl(result) {
  const row = result.datarows[0];
  if (!row) return Number.NaN;
  for (const v of row) {
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return Number.NaN;
}
function firstNumberFromPromql(result) {
  const rows = pplRows(result);
  if (rows.length === 0) return Number.NaN;
  const v = rows[0].getNumber("Value");
  return Number.isFinite(v) ? v : Number.NaN;
}
async function runScalarQuery(ctx, defaultDataSourceId, spec, window2 = { from: "now-5m", to: "now" }) {
  const ds = spec.dataSourceId?.trim() || defaultDataSourceId;
  const q = spec.query.trim();
  const lang = spec.language ?? detectQueryLanguage(q);
  if (lang === "ppl") {
    const dataset = spec.dataset?.trim() || datasetFromQuery(q) || DEFAULT_DATASET;
    const pplDs = await ctx.osUi.resolveDataSourceId(ds);
    return firstNumberFromPpl(await ctx.osUi.runPpl(pplDs, q, dataset));
  }
  if (!ds) {
    throw new Error(
      "PromQL needs a Prometheus `data-connection` id \u2014 none was supplied. Call `list_data_sources` and set this cell's `dataSourceId` (or the dashboard default) to a `kind: data-connection` id."
    );
  }
  return firstNumberFromPromql(await ctx.osUi.runPromql(ds, q, ds, window2, "instant"));
}

// src/apps/report/dashboard/panel-builders/kpis.ts
function changeTone(diff, goodWhen) {
  if (diff === 0 || !goodWhen) return "neutral";
  const favorable = goodWhen === "higher" ? diff > 0 : diff < 0;
  return favorable ? "success" : "danger";
}
function formatDelta(current, prior, unit, goodWhen, window2) {
  if (!Number.isFinite(prior) || prior === 0) {
    return { delta: `vs ${window2}: n/a`, deltaTone: "neutral" };
  }
  const diff = current - prior;
  const sign = diff >= 0 ? "+" : "";
  const display = unit === "pct" ? `${sign}${formatMetric(Math.abs(prior) <= 1 ? diff * 100 : diff, 2)}pp` : `${sign}${(diff / prior * 100).toFixed(1)}%`;
  return { delta: `${display} vs ${window2}`, deltaTone: changeTone(diff, goodWhen) };
}
function priorWindow(window2) {
  const m2 = /^(\d+)([mhd])$/.exec(window2.trim());
  if (!m2) return null;
  const n = parseInt(m2[1], 10);
  const u = m2[2];
  return { from: `now-${n * 2}${u}`, to: `now-${n}${u}` };
}
async function buildKpiCards(ctx, defaultDataSourceId, kpis) {
  return Promise.all(
    kpis.map(async (k) => {
      try {
        const value = await runScalarQuery(ctx, defaultDataSourceId, k);
        if (k.compareWindow) {
          const window2 = priorWindow(k.compareWindow);
          if (window2) {
            try {
              const priorValue = await runScalarQuery(ctx, defaultDataSourceId, k, window2);
              const { delta, deltaTone } = formatDelta(value, priorValue, k.unit, k.goodWhen, k.compareWindow);
              return { label: k.label, value: formatScalar(value, k.unit), delta, deltaTone };
            } catch (err) {
              ctx.logger.warn(`[report.dashboard] kpi "${k.label}" delta failed: ${errorMessage(err)}`);
            }
          }
        }
        return { label: k.label, value: formatScalar(value, k.unit) };
      } catch (err) {
        ctx.logger.error(`[report.dashboard] kpi "${k.label}" failed: ${errorMessage(err)}`);
        return { label: k.label, value: "\u2014" };
      }
    })
  );
}

// src/apps/report/dashboard/panel-builders/comparison.ts
async function runCell(ctx, defaultDataSourceId, cell, unit, rowLabel) {
  if (cell?.value !== void 0) return { raw: Number.NaN, display: cell.value };
  if (!cell?.query?.trim()) return { raw: Number.NaN, display: "\u2014" };
  try {
    const raw = await runScalarQuery(ctx, defaultDataSourceId, cell);
    return { raw, display: formatScalar(raw, unit) };
  } catch (err) {
    ctx.logger.error(`[report.dashboard] comparison "${rowLabel}" cell failed: ${errorMessage(err)}`);
    return { raw: Number.NaN, display: "\u2014" };
  }
}
async function buildComparison(ctx, defaultDataSourceId, input) {
  const { sides, metrics } = input;
  const grid = await Promise.all(
    metrics.map(
      (row) => Promise.all(
        sides.map((_, sideIdx) => runCell(ctx, defaultDataSourceId, row.cells[sideIdx], row.unit, row.label))
      )
    )
  );
  return sides.map((side, sideIdx) => ({
    label: side.label,
    tone: side.tone,
    metrics: metrics.map((row, rowIdx) => {
      const cell = grid[rowIdx][sideIdx];
      const baseline = grid[rowIdx][0].raw;
      const toneable = sideIdx > 0 && Number.isFinite(cell.raw) && Number.isFinite(baseline);
      const valueTone = toneable ? changeTone(cell.raw - baseline, row.goodWhen) : void 0;
      return { label: row.label, value: cell.display, valueTone };
    })
  }));
}

// src/apps/report/dashboard/tool.ts
function vizHeadline(viz) {
  switch (viz.kind) {
    case "stat":
      return (viz.stat?.stats ?? []).map((s) => `${s.label}=${s.display}`).join(", ") || "1 value.";
    case "bars": {
      const top = (viz.bars?.bars ?? []).slice(0, 3).map((b) => `${b.label} (${Math.round(b.value)})`).join(", ");
      return `${viz.bars?.bars.length ?? 0} bars. Top: ${top}.`;
    }
    case "timeseries": {
      const lines = (viz.timeseries?.lines ?? []).map((l) => l.label).join(", ");
      return `${viz.timeseries?.buckets.length ?? 0} buckets \u2014 ${lines}.`;
    }
    default:
      return `${viz.rowCount} row(s), columns: ${viz.columns.map((c) => c.name).join(", ")}.`;
  }
}
var dashboardRoute = defineRoute({
  id: "dashboard",
  tool: {
    title: "Present report widget",
    description: "PRESENTATION: render one report pattern as a widget from QUERIES THE AGENT WROTE. Pick `kind` first, then fill that kind's fields. PROVENANCE: every displayed value is fetched by the handler \u2014 the agent supplies queries/ids/scope and writes only `narrative` (interpretation) and `suggestions` (up to 3 follow-up pills). Three patterns: `query` (1\u20136 PPL/PromQL queries rendered via `renderAs` \u2014 `timeseries` overlays queries as lines on one chart (only commensurable same-source series; unlike metrics \u2192 separate charts; a many-series query charts the top 15 and tables the rest), `stat`/`bars` map per query, `table` takes one); `kpis` (1\u20136 KPI cards \u2014 each card declares an instant `query` returning a single scalar; handler runs it, formats via `unit`, computes a delta vs `compareWindow` when set); `comparison` (2\u20133 side-by-side columns over shared metric rows \u2014 each row runs one query per column; the handler fetches every cell and colors non-baseline values by their delta vs the baseline column). Call multiple times for multi-pattern stories \u2014 headline metric first, then drill panels. For a TRACE's steps/excerpts use `agent-trace_details`/`agent-trace_evidence`; for an instrumentation score use `instrumentation-score_evaluate`.",
    inputSchema: inputSchema9
  },
  propsSchema: propsSchema6,
  view: DashboardView,
  handler: async ({ dataSourceId, narrative, suggestions, report }, ctx) => {
    let props;
    let headline;
    let errorText;
    let noticeText;
    switch (report.kind) {
      case "query": {
        const { viz, osdUrl, error, warning } = await buildQueryPanel(ctx, dataSourceId, report);
        props = {
          narrative,
          suggestions,
          kind: "query",
          viz,
          osdUrl,
          error
        };
        headline = viz ? `${report.renderAs}: ${vizHeadline(viz)}` : `Query render (${report.renderAs}) could not be loaded: ${error}`;
        errorText = error;
        noticeText = warning;
        break;
      }
      case "kpis": {
        const cards = await buildKpiCards(ctx, dataSourceId, report.kpis);
        props = {
          narrative,
          suggestions,
          kind: "kpis",
          kpis: cards,
          // Surface each card's source query verbatim beneath the cards.
          queries: report.kpis.map((k) => ({
            label: k.label,
            query: k.query.trim(),
            language: k.language ?? detectQueryLanguage(k.query.trim())
          }))
        };
        const labels = cards.map((c) => `${c.label}=${c.value}`).join(", ");
        headline = `KPIs (${cards.length}): ${labels}.`;
        break;
      }
      case "comparison": {
        const sides = await buildComparison(ctx, dataSourceId, report);
        props = {
          narrative,
          suggestions,
          kind: "comparison",
          comparison: sides,
          // Surface every cell's source query beneath the matrix, labeled by
          // row × column. Literal escape-hatch cells (no query) are skipped.
          queries: report.metrics.flatMap(
            (row) => row.cells.flatMap((cell, sideIdx) => {
              const q = cell.query?.trim();
              if (!q) return [];
              const side = report.sides[sideIdx]?.label ?? `col ${sideIdx + 1}`;
              return [{
                label: `${row.label} \xB7 ${side}`,
                query: q,
                language: cell.language ?? detectQueryLanguage(q)
              }];
            })
          )
        };
        const cols = sides.map((s) => `"${s.label}"`).join(" vs ");
        headline = `Comparison: ${cols} across ${report.metrics.length} metric(s).`;
        break;
      }
    }
    const text = headline + (narrative ? `
${narrative}` : "") + (errorText ? `

The widget is showing a 'failed to load' state \u2014 fix the input and re-present:
${errorText}` : "") + (noticeText ? `

Note: ${noticeText}` : "");
    return { props, text };
  }
});

// src/apps/report/index.ts
var reportApp = defineApp({
  id: "report",
  title: "Report",
  description: "Present a consolidated dashboard to the user from one or more PPL queries \u2014 the deliberate widget surface paired with the text-only `ppl_query` exploration tool.",
  routes: [dashboardRoute]
});

// src/apps/slo/shared.ts
function worstObjectiveStatus(objectives) {
  if (objectives.length === 0) return void 0;
  return objectives.reduce(
    (worst, o) => o.errorBudgetRemaining < worst.errorBudgetRemaining ? o : worst
  );
}
function sloWindowDuration(window2) {
  return window2.type === "rolling" ? window2.duration : window2.period;
}
function errorBudgetRemaining(attainment, target) {
  if (!Number.isFinite(attainment) || !Number.isFinite(target)) return Number.NaN;
  const budget = 1 - target;
  if (budget <= 0) return Number.NaN;
  return 1 - (1 - attainment) / budget;
}
function burnRate(errorRatio, target) {
  if (!Number.isFinite(errorRatio) || !Number.isFinite(target)) return Number.NaN;
  const budget = 1 - target;
  if (budget <= 0) return Number.NaN;
  return errorRatio / budget;
}
function attainmentTone(attainment, target) {
  return budgetTone(errorBudgetRemaining(attainment, target));
}
function budgetTone(remaining) {
  if (!Number.isFinite(remaining)) return "neutral";
  if (remaining <= 0) return "danger";
  if (remaining <= 0.1) return "warn";
  return "success";
}
function burnRateTone(rate) {
  if (!Number.isFinite(rate)) return "neutral";
  if (rate >= 10) return "danger";
  if (rate >= 2) return "warn";
  return "success";
}
function formatAttainment(fraction) {
  if (!Number.isFinite(fraction)) return "\u2014";
  return `${formatMetric(fraction * 100, 3)}%`;
}
function formatBudget(fraction) {
  if (!Number.isFinite(fraction)) return "\u2014";
  return `${formatMetric(fraction * 100, 1)}%`;
}
function formatBurnRate(rate) {
  if (!Number.isFinite(rate)) return "\u2014";
  return `${formatMetric(rate, 2)}\xD7`;
}
function formatEventCount(n) {
  if (!Number.isFinite(n)) return "\u2014";
  const abs = Math.abs(n);
  if (abs >= 1e6) return `${formatMetric(n / 1e6, 1)}M`;
  if (abs >= 1e3) return `${formatMetric(n / 1e3, 1)}k`;
  if (abs >= 10) return `${Math.round(n)}`;
  return formatMetric(n, 1);
}
function parseDurationMs(duration) {
  const match = duration.trim().match(/^(\d+)(s|m|h|d|w)$/);
  if (!match) return 0;
  const val = parseInt(match[1], 10);
  switch (match[2]) {
    case "s":
      return val * 1e3;
    case "m":
      return val * 6e4;
    case "h":
      return val * 36e5;
    case "d":
      return val * 864e5;
    case "w":
      return val * 6048e5;
    default:
      return 0;
  }
}
function formatDurationMs(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "\u2014";
  const minutes = Math.floor(ms / 6e4);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}
function timeToExhaustionMs(remaining, currentErrorRatio, errorBudget, windowMs) {
  if (!Number.isFinite(currentErrorRatio)) return null;
  if (remaining <= 0) return 0;
  if (errorBudget <= 0 || windowMs <= 0) return null;
  const rate = currentErrorRatio / errorBudget;
  if (rate <= 1) return null;
  return remaining * windowMs / (rate - 1);
}
function classifyTier(short, long, threshold) {
  const sOk = Number.isFinite(short);
  const lOk = Number.isFinite(long);
  if (!sOk && !lOk) return "no_data";
  const s = sOk ? short : 0;
  const l = lOk ? long : 0;
  if (s > threshold && l > threshold) return "firing";
  if (s > threshold || l > threshold) return "warming";
  return "ok";
}
function tierHealthTone(h) {
  switch (h) {
    case "firing":
      return "danger";
    case "warming":
      return "warn";
    case "ok":
      return "success";
    default:
      return "neutral";
  }
}
function tierHealthLabel(h) {
  switch (h) {
    case "firing":
      return "firing";
    case "warming":
      return "warming";
    case "ok":
      return "healthy";
    default:
      return "no data";
  }
}
function formatErrorRatio(value) {
  if (!Number.isFinite(value)) return "\u2014";
  if (Math.abs(value) < 1e-4) return "0%";
  return `${formatMetric(value * 100, 3)}%`;
}
function sloStateTone(state) {
  switch (state) {
    case "breached":
      return "danger";
    case "warning":
      return "warn";
    case "ok":
      return "success";
    case "no_data":
    case "source_idle":
    case "stale":
    case "disabled":
    case "rules_missing":
    default:
      return "neutral";
  }
}
function sloStateLabel(state) {
  switch (state) {
    case "breached":
      return "Breached";
    case "warning":
      return "Warning";
    case "ok":
      return "Healthy";
    case "no_data":
      return "No data";
    case "source_idle":
      return "Idle";
    case "stale":
      return "Stale";
    case "disabled":
      return "Disabled";
    case "rules_missing":
      return "Rules missing";
    default:
      return state;
  }
}

// src/apps/slo/list/shared.ts
function isReporting(state) {
  return state !== "no_data" && state !== "source_idle" && state !== "stale" && state !== "disabled";
}
function toCard(slo) {
  const worst = worstObjectiveStatus(slo.status.objectives);
  const remaining = worst?.errorBudgetRemaining ?? Number.NaN;
  const windowLabel2 = sloWindowDuration(slo.window);
  const reporting = slo.enabled && isReporting(slo.status.state);
  return {
    id: slo.id,
    datasourceId: slo.datasourceId,
    name: slo.name,
    service: slo.service,
    state: sloStateLabel(slo.status.state),
    rawState: slo.status.state,
    stateTone: sloStateTone(slo.status.state),
    target: formatAttainment(slo.worstTarget),
    window: windowLabel2,
    attainment: worst ? formatAttainment(worst.attainment) : "\u2014",
    budgetRemaining: Number.isFinite(remaining) ? formatBudget(remaining) : "\u2014",
    // Only expose a numeric budget for reporting SLOs (null = excluded from the
    // aggregate / at-risk list, matching OSD's slo_overview_panel).
    budgetRemainingValue: reporting && Number.isFinite(remaining) ? remaining : null,
    budgetFraction: Number.isFinite(remaining) ? Math.max(0, Math.min(1, remaining)) : 0,
    budgetTone: budgetTone(remaining),
    objectiveCount: slo.objectiveCount,
    firingCount: slo.status.firingCount,
    enabled: slo.enabled
  };
}
var STATE_ORDER2 = ["Breached", "Warning", "Healthy"];
function stateRank(label) {
  const i = STATE_ORDER2.indexOf(label);
  return i === -1 ? STATE_ORDER2.length : i;
}
async function fetchSlos(ctx, opts) {
  const result = await ctx.osUi.listSlos({
    service: opts.service ? [opts.service] : void 0,
    state: opts.state ? [opts.state] : void 0,
    datasourceId: opts.dataSourceId,
    search: opts.search
  });
  ctx.logger.log(`${opts.logTag} ${result.slos.length}/${result.total} SLO(s)`);
  const slos = opts.state ? result.slos.filter((s) => s.status.state === opts.state) : result.slos;
  const cards = slos.map(toCard);
  cards.sort((a, b) => a.budgetFraction - b.budgetFraction);
  const counts = /* @__PURE__ */ new Map();
  for (const c of cards) counts.set(c.state, (counts.get(c.state) ?? 0) + 1);
  const byState = [...counts.entries()].map(([state, count]) => ({ state, count })).sort((a, b) => stateRank(a.state) - stateRank(b.state) || a.state.localeCompare(b.state));
  return { cards, total: result.total, hasMore: result.hasMore, byState };
}
function summarize5(r, state) {
  const scope = state ? `${state} ` : "";
  if (r.cards.length === 0) return `No ${scope}SLOs found.`;
  const breakdown = r.byState.map((b) => `${b.state}: ${b.count}`).join(", ");
  const firing = r.cards.reduce((n, c) => n + c.firingCount, 0);
  const firingNote = firing > 0 ? ` ${firing} firing alert(s).` : "";
  const routeNote = " To investigate, explain, or drill into ONE SLO, call `slo_detail` with that row's `id` (do NOT hand-write PPL/PromQL).";
  return `${r.cards.length} ${scope}SLO(s). By state \u2014 ${breakdown}.${firingNote}${routeNote}`;
}

// packages/ui/src/apps/slo/search/schema.ts
import { z as z16 } from "zod";
var inputSchema10 = {
  service: z16.string().optional().describe("Filter to one service. Omit for all."),
  state: z16.enum(["breached", "warning", "ok"]).optional().describe("Filter by health state. Omit for all."),
  dataSourceId: z16.string().optional().describe("Scope to one datasource. Omit for all."),
  search: z16.string().optional().describe("Free-text search over SLO name/description.")
};

// src/apps/slo/search/tool.ts
var searchRoute2 = defineRoute({
  id: "search",
  tool: {
    title: "Search configured SLOs",
    description: "Search configured SLOs + their live status (attainment, error-budget remaining, state) as text rows. No widget \u2014 call freely. Filter: `service`, `state`, `search`, `dataSourceId`. To present as a widget: `slo_list` (expand a row to drill into one SLO's detail page). Requires the observability plugin's SLO feature on the endpoint (a bare cluster returns an error).",
    inputSchema: inputSchema10
  },
  handler: async ({ service, state, dataSourceId, search }, ctx) => {
    try {
      const result = await fetchSlos(ctx, {
        service,
        state,
        dataSourceId,
        search,
        logTag: "[slo.search]"
      });
      return {
        props: { slos: result.cards },
        text: summarize5(result, state)
      };
    } catch (err) {
      const msg = errorMessage(err);
      ctx.logger.error("[slo.search] listSlos failed: " + msg);
      return {
        props: { error: msg },
        text: "Failed to list SLOs from the observability plugin: " + msg + "\nThe SLO feature may not be available on this endpoint.",
        isError: true
      };
    }
  }
});

// packages/ui/src/apps/slo/list/schema.ts
import { z as z17 } from "zod";
var toneEnum3 = z17.enum(GLASS_TONES);
var inputSchema11 = {
  service: z17.string().optional().describe("Filter to one service. Omit for all."),
  state: z17.enum(["breached", "warning", "ok"]).optional().describe("Filter by health state. Omit for all."),
  dataSourceId: z17.string().optional().describe("Scope to one datasource. Omit for all."),
  search: z17.string().optional().describe("Free-text search over SLO name/description."),
  ...presentationInputFields
};
var sloCardSchema = z17.object({
  /** The SLO's id — used to lazily fetch its detail when the row expands. */
  id: z17.string(),
  /** The SLO's datasource id — passed through to scope the detail queries. */
  datasourceId: z17.string().optional(),
  name: z17.string(),
  service: z17.string(),
  /** Display label for the health state (e.g. `Breached`, `Healthy`). */
  state: z17.string(),
  /** Raw OSD health state (e.g. `breached`, `ok`, `no_data`) — drives filtering
   *  + the health-overview counts. Coarse states fold into `noData`/`disabled`. */
  rawState: z17.string(),
  stateTone: toneEnum3,
  /** Tightest target across objectives, as a percent string. */
  target: z17.string(),
  /** Compliance-window label (e.g. `30d`, `month`). */
  window: z17.string(),
  /** Attainment of the worst objective, as a percent string. */
  attainment: z17.string(),
  /** Budget remaining of the worst objective, signed percent (can be negative). */
  budgetRemaining: z17.string(),
  /** Raw worst-objective budget remaining as a fraction (may be negative);
   *  `null` when not reporting (no data / disabled). Drives the health-overview
   *  aggregate + at-risk ranking. */
  budgetRemainingValue: z17.number().nullable(),
  /** 0..1 fraction for the budget bar (clamped; negative → empty bar). */
  budgetFraction: z17.number(),
  budgetTone: toneEnum3,
  objectiveCount: z17.number(),
  /** Firing alerts associated with this SLO. */
  firingCount: z17.number(),
  enabled: z17.boolean()
});
var propsSchema7 = z17.object({
  ...presentationPropsFields,
  slos: z17.array(sloCardSchema),
  /** True count of matching SLOs on the server. May exceed `slos.length` when
   *  the observability plugin caps the page (see `hasMore`). */
  total: z17.number().optional(),
  /** The server returned a partial page — more SLOs exist than were rendered.
   *  Drives the "showing N of M" truncation footer. */
  hasMore: z17.boolean().optional(),
  /** Deep link to the SLO console in OpenSearch Dashboards. */
  osdUrl: z17.string().optional(),
  error: z17.string().optional()
});

// packages/ui/src/apps/slo/list/view.tsx
import { Fragment as Fragment11, useMemo as useMemo9, useState as useState15 } from "react";

// packages/ui/src/framework/SelectionContextTooltip.tsx
import { useEffect as useEffect7, useRef as useRef6, useState as useState12 } from "react";
import { jsx as jsx53, jsxs as jsxs31 } from "react/jsx-runtime";
var MIN_SELECTION_LEN = 3;
function SelectionContextTooltip() {
  const { addToContext, canAddToContext } = useModelContext();
  const [anchor, setAnchor] = useState12(null);
  const [phase, setPhase] = useState12("idle");
  const btnRef = useRef6(null);
  const dismissTimerRef = useRef6(null);
  useEffect7(() => {
    if (!canAddToContext) return;
    function readSelection() {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
      const text = sel.toString().trim();
      if (text.length < MIN_SELECTION_LEN) return null;
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return null;
      return { text, x: rect.left + rect.width / 2, y: rect.bottom };
    }
    function onSelectionSettled(ev) {
      const target = ev.target;
      if (target && btnRef.current?.contains(target)) return;
      const next = readSelection();
      setAnchor(next);
      setPhase("idle");
    }
    document.addEventListener("mouseup", onSelectionSettled);
    document.addEventListener("keyup", onSelectionSettled);
    return () => {
      document.removeEventListener("mouseup", onSelectionSettled);
      document.removeEventListener("keyup", onSelectionSettled);
    };
  }, [canAddToContext]);
  useEffect7(
    () => () => {
      if (dismissTimerRef.current !== null) clearTimeout(dismissTimerRef.current);
    },
    []
  );
  if (!canAddToContext || !anchor) return null;
  async function onAdd() {
    if (!anchor || phase === "sending") return;
    setPhase("sending");
    const ok = await addToContext(anchor.text);
    setPhase(ok ? "added" : "failed");
    if (ok) window.getSelection()?.removeAllRanges();
    if (dismissTimerRef.current !== null) clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = setTimeout(() => setAnchor(null), ok ? 1200 : 2e3);
  }
  const label = phase === "sending" ? "Adding\u2026" : phase === "added" ? "Added to context" : phase === "failed" ? "Couldn't add \u2014 retry" : "Add to context";
  return /* @__PURE__ */ jsxs31(
    "button",
    {
      ref: btnRef,
      type: "button",
      onMouseDown: (e) => e.preventDefault(),
      onClick: onAdd,
      className: "fixed z-[2147483647] flex -translate-x-1/2 translate-y-1.5 items-center gap-1.5 rounded-[8px] border border-[var(--surface-border-strong)] bg-[var(--surface)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--ink)] shadow-lg transition-colors hover:border-transparent hover:bg-[var(--accent-soft)] hover:text-[var(--accent-bright)] disabled:opacity-60",
      style: { left: anchor.x, top: anchor.y },
      disabled: phase === "sending",
      children: [
        /* @__PURE__ */ jsx53(PlusIcon, {}),
        /* @__PURE__ */ jsx53("span", { children: label })
      ]
    }
  );
}

// packages/ui/src/framework/AppProviders.tsx
import { jsx as jsx54, jsxs as jsxs32 } from "react/jsx-runtime";
function AppProviders({
  bridge,
  view: View,
  props
}) {
  const { sendFollowup, canSendFollowup } = bridge;
  const { openLink, canOpenLink } = bridge;
  const { callTool, canCallTool } = bridge;
  const { addToContext, canAddToContext } = bridge;
  return /* @__PURE__ */ jsx54(MotionProvider, { children: /* @__PURE__ */ jsx54(FollowupProvider, { value: { sendFollowup, canSendFollowup }, children: /* @__PURE__ */ jsx54(OpenLinkProvider, { value: { openLink, canOpenLink }, children: /* @__PURE__ */ jsx54(CallToolProvider, { value: { callTool, canCallTool }, children: /* @__PURE__ */ jsxs32(ModelContextProvider, { value: { addToContext, canAddToContext }, children: [
    /* @__PURE__ */ jsx54(View, { props }),
    /* @__PURE__ */ jsx54(SelectionContextTooltip, {})
  ] }) }) }) }) });
}

// packages/ui/src/apps/_shared/ExternalLink.tsx
import * as React20 from "react";
import { jsx as jsx55 } from "react/jsx-runtime";
function ExternalLink({ href, className, stopPropagation, children }) {
  const { openLink, canOpenLink } = useOpenLink();
  const [pending, setPending] = React20.useState(false);
  if (!canOpenLink) {
    return /* @__PURE__ */ jsx55(
      "a",
      {
        href,
        target: "_blank",
        rel: "noopener noreferrer",
        className,
        onClick: stopPropagation ? (e) => e.stopPropagation() : void 0,
        children
      }
    );
  }
  async function onClick(e) {
    if (stopPropagation) e.stopPropagation();
    if (pending) return;
    setPending(true);
    try {
      await openLink(href);
    } catch {
    } finally {
      setPending(false);
    }
  }
  return /* @__PURE__ */ jsx55(
    "button",
    {
      type: "button",
      disabled: pending,
      onClick,
      title: href,
      className: `${className ?? ""} cursor-pointer disabled:opacity-50`,
      children
    }
  );
}

// packages/ui/src/apps/slo/_shared/ObjectiveCard.tsx
import { useState as useState14 } from "react";
import { Fragment as Fragment10, jsx as jsx56, jsxs as jsxs33 } from "react/jsx-runtime";
function ObjectiveCard({
  obj,
  frame = true,
  sloName,
  service,
  showInvestigate = true,
  showBudget = true,
  visibleCharts,
  expandCharts = false
}) {
  const detail = sloName ? describeObjective(obj, sloName, service) : null;
  const body = /* @__PURE__ */ jsxs33(Fragment10, { children: [
    /* @__PURE__ */ jsxs33("div", { className: "flex items-start justify-between gap-3", children: [
      /* @__PURE__ */ jsxs33("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsx56(Eyebrow, { children: obj.label }),
        /* @__PURE__ */ jsxs33("div", { className: "text-[10.5px] text-[var(--ink-mute)]", children: [
          "target ",
          obj.target,
          obj.window ? ` \xB7 ${obj.window}` : ""
        ] })
      ] }),
      detail && !obj.error && /* @__PURE__ */ jsx56(
        DetailActions,
        {
          className: "shrink-0",
          showInvestigate,
          investigatePrompt: `Investigate this SLO's error budget and burn rate, explain the likely cause of the burn, and suggest next steps:

${detail}`,
          contextText: `Selected SLO:
${detail}`,
          investigateTitle: "Ask the assistant to investigate this SLO now",
          contextTitle: "Add this SLO to the assistant's context for your next message"
        }
      )
    ] }),
    obj.error ? /* @__PURE__ */ jsx56("div", { className: "mt-2 text-[12px] text-[var(--danger)]", children: obj.error }) : (
      // Borderless sections stacked with generous rhythm + hairline dividers
      // (the alerts-feed idiom) so each block reads distinctly without nesting
      // a second card. `Section`/`ChartSection` draw the top divider for all
      // but the first rendered block.
      /* @__PURE__ */ jsxs33("div", { className: "mt-4 flex flex-col", children: [
        showBudget && /* @__PURE__ */ jsxs33(Section, { first: true, children: [
          /* @__PURE__ */ jsxs33("div", { className: "flex flex-wrap gap-x-8 gap-y-4", children: [
            /* @__PURE__ */ jsx56(Tile, { label: "Attainment", value: obj.attainment, tone: obj.attainmentTone, sub: `target ${obj.target}` }),
            /* @__PURE__ */ jsx56(
              Tile,
              {
                label: "Budget left",
                value: obj.budgetRemaining,
                tone: obj.budgetTone,
                sub: `${obj.budgetTotal} total`
              }
            ),
            /* @__PURE__ */ jsx56(
              Tile,
              {
                label: "Time to exhaustion",
                value: obj.timeToExhaustion,
                tone: obj.timeToExhaustionTone,
                sub: "at current burn"
              }
            ),
            /* @__PURE__ */ jsx56(Tile, { label: "Burn rate", value: obj.burnRate, tone: obj.burnRateTone, sub: "\xD7 sustainable" }),
            obj.events && /* @__PURE__ */ jsx56(
              Tile,
              {
                label: "Events",
                value: `${obj.events.good} / ${obj.events.total}`,
                tone: obj.events.ratioTone,
                sub: obj.events.ratio
              }
            )
          ] }),
          /* @__PURE__ */ jsxs33("div", { className: "mt-4", children: [
            /* @__PURE__ */ jsxs33("div", { className: "mb-1.5 text-[10px] text-[var(--ink-mute)]", children: [
              "Budget consumed \u2014 ",
              pctConsumed(obj.budgetRemainingValue),
              " of allowed"
            ] }),
            /* @__PURE__ */ jsx56(
              BudgetBar,
              {
                remaining: obj.budgetRemainingValue,
                warnAtConsumed: obj.warnAtConsumed ?? 0.5,
                last24hConsumed: obj.last24hConsumed ?? null
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ jsx56(
          ChartSections,
          {
            obj,
            expanded: expandCharts,
            visible: visibleCharts,
            budgetAbove: showBudget
          }
        )
      ] })
    )
  ] });
  if (!frame) return body;
  return /* @__PURE__ */ jsx56("div", { className: "rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3", children: body });
}
function describeObjective(obj, sloName, service) {
  const lines = [`SLO: ${sloName}`];
  if (service) lines.push(`Service: ${service}`);
  lines.push(`Objective: ${obj.label} (target ${obj.target}${obj.window ? ` over ${obj.window}` : ""})`);
  lines.push(`Attainment: ${obj.attainment} \xB7 Budget remaining: ${obj.budgetRemaining} of ${obj.budgetTotal} total`);
  lines.push(`Burn rate: ${obj.burnRate} \xB7 Time to exhaustion: ${obj.timeToExhaustion}`);
  if (obj.events) {
    lines.push(`Events: ${obj.events.good} good / ${obj.events.total} total (${obj.events.ratio})`);
  }
  const firing = (obj.tiers ?? []).filter((t) => t.healthLabel === "firing" || t.healthTone === "danger");
  if (firing.length > 0) {
    lines.push(`Firing burn-rate tiers: ${firing.map((t) => `${t.label} (${t.multiplier})`).join(", ")}`);
  }
  return lines.join("\n");
}
function Section({
  first = false,
  title,
  children
}) {
  return /* @__PURE__ */ jsxs33("div", { className: first ? void 0 : "mt-5 border-t border-[var(--ink-hairline)] pt-5", children: [
    title && /* @__PURE__ */ jsx56("div", { className: "mb-2 text-[10px] uppercase tracking-[0.05em] text-[var(--ink-mute)]", children: title }),
    children
  ] });
}
function ChartSections({
  obj,
  expanded = false,
  visible,
  budgetAbove
}) {
  const wants = (key) => !visible || visible.has(key);
  const showTiers = wants("burn-rate-alerts") && !!obj.tiers && obj.tiers.length > 0;
  const showBudgetChart = wants("error-budget-remaining") && !!obj.budgetSeries && obj.budgetSeries.points.length >= 2;
  const showBurn = wants("burn-rate-by-tier") && !!obj.burn && obj.burn.points.length >= 2;
  const firstBlock = budgetAbove ? null : showTiers ? "burn-rate-alerts" : showBudgetChart ? "error-budget-remaining" : showBurn ? "burn-rate-by-tier" : null;
  return /* @__PURE__ */ jsxs33(Fragment10, { children: [
    showTiers && /* @__PURE__ */ jsx56(ChartSection, { title: "Burn-rate alerts", expanded, first: firstBlock === "burn-rate-alerts", children: /* @__PURE__ */ jsx56(TierMatrix, { tiers: obj.tiers }) }),
    showBudgetChart && /* @__PURE__ */ jsx56(
      ChartSection,
      {
        title: "Error budget remaining",
        expanded,
        first: firstBlock === "error-budget-remaining",
        children: /* @__PURE__ */ jsx56(
          ChartPanel,
          {
            frame: false,
            height: 150,
            kind: "area",
            series: [
              {
                label: "budget remaining",
                points: obj.budgetSeries.points,
                tone: obj.budgetTone === "neutral" ? "success" : obj.budgetTone
              }
            ],
            xLabels: obj.budgetSeries.xLabels,
            threshold: 0,
            thresholdLabel: "exhausted",
            thresholdTone: "danger",
            legend: false,
            formatValue: (v) => `${(v * 100).toFixed(0)}%`
          }
        )
      }
    ),
    showBurn && /* @__PURE__ */ jsx56(ChartSection, { title: "Burn rate by tier", expanded, first: firstBlock === "burn-rate-by-tier", children: /* @__PURE__ */ jsx56(
      ChartPanel,
      {
        frame: false,
        height: 130,
        kind: "line",
        legend: false,
        series: [{ label: "burn rate", points: obj.burn.points, tone: obj.burnRateTone }],
        xLabels: obj.burn.xLabels,
        threshold: 1,
        thresholdLabel: "1\xD7 (sustainable)",
        thresholdTone: "warn",
        formatValue: (v) => `${v.toFixed(1)}\xD7`
      }
    ) })
  ] });
}
function ChartSection({
  title,
  expanded,
  first,
  children
}) {
  const [open, setOpen] = useState14(expanded);
  return /* @__PURE__ */ jsxs33("div", { className: first ? void 0 : "mt-5 border-t border-[var(--ink-hairline)] pt-5", children: [
    /* @__PURE__ */ jsxs33(
      "button",
      {
        type: "button",
        onClick: () => setOpen((o) => !o),
        className: "flex w-full items-center gap-2 text-left text-[10px] uppercase tracking-[0.05em] text-[var(--ink-mute)] hover:text-[var(--ink)]",
        children: [
          /* @__PURE__ */ jsx56("span", { className: cn("inline-block transition-transform", open && "rotate-90"), "aria-hidden": true, children: "\u203A" }),
          title
        ]
      }
    ),
    open && /* @__PURE__ */ jsx56("div", { className: "mt-3", children })
  ] });
}
function Tile({
  label,
  value,
  tone,
  sub
}) {
  return /* @__PURE__ */ jsxs33("div", { className: "flex flex-col gap-0.5", children: [
    /* @__PURE__ */ jsx56("span", { className: "text-[10px] uppercase tracking-[0.05em] text-[var(--ink-mute)]", children: label }),
    /* @__PURE__ */ jsx56(
      "span",
      {
        className: "font-[family-name:var(--font-mono)] text-[18px] font-bold leading-[1.15] [font-feature-settings:'tnum'_1,'lnum'_1]",
        style: tone ? { color: toneTextColor(tone) } : void 0,
        children: value
      }
    ),
    sub != null && /* @__PURE__ */ jsx56("span", { className: "text-[10px] text-[var(--ink-mute)]", children: sub })
  ] });
}
function TierMatrix({ tiers }) {
  return /* @__PURE__ */ jsx56("div", { className: "grid grid-cols-1 gap-2 sm:grid-cols-2", children: tiers.map((t, i) => /* @__PURE__ */ jsx56(TierCard, { tier: t }, i)) });
}
function BurnBar({ fraction, exceeded }) {
  const color = exceeded ? toneVars("danger").color : toneVars("success").color;
  const pct = Math.max(0, Math.min(100, fraction / 1.5 * 100));
  return /* @__PURE__ */ jsxs33("div", { className: "relative h-1.5 overflow-hidden rounded-[3px] bg-[var(--surface-muted)]", children: [
    /* @__PURE__ */ jsx56("div", { className: "h-full transition-[width] duration-200", style: { width: `${pct}%`, background: color } }),
    /* @__PURE__ */ jsx56("div", { className: "absolute top-[-2px] bottom-[-2px]", style: { left: "66.6%", width: 1, background: "var(--ink-mute)" } })
  ] });
}
function TierCard({ tier }) {
  return /* @__PURE__ */ jsxs33("div", { className: "rounded-md border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-2.5", children: [
    /* @__PURE__ */ jsxs33("div", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsxs33("div", { className: "min-w-0", children: [
        /* @__PURE__ */ jsx56("div", { className: "truncate text-[12px] font-semibold text-[var(--ink-bright)]", children: tier.label }),
        /* @__PURE__ */ jsxs33("div", { className: "text-[10px] text-[var(--ink-mute)]", children: [
          tier.multiplier,
          " burn",
          tier.severity ? ` \xB7 ${tier.severity}` : ""
        ] })
      ] }),
      /* @__PURE__ */ jsx56(
        Badge,
        {
          variant: BADGE_VARIANT_FOR_TONE[tier.healthTone],
          animate: false,
          className: "shrink-0 text-[10px] uppercase tracking-[0.04em]",
          children: tier.healthLabel
        }
      )
    ] }),
    /* @__PURE__ */ jsxs33("div", { className: "mt-2 flex gap-4", children: [
      /* @__PURE__ */ jsxs33("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxs33("div", { className: "text-[10px] text-[var(--ink-mute)]", children: [
          "short (",
          tier.shortWindow,
          ")"
        ] }),
        /* @__PURE__ */ jsx56(
          "div",
          {
            className: "font-[family-name:var(--font-mono)] text-[12px] font-semibold",
            style: tier.shortExceeded ? { color: toneVars("danger").color } : void 0,
            children: tier.shortRatio
          }
        ),
        /* @__PURE__ */ jsx56("div", { className: "mt-1", children: /* @__PURE__ */ jsx56(BurnBar, { fraction: tier.shortFraction, exceeded: tier.shortExceeded }) })
      ] }),
      /* @__PURE__ */ jsxs33("div", { className: "flex-1", children: [
        /* @__PURE__ */ jsxs33("div", { className: "text-[10px] text-[var(--ink-mute)]", children: [
          "long (",
          tier.longWindow,
          ")"
        ] }),
        /* @__PURE__ */ jsx56(
          "div",
          {
            className: "font-[family-name:var(--font-mono)] text-[12px] font-semibold",
            style: tier.longExceeded ? { color: toneVars("danger").color } : void 0,
            children: tier.longRatio
          }
        ),
        /* @__PURE__ */ jsx56("div", { className: "mt-1", children: /* @__PURE__ */ jsx56(BurnBar, { fraction: tier.longFraction, exceeded: tier.longExceeded }) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs33("div", { className: "mt-1.5 flex items-center justify-between gap-2 text-[10px] text-[var(--ink-mute)]", children: [
      /* @__PURE__ */ jsxs33("span", { children: [
        "threshold ",
        tier.threshold,
        tier.forDuration ? ` \xB7 for ${tier.forDuration}` : ""
      ] }),
      tier.alertManagerUrl && /* @__PURE__ */ jsx56(
        ExternalLink,
        {
          href: tier.alertManagerUrl,
          stopPropagation: true,
          className: "shrink-0 text-[var(--accent)] hover:underline",
          children: "View in Alert Manager \u2197"
        }
      )
    ] })
  ] });
}
function pctConsumed(remainingValue) {
  if (!Number.isFinite(remainingValue)) return "\u2014";
  return `${Math.max(0, 100 - remainingValue * 100).toFixed(0)}%`;
}

// packages/ui/src/apps/slo/list/SloOverview.tsx
import { useMemo as useMemo8 } from "react";
import { jsx as jsx57, jsxs as jsxs34 } from "react/jsx-runtime";
function bucketOf(rawState) {
  switch (rawState) {
    case "breached":
    case "rules_missing":
      return "breached";
    case "warning":
      return "warning";
    case "ok":
      return "ok";
    case "disabled":
      return "disabled";
    case "no_data":
    case "source_idle":
    case "stale":
      return "noData";
    default:
      return null;
  }
}
function computeStats(slos) {
  let breached = 0, warning = 0, ok = 0, noData = 0, disabled = 0, firing = 0;
  let reportingCount = 0, budgetSum = 0;
  for (const s of slos) {
    firing += s.firingCount;
    switch (bucketOf(s.rawState)) {
      case "breached":
        breached++;
        break;
      case "warning":
        warning++;
        break;
      case "ok":
        ok++;
        break;
      case "disabled":
        disabled++;
        break;
      case "noData":
        noData++;
        break;
    }
    if (s.budgetRemainingValue != null) {
      reportingCount++;
      budgetSum += s.budgetRemainingValue;
    }
  }
  return {
    total: slos.length,
    breached,
    warning,
    ok,
    noData,
    disabled,
    firing,
    reportingCount,
    avgBudgetRemaining: reportingCount > 0 ? budgetSum / reportingCount : Number.NaN
  };
}
function aggregateBudgetTone(avgRemaining) {
  if (!Number.isFinite(avgRemaining)) return "neutral";
  if (avgRemaining >= 0.8) return "success";
  if (avgRemaining >= 0.4) return "warn";
  return "danger";
}
var STATE_TONE = {
  breached: "danger",
  warning: "warn",
  ok: "success",
  noData: "neutral",
  disabled: "neutral"
};
var STATE_LABEL = {
  breached: "Breached",
  warning: "Warning",
  ok: "Healthy",
  noData: "No data",
  disabled: "Disabled"
};
function KpiCell({
  value,
  label,
  tone,
  onClick,
  active
}) {
  const color = toneVars(tone).color;
  const clickable = Boolean(onClick);
  return /* @__PURE__ */ jsxs34(
    "button",
    {
      type: "button",
      disabled: !clickable,
      "aria-pressed": active,
      onClick,
      className: cn(
        "flex min-w-[68px] items-stretch gap-1.5 rounded-[5px] px-2 py-1 text-left transition-colors",
        clickable ? "cursor-pointer" : "cursor-default",
        active ? "bg-[var(--surface-muted)] ring-1 ring-[var(--accent-bright)]" : "hover:bg-[var(--surface-muted)]"
      ),
      children: [
        /* @__PURE__ */ jsx57("span", { className: "w-[3px] shrink-0 rounded-[2px]", style: { background: color } }),
        /* @__PURE__ */ jsxs34("span", { className: "flex min-w-0 flex-col", children: [
          /* @__PURE__ */ jsx57("span", { className: "text-[16px] font-semibold leading-[1.1] [font-feature-settings:'tnum'_1]", style: { color }, children: value }),
          /* @__PURE__ */ jsx57("span", { className: "whitespace-nowrap text-[10px] text-[var(--ink-mute)]", children: label })
        ] })
      ]
    }
  );
}
function HealthRail({
  stats,
  activeStateFilter,
  onStateFilterChange
}) {
  const segments = [
    { key: "breached", value: stats.breached, filter: "breached" },
    { key: "warning", value: stats.warning, filter: "warning" },
    { key: "ok", value: stats.ok, filter: "ok" },
    { key: "noData", value: stats.noData, filter: "no_data" },
    { key: "disabled", value: stats.disabled, filter: null }
  ];
  const denom = Math.max(1, stats.total);
  const nonEmpty = segments.filter((s) => s.value > 0);
  const clickable = Boolean(onStateFilterChange);
  return /* @__PURE__ */ jsxs34("div", { className: "flex min-w-0 flex-col gap-1", children: [
    /* @__PURE__ */ jsxs34(Eyebrow, { children: [
      "Health mix \xB7 ",
      stats.total,
      " ",
      stats.total === 1 ? "SLO" : "SLOs"
    ] }),
    /* @__PURE__ */ jsx57("div", { className: "flex h-[10px] w-full overflow-hidden rounded-[5px] bg-[var(--surface-muted)]", children: nonEmpty.map((s) => {
      const pct = s.value / denom * 100;
      const active = s.filter != null && activeStateFilter === s.filter;
      const dimmed = activeStateFilter != null && !active;
      const canClick = clickable && s.filter != null;
      return /* @__PURE__ */ jsx57(
        "button",
        {
          type: "button",
          disabled: !canClick,
          "aria-pressed": active,
          title: `${STATE_LABEL[s.key]}: ${s.value} (${Math.round(pct)}%)`,
          onClick: () => s.filter != null && onStateFilterChange?.(activeStateFilter === s.filter ? null : s.filter),
          className: cn("h-full border-0 p-0 transition-opacity", canClick ? "cursor-pointer" : "cursor-default"),
          style: {
            flex: `${pct} 0 0`,
            minWidth: 6,
            background: toneVars(STATE_TONE[s.key]).color,
            opacity: dimmed ? 0.35 : 1
          }
        },
        s.key
      );
    }) }),
    /* @__PURE__ */ jsx57("div", { className: "flex flex-wrap gap-x-2.5 gap-y-0.5 text-[10px] text-[var(--ink-mute)]", children: segments.map((s) => /* @__PURE__ */ jsxs34("span", { className: "inline-flex items-center gap-1", children: [
      /* @__PURE__ */ jsx57("span", { className: "size-[6px] shrink-0 rounded-[1px]", style: { background: toneVars(STATE_TONE[s.key]).color } }),
      /* @__PURE__ */ jsx57("strong", { className: "text-[11px] text-[var(--ink)]", children: s.value }),
      /* @__PURE__ */ jsx57("span", { children: STATE_LABEL[s.key] })
    ] }, s.key)) })
  ] });
}
function MiniBudgetBar({ remaining }) {
  const consumedPct = Math.min(100, Math.max(0, 1 - remaining) * 100);
  const overBudget = remaining < 0;
  return /* @__PURE__ */ jsx57("div", { className: "relative h-[3px] w-full overflow-hidden rounded-[2px] bg-[var(--surface-muted)]", children: /* @__PURE__ */ jsx57(
    "div",
    {
      className: "absolute inset-y-0 left-0",
      style: { width: `${consumedPct}%`, background: toneVars(overBudget ? "danger" : "warn").color }
    }
  ) });
}
function SloOverview({
  slos,
  activeStateFilter,
  onStateFilterChange
}) {
  const stats = useMemo8(() => computeStats(slos), [slos]);
  const atRisk = useMemo8(() => {
    const AT_RISK_THRESHOLD = 0.75;
    const rows = slos.filter((s) => s.budgetRemainingValue != null).map((s) => ({ slo: s, remaining: s.budgetRemainingValue })).sort((a, b) => a.remaining - b.remaining || a.slo.name.localeCompare(b.slo.name));
    return {
      shown: rows.slice(0, 3),
      totalBurning: rows.filter((r) => r.remaining < 0.25).length,
      anyAtRisk: rows.some((r) => r.remaining < AT_RISK_THRESHOLD),
      hasReporting: rows.length > 0
    };
  }, [slos]);
  if (slos.length === 0) return null;
  const toggle = (next) => onStateFilterChange ? () => onStateFilterChange(activeStateFilter === next ? null : next) : void 0;
  const divider = /* @__PURE__ */ jsx57("div", { "aria-hidden": true, className: "mx-1 w-px self-stretch bg-[var(--surface-border)]" });
  return /* @__PURE__ */ jsxs34("div", { className: "rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2", children: [
    /* @__PURE__ */ jsxs34("div", { className: "flex items-center justify-between gap-2", children: [
      /* @__PURE__ */ jsx57("div", { className: "text-[13px] font-semibold text-[var(--ink-bright)]", children: "SLO health overview" }),
      activeStateFilter && onStateFilterChange && /* @__PURE__ */ jsx57(
        "button",
        {
          type: "button",
          onClick: () => onStateFilterChange(null),
          className: "text-[11px] text-[var(--accent)] hover:underline",
          children: "Clear filter"
        }
      )
    ] }),
    /* @__PURE__ */ jsxs34("div", { className: "mt-1.5 flex flex-wrap items-center gap-2", children: [
      /* @__PURE__ */ jsxs34("div", { className: "flex flex-[0_1_auto] flex-wrap items-center gap-0.5", children: [
        /* @__PURE__ */ jsx57(
          KpiCell,
          {
            value: stats.reportingCount > 0 ? /* @__PURE__ */ jsx57(Mono, { children: `${(stats.avgBudgetRemaining * 100).toFixed(1)}%` }) : "\u2014",
            label: stats.reportingCount > 0 ? "Aggregate budget" : "No reporting SLOs",
            tone: aggregateBudgetTone(stats.avgBudgetRemaining)
          }
        ),
        /* @__PURE__ */ jsx57(KpiCell, { value: stats.breached, label: "Breached", tone: "danger", onClick: toggle("breached"), active: activeStateFilter === "breached" }),
        /* @__PURE__ */ jsx57(KpiCell, { value: stats.warning, label: "Warning", tone: "warn", onClick: toggle("warning"), active: activeStateFilter === "warning" }),
        /* @__PURE__ */ jsx57(KpiCell, { value: stats.ok, label: "Healthy", tone: "success", onClick: toggle("ok"), active: activeStateFilter === "ok" }),
        /* @__PURE__ */ jsx57(KpiCell, { value: stats.firing, label: "Firing", tone: stats.firing > 0 ? "danger" : "neutral", onClick: toggle("firing"), active: activeStateFilter === "firing" }),
        /* @__PURE__ */ jsx57(KpiCell, { value: stats.noData + stats.disabled, label: "No data / disabled", tone: "neutral", onClick: toggle("no_data"), active: activeStateFilter === "no_data" })
      ] }),
      divider,
      /* @__PURE__ */ jsx57("div", { className: "min-w-[200px] flex-[1_1_220px]", children: /* @__PURE__ */ jsx57(HealthRail, { stats, activeStateFilter, onStateFilterChange }) }),
      divider,
      /* @__PURE__ */ jsxs34("div", { className: "flex min-w-[220px] flex-[1_1_260px] flex-col gap-1", children: [
        /* @__PURE__ */ jsx57(Eyebrow, { children: atRisk.hasReporting && !atRisk.anyAtRisk ? "Error budget" : "At risk \xB7 worst error budget first" }),
        atRisk.shown.length === 0 ? /* @__PURE__ */ jsx57("span", { className: "text-[11px] text-[var(--ink-mute)]", children: "No reporting SLOs." }) : !atRisk.anyAtRisk ? /* @__PURE__ */ jsx57("span", { className: "text-[11px] text-[var(--ink-mute)]", children: "All reporting SLOs have >75% budget remaining." }) : /* @__PURE__ */ jsxs34("div", { className: "flex flex-col gap-1", children: [
          atRisk.shown.map(({ slo: s, remaining }) => {
            const overBudget = remaining <= 0;
            const tone = overBudget ? "danger" : remaining < 0.25 ? "accent" : "success";
            return /* @__PURE__ */ jsxs34("div", { className: "flex min-w-0 flex-col gap-0.5", children: [
              /* @__PURE__ */ jsxs34("div", { className: "flex min-w-0 items-center gap-1.5", children: [
                /* @__PURE__ */ jsx57("span", { className: "min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--ink)]", children: s.name }),
                s.firingCount > 0 && /* @__PURE__ */ jsxs34("span", { className: "shrink-0 text-[10px] text-[var(--danger)]", title: `${s.firingCount} firing`, children: [
                  "\u23FA ",
                  s.firingCount
                ] }),
                /* @__PURE__ */ jsx57(Mono, { className: "shrink-0 text-[11px] font-semibold", style: { color: toneVars(tone).color }, children: overBudget ? "over" : `${Math.round(Math.max(0, remaining) * 100)}%` })
              ] }),
              /* @__PURE__ */ jsx57(MiniBudgetBar, { remaining })
            ] }, s.id);
          }),
          atRisk.totalBurning > atRisk.shown.length && /* @__PURE__ */ jsxs34(
            "button",
            {
              type: "button",
              onClick: () => onStateFilterChange?.("breached"),
              className: "self-start text-[11px] text-[var(--accent)] hover:underline",
              children: [
                "+",
                atRisk.totalBurning - atRisk.shown.length,
                " more burning budget"
              ]
            }
          )
        ] })
      ] })
    ] })
  ] });
}

// packages/ui/src/apps/slo/list/view.tsx
import { jsx as jsx58, jsxs as jsxs35 } from "react/jsx-runtime";
function matchesStateFilter(slo, filter) {
  if (filter === "firing") return slo.firingCount > 0;
  if (filter === "no_data") {
    return slo.rawState === "no_data" || slo.rawState === "source_idle" || slo.rawState === "stale" || slo.rawState === "disabled";
  }
  if (filter === "breached") return slo.rawState === "breached" || slo.rawState === "rules_missing";
  return slo.rawState === filter;
}
var DETAIL_TOOL = toolName("slo", "detail");
function ListView2({ props }) {
  return /* @__PURE__ */ jsx58(ViewGuard, { props, children: (p) => p.slos.length === 0 ? /* @__PURE__ */ jsx58(EmptyState, { children: "No SLOs configured for this scope." }) : /* @__PURE__ */ jsx58(ListViewInner2, { props: p }) });
}
function ListViewInner2({ props }) {
  const [openKey, setOpenKey] = useState15(null);
  const [query, setQuery] = useState15("");
  const [serviceFilter, setServiceFilter] = useState15(/* @__PURE__ */ new Set());
  const [stateFilter, setStateFilter] = useState15(null);
  const serviceFacets = useMemo9(() => {
    const counts = /* @__PURE__ */ new Map();
    for (const s of props.slos) counts.set(s.service, (counts.get(s.service) ?? 0) + 1);
    return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  }, [props.slos]);
  const filtered = useMemo9(() => {
    const q = query.trim().toLowerCase();
    return props.slos.filter((s) => {
      if (stateFilter && !matchesStateFilter(s, stateFilter)) return false;
      if (serviceFilter.size > 0 && !serviceFilter.has(s.service)) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q) || s.service.toLowerCase().includes(q);
    });
  }, [props.slos, query, serviceFilter, stateFilter]);
  const toggleService = (value) => setServiceFilter((cur) => {
    const next = new Set(cur);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  });
  const hasFilter = !!query || serviceFilter.size > 0 || stateFilter !== null;
  const clearAll = () => {
    setQuery("");
    setServiceFilter(/* @__PURE__ */ new Set());
    setStateFilter(null);
  };
  return /* @__PURE__ */ jsx58(PresentationFrame, { presentation: props, category: "SLO", osdUrl: props.osdUrl, children: /* @__PURE__ */ jsxs35("div", { className: "flex flex-col gap-3", children: [
    /* @__PURE__ */ jsx58(SloOverview, { slos: props.slos, activeStateFilter: stateFilter, onStateFilterChange: setStateFilter }),
    /* @__PURE__ */ jsxs35(Card, { children: [
      /* @__PURE__ */ jsx58(CardHeader, { className: "px-3 py-2", children: /* @__PURE__ */ jsxs35(CardTitle, { className: "text-sm", children: [
        /* @__PURE__ */ jsx58(Mono, { children: /* @__PURE__ */ jsx58(AnimatedNumber, { value: filtered.length, format: formatInt }) }),
        " ",
        filtered.length === 1 ? "SLO" : "SLOs"
      ] }) }),
      /* @__PURE__ */ jsxs35(CardContent, { className: "flex flex-col gap-3 p-3", children: [
        /* @__PURE__ */ jsx58("div", { className: "flex flex-wrap items-center gap-3", children: /* @__PURE__ */ jsx58(
          Input,
          {
            value: query,
            onChange: (e) => setQuery(e.target.value),
            placeholder: "Search SLOs by name or service\u2026",
            "aria-label": "Search SLOs",
            className: "max-w-[360px] flex-1"
          }
        ) }),
        /* @__PURE__ */ jsxs35("div", { className: "flex flex-wrap items-center gap-x-5 gap-y-2", children: [
          /* @__PURE__ */ jsx58(FacetGroup, { label: "Service", values: serviceFacets, selected: serviceFilter, onToggle: toggleService }),
          hasFilter && /* @__PURE__ */ jsx58(Button, { variant: "link", className: "text-[12px]", onClick: clearAll, children: "Clear filters" })
        ] }),
        /* @__PURE__ */ jsx58("div", { className: "@container", children: /* @__PURE__ */ jsxs35(Table, { className: "table-fixed", children: [
          /* @__PURE__ */ jsx58(TableHeader, { children: /* @__PURE__ */ jsxs35(TableRow, { children: [
            /* @__PURE__ */ jsx58(TableHead, { className: "w-[20px] px-2 py-2" }),
            /* @__PURE__ */ jsx58(TableHead, { className: "w-[44px] @max-[560px]:hidden", children: "State" }),
            /* @__PURE__ */ jsx58(TableHead, { className: "@max-[560px]:w-full", children: "SLO" }),
            /* @__PURE__ */ jsx58(TableHead, { className: "w-[96px] @max-[560px]:hidden", children: "Status" }),
            /* @__PURE__ */ jsx58(TableHead, { className: "w-[88px] text-right @max-[560px]:hidden", children: "Attained" }),
            /* @__PURE__ */ jsx58(TableHead, { className: "w-[140px] @max-[560px]:hidden", children: "Budget" })
          ] }) }),
          /* @__PURE__ */ jsx58(TableBody, { children: filtered.length === 0 ? /* @__PURE__ */ jsx58(TableRow, { className: "hover:bg-transparent", children: /* @__PURE__ */ jsx58(TableCell, { colSpan: 6, className: "py-6 text-center text-[var(--ink-mute)]", children: "No SLOs match your filters." }) }) : filtered.map((s, i) => /* @__PURE__ */ jsx58(
            SloTableRow,
            {
              slo: s,
              index: i,
              isOpen: openKey === (s.id || `#${i}`),
              onToggle: () => {
                const key = s.id || `#${i}`;
                setOpenKey(openKey === key ? null : key);
              }
            },
            s.id || i
          )) })
        ] }) }),
        props.hasMore && /* @__PURE__ */ jsx58(
          TruncationFooter,
          {
            showing: props.slos.length,
            limit: props.slos.length,
            total: props.total,
            noun: "SLOs"
          }
        )
      ] })
    ] })
  ] }) });
}
function SloTableRow({
  slo,
  index,
  isOpen,
  onToggle
}) {
  const { callTool, canCallTool } = useCallTool();
  const [fetch2, setFetch] = useState15(null);
  const expandable = canCallTool && !!slo.id;
  async function load() {
    setFetch({ state: "loading" });
    try {
      const res = await callTool(DETAIL_TOOL, {
        id: slo.id,
        ...slo.datasourceId ? { dataSourceId: slo.datasourceId } : {}
      });
      const sc = res.structuredContent ?? {};
      if (res.isError || sc.error) {
        setFetch({ state: "error", message: sc.error || "Failed to load SLO detail." });
        return;
      }
      setFetch({ state: "ready", detail: sc });
    } catch (err) {
      setFetch({ state: "error", message: err instanceof Error ? err.message : String(err) });
    }
  }
  function toggle() {
    const willOpen = !isOpen;
    onToggle();
    if (willOpen && fetch2 === null) void load();
  }
  return /* @__PURE__ */ jsxs35(Fragment11, { children: [
    /* @__PURE__ */ jsxs35(
      m.tr,
      {
        "data-state": isOpen ? "selected" : void 0,
        onClick: expandable ? toggle : void 0,
        className: cn(
          "border-b border-[var(--ink-hairline)] transition-colors data-[state=selected]:bg-[var(--accent-soft)]",
          expandable && "cursor-pointer hover:bg-[var(--surface-muted)]"
        ),
        custom: index,
        variants: rowEntrance,
        initial: "hidden",
        animate: "visible",
        children: [
          /* @__PURE__ */ jsx58(TableCell, { className: "w-[20px] px-2 py-1.5 text-lg text-[var(--ink-mute)]", children: expandable && /* @__PURE__ */ jsx58(
            "span",
            {
              className: cn("inline-block transition-transform", isOpen && "rotate-90"),
              "aria-hidden": true,
              children: "\u203A"
            }
          ) }),
          /* @__PURE__ */ jsx58(TableCell, { className: "@max-[560px]:hidden", children: /* @__PURE__ */ jsx58(
            "span",
            {
              className: cn("ml-1 inline-block h-[8px] w-[8px] rounded-full", DOT_CLASS_FOR_TONE[slo.stateTone]),
              title: slo.state
            }
          ) }),
          /* @__PURE__ */ jsxs35(TableCell, { children: [
            /* @__PURE__ */ jsxs35("div", { className: "flex min-w-0 items-center gap-2", children: [
              /* @__PURE__ */ jsx58("span", { className: "min-w-0 truncate font-medium text-[var(--ink)]", children: slo.name }),
              slo.firingCount > 0 && /* @__PURE__ */ jsxs35(Badge, { variant: "destructive", animate: false, className: "shrink-0 text-[10px]", children: [
                slo.firingCount,
                " firing"
              ] })
            ] }),
            /* @__PURE__ */ jsxs35("div", { className: "truncate text-[12px] text-[var(--ink-mute)]", children: [
              slo.service,
              " \xB7 ",
              slo.objectiveCount,
              " objective",
              slo.objectiveCount === 1 ? "" : "s",
              " \xB7 target ",
              slo.target,
              " / ",
              slo.window,
              !slo.enabled && " \xB7 disabled"
            ] }),
            /* @__PURE__ */ jsxs35("div", { className: "mt-1 hidden flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--ink-mute)] @max-[560px]:flex", children: [
              /* @__PURE__ */ jsx58(
                Badge,
                {
                  variant: BADGE_VARIANT_FOR_TONE[slo.stateTone],
                  animate: false,
                  className: "text-[10px] uppercase tracking-[0.04em]",
                  children: slo.state
                }
              ),
              /* @__PURE__ */ jsxs35("span", { className: "inline-flex items-center gap-1", children: [
                /* @__PURE__ */ jsx58(
                  Mono,
                  {
                    className: "text-[12px] font-bold [font-feature-settings:'tnum'_1,'lnum'_1]",
                    style: { color: toneTextColor(slo.budgetTone) },
                    children: slo.attainment
                  }
                ),
                "attained"
              ] }),
              /* @__PURE__ */ jsxs35("span", { className: "inline-flex items-center gap-1", children: [
                /* @__PURE__ */ jsx58(Mono, { style: { color: toneTextColor(slo.budgetTone, "var(--ink-mute)") }, children: slo.budgetRemaining }),
                "budget left"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsx58(TableCell, { className: "@max-[560px]:hidden", children: /* @__PURE__ */ jsx58(
            Badge,
            {
              variant: BADGE_VARIANT_FOR_TONE[slo.stateTone],
              animate: false,
              className: "text-[10px] uppercase tracking-[0.04em]",
              children: slo.state
            }
          ) }),
          /* @__PURE__ */ jsx58(TableCell, { className: "text-right @max-[560px]:hidden", children: /* @__PURE__ */ jsx58(
            Mono,
            {
              className: "text-[13px] font-bold [font-feature-settings:'tnum'_1,'lnum'_1]",
              style: { color: toneTextColor(slo.budgetTone) },
              children: slo.attainment
            }
          ) }),
          /* @__PURE__ */ jsxs35(TableCell, { className: "@max-[560px]:hidden", children: [
            /* @__PURE__ */ jsx58(HBar, { fraction: slo.budgetFraction, tone: slo.budgetTone, height: 8 }),
            /* @__PURE__ */ jsxs35("div", { className: "mt-1 flex justify-between text-[10px] text-[var(--ink-mute)]", children: [
              /* @__PURE__ */ jsx58("span", { children: "remaining" }),
              /* @__PURE__ */ jsx58(Mono, { style: { color: toneTextColor(slo.budgetTone, "var(--ink-mute)") }, children: slo.budgetRemaining })
            ] })
          ] })
        ]
      }
    ),
    /* @__PURE__ */ jsx58(TableRow, { className: "border-0 hover:bg-transparent", children: /* @__PURE__ */ jsx58(TableCell, { colSpan: 6, className: "bg-transparent p-0", children: /* @__PURE__ */ jsx58(AnimatePresence, { initial: false, children: isOpen && /* @__PURE__ */ jsx58(
      m.div,
      {
        initial: { height: 0, opacity: 0 },
        animate: { height: "auto", opacity: 1 },
        exit: { height: 0, opacity: 0 },
        transition: springSoft,
        style: { overflow: "hidden" },
        children: /* @__PURE__ */ jsx58("div", { className: "px-3 py-3", onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsx58(DetailBody, { fetch: fetch2, onRetry: load }) })
      },
      "detail"
    ) }) }) })
  ] });
}
function DetailBody({ fetch: fetch2, onRetry }) {
  if (fetch2 === null || fetch2.state === "loading") {
    return /* @__PURE__ */ jsx58("div", { className: "px-1 py-2 text-sm text-[var(--ink-mute)]", children: "Loading error-budget detail\u2026" });
  }
  if (fetch2.state === "error") {
    return /* @__PURE__ */ jsxs35("div", { className: "flex items-center gap-3 px-1 py-2 text-sm", children: [
      /* @__PURE__ */ jsx58("span", { className: "text-[var(--danger)]", children: fetch2.message }),
      /* @__PURE__ */ jsx58(Button, { variant: "outline", size: "sm", className: "text-xs", onClick: onRetry, children: "Retry" })
    ] });
  }
  const { objective, name, service, error } = fetch2.detail;
  if (error || !objective) {
    return /* @__PURE__ */ jsx58("div", { className: "px-1 py-2 text-sm text-[var(--ink-mute)]", children: error ?? "No objective data for this SLO." });
  }
  if (objective.error) {
    return /* @__PURE__ */ jsx58("div", { className: "px-1 py-2 text-sm text-[var(--danger)]", children: objective.error });
  }
  const detail = name ? describeObjective(objective, name, service) : null;
  const actions = detail ? /* @__PURE__ */ jsx58(
    DetailActions,
    {
      investigatePrompt: `Investigate this SLO's error budget and burn rate, explain the likely cause of the burn, and suggest next steps. The error-budget detail below is the current \`slo_detail\` output for this SLO \u2014 do NOT call \`slo_detail\` again; start from these numbers and go straight to root-cause signals (service logs/traces/metrics for the burn window):

${detail}`,
      contextText: `Selected SLO:
${detail}`,
      investigateTitle: "Ask the assistant to investigate this SLO now",
      contextTitle: "Add this SLO to the assistant's context for your next message"
    }
  ) : null;
  return /* @__PURE__ */ jsx58(BurnRateAlertsTable, { tiers: objective.tiers ?? [], actions });
}
function BurnRateAlertsTable({ tiers, actions }) {
  if (tiers.length === 0) {
    return /* @__PURE__ */ jsxs35("div", { className: "flex flex-col gap-2", children: [
      actions && /* @__PURE__ */ jsx58("div", { className: "flex justify-end", children: actions }),
      /* @__PURE__ */ jsx58("div", { className: "px-1 py-2 text-sm text-[var(--ink-mute)]", children: "No burn-rate alerts configured for this SLO." })
    ] });
  }
  return /* @__PURE__ */ jsxs35("div", { className: "flex flex-col gap-2", children: [
    /* @__PURE__ */ jsxs35("div", { className: "flex items-center justify-between gap-3", children: [
      /* @__PURE__ */ jsx58("div", { className: "text-[10px] uppercase tracking-[0.05em] text-[var(--ink-mute)]", children: "Burn-rate alerts" }),
      actions
    ] }),
    /* @__PURE__ */ jsxs35(Table, { children: [
      /* @__PURE__ */ jsx58(TableHeader, { children: /* @__PURE__ */ jsxs35(TableRow, { children: [
        /* @__PURE__ */ jsx58(TableHead, { children: "Tier" }),
        /* @__PURE__ */ jsx58(TableHead, { className: "w-[64px]", children: "Burn" }),
        /* @__PURE__ */ jsx58(TableHead, { className: "text-right", children: "Short" }),
        /* @__PURE__ */ jsx58(TableHead, { className: "text-right", children: "Long" }),
        /* @__PURE__ */ jsx58(TableHead, { className: "text-right", children: "Threshold" }),
        /* @__PURE__ */ jsx58(TableHead, { className: "w-[96px]", children: "Status" })
      ] }) }),
      /* @__PURE__ */ jsx58(TableBody, { children: tiers.map((t, i) => /* @__PURE__ */ jsxs35(TableRow, { className: "hover:bg-transparent", children: [
        /* @__PURE__ */ jsxs35(TableCell, { children: [
          /* @__PURE__ */ jsxs35("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx58("span", { className: "font-medium text-[var(--ink)]", children: t.label }),
            t.alertManagerUrl && /* @__PURE__ */ jsx58(
              ExternalLink,
              {
                href: t.alertManagerUrl,
                stopPropagation: true,
                className: "shrink-0 text-[11px] text-[var(--accent)] hover:underline",
                children: "\u2197"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs35("div", { className: "text-[11px] text-[var(--ink-mute)]", children: [
            t.shortWindow,
            " / ",
            t.longWindow,
            t.severity ? ` \xB7 ${t.severity}` : "",
            t.forDuration ? ` \xB7 for ${t.forDuration}` : ""
          ] })
        ] }),
        /* @__PURE__ */ jsx58(TableCell, { children: /* @__PURE__ */ jsx58(Mono, { className: "text-[12px]", children: t.multiplier }) }),
        /* @__PURE__ */ jsx58(TableCell, { className: "text-right", children: /* @__PURE__ */ jsx58(
          Mono,
          {
            className: "text-[12px]",
            style: t.shortExceeded ? { color: toneTextColor("danger") } : void 0,
            children: t.shortRatio
          }
        ) }),
        /* @__PURE__ */ jsx58(TableCell, { className: "text-right", children: /* @__PURE__ */ jsx58(
          Mono,
          {
            className: "text-[12px]",
            style: t.longExceeded ? { color: toneTextColor("danger") } : void 0,
            children: t.longRatio
          }
        ) }),
        /* @__PURE__ */ jsx58(TableCell, { className: "text-right", children: /* @__PURE__ */ jsx58(Mono, { className: "text-[12px] text-[var(--ink-mute)]", children: t.threshold }) }),
        /* @__PURE__ */ jsx58(TableCell, { children: /* @__PURE__ */ jsx58(
          Badge,
          {
            variant: BADGE_VARIANT_FOR_TONE[t.healthTone],
            animate: false,
            className: "text-[10px] uppercase tracking-[0.04em]",
            children: t.healthLabel
          }
        ) })
      ] }, i)) })
    ] })
  ] });
}

// src/apps/slo/list/tool.ts
var listRoute2 = defineRoute({
  id: "list",
  tool: {
    title: "Present configured SLOs",
    description: "PRESENTATION: a feed widget of configured SLOs + error budgets (from the observability plugin). Each card shows the worst objective's attainment vs target, budget remaining, state, and firing alerts. PREREQUISITE: call `slo_search` FIRST (same filters) and read the rows \u2014 you supply this widget's `narrative`/`suggestions` BEFORE it self-fetches its data, so without reading `slo_search` first that framing is an uninformed guess. Filter: `service`, `state`, `search`, `dataSourceId`. Expand a row to drill into one SLO's full detail page (`slo_detail`, loaded on demand). Requires the observability plugin's SLO feature (a bare cluster shows a 'failed to load' state).",
    inputSchema: inputSchema11
  },
  propsSchema: propsSchema7,
  view: ListView2,
  handler: async ({ service, state, dataSourceId, search, narrative, suggestions }, ctx) => {
    try {
      const [result, workspaceId] = await Promise.all([
        fetchSlos(ctx, {
          service,
          state,
          dataSourceId,
          search,
          logTag: "[slo.list]"
        }),
        ctx.workspaceId ?? ctx.osUi.resolveObservabilityWorkspaceId()
      ]);
      const osdUrl = sloUrl({ origin: ctx.osUi.endpoint, workspaceId });
      const props = {
        narrative,
        suggestions,
        slos: result.cards,
        osdUrl,
        total: result.total,
        hasMore: result.hasMore
      };
      return { props, text: summarize5(result, state) };
    } catch (err) {
      const msg = errorMessage(err);
      ctx.logger.error("[slo.list] listSlos failed: " + msg);
      const osdUrl = sloUrl({ origin: ctx.osUi.endpoint, workspaceId: ctx.workspaceId });
      const props = { narrative, suggestions, slos: [], osdUrl, error: msg };
      return {
        props,
        text: "Failed to load SLOs from the observability plugin: " + msg + "\nThe SLO feature may not be available on this endpoint.",
        isError: true
      };
    }
  }
});

// src/apps/slo/objective-compute.ts
var DEFAULT_BURN_WINDOW = "24h";
async function computeBurnSeries(ctx, defaultDataSourceId, spec) {
  const q = spec.query?.trim();
  if (!q) return {};
  const ds = spec.dataSourceId?.trim() || defaultDataSourceId;
  const budget = 1 - spec.target;
  try {
    const time = resolveTimeRange(
      { timeRange: spec.window ?? DEFAULT_BURN_WINDOW },
      { defaultFrom: `now-${DEFAULT_BURN_WINDOW}` }
    );
    const window2 = dateMathWindow(time) ?? { from: `now-${DEFAULT_BURN_WINDOW}`, to: "now" };
    const result = await ctx.osUi.runPromql(ds, q, ds, window2, "range");
    const rows = pplRows(result);
    const burnPoints = [];
    const budgetPoints = [];
    const xLabels = [];
    let latestRatio;
    for (const r of rows) {
      const v = r.getNumber("Value");
      const t = r.getString("Time");
      if (!t || !Number.isFinite(v)) continue;
      burnPoints.push(burnRate(v, spec.target));
      budgetPoints.push(budget > 0 ? 1 - v / budget : Number.NaN);
      xLabels.push(formatTimeTick(t));
      latestRatio = v;
    }
    return {
      burn: burnPoints.length >= 2 ? { points: burnPoints, xLabels } : void 0,
      budgetSeries: budgetPoints.length >= 2 ? { points: budgetPoints, xLabels } : void 0,
      latestRatio
    };
  } catch (err) {
    ctx.logger.warn(`[slo] burn-rate series failed: ${promqlErrorHint(err)}`);
    return {};
  }
}
async function computeTier(ctx, defaultDataSourceId, target, tier) {
  const budget = 1 - target;
  const threshold = tier.burnRateMultiplier * budget;
  const common = { language: tier.language, dataSourceId: tier.dataSourceId, dataset: tier.dataset };
  const run = async (query) => {
    try {
      return await runScalarQuery(ctx, defaultDataSourceId, { ...common, query });
    } catch (err) {
      ctx.logger.warn(`[slo] tier "${tier.label ?? tier.severity}" query failed: ${promqlErrorHint(err)}`);
      return Number.NaN;
    }
  };
  const [short, long] = await Promise.all([run(tier.shortQuery), run(tier.longQuery)]);
  const health = classifyTier(short, long, threshold);
  const frac = (v) => Number.isFinite(v) && threshold > 0 ? Math.max(0, Math.min(1.5, v / threshold)) : 0;
  const mult = tier.burnRateMultiplier;
  return {
    label: tier.label ?? `${tier.severity ?? "Tier"} burn`,
    severity: tier.severity,
    multiplier: `${Number.isInteger(mult) ? mult : mult.toFixed(1)}\xD7`,
    shortWindow: tier.shortWindow,
    longWindow: tier.longWindow,
    shortRatio: formatErrorRatio(short),
    longRatio: formatErrorRatio(long),
    shortFraction: frac(short),
    longFraction: frac(long),
    shortExceeded: Number.isFinite(short) && short > threshold,
    longExceeded: Number.isFinite(long) && long > threshold,
    threshold: formatErrorRatio(threshold),
    forDuration: tier.forDuration,
    healthLabel: tierHealthLabel(health),
    healthTone: tierHealthTone(health),
    alertManagerUrl: tier.alertManagerUrl
  };
}
function formatTte(ms) {
  if (ms === null) return { tte: "\u2014", tteTone: "neutral" };
  if (ms === 0) return { tte: "exhausted", tteTone: "danger" };
  const tone = ms < 36e5 ? "danger" : ms < 24 * 36e5 ? "warn" : "success";
  return { tte: formatDurationMs(ms), tteTone: tone };
}
function buildEvents(good, total, target) {
  const ratio = Number.isFinite(total) && total > 0 ? good / total : Number.NaN;
  return {
    good: formatEventCount(good),
    total: formatEventCount(total),
    ratio: Number.isFinite(ratio) ? `${(ratio * 100).toFixed(2)}%` : "\u2014",
    ratioTone: attainmentTone(ratio, target)
  };
}

// src/apps/slo/query-builders.ts
function ensureCountMetric(metric) {
  const base2 = metric.replace(/_total$/, "").replace(/_count$/, "").replace(/_sum$/, "").replace(/_bucket$/, "");
  return `${base2}_count`;
}
function ensureBucketMetric(metric) {
  const base2 = metric.replace(/_total$/, "").replace(/_count$/, "").replace(/_sum$/, "").replace(/_bucket$/, "");
  return `${base2}_bucket`;
}
function formatLeBound(bound, unit) {
  const seconds = unit === "milliseconds" ? bound / 1e3 : bound;
  return parseFloat(seconds.toPrecision(10)).toString();
}
function buildSelectors(slo, includeGoodFilter) {
  if (slo.spec.sli.type !== "single") return "";
  const sli = slo.spec.sli;
  const parts = sli.dimensions.map(
    (d) => `${d.name}="${d.value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`
  );
  if (includeGoodFilter && sli.definition.backend === "prometheus") {
    const g = sli.definition.goodEventsFilter?.trim();
    if (g) parts.push(g);
  }
  return parts.join(", ");
}
function buildErrorRatioExprForWindow(slo, objective, window2) {
  if (slo.spec.sli.type !== "single") return null;
  const def = slo.spec.sli.definition;
  if (def.backend !== "prometheus") return null;
  if (def.type === "custom") {
    if (!def.customExpr) return null;
    if (def.customExpr.mode === "raw") return def.customExpr.errorRatioQuery;
    return `1 - ((${def.customExpr.goodQuery}) / (${def.customExpr.totalQuery}))`;
  }
  const dim = buildSelectors(slo, false);
  const good = buildSelectors(slo, true);
  if (def.type === "availability") {
    const metric = def.metric;
    if (!metric) return null;
    const counter = metric.endsWith("_total") ? metric : ensureCountMetric(metric);
    return `1 - (
  sum(rate(${counter}{${good}}[${window2}]))
  /
  sum(rate(${counter}{${dim}}[${window2}]))
)`;
  }
  const bucket = ensureBucketMetric(def.metric ?? "");
  const le = formatLeBound(objective.latencyThreshold ?? 0, def.latencyThresholdUnit ?? "seconds");
  return `1 - (
  sum(rate(${bucket}{${dim}, le="${le}"}[${window2}]))
  /
  sum(rate(${bucket}{${dim}, le="+Inf"}[${window2}]))
)`;
}
function buildGoodEventsCountQuery(slo, objective, window2) {
  if (slo.spec.sli.type !== "single") return null;
  const def = slo.spec.sli.definition;
  if (def.backend !== "prometheus" || def.type === "custom") return null;
  const good = buildSelectors(slo, true);
  if (def.type === "availability") {
    const metric = def.metric;
    if (!metric) return null;
    const counter = metric.endsWith("_total") ? metric : ensureCountMetric(metric);
    return `sum(increase(${counter}{${good}}[${window2}]))`;
  }
  const bucket = ensureBucketMetric(def.metric ?? "");
  const dim = buildSelectors(slo, false);
  const le = formatLeBound(objective.latencyThreshold ?? 0, def.latencyThresholdUnit ?? "seconds");
  return `sum(increase(${bucket}{${dim}, le="${le}"}[${window2}]))`;
}
function buildTotalEventsCountQuery(slo, _objective, window2) {
  if (slo.spec.sli.type !== "single") return null;
  const def = slo.spec.sli.definition;
  if (def.backend !== "prometheus" || def.type === "custom") return null;
  const dim = buildSelectors(slo, false);
  if (def.type === "availability") {
    const metric = def.metric;
    if (!metric) return null;
    const counter = metric.endsWith("_total") ? metric : ensureCountMetric(metric);
    return `sum(increase(${counter}{${dim}}[${window2}]))`;
  }
  const bucket = ensureBucketMetric(def.metric ?? "");
  return `sum(increase(${bucket}{${dim}, le="+Inf"}[${window2}]))`;
}

// src/apps/slo/detail/build-objective.ts
var TIER_LABELS = ["Page \xB7 Quick", "Page \xB7 Slow", "Ticket \xB7 Quick", "Ticket \xB7 Slow"];
function warnAtConsumed(thresholds) {
  if (!thresholds || thresholds.length === 0) return 0.5;
  const tightest = thresholds.reduce((best, t) => t.threshold > best ? t.threshold : best, -Infinity);
  if (!Number.isFinite(tightest)) return 0.5;
  return Math.min(1, Math.max(0, 1 - tightest));
}
async function buildDetailObjective(ctx, slo, defaultDataSourceId, workspaceId) {
  const status = worstObjectiveStatus(slo.liveStatus.objectives);
  const objective = slo.spec.objectives.find((o) => o.name === status?.objectiveName) ?? slo.spec.objectives[0];
  const target = objective?.target ?? slo.liveStatus.objectives[0]?.attainment ?? 0.99;
  const budget = 1 - target;
  const window2 = sloWindowDuration(slo.spec.window);
  const ds = defaultDataSourceId || slo.spec.datasourceId;
  const attainment = status?.attainment ?? Number.NaN;
  const remaining = status ? status.errorBudgetRemaining : errorBudgetRemaining(attainment, target);
  const errorRatio = 1 - attainment;
  const rate = burnRate(errorRatio, target);
  const label = objective?.displayName ?? objective?.name ?? slo.spec.name;
  const budgetWindow = slo.spec.window.type === "rolling" ? slo.spec.window.duration : "30d";
  const burnRateQuery = buildErrorRatioExprForWindow(slo, objective, budgetWindow);
  const goodQuery = buildGoodEventsCountQuery(slo, objective, "1h");
  const totalQuery = buildTotalEventsCountQuery(slo, objective, "1h");
  const seriesPromise = burnRateQuery ? computeBurnSeries(ctx, ds, {
    language: "promql",
    dataSourceId: ds,
    query: burnRateQuery,
    window: budgetWindow,
    target
  }) : Promise.resolve({});
  const eventsPromise = goodQuery && totalQuery ? Promise.all([
    runScalarQuery(ctx, ds, { language: "promql", dataSourceId: ds, query: goodQuery }).catch(() => Number.NaN),
    runScalarQuery(ctx, ds, { language: "promql", dataSourceId: ds, query: totalQuery }).catch(() => Number.NaN)
  ]) : Promise.resolve(null);
  const tierInputs = (slo.spec.alerting.burnRates ?? []).slice(0, 6).map((t, i) => {
    const shortQ = buildErrorRatioExprForWindow(slo, objective, t.shortWindow);
    const longQ = buildErrorRatioExprForWindow(slo, objective, t.longWindow);
    return {
      language: "promql",
      dataSourceId: ds,
      severity: t.severity,
      label: TIER_LABELS[i] ?? `Tier ${i + 1}`,
      burnRateMultiplier: t.burnRateMultiplier,
      shortWindow: t.shortWindow,
      longWindow: t.longWindow,
      shortQuery: shortQ ?? "",
      longQuery: longQ ?? "",
      forDuration: t.forDuration,
      alertManagerUrl: t.createAlarm && slo.spec.mode !== "shadow" ? sloBurnRateRuleUrl({
        origin: ctx.osUi.endpoint,
        workspaceId,
        sloId: slo.id,
        burnRateMultiplier: t.burnRateMultiplier
      }) : void 0
    };
  });
  const tiersPromise = tierInputs.length > 0 ? Promise.all(tierInputs.map((t) => computeTier(ctx, ds, target, t))) : Promise.resolve(void 0);
  const [series, eventsCounts, tiers] = await Promise.all([
    seriesPromise,
    eventsPromise,
    tiersPromise
  ]);
  const windowMs = slo.spec.window.type === "rolling" ? parseDurationMs(slo.spec.window.duration) : 0;
  const ratioForForecast = Number.isFinite(series.latestRatio ?? NaN) ? series.latestRatio : errorRatio;
  const tteMs = timeToExhaustionMs(remaining, ratioForForecast, budget, windowMs);
  const { tte, tteTone } = formatTte(tteMs);
  const last24hConsumed = Number.isFinite(series.latestRatio ?? NaN) && windowMs > 0 && budget > 0 ? Math.max(0, series.latestRatio * (24 * 36e5) / (budget * windowMs)) : void 0;
  return {
    label,
    target: formatAttainment(target),
    window: window2,
    attainment: formatAttainment(attainment),
    attainmentTone: attainmentTone(attainment, target),
    budgetRemaining: formatBudget(remaining),
    budgetRemainingValue: Number.isFinite(remaining) ? remaining : 0,
    budgetFraction: Number.isFinite(remaining) ? Math.max(0, Math.min(1, remaining)) : 0,
    budgetTone: budgetTone(remaining),
    budgetTotal: formatBudget(budget),
    warnAtConsumed: warnAtConsumed(slo.spec.budgetWarningThresholds),
    last24hConsumed,
    burnRate: formatBurnRate(rate),
    burnRateTone: burnRateTone(rate),
    timeToExhaustion: tte,
    timeToExhaustionTone: tteTone,
    events: eventsCounts && Number.isFinite(eventsCounts[1]) ? buildEvents(eventsCounts[0], eventsCounts[1], target) : void 0,
    burn: series.burn,
    budgetSeries: series.budgetSeries,
    tiers
  };
}

// src/apps/slo/detail/build-meta.ts
function windowLabel(window2) {
  return window2.type === "rolling" ? `rolling ${window2.duration}` : `calendar (${window2.period})`;
}
function buildDetailMeta(slo) {
  const state = slo.liveStatus.state;
  const status = worstObjectiveStatus(slo.liveStatus.objectives);
  const objective = slo.spec.objectives.find((o) => o.name === status?.objectiveName) ?? slo.spec.objectives[0];
  const target = objective?.target ?? 0.99;
  const attainment = status?.attainment ?? Number.NaN;
  const badges = [];
  if (slo.spec.enabled === false) badges.push("Disabled");
  if (slo.spec.mode === "shadow") badges.push("shadow");
  let sliTypeLabel;
  if (slo.spec.sli.type === "single") {
    sliTypeLabel = slo.spec.sli.definition.type;
  } else {
    sliTypeLabel = "composite";
  }
  let deltaPp;
  let deltaTone;
  if (Number.isFinite(attainment)) {
    const pp = (attainment - target) * 100;
    const sign = pp >= 0 ? "+" : "";
    deltaPp = `${sign}${pp.toFixed(2)} pp`;
    deltaTone = pp >= 0 ? "success" : "danger";
  }
  return {
    stateLabel: sloStateLabel(state),
    stateTone: sloStateTone(state),
    sliTypeLabel,
    windowLabel: windowLabel(slo.spec.window),
    description: slo.spec.description,
    badges,
    deltaPp,
    deltaTone
  };
}

// packages/ui/src/apps/slo/inspect/schema.ts
import { z as z18 } from "zod";
var inputSchema12 = {
  id: z18.string().describe("The configured SLO's id (from a `slo_list` / `slo_search` row)."),
  dataSourceId: z18.string().optional().describe("Override the SLO's own datasource for the PromQL queries. Usually omit.")
};

// src/apps/slo/inspect/tool.ts
function tierRow(t) {
  return {
    tier: t.label,
    severity: t.severity ?? "",
    burn: t.multiplier,
    windows: `${t.shortWindow}/${t.longWindow}`,
    shortRatio: t.shortRatio,
    longRatio: t.longRatio,
    threshold: t.threshold,
    for: t.forDuration ?? "",
    status: t.healthLabel
  };
}
var inspectRoute = defineRoute({
  id: "inspect",
  tool: {
    title: "Inspect one configured SLO",
    description: "Drill into ONE configured SLO as text \u2014 the text sibling of `slo_detail`. Pass the SLO `id` (from a `slo_list` / `slo_search` row). Returns the COMPUTED error-budget headline (attainment vs target, budget remaining, burn rate, time-to-exhaustion), the status banner (state, SLI type, window, delta), recent good/total events, AND the MWMBR burn-rate tier matrix as rows \u2014 each tier's short/long error ratios, threshold, for-duration, and whether it is FIRING / warming / healthy. No widget \u2014 call freely. Use this BEFORE `slo_detail` so your `narrative`/`suggestions` are grounded in the tier-level firing state (which `slo_search` does NOT carry). Same compute as `slo_detail`, so the numbers match the widget exactly. Requires the observability plugin's SLO feature on the endpoint.",
    inputSchema: inputSchema12
  },
  handler: async ({ id, dataSourceId }, ctx) => {
    try {
      const [slo, workspaceId] = await Promise.all([
        ctx.osUi.getSlo(id),
        ctx.workspaceId ?? ctx.osUi.resolveObservabilityWorkspaceId().catch(() => void 0)
      ]);
      const objective = await buildDetailObjective(ctx, slo, dataSourceId ?? "", workspaceId);
      const meta = buildDetailMeta(slo);
      const tiers = (objective.tiers ?? []).map(tierRow);
      const firing = (objective.tiers ?? []).filter((t) => t.healthLabel === "firing");
      const bannerBits = [
        meta.stateLabel,
        meta.sliTypeLabel,
        meta.windowLabel,
        meta.deltaPp ? `\u0394 ${meta.deltaPp}` : void 0,
        ...meta.badges
      ].filter(Boolean);
      const eventsNote = objective.events ? ` Events (1h): ${objective.events.good}/${objective.events.total} good (${objective.events.ratio}).` : "";
      const firingNote = objective.tiers === void 0 ? " No burn-rate tiers configured." : firing.length > 0 ? ` FIRING tiers: ${firing.map((t) => t.label).join(", ")}.` : " No burn-rate tiers firing.";
      const text = `${slo.spec.name} (${slo.spec.service}) \u2014 ${bannerBits.join(" \xB7 ")}. ${objective.attainment} attained (target ${objective.target}), budget ${objective.budgetRemaining} of ${objective.budgetTotal}, burn ${objective.burnRate}` + (objective.timeToExhaustion !== "\u2014" ? `, exhausts in ${objective.timeToExhaustion}` : "") + `.${eventsNote}${firingNote} To PRESENT this as a widget, call \`slo_detail\` with this \`id\`.`;
      return { props: { tiers }, text };
    } catch (err) {
      const msg = errorMessage(err);
      ctx.logger.error(`[slo.inspect] getSlo("${id}") failed: ${msg}`);
      return {
        props: { error: msg },
        text: `Failed to inspect SLO "${id}": ` + msg + "\nThe SLO feature may not be available on this endpoint.",
        isError: true
      };
    }
  }
});

// packages/ui/src/apps/slo/detail/schema.ts
import { z as z20 } from "zod";

// packages/ui/src/apps/slo/_shared/objective-schema.ts
import { z as z19 } from "zod";
var toneEnum4 = z19.enum(GLASS_TONES);
var burnSeriesRendered = z19.object({
  /** Per-bucket values (burn-rate multiples, or budget-remaining fractions). */
  points: z19.array(z19.number()),
  /** Aligned x-axis bucket labels (HH:MM). */
  xLabels: z19.array(z19.string())
});
var eventsRendered = z19.object({
  /** Good-event count, compact (e.g. `12.4k`). */
  good: z19.string(),
  /** Total-event count, compact. */
  total: z19.string(),
  /** good/total as a percent string. */
  ratio: z19.string(),
  ratioTone: toneEnum4
});
var tierRendered = z19.object({
  label: z19.string(),
  severity: z19.string().optional(),
  /** Burn multiplier as a `14×` label. */
  multiplier: z19.string(),
  shortWindow: z19.string(),
  longWindow: z19.string(),
  /** Short/long error ratios as percent strings. */
  shortRatio: z19.string(),
  longRatio: z19.string(),
  /** 0..1 fraction (ratio ÷ threshold, clamped) for each window's burn bar. */
  shortFraction: z19.number(),
  longFraction: z19.number(),
  shortExceeded: z19.boolean(),
  longExceeded: z19.boolean(),
  /** Threshold (multiplier × errorBudget) as a percent string. */
  threshold: z19.string(),
  forDuration: z19.string().optional(),
  /** Tier health: firing / warming / healthy / no data. */
  healthLabel: z19.string(),
  healthTone: toneEnum4,
  /** Optional deep link to this tier's rule in the Alert Manager app. */
  alertManagerUrl: z19.string().optional()
});
var objectiveRendered = z19.object({
  label: z19.string(),
  /** Target as a percent string (e.g. `99.9%`). */
  target: z19.string(),
  /** Window label echoed for context (e.g. `30d`). */
  window: z19.string().optional(),
  /** Attainment as a percent string. */
  attainment: z19.string(),
  attainmentTone: toneEnum4,
  /** Error-budget remaining as a signed percent (can be negative). */
  budgetRemaining: z19.string(),
  /** Raw signed budget-remaining fraction (may be negative) — drives the bar's
   *  consumed-fill / overflow logic without re-parsing the formatted string. */
  budgetRemainingValue: z19.number(),
  /** 0..1 fraction for the bar (clamps; negative budget → empty bar). */
  budgetFraction: z19.number(),
  budgetTone: toneEnum4,
  /** Total error budget (1 − target) as a percent string (the "of X total"). */
  budgetTotal: z19.string(),
  /** Warn-at-consumed fraction (green→amber boundary on the budget bar). */
  warnAtConsumed: z19.number().optional(),
  /** Fraction of total budget consumed by the last 24h of burn (thin overlay). */
  last24hConsumed: z19.number().optional(),
  /** Burn rate as a `1.8×` multiple. */
  burnRate: z19.string(),
  burnRateTone: toneEnum4,
  /** Linear time-to-exhaustion forecast (e.g. `2d 4h`, `exhausted`, or `—`). */
  timeToExhaustion: z19.string(),
  timeToExhaustionTone: toneEnum4,
  /** Recent good/total event counts (only when good/total counts are available). */
  events: eventsRendered.optional(),
  /** Optional burn-rate sparkline (burn-rate multiples per bucket). */
  burn: burnSeriesRendered.optional(),
  /** Optional budget-remaining-over-time series (fractions per bucket). */
  budgetSeries: burnSeriesRendered.optional(),
  /** Optional MWMBR burn-rate tier matrix. */
  tiers: z19.array(tierRendered).optional(),
  /** Per-objective fetch/compute error (renders in place of the values). */
  error: z19.string().optional()
});
var CHART_KEYS = [
  "burn-rate-alerts",
  "error-budget-remaining",
  "burn-rate-by-tier"
];

// packages/ui/src/apps/slo/detail/schema.ts
var toneEnum5 = z20.enum(GLASS_TONES);
var DETAIL_SECTIONS = ["summary", ...CHART_KEYS];
var detailSection = z20.enum(DETAIL_SECTIONS);
var inputSchema13 = {
  id: z20.string().describe("The configured SLO's id (from a `slo_list` row)."),
  /** Carried through from the list so the handler can scope queries. */
  dataSourceId: z20.string().optional().describe("Override the SLO's own datasource for the PromQL queries. Usually omit."),
  /**
   * Which detail blocks to render. Pass this ONLY when the user explicitly
   * asked to see one specific block; a generic drill-in / investigate / explain
   * request must OMIT it. OMITTED → the compact default (status banner +
   * error-budget tiles + consumed bar, with the three charts present but
   * collapsed). When provided, ONLY the named blocks render, and any named chart
   * is expanded by default: `summary` (status banner + budget tiles + consumed
   * bar), `burn-rate-alerts` (the MWMBR tier matrix), `error-budget-remaining`
   * (the budget-over-time area chart), and `burn-rate-by-tier` (the burn-rate
   * sparkline).
   */
  sections: z20.array(detailSection).optional().describe(
    'Which detail blocks to render. Pass this ONLY when the user explicitly asked to see one specific block; a generic drill-in / investigate / explain request must OMIT it. OMITTED \u2192 the compact default (status banner + budget tiles + consumed bar, with the three charts collapsed). When provided, ONLY the named blocks render and any named chart is expanded \u2014 any of: "summary" (banner + budget tiles + consumed bar), "burn-rate-alerts" (the MWMBR tier matrix), "error-budget-remaining" (the budget-over-time area chart), "burn-rate-by-tier" (the burn-rate sparkline).'
  ),
  ...presentationInputFields
};
var detailMeta = z20.object({
  /** Health state badge — label + tone (Breached / Healthy / Warning / No data). */
  stateLabel: z20.string(),
  stateTone: toneEnum5,
  /** SLI leaf type / kind chip (e.g. `prometheus`, `availability`). */
  sliTypeLabel: z20.string().optional(),
  /** Window chip (e.g. `rolling 28d`). */
  windowLabel: z20.string(),
  /** Optional free-text SLO description. */
  description: z20.string().optional(),
  /** Banner badges that deviate from defaults: `Disabled`, `shadow`. */
  badges: z20.array(z20.string()),
  /** Signed attainment − target, in percentage points (e.g. `-12.64 pp`). */
  deltaPp: z20.string().optional(),
  deltaTone: toneEnum5.optional()
});
var propsSchema8 = z20.object({
  ...presentationPropsFields,
  /** SLO display name (header). */
  name: z20.string().optional(),
  /** Owning service. */
  service: z20.string().optional(),
  /** The (worst) objective's full error-budget card. */
  objective: objectiveRendered.optional(),
  /** The status-banner fields (the `summary` block's header). */
  meta: detailMeta.optional(),
  /** Which detail blocks to render (echoes the tool input). Omitted → the
   *  compact default (summary + three collapsed charts). */
  sections: z20.array(detailSection).optional(),
  /** Deep link to this SLO's detail page in OpenSearch Dashboards. */
  osdUrl: z20.string().optional(),
  /** Fetch/compute error (renders in place of the card). */
  error: z20.string().optional()
});

// packages/ui/src/apps/slo/detail/view.tsx
import { jsx as jsx59, jsxs as jsxs36 } from "react/jsx-runtime";
function DetailView({ props }) {
  return /* @__PURE__ */ jsx59(ViewGuard, { props, children: (p) => p.error || !p.objective ? /* @__PURE__ */ jsx59(EmptyState, { children: p.error ?? "No objective data for this SLO." }) : /* @__PURE__ */ jsx59(PresentationFrame, { presentation: p, category: "SLO", osdUrl: p.osdUrl, children: /* @__PURE__ */ jsx59(SloDetailBody, { props: p }) }) });
}
function SloDetailBody({ props }) {
  const { objective, meta, name, service, sections } = props;
  if (!objective) return null;
  const explicit = sections != null;
  const want = new Set(sections ?? []);
  const showSummary = !explicit || want.has("summary");
  const visibleCharts = explicit ? new Set(CHART_KEYS.filter((k) => want.has(k))) : void 0;
  return /* @__PURE__ */ jsxs36("div", { className: "flex flex-col gap-3", children: [
    showSummary && meta && /* @__PURE__ */ jsx59(StatusBanner, { meta, name }),
    /* @__PURE__ */ jsx59(
      ObjectiveCard,
      {
        obj: objective,
        sloName: name,
        service,
        showInvestigate: false,
        showBudget: showSummary,
        visibleCharts,
        expandCharts: explicit
      }
    )
  ] });
}
function StatusBanner({ meta, name }) {
  return /* @__PURE__ */ jsx59("div", { className: "rounded-lg border border-[var(--surface-border)] bg-[var(--surface-muted)] px-4 py-3", children: /* @__PURE__ */ jsxs36("div", { className: "flex items-start justify-between gap-3", children: [
    /* @__PURE__ */ jsxs36("div", { className: "min-w-0", children: [
      /* @__PURE__ */ jsxs36("div", { className: "flex flex-wrap items-center gap-2", children: [
        /* @__PURE__ */ jsx59(
          Badge,
          {
            variant: BADGE_VARIANT_FOR_TONE[meta.stateTone],
            animate: false,
            className: "text-[10px] uppercase tracking-[0.04em]",
            children: meta.stateLabel
          }
        ),
        name && /* @__PURE__ */ jsx59("span", { className: "truncate text-[15px] font-semibold text-[var(--ink-bright)]", children: name })
      ] }),
      /* @__PURE__ */ jsxs36("div", { className: "mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--ink-mute)]", children: [
        meta.sliTypeLabel && /* @__PURE__ */ jsx59("span", { children: meta.sliTypeLabel }),
        meta.sliTypeLabel && /* @__PURE__ */ jsx59("span", { "aria-hidden": true, children: "\xB7" }),
        /* @__PURE__ */ jsx59("span", { children: meta.windowLabel }),
        meta.badges.map((b) => /* @__PURE__ */ jsx59(Badge, { variant: "outline", animate: false, className: "text-[10px]", children: b }, b))
      ] }),
      meta.description && /* @__PURE__ */ jsx59("div", { className: "mt-1.5 text-[12px] text-[var(--ink-soft)]", children: meta.description })
    ] }),
    meta.deltaPp && /* @__PURE__ */ jsxs36("div", { className: "shrink-0 text-right", children: [
      /* @__PURE__ */ jsx59(
        "div",
        {
          className: "font-[family-name:var(--font-mono)] text-[15px] font-bold [font-feature-settings:'tnum'_1,'lnum'_1]",
          style: meta.deltaTone ? { color: toneTextColor(meta.deltaTone) } : void 0,
          children: meta.deltaPp
        }
      ),
      /* @__PURE__ */ jsx59("div", { className: "text-[10px] text-[var(--ink-mute)]", children: "vs target" })
    ] })
  ] }) });
}

// src/apps/slo/detail/tool.ts
var detailRoute = defineRoute({
  id: "detail",
  tool: {
    title: "Present one configured SLO's full detail page",
    description: 'PRESENTATION: drill into ONE configured SLO (from the observability plugin), rendering the full OSD SLO detail page. CALL THIS whenever the user asks to investigate, explain, drill into, or diagnose a SPECIFIC SLO / its error budget / burn rate \u2014 pass the SLO `id` (from a `slo_list` or `slo_search` row; the id is in those tools\' echoed rows). PREREQUISITE: call `slo_inspect` FIRST with the same `id` and read its rows \u2014 this widget self-fetches, so the computed budget/burn values AND the MWMBR burn-rate tier matrix (which tiers are firing) render in the iframe but never reach your context; `slo_search` only carries the headline counts, so without `slo_inspect` your `narrative` and `suggestions` are uninformed guesses. Prefer this over hand-writing PPL/PromQL: the handler fetches the SLO spec + live status and COMPUTES the budget tiles, budget-remaining-over-time chart, burn-rate sparkline, and MWMBR burn-rate tier matrix from PromQL derived off the SLI definition, plus the status banner projected off the fetched document. OMIT `sections` UNLESS the user explicitly asked to see one specific block (e.g. "show the burn-rate alerts", "just the budget chart"). The default drill-in \u2014 including a generic "drill into" / "investigate" / "explain this SLO" \u2014 must NOT pass `sections`; that renders the compact full page (banner + budget summary, charts collapsed). Only pass the subset of blocks the user named, which renders ONLY those blocks with any named chart expanded. Also called automatically when a `slo_list` row is expanded.',
    inputSchema: inputSchema13
  },
  propsSchema: propsSchema8,
  view: DetailView,
  handler: async ({ id, dataSourceId, sections, narrative, suggestions }, ctx) => {
    try {
      const [slo, workspaceId] = await Promise.all([
        ctx.osUi.getSlo(id),
        ctx.workspaceId ?? ctx.osUi.resolveObservabilityWorkspaceId().catch(() => void 0)
      ]);
      const objective = await buildDetailObjective(ctx, slo, dataSourceId ?? "", workspaceId);
      const meta = buildDetailMeta(slo);
      const props = {
        narrative,
        suggestions,
        name: slo.spec.name,
        service: slo.spec.service,
        objective,
        meta,
        sections,
        osdUrl: sloDetailUrl({ origin: ctx.osUi.endpoint, workspaceId, sloId: slo.id })
      };
      const text = `${slo.spec.name} (${slo.spec.service}): ${objective.attainment} attained (target ${objective.target}), budget ${objective.budgetRemaining}, burn ${objective.burnRate}` + (objective.timeToExhaustion !== "\u2014" ? `, exhausts in ${objective.timeToExhaustion}` : "") + ".";
      return { props, text };
    } catch (err) {
      const msg = errorMessage(err);
      ctx.logger.error(`[slo.detail] getSlo("${id}") failed: ${msg}`);
      const props = { narrative, suggestions, error: msg };
      return {
        props,
        text: `Failed to load SLO "${id}": ${msg}`,
        isError: true
      };
    }
  }
});

// src/apps/slo/index.ts
var sloApp = defineApp({
  id: "slo",
  title: "SLOs & error budgets",
  description: "Service-level objectives and error budgets from the observability plugin's CONFIGURED SLOs. TWO text\u2192widget pairs, each sharing its compute so text and widget never drift: (1) ACROSS SLOs \u2014 `slo_search` (text) reads the SLOs into context, THEN `slo_list` PRESENTS them as a feed of error-budget cards (attainment, budget remaining, burn state, firing alerts), all server-computed. (2) ONE SLO \u2014 `slo_inspect` (text) reads one SLO's computed budget + MWMBR burn-rate tier matrix (which tiers are firing), THEN `slo_detail` PRESENTS the full OSD detail page. The widgets self-fetch, so read with the matching text tool FIRST or your summary/suggestions are uninformed guesses. Expanding a `slo_list` row also drills into `slo_detail` on demand (`sections` selects which blocks).",
  routes: [searchRoute2, listRoute2, inspectRoute, detailRoute]
});

// packages/ui/src/apps/traces/shared/stale-trace.ts
function staleTraceIdHint(tail) {
  const core = "The id is likely stale \u2014 demo traces age out of the index within minutes. Run a `ppl_query` over the spans index for a current traceId (`\u2026 | dedup traceId | head`) and call this again with it.";
  return tail ? `${core} ${tail}` : core;
}

// packages/ui/src/apps/traces/cross-signal-join/schema.ts
import { z as z21 } from "zod";
var inputSchema14 = {
  dataSourceId: dataSourceIdField(),
  spansDataset: z21.string().optional().describe("Trace index pattern (default `otel-v1-apm-span-*`)."),
  logsDataset: z21.string().describe("Logs index pattern (e.g. `logs-otel-v1-*`). Use `list_index_patterns`."),
  traceId: z21.string().describe("Trace ID."),
  ...timeRangeFields("`all` (no time filter)"),
  limit: z21.number().int().positive().max(1e4).optional().describe("Max spans (default 500)."),
  ...presentationInputFields
};
var eventSchema = z21.object({
  kind: z21.enum(["span", "log"]),
  ts: z21.string(),
  tsNanos: z21.number(),
  spanId: z21.string(),
  serviceName: z21.string(),
  name: z21.string(),
  severity: z21.string(),
  body: z21.string(),
  durationInNanos: z21.number(),
  statusCode: z21.number()
});
var propsSchema9 = z21.object({
  ...presentationPropsFields,
  spansDataset: z21.string(),
  logsDataset: z21.string(),
  spansQuery: z21.string(),
  logsQuery: z21.string(),
  traceId: z21.string(),
  events: z21.array(eventSchema),
  spanCount: z21.number(),
  logCount: z21.number(),
  /** Deep link to the same trace's waterfall in OpenSearch Dashboards. */
  osdUrl: z21.string().optional(),
  error: z21.string().optional()
});

// packages/ui/src/apps/traces/cross-signal-join/view.tsx
import { jsx as jsx60, jsxs as jsxs37 } from "react/jsx-runtime";
function severityVariant(s) {
  const v = s.toUpperCase().trim();
  if (!v) return { variant: "outline", label: "\u2014" };
  if (v.includes("ERROR") || v === "FATAL" || v === "CRITICAL")
    return { variant: "destructive", label: v };
  if (v.includes("WARN")) return { variant: "warning", label: v };
  if (v.includes("INFO") || v === "NOTICE")
    return { variant: "secondary", label: v };
  return { variant: "outline", label: v };
}
function EventRow({ event, index }) {
  if (event.kind === "span") {
    return /* @__PURE__ */ jsxs37(
      m.tr,
      {
        custom: index,
        variants: rowEntrance,
        initial: "hidden",
        animate: "visible",
        className: "border-b border-[var(--ink-hairline)] align-top",
        children: [
          /* @__PURE__ */ jsx60(TableCell, { className: "px-3 py-1.5 whitespace-nowrap text-xs text-[var(--ink-mute)]", children: /* @__PURE__ */ jsx60(Mono, { children: event.ts || "\u2014" }) }),
          /* @__PURE__ */ jsx60(TableCell, { className: "px-2 py-1.5", children: /* @__PURE__ */ jsx60(Badge, { variant: "outline", children: "SPAN" }) }),
          /* @__PURE__ */ jsxs37(TableCell, { className: "px-3 py-1.5", children: [
            /* @__PURE__ */ jsxs37("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx60("span", { className: "font-semibold text-[var(--ink-bright)]", children: event.name || "(unnamed)" }),
              isSpanError(event.statusCode) && /* @__PURE__ */ jsx60(Badge, { variant: "destructive", children: "error" })
            ] }),
            /* @__PURE__ */ jsxs37("div", { className: "text-xs text-[var(--ink-soft)]", children: [
              event.serviceName || "",
              " \xB7",
              " ",
              /* @__PURE__ */ jsx60(Mono, { children: formatDuration(event.durationInNanos) }),
              " \xB7",
              " ",
              /* @__PURE__ */ jsx60(Mono, { children: event.spanId.slice(0, 16) })
            ] })
          ] })
        ]
      }
    );
  }
  const sev = severityVariant(event.severity);
  return /* @__PURE__ */ jsxs37(
    m.tr,
    {
      custom: index,
      variants: rowEntrance,
      initial: "hidden",
      animate: "visible",
      className: "border-b border-[var(--ink-hairline)] align-top",
      children: [
        /* @__PURE__ */ jsx60(TableCell, { className: "px-3 py-1.5 whitespace-nowrap text-xs text-[var(--ink-mute)]", children: /* @__PURE__ */ jsx60(Mono, { children: event.ts || "\u2014" }) }),
        /* @__PURE__ */ jsx60(TableCell, { className: "px-2 py-1.5", children: /* @__PURE__ */ jsx60(Badge, { variant: sev.variant, children: sev.label === "\u2014" ? "LOG" : sev.label }) }),
        /* @__PURE__ */ jsxs37(TableCell, { className: "px-3 py-1.5 break-all", children: [
          /* @__PURE__ */ jsx60("span", { className: "line-clamp-2 text-sm text-[var(--ink-soft)]", children: event.body || "(no body)" }),
          event.spanId && /* @__PURE__ */ jsxs37("div", { className: "text-xs text-[var(--ink-mute)]", children: [
            "span ",
            /* @__PURE__ */ jsx60(Mono, { children: event.spanId.slice(0, 16) })
          ] })
        ] })
      ]
    }
  );
}
function CrossSignalJoinView({
  props
}) {
  return /* @__PURE__ */ jsx60(ViewGuard, { props, children: (p) => /* @__PURE__ */ jsx60(CrossSignalJoinInner, { props: p }) });
}
function CrossSignalJoinInner({ props }) {
  return /* @__PURE__ */ jsx60(
    PresentationFrame,
    {
      presentation: props,
      category: "Trace",
      title: props.traceId,
      osdUrl: props.osdUrl,
      children: /* @__PURE__ */ jsxs37(
        m.div,
        {
          className: "contents",
          variants: staggerContainer,
          initial: "hidden",
          animate: "visible",
          children: [
            /* @__PURE__ */ jsxs37(m.div, { variants: staggerItem, className: "flex flex-wrap items-center gap-3 text-sm", children: [
              /* @__PURE__ */ jsxs37("div", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsx60(Eyebrow, { children: "Trace" }),
                /* @__PURE__ */ jsx60(Mono, { className: "text-xs text-[var(--ink)]", children: props.traceId })
              ] }),
              /* @__PURE__ */ jsx60(Separator, { orientation: "vertical", className: "h-4" }),
              /* @__PURE__ */ jsxs37("div", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsx60(Eyebrow, { children: "Spans" }),
                /* @__PURE__ */ jsx60(Mono, { className: "font-semibold text-[var(--ink-bright)]", children: props.spanCount })
              ] }),
              /* @__PURE__ */ jsx60(Separator, { orientation: "vertical", className: "h-4" }),
              /* @__PURE__ */ jsxs37("div", { className: "flex items-center gap-1.5", children: [
                /* @__PURE__ */ jsx60(Eyebrow, { children: "Logs" }),
                /* @__PURE__ */ jsx60(Mono, { className: "font-semibold text-[var(--ink-bright)]", children: props.logCount })
              ] })
            ] }),
            /* @__PURE__ */ jsxs37(m.div, { variants: staggerItem, className: "grid gap-2", children: [
              /* @__PURE__ */ jsxs37("div", { className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsx60(Eyebrow, { children: "spans" }),
                /* @__PURE__ */ jsx60(CodeBlock, { code: props.spansQuery, language: "ppl", wrap: true, maxHeight: "none", className: "p-2 text-[11.5px]" })
              ] }),
              /* @__PURE__ */ jsxs37("div", { className: "flex flex-col gap-1", children: [
                /* @__PURE__ */ jsx60(Eyebrow, { children: "logs" }),
                /* @__PURE__ */ jsx60(CodeBlock, { code: props.logsQuery, language: "ppl", wrap: true, maxHeight: "none", className: "p-2 text-[11.5px]" })
              ] })
            ] }),
            /* @__PURE__ */ jsx60(m.div, { variants: staggerItem, children: /* @__PURE__ */ jsxs37(Card, { children: [
              /* @__PURE__ */ jsx60(CardHeader, { className: "px-3 py-2", children: /* @__PURE__ */ jsx60(CardTitle, { className: "text-sm", children: "Unified timeline" }) }),
              /* @__PURE__ */ jsx60(CardContent, { className: "p-0", children: props.events.length === 0 ? /* @__PURE__ */ jsxs37("div", { className: "app-muted px-3 py-6", children: [
                "No spans or logs for trace ",
                /* @__PURE__ */ jsx60(Mono, { children: props.traceId }),
                "."
              ] }) : /* @__PURE__ */ jsxs37(Table, { children: [
                /* @__PURE__ */ jsx60(TableHeader, { children: /* @__PURE__ */ jsxs37(TableRow, { className: "text-[var(--ink-mute)]", children: [
                  /* @__PURE__ */ jsx60(TableHead, { className: "px-3 py-2 font-medium w-[180px]", children: "Time" }),
                  /* @__PURE__ */ jsx60(TableHead, { className: "py-2 font-medium w-[90px]", children: "Kind" }),
                  /* @__PURE__ */ jsx60(TableHead, { className: "px-3 py-2 font-medium", children: "Detail" })
                ] }) }),
                /* @__PURE__ */ jsx60(TableBody, { children: props.events.map((e, i) => /* @__PURE__ */ jsx60(EventRow, { event: e, index: i }, i)) })
              ] }) })
            ] }) })
          ]
        }
      )
    }
  );
}

// src/apps/traces/cross-signal-join/tool.ts
var DEFAULT_SPANS_DATASET = "otel-v1-apm-span-*";
var DEFAULT_LIMIT3 = 500;
var crossSignalJoinRoute = defineRoute({
  id: "cross-signal-join",
  tool: {
    title: "Present cross-signal trace + logs timeline",
    description: "PRESENTATION: render one trace's spans + logs on a unified chronological timeline. Pass `dataSourceId`, `logsDataset` (e.g. `logs-otel-v1-*`), `traceId`; optionally `spansDataset`, `limit` (default 500/side), time window.",
    inputSchema: inputSchema14
  },
  propsSchema: propsSchema9,
  view: CrossSignalJoinView,
  handler: async ({
    dataSourceId: suppliedDataSourceId,
    spansDataset,
    logsDataset,
    traceId,
    timeRange,
    from,
    to,
    limit,
    narrative,
    suggestions
  }, ctx) => {
    const dataSourceId = await ctx.osUi.resolveDataSourceId(suppliedDataSourceId);
    const sds = spansDataset?.trim() || DEFAULT_SPANS_DATASET;
    const lds = logsDataset.trim();
    const lim = limit ?? DEFAULT_LIMIT3;
    const safeId = pplQuote(traceId);
    const baseFraming = { narrative, suggestions };
    let time;
    try {
      time = resolveTimeRange({ timeRange, from, to });
    } catch (err) {
      const msg = errorMessage(err);
      return {
        props: {
          ...baseFraming,
          spansDataset: sds,
          logsDataset: lds,
          spansQuery: "",
          logsQuery: "",
          traceId,
          events: [],
          spanCount: 0,
          logCount: 0,
          error: msg
        },
        text: "Invalid time range: " + msg,
        isError: true
      };
    }
    const spanTimeClause = pplTimePredicate("startTime", time);
    const logTimeClause = pplTimePredicate("@timestamp", time);
    const spanWhere = `traceId = "${safeId}"${spanTimeClause ? ` and ${spanTimeClause}` : ""}`;
    const logWhere = `traceId = "${safeId}"${logTimeClause ? ` and ${logTimeClause}` : ""}`;
    const spansQuery = `source = ${sds} | where ${spanWhere} | head ${lim}`;
    const logsQuery = `source = ${lds} | where ${logWhere} | eval serviceName = \`resource.attributes.service.name\` | sort - @timestamp | head ${lim}`;
    ctx.logger.log("[traces.cross-signal-join] spans PPL: " + spansQuery);
    ctx.logger.log("[traces.cross-signal-join] logs PPL: " + logsQuery);
    const resultsPromise = Promise.all([
      ctx.osUi.runPpl(dataSourceId, spansQuery, sds),
      ctx.osUi.runPpl(dataSourceId, logsQuery, lds)
    ]);
    const {
      workspaceId,
      indexPattern: ip,
      dataSourceTitle,
      dataSourceType
    } = await ctx.osUi.resolveDeepLinkContext(ctx, sds, dataSourceId);
    const baseProps = {
      spansDataset: sds,
      logsDataset: lds,
      spansQuery,
      logsQuery,
      traceId,
      ...baseFraming,
      // Deep link to the same trace's waterfall in OpenSearch Dashboards.
      osdUrl: traceDetailsUrl({
        origin: ctx.osUi.endpoint,
        workspaceId,
        dataSourceId,
        datasetTitle: ip?.title ?? sds,
        indexPatternId: ip?.id,
        indexPatternDataSourceTitle: dataSourceTitle,
        indexPatternDataSourceType: dataSourceType,
        timeFieldName: ip?.timeFieldName,
        traceId
      })
    };
    try {
      const [spansResult, logsResult] = await resultsPromise;
      const { spans } = transformPplToSpans(spansResult, traceId);
      const events = spans.map((s) => ({
        kind: "span",
        ts: s.startTime,
        tsNanos: convertTimestampToNanos(s.startTime),
        spanId: s.spanId,
        serviceName: s.serviceName,
        name: s.name,
        severity: "",
        body: "",
        durationInNanos: s.durationInNanos,
        statusCode: s.statusCode
      }));
      for (const r of pplRows(logsResult)) {
        const ts = r.getString("@timestamp") || r.getString("time") || r.getString("timestamp") || r.getString("observedTimestamp");
        events.push({
          kind: "log",
          ts,
          tsNanos: convertTimestampToNanos(ts),
          spanId: r.getString("spanId"),
          // `serviceName` is the flattened eval column from the logs query;
          // fall back to the nested leaf in case the projection is absent.
          serviceName: r.getString("serviceName") || r.getString("resource.attributes.service.name"),
          name: "",
          severity: r.getString("severity") || r.getString("severityText") || r.getString("level"),
          body: r.getString("body") || r.getString("message") || r.getString("log"),
          durationInNanos: 0,
          statusCode: 0
        });
      }
      events.sort((a, b) => a.tsNanos - b.tsNanos);
      const spanCount = events.filter((e) => e.kind === "span").length;
      const logCount = events.filter((e) => e.kind === "log").length;
      const props = {
        ...baseProps,
        events,
        spanCount,
        logCount
      };
      return {
        props,
        text: spanCount === 0 && logCount === 0 ? `No spans or logs found for traceId=${traceId}${time.filtered ? ` over ${time.label}` : ""}. ` + staleTraceIdHint(
          (time.filtered ? "Widen the time window, and also " : "Also ") + "confirm `logsDataset` (e.g. `logs-otel-v1*`)."
        ) : `Joined ${spanCount} span(s) and ${logCount} log(s) for traceId=${traceId}${time.filtered ? ` over ${time.label}` : ""}.`
      };
    } catch (err) {
      const msg = errorMessage(err);
      ctx.logger.error("[traces.cross-signal-join] PPL failed: " + msg);
      return {
        props: {
          ...baseProps,
          events: [],
          spanCount: 0,
          logCount: 0,
          error: msg
        },
        text: "Failed cross-signal join: " + msg,
        isError: true
      };
    }
  }
});

// packages/ui/src/apps/traces/shared/service_graph.ts
function edgeTable(edges) {
  return {
    columns: ["caller", "callee", "calls", "errors", "errorRate", "avgDuration"],
    rows: edges.map((e) => [
      e.caller,
      e.callee,
      String(e.calls),
      String(e.errors),
      pctOf(e.errorRate),
      formatDurationNanos(e.avgDurationNanos)
    ])
  };
}
function buildServiceGraph(spans) {
  const byId = /* @__PURE__ */ new Map();
  for (const s of spans) {
    if (s.spanId) byId.set(s.spanId, s);
  }
  const edgeAcc = /* @__PURE__ */ new Map();
  const nodeAcc = /* @__PURE__ */ new Map();
  const node = (svc) => {
    let n = nodeAcc.get(svc);
    if (!n) nodeAcc.set(svc, n = { service: svc, inbound: 0, outbound: 0, errors: 0, spanCount: 0 });
    return n;
  };
  for (const span of spans) {
    const callee = span.serviceName;
    if (!callee) continue;
    const cn2 = node(callee);
    cn2.spanCount += 1;
    if (isSpanError(span.statusCode)) cn2.errors += 1;
    if (!span.parentSpanId) continue;
    const parent = byId.get(span.parentSpanId);
    if (!parent) continue;
    const caller = parent.serviceName;
    if (!caller || caller === callee) continue;
    const key = caller + "\0" + callee;
    let e = edgeAcc.get(key);
    if (!e) edgeAcc.set(key, e = { caller, callee, calls: 0, errors: 0, durSum: 0 });
    e.calls += 1;
    if (isSpanError(span.statusCode)) e.errors += 1;
    e.durSum += span.durationInNanos || 0;
    node(caller).outbound += 1;
    cn2.inbound += 1;
  }
  const edges = [...edgeAcc.values()].map((e) => ({
    caller: e.caller,
    callee: e.callee,
    calls: e.calls,
    errors: e.errors,
    errorRate: e.calls ? e.errors / e.calls : 0,
    avgDurationNanos: e.calls ? e.durSum / e.calls : 0
  })).sort((a, b) => b.calls - a.calls);
  const depth = computeDepth(edges, [...nodeAcc.keys()]);
  const nodes = [...nodeAcc.values()].map((n) => ({
    service: n.service,
    depth: depth.get(n.service) ?? 0,
    inboundCalls: n.inbound,
    outboundCalls: n.outbound,
    errors: n.errors,
    errorRate: n.spanCount ? n.errors / n.spanCount : 0,
    spanCount: n.spanCount
  })).sort((a, b) => a.depth - b.depth || b.spanCount - a.spanCount);
  return { nodes, edges, spanCount: spans.length };
}
function computeDepth(edges, services) {
  const out = /* @__PURE__ */ new Map();
  const callees = /* @__PURE__ */ new Set();
  for (const e of edges) {
    if (!out.has(e.caller)) out.set(e.caller, []);
    out.get(e.caller).push(e.callee);
    callees.add(e.callee);
  }
  const entries = services.filter((s) => !callees.has(s));
  const depth = /* @__PURE__ */ new Map();
  const queue = [];
  const seeds = entries.length ? entries : services;
  for (const s of seeds) {
    depth.set(s, 0);
    queue.push(s);
  }
  while (queue.length) {
    const cur = queue.shift();
    const d = depth.get(cur);
    for (const next of out.get(cur) ?? []) {
      if (!depth.has(next)) {
        depth.set(next, d + 1);
        queue.push(next);
      }
    }
  }
  for (const s of services) if (!depth.has(s)) depth.set(s, 0);
  return depth;
}
function buildSpansLoadQuery(opts) {
  const ds = opts.dataset?.trim() || DEFAULT_DATASET;
  const limit = opts.limit ?? 5e3;
  const clauses = [`source = ${ds}`];
  const timeClause = opts.time ? pplTimePredicate("startTime", opts.time) : null;
  if (timeClause) clauses.push(`where ${timeClause}`);
  if (opts.serviceFilter) {
    clauses.push(`where serviceName = "${pplQuote(opts.serviceFilter)}"`);
  }
  clauses.push(`head ${limit}`);
  return clauses.join(" | ");
}

// packages/ui/src/apps/traces/dependencies/schema.ts
import { z as z22 } from "zod";
var inputSchema15 = {
  dataSourceId: dataSourceIdField(),
  dataset: z22.string().optional().describe("Trace index pattern (default `otel-v1-apm-span-*`)."),
  ...timeRangeFields("`15m`"),
  serviceName: z22.string().optional().describe("Focus on edges touching this service."),
  limit: z22.number().int().positive().max(2e4).optional().describe("Max spans to load (default 5000).")
};

// src/apps/traces/dependencies/tool.ts
var dependenciesRoute = defineRoute({
  id: "dependencies",
  tool: {
    title: "Service dependencies",
    description: "Compute service call graph (caller\u2192callee edges, volume, error rate) via span self-join (PPL can't do this). No widget \u2014 call freely. Use `traces_service_map` to present visually. `timeRange` default `15m`; `serviceName` to focus; `limit` default 5000.",
    inputSchema: inputSchema15
  },
  // Edges are ordered by call volume; the echo shows only the first ~20. Focus
  // on one service to see all of its edges rather than the global top slice.
  echoHint: "\u21B3 Only the highest-volume edges are shown. Pass `serviceName` to see every edge touching one service, or raise `limit` if spans were dropped.",
  handler: async ({ dataSourceId: suppliedDataSourceId, dataset, timeRange, from, to, serviceName, limit }, ctx) => {
    const dataSourceId = await ctx.osUi.resolveDataSourceId(suppliedDataSourceId);
    const ds = dataset?.trim() || DEFAULT_DATASET;
    let time;
    try {
      time = resolveTimeRange({ timeRange, from, to }, { defaultFrom: "now-15m" });
    } catch (err) {
      const msg = errorMessage(err);
      return {
        props: { table: { columns: [], rows: [] }, error: msg },
        text: "Invalid time range: " + msg,
        isError: true
      };
    }
    const range = time.label;
    const query = buildSpansLoadQuery({ dataset: ds, time, limit });
    ctx.logger.log("[traces.dependencies] PPL: " + query);
    try {
      const result = await ctx.osUi.runPpl(dataSourceId, query, ds);
      const { spans } = transformPplToSpans(result, "");
      const graph = buildServiceGraph(spans);
      let edges = graph.edges;
      if (serviceName) {
        edges = edges.filter(
          (e) => e.caller === serviceName || e.callee === serviceName
        );
      }
      if (edges.length === 0) {
        const why = spans.length === 0 ? `No spans matched in ${ds} over ${range}.` : `Loaded ${spans.length} span(s) but found no cross-service parent/child edges${serviceName ? ` touching ${serviceName}` : ""}.`;
        return {
          props: { table: { columns: [], rows: [] }, edges: [], nodes: [] },
          text: `${why} Widen \`timeRange\` or raise \`limit\` \u2014 a flat span window can split a trace's parent and child spans (demo traces also age out within minutes).`
        };
      }
      const table = edgeTable(edges);
      const top = edges.slice(0, 3).map((e) => `${e.caller}\u2192${e.callee} (${e.calls} calls, ${pctOf(e.errorRate)} err)`).join(", ");
      const worst = [...edges].sort((a, b) => b.errorRate - a.errorRate)[0];
      const text = `${graph.nodes.length} services, ${edges.length} call edge(s) over ${range} (${spans.length} spans). Top by volume: ${top}. Worst error rate: ${worst.caller}\u2192${worst.callee} (${pctOf(worst.errorRate)}).`;
      return {
        props: { table, edges, nodes: graph.nodes, spanCount: graph.spanCount },
        text
      };
    } catch (err) {
      const msg = pplErrorHint(err, ds);
      ctx.logger.error("[traces.dependencies] PPL failed: " + msg);
      return {
        props: { table: { columns: [], rows: [] }, error: msg },
        text: "Failed to build service graph: " + msg,
        isError: true
      };
    }
  }
});

// packages/ui/src/apps/traces/details/schema.ts
import { z as z23 } from "zod";
var inputSchema16 = {
  dataSourceId: dataSourceIdField(),
  traceId: z23.string().describe("Trace ID to load."),
  dataset: z23.string().optional().describe("Trace index pattern (default `otel-v1-apm-span-*`)."),
  limit: z23.number().int().positive().max(1e4).optional().describe("Max spans (default 500)."),
  ...presentationInputFields
};
var propsSchema10 = z23.object({
  ...presentationPropsFields,
  traceId: z23.string(),
  dataset: z23.string(),
  spans: z23.array(spanSchema),
  rangeStartNanos: z23.number(),
  rangeEndNanos: z23.number(),
  /** Deep link to the same trace in the OpenSearch Dashboards waterfall. */
  osdUrl: z23.string().optional(),
  error: z23.string().optional()
});

// packages/ui/src/apps/traces/shared/SpanWaterfall.tsx
import { useMemo as useMemo10, useState as useState16 } from "react";

// packages/ui/src/apps/traces/shared/span-tree.ts
var SERVICE_COLORS = [
  "var(--accent-color)",
  "var(--info)",
  "var(--success)",
  "var(--warn)",
  "var(--danger)",
  "var(--accent-bright)"
];
function buildColorMap(spans) {
  const services = [...new Set(spans.map((s) => s.serviceName).filter(Boolean))].sort();
  const map = {};
  services.forEach((s, i) => map[s] = SERVICE_COLORS[i % SERVICE_COLORS.length]);
  return map;
}
function buildHierarchy(spans, expanded) {
  const byId = new Map(spans.map((s) => [s.spanId, s]));
  const childrenOf = /* @__PURE__ */ new Map();
  const roots = [];
  for (const s of spans) {
    if (s.parentSpanId && byId.has(s.parentSpanId)) {
      (childrenOf.get(s.parentSpanId) ?? childrenOf.set(s.parentSpanId, []).get(s.parentSpanId)).push(s);
    } else {
      roots.push(s);
    }
  }
  const out = [];
  const walk = (span, level) => {
    const kids = childrenOf.get(span.spanId) ?? [];
    out.push({ span, level, hasChildren: kids.length > 0 });
    if (expanded.has(span.spanId)) for (const kid of kids) walk(kid, level + 1);
  };
  for (const r of roots) walk(r, 0);
  return out;
}
function statusBadge(code) {
  if (code === SPAN_STATUS.ERROR) return { label: "Error", variant: "destructive" };
  if (code === SPAN_STATUS.OK) return { label: "OK", variant: "success" };
  return { label: "Unset", variant: "outline" };
}

// packages/ui/src/apps/traces/shared/span-panel.tsx
import { jsx as jsx61, jsxs as jsxs38 } from "react/jsx-runtime";
function TimelineBar({
  span,
  startNanos,
  rangeStart,
  rangeEnd,
  color,
  index = 0
}) {
  const total = rangeEnd - rangeStart;
  if (total <= 0) return /* @__PURE__ */ jsx61("div", { className: "h-4 w-full" });
  const offset = Math.max(0, (startNanos - rangeStart) / total * 100);
  const width = Math.max(0.5, span.durationInNanos / total * 100);
  return /* @__PURE__ */ jsx61("div", { className: "relative h-4 w-full rounded-[3px] bg-[var(--surface-muted)]", children: /* @__PURE__ */ jsx61(
    m.div,
    {
      className: "absolute top-0 h-4 rounded-[3px]",
      style: {
        left: `${offset}%`,
        width: `${Math.min(100 - offset, width)}%`,
        backgroundColor: color,
        transformOrigin: "left center"
      },
      initial: { scaleX: 0, opacity: 0 },
      animate: { scaleX: 1, opacity: 1 },
      transition: { ...easeOut, delay: Math.min(index, 14) * 0.03 },
      title: `${formatDuration(span.durationInNanos)} @ +${formatDuration(startNanos - rangeStart)}`
    }
  ) });
}
function AttributesTree({
  value,
  maxHeight = "565px"
}) {
  return /* @__PURE__ */ jsx61(CodeBlock, { code: value, language: "json", maxHeight });
}
var spanRowEntrance = {
  hidden: { opacity: 0 },
  visible: (i) => ({
    opacity: 1,
    transition: { ...spring, delay: Math.min(i, 14) * 0.03 }
  })
};
function SpanHierarchy({
  rows,
  colorMap,
  expanded,
  selectedId,
  rangeStart,
  rangeEnd,
  startNanosOf,
  onSelect,
  onToggle
}) {
  return /* @__PURE__ */ jsxs38(Table, { className: "table-fixed", "data-test-subj": "span-detail-panel", children: [
    /* @__PURE__ */ jsx61(TableHeader, { children: /* @__PURE__ */ jsxs38(TableRow, { className: "text-[var(--ink-mute)] tracking-[0.08em] font-medium", children: [
      /* @__PURE__ */ jsx61(TableHead, { className: "px-3 py-2 w-auto", children: "Span" }),
      /* @__PURE__ */ jsx61(TableHead, { className: "py-2 w-[45%]", children: "Timeline" }),
      /* @__PURE__ */ jsx61(TableHead, { className: "px-3 py-2 text-right w-[88px]", children: "Duration" })
    ] }) }),
    /* @__PURE__ */ jsx61(TableBody, { children: rows.map(({ span, level, hasChildren }, rowIndex) => {
      const color = colorMap[span.serviceName] || "var(--ink-mute)";
      const isOpen = expanded.has(span.spanId);
      return /* @__PURE__ */ jsxs38(
        m.tr,
        {
          custom: rowIndex,
          variants: spanRowEntrance,
          initial: "hidden",
          animate: "visible",
          className: cn(
            "border-b border-[var(--ink-hairline)] cursor-pointer hover:bg-[var(--surface-muted)]",
            selectedId === span.spanId && "bg-[var(--accent-soft)]"
          ),
          onClick: () => onSelect(span.spanId),
          children: [
            /* @__PURE__ */ jsxs38(TableCell, { className: "px-3 py-1.5", children: [
              /* @__PURE__ */ jsxs38("div", { className: "flex min-w-0 items-center gap-1.5", style: { paddingLeft: `${level * 14}px` }, children: [
                hasChildren ? /* @__PURE__ */ jsx61(
                  "button",
                  {
                    type: "button",
                    className: cn(
                      "inline-flex size-4 items-center justify-center rounded-[6px] text-lg text-[var(--ink-mute)] transition-transform hover:bg-[var(--surface-muted)] hover:text-[var(--ink)]",
                      isOpen && "rotate-90"
                    ),
                    "aria-label": isOpen ? "Collapse" : "Expand",
                    onClick: (e) => {
                      e.stopPropagation();
                      onToggle(span.spanId);
                    },
                    children: "\u203A"
                  }
                ) : /* @__PURE__ */ jsx61("span", { className: "size-4" }),
                /* @__PURE__ */ jsx61(
                  "span",
                  {
                    className: "size-2 rounded-full shrink-0",
                    style: { backgroundColor: color },
                    title: span.serviceName
                  }
                ),
                /* @__PURE__ */ jsx61("span", { className: "min-w-0 truncate font-semibold text-[var(--ink-bright)]", children: span.name || "(unnamed)" }),
                isSpanError(span.statusCode) && /* @__PURE__ */ jsx61(Badge, { variant: "destructive", className: "ml-1 shrink-0", children: "error" })
              ] }),
              span.serviceName && /* @__PURE__ */ jsx61(
                "div",
                {
                  className: "truncate text-xs text-[var(--ink-soft)]",
                  style: { paddingLeft: `${level * 14 + 26}px` },
                  children: span.serviceName
                }
              )
            ] }),
            /* @__PURE__ */ jsx61(TableCell, { className: "px-2 py-1.5", children: /* @__PURE__ */ jsx61(
              TimelineBar,
              {
                span,
                startNanos: startNanosOf(span.spanId),
                rangeStart,
                rangeEnd,
                color,
                index: rowIndex
              }
            ) }),
            /* @__PURE__ */ jsx61(TableCell, { className: "px-3 py-1.5 text-right", children: /* @__PURE__ */ jsx61(Mono, { children: formatDuration(span.durationInNanos) }) })
          ]
        },
        span.spanId
      );
    }) })
  ] });
}
function Overview({
  span,
  color,
  rangeStart,
  startNanos
}) {
  const status = statusBadge(span.statusCode);
  const offset = startNanos - rangeStart;
  const items = [
    {
      label: "Span name",
      value: /* @__PURE__ */ jsx61("span", { className: "font-semibold text-[var(--ink-bright)]", children: span.name || "\u2014" })
    },
    {
      label: "Service",
      value: span.serviceName ? /* @__PURE__ */ jsxs38("span", { className: "inline-flex items-center gap-1.5", children: [
        /* @__PURE__ */ jsx61("span", { className: "size-2 rounded-full", style: { backgroundColor: color } }),
        span.serviceName
      ] }) : "\u2014"
    },
    { label: "Span ID", value: /* @__PURE__ */ jsx61(Mono, { className: "text-xs", children: span.spanId || "\u2014" }) },
    { label: "Parent span ID", value: /* @__PURE__ */ jsx61(Mono, { className: "text-xs", children: span.parentSpanId || "\u2014" }) },
    { label: "Trace ID", value: /* @__PURE__ */ jsx61(Mono, { className: "text-xs", children: span.traceId }) },
    { label: "Kind", value: span.kind || "\u2014" },
    { label: "Trace group", value: span.traceGroup || "\u2014" },
    { label: "Duration", value: /* @__PURE__ */ jsx61(Mono, { children: formatDuration(span.durationInNanos) }) },
    {
      label: "Offset from trace start",
      value: /* @__PURE__ */ jsx61(Mono, { children: offset > 0 ? `+${formatDuration(offset)}` : "0" })
    },
    { label: "Start time", value: /* @__PURE__ */ jsx61(Mono, { children: span.startTime || "\u2014" }) },
    { label: "End time", value: /* @__PURE__ */ jsx61(Mono, { children: span.endTime || "\u2014" }) },
    {
      label: "Status",
      value: /* @__PURE__ */ jsxs38("span", { className: "inline-flex items-center gap-2", children: [
        /* @__PURE__ */ jsx61(Badge, { variant: status.variant, children: status.label }),
        span.statusMessage && /* @__PURE__ */ jsx61("span", { className: "text-xs text-[var(--ink-soft)]", children: span.statusMessage })
      ] })
    }
  ];
  return /* @__PURE__ */ jsx61("div", { className: "grid grid-cols-[max-content_1fr] gap-x-3 gap-y-2 text-sm", children: items.map(({ label, value }) => /* @__PURE__ */ jsxs38("div", { className: "contents", children: [
    /* @__PURE__ */ jsx61("div", { className: "text-[var(--ink-mute)]", children: label }),
    /* @__PURE__ */ jsx61("div", { className: "break-all text-[var(--ink-soft)]", children: value })
  ] }, label)) });
}

// packages/ui/src/apps/traces/shared/SpanWaterfall.tsx
import { jsx as jsx62, jsxs as jsxs39 } from "react/jsx-runtime";
function SpanWaterfall({
  spans,
  rangeStartNanos,
  rangeEndNanos,
  compact = false
}) {
  const [expanded, setExpanded] = useState16(/* @__PURE__ */ new Set());
  const [selectedId, setSelectedId] = useState16(null);
  const allIds = useMemo10(() => new Set(spans.map((s) => s.spanId)), [spans]);
  const effectiveExpanded = expanded.size === 0 ? allIds : expanded;
  const colorMap = useMemo10(() => buildColorMap(spans), [spans]);
  const startNanosMap = useMemo10(
    () => new Map(spans.map((s) => [s.spanId, convertTimestampToNanos(s.startTime)])),
    [spans]
  );
  const rows = useMemo10(
    () => buildHierarchy(spans, effectiveExpanded),
    [spans, effectiveExpanded]
  );
  const selected = selectedId && spans.find((s) => s.spanId === selectedId) || spans.find((s) => !s.parentSpanId) || spans[0] || null;
  const toggle = (spanId) => setExpanded((cur) => {
    const base2 = new Set(cur.size === 0 ? allIds : cur);
    base2.has(spanId) ? base2.delete(spanId) : base2.add(spanId);
    return base2;
  });
  const services = Object.entries(colorMap);
  const hierarchyCap = compact ? "max-h-[388px]" : "max-h-[630px]";
  const attrCap = compact ? "300px" : "565px";
  return /* @__PURE__ */ jsxs39("div", { className: "flex flex-col gap-3", children: [
    services.length > 0 && /* @__PURE__ */ jsxs39(
      m.div,
      {
        className: "flex flex-wrap items-center gap-2 text-xs",
        variants: staggerContainer,
        initial: "hidden",
        animate: "visible",
        children: [
          /* @__PURE__ */ jsx62(Eyebrow, { children: "Services" }),
          services.map(([name, color]) => /* @__PURE__ */ jsxs39(
            m.span,
            {
              variants: staggerItem,
              className: "inline-flex items-center gap-1.5 text-[var(--ink-soft)]",
              children: [
                /* @__PURE__ */ jsx62("span", { className: "size-2 rounded-full", style: { backgroundColor: color } }),
                name
              ]
            },
            name
          ))
        ]
      }
    ),
    /* @__PURE__ */ jsxs39("div", { className: "grid gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]", children: [
      /* @__PURE__ */ jsxs39(Card, { className: "flex flex-col", children: [
        !compact && /* @__PURE__ */ jsx62(CardHeader, { className: "px-3 py-2", children: /* @__PURE__ */ jsx62(CardTitle, { className: "text-sm", children: "Span hierarchy" }) }),
        /* @__PURE__ */ jsx62(CardContent, { className: "flex-1 p-0", children: /* @__PURE__ */ jsx62("div", { className: `${hierarchyCap} min-h-full overflow-auto`, children: /* @__PURE__ */ jsx62(
          SpanHierarchy,
          {
            rows,
            colorMap,
            expanded: effectiveExpanded,
            selectedId: selected?.spanId,
            rangeStart: rangeStartNanos,
            rangeEnd: rangeEndNanos,
            startNanosOf: (id) => startNanosMap.get(id) ?? 0,
            onSelect: setSelectedId,
            onToggle: toggle
          }
        ) }) })
      ] }),
      /* @__PURE__ */ jsxs39(Card, { children: [
        /* @__PURE__ */ jsx62(CardHeader, { className: "px-3 py-2", children: /* @__PURE__ */ jsx62(CardTitle, { className: "text-sm", children: selected ? selected.name || "(unnamed span)" : "Span details" }) }),
        /* @__PURE__ */ jsx62(CardContent, { className: "p-3", children: selected ? /* @__PURE__ */ jsx62(AnimatePresence, { mode: "wait", initial: false, children: /* @__PURE__ */ jsx62(
          m.div,
          {
            variants: fadeInUp,
            initial: "hidden",
            animate: "visible",
            exit: { opacity: 0, transition: ease },
            children: /* @__PURE__ */ jsxs39(Tabs, { defaultValue: "overview", children: [
              /* @__PURE__ */ jsxs39(TabsList, { children: [
                /* @__PURE__ */ jsx62(TabsTrigger, { value: "overview", children: "Overview" }),
                /* @__PURE__ */ jsx62(TabsTrigger, { value: "attributes", children: "Attributes" }),
                /* @__PURE__ */ jsx62(TabsTrigger, { value: "resource", children: "Resource" }),
                /* @__PURE__ */ jsx62(TabsTrigger, { value: "raw", children: "Raw" })
              ] }),
              /* @__PURE__ */ jsx62(TabsContent, { value: "overview", className: "mt-3", children: /* @__PURE__ */ jsx62(
                Overview,
                {
                  span: selected,
                  color: colorMap[selected.serviceName] || "var(--ink-mute)",
                  rangeStart: rangeStartNanos,
                  startNanos: startNanosMap.get(selected.spanId) ?? 0
                }
              ) }),
              /* @__PURE__ */ jsx62(TabsContent, { value: "attributes", className: "mt-3", children: /* @__PURE__ */ jsx62(AttributesTree, { value: selected.attributes, maxHeight: attrCap }) }),
              /* @__PURE__ */ jsx62(TabsContent, { value: "resource", className: "mt-3", children: /* @__PURE__ */ jsx62(AttributesTree, { value: selected.resource, maxHeight: attrCap }) }),
              /* @__PURE__ */ jsx62(TabsContent, { value: "raw", className: "mt-3", children: /* @__PURE__ */ jsx62(AttributesTree, { value: selected, maxHeight: attrCap }) })
            ] })
          },
          selected.spanId
        ) }) : /* @__PURE__ */ jsx62("div", { className: "app-muted", children: "Select a span to inspect." }) })
      ] })
    ] })
  ] });
}

// packages/ui/src/apps/traces/details/view.tsx
import { jsx as jsx63, jsxs as jsxs40 } from "react/jsx-runtime";
function DetailsView2({ props }) {
  return /* @__PURE__ */ jsx63(ViewGuard, { props, children: (p) => /* @__PURE__ */ jsx63(DetailsViewInner2, { props: p }) });
}
function DetailsViewInner2({ props }) {
  const spans = props.spans ?? [];
  if (spans.length === 0) {
    return /* @__PURE__ */ jsx63("div", { className: "app", children: /* @__PURE__ */ jsxs40("div", { className: "p-4 text-sm text-[var(--ink-soft)]", children: [
      "Trace ",
      /* @__PURE__ */ jsx63(Mono, { children: props.traceId }),
      " returned no spans in ",
      /* @__PURE__ */ jsx63(Mono, { children: props.dataset }),
      "."
    ] }) });
  }
  const serviceCount = new Set(spans.map((s) => s.serviceName).filter(Boolean)).size;
  const errorCount = spans.filter((s) => isSpanError(s.statusCode)).length;
  const totalDuration = props.rangeEndNanos - props.rangeStartNanos;
  const criticalPath = buildCriticalPath(spans);
  return /* @__PURE__ */ jsxs40(PresentationFrame, { presentation: props, category: "Trace", title: props.traceId, osdUrl: props.osdUrl, children: [
    /* @__PURE__ */ jsxs40(
      m.div,
      {
        className: "grid grid-cols-2 gap-2 sm:grid-cols-4",
        variants: staggerContainer,
        initial: "hidden",
        animate: "visible",
        children: [
          /* @__PURE__ */ jsx63(StatCard, { label: "SPANS", value: spans.length }),
          /* @__PURE__ */ jsx63(StatCard, { label: "DURATION", value: formatDuration(totalDuration) }),
          /* @__PURE__ */ jsx63(StatCard, { label: "SERVICES", value: serviceCount }),
          /* @__PURE__ */ jsx63(StatCard, { label: "ERRORS", value: errorCount, tone: errorCount > 0 ? "danger" : void 0 })
        ]
      }
    ),
    criticalPath.length > 0 && /* @__PURE__ */ jsx63(
      m.div,
      {
        variants: scaleIn,
        initial: "hidden",
        animate: "visible",
        transition: spring,
        className: "rounded-[8px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2",
        children: /* @__PURE__ */ jsx63("div", { className: "flex flex-wrap items-center gap-1 text-[12px] font-medium font-[family-name:var(--font-mono)]", children: criticalPath.map((segment, i) => /* @__PURE__ */ jsxs40("span", { className: "flex items-center gap-1", children: [
          i > 0 && /* @__PURE__ */ jsx63("span", { className: "text-[var(--ink-mute)]", children: "\u2192" }),
          /* @__PURE__ */ jsxs40("span", { className: cn(
            segment.isError ? "text-[var(--danger)] font-semibold" : "text-[var(--ink)]"
          ), children: [
            segment.label,
            segment.errorDetail && /* @__PURE__ */ jsxs40("span", { className: "text-[var(--danger)]", children: [
              " (",
              segment.errorDetail,
              ")"
            ] })
          ] })
        ] }, i)) })
      }
    ),
    /* @__PURE__ */ jsx63(
      SpanWaterfall,
      {
        spans,
        rangeStartNanos: props.rangeStartNanos,
        rangeEndNanos: props.rangeEndNanos
      }
    )
  ] });
}
function StatCard({ label, value, tone }) {
  return /* @__PURE__ */ jsxs40(
    m.div,
    {
      variants: scaleIn,
      transition: spring,
      className: "flex flex-col gap-0.5 rounded-[8px] border border-[var(--surface-border)] bg-[var(--surface-muted)] px-3 py-2",
      children: [
        /* @__PURE__ */ jsx63("span", { className: "text-[10px] font-medium uppercase tracking-[0.5px] text-[var(--ink-mute)]", children: label }),
        /* @__PURE__ */ jsx63(Mono, { className: cn(
          "text-[18px] font-semibold leading-tight [font-feature-settings:'tnum'_1,'lnum'_1]",
          tone === "danger" ? "text-[var(--danger)]" : "text-[var(--ink-bright)]"
        ), children: value })
      ]
    }
  );
}
function buildCriticalPath(spans) {
  const byId = new Map(spans.map((s) => [s.spanId, s]));
  const childrenOf = /* @__PURE__ */ new Map();
  const roots = [];
  for (const s of spans) {
    if (s.parentSpanId && byId.has(s.parentSpanId)) {
      const list = childrenOf.get(s.parentSpanId) ?? [];
      list.push(s);
      childrenOf.set(s.parentSpanId, list);
    } else {
      roots.push(s);
    }
  }
  const path = [];
  let current = roots[0];
  while (current) {
    const error = isSpanError(current.statusCode);
    const segment = {
      label: current.name || current.serviceName || current.spanId.slice(0, 8),
      isError: error
    };
    if (error && current.statusMessage) {
      const msg = current.statusMessage;
      const descMatch = msg.match(/desc\s*=\s*(.+?)(?::|$)/);
      segment.errorDetail = descMatch ? descMatch[1].trim() : msg.slice(0, 40);
    }
    path.push(segment);
    const kids = childrenOf.get(current.spanId);
    if (!kids || kids.length === 0) break;
    const errorKid = kids.find((k) => isSpanError(k.statusCode));
    current = errorKid ?? kids.reduce((a, b) => b.durationInNanos > a.durationInNanos ? b : a);
  }
  return path;
}

// src/apps/traces/details/tool.ts
var DEFAULT_DATASET5 = "otel-v1-apm-span-*";
var DEFAULT_LIMIT4 = 500;
var detailsRoute2 = defineRoute({
  id: "details",
  tool: {
    title: "Present trace details",
    description: "PRESENTATION: render one trace as a span waterfall widget. Pass `dataSourceId`, `traceId`; optionally `dataset` (default `otel-v1-apm-span-*`), `limit` (default 500).",
    inputSchema: inputSchema16
  },
  propsSchema: propsSchema10,
  view: DetailsView2,
  handler: async ({ dataSourceId: suppliedDataSourceId, traceId, dataset, limit, narrative, suggestions }, ctx) => {
    const dataSourceId = await ctx.osUi.resolveDataSourceId(suppliedDataSourceId);
    const ds = dataset?.trim() || DEFAULT_DATASET5;
    const lim = limit ?? DEFAULT_LIMIT4;
    const baseProps = {
      traceId,
      dataset: ds,
      narrative,
      suggestions
    };
    const safeId = pplQuote(traceId);
    const query = `source = ${ds} | where traceId = "${safeId}" | head ${lim}`;
    ctx.logger.log("[traces.details] PPL: " + query);
    const resultPromise = ctx.osUi.runPpl(dataSourceId, query, ds);
    const {
      workspaceId,
      indexPattern: ip,
      dataSourceTitle,
      dataSourceType
    } = await ctx.osUi.resolveDeepLinkContext(ctx, ds, dataSourceId);
    const osdUrl = traceDetailsUrl({
      origin: ctx.osUi.endpoint,
      workspaceId,
      dataSourceId,
      datasetTitle: ip?.title ?? ds,
      indexPatternId: ip?.id,
      indexPatternDataSourceTitle: dataSourceTitle,
      indexPatternDataSourceType: dataSourceType,
      timeFieldName: ip?.timeFieldName,
      traceId
    });
    try {
      const result = await resultPromise;
      const { spans, rangeStartNanos, rangeEndNanos } = transformPplToSpans(
        result,
        traceId
      );
      const props = {
        ...baseProps,
        spans,
        rangeStartNanos,
        rangeEndNanos,
        osdUrl
      };
      return {
        props,
        text: spans.length === 0 ? `No spans found for traceId=${traceId} in ${ds}. ` + staleTraceIdHint(
          "If you expected this exact trace, double-check the `dataset` index pattern."
        ) : `Loaded ${spans.length} span(s) for traceId=${traceId}.`
      };
    } catch (err) {
      const msg = errorMessage(err);
      ctx.logger.error("[traces.details] PPL failed: " + msg);
      const props = {
        ...baseProps,
        spans: [],
        rangeStartNanos: 0,
        rangeEndNanos: 0,
        error: msg
      };
      return { props, text: "Failed to load spans: " + msg, isError: true };
    }
  }
});

// packages/ui/src/apps/traces/finder/schema.ts
import { z as z24 } from "zod";
var inputSchema17 = {
  dataSourceId: dataSourceIdField(),
  dataset: z24.string().optional().describe("Trace index pattern (default `otel-v1-apm-span-*`)."),
  ...timeRangeFields("`1h`"),
  minDurationMs: z24.number().positive().optional().describe("Min duration (ms) filter."),
  errorOnly: z24.boolean().optional().describe("Only traces with `status.code` = 2."),
  serviceName: z24.string().optional().describe("Filter to traces touching this service."),
  nameContains: z24.string().optional().describe("Filter: operation name contains substring."),
  excludeNameContains: z24.string().optional().describe(
    "Exclude long-lived streaming ops on broad sweeps. Ignored when `serviceName`/`nameContains` set."
  ),
  ...paginationInputFields({ limitDefault: 30, limitMax: 1e3, noun: "traces" }),
  ...presentationInputFields
};
var traceSchema = z24.object({
  traceId: z24.string(),
  serviceName: z24.string(),
  name: z24.string(),
  durationInNanos: z24.number(),
  durationDisplay: z24.string(),
  statusCode: z24.number(),
  startTime: z24.string()
});
var failureModeSchema = z24.object({
  operation: z24.string(),
  message: z24.string(),
  count: z24.number(),
  share: z24.number()
});
var propsSchema11 = z24.object({
  ...presentationPropsFields,
  dataset: z24.string(),
  timeRange: z24.string(),
  filtersText: z24.string(),
  dataSourceId: z24.string().optional(),
  endpointId: z24.string().optional(),
  traces: z24.array(traceSchema),
  maxDurationNanos: z24.number(),
  failureModes: z24.array(failureModeSchema).optional(),
  errorSpanTotal: z24.number().optional(),
  ...paginationPropsFields,
  table: z24.object({
    columns: z24.array(z24.string()),
    rows: z24.array(z24.array(z24.string()))
  }),
  osdUrl: z24.string().optional(),
  error: z24.string().optional()
});

// packages/ui/src/apps/traces/finder/view.tsx
import { useState as useState17 } from "react";
import { Fragment as Fragment12, jsx as jsx64, jsxs as jsxs41 } from "react/jsx-runtime";
var DETAILS_TOOL = toolName("traces", "details");
function TraceRow2({
  trace,
  index,
  max,
  dataSourceId,
  endpointId,
  dataset
}) {
  const { callTool, canCallTool } = useCallTool();
  const [open, setOpen] = useState17(false);
  const [fetch2, setFetch] = useState17(null);
  const isError = isSpanError(trace.statusCode);
  const expandable = canCallTool && !!dataSourceId && !!trace.traceId;
  async function load() {
    setFetch({ state: "loading" });
    try {
      const res = await callTool(DETAILS_TOOL, {
        dataSourceId,
        traceId: trace.traceId,
        dataset,
        ...endpointId ? { endpoint: endpointId } : {}
      });
      const sc = res.structuredContent ?? {};
      if (res.isError || sc.error) {
        setFetch({
          state: "error",
          message: sc.error || "Failed to load spans for this trace."
        });
        return;
      }
      setFetch({ state: "ready", details: sc });
    } catch (err) {
      setFetch({
        state: "error",
        message: err instanceof Error ? err.message : String(err)
      });
    }
  }
  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && fetch2 === null) void load();
  }
  return /* @__PURE__ */ jsxs41(Fragment12, { children: [
    /* @__PURE__ */ jsxs41(
      m.tr,
      {
        custom: index,
        variants: rowEntrance,
        initial: "hidden",
        animate: "visible",
        className: cn(
          "border-b border-[var(--ink-hairline)] align-top last:border-0",
          expandable && "cursor-pointer hover:bg-[var(--surface-muted)]",
          open && "bg-[var(--surface-muted)]"
        ),
        onClick: expandable ? toggle : void 0,
        children: [
          /* @__PURE__ */ jsxs41(TableCell, { className: "px-3 py-2 w-[42%]", children: [
            /* @__PURE__ */ jsxs41("div", { className: "flex items-center gap-2", children: [
              expandable && /* @__PURE__ */ jsx64(
                "span",
                {
                  className: cn(
                    "inline-flex size-4 shrink-0 items-center justify-center text-lg text-[var(--ink-mute)] transition-transform",
                    open && "rotate-90"
                  ),
                  "aria-hidden": true,
                  children: "\u203A"
                }
              ),
              /* @__PURE__ */ jsx64("span", { className: "font-semibold text-[var(--ink-bright)]", children: trace.name || "(unnamed)" }),
              isError && /* @__PURE__ */ jsx64(Badge, { variant: "destructive", children: "error" })
            ] }),
            /* @__PURE__ */ jsxs41("div", { className: "text-xs text-[var(--ink-soft)]", children: [
              trace.serviceName || "\u2014",
              " \xB7 ",
              /* @__PURE__ */ jsx64(Mono, { children: trace.traceId })
            ] })
          ] }),
          /* @__PURE__ */ jsx64(TableCell, { className: "px-3 py-2", children: /* @__PURE__ */ jsxs41("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ jsx64("div", { className: "flex-1 min-w-[80px]", children: /* @__PURE__ */ jsx64(
              HBar,
              {
                value: trace.durationInNanos,
                max: max || 1,
                tone: isError ? "danger" : "accent",
                height: 14
              }
            ) }),
            /* @__PURE__ */ jsx64(Mono, { className: "w-20 shrink-0 text-right font-semibold text-[var(--ink-bright)]", children: trace.durationDisplay })
          ] }) })
        ]
      }
    ),
    /* @__PURE__ */ jsx64(AnimatePresence, { initial: false, children: open && /* @__PURE__ */ jsx64("tr", { className: "border-b border-[var(--ink-hairline)] last:border-0", children: /* @__PURE__ */ jsx64("td", { colSpan: 2, className: "p-0", children: /* @__PURE__ */ jsx64(
      m.div,
      {
        initial: { height: 0, opacity: 0 },
        animate: { height: "auto", opacity: 1 },
        exit: { height: 0, opacity: 0 },
        transition: springSoft,
        style: { overflow: "hidden" },
        children: /* @__PURE__ */ jsx64("div", { className: "px-3 py-3", children: /* @__PURE__ */ jsx64(SpanFetchBody, { fetch: fetch2, onRetry: load }) })
      }
    ) }) }) })
  ] });
}
function SpanFetchBody({
  fetch: fetch2,
  onRetry
}) {
  if (fetch2 === null || fetch2.state === "loading") {
    return /* @__PURE__ */ jsx64("div", { className: "app-muted px-1 py-2 text-sm", children: "Loading spans\u2026" });
  }
  if (fetch2.state === "error") {
    return /* @__PURE__ */ jsxs41("div", { className: "flex items-center gap-3 px-1 py-2 text-sm", children: [
      /* @__PURE__ */ jsx64("span", { className: "text-[var(--danger)]", children: fetch2.message }),
      /* @__PURE__ */ jsx64(Button, { variant: "outline", size: "sm", className: "text-xs", onClick: (e) => {
        e.stopPropagation();
        onRetry();
      }, children: "Retry" })
    ] });
  }
  const { spans, rangeStartNanos, rangeEndNanos } = fetch2.details;
  if (!spans || spans.length === 0) {
    return /* @__PURE__ */ jsx64("div", { className: "app-muted px-1 py-2 text-sm", children: "No spans returned for this trace \u2014 it may have aged out of the index." });
  }
  return /* @__PURE__ */ jsx64("div", { onClick: (e) => e.stopPropagation(), children: /* @__PURE__ */ jsx64(
    SpanWaterfall,
    {
      spans,
      rangeStartNanos,
      rangeEndNanos,
      compact: true
    }
  ) });
}
function FinderView2({ props }) {
  return /* @__PURE__ */ jsx64(ViewGuard, { props, children: (p) => /* @__PURE__ */ jsx64(FinderViewInner2, { props: p }) });
}
function FinderViewInner2({ props }) {
  const failureModes = props.failureModes ?? [];
  const errorTotal = props.errorSpanTotal ?? 0;
  return /* @__PURE__ */ jsxs41(
    PresentationFrame,
    {
      presentation: props,
      category: "Traces",
      title: `${props.traces.length} trace(s) \xB7 ${props.filtersText}`,
      osdUrl: props.osdUrl,
      children: [
        failureModes.length > 0 && errorTotal > 0 && /* @__PURE__ */ jsxs41(Card, { children: [
          /* @__PURE__ */ jsx64(CardHeader, { className: "px-3 py-2", children: /* @__PURE__ */ jsxs41(CardTitle, { className: "text-sm", children: [
            "Failure modes",
            /* @__PURE__ */ jsxs41("span", { className: "ml-2 font-normal text-[var(--ink-mute)]", children: [
              errorTotal,
              " error spans \xB7 pick a trace from the top bucket"
            ] })
          ] }) }),
          /* @__PURE__ */ jsx64(CardContent, { className: "p-0", children: /* @__PURE__ */ jsx64(Table, { children: /* @__PURE__ */ jsx64(
            m.tbody,
            {
              variants: staggerContainer,
              initial: "hidden",
              animate: "visible",
              children: failureModes.map((f, i) => {
                return /* @__PURE__ */ jsxs41(
                  m.tr,
                  {
                    variants: staggerItem,
                    className: "border-b border-[var(--ink-hairline)] align-top last:border-0",
                    children: [
                      /* @__PURE__ */ jsxs41(TableCell, { className: "px-3 py-2 w-[46%]", children: [
                        /* @__PURE__ */ jsx64("div", { className: "font-semibold text-[var(--ink-bright)]", children: f.operation || "(unnamed)" }),
                        /* @__PURE__ */ jsx64("div", { className: "text-xs text-[var(--ink-soft)]", children: f.message || "(no message)" })
                      ] }),
                      /* @__PURE__ */ jsx64(TableCell, { className: "px-3 py-2", children: /* @__PURE__ */ jsxs41("div", { className: "flex items-center gap-2", children: [
                        /* @__PURE__ */ jsx64("div", { className: "flex-1 min-w-[80px]", children: /* @__PURE__ */ jsx64(HBar, { value: f.count, max: errorTotal || 1, tone: "danger", height: 14 }) }),
                        /* @__PURE__ */ jsxs41(Mono, { className: "w-20 shrink-0 text-right font-semibold text-[var(--ink-bright)]", children: [
                          f.count,
                          " \xB7 ",
                          pctOf(f.share)
                        ] })
                      ] }) })
                    ]
                  },
                  i
                );
              })
            }
          ) }) })
        ] }),
        /* @__PURE__ */ jsxs41(Card, { children: [
          /* @__PURE__ */ jsx64(CardHeader, { className: "px-3 py-2", children: /* @__PURE__ */ jsxs41(CardTitle, { className: "text-sm", children: [
            "Slowest traces",
            /* @__PURE__ */ jsx64("span", { className: "ml-2 font-normal text-[var(--ink-mute)]", children: "expand a row to see its span waterfall" })
          ] }) }),
          /* @__PURE__ */ jsx64(CardContent, { className: "p-0", children: props.traces.length === 0 ? /* @__PURE__ */ jsx64("div", { className: "app-muted px-3 py-6", children: "No traces matched." }) : /* @__PURE__ */ jsxs41(Fragment12, { children: [
            /* @__PURE__ */ jsx64(Table, { children: /* @__PURE__ */ jsx64(TableBody, { children: props.traces.map((t, i) => /* @__PURE__ */ jsx64(
              TraceRow2,
              {
                trace: t,
                index: i,
                max: props.maxDurationNanos,
                dataSourceId: props.dataSourceId,
                endpointId: props.endpointId,
                dataset: props.dataset
              },
              t.traceId || i
            )) }) }),
            (props.resultLimit || props.resultOffset) && /* @__PURE__ */ jsx64(TruncationFooter, { showing: props.traces.length, limit: props.resultLimit ?? props.traces.length, offset: props.resultOffset, noun: "traces" })
          ] }) })
        ] })
      ]
    }
  );
}

// src/apps/traces/finder/tool.ts
var DEFAULT_LIMIT5 = 30;
var finderRoute2 = defineRoute({
  id: "finder",
  tool: {
    title: "Find traces",
    description: "Find slow/erroring traces (slowest-first) as a ranked list widget. Filters: `errorOnly`, `minDurationMs`, `serviceName`, `nameContains`, `excludeNameContains`, `limit` (default 30), `offset` (page). With `errorOnly`: includes FAILURE-MODE BREAKDOWN by (operation, message) \u2014 read it first, drill from dominant bucket. Use returned `traceId` VERBATIM in `traces_details`/`traces_cross-signal-join`.",
    inputSchema: inputSchema17
  },
  propsSchema: propsSchema11,
  view: FinderView2,
  handler: async ({
    dataSourceId: suppliedDataSourceId,
    dataset,
    timeRange,
    from,
    to,
    minDurationMs,
    errorOnly,
    serviceName,
    nameContains,
    excludeNameContains,
    limit,
    offset,
    narrative,
    suggestions
  }, ctx) => {
    const dataSourceId = await ctx.osUi.resolveDataSourceId(suppliedDataSourceId);
    const framing = { narrative, suggestions };
    const ds = dataset?.trim() || DEFAULT_DATASET;
    let time;
    try {
      time = resolveTimeRange({ timeRange, from, to }, { defaultFrom: "now-1h" });
    } catch (err) {
      const msg = errorMessage(err);
      return {
        props: {
          ...framing,
          dataset: ds,
          timeRange: "all",
          filtersText: "",
          traces: [],
          maxDurationNanos: 0,
          table: { columns: [], rows: [] },
          error: msg
        },
        text: "Invalid time range: " + msg,
        isError: true
      };
    }
    const range = time.label;
    const lim = limit ?? DEFAULT_LIMIT5;
    const off = offset ?? 0;
    const svcField = await resolveServiceField(
      (dataset2, keyword) => ctx.osUi.describeFields(dataSourceId, dataset2, keyword),
      ds
    );
    const clauses = [`source = ${ds}`];
    if (svcField !== "serviceName") clauses.push(`eval serviceName = ${pplField(svcField)}`);
    const timeClause = pplTimePredicate("startTime", time);
    if (timeClause) clauses.push(`where ${timeClause}`);
    const scoped = !!serviceName || !!nameContains;
    if (!scoped && excludeNameContains) {
      clauses.push(`where not like(name, "%${pplQuote(excludeNameContains)}%")`);
    }
    if (errorOnly) clauses.push("where `status.code` = 2");
    if (minDurationMs) {
      clauses.push(`where durationInNanos >= ${Math.round(minDurationMs * 1e6)}`);
    }
    if (serviceName) clauses.push(`where serviceName = "${pplQuote(serviceName)}"`);
    if (nameContains) clauses.push(`where like(name, "%${pplQuote(nameContains)}%")`);
    clauses.push("sort - durationInNanos", "dedup traceId", pplHeadClause(lim, off));
    const query = clauses.join(" | ");
    const filterBits = [range];
    if (errorOnly) filterBits.push("errors only");
    if (minDurationMs) filterBits.push(`\u2265 ${minDurationMs}ms`);
    if (serviceName) filterBits.push(`service=${serviceName}`);
    if (nameContains) filterBits.push(`name~"${nameContains}"`);
    const filtersText = filterBits.join(" \xB7 ");
    ctx.logger.log("[traces.finder] PPL: " + query);
    const resultPromise = ctx.osUi.runPpl(dataSourceId, query, ds);
    const {
      workspaceId,
      indexPattern: ip,
      dataSourceTitle,
      dataSourceType
    } = await ctx.osUi.resolveDeepLinkContext(ctx, ds, dataSourceId);
    const filterClauses = clauses.filter((c) => c.startsWith("where"));
    const exploreQuery = filterClauses.map((c) => `| ${c}`).join(" ");
    const osdUrl = exploreTracesUrl({
      origin: ctx.osUi.endpoint,
      workspaceId,
      dataSourceId,
      datasetTitle: ip?.title ?? ds,
      indexPatternId: ip?.id,
      indexPatternDataSourceTitle: dataSourceTitle,
      indexPatternDataSourceType: dataSourceType,
      timeFieldName: ip?.timeFieldName,
      query: exploreQuery,
      from: time.fromExpr,
      to: time.toExpr
    });
    const base2 = {
      ...framing,
      dataset: ds,
      timeRange: range,
      filtersText,
      osdUrl,
      dataSourceId,
      // The connection's registry id is its normalized host — pass it so the
      // View can re-call traces_details against this same endpoint.
      endpointId: ctx.osUi.host
    };
    try {
      const result = await resultPromise;
      const traces = pplRows(result).map((r) => {
        const dur = toNumber(r.get("durationInNanos"));
        return {
          traceId: r.getString("traceId"),
          serviceName: r.getString("serviceName"),
          name: r.getString("name"),
          durationInNanos: dur,
          durationDisplay: formatDurationNanos(dur),
          statusCode: toNumber(r.get("status.code")) || extractStatusCode(r.get("status")),
          startTime: r.getString("startTime")
        };
      });
      const maxDurationNanos = traces.reduce(
        (m2, t) => Math.max(m2, t.durationInNanos),
        0
      );
      let failureModes;
      let errorSpanTotal;
      if (errorOnly && traces.length) {
        const ids = traces.map((t) => t.traceId).filter(Boolean).map((id) => `"${pplQuote(id)}"`);
        if (ids.length) {
          const errorWhere = [
            `source = ${ds}`,
            "where `status.code` = 2",
            `where traceId in (${ids.join(", ")})`
          ];
          const totalQuery = [...errorWhere, "stats count() as cnt"].join(" | ");
          const bdQuery = [
            ...errorWhere,
            "stats count() as cnt by name, `status.message`",
            "sort - cnt",
            "head 25"
          ].join(" | ");
          ctx.logger.log("[traces.finder] error-total PPL: " + totalQuery);
          ctx.logger.log("[traces.finder] breakdown PPL: " + bdQuery);
          try {
            const [totalRes, bd] = await Promise.all([
              ctx.osUi.runPpl(dataSourceId, totalQuery, ds),
              ctx.osUi.runPpl(dataSourceId, bdQuery, ds)
            ]);
            const totalRow = pplRows(totalRes)[0];
            errorSpanTotal = totalRow ? toNumber(totalRow.get("cnt")) : 0;
            const rows = pplRows(bd).map((r) => ({
              operation: r.getString("name"),
              message: r.getString("status.message").trim(),
              count: toNumber(r.get("cnt"))
            }));
            const ranked = rows.sort((a, b) => {
              const am = a.message ? 1 : 0;
              const bm = b.message ? 1 : 0;
              if (am !== bm) return bm - am;
              return b.count - a.count;
            }).slice(0, 6);
            const denom = errorSpanTotal || 1;
            failureModes = ranked.map((r) => ({
              operation: r.operation,
              message: r.message,
              count: r.count,
              share: r.count / denom
            }));
          } catch (bdErr) {
            ctx.logger.error(
              "[traces.finder] breakdown failed (non-fatal): " + pplErrorHint(bdErr, ds)
            );
          }
        }
      }
      const table = {
        columns: ["traceId", "service", "operation", "status", "duration"],
        rows: traces.map((t) => [
          t.traceId,
          t.serviceName,
          t.name,
          isSpanError(t.statusCode) ? "error" : "ok",
          t.durationDisplay
        ])
      };
      const props = {
        ...base2,
        traces,
        maxDurationNanos,
        ...paginationProps(traces.length, lim, off),
        table,
        failureModes,
        errorSpanTotal
      };
      if (traces.length === 0) {
        return {
          props,
          text: `No traces matched (${filtersText}) in ${ds}. ` + staleTraceIdHint("Loosen the filters or widen `timeRange`.")
        };
      }
      let breakdownText = "";
      if (failureModes && failureModes.length && errorSpanTotal) {
        const top = failureModes[0];
        const msg = (top.message || "(no message)").replace(/\s+/g, " ").slice(0, 120);
        const others = failureModes.slice(1).filter((f) => f.message).slice(0, 2).map(
          (f) => `${f.operation} \u2014 "${f.message.replace(/\s+/g, " ").slice(0, 60)}" (${pctOf(f.share)})`
        ).join(", ");
        breakdownText = ` Dominant failure mode: ${top.operation} \u2014 "${msg}" (${top.count}/${errorSpanTotal} error spans, ${pctOf(top.share)})` + (others ? `; then ${others}` : "") + `. Open a trace from the DOMINANT bucket, not just the slowest \u2014 the slowest is often an unrepresentative outlier.`;
      }
      const slowest = traces[0];
      return {
        props,
        text: `${traces.length} trace(s) matched (${filtersText}).` + breakdownText + ` Slowest: ${slowest.durationDisplay} on ${slowest.serviceName} (${slowest.name}). To open one, call traces_details or traces_cross-signal-join with the traceId shown in this list \u2014 use it verbatim, don't re-query for a new id.`
      };
    } catch (err) {
      const msg = pplErrorHint(err, ds);
      ctx.logger.error("[traces.finder] PPL failed: " + msg);
      const props = {
        ...base2,
        traces: [],
        maxDurationNanos: 0,
        table: { columns: [], rows: [] },
        error: msg
      };
      return { props, text: "Failed to find traces: " + msg, isError: true };
    }
  }
});

// packages/ui/src/apps/traces/health-overview/schema.ts
import { z as z25 } from "zod";
var inputSchema18 = {
  dataSourceId: dataSourceIdField(),
  dataset: z25.string().optional().describe("Trace index pattern (default `otel-v1-apm-span-*`)."),
  ...timeRangeFields("`1h`"),
  topN: z25.number().int().positive().max(500).optional().describe("Services per page (default 30)."),
  offset: z25.number().int().min(0).optional().describe("0-based offset to page through results (e.g. offset=30 for page 2)."),
  ...presentationInputFields
};
var serviceSchema = z25.object({
  serviceName: z25.string(),
  calls: z25.number(),
  errors: z25.number(),
  errorRate: z25.number(),
  p50: z25.number(),
  p95: z25.number(),
  p99: z25.number()
});
var propsSchema12 = z25.object({
  ...presentationPropsFields,
  dataset: z25.string(),
  timeRange: z25.string(),
  services: z25.array(serviceSchema),
  streamingInflated: z25.boolean().optional(),
  ...paginationPropsFields,
  table: z25.object({
    columns: z25.array(z25.string()),
    rows: z25.array(z25.array(z25.string()))
  }),
  osdUrl: z25.string().optional(),
  error: z25.string().optional()
});

// packages/ui/src/apps/traces/health-overview/view.tsx
import { Fragment as Fragment13, jsx as jsx65, jsxs as jsxs42 } from "react/jsx-runtime";
var STREAM_LIFETIME_FLOOR_NANOS = 6e10;
function HealthRow({
  svc,
  index,
  maxErrors
}) {
  const tone = svc.errorRate >= 0.05 ? "danger" : svc.errorRate > 0 ? "warn" : "accent";
  const streamy = svc.p99 >= STREAM_LIFETIME_FLOOR_NANOS;
  return /* @__PURE__ */ jsxs42(
    m.tr,
    {
      custom: index,
      variants: rowEntrance,
      initial: "hidden",
      animate: "visible",
      className: "border-b border-[var(--ink-hairline)] align-top last:border-0",
      children: [
        /* @__PURE__ */ jsx65(TableCell, { className: "px-3 py-2", children: /* @__PURE__ */ jsx65("span", { className: "font-semibold text-[var(--ink-bright)]", children: svc.serviceName || "\u2014" }) }),
        /* @__PURE__ */ jsx65(TableCell, { className: "px-3 py-2 text-right", children: /* @__PURE__ */ jsx65(Mono, { className: "text-[var(--ink-mute)]", children: /* @__PURE__ */ jsx65(AnimatedNumber, { value: svc.calls, format: (v) => Math.round(v).toLocaleString() }) }) }),
        /* @__PURE__ */ jsx65(TableCell, { className: "px-3 py-2 w-[34%]", children: /* @__PURE__ */ jsxs42("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsx65("div", { className: "flex-1 min-w-[80px]", children: /* @__PURE__ */ jsx65(HBar, { value: svc.errors, max: maxErrors || 1, tone, height: 14 }) }),
          /* @__PURE__ */ jsxs42(Mono, { className: "w-24 shrink-0 text-right font-semibold text-[var(--ink-bright)]", children: [
            pctOf(svc.errorRate),
            " \xB7 ",
            svc.errors.toLocaleString()
          ] })
        ] }) }),
        /* @__PURE__ */ jsx65(TableCell, { className: "px-3 py-2 text-right text-[var(--ink-mute)]", children: /* @__PURE__ */ jsx65(Mono, { children: formatDurationNanos(svc.p50) }) }),
        /* @__PURE__ */ jsx65(TableCell, { className: "px-3 py-2 text-right text-[var(--ink-mute)]", children: /* @__PURE__ */ jsx65(Mono, { children: formatDurationNanos(svc.p95) }) }),
        /* @__PURE__ */ jsxs42(TableCell, { className: "px-3 py-2 text-right", children: [
          /* @__PURE__ */ jsx65(Mono, { className: "text-[var(--ink-bright)]", children: formatDurationNanos(svc.p99) }),
          streamy && /* @__PURE__ */ jsx65(
            "span",
            {
              className: "ml-1 text-[var(--ink-mute)]",
              title: "Long-lived streaming span (e.g. flagd EventStream) \u2014 not request latency",
              children: "\u2248stream"
            }
          )
        ] })
      ]
    }
  );
}
function HealthOverviewView({ props }) {
  return /* @__PURE__ */ jsx65(ViewGuard, { props, children: (p) => /* @__PURE__ */ jsx65(HealthOverviewInner, { props: p }) });
}
function HealthOverviewInner({ props }) {
  const services = props.services ?? [];
  const maxErrors = services.reduce((m2, s) => Math.max(m2, s.errors), 0);
  return /* @__PURE__ */ jsxs42(
    PresentationFrame,
    {
      presentation: props,
      category: "Health",
      title: `${services.length} service(s) \xB7 ${props.timeRange} \xB7 ranked by error count`,
      osdUrl: props.osdUrl,
      children: [
        /* @__PURE__ */ jsxs42(Card, { children: [
          /* @__PURE__ */ jsx65(CardHeader, { className: "px-3 py-2", children: /* @__PURE__ */ jsxs42(CardTitle, { className: "text-sm", children: [
            "Service health",
            /* @__PURE__ */ jsxs42("span", { className: "ml-2 font-normal text-[var(--ink-mute)]", children: [
              "error rate \xB7 latency percentiles \xB7 ",
              props.timeRange
            ] })
          ] }) }),
          /* @__PURE__ */ jsx65(CardContent, { className: "p-0", children: services.length === 0 ? /* @__PURE__ */ jsx65("div", { className: "app-muted px-3 py-6", children: "No spans in this window." }) : /* @__PURE__ */ jsxs42(Fragment13, { children: [
            /* @__PURE__ */ jsxs42(Table, { children: [
              /* @__PURE__ */ jsx65(TableHeader, { children: /* @__PURE__ */ jsxs42(TableRow, { className: "glass-eyebrow", children: [
                /* @__PURE__ */ jsx65(TableHead, { className: "px-3 py-2", children: "Service" }),
                /* @__PURE__ */ jsx65(TableHead, { className: "px-3 py-2 text-right", children: "Calls" }),
                /* @__PURE__ */ jsx65(TableHead, { className: "px-3 py-2", children: "Error rate" }),
                /* @__PURE__ */ jsx65(TableHead, { className: "px-3 py-2 text-right", children: "p50" }),
                /* @__PURE__ */ jsx65(TableHead, { className: "px-3 py-2 text-right", children: "p95" }),
                /* @__PURE__ */ jsx65(TableHead, { className: "px-3 py-2 text-right", children: "p99" })
              ] }) }),
              /* @__PURE__ */ jsx65(TableBody, { children: services.map((s, i) => /* @__PURE__ */ jsx65(HealthRow, { svc: s, index: i, maxErrors }, s.serviceName || i)) })
            ] }),
            (props.resultLimit || props.resultOffset) && /* @__PURE__ */ jsx65(TruncationFooter, { showing: services.length, limit: props.resultLimit ?? services.length, offset: props.resultOffset, noun: "services" })
          ] }) })
        ] }),
        props.streamingInflated && /* @__PURE__ */ jsxs42("div", { className: "px-1 text-xs text-[var(--ink-mute)]", children: [
          "Rows marked ",
          /* @__PURE__ */ jsx65("span", { className: "text-[var(--ink-soft)]", children: "\u2248stream" }),
          " carry a long-lived gRPC stream (e.g. flagd ",
          /* @__PURE__ */ jsx65(Mono, { children: "EventStream" }),
          "); their p99 is the stream's open lifetime, not request latency \u2014 judge those by error rate."
        ] })
      ]
    }
  );
}

// src/apps/traces/health-overview/tool.ts
var DEFAULT_TOPN = 30;
var STREAM_LIFETIME_FLOOR_NANOS2 = 6e10;
var healthOverviewRoute = defineRoute({
  id: "health-overview",
  tool: {
    title: "Service health overview",
    description: "PRESENTATION: per-service health ranking (throughput, errors, p50/p95/p99) ordered by error count. Fast 'what's broken/slow' snapshot. IS the answer \u2014 no follow-up `report_dashboard` needed. `topN` default 30; use `offset` to page (e.g. offset=30 for next page).",
    inputSchema: inputSchema18
  },
  propsSchema: propsSchema12,
  view: HealthOverviewView,
  // Results are already ranked by error count and capped at `topN`; raise it to
  // see services past the cutoff (the echo also tops out at ~20 rows).
  echoHint: "\u21B3 Only the top services are shown (already rendered in the widget above). Use `offset` to page (e.g. offset=30 for the next page), raise `topN` to rank more per page, or drill in with `traces_dependencies` / `ppl_query`.",
  handler: async ({ dataSourceId: suppliedDataSourceId, dataset, timeRange, from, to, topN, offset, narrative, suggestions }, ctx) => {
    const dataSourceId = await ctx.osUi.resolveDataSourceId(suppliedDataSourceId);
    const framing = { narrative, suggestions };
    const ds = dataset?.trim() || DEFAULT_DATASET;
    let time;
    try {
      time = resolveTimeRange({ timeRange, from, to }, { defaultFrom: "now-1h" });
    } catch (err) {
      const msg = errorMessage(err);
      return {
        props: {
          ...framing,
          dataset: ds,
          timeRange: "all",
          services: [],
          table: { columns: [], rows: [] },
          error: msg
        },
        text: "Invalid time range: " + msg,
        isError: true
      };
    }
    const range = time.label;
    const n = topN ?? DEFAULT_TOPN;
    const clauses = [`source = ${ds}`];
    const timeClause = pplTimePredicate("startTime", time);
    if (timeClause) clauses.push(`where ${timeClause}`);
    const svcField = await resolveServiceField(
      (dataset2, keyword) => ctx.osUi.describeFields(dataSourceId, dataset2, keyword),
      ds
    );
    if (svcField !== "serviceName") clauses.push(`eval serviceName = ${pplField(svcField)}`);
    clauses.push(
      "stats count() as calls, sum(if(`status.code` = 2, 1, 0)) as errors, percentile(durationInNanos, 50) as p50, percentile(durationInNanos, 95) as p95, percentile(durationInNanos, 99) as p99 by serviceName"
    );
    const off = offset ?? 0;
    clauses.push("sort - errors", pplHeadClause(n, off));
    const query = clauses.join(" | ");
    ctx.logger.log("[traces.health-overview] PPL: " + query);
    const resultPromise = ctx.osUi.runPpl(dataSourceId, query, ds);
    const {
      workspaceId,
      indexPattern: ip,
      dataSourceTitle,
      dataSourceType
    } = await ctx.osUi.resolveDeepLinkContext(ctx, ds, dataSourceId);
    const exploreQuery = timeClause ? `| where ${timeClause}` : "";
    const osdUrl = exploreTracesUrl({
      origin: ctx.osUi.endpoint,
      workspaceId,
      dataSourceId,
      datasetTitle: ip?.title ?? ds,
      indexPatternId: ip?.id,
      indexPatternDataSourceTitle: dataSourceTitle,
      indexPatternDataSourceType: dataSourceType,
      timeFieldName: ip?.timeFieldName,
      query: exploreQuery,
      from: time.fromExpr,
      to: time.toExpr
    });
    const base2 = { ...framing, dataset: ds, timeRange: range, osdUrl };
    try {
      const result = await resultPromise;
      const rows = pplRows(result).map((r) => {
        const calls = toNumber(r.get("calls"));
        const errors = toNumber(r.get("errors"));
        return {
          serviceName: r.getString("serviceName"),
          calls,
          errors,
          errorRate: calls ? errors / calls : 0,
          p50: toNumber(r.get("p50")),
          p95: toNumber(r.get("p95")),
          p99: toNumber(r.get("p99"))
        };
      });
      const table = {
        columns: ["serviceName", "calls", "errors", "errorRate", "p50", "p95", "p99"],
        rows: rows.map((s) => [
          s.serviceName,
          String(s.calls),
          String(s.errors),
          pctOf(s.errorRate),
          formatDurationNanos(s.p50),
          formatDurationNanos(s.p95),
          formatDurationNanos(s.p99)
        ])
      };
      if (rows.length === 0) {
        const props2 = { ...base2, services: [], table };
        return {
          props: props2,
          text: `No spans in ${ds} over ${range}. Widen \`timeRange\` or adjust \`from\`/\`to\`.`
        };
      }
      const worstErr = [...rows].sort((a, b) => b.errorRate - a.errorRate)[0];
      const byP99 = [...rows].sort((a, b) => b.p99 - a.p99);
      const worstP99 = byP99[0];
      const streaming = rows.filter((s) => s.p99 >= STREAM_LIFETIME_FLOOR_NANOS2);
      const streamingInflated = streaming.length > 0;
      const slowestReal = byP99.find((s) => s.p99 < STREAM_LIFETIME_FLOOR_NANOS2);
      const latencyLine = slowestReal ? `Slowest real (per-request) p99: ${slowestReal.serviceName} (${formatDurationNanos(slowestReal.p99)}).` : `No service has a per-request p99 below the streaming floor.`;
      const streamNote = streamingInflated ? ` NOTE \u2014 do NOT report these as slow: ${streaming.map((s) => s.serviceName).join(", ")} carry a long-lived streaming/keepalive span (p99 = the stream's open lifetime, e.g. ${formatDurationNanos(worstP99.p99)}), NOT per-request latency. Judge them by error rate, and treat a stream close (\`status.code\`=2, often a "server-side timeout") as the signal \u2014 not the duration.` : "";
      const text = `Top ${rows.length} services by errors over ${range}. Worst error rate: ${worstErr.serviceName} (${pctOf(worstErr.errorRate)}, ${worstErr.errors} errors). ` + latencyLine + streamNote;
      const props = {
        ...base2,
        services: rows,
        streamingInflated,
        ...paginationProps(rows.length, n, off),
        table
      };
      return { props, text };
    } catch (err) {
      const msg = pplErrorHint(err, ds);
      ctx.logger.error("[traces.health-overview] PPL failed: " + msg);
      const props = {
        ...base2,
        services: [],
        table: { columns: [], rows: [] },
        error: msg
      };
      return { props, text: "Failed to load service health: " + msg, isError: true };
    }
  }
});

// packages/ui/src/apps/traces/service-map/schema.ts
import { z as z26 } from "zod";
var inputSchema19 = {
  dataSourceId: dataSourceIdField(),
  dataset: z26.string().optional().describe("Trace index pattern (default `otel-v1-apm-span-*`)."),
  ...timeRangeFields("`15m`"),
  serviceName: z26.string().optional().describe("Focus on edges touching this service."),
  limit: z26.number().int().positive().max(2e4).optional().describe("Max spans to load (default 5000)."),
  ...presentationInputFields
};
var nodeSchema = z26.object({
  service: z26.string(),
  depth: z26.number(),
  inboundCalls: z26.number(),
  outboundCalls: z26.number(),
  errors: z26.number(),
  errorRate: z26.number(),
  spanCount: z26.number()
});
var edgeSchema = z26.object({
  caller: z26.string(),
  callee: z26.string(),
  calls: z26.number(),
  errors: z26.number(),
  errorRate: z26.number(),
  avgDurationNanos: z26.number()
});
var propsSchema13 = z26.object({
  ...presentationPropsFields,
  dataset: z26.string(),
  timeRange: z26.string(),
  nodes: z26.array(nodeSchema),
  edges: z26.array(edgeSchema),
  // Flat edge table so the framework's echoData surfaces caller→callee values
  // to the model (it reads only `text`, not this structured content).
  table: z26.object({
    columns: z26.array(z26.string()),
    rows: z26.array(z26.array(z26.string()))
  }),
  spanCount: z26.number(),
  /** Deep link to the OpenSearch Dashboards APM service (application) map. */
  osdUrl: z26.string().optional(),
  error: z26.string().optional()
});

// packages/ui/src/apps/traces/service-map/view.tsx
import { useMemo as useMemo11, useState as useState18 } from "react";

// packages/ui/src/apps/traces/service-map/dag.ts
function statusOf(errorRate) {
  if (errorRate > 0.05) return "err";
  if (errorRate > 0.01) return "warn";
  return "ok";
}
var STATUS_TONE = {
  ok: "success",
  warn: "warn",
  err: "danger"
};
function serviceMapToDag(nodes, edges) {
  const present = new Set(nodes.map((n) => n.service));
  const dagNodes = nodes.map((n) => ({
    id: n.service,
    label: n.service,
    sublabel: `${(n.errorRate * 100).toFixed(1)}% errors`,
    tone: STATUS_TONE[statusOf(n.errorRate)]
  }));
  const dagEdges = [];
  for (const e of edges) {
    if (!present.has(e.caller) || !present.has(e.callee)) continue;
    const status = statusOf(e.errorRate);
    dagEdges.push({
      from: e.caller,
      to: e.callee,
      tone: STATUS_TONE[status],
      dashed: status === "err"
    });
  }
  return { nodes: dagNodes, edges: dagEdges };
}

// packages/ui/src/apps/traces/service-map/view.tsx
import { Fragment as Fragment14, jsx as jsx66, jsxs as jsxs43 } from "react/jsx-runtime";
var MAX_NODES = 30;
var MAX_EDGES = 80;
var MAX_EDGE_RATIO = 2.5;
var MAX_COLUMN = 13;
function rateClass(rate) {
  if (rate > 0.05) return "text-[var(--danger)]";
  if (rate > 0.01) return "text-[var(--warn)]";
  return "text-[var(--ink-soft)]";
}
function EdgeTable({ edges }) {
  return /* @__PURE__ */ jsxs43(Table, { children: [
    /* @__PURE__ */ jsx66(TableHeader, { children: /* @__PURE__ */ jsxs43(TableRow, { className: "glass-eyebrow text-[var(--ink-mute)]", children: [
      /* @__PURE__ */ jsx66(TableHead, { className: "px-3 py-2", children: "Caller" }),
      /* @__PURE__ */ jsx66(TableHead, { className: "px-3 py-2", children: "Callee" }),
      /* @__PURE__ */ jsx66(TableHead, { className: "px-2 py-2 text-right", children: "Calls" }),
      /* @__PURE__ */ jsx66(TableHead, { className: "px-2 py-2 text-right", children: "Err %" }),
      /* @__PURE__ */ jsx66(TableHead, { className: "px-2 py-2 text-right", children: "Avg" })
    ] }) }),
    /* @__PURE__ */ jsx66(TableBody, { children: edges.map((e, i) => /* @__PURE__ */ jsxs43(
      m.tr,
      {
        custom: i,
        variants: rowEntrance,
        initial: "hidden",
        animate: "visible",
        className: "border-b border-[var(--ink-hairline)] last:border-0",
        children: [
          /* @__PURE__ */ jsx66(TableCell, { className: "px-3 py-1.5", children: /* @__PURE__ */ jsx66(Mono, { className: "text-[var(--ink-bright)]", children: e.caller }) }),
          /* @__PURE__ */ jsx66(TableCell, { className: "px-3 py-1.5", children: /* @__PURE__ */ jsx66(Mono, { className: "text-[var(--ink-bright)]", children: e.callee }) }),
          /* @__PURE__ */ jsx66(TableCell, { className: "px-2 py-1.5 text-right", children: /* @__PURE__ */ jsx66(Mono, { children: e.calls.toLocaleString() }) }),
          /* @__PURE__ */ jsx66(TableCell, { className: `px-2 py-1.5 text-right ${rateClass(e.errorRate)}`, children: /* @__PURE__ */ jsx66(Mono, { children: pctOf(e.errorRate) }) }),
          /* @__PURE__ */ jsx66(TableCell, { className: "px-2 py-1.5 text-right text-[var(--ink-mute)]", children: /* @__PURE__ */ jsx66(Mono, { children: formatDurationNanos(e.avgDurationNanos) }) })
        ]
      },
      i
    )) })
  ] });
}
function ServiceMapView({ props }) {
  return /* @__PURE__ */ jsx66(ViewGuard, { props, children: (p) => /* @__PURE__ */ jsx66(ServiceMapInner, { props: p }) });
}
function ServiceMapInner({ props }) {
  const [filter, setFilter] = useState18("all");
  const maxColumn = props.nodes.reduce((m2, n, _i, all) => {
    const c = all.filter((o) => o.depth === n.depth).length;
    return Math.max(m2, c);
  }, 0);
  const edgeRatio = props.nodes.length ? props.edges.length / props.nodes.length : 0;
  const dense = props.nodes.length > MAX_NODES || props.edges.length > MAX_EDGES || edgeRatio > MAX_EDGE_RATIO || maxColumn > MAX_COLUMN;
  const dag = useMemo11(() => {
    const nodes = filter === "all" ? props.nodes : props.nodes.filter((n) => statusOf(n.errorRate) === filter);
    const kept = new Set(nodes.map((n) => n.service));
    const edges = props.edges.filter(
      (e) => kept.has(e.caller) && kept.has(e.callee)
    );
    return serviceMapToDag(nodes, edges);
  }, [props.nodes, props.edges, filter]);
  return /* @__PURE__ */ jsxs43(
    PresentationFrame,
    {
      presentation: props,
      category: "Service Map",
      title: `${props.nodes.length} services \xB7 ${props.edges.length} edges`,
      osdUrl: props.osdUrl,
      children: [
        /* @__PURE__ */ jsxs43("div", { className: "flex flex-wrap items-center gap-3 text-sm", children: [
          /* @__PURE__ */ jsxs43(m.div, { variants: scaleIn, initial: "hidden", animate: "visible", className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx66(Eyebrow, { children: "Window" }),
            /* @__PURE__ */ jsx66(Mono, { className: "text-[var(--ink)]", children: props.timeRange })
          ] }),
          /* @__PURE__ */ jsx66(Separator, { orientation: "vertical", className: "h-4" }),
          /* @__PURE__ */ jsxs43(m.div, { variants: scaleIn, initial: "hidden", animate: "visible", className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx66(Eyebrow, { children: "Services" }),
            /* @__PURE__ */ jsx66(Mono, { className: "font-semibold text-[var(--ink-bright)]", children: /* @__PURE__ */ jsx66(AnimatedNumber, { value: props.nodes.length }) })
          ] }),
          /* @__PURE__ */ jsx66(Separator, { orientation: "vertical", className: "h-4" }),
          /* @__PURE__ */ jsxs43(m.div, { variants: scaleIn, initial: "hidden", animate: "visible", className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ jsx66(Eyebrow, { children: "Edges" }),
            /* @__PURE__ */ jsx66(Mono, { className: "font-semibold text-[var(--ink-bright)]", children: /* @__PURE__ */ jsx66(AnimatedNumber, { value: props.edges.length }) })
          ] })
        ] }),
        props.edges.length === 0 ? /* @__PURE__ */ jsxs43("div", { className: "app-muted", children: [
          "No cross-service call edges in ",
          /* @__PURE__ */ jsx66(Mono, { children: props.dataset }),
          "."
        ] }) : /* @__PURE__ */ jsxs43(Fragment14, { children: [
          !dense && /* @__PURE__ */ jsxs43(Card, { children: [
            /* @__PURE__ */ jsxs43(CardHeader, { className: "flex-row items-center justify-between gap-2 px-3 py-2", children: [
              /* @__PURE__ */ jsxs43(CardTitle, { className: "text-sm", children: [
                "Call graph",
                /* @__PURE__ */ jsx66("span", { className: "ml-2 font-normal text-[var(--ink-mute)]", children: "left\u2192right by call depth \xB7 color = error rate" })
              ] }),
              /* @__PURE__ */ jsx66("div", { className: "flex gap-px overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[var(--glass)] shadow-sm", children: ["all", "ok", "warn", "err"].map((f) => /* @__PURE__ */ jsx66(
                "button",
                {
                  className: cn(
                    "px-3 py-1 text-[11px] font-medium transition-colors",
                    filter === f ? "bg-[var(--accent-soft)] text-[var(--accent-bright)]" : "text-[var(--ink-soft)] hover:bg-[var(--surface-muted)]"
                  ),
                  onClick: () => setFilter(f),
                  children: f === "all" ? "All" : f === "ok" ? "Healthy" : f === "warn" ? "Degraded" : "Errors"
                },
                f
              )) })
            ] }),
            /* @__PURE__ */ jsx66(CardContent, { className: "overflow-auto p-3", children: /* @__PURE__ */ jsx66(DAGChart, { nodes: dag.nodes, edges: dag.edges, direction: "LR", height: 520, flow: true }) })
          ] }),
          dense && /* @__PURE__ */ jsxs43("div", { className: "text-xs text-[var(--ink-mute)]", children: [
            "Graph is dense (",
            props.nodes.length,
            " services, ",
            props.edges.length,
            " ",
            "edges) \u2014 showing the ranked edge table."
          ] }),
          /* @__PURE__ */ jsxs43(Card, { children: [
            /* @__PURE__ */ jsx66(CardHeader, { className: "px-3 py-2", children: /* @__PURE__ */ jsx66(CardTitle, { className: "text-sm", children: "Edges by call volume" }) }),
            /* @__PURE__ */ jsx66(CardContent, { className: "p-0", children: /* @__PURE__ */ jsx66(EdgeTable, { edges: props.edges }) })
          ] })
        ] })
      ]
    }
  );
}

// src/apps/traces/service-map/tool.ts
var serviceMapRoute = defineRoute({
  id: "service-map",
  tool: {
    title: "Service map",
    description: "PRESENTATION: interactive service call graph (nodes + edges by volume/error rate). `timeRange` default `15m`; `serviceName` to focus; `limit` default 5000. This IS the answer \u2014 don't rebuild as `report_dashboard`.",
    inputSchema: inputSchema19
  },
  propsSchema: propsSchema13,
  view: ServiceMapView,
  handler: async ({ dataSourceId: suppliedDataSourceId, dataset, timeRange, from, to, serviceName, limit, narrative, suggestions }, ctx) => {
    const dataSourceId = await ctx.osUi.resolveDataSourceId(suppliedDataSourceId);
    const ds = dataset?.trim() || DEFAULT_DATASET;
    const framing = { narrative, suggestions };
    let time;
    try {
      time = resolveTimeRange({ timeRange, from, to }, { defaultFrom: "now-15m" });
    } catch (err) {
      const msg = errorMessage(err);
      return {
        props: {
          ...framing,
          dataset: ds,
          timeRange: "all",
          nodes: [],
          edges: [],
          table: { columns: [], rows: [] },
          spanCount: 0,
          error: msg
        },
        text: "Invalid time range: " + msg,
        isError: true
      };
    }
    const range = time.label;
    const query = buildSpansLoadQuery({ dataset: ds, time, limit });
    ctx.logger.log("[traces.service-map] PPL: " + query);
    const resultPromise = ctx.osUi.runPpl(dataSourceId, query, ds);
    resultPromise.catch(() => {
    });
    const workspaceId = ctx.workspaceId ?? await ctx.osUi.resolveObservabilityWorkspaceId();
    const osdUrl = serviceMapUrl({
      origin: ctx.osUi.endpoint,
      workspaceId,
      serviceName,
      from: time.fromExpr,
      to: time.toExpr
    });
    const base2 = { ...framing, dataset: ds, timeRange: range, osdUrl };
    try {
      const result = await resultPromise;
      const { spans } = transformPplToSpans(result, "");
      const graph = buildServiceGraph(spans);
      let edges = graph.edges;
      let nodes = graph.nodes;
      if (serviceName) {
        edges = edges.filter(
          (e) => e.caller === serviceName || e.callee === serviceName
        );
        const keep = new Set(edges.flatMap((e) => [e.caller, e.callee]));
        nodes = nodes.filter((n) => keep.has(n.service));
        nodes = nodes.map((n) => ({
          ...n,
          depth: n.service === serviceName ? 1 : edges.some((e) => e.callee === serviceName && e.caller === n.service) ? 0 : 2
          // a callee of the focus (or both — placed downstream)
        }));
      }
      const props = {
        ...base2,
        nodes,
        edges,
        table: edgeTable(edges),
        spanCount: graph.spanCount
      };
      if (edges.length === 0) {
        return {
          props,
          text: `No cross-service call edges found in ${ds} over ${range}${serviceName ? ` touching ${serviceName}` : ""} (${spans.length} spans loaded). Widen \`timeRange\` or raise \`limit\` \u2014 a flat span window can split a trace's spans.`
        };
      }
      const top = edges.slice(0, 3).map((e) => `${e.caller}\u2192${e.callee} (${e.calls}, ${pctOf(e.errorRate)} err)`).join(", ");
      return {
        props,
        text: `Service map: ${nodes.length} services, ${edges.length} edges over ${range}. Busiest: ${top}.`
      };
    } catch (err) {
      const msg = pplErrorHint(err, ds);
      ctx.logger.error("[traces.service-map] PPL failed: " + msg);
      const props = {
        ...base2,
        nodes: [],
        edges: [],
        table: { columns: [], rows: [] },
        spanCount: 0,
        error: msg
      };
      return { props, text: "Failed to build service map: " + msg, isError: true };
    }
  }
});

// src/apps/traces/index.ts
var tracesApp = defineApp({
  id: "traces",
  title: "Traces",
  description: "Find, inspect, and correlate traces: find slow/erroring traces, inspect one as a span hierarchy, join spans with logs on a unified timeline, and map the service call graph. Plus text-only health and dependency investigation.",
  routes: [
    finderRoute2,
    detailsRoute2,
    crossSignalJoinRoute,
    serviceMapRoute,
    dependenciesRoute,
    healthOverviewRoute
  ]
});

// src/apps/index.ts
var apps = [
  pplApp,
  reportApp,
  tracesApp,
  agentTraceApp,
  alertsFeedApp,
  metricsApp,
  instrumentationScoreApp,
  sloApp
];

// packages/ui/src/apps/showcase/chart-panel/view.tsx
import { jsx as jsx67 } from "react/jsx-runtime";
function ChartPanelView({ props }) {
  if (!props) {
    return /* @__PURE__ */ jsx67("div", { className: "app", children: /* @__PURE__ */ jsx67("span", { className: "app-muted", children: "Loading chart\u2026" }) });
  }
  return /* @__PURE__ */ jsx67(PresentationFrame, { presentation: props, category: "Metrics", title: props.title, children: /* @__PURE__ */ jsx67(
    ChartPanel,
    {
      title: props.title,
      meta: props.meta,
      series: props.series,
      xLabels: props.xLabels,
      kind: props.kind,
      threshold: props.threshold,
      thresholdLabel: props.thresholdLabel,
      thresholdTone: props.thresholdTone,
      height: 160
    }
  ) });
}

// packages/ui/src/apps/showcase/flow-graph/view.tsx
import { useState as useState19 } from "react";
import { jsx as jsx68 } from "react/jsx-runtime";
function FlowGraphView({ props }) {
  const [selected, setSelected] = useState19(null);
  if (!props) {
    return /* @__PURE__ */ jsx68("div", { className: "app", children: /* @__PURE__ */ jsx68("span", { className: "app-muted", children: "Loading flow graph\u2026" }) });
  }
  return /* @__PURE__ */ jsx68(PresentationFrame, { presentation: props, category: "Flow", title: `${props.nodes.length} steps`, children: /* @__PURE__ */ jsx68(
    DAGChart,
    {
      nodes: props.nodes,
      edges: props.edges,
      direction: props.direction ?? "TB",
      selected,
      onSelect: setSelected,
      height: 400
    }
  ) });
}

// packages/ui/src/apps/_generated/registry.ts
var registry = {
  "agent-trace/details": { appId: "agent-trace", routeId: "details", appTitle: "Agent Trace", view: DetailsView },
  "agent-trace/evidence": { appId: "agent-trace", routeId: "evidence", appTitle: "Agent Trace", view: EvidenceView },
  "agent-trace/finder": { appId: "agent-trace", routeId: "finder", appTitle: "Agent Trace", view: FinderView },
  "alerts-feed/list": { appId: "alerts-feed", routeId: "list", appTitle: "Alerts feed", view: ListView },
  "instrumentation-score/evaluate": { appId: "instrumentation-score", routeId: "evaluate", appTitle: "Instrumentation Score", view: EvaluateView },
  "report/dashboard": { appId: "report", routeId: "dashboard", appTitle: "Report", view: DashboardView },
  "showcase/chart-panel": { appId: "showcase", routeId: "chart-panel", appTitle: "Components (no MCP tool)", view: ChartPanelView },
  "showcase/flow-graph": { appId: "showcase", routeId: "flow-graph", appTitle: "Components (no MCP tool)", view: FlowGraphView },
  "slo/detail": { appId: "slo", routeId: "detail", appTitle: "slo", view: DetailView },
  "slo/list": { appId: "slo", routeId: "list", appTitle: "slo", view: ListView2 },
  "traces/cross-signal-join": { appId: "traces", routeId: "cross-signal-join", appTitle: "Traces", view: CrossSignalJoinView },
  "traces/details": { appId: "traces", routeId: "details", appTitle: "Traces", view: DetailsView2 },
  "traces/finder": { appId: "traces", routeId: "finder", appTitle: "Traces", view: FinderView2 },
  "traces/health-overview": { appId: "traces", routeId: "health-overview", appTitle: "Traces", view: HealthOverviewView },
  "traces/service-map": { appId: "traces", routeId: "service-map", appTitle: "Traces", view: ServiceMapView }
};

// src/osd/index.ts
var routeCatalog = Object.fromEntries(
  apps.flatMap(
    (app) => app.routes.map((route) => {
      const key = `${app.id}/${route.id}`;
      return [key, { appId: app.id, routeId: route.id, key, route }];
    })
  )
);
export {
  AppProviders,
  DashboardLink,
  DataSourceResolutionError,
  OsHttpError,
  OsUiConnection,
  PresentationFrame,
  SsoLoginRequiredError,
  URI_SCHEME_PREFIX,
  apps,
  errorMessage,
  normalizeEndpoint,
  registry,
  routeCatalog,
  routeUri,
  toolName
};
//# sourceMappingURL=logic.js.map
