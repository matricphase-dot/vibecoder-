# rebuild_schema.ps1 – Properly parse and rebuild schema, extracting nested models
$ErrorActionPreference = "Continue"
$schemaPath = "prisma/schema.prisma"
$backupPath = "prisma/schema.prisma.bak-rebuild"
Copy-Item $schemaPath $backupPath -Force
Write-Host "Backup created at $backupPath"

$lines = Get-Content $schemaPath
$output = @()
$extracted = @()

$braceDepth = 0
$currentModelLines = @()
$inModel = $false
$currentModelName = ""
$lineNumber = 0

for ($i = 0; $i -lt $lines.Count; $i++) {
    $line = $lines[$i]
    $trimmed = $line.Trim()
    # Get indent length
    if ($line -match '^(\s*)') {
        $indent = $matches[1].Length
    } else {
        $indent = 0
    }

    # Check for model start
    if ($trimmed -match '^model\s+(\w+)\s*\{') {
        $modelName = $matches[1]
        if ($inModel) {
            # This model is nested inside another model
            Write-Host "Found nested model: $modelName at line $i"
            # Find the closing brace of this nested model
            $nestStart = $i
            $nestDepth = 1
            $j = $i + 1
            while ($j -lt $lines.Count) {
                $nestDepth += ($lines[$j].ToCharArray() | Where-Object {$_ -eq '{'}).Count
                $nestDepth -= ($lines[$j].ToCharArray() | Where-Object {$_ -eq '}'}).Count
                if ($nestDepth -eq 0) { break }
                $j++
            }
            $nestEnd = $j
            $nestedBlock = $lines[$nestStart..$nestEnd]
            # Dedent the block
            $minIndent = [int]::MaxValue
            foreach ($l in $nestedBlock) {
                if ($l.Trim() -ne "") {
                    if ($l -match '^(\s+)') {
                        $lIndent = $matches[1].Length
                        if ($lIndent -lt $minIndent) { $minIndent = $lIndent }
                    } else { $lIndent = 0 }
                }
            }
            $dedented = @()
            foreach ($l in $nestedBlock) {
                if ($l.Trim() -eq "") {
                    $dedented += $l
                } else {
                    $dedented += $l -replace "^\s{$minIndent}", ""
                }
            }
            $extracted += ,$dedented
            # Skip the nested lines in main loop
            $i = $nestEnd
            continue
        } else {
            # Start of top-level model
            Write-Host "Top-level model: $modelName at line $i"
            $inModel = $true
            $currentModelLines = @($line)
            $braceDepth = 1
            $currentModelName = $modelName
            continue
        }
    }

    if ($inModel) {
        $currentModelLines += $line
        $braceDepth += ($line.ToCharArray() | Where-Object {$_ -eq '{'}).Count
        $braceDepth -= ($line.ToCharArray() | Where-Object {$_ -eq '}'}).Count
        if ($braceDepth -eq 0) {
            # End of top-level model
            $output += $currentModelLines
            $inModel = $false
        }
    } else {
        # Outside any model
        $output += $line
    }
}

# Append extracted nested models at the end
if ($extracted.Count -gt 0) {
    $output += ""
    foreach ($block in $extracted) {
        $output += $block
        $output += ""
    }
    Write-Host "Appended $($extracted.Count) nested models."
}

# Write the new schema
$output | Set-Content $schemaPath
Write-Host "Schema rebuilt."

# Run Prisma commands
try {
    Write-Host "`nRunning prisma format..."
    npx prisma format
    if ($LASTEXITCODE -ne 0) { throw "prisma format failed" }

    Write-Host "`nRunning prisma validate..."
    npx prisma validate
    if ($LASTEXITCODE -ne 0) { throw "prisma validate failed" }

    Write-Host "`nGenerating prisma client..."
    npx prisma generate
    if ($LASTEXITCODE -ne 0) { throw "prisma generate failed" }

    Write-Host "`nApplying migration to PostgreSQL..."
    npx prisma migrate dev --name init_postgres
    if ($LASTEXITCODE -ne 0) { throw "prisma migrate dev failed" }

    Write-Host "`n✅ All commands succeeded! Your database is now migrated to PostgreSQL."
} catch {
    Write-Host "`n❌ Error: $_"
}

Read-Host "`nPress Enter to exit"