$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Push-Location $root
try {
  npm run check:layout -- @args
} finally {
  Pop-Location
}
