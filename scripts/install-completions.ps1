# PowerShell completion for substack-cli
# Add this to your $PROFILE
# substack-cli completion powershell | Out-String | Invoke-Expression

$scriptBlock = {
    param($wordToComplete, $commandAst, $cursorPosition)
    # Use Commander.js generated completions
    substack-cli completion powershell | Out-String | Invoke-Expression
}
