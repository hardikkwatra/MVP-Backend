# Test-Alignment.ps1
# PowerShell script to test alignment between frontend and backend

# Set current location to the script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -Path $scriptPath

# Function to display messages with color
function Write-ColorOutput {
    param(
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [string]$ForegroundColor = "White"
    )
    
    Write-Host $Message -ForegroundColor $ForegroundColor
}

# Check if services are running
function Test-ServicesRunning {
    Write-ColorOutput "Checking if services are running..." -ForegroundColor Cyan
    
    # Check if MongoDB is running
    try {
        $mongoStatus = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
        if ($mongoStatus -and $mongoStatus.Status -eq "Running") {
            Write-ColorOutput "✅ MongoDB is running" -ForegroundColor Green
        } else {
            Write-ColorOutput "⚠️ MongoDB service not found or not running" -ForegroundColor Yellow
            Write-ColorOutput "   Will attempt to connect anyway" -ForegroundColor Yellow
        }
    } catch {
        Write-ColorOutput "⚠️ Unable to check MongoDB service status" -ForegroundColor Yellow
    }
    
    # Check if backend API is accessible
    try {
        $apiCheck = Invoke-RestMethod -Uri "http://localhost:3001/api/debug/health" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($apiCheck) {
            Write-ColorOutput "✅ Backend API is running" -ForegroundColor Green
        } else {
            Write-ColorOutput "❌ Backend API is not responding correctly" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-ColorOutput "❌ Backend API is not running or not accessible" -ForegroundColor Red
        Write-ColorOutput "   Start the backend server with: npm run dev (from Backend directory)" -ForegroundColor Yellow
        return $false
    }
    
    # Check if frontend is accessible
    try {
        $frontendCheck = Invoke-WebRequest -Uri "http://localhost:5173" -Method Get -TimeoutSec 5 -ErrorAction SilentlyContinue
        if ($frontendCheck.StatusCode -eq 200) {
            Write-ColorOutput "✅ Frontend server is running" -ForegroundColor Green
        } else {
            Write-ColorOutput "❌ Frontend server response: $($frontendCheck.StatusCode)" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-ColorOutput "❌ Frontend server is not running or not accessible" -ForegroundColor Red
        Write-ColorOutput "   Start the frontend server with: npm run dev (from Frontend directory)" -ForegroundColor Yellow
        return $false
    }
    
    return $true
}

# Run backend alignment tests
function Test-BackendAlignment {
    Write-ColorOutput "`nRunning Backend Alignment Tests..." -ForegroundColor Cyan
    
    try {
        node ./test-frontend-backend-alignment.js
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Backend alignment tests completed" -ForegroundColor Green
            return $true
        } else {
            Write-ColorOutput "❌ Backend alignment tests failed with exit code $LASTEXITCODE" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-ColorOutput "❌ Error running backend alignment tests: $_" -ForegroundColor Red
        return $false
    }
}

# Run frontend integration tests
function Test-FrontendIntegration {
    Write-ColorOutput "`nRunning Frontend Integration Tests..." -ForegroundColor Cyan
    
    try {
        # Navigate to Frontend directory
        Push-Location -Path "../Frontend"
        
        # Run tests
        npm run test
        
        # Return to original directory
        Pop-Location
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Frontend integration tests completed" -ForegroundColor Green
            return $true
        } else {
            Write-ColorOutput "❌ Frontend integration tests failed with exit code $LASTEXITCODE" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-ColorOutput "❌ Error running frontend integration tests: $_" -ForegroundColor Red
        # Return to original directory in case of error
        if ((Get-Location).Path -ne $scriptPath) {
            Pop-Location
        }
        return $false
    }
}

# Run Cypress E2E tests
function Test-CypressE2E {
    Write-ColorOutput "`nRunning Cypress E2E Tests..." -ForegroundColor Cyan
    
    try {
        # Navigate to Frontend directory
        Push-Location -Path "../Frontend"
        
        # Run tests
        npm run test:e2e
        
        # Return to original directory
        Pop-Location
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput "✅ Cypress E2E tests completed" -ForegroundColor Green
            return $true
        } else {
            Write-ColorOutput "❌ Cypress E2E tests failed with exit code $LASTEXITCODE" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-ColorOutput "❌ Error running Cypress E2E tests: $_" -ForegroundColor Red
        # Return to original directory in case of error
        if ((Get-Location).Path -ne $scriptPath) {
            Pop-Location
        }
        return $false
    }
}

# Display test report
function Show-TestReport {
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Results
    )
    
    $totalTests = $Results.Count
    $passedTests = ($Results.GetEnumerator() | Where-Object { $_.Value -eq $true }).Count
    $failedTests = $totalTests - $passedTests
    $successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
    
    Write-ColorOutput "`n======== ALIGNMENT TEST REPORT ========" -ForegroundColor Cyan
    Write-ColorOutput "Total Tests:   $totalTests" -ForegroundColor White
    Write-ColorOutput "Passed:        $passedTests" -ForegroundColor Green
    Write-ColorOutput "Failed:        $failedTests" -ForegroundColor Red
    Write-ColorOutput "Success Rate:  $successRate%" -ForegroundColor $(if ($successRate -ge 80) { "Green" } elseif ($successRate -ge 50) { "Yellow" } else { "Red" })
    
    Write-ColorOutput "`nDetailed Results:" -ForegroundColor White
    foreach ($test in $Results.GetEnumerator()) {
        $status = if ($test.Value) { "✅ PASSED" } else { "❌ FAILED" }
        $color = if ($test.Value) { "Green" } else { "Red" }
        Write-ColorOutput "$status - $($test.Key)" -ForegroundColor $color
    }
    
    Write-ColorOutput "`n=======================================" -ForegroundColor Cyan
}

# Generate HTML report
function New-HtmlReport {
    param(
        [Parameter(Mandatory=$true)]
        [hashtable]$Results
    )
    
    $totalTests = $Results.Count
    $passedTests = ($Results.GetEnumerator() | Where-Object { $_.Value -eq $true }).Count
    $failedTests = $totalTests - $passedTests
    $successRate = [math]::Round(($passedTests / $totalTests) * 100, 2)
    
    $reportDate = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $reportFileName = "alignment-test-report-$(Get-Date -Format 'yyyyMMddHHmmss').html"
    
    $html = @"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alignment Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #333; }
        .summary { background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        .passed { color: #2e7d32; }
        .failed { color: #c62828; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
        th { background-color: #f2f2f2; }
        tr.success { background-color: #e8f5e9; }
        tr.failure { background-color: #ffebee; }
        .status { font-weight: bold; }
        .meter { height: 20px; background-color: #e0e0e0; border-radius: 10px; overflow: hidden; }
        .meter-fill { height: 100%; background-color: #4caf50; }
    </style>
</head>
<body>
    <h1>Frontend-Backend Alignment Test Report</h1>
    <p>Report generated on $reportDate</p>
    
    <div class="summary">
        <h2>Summary</h2>
        <p>Total Tests: <strong>$totalTests</strong></p>
        <p>Passed: <strong class="passed">$passedTests</strong></p>
        <p>Failed: <strong class="failed">$failedTests</strong></p>
        <div class="meter">
            <div class="meter-fill" style="width: $successRate%;"></div>
        </div>
        <p>Success Rate: <strong>$successRate%</strong></p>
    </div>
    
    <h2>Detailed Results</h2>
    <table>
        <tr>
            <th>Test</th>
            <th>Status</th>
        </tr>
"@

    foreach ($test in $Results.GetEnumerator()) {
        $status = if ($test.Value) { "PASSED" } else { "FAILED" }
        $className = if ($test.Value) { "success" } else { "failure" }
        $statusClass = if ($test.Value) { "passed" } else { "failed" }
        
        $html += @"
        <tr class="$className">
            <td>$($test.Key)</td>
            <td class="status $statusClass">$status</td>
        </tr>
"@
    }

    $html += @"
    </table>
</body>
</html>
"@

    $html | Out-File -FilePath $reportFileName
    Write-ColorOutput "`nHTML Report generated: $reportFileName" -ForegroundColor Cyan
    return $reportFileName
}

# Main test execution
function Start-AlignmentTest {
    Write-ColorOutput "Starting Frontend-Backend Alignment Tests" -ForegroundColor Cyan
    Write-ColorOutput "========================================`n" -ForegroundColor Cyan
    
    # Check if services are running
    $servicesRunning = Test-ServicesRunning
    if (-not $servicesRunning) {
        Write-ColorOutput "`n❌ Critical services are not running. Cannot proceed with tests." -ForegroundColor Red
        return
    }
    
    # Initialize results hashtable
    $testResults = @{
        "Services Running" = $servicesRunning
        "Backend Alignment Tests" = $false
        "Frontend Integration Tests" = $false
        "Cypress E2E Tests" = $false
    }
    
    # Run tests
    $testResults["Backend Alignment Tests"] = Test-BackendAlignment
    $testResults["Frontend Integration Tests"] = Test-FrontendIntegration
    $testResults["Cypress E2E Tests"] = Test-CypressE2E
    
    # Show results
    Show-TestReport -Results $testResults
    
    # Generate HTML report
    $reportFile = New-HtmlReport -Results $testResults
    
    # Try to open the report in browser
    try {
        Invoke-Item $reportFile
    } catch {
        Write-ColorOutput "Unable to open report automatically. Please open manually: $reportFile" -ForegroundColor Yellow
    }
}

# Run the tests
Start-AlignmentTest 