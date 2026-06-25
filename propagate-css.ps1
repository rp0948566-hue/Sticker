$srcCSS = 'src\style.css'
$frontendBase = 'frontend'
$updated = 0
$dirs = Get-ChildItem $frontendBase -Recurse -Directory
foreach ($dir in $dirs) {
  $dest = Join-Path $dir.FullName 'style.css'
  if ((Test-Path $dest) -and ($dir.Name -ne 'Loading animion')) {
    Copy-Item $srcCSS $dest -Force
    $updated++
  }
}
Write-Output "style.css propagated to $updated frontend folders"
