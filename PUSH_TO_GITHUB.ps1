Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Repo = 'Grar00t/Niyah.Studio'
$ExpectedRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ExpectedRoot

if (-not (Test-Path '.git')) { throw 'git_repository_missing' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git_not_found' }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'gh_not_found' }

git diff --quiet
if ($LASTEXITCODE -ne 0) { throw 'tracked_worktree_not_clean' }
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { throw 'index_not_clean' }

$Head = (git rev-parse HEAD).Trim()
if (-not $Head) { throw 'head_missing' }

$Exists = $true
try {
    gh repo view $Repo --json nameWithOwner *> $null
} catch {
    $Exists = $false
}

if (-not $Exists) {
    gh repo create $Repo --private --source=. --remote=origin --push
    if ($LASTEXITCODE -ne 0) { throw 'repo_create_or_push_failed' }
} else {
    $Remote = (git remote get-url origin 2>$null)
    if (-not $Remote) {
        git remote add origin "https://github.com/$Repo.git"
    } elseif ($Remote -notmatch [regex]::Escape($Repo)) {
        throw "origin_points_elsewhere: $Remote"
    }
    git push -u origin main
    if ($LASTEXITCODE -ne 0) { throw 'push_failed' }
}

$RemoteHead = (git ls-remote origin refs/heads/main | ForEach-Object { ($_ -split '\s+')[0] }).Trim()
if ($RemoteHead -ne $Head) { throw "remote_head_mismatch local=$Head remote=$RemoteHead" }

$Visibility = (gh repo view $Repo --json visibility --jq '.visibility').Trim()
if ($Visibility -ne 'PRIVATE') { throw "visibility_mismatch: $Visibility" }

"REPO_BOOTSTRAP=PASS"
"REPO=$Repo"
"HEAD=$Head"
"VISIBILITY=$Visibility"
