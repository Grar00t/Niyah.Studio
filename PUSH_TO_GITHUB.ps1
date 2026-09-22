Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Repo = 'Grar00t/Niyah.Studio'
$ExpectedRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ExpectedRoot

if (-not (Test-Path '.git')) { throw 'git_repository_missing' }
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'git_not_found' }
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) { throw 'gh_not_found' }

$Branch = (git branch --show-current).Trim()
if ($LASTEXITCODE -ne 0 -or $Branch -ne 'main') { throw "expected_main_branch actual=$Branch" }

if (git status --porcelain) { throw 'worktree_not_clean' }

$Head = (git rev-parse HEAD).Trim()
if ($LASTEXITCODE -ne 0 -or -not $Head) { throw 'head_missing' }

$null = gh repo view $Repo --json nameWithOwner 2>$null
$Exists = ($LASTEXITCODE -eq 0)

if (-not $Exists) {
    gh repo create $Repo --private --source=. --remote=origin --push
    if ($LASTEXITCODE -ne 0) { throw 'repo_create_or_push_failed' }
} else {
    $Remote = ''
    $Remote = (git remote get-url origin 2>$null)
    if ($LASTEXITCODE -ne 0 -or -not $Remote) {
        git remote add origin "https://github.com/$Repo.git"
        if ($LASTEXITCODE -ne 0) { throw 'origin_add_failed' }
    } elseif ($Remote -notmatch [regex]::Escape($Repo)) {
        throw "origin_points_elsewhere: $Remote"
    }

    git push -u origin main
    if ($LASTEXITCODE -ne 0) { throw 'push_failed' }
}

$RemoteLine = git ls-remote origin refs/heads/main
if ($LASTEXITCODE -ne 0 -or -not $RemoteLine) { throw 'remote_main_missing' }
$RemoteHead = (($RemoteLine -split '\s+')[0]).Trim()
if ($RemoteHead -ne $Head) { throw "remote_head_mismatch local=$Head remote=$RemoteHead" }

$Visibility = (gh repo view $Repo --json visibility --jq '.visibility').Trim()
if ($LASTEXITCODE -ne 0) { throw 'repo_visibility_query_failed' }
if ($Visibility -ne 'PRIVATE') { throw "visibility_mismatch: $Visibility" }

"REPO_BOOTSTRAP=PASS"
"REPO=$Repo"
"HEAD=$Head"
"VISIBILITY=$Visibility"
