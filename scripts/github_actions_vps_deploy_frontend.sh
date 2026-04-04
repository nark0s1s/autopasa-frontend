#!/usr/bin/env bash
# Ejecutado en el VPS vía SSH desde .github/workflows/deploy-frontend-vps.yml
# Misma convención que autopasa-api (scripts/github_actions_vps_deploy.sh): código bajo /home/$DEPLOY_USER,
# sin sudo para mkdir (usuario deploy_autopasa).
#
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

HOME_BASE="/home/$DEPLOY_USER"

if [ "$GITHUB_REF" = "refs/heads/main" ]; then
  DEPLOY_PATH="$HOME_BASE/autopasa-frontend-production"
  BRANCH="main"
  ENV_HINT="production"
  DEFAULT_PUBLIC_URL="https://autopasa.devjal.tech/"
elif [ "$GITHUB_REF" = "refs/heads/release" ]; then
  DEPLOY_PATH="$HOME_BASE/autopasa-frontend-staging"
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

if ! mkdir -p "$DEPLOY_PATH"; then
  echo "[ERROR] mkdir -p $DEPLOY_PATH falló (permisos en $HOME_BASE?)."
  echo "  En el VPS (root): sudo chown -R $DEPLOY_USER:$DEPLOY_USER $HOME_BASE"
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

# --- Validaciones requeridas del artefacto (fallan el deploy si no cumplen) ---
if ! [ -s "$DEPLOY_PATH/dist/index.html" ]; then
  echo "[ERROR] $DEPLOY_PATH/dist/index.html existe pero está vacío (build corrupto)."
  exit 1
fi
if [ ! -d "$DEPLOY_PATH/dist/assets" ] || [ -z "$(ls -A "$DEPLOY_PATH/dist/assets" 2>/dev/null)" ]; then
  echo "[ERROR] Falta salida Vite en $DEPLOY_PATH/dist/assets (directorio vacío o inexistente)."
  echo "  Revisa npm run build y vite.config (base / outDir)."
  exit 1
fi
echo "[OK] Build en $DEPLOY_PATH/dist (index.html + assets presentes)"
echo "[INFO] Nginx root requerido: $DEPLOY_PATH/dist (autopasa-api/docs/VPS_Y_CI_CD_AUTOPASA.md §2.10)."

# host extraído de la URL pública (para prueba loopback con Host:)
_host_from_url() {
  local u="$1"
  u="${u#https://}"
  u="${u#http://}"
  u="${u%%/*}"
  printf '%s' "$u"
}
HOST_FOR_NGINX="$(_host_from_url "$PUBLIC_FRONTEND_CHECK_URL")"
STRICT_PUBLIC="${FRONTEND_REQUIRE_PUBLIC_HTTP:-0}"

DIAG_TMP=$(mktemp -d)
trap 'rm -rf "$DIAG_TMP"' EXIT

_preview_file() {
  local f="$1" max="${2:-500}"
  if [ ! -s "$f" ]; then
    echo "(vacío o no existe)"
    return
  fi
  head -c "$max" "$f" 2>/dev/null | tr '\r\n' '  '
  echo
}

_body_looks_like_html() {
  head -c 256 "$1" 2>/dev/null | grep -qiE '<!DOCTYPE[[:space:]]+html|<html[[:space:]>]'
}

_http_ok() {
  case "$1" in 200|301|302) return 0 ;; *) return 1 ;; esac
}

echo ""
echo "=========================================="
echo "Diagnóstico post-deploy (frontend estático)"
echo "Entorno: $ENV_HINT | Host Nginx: ${HOST_FOR_NGINX:-<vacío>}"
echo "URL pública comprobada: $PUBLIC_FRONTEND_CHECK_URL"
echo "Raíz esperada: $DEPLOY_PATH/dist"
echo "=========================================="

# A) Permisos de recorrido hacia dist (Nginx worker debe poder leer archivos)
echo ""
echo "=== A) Permisos de ruta (lectura para el worker de Nginx) ==="
if [ -r "$DEPLOY_PATH/dist/index.html" ]; then
  echo "[OK] index.html legible por $(whoami)"
else
  echo "[ERROR] index.html no legible: $DEPLOY_PATH/dist/index.html"
  ls -la "$DEPLOY_PATH/dist/index.html" 2>&1 || true
  exit 1
fi
echo "[INFO] Si Nginx devuelve 403: chmod 755 $HOME_BASE y directorios padre hasta / (típico: chmod 755 /home/$DEPLOY_USER)."

# B) Loopback :80 + Host (mismo criterio que diagnose_health_deploy_on_vps.py sección C)
LB80_CODE="000"
LB80_EC=0
echo ""
echo "=== B) HTTP loopback :80 + Host: $HOST_FOR_NGINX (vhost en este VPS) ==="
echo "    curl -sS -o body -w '%{http_code}' -H 'Host: $HOST_FOR_NGINX' http://127.0.0.1/"
: >"$DIAG_TMP/lb80.err"
if [ -n "$HOST_FOR_NGINX" ]; then
  set +e
  LB80_CODE=$(curl -sS -o "$DIAG_TMP/lb80.out" -w "%{http_code}" -H "Host: ${HOST_FOR_NGINX}" --connect-timeout 3 --max-time 15 "http://127.0.0.1/" 2>>"$DIAG_TMP/lb80.err")
  LB80_EC=$?
  set -e
else
  echo "[WARN] HOST_FOR_NGINX vacío (revisa PUBLIC_FRONTEND_CHECK_URL)."
fi
echo "[INFO] HTTP code=$LB80_CODE | curl exit=$LB80_EC"
if [ -s "$DIAG_TMP/lb80.err" ]; then
  echo ">>> curl stderr (:80):"
  sed 's/^/    /' "$DIAG_TMP/lb80.err"
fi
if [ -s "$DIAG_TMP/lb80.out" ]; then
  echo ">>> Primeros bytes de la respuesta (:80):"
  _preview_file "$DIAG_TMP/lb80.out" 400
  if _body_looks_like_html "$DIAG_TMP/lb80.out"; then
    if [ "$LB80_CODE" = "404" ]; then
      echo ">>> INTERPRETACIÓN: cuerpo HTML con 404 → suele ser default_server o root distinta a $DEPLOY_PATH/dist"
    elif [ "$LB80_CODE" = "502" ] || [ "$LB80_CODE" = "503" ]; then
      echo ">>> INTERPRETACIÓN: HTML 502/503 → upstream/proxy mal configurado en este server block (raro para SPA estática)."
    fi
  fi
fi
if [ -n "$HOST_FOR_NGINX" ] && ! _http_ok "$LB80_CODE"; then
  echo "::error::Frontend diagnóstico: loopback :80 + Host devolvió HTTP $LB80_CODE (esperado 200, 301 o 302). Revisa server_name y root en Nginx."
fi

# C) Loopback :443 + Host + -k (bloque SSL local; como API diagnose D)
LB443_CODE="000"
LB443_EC=0
echo ""
echo "=== C) HTTPS loopback :443 + Host + -k (certificado local) ==="
echo "    curl -sSk ... -H 'Host: $HOST_FOR_NGINX' https://127.0.0.1/"
: >"$DIAG_TMP/lb443.err"
if [ -n "$HOST_FOR_NGINX" ]; then
  set +e
  LB443_CODE=$(curl -sSk -o "$DIAG_TMP/lb443.out" -w "%{http_code}" -H "Host: ${HOST_FOR_NGINX}" --connect-timeout 3 --max-time 15 "https://127.0.0.1/" 2>>"$DIAG_TMP/lb443.err")
  LB443_EC=$?
  set -e
fi
echo "[INFO] HTTP code=$LB443_CODE | curl exit=$LB443_EC"
if [ -s "$DIAG_TMP/lb443.err" ]; then
  echo ">>> curl stderr (:443 -k):"
  sed 's/^/    /' "$DIAG_TMP/lb443.err"
fi
if [ -s "$DIAG_TMP/lb443.out" ]; then
  echo ">>> Primeros bytes (:443):"
  _preview_file "$DIAG_TMP/lb443.out" 400
fi
if [ -n "$HOST_FOR_NGINX" ] && _http_ok "$LB80_CODE" && ! _http_ok "$LB443_CODE"; then
  echo ">>> INTERPRETACIÓN: :80 OK pero :443 no → revisa bloque ssl/listen 443 para server_name $HOST_FOR_NGINX (p. ej. tras certbot)."
fi

# D) Nginx: archivos que citan el host (solo lectura)
echo ""
echo "=== D) Nginx sites-enabled (líneas listen / server_name / root / try_files) ==="
NGINX_FOUND=0
if [ -n "$HOST_FOR_NGINX" ] && [ -d /etc/nginx/sites-enabled ]; then
  for f in /etc/nginx/sites-enabled/*; do
    [ -f "$f" ] || continue
    if grep -q "$HOST_FOR_NGINX" "$f" 2>/dev/null; then
      NGINX_FOUND=1
      echo "--- $f ---"
      grep -nE "listen|server_name|^[[:space:]]*root|try_files|index[[:space:]]" "$f" 2>/dev/null | head -50 || echo "    (sin permiso de lectura)"
    fi
  done
fi
if [ -n "$HOST_FOR_NGINX" ] && [ "$NGINX_FOUND" -eq 0 ]; then
  echo "[WARN] Ningún archivo en /etc/nginx/sites-enabled menciona $HOST_FOR_NGINX (permiso denegado, o vhost en otro path)."
fi
EXPECTED_ROOT_LINE="root $DEPLOY_PATH/dist"
if [ -n "$HOST_FOR_NGINX" ] && [ -d /etc/nginx/sites-enabled ]; then
  if grep -r --include='*' -l "$HOST_FOR_NGINX" /etc/nginx/sites-enabled 2>/dev/null | xargs -r grep -l "$DEPLOY_PATH/dist" 2>/dev/null | head -1 | grep -q .; then
    echo "[OK] Algún vhost que menciona $HOST_FOR_NGINX incluye la ruta de deploy ($DEPLOY_PATH/dist)."
  else
    echo "[WARN] No se encontró '$DEPLOY_PATH/dist' en sites-enabled junto con $HOST_FOR_NGINX → Nginx podría servir otra carpeta."
  fi
fi

# E) HTTPS público (reintentos)
echo ""
echo "=== E) URL pública HTTPS (esperado 200 / 301 / 302) ==="
echo "    $PUBLIC_FRONTEND_CHECK_URL"
PUB_OK=0
LAST_PUB_CODE="000"
LAST_PUB_EC=0
: >"$DIAG_TMP/pub.err"
: >"$DIAG_TMP/pub.out"
for attempt in 1 2 3 4 5 6; do
  set +e
  LAST_PUB_CODE=$(curl -sS -o "$DIAG_TMP/pub.out" -w "%{http_code}" --connect-timeout 8 --max-time 25 "$PUBLIC_FRONTEND_CHECK_URL" 2>>"$DIAG_TMP/pub.err")
  LAST_PUB_EC=$?
  set -e
  echo "[INFO] Intento $attempt/6 → HTTP $LAST_PUB_CODE | curl exit=$LAST_PUB_EC"
  if _http_ok "$LAST_PUB_CODE"; then
    echo "[OK] Respuesta HTTP aceptable para SPA."
    PUB_OK=1
    break
  fi
  if [ "$attempt" -lt 6 ]; then
    echo "[WARN] Reintentando en 2s..."
    sleep 2
  fi
done

if [ -s "$DIAG_TMP/pub.err" ]; then
  echo ">>> curl stderr (último intento, HTTPS público):"
  sed 's/^/    /' "$DIAG_TMP/pub.err"
fi
if [ -s "$DIAG_TMP/pub.out" ]; then
  echo ">>> Primeros bytes (HTTPS público):"
  _preview_file "$DIAG_TMP/pub.out" 500
  if _body_looks_like_html "$DIAG_TMP/pub.out" && ! _http_ok "$LAST_PUB_CODE"; then
    echo ">>> INTERPRETACIÓN: respuesta HTML con HTTP $LAST_PUB_CODE → página de error Nginx (404/502) o redirección incorrecta."
  fi
fi

# F) Coherencia loopback vs público
echo ""
echo "=== F) Coherencia (misma máquina) ==="
if _http_ok "$LB80_CODE" && [ "$PUB_OK" != "1" ]; then
  echo "[WARN] Loopback :80 OK pero HTTPS público falló → DNS externo, firewall, CDN u otra IP distinta a este VPS."
elif ! _http_ok "$LB80_CODE" && [ "$PUB_OK" = "1" ]; then
  echo "[WARN] HTTPS público OK pero loopback :80 no → comprobación local no coincide (proxy delante del VPS o default_server distinto)."
fi

# Resumen final
echo ""
echo "=========================================="
echo "RESUMEN — validación post-deploy frontend"
echo "=========================================="
echo "  Entorno:              $ENV_HINT"
echo "  URL pública:          $PUBLIC_FRONTEND_CHECK_URL"
echo "  Raíz dist (build):    $DEPLOY_PATH/dist"
echo "  Loopback :80 + Host:  HTTP $LB80_CODE (curl exit $LB80_EC)"
echo "  Loopback :443 + Host: HTTP $LB443_CODE (curl exit $LB443_EC)"
echo "  HTTPS público:        HTTP $LAST_PUB_CODE → $([ "$PUB_OK" = 1 ] && echo OK || echo FALLO)"
echo ""
echo "  Si el build está bien pero ves 404:"
echo "    $EXPECTED_ROOT_LINE;"
echo "    server_name $HOST_FOR_NGINX;"
echo "    sudo chmod 755 $HOME_BASE"
echo "    sudo nginx -t && sudo systemctl reload nginx"
echo "=========================================="

if [ "$PUB_OK" != "1" ]; then
  echo ""
  echo "::error::Deploy frontend: la URL pública no respondió 200/301/302 tras 6 intentos (último HTTP=$LAST_PUB_CODE, curl exit=$LAST_PUB_EC). El artefacto en $DEPLOY_PATH/dist está listo; corrige Nginx o red."
  if [ "$STRICT_PUBLIC" = "1" ] || [ "$STRICT_PUBLIC" = "true" ]; then
    echo "::warning::FRONTEND_REQUIRE_PUBLIC_HTTP está activo: el job fallará con exit 1."
  else
    echo "::warning::FRONTEND_REQUIRE_PUBLIC_HTTP no está en 1: el job puede terminar en exit 0 con el dist ya desplegado. Define FRONTEND_REQUIRE_PUBLIC_HTTP=1 en GitHub para exigir HTTPS público OK."
  fi
  if [ "$STRICT_PUBLIC" = "1" ] || [ "$STRICT_PUBLIC" = "true" ]; then
    exit 1
  fi
  echo "[OK] Deploy frontend: dist desplegado; validación HTTPS pública en modo relajado (exit 0)."
  exit 0
fi

if ! _http_ok "$LB80_CODE" && [ -n "$HOST_FOR_NGINX" ]; then
  echo ""
  echo "::warning::HTTPS público OK pero loopback :80 no devolvió 200/301/302 (HTTP $LB80_CODE). Conviene alinear Nginx en este host para diagnósticos futuros."
fi

echo "[OK] Deploy frontend validado: dist + comprobaciones de diagnóstico + URL pública OK"
