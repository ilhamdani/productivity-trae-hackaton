param(
  [string]$ApiBaseUrl = "http://localhost:8000",
  [string]$ApiKey = "dev"
)

$ErrorActionPreference = "Stop"

$headers = @{
  "X-API-Key" = $ApiKey
}

Write-Host "GET $ApiBaseUrl/health"
Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/health" | ConvertTo-Json -Depth 10

Write-Host "GET $ApiBaseUrl/api/v1/me"
Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/api/v1/me" -Headers $headers | ConvertTo-Json -Depth 10

Write-Host "GET $ApiBaseUrl/api/v1/campaigns"
Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/api/v1/campaigns" -Headers $headers | ConvertTo-Json -Depth 10

$payload = @{
  product_name = "Smoke Test Product"
  product_description = "Produk untuk memastikan API berjalan end-to-end."
  price = @{
    currency = "IDR"
    amount = 10000
  }
  category = "smoke"
  brand_tone = "friendly"
  target_location = "Indonesia"
  primary_goal = "Awareness"
}

Write-Host "POST $ApiBaseUrl/api/v1/campaigns"
$created = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/api/v1/campaigns" -Headers $headers -ContentType "application/json" -Body ($payload | ConvertTo-Json -Depth 10)
$created | ConvertTo-Json -Depth 10

Write-Host "GET $ApiBaseUrl/api/v1/campaigns"
Invoke-RestMethod -Method Get -Uri "$ApiBaseUrl/api/v1/campaigns" -Headers $headers | ConvertTo-Json -Depth 10
