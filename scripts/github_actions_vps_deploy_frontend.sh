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
  echo "[ERROR] DEPLOY_USER no puede ser el usuario literal 'deploy' en este flujo. Define VPS_USERNAME=deploy_autopasa en GitHub."
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

# sites-enabled puede tener vhosts de otros productos en el mismo VPS; el diagnóstico frontend
# solo debe inspeccionar ficheros del ámbito Autopasa (no mezclar configs ajenas).
_nginx_site_file_is_autopasa_frontend_scope() {
  local bn
  bn=$(basename "$1" | tr '[:upper:]' '[:lower:]')
  case "$bn" in
    *sgc*) return 1 ;;
  esac
  return 0
}

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
    if [ "$LB80_CODE" = "301" ] || [ "$LB80_CODE" = "302" ]; then
      echo ">>> INTERPRETACIÓN: :80 solo redirige a HTTPS (normal). La SPA debe servirse bien en :443 (listen ssl) con root → $DEPLOY_PATH/dist"
    elif [ "$LB80_CODE" = "404" ]; then
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
  echo ">>> INTERPRETACIÓN: :80 responde ($LB80_CODE, a menudo redirección) pero :443 no sirve el SPA → edita el bloque listen 443 ssl con server_name $HOST_FOR_NGINX: root $DEPLOY_PATH/dist; try_files \$uri \$uri/ /index.html;"
fi

# D) Nginx: solo ficheros Autopasa (nombre del enlace en sites-enabled sin prefijos de otros productos)
echo ""
echo "=== D) Nginx sites-enabled — vhost Autopasa frontend (excl. otros proyectos en el mismo VPS) ==="
NGINX_FOUND=0
EXPECTED_ROOT_LINE="root $DEPLOY_PATH/dist"
if [ -n "$HOST_FOR_NGINX" ] && [ -d /etc/nginx/sites-enabled ]; then
  for f in /etc/nginx/sites-enabled/*; do
    [ -f "$f" ] || continue
    _nginx_site_file_is_autopasa_frontend_scope "$f" || continue
    if grep -q "$HOST_FOR_NGINX" "$f" 2>/dev/null; then
      NGINX_FOUND=1
      echo "--- $f ---"
      grep -nE "listen|server_name|^[[:space:]]*root|try_files|index[[:space:]]" "$f" 2>/dev/null | head -50 || echo "    (sin permiso de lectura)"
      echo ">>> Directivas root en este fichero (bloque listen 443 ssl + server_name $HOST_FOR_NGINX):"
      _root_lines=$(grep -nE '^[[:space:]]*root[[:space:]]' "$f" 2>/dev/null || true)
      if [ -n "$_root_lines" ]; then
        printf '%s\n' "$_root_lines" | sed 's/^/    /'
      else
        echo "    (ninguna línea root — revisa que este sea el vhost dedicado Autopasa y permisos de lectura)"
      fi
    fi
  done
fi
if [ -n "$HOST_FOR_NGINX" ] && [ "$NGINX_FOUND" -eq 0 ]; then
  echo "[WARN] Ningún fichero Autopasa en sites-enabled menciona $HOST_FOR_NGINX (o solo aparece en vhosts de otros productos, ignorados aquí)."
  echo "    Esperado: enlace tipo sites-enabled/0-$HOST_FOR_NGINX → sites-available/$HOST_FOR_NGINX (0- ordena antes que sgc-*)"
  if [ -d /etc/nginx/sites-enabled ]; then
    for f in /etc/nginx/sites-enabled/*; do
      [ -f "$f" ] || continue
      bn=$(basename "$f" | tr '[:upper:]' '[:lower:]')
      case "$bn" in *sgc*) ;; *) continue ;; esac
      if grep -q "$HOST_FOR_NGINX" "$f" 2>/dev/null; then
        echo "[INFO] El host $HOST_FOR_NGINX aún aparece en $f (nombre *sgc* — fuera del diagnóstico Autopasa)."
        echo "    Eso suele explicar el 404 en :443: Nginx toma un server block ahí sin root del SPA."
        echo "    Quita de ese fichero los bloques server { } que usen server_name $HOST_FOR_NGINX y activa solo"
        echo "    sites-available/$HOST_FOR_NGINX con enlace sites-enabled/0-$HOST_FOR_NGINX."
        break
      fi
    done
  fi
fi
if [ -n "$HOST_FOR_NGINX" ] && [ -d /etc/nginx/sites-enabled ]; then
  DIST_IN_AUTOPASA_VHOST=0
  for f in /etc/nginx/sites-enabled/*; do
    [ -f "$f" ] || continue
    _nginx_site_file_is_autopasa_frontend_scope "$f" || continue
    grep -q "$HOST_FOR_NGINX" "$f" 2>/dev/null || continue
    if grep -qF "$DEPLOY_PATH/dist" "$f" 2>/dev/null; then
      DIST_IN_AUTOPASA_VHOST=1
      break
    fi
  done
  if [ "$DIST_IN_AUTOPASA_VHOST" -eq 1 ]; then
    echo "[OK] Un vhost Autopasa (fichero sites-enabled filtrado) menciona $HOST_FOR_NGINX y la ruta del deploy ($DEPLOY_PATH/dist)."
  else
    echo "[WARN] Ningún vhost Autopasa en sites-enabled une $HOST_FOR_NGINX con '$DEPLOY_PATH/dist'."
    echo ">>> ACCIÓN — vhost dedicado Autopasa (independiente de otros .conf en el mismo servidor):"
    echo "    sudo nano /etc/nginx/sites-available/$HOST_FOR_NGINX"
    echo "    En el server { } con listen 443 ssl y server_name $HOST_FOR_NGINX:"
    echo "    $EXPECTED_ROOT_LINE"
    echo "    index index.html;"
    echo "    location / { try_files \$uri \$uri/ /index.html; }"
    echo "    sudo ln -sf /etc/nginx/sites-available/$HOST_FOR_NGINX /etc/nginx/sites-enabled/0-$HOST_FOR_NGINX"
    echo "    sudo nginx -t && sudo systemctl reload nginx"
    echo ">>> Si el server_name solo existía dentro de un vhost de otro producto, elimínalo allí y usa solo este fichero."
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

# F) Coherencia loopback vs público (no confundir 301 en :80 con “todo OK” frente a 404 en público)
echo ""
echo "=== F) Coherencia (misma máquina) ==="
if [ "$PUB_OK" = "1" ]; then
  if ! _http_ok "$LB80_CODE" && [ -n "$HOST_FOR_NGINX" ]; then
    echo "[WARN] HTTPS público OK pero loopback :80 + Host → HTTP $LB80_CODE (proxy delante, default_server u otro vhost en :80)."
  else
    echo "[OK] URL pública OK; diagnóstico local alineado o no aplicable."
  fi
else
  if _http_ok "$LB443_CODE"; then
    echo "[WARN] Loopback https://127.0.0.1:443 + Host → HTTP $LB443_CODE OK, pero la URL pública falló → revisa DNS (¿otra IP?), CDN o certificado/SNI distinto al de este VPS."
  elif [ "$LAST_PUB_CODE" = "$LB443_CODE" ] && [ -n "$LAST_PUB_CODE" ] && [ "$LAST_PUB_CODE" != "000" ]; then
    echo "[INFO] Mismo HTTP $LAST_PUB_CODE en loopback :443 y en URL pública → es el mismo Nginx (este servidor); no es un fallo de DNS a otro host."
    echo "       Corrige el bloque ssl (listen 443) de server_name $HOST_FOR_NGINX: $EXPECTED_ROOT_LINE y try_files para SPA."
  else
    echo "[INFO] Público HTTP $LAST_PUB_CODE vs loopback :443 HTTP $LB443_CODE → si ambos son 404 HTML de Nginx, unifica root en el vhost ssl."
  fi
  if _http_ok "$LB80_CODE" && ! _http_ok "$LB443_CODE"; then
    echo "[INFO] :80 devuelve $LB80_CODE (suele ser redirección a HTTPS) y :443 devuelve $LB443_CODE → el arreglo va en el server { ssl } de $HOST_FOR_NGINX, no en el de solo :80."
  fi
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
