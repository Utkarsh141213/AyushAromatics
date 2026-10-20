# Ayush Aromatics: khud website deploy karne ki guide

Last checked: **20 October 2026 (India time)**.

Is guide ko follow karne ke liye Codex ya private deployment scripts ki zaroorat nahi hai. GitHub aur GoDaddy ke normal dashboards se setup kar sakte ho.

## 1. Apne project ki details

| Cheez | Is project ki value |
|---|---|
| GitHub account | `Utkarsh141213` |
| Repository | https://github.com/Utkarsh141213/AyushAromatics |
| Production branch | `main` |
| Hosting | GitHub Pages |
| Domain provider / DNS | GoDaddy |
| Website | https://www.ayusharomatics.com/ |
| Domain without www | `ayusharomatics.com` |
| Original GitHub Pages URL | https://utkarsh141213.github.io/AyushAromatics/ |
| App source folder | `AyushAroma-main/` inside the repository |
| Build output | `AyushAroma-main/dist/` |
| Deployment workflow | [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) |

Flow: **code change → commit → push to main → GitHub Actions builds → GitHub Pages publishes → domain opens website**.

Custom domain connect hone ke baad original GitHub URL custom domain par redirect ho sakta hai.

### Deployment mein kya-kya kiya tha?

1. Website source GitHub ke `main` branch par push kiya.
2. Repository Pages settings mein publishing source **GitHub Actions** kiya.
3. Workflow add kiya: Node 24 → `npm ci` → Vite build → artifact upload → Pages deployment.
4. Direct Windows-only `@rolldown/binding-win32-x64-msvc` dev dependency hatayi. Bundler apna platform-specific package optional dependencies se choose karta hai; isse GitHub ke Linux runner par installation successful hui.
5. Pehla deployment GitHub URL par verify kiya.
6. Custom domain par **already taken** error aaya. GoDaddy mein GitHub ka TXT challenge add karke profile-level ownership verification ki.
7. Repository Pages settings mein `www.ayusharomatics.com` save kiya.
8. Existing chaar A records GitHub ke liye already correct the. `www` CNAME ka required target `utkarsh141213.github.io` set karwaya.
9. Workflow dobara run kiya, taaki assets custom domain ke root `/` ke liye build hon.
10. HTTPS URL par browser se homepage, logo aur product catalogue load check kiye.

**Documentation ke waqt status:** custom domain configured hai aur latest deployment successful hai. HTTPS URL browser mein load hua, lekin GitHub API abhi certificate state `bad_authz` aur `https_enforced: false` report kar rahi thi. Automatic HTTP → HTTPS redirect ko complete mat samajhna; section 7 ka final check karna. Sab DNS resolvers par propagation complete hone ka confirmation abhi nahi mila tha.

## 2. Future mein changes live karna: everyday steps

Existing website update karne ke liye har baar DNS, domain verification ya Pages settings change nahi karni.

### A. Laptop / VS Code se update

**Repository root** wo folder hai jisme `.git`, `.github`, `README.md` aur andar `AyushAroma-main` folder hai. `package.json` andar wale app folder mein hai.

Current laptop par PowerShell mein:

```powershell
Set-Location 'C:\Users\utkarsh.s\Downloads\AyushAroma-main'
git status
```

Editing se pehle, working tree clean ho toh latest code lo:

```powershell
git pull --ff-only origin main
```

Source files edit karo. Phir app folder mein build check karo:

```powershell
Set-Location AyushAroma-main
npm run build
Set-Location ..
```

Build successful hone ke baad repository root se review, commit aur push:

```powershell
git status
git diff
git add AyushAroma-main .github
git diff --cached --stat
git commit -m "Update website content"
git push origin main
```

Commit message apne change ke hisaab se likho. In folders ke bahar file badli ho toh use alag se stage karo. `Nothing to commit` aaye toh naya staged change nahi hai.

Ab [Actions tab](https://github.com/Utkarsh141213/AyushAromatics/actions) mein latest **Deploy website to GitHub Pages** run green / successful hone do. Phir website par **Ctrl + Shift + R** dabao aur changed page check karo.

GitHub login maange toh browser mein `Utkarsh141213` se login/Authorize karo. Terminal mein normal GitHub account password paste mat karo.

### B. Chhota text change GitHub browser se

1. Repo mein required source file kholo.
2. Pencil / **Edit this file** par click karo.
3. Change karke **Commit changes** se `main` par save karo.
4. Actions successful hone do, phir live website refresh karo.

App/workflow changes par automatic deploy hota hai. Root `README.md` ya is guide ke changes workflow ke path filters mein nahi hain, isliye docs-only update par deploy automatically start nahi hota.

## 3. Naye laptop par local setup

Git aur Node.js **24.x** install karo. PowerShell / VS Code terminal mein:

```powershell
git clone https://github.com/Utkarsh141213/AyushAromatics.git
Set-Location AyushAromatics
Set-Location AyushAroma-main
npm ci
npm run dev
```

Terminal mein printed local URL kholo. Server rokne ke liye **Ctrl + C**.

| Command | Kaam |
|---|---|
| `npm ci` | Lockfile ke exact versions se dependencies install |
| `npm run dev` | Local editing preview |
| `npm run build` | Production `dist` generate |
| `npm run preview` | Built `dist` ko local browser mein check; production hosting nahi |

Dependencies change ki hon toh updated `package.json` aur `package-lock.json` dono commit karo.

## 4. GitHub Pages ka first-time setup / restore

Existing repo mein ye already configured hai. Recreate/restore karte waqt:

1. Source repo par push karo. Free personal setup mein public repo use ki gayi hai; private repo Pages support apne GitHub plan se check karo.
2. Repo root mein [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) rakho. Existing file poori copy kar sakte ho. `.github` ko app ke `src` ke andar mat rakho.
3. [Repository Settings → Pages](https://github.com/Utkarsh141213/AyushAromatics/settings/pages) kholo.
4. **Build and deployment → Source → GitHub Actions** select karo.
5. App/workflow changes `main` par push karo, ya section 5 se manually run karo.
6. Actions successful hone par Pages settings ka published URL kholo.

### Workflow ki settings

| Setting | Value |
|---|---|
| Trigger branch | `main` |
| Node | `24` |
| Runner | `ubuntu-latest` |
| Working directory | `AyushAroma-main` |
| Install | `npm ci` |
| Build | `npm run build -- --base "${PAGES_BASE_PATH}/"` |
| Upload folder | `AyushAroma-main/dist` |
| Permissions | `contents: read`, `pages: write`, `id-token: write` |
| Environment | `github-pages` |

`PAGES_BASE_PATH` workflow ke **Configure Pages** step se aata hai. GitHub repo URL ko `/AyushAromatics/` aur custom domain ko `/` base chahiye. Workflow automatically choose karta hai. `vite.config.js` ka normal default `/` hai.

**Is setup ke liye `npm run deploy` chalana zaroori nahi.** Package mein purana `gh-pages` command present hai, lekin current publishing method Actions workflow hai. Dono methods mix mat karo.

App ke `public/CNAME` mein domain likha hona alone enough nahi hai. Custom Actions deployment mein domain repository **Settings → Pages** mein configure hota hai; GitHub CNAME file ko ignore karta hai.

## 5. Code change ke bina manually deploy

1. [Actions tab](https://github.com/Utkarsh141213/AyushAromatics/actions) kholo.
2. Left side **Deploy website to GitHub Pages** choose karo.
3. **Run workflow** → branch **main** → **Run workflow**.
4. Naye run ko open karke sab steps successful hone do.

Custom domain add/change karne ke baad manually run karo, taaki asset base path dobara build ho. Failed run retry karne ke liye us run par **Re-run jobs** use kar sakte ho.

## 6. GoDaddy domain connect karna

### A. Pehle GitHub profile par ownership verify

1. `Utkarsh141213` se [profile Settings → Pages](https://github.com/settings/pages) kholo. Ye **profile settings** hain, repository settings nahi.
2. **Add a domain** → `ayusharomatics.com` add karo.
3. GitHub ka generated TXT name aur verification value copy karo.
4. GoDaddy → `ayusharomatics.com` → **DNS → DNS Records → Add New Record** kholo.
5. Ye add karo:

| Field | Value |
|---|---|
| Type | `TXT` |
| Name | `_github-pages-challenge-Utkarsh141213` |
| Value | GitHub verification page ka generated code |
| TTL | `1/2 Hour` ya available default |

GoDaddy ke Name field mein `.ayusharomatics.com` dobara append mat karo. GitHub ka exact generated name/value use karo; doosre account par dono alag honge.

6. Save karo. GitHub verification page par **Verify** dabao. Turant na ho toh DNS propagation ka wait karke retry karo.
7. Verified hone ke baad TXT record rehne do. Har deploy par nayi verification nahi chahiye.

**Already taken error:** domain doosri GitHub Pages site par attached tha. Ownership verification se doosre account ki unverified site se domain release ho sakta hai. Agar domain kisi aur account par already verified ho, toh old account owner / GitHub Support se resolve karna padega.

### B. Repository par custom domain save

1. [Repo Settings → Pages](https://github.com/Utkarsh141213/AyushAromatics/settings/pages) kholo.
2. **Custom domain** mein `www.ayusharomatics.com` likho. `https://` ya `/` nahi.
3. **Save** karo.
4. Phir website DNS records set karo. Naye setup mein GitHub par domain claim pehle aur DNS website pointing baad mein karna hai.

### C. Required website DNS records

| Type | Name | Value |
|---|---|---|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `utkarsh141213.github.io` |

Har IP separate A record hai. Existing same record ho toh duplicate mat add karo. Existing TTL values different hona error nahi; default / `1/2 Hour` / `1 Hour` reh sakta hai.

`www` ki existing row ke pencil **Edit** se Value badlo. **Name `www` hi rahega.** Target mein `https://`, `/AyushAromatics/` ya URL path mat jodo. `www` ko apex `ayusharomatics.com` ke bajay directly GitHub hostname par point karo.

Root aur www correctly configured hon toh GitHub non-www ko configured www domain par redirect kar sakta hai.

**Email settings preserve karo:** MX, SPF TXT, `_dmarc`, DKIM aur `autodiscover` records delete/replace mat karo. NS, SOA aur `_domainconnect` change karne ki zaroorat nahi thi. Verification TXT ko SPF ke badle nahi, separate record ke roop mein add karo.

## 7. DNS aur HTTPS final check

DNS updates globally dikhne mein up to 24 hours le sakte hain. Browser mein page khulna aur GitHub ka certificate validation complete hona alag checks hain.

PowerShell mein:

```powershell
Resolve-DnsName ayusharomatics.com -Type A
Resolve-DnsName www.ayusharomatics.com -Type CNAME
Resolve-DnsName _github-pages-challenge-Utkarsh141213.ayusharomatics.com -Type TXT
```

Expected: root ke chaar GitHub IPs, `www` target `utkarsh141213.github.io`, TXT mein GitHub verification value. Output order se farq nahi padta.

1. Repo **Settings → Pages** ka DNS check successful hona check karo.
2. Certificate ready hone par **Enforce HTTPS** enable karo. Option available hone mein up to 24 hours lag sakte hain.
3. `https://www.ayusharomatics.com/` aur `https://ayusharomatics.com/` kholo. Certificate warning nahi aani chahiye.
4. Enforcement enabled hone ke baad `http://www.ayusharomatics.com/` HTTPS par redirect hona chahiye.
5. Homepage, logo, banner, mobile menu, catalogue aur product detail check karo.
6. Latest Actions deployment bhi successful hona chahiye.

Browser certificate warning de toh usko bypass karke setup successful mat maan lena.

## 8. Common errors aur fixes

| Problem | Fix / check |
|---|---|
| `npm` / `git` not recognized | Node 24 / Git install karke terminal reopen karo. |
| `package.json` not found | App folder `AyushAroma-main` mein npm commands chalao. |
| Push login error | Browser authentication complete karo; correct account aur repo write access check karo. |
| Push rejected: remote has new commits | `git status` check karo. Local work save/commit karke `git pull --rebase origin main`; conflicts resolve karke `git add <resolved-file>` aur `git rebase --continue`, phir push. Remote work overwrite karne ke liye force push mat karo. |
| Actions start nahi hua | `main` aur workflow path filters check karo. Docs-only change ho toh manually Run workflow. |
| `npm ci` lockfile mismatch | App mein `npm install` chalao, package.json aur lockfile review karke dono commit/push karo. |
| Linux `EBADPLATFORM` | Direct Windows-only dependency add toh nahi hui? Bundler bindings optional dependencies se install hone do. |
| Pages permission / site not found | Source = GitHub Actions aur workflow permissions check karo. Environment approval pending ho toh authorized owner se review karao. |
| Blank page / JS-CSS 404 | Repo URL ko `/AyushAromatics/`, custom domain ko `/` base chahiye. Domain Save ke baad workflow rerun karo. |
| Domain already taken | Section 6A se profile-level verification. Sirf repo CNAME file edit karna enough nahi. |
| Verify fail | TXT name/value match karo, double domain suffix check karo, propagation ke baad retry karo. |
| Wrong / missing www | Saved CNAME Name `www`, Value `utkarsh141213.github.io` confirm karo. Conflicting www A/CNAME records mat rakho. |
| Purani site dikh rahi hai | Latest run ka commit/green status, hard refresh, incognito check karo. |
| HTTPS pending / `bad_authz` | Root + www DNS aur propagation confirm karo. Correct DNS ke baad bhi stuck ho toh GitHub docs ke according repo Pages se custom domain remove karke same domain dobara Save karna certificate provisioning retry kar sakta hai. Isse temporary interruption ho sakta hai; baar-baar toggle mat karo. Verification TXT preserve karo. Ready hone par Enforce HTTPS enable karo. |
| Contact form email nahi bhej raha | Hosting se email service automatically configure nahi hoti. Current email-draft fallback aur EmailJS integration alag se configure/test karne hain. |

Failed Actions run mein **pehla failed step** expand karo. Setup, install, build aur deploy errors ke fixes alag ho sakte hain.

## 9. Galat update ka rollback

Recent galat commit undo karne ke liye clean working tree ke saath repository root par:

```powershell
git pull --ff-only origin main
git log --oneline -5
git revert BAD_COMMIT_SHA
git push origin main
```

`BAD_COMMIT_SHA` ko actual galat update ke ID se replace karo. Revert naya undo commit banata hai; history delete nahi karta. Git editor khule toh default revert message save/close karo. Conflict ho toh resolve karke `git add <resolved-file>` aur `git revert --continue` karo. Actions successful hone do. Multiple dependent updates ho toh affected commits review karke rollback karo.

## 10. Har future update ki checklist

- [ ] Correct repo aur `main` branch.
- [ ] Changes review kiye aur `npm run build` successful.
- [ ] Source commit/push hua.
- [ ] Actions latest deployment green.
- [ ] Live changed page aur mobile layout checked.
- [ ] Routine update ke liye DNS/domain settings dobara nahi badli.

## Official references

Provider UI/limits badal sakti hain. Current instructions ke liye:

- [Vite: GitHub Pages deployment](https://vite.dev/guide/static-deploy.html#github-pages)
- [GitHub: custom deployment workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub: domain and DNS](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)
- [GitHub: domain verification](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages)
- [GitHub: HTTPS](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)
- [GitHub: domain troubleshooting](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/troubleshooting-custom-domains-and-github-pages)
- [GitHub Pages limits and permitted use](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
