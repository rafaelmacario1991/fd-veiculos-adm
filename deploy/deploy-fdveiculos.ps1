# deploy-fdveiculos.ps1
# Deploy do sistema FD Veiculos: build local + upload para o VPS.
# As variaveis VITE_* do .env.local sao embutidas no bundle pelo Vite no momento do build.

$VPS      = "72.62.10.198"
$KEY      = "$HOME\.ssh\mkreport_vps"
$WEB_PATH = "/var/www/fdveiculos"
$TMP_PATH = "/tmp/fdveiculos_upload"

Write-Host "[1/4] Build da aplicacao..." -ForegroundColor Cyan
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build falhou. Abortando deploy." -ForegroundColor Red
    exit 1
}

Write-Host "[2/4] Preparando VPS para receber os arquivos..." -ForegroundColor Cyan
ssh -i $KEY root@$VPS "rm -rf $TMP_PATH"

Write-Host "[3/4] Enviando dist/ para o VPS..." -ForegroundColor Cyan
scp -i $KEY -rq dist "root@${VPS}:${TMP_PATH}"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha no upload. Abortando." -ForegroundColor Red
    exit 1
}

Write-Host "[4/4] Ativando nova versao e recarregando Nginx..." -ForegroundColor Cyan
ssh -i $KEY root@$VPS @"
rm -rf $WEB_PATH
mv $TMP_PATH $WEB_PATH
chown -R www-data:www-data $WEB_PATH
systemctl reload nginx
"@

Write-Host ""
Write-Host "Deploy concluido! https://sistemafdveiculos.com.br" -ForegroundColor Green
