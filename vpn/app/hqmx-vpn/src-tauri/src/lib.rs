// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::{
    Manager,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

pub mod commands;
pub mod services;

fn create_tray_menu(app: &tauri::AppHandle) -> Result<Menu<tauri::Wry>, tauri::Error> {
    let show_i = MenuItem::with_id(app, "show", "Show Window", true, None::<&str>)?;
    let hide_i = MenuItem::with_id(app, "hide", "Hide Window", true, None::<&str>)?;
    let connect_i = MenuItem::with_id(app, "connect", "Connect VPN", true, None::<&str>)?;
    let disconnect_i = MenuItem::with_id(app, "disconnect", "Disconnect VPN", true, None::<&str>)?;
    let quit_i = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    
    Menu::with_items(app, &[&show_i, &hide_i, &connect_i, &disconnect_i, &quit_i])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            let handle = app.handle().clone();
            
            // Create tray menu
            let menu = create_tray_menu(&handle)?;
            
            // Build tray icon with menu and event handlers
            let _tray = TrayIconBuilder::new()
                .menu(&menu)
                .menu_on_left_click(false)
                .on_menu_event(move |app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.unminimize();
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                        "connect" => {
                            println!("Tray: Connect VPN requested");
                            // TODO: Emit event to frontend or invoke command
                        }
                        "disconnect" => {
                            println!("Tray: Disconnect VPN requested");
                            // TODO: Emit event to frontend or invoke command
                        }
                        "quit" => {
                            std::process::exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    // Left click on tray icon -> show/focus window
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.unminimize();
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::vpn::connect_vpn,
            commands::vpn::disconnect_vpn
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
