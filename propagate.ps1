$frontendBase = 'frontend'
$srcCatalogue = 'src\catalogue-data.js'
$srcCatalogueJS = 'src\catalogue.js'

$dirs = Get-ChildItem $frontendBase -Recurse -Directory
$updatedData = 0
$updatedJS = 0

foreach ($dir in $dirs) {
  $dataDest = Join-Path $dir.FullName 'catalogue-data.js'
  $jsDest = Join-Path $dir.FullName 'catalogue.js'

  if (Test-Path $dataDest) {
    Copy-Item $srcCatalogue $dataDest -Force
    $updatedData++
  }
  if (Test-Path $jsDest) {
    Copy-Item $srcCatalogueJS $jsDest -Force
    $updatedJS++
  }
}

Write-Output "catalogue-data.js propagated to $updatedData frontend folders"
Write-Output "catalogue.js propagated to $updatedJS frontend folders"
