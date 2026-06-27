$srcStyle  = 'src\style.css'
$srcHome   = 'src\home.css'
$srcLoader = 'src\Loading animion\style.css'
$frontendBase = 'frontend'
$styleCount = 0
$homeCount  = 0
$loaderCount = 0
$dirs = Get-ChildItem $frontendBase -Recurse -Directory
foreach ($dir in $dirs) {
  if ($dir.Name -eq 'Loading animion') {
    $loaderDest = Join-Path $dir.FullName 'style.css'
    if (Test-Path $loaderDest) {
      Copy-Item $srcLoader $loaderDest -Force
      $loaderCount++
    }
  } else {
    $styleDest = Join-Path $dir.FullName 'style.css'
    if (Test-Path $styleDest) {
      Copy-Item $srcStyle $styleDest -Force
      $styleCount++
    }
    $homeDest = Join-Path $dir.FullName 'home.css'
    if (Test-Path $homeDest) {
      Copy-Item $srcHome $homeDest -Force
      $homeCount++
    }
  }
}
Write-Output "style.css propagated to $styleCount frontend folders"
Write-Output "home.css  propagated to $homeCount  frontend folders"
Write-Output "Loading animion/style.css propagated to $loaderCount folders"
