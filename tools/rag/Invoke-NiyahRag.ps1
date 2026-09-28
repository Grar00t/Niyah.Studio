[CmdletBinding(DefaultParameterSetName = 'Query')]
param(
    [Parameter(Mandatory, ParameterSetName = 'Query')][string]$Query,
    [Parameter(Mandatory, ParameterSetName = 'Ingest')][string]$Manifest,
    [Parameter(Mandatory, ParameterSetName = 'Init')][switch]$Initialize,
    [ValidateRange(1,12)][int]$Limit = 6,
    [string]$Distribution = 'Ubuntu',
    [string]$LinuxUser = 'a',
    [string]$Python = '/home/a/niyah-rag/.venv/bin/python'
)
$ErrorActionPreference = 'Stop'
$scriptPath = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot 'rag.py')).Path
$linuxScript = & wsl.exe -d $Distribution -u $LinuxUser -- wslpath -a -u $scriptPath.Replace('\', '/')
if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve RAG script in WSL.' }
$arguments = @('-d', $Distribution, '-u', $LinuxUser, '--', $Python, $linuxScript)
switch ($PSCmdlet.ParameterSetName) {
    'Init' { $arguments += 'init' }
    'Ingest' {
        $manifestPath = (Resolve-Path -LiteralPath $Manifest).Path
        $linuxManifest = & wsl.exe -d $Distribution -u $LinuxUser -- wslpath -a -u $manifestPath.Replace('\', '/')
        if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve source manifest in WSL.' }
        $arguments += @('ingest', '--manifest', $linuxManifest)
    }
    'Query' { $arguments += @('query', $Query, '--limit', [string]$Limit) }
}
& wsl.exe @arguments
exit $LASTEXITCODE
