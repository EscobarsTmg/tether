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

Secret değerini frontend `VITE_*` değişkenlerine koymayın.

## 3. Edge Function deploy

CLI komutlarını önce kurulu sürümde doğrulayın:

```bash
supabase --help
supabase functions deploy --help
```

Ardından projeyi linkleyip gereken fonksiyonları deploy edin:

```bash
supabase login
supabase projects list
supabase link --project-ref <SUPABASE_PROJECT_REF>
supabase functions deploy automation-dispatch
supabase functions deploy bank-sync
supabase functions deploy invite-user
```

**CORS kodunda yapılan her değişiklikten sonra ilgili Edge Function yeniden deploy edilmelidir:**

```bash
supabase functions deploy <fonksiyon-adi>
```

Deploy sonrasında:

```bash
supabase functions list
```

## 4. CORS davranışı

Browser'dan çağrılan Edge Function'lar `OPTIONS` preflight isteğini karşılar ve JSON başarı/hata cevaplarının tamamına CORS header'larını ekler. Geliştirme ortamında dinamik preview URL'leri nedeniyle `Access-Control-Allow-Origin: *` kullanılır. Sabit production domainine geçildiğinde origin değerini yalnızca production domainiyle sınırlandırın.

## 5. Health check davranışı

Frontend `automation-dispatch` fonksiyonuna `{ "action": "health" }` gönderir. Fonksiyon secret değerlerini açığa çıkarmadan GitHub token, API ve workflow erişimini kontrol eder.

## 6. Supabase Leaked Password Protection

Hosted Supabase projesinde Dashboard'u açın, Authentication güvenlik ayarlarından **Leaked Password Protection** seçeneğini etkinleştirin ve uygun password strength politikasını yapılandırın.

## 7. CI doğrulama

CI üzerinde dependency install, TypeScript typecheck ve production build adımlarının başarılı olduğunu doğrulayın.

## Güvenlik notları

- GitHub token frontend'e gönderilmez.
- Health endpoint secret değerini hiçbir zaman döndürmez.
- `automation-dispatch` geçerli Supabase JWT ve `admin`/`reviewer` rolü gerektirir.
- Transfer onayları yalnızca `payment_requests.status` alanını değiştirir.
- Banka giriş, parola veya 2FA otomasyonu bu yapılandırmanın parçası değildir.
- Banka scraper selector alanları placeholder/TODO olarak bırakılmalıdır.
