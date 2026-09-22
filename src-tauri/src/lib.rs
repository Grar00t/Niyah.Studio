use serde::Serialize;
use sha2::{Digest, Sha256};
use std::{fs::File, io::Read, path::PathBuf};

#[derive(Serialize)]
struct EngineStatus {
    status: &'static str,
    repository: &'static str,
    detail: &'static str,
}

#[tauri::command]
fn engine_status() -> EngineStatus {
    EngineStatus {
        status: "UNPINNED",
        repository: "Grar00t/Niyah.Engine",
        detail: "No verified native engine artifact is pinned in this base scaffold.",
    }
}

#[tauri::command]
fn sha256_file(path: String) -> Result<String, String> {
    let path = PathBuf::from(path);
    let canonical = path.canonicalize().map_err(|e| format!("canonicalize failed: {e}"))?;
    if !canonical.is_file() {
        return Err("path is not a regular file".into());
    }
    let mut file = File::open(&canonical).map_err(|e| format!("open failed: {e}"))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];
    loop {
        let n = file.read(&mut buffer).map_err(|e| format!("read failed: {e}"))?;
        if n == 0 { break; }
        hasher.update(&buffer[..n]);
    }
    Ok(hex::encode(hasher.finalize()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![engine_status, sha256_file])
        .run(tauri::generate_context!())
        .expect("error while running Niyah Studio");
}
