while ($true) {
    Write-Host "Starting app.js at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    node .\bot.js
    Write-Host "App crashed or exited. Restarting in 5 seconds..."
    Start-Sleep -Seconds 5
}