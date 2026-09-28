mod native;

use native::{EngineCapabilities, EngineIdentity, InferenceRequest, ModelInfo, NativeResult};

#[tauri::command]
async fn engine_status() -> EngineIdentity {
    tauri::async_runtime::spawn_blocking(native::engine_status)
        .await
        .unwrap_or_else(|error| {
            EngineIdentity::error(format!("Native status task failed: {error}"))
        })
}

#[tauri::command]
async fn engine_capabilities() -> EngineCapabilities {
    tauri::async_runtime::spawn_blocking(native::engine_capabilities)
        .await
        .unwrap_or_default()
}

#[tauri::command]
async fn engine_models() -> Vec<ModelInfo> {
    tauri::async_runtime::spawn_blocking(native::engine_models)
        .await
        .unwrap_or_default()
}

#[tauri::command]
async fn engine_inference(request: InferenceRequest) -> NativeResult {
    tauri::async_runtime::spawn_blocking(move || native::engine_inference(request))
        .await
        .unwrap_or_else(|error| {
            NativeResult::rejected(format!("Native inference task failed: {error}"))
        })
}

fn register_commands<R: tauri::Runtime>(builder: tauri::Builder<R>) -> tauri::Builder<R> {
    builder.invoke_handler(tauri::generate_handler![
        engine_status,
        engine_capabilities,
        engine_models,
        engine_inference
    ])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    register_commands(tauri::Builder::default())
        .run(tauri::generate_context!())
        .expect("error while running Niyah Studio");
}

#[cfg(test)]
mod dispatch_tests {
    use super::*;
    use serde_json::{json, Value};
    use tauri::test::{get_ipc_response, mock_builder, mock_context, noop_assets, MockRuntime};

    fn invoke(
        view: &tauri::WebviewWindow<MockRuntime>,
        cmd: &str,
        body: Value,
    ) -> Result<Value, Value> {
        get_ipc_response(
            view,
            tauri::webview::InvokeRequest {
                cmd: cmd.into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: "http://tauri.localhost".parse().unwrap(),
                body: tauri::ipc::InvokeBody::Json(body),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.into(),
            },
        )
        .map(|body| body.deserialize().unwrap())
    }

    fn inference(model: &str) -> Value {
        json!({"request":{"prompt":"السلام عليكم","modelId":model,"maxNewTokens":16,"temperature":0,"seed":0,"backend":"cpu"}})
    }

    #[test]
    fn native_dispatch_rejects_path_overrides_and_bad_limits() {
        let app = register_commands(mock_builder())
            .build(mock_context(noop_assets()))
            .unwrap();
        let view = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();
        let mut payload = inference("v10-sft-canary");
        payload["request"]["checkpointPath"] = json!("C:/frontend-selected.ckpt");
        assert!(invoke(&view, "engine_inference", payload)
            .unwrap_err()
            .to_string()
            .contains("unknown field"));
        let mut payload = inference("v10-sft-canary");
        payload["request"]["maxNewTokens"] = json!(65);
        let response = invoke(&view, "engine_inference", payload).unwrap();
        assert_eq!(response["executionStatus"], "REJECTED");
        assert_eq!(response["qualityStatus"], "NOT_EVALUATED");
    }

    #[test]
    #[ignore = "requires exact local Windows Engine/model pins; real commands execute behind mock IPC transport"]
    fn pinned_native_dispatch() {
        let app = register_commands(mock_builder())
            .build(mock_context(noop_assets()))
            .unwrap();
        let view = tauri::WebviewWindowBuilder::new(&app, "main", Default::default())
            .build()
            .unwrap();
        let identity = invoke(&view, "engine_status", json!({})).unwrap();
        assert_eq!(identity["status"], "ONLINE", "{identity}");
        let capabilities = invoke(&view, "engine_capabilities", json!({})).unwrap();
        assert_eq!(
            capabilities,
            json!({"prepare":false,"shard":false,"training":false,"evaluation":false,"inference":true,"probe":false,"cancellation":false})
        );
        let models = invoke(&view, "engine_models", json!({})).unwrap();
        assert_eq!(models.as_array().unwrap().len(), 2);
        let canary = invoke(&view, "engine_inference", inference("v10-sft-canary")).unwrap();
        assert_eq!(canary["executionStatus"], "SUCCEEDED", "{canary}");
        assert_eq!(canary["stdout"].as_str().unwrap().trim(), "وعليكم السلام.");
        assert_eq!(canary["qualityStatus"], "NOT_EVALUATED");
        let replay = invoke(&view, "engine_inference", inference("v10-sft-canary")).unwrap();
        assert_eq!(replay["stdout"], canary["stdout"]);
        let baseline = invoke(&view, "engine_inference", inference("v10-step0200")).unwrap();
        assert_eq!(baseline["executionStatus"], "SUCCEEDED", "{baseline}");
        assert_eq!(baseline["qualityStatus"], "NOT_EVALUATED");
        assert_ne!(baseline["stdout"], canary["stdout"]);
        println!("{}", serde_json::to_string_pretty(&json!({"dispatch":"Tauri invoke handler; mock IPC transport, real native subprocesses", "identity":identity,"capabilities":capabilities,"models":models,"canary":canary,"deterministicReplay":replay,"baseline":baseline})).unwrap());
    }
}
