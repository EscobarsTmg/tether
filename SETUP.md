# Fintech Panel Setup

Bu belge `automation-dispatch`, GitHub Actions ve Supabase Auth güvenlik ayarlarının kurulumunu açıklar.

## 1. GitHub Automation Token oluşturma

Tercih edilen yöntem fine-grained personal access token kullanmaktır.

1. GitHub hesabında **Settings → Developer settings → Personal access tokens → Fine-grained tokens** bölümünü açın.
2. **Generate new token** seçeneğini seçin.
3. Resource owner olarak `EscobarsTmg` hesabını seçin.
4. Repository access bölümünde yalnızca `tether` reposuna erişim verin.
5. Repository permissions altında **Actions → Read and write** yetkisini verin.
6. Mümkün olan en kısa uygun expiration süresini belirleyin.
7. Token'ı oluşturun ve yalnızca secret store içinde saklayın. Token'ı kaynak koda, `.env` dosyasına veya GitHub commit geçmişine yazmayın.

Workflow dispatch endpoint'i fine-grained token için repository `Actions: write` yetkisi gerektirir.

## 2. Token'ı Supabase Secrets'a ekleme

Supabase Dashboard'da ilgili projeyi açın ve Edge Functions secrets bölümüne aşağıdaki secret'ı ekleyin:

```text
GITHUB_AUTOMATION_TOKEN=<oluşturduğunuz-token>
```

Opsiyonel repository override:

```text
GITHUB_AUTOMATION_REPO=EscobarsTmg/tether
```

Secret değerini frontend `VITE_*` değişkenlerine koymayın. Token yalnızca `automation-dispatch` Edge Function içinde `Deno.env.get('GITHUB_AUTOMATION_TOKEN')` ile okunur.

## 3. automation-dispatch Edge Function deploy

Bu repo içinden Supabase CLI kullanarak deploy edin. Önce kurulu CLI sürümünüzde komutları doğrulamak için:

```bash
supabase --help
supabase functions deploy --help
```

Ardından:

```bash
supabase login
supabase projects list
supabase link --project-ref <SUPABASE_PROJECT_REF>
supabase functions deploy automation-dispatch
```

CLI proje bağımlılığı olarak kuruluysa aynı komutları `npx supabase ...` biçiminde çalıştırın.

Bu projede bağlı management connector üzerinden deploy girişimi yetki hatası verdiği için CLI yolu kullanılmalıdır. CLI, sizin Supabase hesabınızla oturum açar ve proje üzerinde sahip olduğunuz gerçek yetkilerle deploy işlemini gerçekleştirir. Yetkiniz yoksa CLI da deploy yapamaz; bu durumda proje sahibinin Edge Functions deploy yetkisi vermesi gerekir.

Deploy sonrasında kontrol:

```bash
supabase functions list
```

`automation-dispatch` listede görünmelidir. `/automation-center` sayfasında **Sistem Durumu → Test Et** butonuna basın. Fonksiyon bulunamazsa panel `Edge Function deploy edilmemiş, lütfen CLI ile deploy edin` uyarısını gösterir.

## 4. Health check davranışı

Frontend şu isteği gönderir:

```json
{ "action": "health" }
```

Fonksiyon secret değerini açığa çıkarmadan aşağıdaki kontrolleri yapar:

```json
{
  "github_token": true,
  "github_api": true,
  "workflow_exists": true
}
```

- `github_token`: `GITHUB_AUTOMATION_TOKEN` tanımlı mı?
- `github_api`: token ile GitHub repository API çağrısı başarılı mı?
- `workflow_exists`: `.github/workflows/automation.yml` GitHub Actions API üzerinden bulunabiliyor mu?

Manuel workflow çalıştırma isteği:

```json
{ "action": "dispatch" }
```

Başarılı cevap:

```json
{ "success": true, "message": "Workflow tetiklendi" }
```

## 5. Supabase Leaked Password Protection

Hosted Supabase projesinde Dashboard'u açın.

1. **Authentication** bölümüne gidin.
2. Auth güvenlik / attack protection / password security ayarlarını açın.
3. **Leaked Password Protection** seçeneğini etkinleştirin.
4. Password strength gereksinimlerini projenizin politikasına göre yapılandırın.
5. Ayarları kaydedin.

Frontend `weak_password` ve `leaked_password` türündeki Auth hatalarını Türkçe kullanıcı mesajına dönüştürür.

## 6. CI doğrulama

`.github/workflows/automation.yml` hem `main` push olaylarında hem manuel `workflow_dispatch` ile çalışır. Job sırası:

```text
checkout
→ Node 20
→ npm install --no-audit --no-fund
→ npm run build --if-present
→ automation:scrape
→ automation:rules
```

GitHub Actions ekranında `Bank Automation Skeleton` workflow'unun son run sonucunu kontrol edin. `build` script'i mevcutsa build çalışır; yoksa `--if-present` nedeniyle adım hata üretmez.

## Güvenlik notları

- GitHub token frontend'e gönderilmez.
- Health endpoint secret değerini hiçbir zaman döndürmez.
- `automation-dispatch` geçerli Supabase JWT ve `admin`/`reviewer` rolü gerektirir.
- Transfer onayları yalnızca `payment_requests.status` alanını değiştirir.
- Banka giriş, parola veya 2FA otomasyonu bu yapılandırmanın parçası değildir.
- Banka scraper selector alanları placeholder/TODO olarak bırakılmalıdır.
