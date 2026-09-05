# server smoke test: print status code and response snippet per endpoint
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:3001/api/v1'

function Invoke-Api($method, $path, $body) {
  $uri = "$base$path"
  $headers = @{ 'Accept' = 'application/json' }
  $params = @{ Uri = $uri; Method = $method; Headers = $headers; TimeoutSec = 20 }
  if ($body) {
    $params.ContentType = 'application/json; charset=utf-8'
    $params.Body = [System.Text.Encoding]::UTF8.GetBytes(($body | ConvertTo-Json -Depth 6))
  }
  try {
    $res = Invoke-WebRequest @params -UseBasicParsing
    $text = $res.Content
    if ($text.Length -gt 260) { $text = $text.Substring(0, 260) + '...' }
    "[{0}] {1} {2}  traceId={3}" -f $res.StatusCode, $method, $path, $res.Headers['x-trace-id']
    "      $text"
  } catch {
    $r = $_.Exception.Response
    if ($r) {
      $reader = New-Object System.IO.StreamReader($r.GetResponseStream())
      $text = $reader.ReadToEnd()
      if ($text.Length -gt 260) { $text = $text.Substring(0, 260) + '...' }
      "[{0}] {1} {2}" -f [int]$r.StatusCode, $method, $path
      "      $text"
    } else {
      "[ERR] $method $path -> $($_.Exception.Message)"
    }
  }
}

Invoke-Api GET '/public/bootstrap' $null
Invoke-Api GET '/public/products' $null
Invoke-Api GET '/public/products?page=1&pageSize=3&sort=createdAt:desc' $null
Invoke-Api GET '/public/news' $null
Invoke-Api GET '/public/pages/home' $null
Invoke-Api GET '/admin/pages' $null
Invoke-Api POST '/auth/login' @{ username = 'admin'; password = 'Admin@123456' }
Invoke-Api POST '/public/messages' @{ name = 'smoke-user'; phone = '13800000000'; content = 'smoke: please ignore'; type = 'product' }
Invoke-Api GET '/public/videos' $null
Invoke-Api GET '/public/timeline' $null
