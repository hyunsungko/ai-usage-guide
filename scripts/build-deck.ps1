$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$templatePath = Join-Path $root "src\template.html"
$cssPath = Join-Path $root "src\styles\deck.css"
$slidesDir = Join-Path $root "src\slides"
$outPath = Join-Path $root "index.html"

$template = [IO.File]::ReadAllText($templatePath, [Text.Encoding]::UTF8)
$css = [IO.File]::ReadAllText($cssPath, [Text.Encoding]::UTF8).TrimEnd("`r", "`n") + "`n"
$slides = Get-ChildItem -LiteralPath $slidesDir -Filter "*.html" | Sort-Object Name | ForEach-Object {
  [IO.File]::ReadAllText($_.FullName, [Text.Encoding]::UTF8).TrimEnd("`r", "`n")
}
$slidesText = ($slides -join "`n`n") + "`n"

$output = $template.Replace("{{DECK_CSS}}", $css).Replace("{{SLIDES}}", $slidesText)
[IO.File]::WriteAllText($outPath, $output, [Text.UTF8Encoding]::new($false))
Write-Host "Built index.html from $($slides.Count) slide files."