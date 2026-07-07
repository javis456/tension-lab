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

If your site is already live and you're just applying an update, you don't need to redo
everything — three quick steps:

1. **Update the code.** In your GitHub repo, upload the new files (drag the contents of this
   folder in and commit — it replaces the old ones). Vercel redeploys automatically in ~1 min.
2. **Run the database updates.** This update is **front-end only** — the new **Knowledge**
   page, the English/Thai toggle, and the login-flash fix need **no new database migration**.
   (Just make sure you've already run migrations `v2`–`v6` from earlier updates; they're in the
   `supabase/` folder, safe, and won't touch your data.)
3. **(Optional) Turn on extras:** DeepSeek (cheaper AI), **Google sign-in**, and
   **email confirmation** for new sign-ups — each has its own section below.

That's it. Your accounts, saved combinations, rackets, and feedback are all preserved. The rest
of this guide is the full first-time setup.

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

## Adding Google sign-in (optional)

Lets visitors log in with one tap using their Google account. You only need a **Client ID**
(no secret), and it's free.

1. Go to **https://console.cloud.google.com** → create a project (or pick one).
2. **APIs & Services → OAuth consent screen** → choose **External**, fill the app name and your
   email, save. (You can leave it in "Testing" mode; add your own Google email as a test user,
   or click "Publish" to let anyone in.)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized JavaScript origins**: add your live site URL, e.g. `https://your-site.vercel.app`
     (and `http://localhost:3000` if you test locally). No path, just the origin.
   - Create, then **copy the Client ID** (it ends in `.apps.googleusercontent.com`).
4. In **Vercel → Settings → Environment Variables**, add:
   - `GOOGLE_CLIENT_ID` = *the client ID you copied*
5. **Deployments → ⋯ → Redeploy.**

Now the **Racket Room** login screen shows a "Sign in with Google" button. (If `GOOGLE_CLIENT_ID`
isn't set, the button simply doesn't appear — email/password still works.)

> Note: whatever URL you put in "Authorized JavaScript origins" must exactly match the address
> people visit. If you later add a custom domain, add that origin here too.

---

## Turning on email confirmation (optional)

Makes new users confirm a real email address before they can log in. Uses **Brevo** (free —
300 emails/day, no credit card).

1. Sign up at **https://www.brevo.com**.
2. **Verify a sender address:** Brevo → **Senders, Domains & Dedicated IPs → Senders → Add a
   sender**. Use an email you control (e.g. your Gmail). Brevo emails you a confirmation link —
   click it. (This is the address your site's emails will come "from".)
3. **Get an API key:** Brevo → **SMTP & API → API Keys → Generate a new API key**. Copy it.
4. In **Vercel → Settings → Environment Variables**, add:
   - `BREVO_API_KEY` = *the key you copied*
   - `MAIL_FROM` = *the sender address you just verified*
   - `MAIL_FROM_NAME` = `Tension Lab` (optional)
5. **Deployments → ⋯ → Redeploy.**

Now when someone registers, they get a "Confirm your email" message and can't log in until they
click the link. (Google sign-ins are already verified, so they skip this.) **Until you set these,
sign-ups just work immediately with no email step** — so the site is never broken by not having
it. Existing accounts stay logged in; they're marked verified by the migration.

> Note on the confirm link: the site builds it from the address people visit, so it works on
> your Vercel URL automatically. If you use a custom domain and links look wrong, set
> `PUBLIC_URL=https://your-domain` in Vercel.

---

## Bulk-adding strings and rackets (CSV)

In the admin portal, next to "Add manually" there's now **⇪ Bulk upload (CSV)** — for loading
many products at once.

1. Pick the tab (**Strings** or **Rackets**), click **Bulk upload**, then **⬇ Download template**.
   The template has the exact column headers plus one example row.
2. Fill it in (Excel, Google Sheets, Numbers — anything that saves `.csv`). Only **brand** and
   **name** are required; leave others blank to use sensible defaults.
3. Upload the file. You'll see a **preview**: which columns were matched, and a per-row
   ok/skip status with any warnings — *nothing is saved yet*.
4. Click **Import N rows**.

Why it won't scramble your data: columns are matched **by their header name, not their position**,
so you can reorder columns or add extra ones and it still lands each value in the right field.
Rows missing brand/name are skipped (and listed), and values like material or ratings are
validated — an unrecognized material is flagged and defaulted rather than silently placed wrong.
For the string ratings, the columns are `pw co sp cf fe du tm` (power, control, spin, comfort,
feel, durability, tension), each 0–100; gauges go in one cell like `1.30|1.25`.

---

- **🎾 Racket Room** — the logged-in home, reachable from the top bar, with three tabs:
  - **My Racket** — add the frames you own; they appear first in Setup String's picker.
  - **Saved Combination** — your saved string setups, each with one-tap **Use in Setup**.
  - **Game Feedback** — after a match, rate how a setup really played. You get a chart comparing
    the **algorithm's prediction** vs **your rating**, plus a private note to your future self —
    and a **Share** button that creates a public link for friends.
- **Sign in with Google** (once you add the Client ID above).

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

---

## Clubs (community)

The **Clubs** tab is where players share with each other. It works the moment you run the v5
migration — no extra setup:

- Everyone who logs in **automatically joins the default "Thailand Tennis Club."** (Rename it
  later by editing its row in Supabase, or change the name in `supabase/migration-v5.sql` before
  running it.)
- Members can **share a saved combination or a game feedback** into a club; everyone in the club
  can **like, comment, and save** the shared combination to their own account.
- Anyone can **create a club** (becoming its admin) or **request to join** others. Club **admins
  invite players by username and approve join requests.**
- Because posts show usernames, **every account now has a username** — new sign-ups pick one at
  registration; existing/Google users are asked to choose one the first time they open Clubs.

---

---

## Knowledge page & Thai language

The new **Knowledge** tab (top nav) is a public, read-anytime guide to choosing strings —
materials, shape, gauge, tension, the racket's role, hybrids, how-to-choose principles, and a
short, honest explanation of how the rating is built and how far to trust it — with simple
diagrams. A toggle in the top-right switches the whole page between **English and ไทย (Thai)**,
and the choice is remembered. (Right now the toggle covers the Knowledge page; if you'd like the
rest of the site translated too, that can be added later.)

---

## Making changes later

Because it's on GitHub, any edit you push (or upload) to the repository triggers Vercel to
rebuild and redeploy automatically — same as your stock dashboard. You don't have to touch
Vercel again for normal updates.

Your data (accounts, saved setups, any strings/rackets you add in the admin portal) lives in
Supabase and is safe across redeploys.

---

*Tension Lab — by Mensin Tennis.*
