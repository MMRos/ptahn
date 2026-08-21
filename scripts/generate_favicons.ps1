Add-Type -AssemblyName System.Drawing

$srcPath = "c:\workspace\ptahn\public\ptahicon.png"
$src = [System.Drawing.Bitmap]::FromFile($srcPath)
$w = $src.Width
$h = $src.Height

function Create-ResizedPng($targetBmpSize, $outPath) {
    $bmp = New-Object System.Drawing.Bitmap($targetBmpSize, $targetBmpSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $scale = [Math]::Min($targetBmpSize / $w, $targetBmpSize / $h)
    $nw = [int]($w * $scale)
    $nh = [int]($h * $scale)
    $ox = [int](($targetBmpSize - $nw) / 2)
    $oy = [int](($targetBmpSize - $nh) / 2)

    $g.DrawImage($src, $ox, $oy, $nw, $nh)
    $g.Dispose()

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
}

# Generate logo192 and logo512
Create-ResizedPng 192 "c:\workspace\ptahn\public\logo192.png"
Create-ResizedPng 512 "c:\workspace\ptahn\public\logo512.png"
Create-ResizedPng 192 "c:\workspace\ptahn\build\logo192.png"
Create-ResizedPng 512 "c:\workspace\ptahn\build\logo512.png"

# Generate 64x64 for favicon.ico
$favBmp = New-Object System.Drawing.Bitmap(64, 64, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$g = [System.Drawing.Graphics]::FromImage($favBmp)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)
$scale = [Math]::Min(64 / $w, 64 / $h)
$nw = [int]($w * $scale)
$nh = [int]($h * $scale)
$ox = [int]((64 - $nw) / 2)
$oy = [int]((64 - $nh) / 2)
$g.DrawImage($src, $ox, $oy, $nw, $nh)
$g.Dispose()

# Convert bitmap to native Icon and save to favicon.ico
$hIcon = $favBmp.GetHicon()
$icon = [System.Drawing.Icon]::FromHandle($hIcon)
$fs = [System.IO.File]::Open("c:\workspace\ptahn\public\favicon.ico", [System.IO.FileMode]::Create)
$icon.Save($fs)
$fs.Close()

$fs2 = [System.IO.File]::Open("c:\workspace\ptahn\build\favicon.ico", [System.IO.FileMode]::Create)
$icon.Save($fs2)
$fs2.Close()

$src.Dispose()
$favBmp.Dispose()

Write-Output "Successfully generated favicon.ico, logo192.png, and logo512.png!"
