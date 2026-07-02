# deploy-fdveiculos.ps1
# Deploy do sistema FD Veiculos: build local + upload para o VPS.
# As variaveis VITE_* do .env.local sao embutidas no bundle pelo Vite no momento do build.

$VPS      = "72.62.10.198"
$KEY      = "$HOME\.ssh\mkreport_vps"
$WEB_PATH = "/var/www/fdveiculos"
$TMP_PATH = "/tmp/fdveiculos_upload"

$SSH_OPTS = @("-i", $KEY, "-o", "ConnectTimeout=10", "-o", "ServerAliveInterval=5", "-o", "ServerAliveCountMax=3", "-o", "BatchMode=yes")

Write-Host "[1/4] Build da aplicacao..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build falhou. Abortando deploy." -ForegroundColor Red
    exit 1
}

Write-Host "[2/4] Preparando VPS para receber os arquivos..." -ForegroundColor Cyan
$job = Start-Job { param($k,$v,$p) ssh -i $k -o ConnectTimeout=10 -o BatchMode=yes root@$v "rm -rf $p" } -ArgumentList $KEY,$VPS,$TMP_PATH
if (-not (Wait-Job $job -Timeout 10)) {
    Stop-Job $job
    Write-Host "rm -rf ignorado (timeout) - continuando." -ForegroundColor Yellow
}
Remove-Job $job -Force

Write-Host "[3/4] Enviando dist/ para o VPS..." -ForegroundColor Cyan
scp @SSH_OPTS -rq dist "root@${VPS}:${TMP_PATH}"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha no upload. Abortando." -ForegroundColor Red
    exit 1
}

Write-Host "[4/4] Ativando nova versao e recarregando Nginx..." -ForegroundColor Cyan
$cmds = "rm -rf $WEB_PATH && mv $TMP_PATH $WEB_PATH && chown -R www-data:www-data $WEB_PATH && systemctl reload nginx"
ssh @SSH_OPTS root@$VPS $cmds

Write-Host ""
Write-Host "Deploy concluido! https://sistemafdveiculos.com.br" -ForegroundColor Green
