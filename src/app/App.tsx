import { useEffect, useMemo, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import {
  Activity,
  Archive,
  Bot,
  BrainCircuit,
  CircleDot,
  Database,
  FileCheck2,
  FlaskConical,
  Gauge,
  GitBranch,
  HardDrive,
  MessageSquare,
  Network,
  Plus,
  Send,
  Settings2,
  ShieldCheck,
  SquareTerminal,
  Upload,
  Microscope,
} from 'lucide-react';
import {
  analyzeTextDataset,
  assignDeterministicSplits,
  buildDatasetManifest,
  findCrossSplitLeakage,
  findNearDuplicates,
  type DatasetAnalysis,
  type NearDuplicateFinding,
  type SplitAssignment,
} from '../datasets/core';
import { getEngineAdapter } from '../engine/adapter';
import type { EngineCapabilities, EngineIdentity, InferenceRequest, NativeModel } from '../engine/EngineAdapter';
import { makeReceipt, type EvidenceReceipt } from '../evidence/types';
import { makeInferenceReceipt } from '../evidence/inference';
import { buildEvidenceGraph } from '../graph/model';
import { EvidenceGraph } from '../components/EvidenceGraph';
import { NativeContractView, type NativeSurface } from '../components/NativeContractView';

const nav = [
  ['chat', MessageSquare, 'Chat'],
  ['datasets', Database, 'Datasets'],
  ['training', Activity, 'Training'],
  ['evaluation', FlaskConical, 'Evaluation'],
  ['checkpoints', Archive, 'Checkpoints'],
  ['probe', Microscope, 'Probe'],
  ['graph', Network, 'Evidence Graph'],
  ['evidence', ShieldCheck, 'Evidence'],
] as const;

type ViewId = (typeof nav)[number][0];

const fixture = `User: What is 2+2?\nAssistant: 4\n\nUser: What is the capital of Saudi Arabia?\nAssistant: Riyadh\n\nUser: What is 2+2?\nAssistant: 4\n\nمرحبا بالعالم\n\nshort`;
const DEFAULT_SPLIT_SEED = 'niyah-studio-seed-1';
const NO_CAPABILITIES: EngineCapabilities = { prepare: false, shard: false, training: false, evaluation: false, inference: false, probe: false, cancellation: false };

export function App() {
  const [view, setView] = useState<ViewId>('chat');
  const [engine, setEngine] = useState<EngineIdentity>({
    status: 'ENGINE_OFFLINE',
    repository: 'Grar00t/Niyah.Engine',
    commit: null,
    executableSha256: null,
    backend: null,
    detail: 'Checking…',
  });
  const [dataset, setDataset] = useState<DatasetAnalysis | null>(null);
  const [assignments, setAssignments] = useState<SplitAssignment[]>([]);
  const [splitSeed, setSplitSeed] = useState(DEFAULT_SPLIT_SEED);
  const [nearThreshold, setNearThreshold] = useState('0.88');
  const [nearDuplicates, setNearDuplicates] = useState<NearDuplicateFinding[] | null>(null);
  const [receipts, setReceipts] = useState<EvidenceReceipt[]>([]);
  const [prompt, setPrompt] = useState('');
  const [capabilities, setCapabilities] = useState<EngineCapabilities>(NO_CAPABILITIES);
  const [models, setModels] = useState<NativeModel[]>([]);
  const [modelId, setModelId] = useState('');
  const [maxNewTokens, setMaxNewTokens] = useState(32);
  const [running, setRunning] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'system' | 'native'; text: string; stderr?: string; execution?: string }>>([]);
  const inferenceReady = engine.status === 'ONLINE' && capabilities.inference && models.some((model) => model.id === modelId);

  useEffect(() => {
    void refreshEngine();
  }, []);

  async function refreshEngine() {
    setCapabilities(NO_CAPABILITIES);
    try {
      const adapter = getEngineAdapter();
      const identity = await adapter.getIdentity();
      const [available, verifiedModels] = identity.status === 'ONLINE'
        ? await Promise.all([adapter.getCapabilities(), adapter.getModels()])
        : [NO_CAPABILITIES, [] as NativeModel[]];
      setEngine(identity);
      setCapabilities(available);
      setModels(verifiedModels);
      setModelId((current) => verifiedModels.some((model) => model.id === current) ? current
        : verifiedModels.find((model) => model.id === 'v10-sft-canary')?.id ?? verifiedModels[0]?.id ?? '');
    } catch (error: unknown) {
      setModels([]);
      setEngine({
        status: 'ERROR',
        repository: 'Grar00t/Niyah.Engine',
        commit: null,
        executableSha256: null,
        backend: null,
        detail: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function loadBytes(name: string, bytes: Uint8Array, source: 'TEST_FIXTURE' | 'USER_ACTION') {
    try {
      const result = await analyzeTextDataset(name, bytes);
      const split = assignDeterministicSplits(result.records.map((record) => record.id), DEFAULT_SPLIT_SEED);
      setDataset(result);
      setAssignments(split);
      setSplitSeed(DEFAULT_SPLIT_SEED);
      setNearDuplicates(null);
      const receipt = makeReceipt(
        'dataset.analyze',
        'PASS',
        source === 'TEST_FIXTURE' ? 'TEST_FIXTURE' : 'DETERMINISTIC_LOCAL',
        `${result.records.length} records analyzed from ${name}`,
      );
      receipt.inputSha256 = [result.sourceSha256];
      setReceipts((previous) => [...previous, receipt]);
    } catch (error) {
      setReceipts((previous) => [
        ...previous,
        makeReceipt('dataset.analyze', 'FAIL', 'DETERMINISTIC_LOCAL', error instanceof Error ? error.message : String(error)),
      ]);
    }
  }

  async function loadFixture() {
    await loadBytes('TEST_FIXTURE.txt', new TextEncoder().encode(fixture), 'TEST_FIXTURE');
    setView('datasets');
  }

  async function onFile(file: File) {
    await loadBytes(file.name, new Uint8Array(await file.arrayBuffer()), 'USER_ACTION');
    setView('datasets');
  }

  function rebuildSplit() {
    if (!dataset) return;
    try {
      const split = assignDeterministicSplits(dataset.records.map((record) => record.id), splitSeed);
      setAssignments(split);
      setReceipts((previous) => [
        ...previous,
        makeReceipt('dataset.split', 'PASS', 'DETERMINISTIC_LOCAL', `Deterministic 80/10/10 split assigned with seed=${splitSeed}`),
      ]);
    } catch (error) {
      setReceipts((previous) => [
        ...previous,
        makeReceipt('dataset.split', 'FAIL', 'DETERMINISTIC_LOCAL', error instanceof Error ? error.message : String(error)),
      ]);
    }
  }

  function runNearDuplicateCheck() {
    if (!dataset) return;
    const threshold = Number(nearThreshold);
    try {
      const findings = findNearDuplicates(dataset.records, { threshold });
      setNearDuplicates(findings);
      setReceipts((previous) => [
        ...previous,
        makeReceipt('dataset.near_duplicate', 'PASS', 'DETERMINISTIC_LOCAL', `${findings.length} findings at threshold=${threshold}`),
      ]);
    } catch (error) {
      setNearDuplicates(null);
      setReceipts((previous) => [
        ...previous,
        makeReceipt('dataset.near_duplicate', 'FAIL', 'DETERMINISTIC_LOCAL', error instanceof Error ? error.message : String(error)),
      ]);
    }
  }

  async function sendMessage() {
    const value = prompt.trim();
    if (!value || !inferenceReady || running || !Number.isInteger(maxNewTokens) || maxNewTokens < 1 || maxNewTokens > 64) return;
    const startedAt = new Date().toISOString();
    const request: InferenceRequest = { prompt: value, modelId, maxNewTokens, temperature: 0, seed: 42, backend: 'cpu' };
    setRunning(true);
    setPrompt('');
    setMessages((previous) => [...previous, { role: 'user', text: value }]);
    try {
      const result = await getEngineAdapter().runInference(request);
      setReceipts((previous) => [...previous, makeInferenceReceipt(result, startedAt, request)]);
      setMessages((previous) => [...previous, { role: 'native', text: result.stdout || 'No native output.',
        stderr: result.stderr, execution: `${result.executionStatus ?? result.status} · Answer quality: ${result.qualityStatus ?? 'NOT_EVALUATED'}` }]);
    } catch (error: unknown) {
      const detail = error instanceof Error ? error.message : String(error);
      setMessages((previous) => [...previous, { role: 'system', text: detail }]);
      setReceipts((previous) => [...previous, makeInferenceReceipt({ status: 'FAIL', stdout: '', stderr: detail, exitCode: null }, startedAt, request)]);
    } finally {
      setRunning(false);
    }
  }

  const leakage = dataset ? findCrossSplitLeakage(dataset, assignments) : [];
  const graph = useMemo(() => buildEvidenceGraph(engine, dataset, receipts), [engine, dataset, receipts]);
  const manifest = dataset ? buildDatasetManifest(dataset, assignments, splitSeed) : null;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><BrainCircuit size={19} /></div>
          <div><strong>Niyah Studio</strong><small>LOCAL WORKSTATION</small></div>
        </div>
        <button className="new-chat" aria-label="New chat" onClick={() => setView('chat')}><Plus size={16} /> <span>New chat</span></button>
        <nav>
          {nav.map(([id, Icon, label]) => (
            <button key={id} aria-label={label} className={view === id ? 'active' : ''} onClick={() => setView(id)}>
              <Icon size={16} /><span>{label}</span>{id === 'graph' && <i className="purple-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button aria-label="Settings"><Settings2 size={16} /> <span>Settings</span></button>
          <div className="local-badge"><HardDrive size={14} /> No cloud runtime</div>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div><span className={`status-light ${engine.status === 'ONLINE' ? 'ok' : 'off'}`} />{engine.status}</div>
          <div className="top-actions">
            <button onClick={loadFixture}><FileCheck2 size={15} /> Load test fixture</button>
            <label className="file-button">
              <Upload size={15} /> Import dataset
              <input type="file" accept=".txt,.json,.jsonl,.csv" onChange={(event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) void onFile(file); }} />
            </label>
          </div>
        </header>
        <section className="content">{renderView()}</section>
      </main>

      <aside className="inspector">
        <div className="panel-title"><Gauge size={16} /> Runtime inspector</div>
        <InspectorRow label="Engine" value={engine.status} warn={engine.status !== 'ONLINE'} />
        <InspectorRow label="Repository" value={engine.repository} />
        <InspectorRow label="Commit" value={engine.commit ?? 'UNPINNED'} warn={!engine.commit} mono />
        <InspectorRow label="Executable SHA" value={engine.executableSha256 ?? 'UNKNOWN'} warn={!engine.executableSha256} mono />
        <InspectorRow label="Backend" value={engine.backend ?? 'N/A'} />
        <InspectorRow label="Native inference" value={inferenceReady ? 'AVAILABLE' : 'UNAVAILABLE'} warn={!inferenceReady} />
        <InspectorRow label="Answer quality" value="NOT EVALUATED" warn />
        <div className="separator" />
        <InspectorRow label="Dataset" value={dataset?.sourceName ?? 'NONE'} />
        <InspectorRow label="Format" value={dataset?.format.toUpperCase() ?? 'N/A'} />
        <InspectorRow label="Records" value={dataset ? String(dataset.records.length) : '0'} />
        <InspectorRow label="Evidence receipts" value={String(receipts.length)} />
        <div className="truth-note"><ShieldCheck size={15} /><span>No simulated training, inference, CUDA, benchmark, or terminal output.</span></div>
      </aside>
    </div>
  );

  function renderView() {
    if (view === 'chat') {
      return (
        <div className="chat-view">
          <div className="chat-heading"><h1>Niyah</h1><p>Local native inference. Available models are experimental; successful execution does not establish answer quality.</p></div>
          <div className="inference-controls">
            <label>Verified model<select aria-label="Verified model" value={modelId} disabled={!models.length || running} onChange={(event) => setModelId(event.target.value)}>
              {!models.length && <option value="">No verified native model</option>}
              {models.map((model) => <option key={model.id} value={model.id}>{model.label}</option>)}
            </select></label>
            <label>Output tokens<input aria-label="Output tokens" type="number" min={1} max={64} value={maxNewTokens} disabled={running} onChange={(event) => setMaxNewTokens(Number(event.target.value))} /></label>
            <button onClick={() => void refreshEngine()} disabled={running}>Refresh runtime</button>
          </div>
          <p className="model-scope">{models.find((model) => model.id === modelId)?.scope ?? engine.detail}</p>
          <div className="messages">
            {messages.map((message, index) => (
              <div key={`${message.role}:${index}`} className={`message ${message.role}`}>
                <div className="avatar">{message.role === 'user' ? 'U' : <Bot size={16} />}</div>
                <div className="message-content">
                  {message.execution && <small>{message.execution}</small>}
                  <div dir="auto">{message.text}</div>
                  {message.stderr && <details><summary>Native diagnostics</summary><pre>{message.stderr}</pre></details>}
                </div>
              </div>
            ))}
          </div>
          <div className="composer">
            <textarea
              value={prompt}
              disabled={!inferenceReady || running}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setPrompt(event.target.value)}
              placeholder="Message Niyah…"
              onKeyDown={(event: KeyboardEvent<HTMLTextAreaElement>) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
            />
            <div className="composer-row"><span>{running ? 'Running native inference…' : inferenceReady ? 'Verified CPU runtime · deterministic decoding' : engine.status}</span><button disabled={!inferenceReady || running || !prompt.trim() || !Number.isInteger(maxNewTokens) || maxNewTokens < 1 || maxNewTokens > 64} onClick={() => void sendMessage()} aria-label="Send"><Send size={16} /></button></div>
          </div>
        </div>
      );
    }

    if (view === 'datasets') {
      return (
        <div className="view-stack">
          <ViewTitle icon={<Database />} title="Dataset workbench" subtitle="Deterministic local inspection. Original input remains immutable." />
          {!dataset ? (
            <EmptyState icon={<Database size={34} />} title="No dataset loaded" body="Import UTF-8 TXT, JSONL, JSON, or CSV, or load the explicit test fixture." />
          ) : (
            <>
              <div className="metric-grid">
                <Metric label="Records" value={dataset.records.length} />
                <Metric label="Bytes" value={dataset.byteLength} />
                <Metric label="Exact duplicate groups" value={dataset.exactDuplicateGroups.length} />
                <Metric label="Cross-split leakage" value={leakage.length} danger={leakage.length > 0} />
              </div>

              <div className="control-strip">
                <label>Split seed<input value={splitSeed} onChange={(event: ChangeEvent<HTMLInputElement>) => setSplitSeed(event.target.value)} /></label>
                <button onClick={rebuildSplit}>Rebuild 80/10/10 split</button>
                <label>Near-dup threshold<input inputMode="decimal" value={nearThreshold} onChange={(event: ChangeEvent<HTMLInputElement>) => setNearThreshold(event.target.value)} /></label>
                <button onClick={runNearDuplicateCheck}>Run deterministic near-dup check</button>
              </div>

              <div className="dataset-summary-row">
                <div><span>Format</span><strong>{dataset.format.toUpperCase()}</strong></div>
                <div><span>UTF-8 BOM</span><strong>{dataset.hadUtf8Bom ? 'PRESENT' : 'ABSENT'}</strong></div>
                <div><span>Near duplicates</span><strong>{nearDuplicates === null ? 'NOT_RUN' : nearDuplicates.length}</strong></div>
                <div><span>Manifest</span><strong>{manifest ? 'READY' : 'NOT_RUN'}</strong></div>
              </div>

              <div className="data-card">
                <div className="card-head"><strong>{dataset.sourceName}</strong><code>{dataset.sourceSha256}</code></div>
                <table>
                  <thead><tr><th>#</th><th>ID</th><th>Line</th><th>Bytes</th><th>Arabic</th><th>Latin</th><th>Flags</th></tr></thead>
                  <tbody>
                    {dataset.records.slice(0, 120).map((record) => (
                      <tr key={record.id}>
                        <td>{record.index + 1}</td>
                        <td><code>{record.id}</code></td>
                        <td>{record.sourceLine ?? '—'}</td>
                        <td>{record.byteLength}</td>
                        <td>{(record.arabicRatio * 100).toFixed(1)}%</td>
                        <td>{(record.latinRatio * 100).toFixed(1)}%</td>
                        <td>{record.flags.length ? record.flags.join(', ') : 'PASS'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {nearDuplicates && (
                <div className="data-card">
                  <div className="card-head"><strong>Near-duplicate findings</strong><code>Jaccard token shingles · threshold={nearThreshold}</code></div>
                  {nearDuplicates.length === 0 ? <div className="inline-empty">No findings at this threshold.</div> : (
                    <table><thead><tr><th>Left</th><th>Right</th><th>Similarity</th></tr></thead><tbody>
                      {nearDuplicates.slice(0, 100).map((finding) => (
                        <tr key={`${finding.leftRecordId}:${finding.rightRecordId}`}><td><code>{finding.leftRecordId}</code></td><td><code>{finding.rightRecordId}</code></td><td>{finding.similarity.toFixed(4)}</td></tr>
                      ))}
                    </tbody></table>
                  )}
                </div>
              )}

              {manifest && (
                <details className="manifest-block"><summary>Dataset manifest preview</summary><pre>{JSON.stringify(manifest, null, 2)}</pre></details>
              )}
            </>
          )}
        </div>
      );
    }

    if (view === 'graph') {
      return <div className="view-stack"><ViewTitle icon={<Network />} title="Evidence graph" subtitle="Purple provenance map. Nodes exist only when grounded in current Studio state." /><EvidenceGraph graph={graph} /></div>;
    }

    if (view === 'evidence') {
      return (
        <div className="view-stack">
          <ViewTitle icon={<ShieldCheck />} title="Evidence ledger" subtitle="PASS only follows an executed verification condition." />
          {receipts.length === 0 ? (
            <EmptyState icon={<ShieldCheck size={34} />} title="No evidence yet" body="Run a deterministic dataset operation to create the first receipt." />
          ) : (
            <div className="receipt-list">
              {[...receipts].reverse().map((receipt) => (
                <div className="receipt" key={receipt.id}>
                  <span className={`receipt-status ${receipt.status.toLowerCase()}`}>{receipt.status}</span>
                  <div><strong>{receipt.operation}</strong><small>{receipt.source} · {receipt.startedAt}</small><p>{receipt.detail}</p></div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    const nativeView = view as NativeSurface;
    const nativeTitle: Record<NativeSurface, [React.ReactNode, string, string]> = {
      training: [<Activity key="training" />, 'Training', 'Control the real niyah-train process; charts consume native progress only.'],
      evaluation: [<FlaskConical key="evaluation" />, 'Evaluation', 'Measured native evaluation only; no browser substitute for model metrics.'],
      checkpoints: [<Archive key="checkpoints" />, 'Checkpoints', 'Discovery, hashing, compatibility, and verification remain separate states.'],
      probe: [<Microscope key="probe" />, 'Probe', 'Inspect tokenizer, shard, logits, and trace data through the real native probe.'],
    };
    const item = nativeTitle[nativeView];
    if (item) return <div className="view-stack"><ViewTitle icon={item[0]} title={item[1]} subtitle={item[2]} /><NativeContractView surface={nativeView} engine={engine} /></div>;
    return null;
  }
}

function InspectorRow({ label, value, warn = false, mono = false }: { label: string; value: string; warn?: boolean; mono?: boolean }) {
  return <div className="inspector-row"><span>{label}</span><strong className={`${warn ? 'warn' : ''} ${mono ? 'mono' : ''}`}>{value}</strong></div>;
}

function ViewTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return <div className="view-title"><div className="title-icon">{icon}</div><div><h2>{title}</h2><p>{subtitle}</p></div></div>;
}

function Metric({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) {
  return <div className="metric"><span>{label}</span><strong className={danger ? 'danger' : ''}>{value}</strong></div>;
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <div className="empty">{icon}<h3>{title}</h3><p>{body}</p></div>;
}

export function NativeOfflineReference() {
  return (
    <div className="offline-card">
      <SquareTerminal size={28} />
      <h3>ENGINE_OFFLINE</h3>
      <p>This web preview will not simulate native behavior. Export locally and connect a pinned Niyah.Engine artifact.</p>
      <div className="contract-line"><CircleDot size={14} /> Fail-closed native boundary</div>
      <div className="contract-line"><GitBranch size={14} /> Grar00t/Niyah.Engine remains source of truth</div>
    </div>
  );
}
