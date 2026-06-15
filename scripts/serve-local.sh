#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-4000}"
LIVERELOAD="${LIVERELOAD:-false}"
export BUNDLE_GEMFILE="${BUNDLE_GEMFILE:-Gemfile.local}"
export BUNDLE_PATH="${BUNDLE_PATH:-vendor/bundle}"
export BUNDLE_FORCE_RUBY_PLATFORM="${BUNDLE_FORCE_RUBY_PLATFORM:-true}"

if ! bundle check >/dev/null 2>&1; then
  echo "Jekyll gems are not installed yet. Installing them into vendor/bundle..."
  bundle install
fi

tmp_config="$(mktemp "${TMPDIR:-/tmp}/jekyll-local.XXXXXX.yml")"
trap 'rm -f "$tmp_config"' EXIT

cat > "$tmp_config" <<YAML
url: "http://127.0.0.1:${PORT}"
baseurl: ""
YAML

serve_args=(
  --config "_config.yml,_config_local.yml,$tmp_config"
  --host 127.0.0.1
  --port "$PORT"
)

if [[ "$LIVERELOAD" == "true" ]]; then
  serve_args+=(--livereload)
fi

bundle exec jekyll serve "${serve_args[@]}"
