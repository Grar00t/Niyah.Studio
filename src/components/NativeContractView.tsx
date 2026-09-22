import { CircleDot, GitBranch, SquareTerminal } from 'lucide-react';
import type { EngineIdentity } from '../engine/EngineAdapter';

export type NativeSurface = 'training' | 'evaluation' | 'checkpoints' | 'probe';

const contracts: Record<NativeSurface, { title: string; executable: string; description: string; required: string[]; evidence: string[] }> = {
  training: {
    title: 'Training',
    executable: 'niyah-train',
    description: 'Native new/resume training. Progress must come from the actual trainer stderr contract.',
    required: [
      'tokenizer', 'shard(s)', 'checkpoint/cursor output', 'updates', 'batch-size', 'accumulation-steps',
      'new mode: model/data seeds + model config + AdamW config',
    ],
    evidence: ['process exit code', 'raw stdout/stderr', 'update=I/N loss=L lines', 'checkpoint SHA-256', 'cursor SHA-256'],
  },
  evaluation: {
    title: 'Evaluation',
    executable: 'niyah eval',
    description: 'Held-out evaluation through the native engine. No browser evaluator substitutes for model metrics.',
    required: ['tokenizer', 'checkpoint', 'heldout', 'format text|shard', 'optional sequence-length'],
    evidence: ['process exit code', 'raw stdout/stderr', 'input artifact hashes', 'measured native output'],
  },
  checkpoints: {
    title: 'Checkpoints',
    executable: 'filesystem + Niyah.Engine validation',
    description: 'Checkpoint discovery is not verification. Identity, compatibility, and provenance stay separate.',
    required: ['checkpoint path', 'tokenizer identity', 'engine revision'],
    evidence: ['file exists', 'SHA-256', 'compatibility check', 'producer run receipt'],
  },
  probe: {
    title: 'Probe',
    executable: 'niyah_probe',
    description: 'Inspect tokenizer/shard or checkpoint next-token behavior through the native probe executable.',
    required: ['tokenizer', 'optional shard', 'optional checkpoint + prompt', 'optional topk', 'optional trace-steps'],
    evidence: ['process exit code', 'raw probe output', 'artifact hashes'],
  },
};

export function NativeContractView({ surface, engine }: { surface: NativeSurface; engine: EngineIdentity }) {
  const contract = contracts[surface];
  const online = engine.status === 'ONLINE';
  return (
    <div className="native-contract-grid">
      <section className="native-contract-panel">
        <div className="native-contract-heading">
          <SquareTerminal size={20} />
          <div><strong>{contract.executable}</strong><span>repository-source contract snapshot</span></div>
        </div>
        <p>{contract.description}</p>
        <h4>Required contract</h4>
        <ul>{contract.required.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>
      <section className="native-contract-panel evidence-requirements">
        <div className="native-contract-heading">
          <GitBranch size={20} />
          <div><strong>Evidence gate</strong><span>no inferred PASS</span></div>
        </div>
        <ul>{contract.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
        <div className={`engine-gate ${online ? 'online' : 'offline'}`}>
          <CircleDot size={14} />
          {online ? 'Native adapter reports ONLINE. Execution still requires mapped capability.' : `${engine.status}: native execution disabled in this environment.`}
        </div>
        <button disabled={!online}>Run native operation</button>
      </section>
    </div>
  );
}
