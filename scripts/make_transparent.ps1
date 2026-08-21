Add-Type -AssemblyName System.Drawing

$inputPath = "c:\workspace\ptahn\build\ptahicon.jpg"
$src = [System.Drawing.Bitmap]::FromFile($inputPath)

$w = $src.Width
$h = $src.Height

$dst = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$srcData = $src.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$dstData = $dst.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::WriteOnly, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)

$bytes = $w * $h * 4
$srcBuffer = New-Object byte[] $bytes
$dstBuffer = New-Object byte[] $bytes

[System.Runtime.InteropServices.Marshal]::Copy($srcData.Scan0, $srcBuffer, 0, $bytes)

for ($i = 0; $i -lt $bytes; $i += 4) {
    $b = [int]$srcBuffer[$i]
    $g = [int]$srcBuffer[$i+1]
    $r = [int]$srcBuffer[$i+2]
    
    # Check if the pixel belongs to the light neutral background
    $minVal = [Math]::Min($r, [Math]::Min($g, $b))
    $maxVal = [Math]::Max($r, [Math]::Max($g, $b))
    $diff = $maxVal - $minVal
    
    if ($minVal -ge 225 -and $diff -le 24) {
        # Pure background -> 100% Transparent
        $dstBuffer[$i]   = 0
        $dstBuffer[$i+1] = 0
        $dstBuffer[$i+2] = 0
        $dstBuffer[$i+3] = 0
    } elseif ($minVal -ge 205 -and $diff -le 20) {
        # Anti-aliased transition edge
        $factor = (225 - $minVal) / (225 - 205)
        $alpha = [byte]([Math]::Min(255, [Math]::Max(0, [int]($factor * 255))))
        $dstBuffer[$i]   = $b
        $dstBuffer[$i+1] = $g
        $dstBuffer[$i+2] = $r
        $dstBuffer[$i+3] = $alpha
    } else {
        # Opaque emblem / letters / disk
        $dstBuffer[$i]   = $b
        $dstBuffer[$i+1] = $g
        $dstBuffer[$i+2] = $r
        $dstBuffer[$i+3] = 255
    }
}

[System.Runtime.InteropServices.Marshal]::Copy($dstBuffer, 0, $dstData.Scan0, $bytes)

$src.UnlockBits($srcData)
$dst.UnlockBits($dstData)
$src.Dispose()

$outPublic = "c:\workspace\ptahn\public\ptahicon.png"
$outBuild = "c:\workspace\ptahn\build\ptahicon.png"

$dst.Save($outPublic, [System.Drawing.Imaging.ImageFormat]::Png)
$dst.Save($outBuild, [System.Drawing.Imaging.ImageFormat]::Png)

# Generate square icon versions for favicon / logo
$iconSize = 192
$squareBmp = New-Object System.Drawing.Bitmap($iconSize, $iconSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($squareBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

# Fit into square
$scale = [Math]::Min($iconSize / $w, $iconSize / $h)
$nw = [int]($w * $scale)
$nh = [int]($h * $scale)
$ox = [int](($iconSize - $nw) / 2)
$oy = [int](($iconSize - $nh) / 2)

$g.DrawImage($dst, $ox, $oy, $nw, $nh)
$g.Dispose()

$squareBmp.Save("c:\workspace\ptahn\public\logo192.png", [System.Drawing.Imaging.ImageFormat]::Png)
$squareBmp.Save("c:\workspace\ptahn\build\logo192.png", [System.Drawing.Imaging.ImageFormat]::Png)

$squareBmp.Dispose()
$dst.Dispose()

Write-Output "Done! Clean transparency generated successfully."
