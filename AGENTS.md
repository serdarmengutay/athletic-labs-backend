
## 5. Dal ve PR yapısı

Köklü yenileme (kimlik/TCKN, RBAC, kulüp-takım hiyerarşisi, portal, scouting) tek tek main'e değil, **`dev` dalında** toplanır. Tüm frontend ve backend repolarında aynı düzen geçerlidir.

```
main  ← yayındaki sürüm (Render/Vercel buradan deploy eder)
 └── dev  ← tüm yenilemenin toplandığı dal
      ├── feat/<konu>   ← görev bazlı dallar, PR'ı dev'e açılır
      └── fix/<konu>
```

Kurallar:

1. **Görev dalı her zaman `dev`'den açılır**, `main`'den değil: `git checkout dev && git pull && git checkout -b feat/<konu>`.
2. **PR'ın hedefi (base) her zaman `dev`'dir.** Ajan, hedefi `main` olan PR açmaz.
3. **`main`'e yalnızca sürüm çıkarken**, tüm feature'lar tamamlandıktan sonra `dev` → `main` PR'ı ile gidilir. Bu PR'ı insan açar/onaylar.
4. **`main`'e doğrudan push edilmez.** Tek istisna, canlı sistemi ayakta tutan acil düzeltmelerdir; bu durumda düzeltme sonradan `dev`'e de taşınır.
5. **Deploy etkisi:** `main`'e birleştirme canlıya çıkar ve backend'de `render.yaml` gereği `npm run db:migrate` çalışır. Bu yüzden `main` birleştirmeleri, sahada ölçüm olmayan bir güne planlanır (bkz. kural 1.6).
6. Migration'lar `dev`'de birikir; prod'a uygulanma sırası ve zamanı insanla kararlaştırılır.
