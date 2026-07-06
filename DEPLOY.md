# Deploying Tension Lab — the click-by-click guide

This walks you through putting **Tension Lab by Mensin Tennis** online for free, using the
same three services you used before: **GitHub** (holds the code), **Supabase** (the database
that remembers everything), and **Vercel** (runs the website). No coding — you'll copy, paste,
and click. Budget about **15–20 minutes**.

You'll do four parts:

1. Put the code on GitHub
2. Create the database on Supabase and load it
3. Deploy the website on Vercel
4. Make yourself the admin

Have the unzipped **`tension-lab-vercel`** folder ready. (There's no `node_modules` folder
inside — that's on purpose; you don't upload it.)

---

## ⚡ Already deployed an earlier version? Do this instead

If your site is already live and you're just applying this update, you don't need to redo
everything — three quick steps:

1. **Update the code.** In your GitHub repo, upload the new files (drag the contents of this
   folder in and commit — it replaces the old ones). Vercel redeploys automatically in ~1 min.
2. **Run the database update.** In **Supabase → SQL Editor → New query**, paste the contents of
   **`supabase/migration-v2.sql`** and click **Run**. This adds the new "favorites" and
   visitor-counter tables without touching your existing data.
3. **(Optional) Add DeepSeek** as a cheaper AI option — see *"Choosing your AI model"* below.

That's it. Your accounts, saved setups, and catalog are all preserved. The rest of this guide
is the full first-time setup.

---

## Part 1 — Put the code on GitHub

**A.** Go to https://github.com and log in. Click the **+** (top right) → **New repository**.

**B.** Name it `tension-lab` (any name is fine). Leave it **Public** or **Private** — either
works. Don't tick "Add a README." Click **Create repository**.

**C.** On the next page, click the link **"uploading an existing file"** (in the line
"…or push an existing repository / upload an existing file").

**D.** Open the `tension-lab-vercel` folder on your computer, select **everything inside it**
(all the files and folders — `public`, `server`, `api`, `supabase`, `package.json`, etc.),
and **drag it all** onto the GitHub upload area. Wait for the files to finish listing.

**E.** Click **Commit changes**.

That's it — your code is on GitHub. Keep this browser tab open.

> If drag-and-drop is fussy about folders, install **GitHub Desktop**
> (https://desktop.github.com), which lets you add the whole folder in one step. Either way
> works.

---

## Part 2 — Create the database on Supabase

**A.** Go to https://supabase.com and log in. Click **New project**.

**B.** Pick your organization, give the project a name (`tension-lab`), and set a **database
password**. **Write this password down** — you'll need it in a minute. Choose the region
closest to you. Click **Create new project** and wait ~2 minutes while it sets up.

**C. Load the tables and data.** In the left sidebar click **SQL Editor** → **New query**.
Open the file **`supabase/schema.sql`** from your project folder in any text editor, copy
**everything**, paste it into the Supabase query box, and click **Run** (bottom right).
You should see a success message. This creates the tables and loads all 67 strings and 145
rackets. *(It's safe to run again later — it won't duplicate anything.)*

**D. Get your connection string.** Click the **Connect** button (top of the dashboard), and
look for **Connection string → Transaction pooler** (sometimes under "Connection pooling").
Copy that string. It looks like this:

```
postgresql://postgres.abcdefgh:[YOUR-PASSWORD]@aws-0-xxxx.pooler.supabase.com:6543/postgres
```

Two things to check:
- It must be the **Transaction pooler** one — the host ends in **`.pooler.supabase.com`** and
  the port is **`6543`**. (This is the version built for services like Vercel.)
- Replace **`[YOUR-PASSWORD]`** with the database password you wrote down in step B.

Paste this finished string somewhere handy for Part 3. Keep this tab open too.

---

## Part 3 — Deploy the website on Vercel

**A.** Go to https://vercel.com and log in (use "Continue with GitHub" if you can — it links
the two automatically).

**B.** Click **Add New… → Project**. Find your `tension-lab` repository in the list and click
**Import**.

**C.** Before clicking Deploy, open the **Environment Variables** section and add these.
For each one, type the **Name** on the left and the **Value** on the right, then **Add**:

| Name | Value |
|---|---|
| `DATABASE_URL` | *(paste the full Transaction pooler string from Part 2, with your real password in it)* |
| `AUTH_SECRET` | `d08254e0bebcf39683a870b46e3697ea778a6232bc0f39ccb63ab3b809cc58b2` |

*(That `AUTH_SECRET` is a random value I generated for you — it just signs login cookies. You
can use it as-is, or replace it with any long random string of your own.)*

**D.** Click **Deploy** and wait a minute or two. When it finishes, click **Visit** (or **Go
to Dashboard → Domains**) to open your live site. 🎾

Your Setup String and String Comparison pages should work immediately.

---

## Part 4 — Make yourself the admin

Admin isn't handed out automatically (so a stranger can't grab it). You give it to yourself
once:

**A.** On your live site, click **Create account** and register with your email + a password
(8+ characters). You're now a normal user.

**B.** Go back to the **Supabase** tab → **SQL Editor** → **New query**. Paste the line below,
**with your email**, and click **Run**:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

**C.** Back on your site, **log out and log back in**. You'll now see an **Admin** link in the
top bar. That's the catalog portal — add/edit/delete strings and rackets, and the **AI Update**
button.

Done — the site is fully live and yours.

---

## Choosing your AI model (Anthropic and/or DeepSeek)

The **AI Update** button in the admin portal can use two different AI providers. You can set up
either one, both, or neither:

| Provider | Env variable | Strength | Rough cost |
|---|---|---|---|
| **Anthropic (Claude Haiku)** | `ANTHROPIC_API_KEY` | Searches the **live web** — best for brand-new products | a fraction of a cent per lookup |
| **DeepSeek** | `DEEPSEEK_API_KEY` | **Cheapest**; answers from its own knowledge (no live web) | ~10–30× cheaper again |

With **no key**, AI Update still works and returns a clearly-labelled *offline estimate* you can
edit and save — so you can use the site fully for free.

**To add a key (either or both):**

1. Get a key:
   - Anthropic → https://console.anthropic.com (Billing → add a little credit)
   - DeepSeek → https://platform.deepseek.com (create an API key, top up a small amount)
2. In **Vercel** → your project → **Settings → Environment Variables**, add whichever you want:
   - `ANTHROPIC_API_KEY` = *your Anthropic key*
   - `DEEPSEEK_API_KEY` = *your DeepSeek key*
   - *(optional)* `AI_MODEL` = the default model, one of `claude-haiku-4-5`,
     `deepseek-v4-flash`, or `deepseek-v4-pro`
3. **Deployments → ⋯ → Redeploy** so the keys take effect.

**Picking a model when you use it:** in the admin portal's AI Update box there's now a **model
dropdown**. Every visit you can choose Claude, DeepSeek Flash (cheapest), or DeepSeek Pro
(higher quality) — models without a configured key are marked "(needs API key)". The offline
estimate is always available as a fallback.

> Tip: DeepSeek is wonderfully cheap and great for well-known products. For a string or racket
> released very recently, Claude's live web search will usually get the specs more accurately.

---

## If something looks wrong

- **Site loads but data/login errors:** almost always the `DATABASE_URL`. Re-check that you used
  the **Transaction pooler** string (host ends `.pooler.supabase.com`, port **6543**) and that
  you replaced `[YOUR-PASSWORD]` with your real password. Fix it in Vercel → Settings →
  Environment Variables, then Redeploy.
- **"Database is paused":** free Supabase projects sleep after ~1 week of no use. Open the
  Supabase dashboard and click **Resume**.
- **Changed an environment variable but nothing changed:** Vercel only applies env changes on a
  new deploy. Go to **Deployments → ⋯ → Redeploy**.
- **The Admin link won't appear:** make sure you ran the `UPDATE users…` line with the exact
  email you registered, then logged out and back in.

---

## Making changes later

Because it's on GitHub, any edit you push (or upload) to the repository triggers Vercel to
rebuild and redeploy automatically — same as your stock dashboard. You don't have to touch
Vercel again for normal updates.

Your data (accounts, saved setups, any strings/rackets you add in the admin portal) lives in
Supabase and is safe across redeploys.

---

*Tension Lab — by Mensin Tennis.*
