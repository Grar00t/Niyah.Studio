import { useEffect, useMemo, useState } from 'react';
import {
  Activity, Archive, BarChart3, Bot, Boxes, BrainCircuit, ChevronRight, CircleDot,
  Database, FileCheck2, FlaskConical, Gauge, GitBranch, HardDrive, MessageSquare,
  Network, Play, Plus, Search, Send, Settings2, ShieldCheck, SquareTerminal, Upload,
} from 'lucide-react';
import { analyzeTextDataset, assignDeterministicSplits, findCrossSplitLeakage, type DatasetAnalysis, type SplitAssignment } from '../datasets/core';
import { getEngineAdapter } from '../engine/adapter';
import type { EngineIdentity } from '../engine/EngineAdapter';
import { makeReceipt, type EvidenceReceipt } from '../evidence/types';
import { buildEvidenceGraph } from '../graph/model';
import { EvidenceGraph } from '../components/EvidenceGraph';

const nav = [
  ['chat', MessageSquare, 'Chat'],
  ['datasets', Database, 'Datasets'],
  ['training', Activity, 'Training'],
  ['evaluation', FlaskConical, 'Evaluation'],
  ['checkpoints', Archive, 'Checkpoints'],
  ['graph', Network, 'Evidence Graph'],
  ['evidence', ShieldCheck, 'Evidence'],
] as const;

type ViewId = (typeof nav)[number][0];

const fixture = `User: What is 2+2?\nAssistant: 4\n\nUser: What is the capital of Saudi Arabia?\nAssistant: Riyadh\n\nUser: What is 2+2?\nAssistant: 4\n\nمرحبا بالعالم\n\nshort`;

export function App() {
  const [view, setView] = useState<ViewId>('chat');
  const [engine, setEngine] = useState<EngineIdentity>({
    status: 'ENGINE_OFFLINE', repository: 'Grar00t/Niyah.Engine', commit: null, executableSha256: null, backend: null, detail: 'Checking…',
  });
  const [dataset, setDataset] = useState<DatasetAnalysis | null>(null);
  const [assignments, setAssignments] = useState<SplitAssignment[]>([]);
  const [receipts, setReceipts] = useState<EvidenceReceipt[]>([]);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'system'; text: string }>>([
    { role: 'system', text: 'Native Niyah.Engine is offline in web preview. Dataset tooling remains available locally.' },
  ]);

  useEffect(() => { void getEngineAdapter().getIdentity().then(setEngine); }, []);

  async function loadBytes(name: string, bytes: Uint8Array, source: 'TEST_FIXTURE' | 'USER_ACTION') {
    try {
      const result = await analyzeTextDataset(name, bytes);
      setDataset(result);
      const split = assignDeterministicSplits(result.records.map((r) => r.id), 'niyah-studio-seed-1');
      setAssignments(split);
      const r = makeReceipt('dataset.analyze', 'PASS', source === 'TEST_FIXTURE' ? 'TEST_FIXTURE' : 'DETERMINISTIC_LOCAL', `${result.records.length} records analyzed from ${name}`);
      r.inputSha256 = [result.sourceSha256];
      setReceipts((prev) => [...prev, r]);
    } catch (error) {
      setReceipts((prev) => [...prev, makeReceipt('dataset.analyze', 'FAIL', 'DETERMINISTIC_LOCAL', error instanceof Error ? error.message : String(error))]);
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

  async function sendMessage() {
    const value = prompt.trim();
    if (!value) return;
    setPrompt('');
    setMessages((prev) => [...prev, { role: 'user', text: value }]);
    const result = await getEngineAdapter().runInference({
      prompt: value, checkpointPath: '', tokenizerPath: '', maxNewTokens: 128, temperature: 0, seed: 42, backend: 'cpu',
    });
    setReceipts((prev) => [...prev, makeReceipt('engine.inference', result.status === 'FAIL' ? 'FAIL' : 'UNSUPPORTED', 'NATIVE_PROCESS', result.stderr || result.stdout)]);
    setMessages((prev) => [...prev, { role: 'system', text: result.stderr || result.stdout || 'ENGINE_OFFLINE' }]);
  }

  const leakage = dataset ? findCrossSplitLeakage(dataset, assignments) : [];
  const graph = useMemo(() => buildEvidenceGraph(engine, dataset, receipts), [engine, dataset, receipts]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark"><BrainCircuit size={19} /></div><div><strong>Niyah Studio</strong><small>LOCAL WORKSTATION</small></div></div>
        <button className="new-chat" onClick={() => setView('chat')}><Plus size={16} /> New chat</button>
        <nav>{nav.map(([id, Icon, label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}><Icon size={16} /><span>{label}</span>{id === 'graph' && <i className="purple-dot" />}</button>)}</nav>
        <div className="sidebar-bottom"><button><Settings2 size={16} /> Settings</button><div className="local-badge"><HardDrive size={14} /> No cloud runtime</div></div>
      </aside>

      <main className="workspace">
        <header className="topbar"><div><span className={`status-light ${engine.status === 'ONLINE' ? 'ok' : 'off'}`} />{engine.status}</div><div className="top-actions"><button onClick={loadFixture}><FileCheck2 size={15} /> Load test fixture</button><label className="file-button"><Upload size={15} /> Import dataset<input type="file" accept=".txt,.json,.jsonl,.csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); }} /></label></div></header>
        <section className="content">{renderView()}</section>
      </main>

      <aside className="inspector">
        <div className="panel-title"><Gauge size={16} /> Runtime inspector</div>
        <InspectorRow label="Engine" value={engine.status} warn={engine.status !== 'ONLINE'} />
        <InspectorRow label="Repository" value={engine.repository} />
        <InspectorRow label="Commit" value={engine.commit ?? 'UNPINNED'} warn={!engine.commit} mono />
        <InspectorRow label="Executable SHA" value={engine.executableSha256 ?? 'UNKNOWN'} warn={!engine.executableSha256} mono />
        <InspectorRow label="Backend" value={engine.backend ?? 'N/A'} />
        <div className="separator" />
        <InspectorRow label="Dataset" value={dataset?.sourceName ?? 'NONE'} />
        <InspectorRow label="Records" value={dataset ? String(dataset.records.length) : '0'} />
        <InspectorRow label="Evidence receipts" value={String(receipts.length)} />
        <div className="truth-note"><ShieldCheck size={15} /><span>No simulated training, inference, CUDA, or benchmark output.</span></div>
      </aside>
    </div>
  );

  function renderView() {
    if (view === 'chat') return (
      <div className="chat-view">
        <div className="chat-heading"><h1>Niyah</h1><p>Conversation surface for the real native engine. Web preview fails closed.</p></div>
        <div className="messages">{messages.map((m, i) => <div key={i} className={`message ${m.role}`}><div className="avatar">{m.role === 'user' ? 'U' : <Bot size={16} />}</div><div>{m.text}</div></div>)}</div>
        <div className="composer"><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Message Niyah…" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} /><div className="composer-row"><span>Native output only</span><button onClick={() => void sendMessage()} aria-label="Send"><Send size={16} /></button></div></div>
      </div>
    );

    if (view === 'datasets') return (
      <div className="view-stack"><ViewTitle icon={<Database />} title="Dataset workbench" subtitle="Deterministic local inspection. Originals remain untouched." />
        {!dataset ? <EmptyState icon={<Database size={34} />} title="No dataset loaded" body="Import a UTF-8 dataset or load the explicit test fixture." /> : <>
          <div className="metric-grid"><Metric label="Records" value={dataset.records.length} /><Metric label="Bytes" value={dataset.byteLength} /><Metric label="Exact duplicate groups" value={dataset.exactDuplicateGroups.length} /><Metric label="Cross-split leakage" value={leakage.length} danger={leakage.length > 0} /></div>
          <div className="data-card"><div className="card-head"><strong>{dataset.sourceName}</strong><code>{dataset.sourceSha256}</code></div><table><thead><tr><th>#</th><th>ID</th><th>Bytes</th><th>Arabic</th><th>Latin</th><th>Flags</th></tr></thead><tbody>{dataset.records.slice(0, 100).map((r) => <tr key={`${r.id}:${r.index}`}><td>{r.index + 1}</td><td><code>{r.id}</code></td><td>{r.byteLength}</td><td>{(r.arabicRatio * 100).toFixed(1)}%</td><td>{(r.latinRatio * 100).toFixed(1)}%</td><td>{r.flags.length ? r.flags.join(', ') : 'PASS'}</td></tr>)}</tbody></table></div>
        </>}
      </div>
    );

    if (view === 'graph') return <div className="view-stack"><ViewTitle icon={<Network />} title="Evidence graph" subtitle="Obsidian-inspired local relationship map. Every node comes from current Studio state." /><EvidenceGraph graph={graph} /></div>;
    if (view === 'evidence') return <div className="view-stack"><ViewTitle icon={<ShieldCheck />} title="Evidence ledger" subtitle="PASS only follows an executed verification condition." />{receipts.length === 0 ? <EmptyState icon={<ShieldCheck size={34} />} title="No evidence yet" body="Run a deterministic dataset operation to create the first receipt." /> : <div className="receipt-list">{[...receipts].reverse().map((r) => <div className="receipt" key={r.id}><span className={`receipt-status ${r.status.toLowerCase()}`}>{r.status}</span><div><strong>{r.operation}</strong><small>{r.source} · {r.startedAt}</small><p>{r.detail}</p></div></div>)}</div>}</div>;

    const nativeViews: Record<string, [React.ReactNode, string, string]> = {
      training: [<Activity key="i" />, 'Training', 'Training will consume actual niyah-train stderr/stdout only.'],
      evaluation: [<BarChart3 key="i" />, 'Evaluation', 'Native loss/perplexity and baselines only; no browser substitute.'],
      checkpoints: [<Archive key="i" />, 'Checkpoints', 'Existence, hash, compatibility, and verification are separate states.'],
    };
    const item = nativeViews[view];
    if (item) return <div className="view-stack"><ViewTitle icon={item[0]} title={item[1]} subtitle={item[2]} /><NativeOfflineCard title={item[1]} /></div>;
    return null;
  }
}

function InspectorRow({ label, value, warn = false, mono = false }: { label: string; value: string; warn?: boolean; mono?: boolean }) {
  return <div className="inspector-row"><span>{label}</span><strong className={`${warn ? 'warn' : ''} ${mono ? 'mono' : ''}`}>{value}</strong></div>;
}
function ViewTitle({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) { return <div className="view-title"><div className="title-icon">{icon}</div><div><h2>{title}</h2><p>{subtitle}</p></div></div>; }
function Metric({ label, value, danger = false }: { label: string; value: string | number; danger?: boolean }) { return <div className="metric"><span>{label}</span><strong className={danger ? 'danger' : ''}>{value}</strong></div>; }
function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) { return <div className="empty">{icon}<h3>{title}</h3><p>{body}</p></div>; }
function NativeOfflineCard({ title }: { title: string }) { return <div className="offline-card"><SquareTerminal size={28} /><h3>{title}: ENGINE_OFFLINE</h3><p>This web preview will not simulate native behavior. Export locally and connect the pinned Niyah.Engine bridge.</p><div className="contract-line"><CircleDot size={14} /> Fail-closed native boundary</div><div className="contract-line"><GitBranch size={14} /> Grar00t/Niyah.Engine remains source of truth</div><div className="contract-line"><Boxes size={14} /> Tauri integration prepared as a separate layer</div></div>; }
