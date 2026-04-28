use base64::{engine::general_purpose, Engine as _};
use serde::Serialize;
use tauri::command;
use xcap::Monitor;

#[derive(Serialize)]
struct ScreenshotResult {
    monitor_name: String,
    data_url: String,
    width: u32,
    height: u32,
}

#[command]
fn capture_one_screen(screen_index: usize) -> Result<ScreenshotResult, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;

    let monitor = monitors
        .get(screen_index)
        .ok_or_else(|| format!("Invalid screen index: {}", screen_index))?;

    let image = monitor.capture_image().map_err(|e| e.to_string())?;

    let width = image.width();
    let height = image.height();

    let mut png_bytes: Vec<u8> = Vec::new();
    {
        use std::io::Cursor;
        image
            .write_to(&mut Cursor::new(&mut png_bytes), image::ImageFormat::Png)
            .map_err(|e| e.to_string())?;
    }

    let b64 = general_purpose::STANDARD.encode(&png_bytes);

    Ok(ScreenshotResult {
        monitor_name: monitor.name().unwrap_or_else(|_| "Unknown".to_string()),
        data_url: format!("data:image/png;base64,{}", b64),
        width,
        height,
    })
}

#[command]
fn capture_all_screens() -> Result<Vec<ScreenshotResult>, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let mut results = Vec::new();

    for monitor in monitors {
        let image = monitor.capture_image().map_err(|e| e.to_string())?;

        let width = image.width();
        let height = image.height();

        let mut png_bytes: Vec<u8> = Vec::new();
        {
            use std::io::Cursor;
            image
                .write_to(&mut Cursor::new(&mut png_bytes), image::ImageFormat::Png)
                .map_err(|e| e.to_string())?;
        }

        let b64 = general_purpose::STANDARD.encode(&png_bytes);

        results.push(ScreenshotResult {
            monitor_name: monitor.name().unwrap_or_else(|_| "Unknown".to_string()),
            data_url: format!("data:image/png;base64,{}", b64),
            width,
            height,
        });
    }

    Ok(results)
}

#[command]
fn list_screens() -> Result<Vec<String>, String> {
    let monitors = Monitor::all().map_err(|e| e.to_string())?;
    let names = monitors
        .into_iter()
        .enumerate()
        .map(|(i, m)| {
            let name = m.name().unwrap_or_else(|_| "Unknown".to_string());
            format!("{} - {}", i, name)
        })
        .collect();
    Ok(names)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_screens,
            capture_one_screen,
            capture_all_screens
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}