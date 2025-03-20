# PowerShell test script for backend
$TEST_ID = "test-user-ps-$(Get-Date -UFormat %s)"
$TEST_WALLET = "0xTestWallet$(Get-Date -UFormat %s)"
$BASE_URL = "http://localhost:5000/api"

Write-Host "Starting backend tests with PowerShell"
Write-Host "Test ID: $TEST_ID"
Write-Host "Test Wallet: $TEST_WALLET"
Write-Host "================================================"

# Test 1: Health check
Write-Host "`nTest 1: Health check"
try {
    $health = Invoke-RestMethod -Uri "$BASE_URL/health" -Method Get
    Write-Host "Health check success: $($health | ConvertTo-Json)"
} catch {
    Write-Host "Health check failed: $_" -ForegroundColor Red
}

# Test 2: Debug routes test
Write-Host "`nTest 2: Debug API health check"
try {
    $debugHealth = Invoke-RestMethod -Uri "$BASE_URL/debug/health" -Method Get
    Write-Host "Debug health check success: $($debugHealth | ConvertTo-Json)"
} catch {
    Write-Host "Debug health check failed: $_" -ForegroundColor Red
}

# Test 3: Create user via debug API
Write-Host "`nTest 3: Create user"
try {
    $body = @{
        privyId = $TEST_ID
    } | ConvertTo-Json
    
    $createUser = Invoke-RestMethod -Uri "$BASE_URL/debug/create-user" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Create user success: $($createUser | ConvertTo-Json -Depth 3)"
} catch {
    Write-Host "Create user failed: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode
    if ($_.Exception.Response) {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errResp = $streamReader.ReadToEnd()
        $streamReader.Close()
        Write-Host $errResp
    }
}

# Test 4: Connect wallet via debug API
Write-Host "`nTest 4: Connect wallet (debug)"
try {
    $body = @{
        privyId = $TEST_ID
        walletAddress = $TEST_WALLET
    } | ConvertTo-Json
    
    $connectWallet = Invoke-RestMethod -Uri "$BASE_URL/debug/connect" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Connect wallet success: $($connectWallet | ConvertTo-Json -Depth 3)"
} catch {
    Write-Host "Connect wallet failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errResp = $streamReader.ReadToEnd()
        $streamReader.Close()
        Write-Host $errResp
    }
}

# Test 5: Get wallet status via debug API
Write-Host "`nTest 5: Get wallet status (debug)"
try {
    $walletStatus = Invoke-RestMethod -Uri "$BASE_URL/debug/status/$TEST_ID" -Method Get
    Write-Host "Wallet status success: $($walletStatus | ConvertTo-Json -Depth 3)"
} catch {
    Write-Host "Wallet status failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errResp = $streamReader.ReadToEnd()
        $streamReader.Close()
        Write-Host $errResp
    }
}

# Test 6: Connect wallet via main wallet API
Write-Host "`nTest 6: Connect wallet (main API)"
try {
    $body = @{
        privyId = "$($TEST_ID)-main"
        walletAddress = "$($TEST_WALLET)-main"
    } | ConvertTo-Json
    
    $connectWalletMain = Invoke-RestMethod -Uri "$BASE_URL/wallet/connect" -Method Post -Body $body -ContentType "application/json"
    Write-Host "Connect wallet (main) success: $($connectWalletMain | ConvertTo-Json -Depth 3)"
} catch {
    Write-Host "Connect wallet (main) failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errResp = $streamReader.ReadToEnd()
        $streamReader.Close()
        Write-Host $errResp
    }
}

# Test 7: Get wallet status via main wallet API
Write-Host "`nTest 7: Get wallet status (main API)"
try {
    $walletStatusMain = Invoke-RestMethod -Uri "$BASE_URL/wallet/status/$($TEST_ID)-main" -Method Get
    Write-Host "Wallet status (main) success: $($walletStatusMain | ConvertTo-Json -Depth 3)"
} catch {
    Write-Host "Wallet status (main) failed: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $streamReader = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream())
        $errResp = $streamReader.ReadToEnd()
        $streamReader.Close()
        Write-Host $errResp
    }
}

Write-Host "`nTests completed!" 