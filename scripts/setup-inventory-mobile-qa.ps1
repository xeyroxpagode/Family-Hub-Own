#requires -Version 5.1
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$backendEnv = Join-Path $root 'backend\.env'
$frontendEnv = Join-Path $root 'front\mi-front-limpio\.env'
$tempStatus = Join-Path $env:TEMP ('homeplus-supabase-status-' + [guid]::NewGuid().ToString('N') + '.env')

$excludePattern = '(?i)vEthernet|WSL|Docker|Hyper-V|HyperV|Tailscale|ZeroTier|VPN|TAP|TUN|Loopback|Virtual|Bluetooth'

function Test-ExcludedAdapter {
  param([object]$Adapter)
  return ($Adapter.Name -match $excludePattern) -or ($Adapter.InterfaceDescription -match $excludePattern)
}

function Get-LanCandidates {
  $results = New-Object System.Collections.Generic.List[object]
  $routes = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
    Sort-Object RouteMetric, InterfaceMetric
  foreach ($route in $routes) {
    $adapter = Get-NetAdapter -InterfaceIndex $route.InterfaceIndex -ErrorAction SilentlyContinue
    if (-not $adapter) { continue }
    if ($adapter.Status -ne 'Up') { continue }
    if ($adapter.Virtual -eq $true) { continue }
    if (Test-ExcludedAdapter $adapter) { continue }
    $addresses = Get-NetIPAddress -InterfaceIndex $route.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254\.' }
    foreach ($address in $addresses) {
      $results.Add([pscustomobject]@{
        IPAddress            = $address.IPAddress
        AdapterName          = $adapter.Name
        InterfaceDescription = $adapter.InterfaceDescription
        InterfaceIndex       = [int]$route.InterfaceIndex
        RouteMetric          = [int]$route.RouteMetric
        InterfaceMetric      = [int]$route.InterfaceMetric
      })
    }
  }
  return @($results |
    Group-Object IPAddress |
    ForEach-Object { $_.Group | Sort-Object RouteMetric, InterfaceMetric | Select-Object -First 1 } |
    Sort-Object RouteMetric, InterfaceMetric)
}

function Get-PhysicalCandidates {
  $results = New-Object System.Collections.Generic.List[object]
  $adapters = Get-NetAdapter -ErrorAction SilentlyContinue | Where-Object {
    $_.Status -eq 'Up' -and $_.Virtual -ne $true -and -not (Test-ExcludedAdapter $_)
  }
  foreach ($adapter in $adapters) {
    $addresses = Get-NetIPAddress -InterfaceIndex $adapter.InterfaceIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue |
      Where-Object { $_.IPAddress -notmatch '^127\.' -and $_.IPAddress -notmatch '^169\.254\.' }
    foreach ($address in $addresses) {
      $results.Add([pscustomobject]@{
        IPAddress            = $address.IPAddress
        AdapterName          = $adapter.Name
        InterfaceDescription = $adapter.InterfaceDescription
        InterfaceIndex       = [int]$adapter.InterfaceIndex
        RouteMetric          = $null
        InterfaceMetric      = $null
      })
    }
  }
  return @($results)
}

function Stop-Configuration {
  param([string]$Reason, [object[]]$Candidates)
  Write-Host ''
  Write-Host 'STOP CONFIGURATION'
  Write-Host $Reason
  if ($Candidates -and $Candidates.Count -gt 0) {
    Write-Host ''
    Write-Host 'Candidate IPv4 addresses:'
    foreach ($candidate in $Candidates) {
      $metric = if ($null -ne $candidate.RouteMetric) { " route-metric=$($candidate.RouteMetric)" } else { '' }
      Write-Host ("  {0}  adapter={1}  desc={2}{3}" -f $candidate.IPAddress, $candidate.AdapterName, $candidate.InterfaceDescription, $metric)
    }
  } else {
    Write-Host 'No physical IPv4 candidates were found.'
  }
  Write-Host ''
  Write-Host 'No files were modified. Connect the PC to the local Wi-Fi/LAN and try again.'
  exit 1
}

function Merge-EnvFile {
  param(
    [string]$Path,
    [System.Collections.IDictionary]$Values
  )
  $lines = @()
  if (Test-Path -LiteralPath $Path) {
    $lines = [System.IO.File]::ReadAllLines($Path)
  }
  $seen = @{}
  $output = New-Object System.Collections.Generic.List[string]
  foreach ($line in $lines) {
    if ($line -match '^\s*#' -or $line.Trim().Length -eq 0) {
      $output.Add($line)
      continue
    }
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=') {
      $key = $Matches[1]
      if ($Values.Contains($key)) {
        $output.Add(('{0}={1}' -f $key, $Values[$key]))
        $seen[$key] = $true
        continue
      }
    }
    $output.Add($line)
  }
  foreach ($key in $Values.Keys) {
    if (-not $seen.ContainsKey($key)) {
      $output.Add(('{0}={1}' -f $key, $Values[$key]))
    }
  }
  $directory = Split-Path -Parent $Path
  if (-not (Test-Path -LiteralPath $directory)) {
    New-Item -ItemType Directory -Path $directory | Out-Null
  }
  [System.IO.File]::WriteAllLines($Path, $output, (New-Object System.Text.UTF8Encoding($false)))
}

function Read-EnvMap {
  param([string]$Path)
  $map = @{}
  if (-not (Test-Path -LiteralPath $Path)) { return $map }
  foreach ($line in [System.IO.File]::ReadAllLines($Path)) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
      $key = $Matches[1]
      $value = $Matches[2].Trim()
      if ($value.Length -ge 2) {
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
          $value = $value.Substring(1, $value.Length - 2)
        }
      }
      $map[$key] = $value
    }
  }
  return $map
}

function Assert-EnvKey {
  param([hashtable]$Map, [string]$Key, [string]$Label)
  if (-not $Map.ContainsKey($Key) -or [string]::IsNullOrWhiteSpace($Map[$Key])) {
    throw ("{0} is missing {1}." -f $Label, $Key)
  }
}

Write-Host 'Detecting physical LAN IPv4...'
$candidates = Get-LanCandidates
if ($candidates.Count -eq 0) {
  Stop-Configuration 'Could not find a physical IPv4 address with a default gateway.' (Get-PhysicalCandidates)
}
$LanIp = $candidates[0].IPAddress
if ($candidates.Count -gt 1) {
  $runnerUp = $candidates[1]
  $best = $candidates[0]
  if ($runnerUp.RouteMetric -eq $best.RouteMetric -and $runnerUp.InterfaceMetric -eq $best.InterfaceMetric -and $runnerUp.InterfaceIndex -ne $best.InterfaceIndex) {
    Stop-Configuration 'Multiple physical adapters share the lowest default-route metric.' $candidates
  }
}
Write-Host ("LAN IP detected: {0}" -f $LanIp)

Write-Host 'Checking local Supabase...'
$previousErrorAction = $ErrorActionPreference
$ErrorActionPreference = 'Continue'
try {
  & supabase status *> $null
  $supabaseStatusExit = $LASTEXITCODE
}
finally {
  $ErrorActionPreference = $previousErrorAction
}
if ($supabaseStatusExit -ne 0) {
  Write-Host 'Local Supabase is not running. Starting it...'
  $ErrorActionPreference = 'Continue'
  try {
    & supabase start
    $supabaseStartExit = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $previousErrorAction
  }
  if ($supabaseStartExit -ne 0) {
    Stop-Configuration 'Local Supabase could not be started.' @()
  }
}

try {
  Write-Host 'Reading local Supabase credentials without printing them...'
  $ErrorActionPreference = 'Continue'
  try {
    & supabase status -o env *> $tempStatus
    $supabaseEnvExit = $LASTEXITCODE
  }
  finally {
    $ErrorActionPreference = $previousErrorAction
  }
  if ($supabaseEnvExit -ne 0) {
    throw 'supabase status -o env failed.'
  }

  $status = @{}
  foreach ($line in [System.IO.File]::ReadAllLines($tempStatus)) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
      $key = $Matches[1]
      $value = $Matches[2].Trim()
      if ($value.Length -ge 2) {
        if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
          $value = $value.Substring(1, $value.Length - 2)
        }
      }
      $status[$key] = $value
    }
  }

  function Get-StatusValue {
    param([string[]]$Names)
    foreach ($name in $Names) {
      if ($status.ContainsKey($name) -and -not [string]::IsNullOrWhiteSpace($status[$name])) {
        return $status[$name]
      }
    }
    return $null
  }

  $anonKey = Get-StatusValue @('ANON_KEY', 'SUPABASE_ANON_KEY')
  $serviceRoleKey = Get-StatusValue @('SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE_KEY')
  if (-not $anonKey -or -not $serviceRoleKey) {
    throw 'Local Supabase status did not expose the anonymous and service role keys.'
  }

  $backendValues = [ordered]@{
    PORT                       = '3000'
    NODE_ENV                   = 'development'
    SUPABASE_URL               = 'http://127.0.0.1:56221'
    SUPABASE_ANON_KEY          = $anonKey
    SUPABASE_SERVICE_ROLE_KEY  = $serviceRoleKey
  }
  Merge-EnvFile -Path $backendEnv -Values $backendValues

  $frontendValues = [ordered]@{
    EXPO_PUBLIC_API_URL              = ('http://{0}:3000' -f $LanIp)
    EXPO_PUBLIC_SUPABASE_URL         = ('http://{0}:56221' -f $LanIp)
    EXPO_PUBLIC_SUPABASE_ANON_KEY    = $anonKey
  }
  Merge-EnvFile -Path $frontendEnv -Values $frontendValues

  $backend = Read-EnvMap $backendEnv
  Assert-EnvKey $backend 'PORT' 'backend/.env'
  Assert-EnvKey $backend 'NODE_ENV' 'backend/.env'
  Assert-EnvKey $backend 'SUPABASE_URL' 'backend/.env'
  Assert-EnvKey $backend 'SUPABASE_ANON_KEY' 'backend/.env'
  Assert-EnvKey $backend 'SUPABASE_SERVICE_ROLE_KEY' 'backend/.env'

  $frontend = Read-EnvMap $frontendEnv
  Assert-EnvKey $frontend 'EXPO_PUBLIC_API_URL' 'front/mi-front-limpio/.env'
  Assert-EnvKey $frontend 'EXPO_PUBLIC_SUPABASE_URL' 'front/mi-front-limpio/.env'
  Assert-EnvKey $frontend 'EXPO_PUBLIC_SUPABASE_ANON_KEY' 'front/mi-front-limpio/.env'

  $apiUrl = $frontend['EXPO_PUBLIC_API_URL']
  $supabaseUrl = $frontend['EXPO_PUBLIC_SUPABASE_URL']
  if (-not $apiUrl.Contains($LanIp) -or -not $supabaseUrl.Contains($LanIp)) {
    throw 'Frontend URLs do not use the detected LAN IP.'
  }
  if ($apiUrl -match 'localhost|127\.0\.0\.1' -or $supabaseUrl -match 'localhost|127\.0\.0\.1') {
    throw 'Frontend URLs must not use localhost/127.0.0.1 for mobile devices.'
  }

  Write-Host ''
  Write-Host 'Mobile QA configured.'
  Write-Host ''
  Write-Host ('LAN IP: {0}' -f $LanIp)
  Write-Host ''
  Write-Host ('Backend: http://{0}:3000' -f $LanIp)
  Write-Host ('Supabase: http://{0}:56221' -f $LanIp)
  Write-Host ''
  Write-Host 'Start backend:'
  Write-Host '  cd backend'
  Write-Host '  npm start'
  Write-Host ''
  Write-Host 'Start Expo:'
  Write-Host '  cd front/mi-front-limpio'
  Write-Host '  npx expo start --lan --clear'
  Write-Host ''
  Write-Host 'In app:'
  Write-Host '  Mas -> QA / Desarrollo -> Inventario V2'
}
finally {
  if (Test-Path -LiteralPath $tempStatus) {
    Remove-Item -LiteralPath $tempStatus -Force -ErrorAction SilentlyContinue
  }
}
