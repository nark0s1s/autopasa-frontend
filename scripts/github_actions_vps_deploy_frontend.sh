#!/usr/bin/env bash
# Ejecutado en el VPS vía SSH desde .github/workflows/deploy-frontend-vps.yml
# Variables obligatorias: REPO_URL, GITHUB_REF, DEPLOY_USER, VITE_API_URL
set -euo pipefail

: "${REPO_URL:?Falta REPO_URL}"
: "${GITHUB_REF:?Falta GITHUB_REF}"
: "${DEPLOY_USER:?Falta DEPLOY_USER}"
: "${VITE_API_URL:?Falta VITE_API_URL (variable VITE_API_URL del Environment en GitHub)}"

if [ "$DEPLOY_USER" = "deploy" ]; then
  echo "[ERROR] DEPLOY_USER no puede ser 'deploy' (reservado SGC). Define VPS_USERNAME=deploy_autopasa en GitHub."
  exit 1
fi

if [ "$GITHUB_REF" = "refs/heads/main" ]; then
  DEPLOY_PATH="/var/www/autopasa.devjal.tech/frontend"
  BRANCH="main"
  ENV_HINT="production"
  DEFAULT_PUBLIC_URL="https://autopasa.devjal.tech/"
elif [ "$GITHUB_REF" = "refs/heads/release" ]; then
  DEPLOY_PATH="/var/www/autopasa-staging.devjal.tech/frontend"
  BRANCH="release"
  ENV_HINT="staging"
  DEFAULT_PUBLIC_URL="https://autopasa-staging.devjal.tech/"
else
  echo "[ERROR] Ref no soportada para deploy: $GITHUB_REF"
  echo "  Solo refs/heads/release (staging) o refs/heads/main (producción)."
  exit 1
fi

PUBLIC_FRONTEND_CHECK_URL="${PUBLIC_FRONTEND_CHECK_URL:-$DEFAULT_PUBLIC_URL}"

echo "Deploy path: $DEPLOY_PATH"
echo "Branch: $BRANCH"
echo "Entorno: $ENV_HINT"
echo "Deploy user: $DEPLOY_USER"
echo "VITE_API_URL length: ${#VITE_API_URL}"

sudo_mkdir_chown_hint() {
  local root_staging="/var/www/autopasa-staging.devjal.tech"
  local root_prod="/var/www/autopasa.devjal.tech"
  echo "[ERROR] No se pudo preparar $DEPLOY_PATH (sin permiso o sudo -n denegado)."
  echo "  Una vez en el VPS como root (recomendado — luego el deploy no necesita sudo aquí):"
  echo "    sudo mkdir -p $root_staging/frontend $root_prod/frontend"
  echo "    sudo chown -R $DEPLOY_USER:$DEPLOY_USER $root_staging $root_prod"
  echo "  Alternativa: en /etc/sudoers.d/autopasa-deploy añade NOPASSWD para mkdir y chown:"
  echo "    $DEPLOY_USER ALL=(ALL) NOPASSWD: /usr/bin/mkdir, /bin/mkdir, /usr/bin/chown, /bin/chown"
  echo "  Doc: autopasa-api/docs/USUARIO_DEPLOY_AUTOPASA.md (sección sudo + frontend /var/www)."
}

# 1) Si el directorio ya existe y el usuario actual puede escribir → OK (típico tras chown previo).
# 2) Si el padre bajo /var/www es del deploy → mkdir -p sin sudo.
# 3) Si no, intentar sudo -n (NOPASSWD en sudoers).
ensure_deploy_path_writable() {
  if [[ -d "$DEPLOY_PATH" && -w "$DEPLOY_PATH" ]]; then
    echo "[OK] $DEPLOY_PATH existe y es escribible"
    return 0
  fi
  if mkdir -p "$DEPLOY_PATH" 2>/dev/null && [[ -w "$DEPLOY_PATH" ]]; then
    echo "[OK] mkdir -p $DEPLOY_PATH (sin sudo)"
    return 0
  fi
  if sudo -n mkdir -p "$DEPLOY_PATH" 2>/dev/null && sudo -n chown -R "$DEPLOY_USER:$DEPLOY_USER" "$DEPLOY_PATH" 2>/dev/null; then
    echo "[OK] Directorio preparado con sudo -n"
    return 0
  fi
  sudo_mkdir_chown_hint
  return 1
}

if ! ensure_deploy_path_writable; then
  exit 1
fi

git config --global --add safe.directory "$DEPLOY_PATH" || true

if [ ! -d "$DEPLOY_PATH/.git" ]; then
  echo "[INFO] Inicializando git en $DEPLOY_PATH"
  cd "$DEPLOY_PATH" && git init -b "$BRANCH" && git remote add origin "$REPO_URL" && git fetch origin && git reset --hard "origin/$BRANCH"
else
  echo "[INFO] Actualizando repo existente"
  cd "$DEPLOY_PATH"
  if git remote get-url origin >/dev/null 2>&1; then
    git remote set-url origin "$REPO_URL"
  else
    git remote add origin "$REPO_URL"
  fi
  git fetch origin && (git checkout "$BRANCH" 2>/dev/null || git checkout -b "$BRANCH" "origin/$BRANCH") && git reset --hard "origin/$BRANCH"
fi

echo ""
echo "=== npm ci + vite build (VITE_API_URL inyectada en este shell) ==="
(
  cd "$DEPLOY_PATH"
  export VITE_API_URL
  command -v node >/dev/null 2>&1 || {
    echo "[ERROR] node no está en PATH para el usuario $DEPLOY_USER. Instala Node 20+ en el VPS (docs/VPS_Y_CI_CD_AUTOPASA.md §2.5)."
    exit 1
  }
  node -v
  npm -v
  npm ci
  npm run build
)

if [ ! -f "$DEPLOY_PATH/dist/index.html" ]; then
  echo "[ERROR] No se generó $DEPLOY_PATH/dist/index.html (revisa vite build y vite.config)."
  exit 1
fi
echo "[OK] Build en $DEPLOY_PATH/dist"

echo ""
echo "=== Validación HTTP pública (SPA, esperado 200) ==="
echo "[INFO] URL: $PUBLIC_FRONTEND_CHECK_URL"
PUB_OK=0
for attempt in 1 2 3 4 5 6; do
  CODE=$(curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 8 --max-time 25 "$PUBLIC_FRONTEND_CHECK_URL" 2>/dev/null || echo "000")
  if [ "$CODE" = "200" ] || [ "$CODE" = "301" ] || [ "$CODE" = "302" ]; then
    echo "[OK] HTTP $CODE (intento $attempt/6)"
    PUB_OK=1
    break
  fi
  echo "[WARN] HTTP $CODE, reintento $attempt/6"
  sleep 2
done

if [ "$PUB_OK" != "1" ]; then
  echo "[ERROR] No se obtuvo 200/301/302 en $PUBLIC_FRONTEND_CHECK_URL"
  echo "  Revisa Nginx: root debe apuntar a .../frontend/dist (docs/VPS_Y_CI_CD_AUTOPASA.md §2.10)."
  echo "  sudo nginx -t && sudo systemctl reload nginx"
  exit 1
fi

echo "[OK] Deploy frontend validado: dist generado + URL pública responde"
