use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EngineStatus {
    status: &'static str,
    repository: &'static str,
    commit: Option<&'static str>,
    executable_sha256: Option<&'static str>,
    backend: Option<&'static str>,
    detail: &'static str,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct EngineCapabilities {
    prepare: bool,
    shard: bool,
    training: bool,
    evaluation: bool,
    inference: bool,
    probe: bool,
    cancellation: bool,
}

#[tauri::command]
fn engine_status() -> EngineStatus {
    EngineStatus {
        status: "UNPINNED",
        repository: "Grar00t/Niyah.Engine",
        commit: None,
        executable_sha256: None,
        backend: None,
        detail: "No verified native engine artifact is pinned in contracts/engine.lock.json.",
    }
}

#[tauri::command]
fn engine_capabilities() -> EngineCapabilities {
    EngineCapabilities {
        prepare: false,
        shard: false,
        training: false,
        evaluation: false,
        inference: false,
        probe: false,
        cancellation: false,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![engine_status, engine_capabilities])
        .run(tauri::generate_context!())
        .expect("error while running Niyah Studio");
}
