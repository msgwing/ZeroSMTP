<#PSScriptInfo

.VERSION 1.0.1

.GUID 699c5654-5dd9-4914-b032-fb8744cdb6ec

.AUTHOR msgwing.com

.COMPANYNAME msgwing.com

.COPYRIGHT MIT

.TAGS SMTP SMTPAUTH SmtpClientAuthentication BasicAuthentication ExchangeOnline Microsoft365 Office365 Audit ReadOnly Deprecation Relay Printer MFP Scanner 5.7.139

.LICENSEURI https://github.com/msgwing/ZeroSMTP/blob/main/LICENSE

.PROJECTURI https://github.com/msgwing/ZeroSMTP

.RELEASENOTES
Initial release. Reports which Exchange Online mailboxes can still authenticate
with SMTP AUTH before Microsoft disables Basic authentication for it by default
at the end of December 2026. Read-only.

Handles all three states of SmtpClientAuthenticationDisabled, including $null
which inherits the tenant setting - the state that the commonly repeated
`-eq $false` filter misses entirely.

#>

#Requires -Version 5.1

<#
.SYNOPSIS
    Reports which Exchange Online mailboxes can still authenticate with SMTP
    AUTH, and will therefore stop sending when Microsoft disables Basic auth
    for SMTP AUTH at the end of December 2026.

.DESCRIPTION
    Answers one question before December 2026: which mailboxes in this tenant
    can still send with a username and password, and will therefore stop when
    Microsoft disables SMTP AUTH Basic authentication by default at the end of
    that month. Printers, scanners, MFPs, NAS units and scripts are what break,
    and the error they will report is 535 5.7.139.

    Read-only. The script queries configuration and prints a report; it never
    changes a setting, so it is safe to run against production before you have
    decided anything.

    The reason a script is needed rather than one Get-CASMailbox call is that
    SmtpClientAuthenticationDisabled is tri-state, and the middle state is the
    one that catches people out:

        $true   SMTP AUTH explicitly blocked for this mailbox
        $false  SMTP AUTH explicitly allowed for this mailbox
        $null   inherit the tenant-wide setting

    A mailbox showing $null looks harmless in a spreadsheet and is in fact
    fully exposed whenever the tenant allows SMTP AUTH. Filtering only on
    `-eq $false`, which is the usual advice, silently misses every one of them.

.PARAMETER CsvPath
    Also write the per-mailbox results to this path, for handing to whoever
    owns the devices.

.PARAMETER SkipConnect
    Use an Exchange Online session you have already established instead of
    calling Connect-ExchangeOnline.

.EXAMPLE
    .\Find-SmtpAuthExposure.ps1

.EXAMPLE
    .\Find-SmtpAuthExposure.ps1 -CsvPath .\smtp-auth-exposure.csv

.NOTES
    Needs the ExchangeOnlineManagement module:
        Install-Module ExchangeOnlineManagement -Scope CurrentUser

    Configuration is only half the picture. A mailbox that is allowed to use
    SMTP AUTH but has no device pointed at it does not matter, and a device
    nobody remembers configuring does. For actual recent usage, open the
    Exchange admin center: Reports -> Mail flow -> SMTP AUTH client submission
    report. That report is the fastest way to find the forgotten device.

    Part of https://github.com/msgwing/ZeroSMTP
#>

[CmdletBinding()]
param(
    [string] $CsvPath,
    [switch] $SkipConnect
)

$ErrorActionPreference = 'Stop'

function Write-Section {
    param([string] $Text)
    Write-Host ''
    Write-Host $Text -ForegroundColor Cyan
    Write-Host ('-' * $Text.Length) -ForegroundColor DarkGray
}

# --- connect ---------------------------------------------------------------

if (-not (Get-Command Get-CASMailbox -ErrorAction SilentlyContinue)) {
    if (-not (Get-Module -ListAvailable -Name ExchangeOnlineManagement)) {
        throw 'The ExchangeOnlineManagement module is not installed. Run: Install-Module ExchangeOnlineManagement -Scope CurrentUser'
    }
    Import-Module ExchangeOnlineManagement -ErrorAction Stop
}

if (-not $SkipConnect) {
    Write-Host 'Connecting to Exchange Online...' -ForegroundColor DarkGray
    Connect-ExchangeOnline -ShowBanner:$false
}

# --- tenant-wide setting ---------------------------------------------------

Write-Section 'Tenant-wide SMTP AUTH'

$transport = Get-TransportConfig
$tenantBlocks = [bool] $transport.SmtpClientAuthenticationDisabled

if ($tenantBlocks) {
    Write-Host '  SMTP AUTH is DISABLED tenant-wide.' -ForegroundColor Green
    Write-Host '  Only mailboxes with an explicit per-mailbox override can still use it.'
} else {
    Write-Host '  SMTP AUTH is ALLOWED tenant-wide.' -ForegroundColor Yellow
    Write-Host '  Every mailbox inherits that unless it opts out explicitly.'
}

# --- per-mailbox ------------------------------------------------------------

Write-Section 'Per-mailbox configuration'

Write-Host '  Reading mailboxes (this takes a while on a large tenant)...' -ForegroundColor DarkGray
$mailboxes = Get-CASMailbox -ResultSize Unlimited

$results = foreach ($mailbox in $mailboxes) {
    $setting = $mailbox.SmtpClientAuthenticationDisabled

    # Tri-state, resolved to the answer the admin actually wants: can this
    # mailbox authenticate over SMTP AUTH today, and why.
    if ($null -eq $setting) {
        $state = 'Inherits tenant'
        $exposed = -not $tenantBlocks
    } elseif ($setting) {
        $state = 'Explicitly blocked'
        $exposed = $false
    } else {
        $state = 'Explicitly allowed'
        $exposed = $true
    }

    [pscustomobject] @{
        DisplayName = $mailbox.DisplayName
        Address     = $mailbox.PrimarySmtpAddress
        Setting     = $state
        BreaksInDec = $exposed
    }
}

$exposedList = @($results | Where-Object BreaksInDec)
$explicit = @($exposedList | Where-Object Setting -eq 'Explicitly allowed')
$inherited = @($exposedList | Where-Object Setting -eq 'Inherits tenant')

Write-Host ('  {0} mailboxes checked' -f $results.Count)
Write-Host ('  {0} can still use SMTP AUTH' -f $exposedList.Count) -ForegroundColor (
    if ($exposedList.Count) { 'Yellow' } else { 'Green' })

if ($explicit.Count) {
    Write-Host ('    {0} explicitly allowed (someone set this deliberately)' -f $explicit.Count)
}
if ($inherited.Count) {
    Write-Host ('    {0} inheriting the tenant setting - easy to miss' -f $inherited.Count)
}

if ($exposedList.Count) {
    Write-Host ''
    $exposedList |
        Sort-Object Setting, Address |
        Format-Table DisplayName, Address, Setting -AutoSize |
        Out-String |
        Write-Host
}

# --- authentication policies ------------------------------------------------

Write-Section 'Authentication policies'

$policies = @(Get-AuthenticationPolicy -ErrorAction SilentlyContinue)

if (-not $policies.Count) {
    Write-Host '  None defined.'
} else {
    foreach ($policy in $policies) {
        # AllowBasicAuthSmtp is the property that matters here; a policy can
        # block SMTP AUTH for its assigned users regardless of the settings
        # above.
        $allows = $policy.AllowBasicAuthSmtp
        Write-Host ('  {0}: AllowBasicAuthSmtp = {1}' -f $policy.Name, $allows)
    }
}

# --- output -----------------------------------------------------------------

if ($CsvPath) {
    $results | Sort-Object -Property @{ Expression = 'BreaksInDec'; Descending = $true }, Address |
        Export-Csv -Path $CsvPath -NoTypeInformation -Encoding UTF8
    Write-Host ''
    Write-Host ('  Full results written to {0}' -f $CsvPath) -ForegroundColor Cyan
}

Write-Section 'What to do with this'

if ($exposedList.Count) {
    Write-Host @'
  Each exposed mailbox is only a problem if something is actually sending
  through it. Check the SMTP AUTH client submission report in the Exchange
  admin center (Reports -> Mail flow) to see which ones have authenticated
  recently, then for each device or application decide:

    - firmware or software update that adds OAuth 2.0, if the vendor shipped one
    - Direct Send, for internal-only recipients
    - an SMTP relay that still accepts a username and password

  Vendor advisories, including models where the vendor has stated no OAuth
  firmware is planned:
  https://github.com/msgwing/ZeroSMTP/blob/main/docs/AFFECTED-SYSTEMS.md
'@
} else {
    Write-Host '  Nothing found that will break. Worth re-running before December.'
}

Write-Host ''

# Exit code carries the finding, so the script is usable from a scheduled task
# or a pipeline: 0 means nothing exposed, 1 means something needs attention.
if ($exposedList.Count) { exit 1 } else { exit 0 }
