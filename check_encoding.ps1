$bytes = [System.IO.File]::ReadAllBytes('index.html')
Write-Host "First 4 bytes: $($bytes[0]) $($bytes[1]) $($bytes[2]) $($bytes[3])"
Write-Host "File size: $($bytes.Length) bytes"
# Check if the file starts with BOM (239 187 191 for UTF-8 BOM)
if ($bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191) {
    Write-Host "UTF-8 with BOM"
} else {
    Write-Host "No BOM detected"
}
