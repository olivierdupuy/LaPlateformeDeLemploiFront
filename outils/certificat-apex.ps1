<#
.SYNOPSIS
    Emet le certificat du nom nu « laplateformedelemploi.com » et le pose
    sur IIS. A executer SUR LE SERVEUR.

.DESCRIPTION
    Le site repond sur « www » et sur « api ». Le nom nu, lui, pointe
    encore sur le service de redirection de Gandi, qui ne parle que HTTP :
    « https://laplateformedelemploi.com » refuse la connexion. Un lien
    ecrit ainsi echoue sechement, sans repli possible.

    UN CERTIFICAT A PART, ET C'EST VOULU
    Le certificat en place est mutualise entre huit sites de la machine —
    codingpix, fleettracker, syndikit, talio, pulse-rest, loliveduverger,
    voxlyo et celui-ci. Le reemettre pour y ajouter un nom ferait courir a
    sept sites etrangers le risque d'une erreur qui ne les concerne pas.
    On emet donc un certificat separe, qui ne porte que le nom nu, et on
    le lie au seul nom nu. Le SNI permet a IIS de servir un certificat
    different par nom d'hote sur le meme port.

    LA VALIDATION PASSE PAR « WWW », AVANT MEME LE CHANGEMENT DNS
    C'est le point qui rend l'operation possible aujourd'hui. La
    redirection de Gandi PRESERVE LE CHEMIN :

        http://laplateformedelemploi.com/.well-known/acme-challenge/X
          → 301 → https://www.laplateformedelemploi.com/.well-known/…/X

    et l'autorite de certification suit les redirections pendant une
    validation HTTP-01. Le jeton depose dans la racine du site « www »
    repond donc pour le nom nu. Le certificat peut etre emis d'abord, le
    DNS bascule ensuite : a aucun moment le site n'est plus casse qu'il ne
    l'est deja.

    CE QUI RESTE A FAIRE A LA MAIN, APRES
      · basculer l'enregistrement A du nom nu vers 162.19.96.47 et retirer
        la redirection Gandi ;
      · lier le nom nu sur le port 80 au site du front, pour que les
        renouvellements ultérieurs se valident sans passer par Gandi.
    La regle « Apex vers www » du « web.config » fait le reste : elle
    renvoie le nom nu vers « www » en HTTPS, et elle epargne le chemin de
    validation.

.PARAMETER Site
    Nom du site IIS qui sert le front.

.PARAMETER Nom
    Le nom nu a certifier.

.PARAMETER Courriel
    Adresse de contact pour l'autorite : c'est la qu'arrivent les avis
    d'expiration si un renouvellement echoue.

.PARAMETER Essai
    Passe par le bac a sable de Let's Encrypt. Le certificat obtenu n'est
    reconnu par aucun navigateur — il ne sert qu'a verifier que la
    validation aboutit. A FAIRE EN PREMIER : l'autorite refuse cinq echecs
    de validation par heure sur un meme nom, et une tentative gachee se
    paie en attente.

.PARAMETER Wacs
    Chemin de « wacs.exe » (win-acme).

.EXAMPLE
    .\certificat-apex.ps1 -Site 'laplateformedelemploi' -Courriel 'odupuy66@gmail.com' -Essai
    .\certificat-apex.ps1 -Site 'laplateformedelemploi' -Courriel 'odupuy66@gmail.com'
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory)][string] $Site,
    [Parameter(Mandatory)][string] $Courriel,
    [string] $Nom = 'laplateformedelemploi.com',
    [switch] $Essai,
    [string] $Wacs = 'C:\Program Files\win-acme\wacs.exe'
)

$ErrorActionPreference = 'Stop'

# Le temoin est un fichier fixe, livre avec le site, sans extension —
# exactement la forme d'un jeton. Sa phrase est connue des deux cotes.
$TemoinNom     = 'verification-chaine'
$TemoinAttendu = 'chaine-de-validation-acme-operationnelle'

function Titre($texte) { Write-Host "`n── $texte ──" -ForegroundColor Cyan }
function Bien($texte)  { Write-Host "  OK    $texte" -ForegroundColor Green }
function Mal($texte)   { Write-Host "  ECHEC $texte" -ForegroundColor Red }

# ══════════════════════════════════════════════════════════
#  1. La chaine repond-elle ?
#
#  On ne demande rien a l'autorite tant que le trajet n'est pas prouve.
#  Une validation qui echoue consomme un des cinq essais horaires et ne
#  dit pas toujours pourquoi ; le temoin, lui, le dit tout de suite.
# ══════════════════════════════════════════════════════════

Titre "Verification de la chaine de validation"

$adresse = "http://$Nom/.well-known/acme-challenge/$TemoinNom"
Write-Host "  $adresse"

try {
    $reponse = Invoke-WebRequest -Uri $adresse -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 40
} catch {
    Mal "le temoin est injoignable : $($_.Exception.Message)"
    Write-Host @"

  Le nom nu ne mene nulle part, ou la redirection est tombee. Rien ne
  sert d'emettre : la validation echouerait de la meme facon.
"@
    exit 1
}

$recu = ($reponse.Content -split "`n")[0].Trim()

if ($recu -ne $TemoinAttendu) {
    Mal "le temoin ne rend pas ce qu'il devrait"
    Write-Host "  attendu : $TemoinAttendu"
    Write-Host "  recu    : $(if ($recu.Length -gt 90) { $recu.Substring(0,90) + '…' } else { $recu })"
    Write-Host @"

  Deux causes possibles, et elles se distinguent a l'oeil :
    · du HTML — une regle de reecriture a repris la main sur le chemin
      de validation ;
    · une erreur 404.3 — la correspondance de type pour les fichiers
      sans extension manque au « web.config ». C'est le defaut qui
      empechait toute validation avant aout 2026 ; il est corrige dans
      le workflow de deploiement, bloc « .well-known/acme-challenge ».
"@
    exit 1
}

Bien "le nom nu sert le temoin, chemin preserve"
Write-Host "        (la redirection vers « www » a conserve le chemin, c'est ce qui rend l'emission possible sans changer le DNS)"

# ══════════════════════════════════════════════════════════
#  2. De quoi travailler
# ══════════════════════════════════════════════════════════

Titre "Le necessaire"

if (-not (Test-Path $Wacs)) {
    Mal "win-acme introuvable a « $Wacs »"
    Write-Host @"

  Installez-le, ou indiquez son chemin avec « -Wacs ». Il se telecharge
  sur https://www.win-acme.com/ ; la version « pluggable » suffit.
"@
    exit 1
}
Bien "win-acme : $Wacs"

Import-Module WebAdministration -ErrorAction Stop

$siteIis = Get-Website | Where-Object { $_.Name -eq $Site }
if (-not $siteIis) {
    Mal "aucun site IIS nomme « $Site »"
    Write-Host "  Sites presents : $((Get-Website | Select-Object -ExpandProperty Name) -join ', ')"
    exit 1
}

$racine = [Environment]::ExpandEnvironmentVariables($siteIis.PhysicalPath)
Bien "site « $Site » (id $($siteIis.Id)) → $racine"

if (-not (Test-Path (Join-Path $racine '.well-known\acme-challenge'))) {
    Write-Host "  NOTE  le dossier de validation n'existe pas encore dans la racine ;" -ForegroundColor Yellow
    Write-Host "        win-acme le creera. Le temoin ayant repondu, le trajet est bon." -ForegroundColor Yellow
}

# ══════════════════════════════════════════════════════════
#  3. L'emission
# ══════════════════════════════════════════════════════════

Titre $(if ($Essai) { "Emission dans le bac a sable" } else { "Emission du certificat" })

$arguments = @(
    '--target', 'manual',
    '--host', $Nom,
    '--validation', 'filesystem',
    '--webroot', $racine,
    '--store', 'certificatestore',
    '--installation', 'iis',
    '--installationsiteid', $siteIis.Id,
    '--accepttos',
    '--emailaddress', $Courriel
)

if ($Essai) {
    # Le bac a sable delivre un certificat signe par une autorite que
    # personne ne reconnait. C'est exactement ce qu'on veut pour un essai :
    # il prouve que la validation aboutit sans rien consommer du quota reel.
    $arguments += @('--baseuri', 'https://acme-staging-v02.api.letsencrypt.org/')
}

Write-Host "  $Wacs $($arguments -join ' ')`n"
& $Wacs @arguments
$code = $LASTEXITCODE

if ($code -ne 0) {
    Mal "win-acme s'est arrete avec le code $code"
    Write-Host "  Son journal se trouve dans « %programdata%\win-acme\ »."
    exit $code
}

Bien "certificat emis et enregistre"

if ($Essai) {
    Write-Host @"

  C'etait un essai. Le certificat obtenu n'est reconnu par aucun
  navigateur : retirez-le du site, puis relancez sans « -Essai ».
"@
    exit 0
}

# ══════════════════════════════════════════════════════════
#  4. Ce qu'on voit depuis dehors
# ══════════════════════════════════════════════════════════

Titre "Verification"

$liaison = Get-WebBinding -Name $Site -Protocol https |
           Where-Object { $_.bindingInformation -like "*:443:$Nom" }

if ($liaison) {
    Bien "liaison HTTPS presente pour « $Nom »"
} else {
    Write-Host "  NOTE  aucune liaison HTTPS sur « $Nom » : win-acme ne l'a pas creee." -ForegroundColor Yellow
    Write-Host "        A ajouter sur le site « $Site », port 443, nom d'hote « $Nom », SNI actif," -ForegroundColor Yellow
    Write-Host "        en choisissant le certificat qui vient d'etre emis." -ForegroundColor Yellow
}

Write-Host @"

  Le certificat ne sera visible depuis l'exterieur qu'une fois
  l'enregistrement A du nom nu bascule vers 162.19.96.47. Tant qu'il
  pointe sur Gandi, « https://$Nom » continue de refuser la connexion —
  c'est-a-dire l'etat d'aujourd'hui, ni mieux ni pire.

  Une fois le DNS bascule, depuis n'importe ou :

      curl -sS -o NUL -w "%{http_code}\n" https://$Nom/
      → 301 vers https://www.$Nom/

"@
