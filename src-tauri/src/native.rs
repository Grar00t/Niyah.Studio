//! The frontend selects a model ID, never an executable, checkpoint path, or shell.
//! A zero exit status proves execution only. Model quality is always unevaluated here.
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::BTreeMap,
    fs::File,
    io::Read,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    sync::atomic::{AtomicBool, Ordering},
    thread,
    time::{Duration, Instant},
};

const REPOSITORY: &str = "Grar00t/Niyah.Engine";
const MAX_OUTPUT_BYTES: usize = 64 * 1024;
const INFERENCE_TIMEOUT: Duration = Duration::from_secs(120);
static INFERENCE_ACTIVE: AtomicBool = AtomicBool::new(false);

#[derive(Deserialize)]
struct EngineLock {
    schema_version: u32,
    repository: String,
    commit: Option<String>,
    platform: Option<String>,
    artifacts: BTreeMap<String, Artifact>,
}

#[derive(Clone, Deserialize)]
#[serde(deny_unknown_fields)]
struct Artifact {
    path: Option<String>,
    sha256: Option<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ModelConfig {
    id: String,
    label: String,
    scope: String,
    checkpoint: Artifact,
    tokenizer: Artifact,
    prompt_prefix: String,
    prompt_suffix: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineIdentity {
    pub status: &'static str,
    repository: &'static str,
    commit: Option<String>,
    executable_sha256: Option<String>,
    backend: Option<&'static str>,
    detail: String,
}

impl EngineIdentity {
    pub fn error(detail: String) -> Self {
        Self {
            status: "ERROR",
            repository: REPOSITORY,
            commit: None,
            executable_sha256: None,
            backend: None,
            detail,
        }
    }
}

#[derive(Default, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineCapabilities {
    prepare: bool,
    shard: bool,
    training: bool,
    evaluation: bool,
    inference: bool,
    probe: bool,
    cancellation: bool,
}

#[derive(Debug, Serialize)]
pub struct ModelInfo {
    id: String,
    label: String,
    scope: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct InferenceRequest {
    prompt: String,
    model_id: String,
    max_new_tokens: u32,
    temperature: f64,
    seed: u32,
    backend: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RunIdentity {
    repository: &'static str,
    commit: String,
    executable_sha256: String,
    model_id: String,
    checkpoint_sha256: String,
    tokenizer_sha256: String,
    backend: &'static str,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NativeResult {
    pub status: &'static str,
    pub stdout: String,
    pub stderr: String,
    exit_code: Option<i32>,
    execution_status: &'static str,
    quality_status: &'static str,
    duration_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    identity: Option<RunIdentity>,
}

impl NativeResult {
    pub fn rejected(detail: String) -> Self {
        Self {
            status: "FAIL",
            stdout: String::new(),
            stderr: detail,
            exit_code: None,
            execution_status: "REJECTED",
            quality_status: "NOT_EVALUATED",
            duration_ms: 0,
            identity: None,
        }
    }
}

struct VerifiedEngine {
    path: PathBuf,
    sha256: String,
    commit: String,
}

fn valid_hex(value: &str, len: usize) -> bool {
    value.len() == len
        && value
            .bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

fn verify_artifact(artifact: &Artifact) -> Result<(PathBuf, String), String> {
    let path = artifact
        .path
        .as_ref()
        .ok_or("UNPINNED: artifact path is missing")?;
    let expected = artifact
        .sha256
        .as_ref()
        .filter(|s| valid_hex(s, 64))
        .ok_or("UNPINNED: valid SHA256 is missing")?;
    let path = Path::new(path);
    if !path.is_absolute() {
        return Err("UNPINNED: artifact path must be absolute".into());
    }
    let mut file =
        File::open(path).map_err(|e| format!("Artifact unavailable: {}: {e}", path.display()))?;
    if !file.metadata().map_err(|e| e.to_string())?.is_file() {
        return Err(format!(
            "Artifact is not a regular file: {}",
            path.display()
        ));
    }
    let mut hash = Sha256::new();
    let mut buffer = [0u8; 65536];
    loop {
        let count = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        hash.update(&buffer[..count]);
    }
    let actual = format!("{:x}", hash.finalize());
    if &actual != expected {
        return Err(format!(
            "SHA256 mismatch: {} expected {expected}, got {actual}",
            path.display()
        ));
    }
    Ok((path.to_owned(), actual))
}

fn model_configs() -> Result<Vec<ModelConfig>, String> {
    serde_json::from_str(include_str!("../models.local.json"))
        .map_err(|e| format!("Invalid model catalog: {e}"))
}

fn verified_engine() -> Result<VerifiedEngine, String> {
    if !cfg!(all(windows, target_arch = "x86_64")) {
        return Err("UNSUPPORTED: this local pin is Windows x86_64 CPU only".into());
    }
    let lock: EngineLock = serde_json::from_str(include_str!("../../contracts/engine.lock.json"))
        .map_err(|e| format!("Invalid engine lock: {e}"))?;
    if lock.schema_version != 1
        || lock.repository != REPOSITORY
        || lock.platform.as_deref() != Some("windows-x86_64-cpu-local")
    {
        return Err("UNPINNED: unsupported engine lock identity/platform".into());
    }
    let commit = lock
        .commit
        .filter(|s| valid_hex(s, 40))
        .ok_or("UNPINNED: engine source commit missing")?;
    let artifact = lock
        .artifacts
        .get("niyah")
        .ok_or("UNPINNED: niyah artifact missing")?;
    let (path, sha256) = verify_artifact(artifact)?;
    let mut command = native_command(&path);
    command.arg("--help");
    let help = run_bounded(command, Duration::from_secs(5))?;
    if help.exit_code != Some(0)
        || help.timed_out
        || help.truncated
        || !help
            .stdout
            .contains("niyah run --tokenizer TOK --checkpoint CKPT --prompt TEXT")
        || !help.stdout.contains("--prompt-prefix TEXT")
    {
        return Err("Verified artifact did not pass the bounded native CLI contract check".into());
    }
    Ok(VerifiedEngine {
        path,
        sha256,
        commit,
    })
}

pub fn engine_status() -> EngineIdentity {
    match verified_engine() {
        Ok(engine) => EngineIdentity {
            status: "ONLINE", repository: REPOSITORY, commit: Some(engine.commit),
            executable_sha256: Some(engine.sha256), backend: Some("cpu"),
            detail: "SHA256 and native CLI contract verified. Inference is available only for separately verified local models; process success is not a model-quality gate.".into(),
        },
        Err(error) => {
            let mut result = EngineIdentity::error(error);
            if result.detail.starts_with("UNPINNED:") { result.status = "UNPINNED"; }
            if result.detail.starts_with("UNSUPPORTED:") { result.status = "ENGINE_OFFLINE"; }
            result
        }
    }
}

fn verified_models() -> Vec<ModelInfo> {
    model_configs()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|model| {
            verify_artifact(&model.checkpoint).ok()?;
            verify_artifact(&model.tokenizer).ok()?;
            Some(ModelInfo {
                id: model.id,
                label: model.label,
                scope: model.scope,
            })
        })
        .collect()
}

pub fn engine_models() -> Vec<ModelInfo> {
    if verified_engine().is_err() {
        return Vec::new();
    }
    verified_models()
}

pub fn engine_capabilities() -> EngineCapabilities {
    EngineCapabilities {
        inference: verified_engine().is_ok() && !verified_models().is_empty(),
        ..Default::default()
    }
}

fn validate_request(request: &InferenceRequest) -> Result<(), String> {
    if request.backend != "cpu" {
        return Err("UNSUPPORTED: this verified binary implements CPU inference only".into());
    }
    if request.prompt.trim().is_empty()
        || request.prompt.len() > 4096
        || request.prompt.contains('\0')
    {
        return Err("Prompt must contain 1–4096 UTF-8 bytes and no NUL".into());
    }
    if !(1..=64).contains(&request.max_new_tokens) {
        return Err("maxNewTokens must be in 1..=64".into());
    }
    if !request.temperature.is_finite() || !(0.0..=2.0).contains(&request.temperature) {
        return Err("temperature must be finite and in 0..=2".into());
    }
    Ok(())
}

struct ActiveGuard;
impl Drop for ActiveGuard {
    fn drop(&mut self) {
        INFERENCE_ACTIVE.store(false, Ordering::Release);
    }
}

pub fn engine_inference(request: InferenceRequest) -> NativeResult {
    let started = Instant::now();
    if let Err(error) = validate_request(&request) {
        return NativeResult::rejected(error);
    }
    if INFERENCE_ACTIVE
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .is_err()
    {
        let mut result = NativeResult::rejected("One native inference is already active".into());
        result.execution_status = "BUSY";
        return result;
    }
    let _active = ActiveGuard;
    let result = (|| -> Result<NativeResult, String> {
        let model = model_configs()?
            .into_iter()
            .find(|model| model.id == request.model_id)
            .ok_or("Unknown modelId; only native-listed models are accepted")?;
        let engine = verified_engine()?;
        let (checkpoint, checkpoint_sha256) = verify_artifact(&model.checkpoint)?;
        let (tokenizer, tokenizer_sha256) = verify_artifact(&model.tokenizer)?;
        let engine_artifact = Artifact {
            path: Some(engine.path.to_string_lossy().into_owned()),
            sha256: Some(engine.sha256.clone()),
        };
        let identity = RunIdentity {
            repository: REPOSITORY,
            commit: engine.commit,
            executable_sha256: engine.sha256,
            model_id: model.id,
            checkpoint_sha256,
            tokenizer_sha256,
            backend: "cpu",
        };
        let mut command = native_command(&engine.path);
        command
            .arg("run")
            .arg("--tokenizer")
            .arg(tokenizer)
            .arg("--checkpoint")
            .arg(checkpoint)
            .arg("--prompt")
            .arg(&request.prompt)
            .arg("--max-new-tokens")
            .arg(request.max_new_tokens.to_string())
            .arg("--temperature")
            .arg(request.temperature.to_string())
            .arg("--seed")
            .arg(request.seed.to_string())
            .arg("--backend")
            .arg("cpu");
        if !model.prompt_prefix.is_empty() {
            command.arg("--prompt-prefix").arg(model.prompt_prefix);
        }
        if !model.prompt_suffix.is_empty() {
            command.arg("--prompt-suffix").arg(model.prompt_suffix);
        }
        let output = run_bounded(command, INFERENCE_TIMEOUT)?;
        let execution_status = if output.timed_out {
            "TIMED_OUT"
        } else if output.exit_code == Some(0) && !output.truncated {
            "SUCCEEDED"
        } else {
            "FAILED"
        };
        let mut stderr = output.stderr;
        if output.timed_out {
            stderr.push_str("\nNative process terminated after the fixed 120-second timeout.");
        }
        if output.truncated {
            stderr.push_str(
                "\nNative output exceeded the 64 KiB per-stream limit and was truncated.",
            );
        }
        let mut result = NativeResult {
            status: if execution_status == "SUCCEEDED" {
                "PASS"
            } else {
                "FAIL"
            },
            stdout: output.stdout,
            stderr,
            exit_code: output.exit_code,
            execution_status,
            quality_status: "NOT_EVALUATED",
            duration_ms: started.elapsed().as_millis() as u64,
            identity: Some(identity),
        };
        verify_after_execution(
            &mut result,
            &[&engine_artifact, &model.tokenizer, &model.checkpoint],
        );
        result.duration_ms = started.elapsed().as_millis() as u64;
        Ok(result)
    })();
    result.unwrap_or_else(|error| {
        let mut rejected = NativeResult::rejected(error);
        rejected.duration_ms = started.elapsed().as_millis() as u64;
        rejected
    })
}

fn verify_after_execution(result: &mut NativeResult, artifacts: &[&Artifact]) {
    for artifact in artifacts {
        if let Err(error) = verify_artifact(artifact) {
            result.status = "FAIL";
            result.execution_status = "FAILED";
            result.stderr.push_str(&format!(
                "\nPost-execution identity verification failed: {error}"
            ));
        }
    }
}

fn native_command(path: &Path) -> Command {
    let mut command = Command::new(path);
    if let Some(parent) = path.parent() {
        command.current_dir(parent);
    }
    command
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW; no shell is used.
    }
    command
}

struct ProcessOutput {
    stdout: String,
    stderr: String,
    exit_code: Option<i32>,
    timed_out: bool,
    truncated: bool,
}

fn capture(mut pipe: impl Read) -> Result<(String, bool), String> {
    let mut kept = Vec::new();
    let mut buffer = [0u8; 4096];
    let mut truncated = false;
    loop {
        let count = pipe.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        let keep = count.min(MAX_OUTPUT_BYTES - kept.len());
        kept.extend_from_slice(&buffer[..keep]);
        truncated |= keep < count; // Continue draining both pipes to prevent subprocess deadlock.
    }
    let text =
        String::from_utf8(kept).map_err(|_| "Native output is not valid UTF-8".to_string())?;
    Ok((text, truncated))
}

fn run_bounded(mut command: Command, timeout: Duration) -> Result<ProcessOutput, String> {
    let mut child = command
        .spawn()
        .map_err(|e| format!("Native spawn failed: {e}"))?;
    let stdout = child.stdout.take().ok_or("Native stdout pipe missing")?;
    let stderr = child.stderr.take().ok_or("Native stderr pipe missing")?;
    let out_reader = thread::spawn(move || capture(stdout));
    let err_reader = thread::spawn(move || capture(stderr));
    let started = Instant::now();
    let mut timed_out = false;
    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break Ok(status),
            Ok(None) if started.elapsed() < timeout => thread::sleep(Duration::from_millis(20)),
            Ok(None) => {
                timed_out = true;
                let _ = child.kill();
                break child.wait().map_err(|e| e.to_string());
            }
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                break Err(error.to_string());
            }
        }
    };
    let (stdout, out_truncated) = out_reader.join().map_err(|_| "stdout reader panicked")??;
    let (stderr, err_truncated) = err_reader.join().map_err(|_| "stderr reader panicked")??;
    Ok(ProcessOutput {
        stdout,
        stderr,
        exit_code: status?.code(),
        timed_out,
        truncated: out_truncated || err_truncated,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request() -> InferenceRequest {
        InferenceRequest {
            prompt: "السلام عليكم".into(),
            model_id: "v10-sft-canary".into(),
            max_new_tokens: 16,
            temperature: 0.0,
            seed: 0,
            backend: "cpu".into(),
        }
    }

    #[test]
    fn frontend_cannot_supply_paths_or_unbounded_parameters() {
        let json = r#"{"prompt":"hello","modelId":"v10-sft-canary","maxNewTokens":4,"temperature":0,"seed":0,"backend":"cpu","checkpointPath":"C:/other.ckpt"}"#;
        assert!(serde_json::from_str::<InferenceRequest>(json).is_err());
        for tokens in [0, 65, u32::MAX] {
            let mut r = request();
            r.max_new_tokens = tokens;
            assert!(validate_request(&r).is_err());
        }
        for temperature in [f64::NAN, f64::INFINITY, -1.0, 2.1] {
            let mut r = request();
            r.temperature = temperature;
            assert!(validate_request(&r).is_err());
        }
        for prompt in ["".to_string(), " ".into(), "x\0x".into(), "ع".repeat(2049)] {
            let mut r = request();
            r.prompt = prompt;
            assert!(validate_request(&r).is_err());
        }
        let mut r = request();
        r.backend = "cuda".into();
        assert!(validate_request(&r).is_err());
        let mut r = request();
        r.model_id = "C:/malicious.exe".into();
        assert_eq!(engine_inference(r).execution_status, "REJECTED");
        assert!(validate_request(&request()).is_ok());
    }

    #[test]
    fn artifact_bytes_must_match_pin() {
        let path = std::env::temp_dir().join(format!("niyah-pin-test-{}", std::process::id()));
        std::fs::write(&path, b"abc").unwrap();
        let mut artifact = Artifact {
            path: Some(path.to_string_lossy().into()),
            sha256: Some("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad".into()),
        };
        assert!(verify_artifact(&artifact).is_ok());
        std::fs::write(&path, b"abd").unwrap();
        assert!(verify_artifact(&artifact)
            .unwrap_err()
            .contains("SHA256 mismatch"));
        artifact.sha256 = None;
        assert!(verify_artifact(&artifact).unwrap_err().contains("UNPINNED"));
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn capture_limits_memory_and_rejects_invalid_utf8() {
        let (text, truncated) =
            capture(std::io::Cursor::new(vec![b'x'; MAX_OUTPUT_BYTES + 100])).unwrap();
        assert_eq!(text.len(), MAX_OUTPUT_BYTES);
        assert!(truncated);
        assert!(capture(std::io::Cursor::new(vec![0xff])).is_err());
    }

    #[test]
    fn post_execution_change_fails_without_discarding_native_output() {
        let path = std::env::temp_dir().join(format!("niyah-post-pin-test-{}", std::process::id()));
        std::fs::write(&path, b"abc").unwrap();
        let artifact = Artifact {
            path: Some(path.to_string_lossy().into()),
            sha256: Some("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad".into()),
        };
        assert!(verify_artifact(&artifact).is_ok());
        let mut result = NativeResult::rejected(String::new());
        result.status = "PASS";
        result.execution_status = "SUCCEEDED";
        result.stdout = "actual captured output".into();
        result.stderr = "actual captured diagnostic".into();
        result.exit_code = Some(0);
        std::fs::write(&path, b"changed during execution").unwrap();
        verify_after_execution(&mut result, &[&artifact]);
        assert_eq!(result.status, "FAIL");
        assert_eq!(result.execution_status, "FAILED");
        assert_eq!(result.stdout, "actual captured output");
        assert!(result.stderr.starts_with("actual captured diagnostic"));
        assert!(result
            .stderr
            .contains("Post-execution identity verification failed"));
        assert_eq!(result.exit_code, Some(0));
        assert_eq!(result.quality_status, "NOT_EVALUATED");
        std::fs::remove_file(path).unwrap();
    }

    #[test]
    fn process_fixture() {
        match std::env::var("NIYAH_TEST_PROCESS").as_deref() {
            Ok("timeout") => thread::sleep(Duration::from_secs(20)),
            Ok("output") => {
                println!("controlled stdout fixture");
                eprintln!("controlled stderr fixture");
            }
            _ => (),
        }
    }

    #[test]
    fn bounded_process_captures_both_streams_and_terminates_timeout() {
        let executable = std::env::current_exe().unwrap();
        let mut command = native_command(&executable);
        command
            .args(["--exact", "native::tests::process_fixture", "--nocapture"])
            .env("NIYAH_TEST_PROCESS", "output");
        let output = run_bounded(command, Duration::from_secs(5)).unwrap();
        assert_eq!(output.exit_code, Some(0));
        assert!(output.stdout.contains("controlled stdout fixture"));
        assert!(output.stderr.contains("controlled stderr fixture"));
        let mut command = native_command(&executable);
        command
            .args(["--exact", "native::tests::process_fixture", "--nocapture"])
            .env("NIYAH_TEST_PROCESS", "timeout");
        let started = Instant::now();
        let output = run_bounded(command, Duration::from_millis(100)).unwrap();
        assert!(output.timed_out);
        assert!(started.elapsed() < Duration::from_secs(5));
    }
}
