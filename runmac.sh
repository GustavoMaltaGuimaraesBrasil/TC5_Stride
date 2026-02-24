#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

start_backend() {
  if [[ ! -f "$ROOT_DIR/backend/app/main.py" ]]; then
    echo
    echo "Backend nao encontrado em backend/app/main.py"
    return 1
  fi

  if lsof -i :8000 -sTCP:LISTEN >/dev/null 2>&1; then
    echo
    echo "Backend ja esta ativo na porta 8000."
    return 0
  fi

  echo
  echo "Subindo backend na porta 8000..."
  (
    cd "$ROOT_DIR/backend"
    nohup python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 \
      > "$ROOT_DIR/backend/backend.log" 2>&1 &
  )
  sleep 2
}

run_web() {
  start_backend
  if [[ ! -f "$ROOT_DIR/frontend/web/package.json" ]]; then
    echo
    echo "Pasta frontend/web nao encontrada."
    return 1
  fi
  echo
  echo "Iniciando Web..."
  cd "$ROOT_DIR/frontend/web"
  npm install --include=dev --no-audit
  npm run dev
}

run_mobile_qr() {
  start_backend
  if [[ ! -f "$ROOT_DIR/frontend/mobile/package.json" ]]; then
    echo
    echo "Pasta frontend/mobile nao encontrada."
    return 1
  fi
  echo
  echo "Iniciando Mobile com QR Code (rede local)..."
  echo
  echo "Para Android: instalar e abrir Expo Go."
  echo "Para iPhone: usar Camera para ler o QR (ou app Expo Go)."
  cd "$ROOT_DIR/frontend/mobile"
  npm install --include=dev --no-audit
  npx expo start --host lan -c
}

run_test() {
  start_backend
  if [[ ! -f "$ROOT_DIR/teste/test_batch.py" ]]; then
    echo
    echo "Script de teste nao encontrado em teste/test_batch.py"
    return 1
  fi
  echo
  echo "Executando teste automatizado..."
  cd "$ROOT_DIR"
  python teste/test_batch.py
  echo
  echo "Fim do teste. Relatorio esperado em teste/test_report.json"
}

while true; do
  clear
  echo "=========================================="
  echo "  TC5_STRIDE - Inicializacao (macOS/Linux)"
  echo "=========================================="
  echo
  echo "1. Subir Web"
  echo "2. Subir Mobile com QR Code (rede local)"
  echo "4. Executar Teste Automatico (pasta teste)"
  echo "0. Sair"
  echo
  read -r -p "Escolha uma opcao: " opt

  case "$opt" in
    1) run_web; break ;;
    2) run_mobile_qr; break ;;
    4) run_test; read -r -p "Pressione Enter para voltar ao menu..." _ ;;
    0) exit 0 ;;
    *) echo; echo "Opcao invalida."; sleep 1 ;;
  esac
done
