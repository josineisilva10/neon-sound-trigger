# VEXORA SAMPLER — Versão desktop (Windows)

Status: a interface e o áudio rodam no navegador. Atalhos globais, controles de janela e instalador exigem compilar com **Tauri v2** em uma máquina Windows. Isso ainda não foi testado.

1. Instale Rust, Node e o Tauri CLI (`npm i -D @tauri-apps/cli`), depois rode `npx tauri init`.
2. Em `src-tauri/tauri.conf.json`, defina `"app": { "withGlobalTauri": true }` e aponte `frontendDist` para a saída estática do build.
3. Adicione o plugin: `cargo add tauri-plugin-global-shortcut`. Em `main.rs`, registre `.plugin(tauri_plugin_global_shortcut::Builder::new().build())`. Dê ao app as permissões `global-shortcut:default` e `core:window:default`.
4. Rode `npx tauri build`. O resultado é um instalador MSI/NSIS com entrada no menu Iniciar e desinstalador.

O app detecta o Tauri sozinho (`src/lib/vexora/desktop.ts`) e mostra a opção "Atalhos globais" em Configurações → Desktop.
