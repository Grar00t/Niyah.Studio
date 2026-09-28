fn main() {
    tauri_build::build();
    // Tauri's app resources are attached to the desktop binary, while Rust's
    // unit-test harness also imports Common Controls v6 (TaskDialogIndirect).
    // Generate a companion manifest for test targets. The desktop binary already
    // embeds Tauri's resource manifest; /MANIFEST:EMBED would duplicate that resource.
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows") {
        println!("cargo:rustc-link-arg=/MANIFEST");
        println!("cargo:rustc-link-arg=/MANIFESTDEPENDENCY:type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'");
    }
}
