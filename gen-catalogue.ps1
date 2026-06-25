$base = 'public\STICKER\FRAME'
$lapBase = 'public\STICKER\laptop stickers file\laptopp stickers'
$cats = @('MOV','ANM','CAR','SPO','MAR','AST','QOU','ART','VVG','SONM','DEV','VSN','GIR','SHCN','SC','A3','SPL','SPLA','ANM3','ANM2')
$folders = @{
  'MOV'='Movie (MOV)';'ANM'='anime (ANM)';'CAR'='cars  (CAR)';
  'SPO'='sports (SPO)';'MAR'='marvels';'AST'='aesthetic (AST)';
  'QOU'='qoutes (QOU)';'ART'='Artist (ART)';'VVG'='van vogh (vvg)';
  'SONM'='songs mini (sonm)';'DEV'='devotional (DEV)';'VSN'='vision board (VSN)';
  'GIR'='pink lavender mini (GIR)';'SHCN'='shinchan mini (SHCN)';
  'SC'='8x8 song cover';'A3'='a3 size';'SPL'='split posters(SPL)';
  'SPLA'='split srt design';'ANM3'='new anime';'ANM2'='anime mini'
}

# Build M-page entries for all categories
$mEntries = @()
$nEntries = @()
$N_PER_CAT = 10  # entries per category for New Arrivals

foreach ($cc in $cats) {
  $p = Join-Path $base $folders[$cc]
  $files = Get-ChildItem $p -File | Where-Object {$_.Extension -match '\.(jpg|jpeg|png|webp)'} | Sort-Object Name
  foreach ($f in $files) {
    $escaped = $f.Name -replace '"', '\"'
    $mEntries += ('["' + $cc + '","M","' + $escaped + '"]')
  }
  # Take first N_PER_CAT for New Arrivals
  $nFiles = $files | Select-Object -First $N_PER_CAT
  foreach ($f in $nFiles) {
    $escaped = $f.Name -replace '"', '\"'
    $nEntries += ('["' + $cc + '","N","' + $escaped + '"]')
  }
}

# LAP entries
$lapFiles = Get-ChildItem $lapBase -File | Where-Object {$_.Extension -match '\.(jpg|jpeg|png|webp)' -and $_.Name -notlike '*.png.png'} | Sort-Object Name
foreach ($f in $lapFiles) {
  $escaped = $f.Name -replace '"', '\"'
  $mEntries += ('["LAP","M","' + $escaped + '"]')
}
$lapN = $lapFiles | Select-Object -First $N_PER_CAT
foreach ($f in $lapN) {
  $escaped = $f.Name -replace '"', '\"'
  $nEntries += ('["LAP","N","' + $escaped + '"]')
}

$allEntries = $mEntries + $nEntries
$catalogueBody = $allEntries -join ','

Write-Output "M-page entries: $($mEntries.Count)"
Write-Output "N-page entries: $($nEntries.Count)"
Write-Output "Total entries : $($allEntries.Count)"

# Write catalogue-data.js
$js = @"
export const CAT_FOLDERS = {"MOV":"Movie (MOV)","ANM":"anime (ANM)","CAR":"cars  (CAR)","SPO":"sports (SPO)","MAR":"marvels","AST":"aesthetic (AST)","QOU":"qoutes (QOU)","ART":"Artist (ART)","VVG":"van vogh (vvg)","SONM":"songs mini (sonm)","DEV":"devotional (DEV)","VSN":"vision board (VSN)","GIR":"pink lavender mini (GIR)","SHCN":"shinchan mini (SHCN)","SC":"8x8 song cover","A3":"a3 size","SPL":"split posters(SPL)","SPLA":"split srt design","ANM3":"new anime","ANM2":"anime mini","LAP":"laptopp stickers"};
export const CAT_NAMES = {"MOV":"Movie Sticker","ANM":"Anime Sticker","CAR":"Car Sticker","SPO":"Sports Sticker","MAR":"Marvel Sticker","AST":"Aesthetic Sticker","QOU":"Quote Sticker","ART":"Artist Sticker","VVG":"Van Gogh Sticker","SONM":"Song Sticker","DEV":"Devotional Sticker","VSN":"Vision Board Sticker","GIR":"Pink Lavender Sticker","SHCN":"Shinchan Sticker","SC":"Song Cover Sticker","A3":"A3 Poster","SPL":"Split Poster","SPLA":"Split Art Sticker","ANM3":"New Anime Sticker","ANM2":"Anime Mini Sticker","LAP":"Laptop Sticker"};
export const CATALOGUE = [$catalogueBody];
"@

Set-Content -Path 'src\catalogue-data.js' -Value $js -Encoding utf8
Write-Output "catalogue-data.js written successfully"
