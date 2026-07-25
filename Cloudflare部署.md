# Head up — Cloudflare Pages 部署(含云端自动同步)

> 用你**已有的 GitHub 账号**登录 Cloudflare(不用单独注册),部署后获得永久 URL,
> 并开启 KV 数据库实现**多设备自动同步、数据永不丢失**。
>
> 当前仓库已同时兼容 Vercel(`/api/sync.js`)和 Cloudflare(`/functions/api/sync.js`)两种后端。

---

## 第一步:用 GitHub 登录 Cloudflare

1. 手机浏览器打开 👉 **https://dash.cloudflare.com/sign-up**
2. 点 **Continue with GitHub**(用你已有的 GitHub 账号 `X0518390` 授权登录)
3. 按提示完成(可能需要验证邮箱/手机,按页面提示做)

> Cloudflare 用 GitHub 授权,不需要你记新密码。

---

## 第二步:导入 GitHub 仓库部署

1. 登录后,左侧菜单点 **Workers & Pages**
2. 点 **Create** → 选 **Pages** 标签 → **Connect to Git**
3. 授权 Cloudflare 访问你的 GitHub,找到仓库 **`headup`** → 点 **Begin setup**
4. 配置(保持简单):
   - **Project name**: `headup`(或随意)
   - **Framework preset**: 选 **`None`**(纯静态 + Functions)
   - **Build command**: 留空
   - **Build output directory**: 留空(或填 `.`)
5. 点 **Save and Deploy** 🎉

约 30 秒后,你会得到永久地址:
```
https://headup-xxxx.pages.dev
```
> 这个地址就是你的**最终永久地址**,比 GitHub Pages 那个多了云端同步能力。

---

## 第三步:开启 KV 数据库(实现自动同步,关键!)

> 不配这步也能用,但数据只存手机本地。配了 KV 后,多设备填相同同步码自动同步。

1. Cloudflare 控制台 → 左侧 **Storage & Databases** → **KV**
2. 点 **Create a namespace** → 命名 `headup-kv` → **Add**
3. 记下这个 namespace 的 **ID**(一长串字母数字)
4. 回到 **Workers & Pages** → 你的 `headup` 项目 → **Settings** → **Functions**
5. 在 **KV namespace bindings** 点 **Add binding**:
   - **Variable name**: 填 `HEADUP_KV`(必须一字不差,后端靠这个名字找数据库)
   - **KV namespace**: 选刚才创建的 `headup-kv`
   - 点 **Save**
6. 回到项目 **Deployments**,重新部署一次(点最近一次部署 → **Redeploy**,或 push 代码自动触发)

完成后云端同步生效。

---

## 第四步:手机使用

1. 打开 `https://headup-xxxx.pages.dev`
2. 进**设置**,填一个"同步码"(比如 `my2026`)
3. 平板/电脑/另一台手机打开**同一个 URL**,填**相同同步码**
4. 数据自动双向同步,关页面、清缓存、换设备都能恢复
5. 浏览器 → 分享 → **添加到主屏幕**,就是全屏 App

---

## 验证同步是否生效

设置里填同步码后,顶部同步状态应显示 **"已同步"**(绿色点)。
若显示 **"离线·已存本地"**(灰色点),说明 KV 没绑好,回头检查第三步的 `HEADUP_KV` 绑定名是否一字不差。

---

## 常见问题

**Q: Cloudflare 登录/打开很慢或打不开?**
A: Cloudflare 在中国大陆有时不稳定。如果连不上,可改用 GitHub Pages 版(纯静态,无自动同步,见部署教程.md)。

**Q: 同步码怎么用?**
A: 同步码 = 你的私密房间号。所有设备填**相同**的,数据自动同步;填不同的,各自独立。

**Q: 免费额度够吗?**
A: 个人用绰绰有余。KV 免费:每月 10 万次读取、1000 次写入(个人每天同步几十次,远够用)。Pages 免费:无限静态请求。

**Q: 想更新代码?**
A: 改完 push 到 GitHub,Cloudflare 自动重新部署。手机下拉刷新即可见新版。
