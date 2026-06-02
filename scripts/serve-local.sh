#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

PORT="${PORT:-4000}"
export BUNDLE_GEMFILE="${BUNDLE_GEMFILE:-Gemfile.local}"
export BUNDLE_PATH="${BUNDLE_PATH:-vendor/bundle}"
export BUNDLE_FORCE_RUBY_PLATFORM="${BUNDLE_FORCE_RUBY_PLATFORM:-true}"

if ! bundle check >/dev/null 2>&1; then
  echo "Jekyll gems are not installed yet. Installing them into vendor/bundle..."
  bundle install
fi

bundle exec jekyll serve \
  --config _config.yml,_config_local.yml \
  --host 127.0.0.1 \
  --port "$PORT" \
  --livereload
