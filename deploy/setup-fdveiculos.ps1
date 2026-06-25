# setup-fdveiculos.ps1
# Executar UMA VEZ para configurar o Nginx e obter o certificado SSL.
# Pre-requisito: DNS do dominio ja deve apontar para o VPS (A record @ e www -> 72.62.10.198)

$VPS   = "72.62.10.198"
$KEY   = "$HOME\.ssh\mkreport_vps"
$NGINX = "/etc/nginx/sites-available/fdveiculos"
$EMAIL = "suporte@mkautosolution.cloud"

Write-Host "[1/4] Criando diretorio da aplicacao no VPS..." -ForegroundColor Cyan
ssh -i $KEY root@$VPS "mkdir -p /var/www/fdveiculos"

Write-Host "[2/4] Copiando config do Nginx..." -ForegroundColor Cyan
scp -i $KEY deploy\fdveiculos-nginx.conf "root@${VPS}:${NGINX}"

Write-Host "[3/4] Habilitando site e recarregando Nginx..." -ForegroundColor Cyan
ssh -i $KEY root@$VPS @"
ln -sf $NGINX /etc/nginx/sites-enabled/fdveiculos
nginx -t && systemctl reload nginx
"@

Write-Host "[4/4] Obtendo certificado SSL (Let's Encrypt)..." -ForegroundColor Cyan
ssh -i $KEY root@$VPS "certbot --nginx -d sistemafdveiculos.com.br -d www.sistemafdveiculos.com.br --non-interactive --agree-tos -m $EMAIL"

Write-Host ""
Write-Host "Setup concluido!" -ForegroundColor Green
Write-Host "Agora rode: .\deploy\deploy-fdveiculos.ps1" -ForegroundColor Yellow
