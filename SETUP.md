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

Secret eklendikten sonra `/automation-center` sayfasındaki **Sistem Durumu → Test Et** butonunu kullanın. Başarılı durumda kart `GitHub Actions hazır` göstermelidir.

## 3. automation-dispatch davranışı

Frontend Edge Function'a iki tür istek gönderir:

```json
{ "action": "health" }
```

Bu istek secret değerini istemciye döndürmez. Yalnızca token'ın yapılandırılmış olup olmadığını bildirir.

Manuel workflow çalıştırma isteği:

```json
{ "action": "dispatch" }
```

Edge Function GitHub REST API üzerinde `POST /repos/EscobarsTmg/tether/actions/workflows/automation.yml/dispatches` çağrısını `ref: main` ile yapar. Başarılı cevap:

```json
{ "success": true, "message": "Workflow tetiklendi" }
```

## 4. Supabase Leaked Password Protection

Hosted Supabase projesinde Dashboard'u açın.

1. **Authentication** bölümüne gidin.
2. Auth güvenlik / attack protection / password security ayarlarını açın.
3. **Leaked Password Protection** seçeneğini etkinleştirin.
4. Password strength gereksinimlerini projenizin politikasına göre yapılandırın.
5. Ayarları kaydedin.

Bu özellik sızdırılmış parola veritabanlarında bulunan şifrelerin kullanılmasını engeller. Frontend `weak_password` ve `leaked_password` türündeki Auth hatalarını Türkçe kullanıcı mesajına dönüştürür.

## 5. Test

Kurulumdan sonra:

1. `/automation-center` sayfasını açın.
2. Sistem Durumu kartında token kontrolünün başarılı olduğunu doğrulayın.
3. **Scraper'ı Şimdi Çalıştır** butonuna basın.
4. GitHub Actions altında `Bank Automation Skeleton` workflow run'ının oluştuğunu doğrulayın.
5. Test kullanıcısı oluştururken zayıf/sızdırılmış parola kontrolünün beklendiği gibi hata verdiğini doğrulayın.

## Güvenlik notları

- GitHub token frontend'e gönderilmez.
- Health endpoint secret değerini hiçbir zaman döndürmez.
- `automation-dispatch` geçerli Supabase JWT ve `admin`/`reviewer` rolü gerektirir.
- Transfer onayları yalnızca `payment_requests.status` alanını değiştirir.
- Banka giriş, parola veya 2FA otomasyonu bu yapılandırmanın parçası değildir.
- Banka scraper selector alanları placeholder/TODO olarak bırakılmalıdır.
