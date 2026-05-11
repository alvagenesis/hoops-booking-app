Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$public = Join-Path $root "public"
$outDir = Join-Path $public "marketing"
$outFile = Join-Path $outDir "hoopshq-poster.png"

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir | Out-Null
}

$width = 1080
$height = 1920
$bmp = New-Object System.Drawing.Bitmap($width, $height)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$g.Clear([System.Drawing.Color]::FromArgb(4, 10, 24))

function New-Font($family, $size, $style = [System.Drawing.FontStyle]::Regular) {
    return New-Object System.Drawing.Font($family, $size, $style, [System.Drawing.GraphicsUnit]::Pixel)
}

function New-Rect($x, $y, $w, $h) {
    return New-Object System.Drawing.RectangleF([float]$x, [float]$y, [float]$w, [float]$h)
}

function New-RoundPath($x, $y, $w, $h, $r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function Fill-RoundRect($brush, $x, $y, $w, $h, $r) {
    $path = New-RoundPath $x $y $w $h $r
    $g.FillPath($brush, $path)
    $path.Dispose()
}

function Stroke-RoundRect($pen, $x, $y, $w, $h, $r) {
    $path = New-RoundPath $x $y $w $h $r
    $g.DrawPath($pen, $path)
    $path.Dispose()
}

function Draw-Text($text, $font, $brush, $x, $y, $w, $h, $align = "Near", $line = "Near") {
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::$align
    $sf.LineAlignment = [System.Drawing.StringAlignment]::$line
    $sf.Trimming = [System.Drawing.StringTrimming]::Word
    $g.DrawString($text, $font, $brush, (New-Rect $x $y $w $h), $sf)
    $sf.Dispose()
}

function Draw-List($items, $x, $y, $w, $lineHeight, $brush) {
    $font = New-Font "Segoe UI" 19
    $checkFont = New-Font "Arial" 22 ([System.Drawing.FontStyle]::Bold)
    foreach ($item in $items) {
        $g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(225, 23, 195, 178))), $x, $y + 5, 24, 24)
        Draw-Text "V" $checkFont ([System.Drawing.Brushes]::White) ($x + 2) ($y + 1) 22 24 "Center" "Center"
        Draw-Text $item $font $brush ($x + 40) ($y - 1) ($w - 40) 30
        $y += $lineHeight
    }
}

$white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(246, 250, 255))
$muted = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(184, 199, 222))
$blue = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(47, 168, 255))
$cyan = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(28, 220, 211))
$orange = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 134, 45))
$violet = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(164, 96, 255))
$panel = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(172, 10, 22, 50))
$panelDark = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(214, 7, 16, 38))
$strokeBlue = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(130, 67, 155, 255), 2)
$strokeTeal = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(130, 24, 211, 188), 2)
$strokeViolet = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(130, 164, 96, 255), 2)

$bgPath = Join-Path $public "court-bg.png"
if (Test-Path $bgPath) {
    $court = [System.Drawing.Image]::FromFile($bgPath)
    $dest = New-Object System.Drawing.Rectangle(0, 0, $width, $height)
    $attrs = New-Object System.Drawing.Imaging.ImageAttributes
    $matrix = New-Object System.Drawing.Imaging.ColorMatrix
    $matrix.Matrix33 = 0.42
    $attrs.SetColorMatrix($matrix)
    $g.DrawImage($court, $dest, 0, 0, $court.Width, $court.Height, [System.Drawing.GraphicsUnit]::Pixel, $attrs)
    $attrs.Dispose()
    $court.Dispose()
}

$topOverlay = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Rect 0 0 $width $height), [System.Drawing.Color]::FromArgb(245, 2, 7, 19), [System.Drawing.Color]::FromArgb(210, 8, 31, 60), 90)
$g.FillRectangle($topOverlay, 0, 0, $width, $height)
$topOverlay.Dispose()

$glowBlue = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Rect 0 0 $width 620), [System.Drawing.Color]::FromArgb(80, 25, 107, 255), [System.Drawing.Color]::FromArgb(0, 25, 107, 255), 0)
$g.FillEllipse($glowBlue, 530, 170, 700, 700)
$glowBlue.Dispose()

$logoPath = Join-Path $public "ymca-logo3.png"
if (Test-Path $logoPath) {
    $logo = [System.Drawing.Image]::FromFile($logoPath)
    $g.DrawImage($logo, 50, 54, 145, 115)
    $logo.Dispose()
}

$fontBrand = New-Font "Arial" 48 ([System.Drawing.FontStyle]::Bold)
$fontSmallCaps = New-Font "Segoe UI" 24 ([System.Drawing.FontStyle]::Bold)
$fontHero = New-Font "Impact" 78
$fontSub = New-Font "Segoe UI" 31
$fontCardTitle = New-Font "Arial" 25 ([System.Drawing.FontStyle]::Bold)
$fontCardSub = New-Font "Segoe UI" 17 ([System.Drawing.FontStyle]::Bold)
$fontTiny = New-Font "Segoe UI" 20
$fontCta = New-Font "Arial" 34 ([System.Drawing.FontStyle]::Bold)

Draw-Text "HOOPSHQ" $fontBrand $white 205 66 460 58
Draw-Text "COURT BOOKING SYSTEM" $fontSmallCaps $blue 208 124 430 40
Draw-Text "AI-powered scheduling for YMCA Manila" (New-Font "Segoe UI" 22) $muted 52 178 520 36

Fill-RoundRect $panel 778 76 248 74 18
Draw-Text "SMART" $fontSmallCaps $cyan 815 86 170 27 "Center"
Draw-Text "BOOKING" $fontSmallCaps $white 815 116 170 28 "Center"
$g.DrawEllipse((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(170, 28, 220, 211), 4)), 796, 94, 36, 36)
$g.DrawLine((New-Object System.Drawing.Pen([System.Drawing.Color]::White, 3)), 814, 92, 814, 132)
$g.DrawLine((New-Object System.Drawing.Pen([System.Drawing.Color]::White, 3)), 794, 112, 834, 112)

Draw-Text "BOOK SMARTER." $fontHero $white 52 282 710 92
Draw-Text "PLAY SOONER." $fontHero $blue 52 372 710 92
Draw-Text "MANAGE BETTER." $fontHero $orange 52 462 770 92
$accentPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 28, 220, 211), 5)
$g.DrawLine($accentPen, 55, 585, 228, 585)
$g.DrawLine((New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 47, 168, 255), 5)), 228, 585, 342, 585)

$intro = "Let players reserve courts in minutes while staff track schedules, payments, guests, and revenue in one clean dashboard."
Draw-Text $intro $fontSub $white 52 620 640 168

Fill-RoundRect $panel 645 430 330 320 42
Stroke-RoundRect $strokeBlue 645 430 330 320 42
$phoneBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Rect 692 468 235 246), [System.Drawing.Color]::FromArgb(235, 16, 34, 68), [System.Drawing.Color]::FromArgb(235, 22, 126, 190), 90)
Fill-RoundRect $phoneBrush 692 468 235 246 36
$phoneBrush.Dispose()
Draw-Text "TODAY" (New-Font "Segoe UI" 22 ([System.Drawing.FontStyle]::Bold)) $muted 722 498 110 34
Draw-Text "Indoor Court" (New-Font "Arial" 27 ([System.Drawing.FontStyle]::Bold)) $white 722 535 180 40
Draw-Text "7:00 PM - 9:00 PM" (New-Font "Segoe UI" 21) $cyan 722 577 180 36
Fill-RoundRect (New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(210, 255, 134, 45))) 722 633 155 48 16
Draw-Text "BOOK NOW" (New-Font "Arial" 20 ([System.Drawing.FontStyle]::Bold)) $white 727 643 145 28 "Center"
$ballPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(245, 255, 134, 45), 5)
$g.DrawEllipse($ballPen, 835, 475, 62, 62)
$g.DrawArc($ballPen, 846, 475, 40, 62, 85, 190)
$g.DrawLine($ballPen, 836, 507, 896, 507)

$chipFont = New-Font "Segoe UI" 21 ([System.Drawing.FontStyle]::Bold)
$chips = @(
    @{Text="Real-time slots"; X=515; Y=772; W=196; B=$blue},
    @{Text="Payment reviews"; X=727; Y=772; W=226; B=$orange}
)
foreach ($chip in $chips) {
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(178, 12, 28, 66))
    Fill-RoundRect $brush $chip.X $chip.Y $chip.W 48 14
    Stroke-RoundRect (New-Object System.Drawing.Pen($chip.B.Color, 2)) $chip.X $chip.Y $chip.W 48 14
    Draw-Text $chip.Text $chipFont $white ($chip.X + 12) ($chip.Y + 10) ($chip.W - 24) 28 "Center"
}

Fill-RoundRect $panel 52 805 976 116 24
Stroke-RoundRect $strokeBlue 52 805 976 116 24
$g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 47, 168, 255))), 86, 832, 62, 62)
Draw-Text "V" (New-Font "Arial" 38 ([System.Drawing.FontStyle]::Bold)) $white 92 833 50 52 "Center" "Center"
Draw-Text "CUSTOMER-FRIENDLY. STAFF-READY. VENUE-PROVEN." (New-Font "Arial" 25 ([System.Drawing.FontStyle]::Bold)) $white 174 832 820 35
Draw-Text "HoopsHQ connects booking, payments, and admin controls." (New-Font "Segoe UI" 23) $muted 174 872 775 34

Draw-Text "CORE FEATURES" (New-Font "Arial" 30 ([System.Drawing.FontStyle]::Bold)) $white 0 972 $width 40 "Center"
$g.DrawLine($strokeBlue, 150, 992, 390, 992)
$g.DrawLine($strokeBlue, 690, 992, 930, 992)

$cardY = 1040
$cardW = 306
$cardH = 438
$cards = @(
    @{X=52; Title="PLAYER BOOKING"; Sub="RESERVE COURTS FAST"; Color=$blue; Pen=$strokeBlue; Items=@("Browse courts", "Pick date and time", "Add amenities", "Track status online"); Cta="BOOK WITH CONFIDENCE"},
    @{X=388; Title="AI ASSISTED"; Sub="NATURAL LANGUAGE FLOW"; Color=$violet; Pen=$strokeViolet; Items=@("Describe your booking", "Auto-fill details", "Reduce friction", "Powered by Gemini AI"); Cta="SMARTER RESERVATIONS"},
    @{X=724; Title="ADMIN CONTROL"; Sub="OPERATIONS DASHBOARD"; Color=$cyan; Pen=$strokeTeal; Items=@("Review payments", "Prevent double booking", "Manage schedules", "Monitor revenue"); Cta="RUN THE DAY CLEANLY"}
)

foreach ($card in $cards) {
    Fill-RoundRect $panelDark $card.X $cardY $cardW $cardH 28
    Stroke-RoundRect $card.Pen $card.X $cardY $cardW $cardH 28
    $g.FillEllipse((New-Object System.Drawing.SolidBrush($card.Color.Color)), ($card.X + 112), ($cardY + 38), 82, 82)
Draw-Text "O" (New-Font "Arial" 42 ([System.Drawing.FontStyle]::Bold)) $white ($card.X + 126) ($cardY + 48) 54 54 "Center" "Center"
    Draw-Text $card.Title $fontCardTitle $white ($card.X + 18) ($cardY + 138) ($cardW - 36) 46 "Center"
    Draw-Text $card.Sub $fontCardSub $card.Color ($card.X + 18) ($cardY + 194) ($cardW - 36) 32 "Center"
    Draw-List $card.Items ($card.X + 34) ($cardY + 248) ($cardW - 62) 31 $muted
    $ctaBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush((New-Rect ($card.X + 28) ($cardY + 368) ($cardW - 56) 48), $card.Color.Color, [System.Drawing.Color]::FromArgb(230, 18, 67, 132), 0)
    Fill-RoundRect $ctaBrush ($card.X + 28) ($cardY + 368) ($cardW - 56) 54 16
    $ctaBrush.Dispose()
    Draw-Text $card.Cta (New-Font "Arial" 16 ([System.Drawing.FontStyle]::Bold)) $white ($card.X + 40) ($cardY + 382) ($cardW - 80) 34 "Center"
}

Fill-RoundRect $panel 52 1530 976 116 24
Stroke-RoundRect $strokeTeal 52 1530 976 116 24
$g.FillEllipse((New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(235, 255, 134, 45))), 86, 1556, 64, 64)
Draw-Text ">" (New-Font "Arial" 38 ([System.Drawing.FontStyle]::Bold)) $white 94 1558 50 50 "Center" "Center"
Draw-Text "MAKE EVERY COURT EASIER TO BOOK." (New-Font "Arial" 31 ([System.Drawing.FontStyle]::Bold)) $white 174 1550 700 42
Draw-Text "Guest bookings, payment reviews, and schedules in one flow." (New-Font "Segoe UI" 24) $muted 174 1594 790 44

$footerY = 1692
if (Test-Path $logoPath) {
    $logo2 = [System.Drawing.Image]::FromFile($logoPath)
    $g.DrawImage($logo2, 52, $footerY, 120, 94)
    $logo2.Dispose()
}
Draw-Text "HOOPSHQ" (New-Font "Arial" 36 ([System.Drawing.FontStyle]::Bold)) $white 190 ($footerY + 12) 260 42
Draw-Text "YMCA Manila court reservations" (New-Font "Segoe UI" 22) $muted 190 ($footerY + 56) 360 34
Draw-Text "09XX-XXX-XXXX" (New-Font "Arial" 24 ([System.Drawing.FontStyle]::Bold)) $white 560 ($footerY + 25) 210 34 "Center"
Draw-Text "Book. Pay. Play." (New-Font "Arial" 24 ([System.Drawing.FontStyle]::Bold)) $blue 778 ($footerY + 25) 230 34 "Center"
Draw-Text "HOOPSHQ  -  AI-POWERED COURT BOOKING  -  REAL-TIME AVAILABILITY" (New-Font "Segoe UI" 21) $muted 0 1836 $width 34 "Center"

$bmp.Save($outFile, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose()
$bmp.Dispose()

Write-Output $outFile
