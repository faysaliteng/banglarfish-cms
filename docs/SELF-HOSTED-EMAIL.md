# Self‑Hosted Email — Send **and** Receive, With No Third‑Party Service

A complete, reusable recipe for giving any web app its own mail system: transactional
sending that lands in the inbox, plus receiving that drops mail straight into your
database and a built‑in mail client.

No Resend. No SendGrid. No Brevo. No Mailgun. No monthly bill, no per‑email cost,
no vendor holding your deliverability hostage.

This is the exact setup running in production for this project, written up so it can be
lifted onto any other server. Every command and config block below is taken from the
live machine, not from memory.

---

## Table of contents

1. [What you get](#1-what-you-get)
2. [How it works](#2-how-it-works)
3. [Prerequisites](#3-prerequisites)
4. [Part A — Sending](#part-a--sending)
5. [Part B — DNS authentication (SPF, DKIM, DMARC)](#part-b--dns-authentication-spf-dkim-dmarc)
6. [Part C — Receiving into your database](#part-c--receiving-into-your-database)
7. [Part D — Application integration](#part-d--application-integration)
8. [Part E — Verification](#part-e--verification)
9. [Gotchas that cost real hours](#9-gotchas-that-cost-real-hours)
10. [Security checklist](#10-security-checklist)
11. [Operations](#11-operations)
12. [Porting to a new project](#12-porting-to-a-new-project)

---

## 1. What you get

| Capability | How |
|---|---|
| Send transactional email (signup, password reset, receipts) | Postfix on localhost, app talks SMTP to `127.0.0.1:25` |
| Land in the inbox, not spam | SPF + DKIM + DMARC, correct PTR/HELO |
| Receive mail for **every** address at your domain | MX → your server → Postfix pipe → database |
| Read/reply/forward inside your own admin panel | Rows in an `email_messages` table |
| Attachments, Cc/Bcc, HTML | nodemailer on the app side |
| Cost | **$0** beyond the server you already pay for |

**The trade‑off, stated honestly:** you own deliverability. A brand‑new server IP has no
sending reputation, so early mail can land in spam until you have warmed it up. A paid
provider rents you their established reputation. For transactional volume (receipts,
resets) self‑hosting is very manageable; for bulk marketing blasts, a provider is still
the easier road.

---

## 2. How it works

### Outbound
```
Your app ──SMTP──> Postfix (127.0.0.1:25) ──milter──> OpenDKIM (signs)
                                                          │
                                       recipient's MX <───┘  (port 25, TLS)
```

### Inbound
```
Sender ──> DNS: MX for yourdomain.com ──> your server:25 ──> Postfix
                                                              │
                                        transport_maps says "storedb"
                                                              ▼
                                          pipe to store-mail.py (as `mailstore`)
                                                              ▼
                                        INSERT into email_messages (folder='inbox')
                                                              ▼
                                                 your admin mail client
```

The key idea for receiving: **skip mailboxes entirely.** No Dovecot, no IMAP, no Maildir,
no user accounts. Postfix hands the raw message to a small script, which parses it and
writes a database row. Your app already knows how to render database rows.

That is what makes this simple enough to be worth self‑hosting.

---

## 3. Prerequisites

- A VPS with a **static public IP** and **port 25 open both ways**.
  Many budget/cloud hosts block outbound 25 by default (AWS, GCP, Azure, Oracle,
  DigitalOcean on new accounts). Ask support to open it before you start, or pick a host
  that allows it. **Check this first — everything else depends on it.**
- **Reverse DNS (PTR)** for your IP that resolves to a real hostname, and that hostname
  must resolve back to the same IP. Most hosts set this automatically to something like
  `srv123456.provider.cloud`. Set it in your host's control panel if not.
- Root access, a domain, and control of its DNS.
- Postgres (or adapt the insert to your database).

Check your PTR:
```bash
dig +short -x YOUR.SERVER.IP        # → srv123456.provider.cloud.
dig +short A srv123456.provider.cloud   # → YOUR.SERVER.IP   (must match)
```

---

## Part A — Sending

### A1. Install

```bash
apt-get update
apt-get install -y postfix opendkim opendkim-tools
# When prompted: choose "Internet Site", system mail name = your server's hostname
```

### A2. Configure Postfix

`myhostname` **must match your PTR record** — receiving servers check that the name you
announce in HELO matches reverse DNS. `myorigin` is the domain your mail appears to come from.

```bash
postconf -e "myhostname = srv123456.provider.cloud"   # must equal your PTR
postconf -e "myorigin = yourdomain.com"
postconf -e "inet_interfaces = loopback-only"          # send-only for now; Part C opens it
postconf -e "inet_protocols = ipv4"
postconf -e "mynetworks = 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128"
postconf -e "smtpd_relay_restrictions = permit_mynetworks permit_sasl_authenticated defer_unauth_destination"
postconf -e "smtp_tls_security_level = may"
postconf -e "smtpd_tls_security_level = may"
systemctl restart postfix
```

> `defer_unauth_destination` is what stops you being an **open relay**. Never remove it.
> `mynetworks` limited to loopback means only processes on this machine may send outbound
> through you.

### A3. Generate a DKIM key

```bash
mkdir -p /etc/opendkim/keys/yourdomain.com
cd /etc/opendkim/keys/yourdomain.com
opendkim-genkey -s mail -d yourdomain.com          # -s mail = selector name
chown -R opendkim:opendkim /etc/opendkim
chmod 600 /etc/opendkim/keys/yourdomain.com/mail.private
```

Produces `mail.private` (secret, stays on the server) and `mail.txt` (the public key you
publish in DNS).

### A4. Configure OpenDKIM

`/etc/opendkim.conf`:
```
Syslog                  yes
UMask                   007
Mode                    sv
Canonicalization        relaxed/simple
OversignHeaders         From
Socket                  inet:8891@localhost
PidFile                 /run/opendkim/opendkim.pid
UserID                  opendkim
ExternalIgnoreList      refile:/etc/opendkim/TrustedHosts
InternalHosts           refile:/etc/opendkim/TrustedHosts
KeyTable                file:/etc/opendkim/KeyTable
SigningTable            refile:/etc/opendkim/SigningTable
```

> ⚠️ **There is no `TrustedHosts` directive.** Plenty of blog posts tell you to write
> `TrustedHosts refile:/etc/opendkim/TrustedHosts` — OpenDKIM rejects it with
> *"unrecognized parameter"* and refuses to start. The real directives are
> **`InternalHosts`** and **`ExternalIgnoreList`**, both pointing at that same file.

`/etc/opendkim/KeyTable` (one line):
```
mail._domainkey.yourdomain.com yourdomain.com:mail:/etc/opendkim/keys/yourdomain.com/mail.private
```

`/etc/opendkim/SigningTable`:
```
*@yourdomain.com mail._domainkey.yourdomain.com
```

`/etc/opendkim/TrustedHosts`:
```
127.0.0.1
::1
localhost
yourdomain.com
```

`/etc/default/opendkim` — make the socket match `opendkim.conf`:
```
RUNDIR=/run/opendkim
SOCKET=inet:8891@localhost
USER=opendkim
GROUP=opendkim
PIDFILE=$RUNDIR/$NAME.pid
```

### A5. Wire OpenDKIM into Postfix as a milter

```bash
postconf -e "milter_protocol = 6"
postconf -e "milter_default_action = accept"
postconf -e "smtpd_milters = inet:localhost:8891"
postconf -e "non_smtpd_milters = inet:localhost:8891"

systemctl restart opendkim postfix
systemctl status opendkim --no-pager     # must be active
```

> `non_smtpd_milters` matters: mail injected locally via `sendmail`/nodemailer never
> passes through `smtpd`, so without this line **your app's mail goes out unsigned**.

---

## Part B — DNS authentication (SPF, DKIM, DMARC)

Three TXT records. Without them Gmail rejects outright with `550 5.7.26`.

| Type | Name | Value |
|---|---|---|
| TXT | `@` | `v=spf1 ip4:YOUR.SERVER.IP ~all` |
| TXT | `mail._domainkey` | contents of `mail.txt` (see below) |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:you@example.com` |

`mail.txt` splits the key across several quoted chunks with tabs and padding between
them. Join **only the quoted parts** — anything else and the record won't match:

```bash
grep -o '"[^"]*"' /etc/opendkim/keys/yourdomain.com/mail.txt | tr -d '"' | tr -d '\n'
```

Paste the result (starting `v=DKIM1; h=sha256; k=rsa; p=MIIBIjAN…`) as the record value.

Confirm what you published is byte‑identical to the local key:
```bash
diff <(grep -o '"[^"]*"' /etc/opendkim/keys/yourdomain.com/mail.txt | tr -d '"' | tr -d '\n') \
     <(dig +short TXT mail._domainkey.yourdomain.com @1.1.1.1 | sed 's/" "//g; s/"//g') \
  && echo "DKIM record matches"
```

### 🚨 Only **one** SPF record — ever

This single mistake cost hours of debugging. Two `v=spf1` records on the same name is a
**PermError** under RFC 7208, and every check fails — even though each record looks
perfect on its own.

Worse, it hides from casual inspection:
```bash
dig +short TXT yourdomain.com          # collapses duplicates — looks fine
dig TXT yourdomain.com | grep spf1     # shows the truth: two identical lines
```
If you need to authorise more senders, **merge them into one record**:
```
v=spf1 ip4:1.2.3.4 include:_spf.google.com ~all
```

Verify the published key matches the private one:
```bash
opendkim-testkey -d yourdomain.com -s mail -vvv
# → "key OK"   ("key not secure" just means no DNSSEC — harmless)
```

---

## Part C — Receiving into your database

### C1. A table to hold mail

```sql
CREATE TABLE IF NOT EXISTS email_messages (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder      text NOT NULL DEFAULT 'sent',      -- inbox | sent | drafts
  direction   text NOT NULL DEFAULT 'outbound',  -- inbound | outbound
  from_addr   text NOT NULL DEFAULT '',
  to_addr     text NOT NULL DEFAULT '',
  cc          text NOT NULL DEFAULT '',
  bcc         text NOT NULL DEFAULT '',
  subject     text NOT NULL DEFAULT '',
  html        text NOT NULL DEFAULT '',
  text_body   text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  message_id  text NOT NULL DEFAULT '',
  in_reply_to text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'sent',      -- sent | failed | received | draft
  error_text  text NOT NULL DEFAULT '',
  is_read     boolean NOT NULL DEFAULT true,
  category    text NOT NULL DEFAULT 'manual',
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS email_folder_idx  ON email_messages(folder);
CREATE INDEX IF NOT EXISTS email_created_idx ON email_messages(created_at);
```

### C2. A least‑privilege user and DB role

The delivery script is executed by Postfix on data an attacker controls. Give it the
absolute minimum: a system user with no shell, and a DB role that can **only INSERT**
into one table.

```bash
apt-get install -y python3-psycopg2
useradd -r -s /usr/sbin/nologin mailstore
```

```sql
CREATE ROLE mailin LOGIN PASSWORD 'a-long-random-password';
GRANT USAGE ON SCHEMA public TO mailin;
GRANT INSERT ON email_messages TO mailin;   -- no SELECT, no UPDATE, no DELETE
```

### C3. The delivery script

`/usr/local/bin/store-mail.py` — Postfix streams the raw message to stdin:

```python
#!/usr/bin/env python3
# Postfix pipe target: receives a raw inbound email on stdin, parses it, and
# inserts it into the email_messages table (folder=inbox).
import sys, email, json
from email.header import decode_header, make_header
import psycopg2

DSN = "postgres://mailin:YOUR_DB_PASSWORD@127.0.0.1:5432/yourdb"

def dh(v):
    """Decode RFC 2047 encoded headers (=?UTF-8?B?...?=) into real text."""
    if not v:
        return ""
    try:
        return str(make_header(decode_header(v)))
    except Exception:
        return str(v)

def decode_part(part):
    try:
        return (part.get_payload(decode=True) or b"").decode(
            part.get_content_charset() or "utf-8", "replace")
    except Exception:
        return ""

def main():
    raw = sys.stdin.buffer.read()
    msg = email.message_from_bytes(raw)
    frm     = dh(msg.get("From", ""))
    to      = dh(msg.get("To", ""))
    cc      = dh(msg.get("Cc", ""))
    subject = dh(msg.get("Subject", ""))
    msgid   = (msg.get("Message-ID", "") or "")[:200]
    html, text, attachments = "", "", []

    if msg.is_multipart():
        for part in msg.walk():
            if part.is_multipart():
                continue
            cdisp = str(part.get("Content-Disposition") or "").lower()
            ctype = part.get_content_type()
            if "attachment" in cdisp:
                payload = part.get_payload(decode=True) or b""
                # Metadata only — see the security note below.
                attachments.append({"filename": dh(part.get_filename() or "attachment"),
                                    "url": "", "size": len(payload)})
                continue
            if ctype == "text/html" and not html:
                html = decode_part(part)
            elif ctype == "text/plain" and not text:
                text = decode_part(part)
    else:
        body = decode_part(msg)
        if msg.get_content_type() == "text/html":
            html = body
        else:
            text = body

    if not html and text:
        esc = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        html = '<pre style="white-space:pre-wrap;font-family:inherit;margin:0">' + esc + "</pre>"

    html, text = html[:200000], text[:100000]   # bound what a stranger can store

    conn = psycopg2.connect(DSN)
    try:
        with conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO email_messages (folder,direction,from_addr,to_addr,cc,subject,"
                "html,text_body,attachments,message_id,status,is_read,category)"
                " VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s,%s,%s)",
                ("inbox", "inbound", frm, to, cc, subject, html, text,
                 json.dumps(attachments), msgid, "received", False, "inbound"),
            )
    finally:
        conn.close()
    return 0

if __name__ == "__main__":
    try:
        sys.exit(main())
    except Exception as e:
        sys.stderr.write("store-mail error: %r\n" % e)
        sys.exit(75)   # EX_TEMPFAIL → Postfix keeps the mail and retries. Never lose mail.
```

> **Exit code 75 (`EX_TEMPFAIL`) is the important detail.** If the database is briefly
> down and you exit non‑zero with anything else, Postfix treats it as permanent failure
> and **bounces the message — it is gone.** With 75 the mail stays queued and is retried.

Lock it down:
```bash
chown root:mailstore /usr/local/bin/store-mail.py
chmod 750 /usr/local/bin/store-mail.py    # the DB password lives in this file
```

### C4. Route your domain to the script

Add a custom transport in `/etc/postfix/master.cf` (note the two‑space indent on the
second line — Postfix requires it):

```
storedb   unix  -       n       n       -       -       pipe
  flags=Rq user=mailstore argv=/usr/local/bin/store-mail.py
```

Map the domain to it:
```bash
echo "yourdomain.com  storedb:" > /etc/postfix/transport
postmap /etc/postfix/transport
postconf -e "transport_maps = hash:/etc/postfix/transport"
```

### C5. Accept mail from the internet

```bash
postconf -e "inet_interfaces = all"          # was loopback-only in Part A
postconf -e "relay_domains = yourdomain.com"
systemctl restart postfix
ss -tlnp | grep ':25 '                       # → 0.0.0.0:25
```

> **Use `relay_domains`, not `mydestination`.** If you put your domain in
> `mydestination`, Postfix treats it as *local* and rejects anything that is not a Unix
> account: `550 5.1.1 User unknown in local recipient table`. With `relay_domains` +
> `transport_maps`, **every** address at your domain (`support@`, `info@`, `sales@`,
> anything) is accepted and handed to your script. No mailbox setup, no aliases.

### C6. DNS for receiving

| Type | Name | Value | Notes |
|---|---|---|---|
| MX | `@` | `srv123456.provider.cloud` | priority 10 |
| A | `mail` | `YOUR.SERVER.IP` | only if you prefer a branded MX name |

Two valid options:

- **Simplest:** point MX straight at your server's existing hostname
  (`srv123456.provider.cloud`). It already resolves and already matches your PTR — no new
  record needed.
- **Branded:** add an `A` record `mail → YOUR.SERVER.IP`, then point MX at
  `mail.yourdomain.com`.

> ⚠️ **If your DNS is behind Cloudflare, the mail host must be "DNS only" (grey cloud).**
> Cloudflare's proxy handles HTTP only — proxying the mail hostname publishes Cloudflare's
> IPs and mail can never reach you.
>
> ⚠️ **Do not also enable Cloudflare Email Routing.** It publishes its own MX records,
> which conflict with yours.

---

## Part D — Application integration

### D1. Sending from Node

```js
import nodemailer from "nodemailer";

const isLoopback = /^(127\.0\.0\.1|localhost|::1)$/i.test(host);

const transport = nodemailer.createTransport({
  host: "127.0.0.1",
  port: 25,
  secure: false,
  auth: undefined,                 // no credentials: it is your own machine
  // 🔑 see the note below
  ...(isLoopback ? { ignoreTLS: true, tls: { rejectUnauthorized: false } } : {}),
});

const info = await transport.sendMail({
  from: '"Your Store" <no-reply@yourdomain.com>',
  to, cc, bcc, subject, html,
  inReplyTo,                        // threads replies
  references: inReplyTo,
  attachments,                      // [{ filename, path | content }]
});
// Keep info.messageId so replies can thread later.
```

> 🚨 **The bug that silently breaks everything.** Postfix presents a *self‑signed*
> certificate on localhost. Node's TLS refuses it and `sendMail` throws
> **`self-signed certificate`** — and because most apps fire notification mail
> best‑effort inside a `try/catch`, **every email silently fails while the app looks
> healthy.** Manual `sendmail` tests still work, which makes it maddening to diagnose.
>
> Skipping TLS verification is safe *only* because the connection never leaves the
> machine. Keep strict verification for any external SMTP host.

### D2. Log every send

Insert a row into the same `email_messages` table (`folder='sent'`) on both success and
failure, storing `info.messageId`. You then get a Sent folder and an audit trail for free,
and replies can thread via `In-Reply-To`.

### D3. Reading and replying

Your admin UI is just CRUD over `email_messages`:

- **Inbox** — `WHERE folder='inbox' ORDER BY created_at DESC`
- **Reply** — prefill `to` from `from_addr`, pass the stored `message_id` as `inReplyTo`
- **Render** — put `html` inside a **sandboxed iframe**:
  ```html
  <iframe sandbox="" srcdoc={message.html} />
  ```
  Empty `sandbox` blocks scripts, forms and navigation. Never inject a stranger's HTML
  straight into your DOM.

---

## Part E — Verification

Work through these in order; each isolates one link in the chain.

**1. Is DKIM actually signing?**
```bash
echo "Subject: t

body" | sendmail -f no-reply@yourdomain.com root@localhost
grep -A3 "DKIM-Signature" /var/mail/root | tail -5      # expect d=yourdomain.com s=mail
```

**2. Do SPF and DKIM pass, independent of any provider?**
```bash
apt-get install -y python3-dkim python3-spf
python3 - <<'PY'
import spf
print(spf.check2(i="YOUR.SERVER.IP", s="no-reply@yourdomain.com", h="srv123456.provider.cloud"))
# → ('pass', 'sender SPF authorized')
PY
```
For DKIM, take a real signed message and verify it against live DNS:
```python
import dkim
msg = open("/tmp/signed.eml","rb").read()          # must start at a real header line
print("PASS" if dkim.verify(msg) else "FAIL")
```

**3. Does outbound reach a real inbox?**
```bash
printf 'Subject: test\nFrom: You <no-reply@yourdomain.com>\nTo: you@gmail.com\n\nhello\n' \
  | sendmail -f no-reply@yourdomain.com you@gmail.com
tail -f /var/log/mail.log      # look for  status=sent (250 ... OK)
```

**4. Does inbound storage work?** (tests the pipe, not DNS)
```bash
printf 'Subject: local\nFrom: t@example.net\nTo: support@yourdomain.com\n\nbody\n' \
  | sendmail -f t@example.net support@yourdomain.com
grep storedb /var/log/mail.log | tail -1       # status=sent (delivered via storedb service)
```

**5. Can the outside world reach port 25?**
```bash
grep "connect from" /var/log/mail.log | grep -v 127.0.0.1 | tail
```
Any external host appearing here (internet scanners find port 25 within hours) proves
inbound TCP works.

> ⚠️ Testing from your laptop is usually **not** conclusive: most home and office ISPs
> block outbound port 25, so your connection times out even when the server is perfect.

**6. The real end‑to‑end test.** Send from Gmail/Outlook to `support@yourdomain.com` and
watch:
```bash
tail -f /var/log/mail.log
```
A success looks like this:
```
connect from mail-yw1-f182.google.com[209.85.128.182]
... starttls=1
opendkim[...]: s=20251104 d=gmail.com   (their signature verified)
to=<support@yourdomain.com>, relay=storedb, status=sent (delivered via storedb service)
```

> ⚠️ **Sending to a fake address at Gmail does not test inbound.** Gmail rejects unknown
> recipients inline (`550` at RCPT TO), so the bounce is generated by *your own* Postfix
> and never touches Google's servers. It looks like a successful inbound delivery but
> proves nothing.

---

## 9. Gotchas that cost real hours

| # | Symptom | Cause | Fix |
|---|---|---|---|
| 1 | Gmail: `550 5.7.26 SPF did not pass`, records look perfect | **Two `v=spf1` records** → RFC 7208 PermError | Exactly one SPF record; check with `dig TXT` (not `dig +short`) |
| 2 | App emails never arrive; manual `sendmail` works | Node rejects Postfix's **self‑signed cert** on localhost → `self-signed certificate`, swallowed by best‑effort try/catch | `ignoreTLS: true, tls:{rejectUnauthorized:false}` for loopback only |
| 3 | OpenDKIM won't start, *"unrecognized parameter"* | `TrustedHosts` is **not a directive** | Use `InternalHosts` + `ExternalIgnoreList` |
| 4 | Inbound rejected `550 User unknown in local recipient table` | Domain in `mydestination` → treated as local mailboxes | Use `relay_domains` + `transport_maps` |
| 5 | Mail to your own domain bounces from the app | Same as #4, hits your own admin address | Same fix |
| 6 | Outbound signed for `smtpd` but app mail unsigned | Locally injected mail skips `smtpd` | Set `non_smtpd_milters` too |
| 7 | MX published but everything bounces | MX points at a hostname with **no A record** (NXDOMAIN) | Point MX at a name that resolves; verify `dig +short A <mx-host>` |
| 8 | Nothing arrives behind Cloudflare | Mail host was **orange‑clouded** | Set the MX target / `mail` record to **DNS only** |
| 9 | Local port‑25 test times out | **Your ISP** blocks outbound 25 | Test from the server or a real provider |
| 10 | First emails land in spam | New IP has no reputation | Normal. Warm up gradually; SPF/DKIM/DMARC + PTR do the heavy lifting |
| 11 | Mail lost when the DB hiccups | Script exited non‑zero → permanent failure | Exit **75** (`EX_TEMPFAIL`) so Postfix retries |

---

## 10. Security checklist

- [ ] **Not an open relay.** `smtpd_relay_restrictions` ends with `defer_unauth_destination`.
      Verify: `postconf -h smtpd_relay_restrictions`. Test yourself at
      [mxtoolbox.com/diagnostic.aspx](https://mxtoolbox.com/diagnostic.aspx).
- [ ] `mynetworks` is loopback only — no wider CIDR.
- [ ] Delivery script runs as a **dedicated no‑shell user**, `chmod 750`.
- [ ] Its DB role has **INSERT only** on the one table — no SELECT, UPDATE or DELETE.
- [ ] Body size is **bounded** before insert (a stranger controls this input).
- [ ] Inbound HTML is rendered in a **sandboxed iframe**, never injected into your DOM.
- [ ] Inbound attachments are stored as **metadata only** (or written outside the web root
      with a generated name and content‑type sniffing). Never save an attachment straight
      into a public directory — that is a stored‑XSS / malware‑hosting hole handed to you
      by anyone on the internet.
- [ ] The mail client UI sits behind an **authorisation check** like any other admin page.
- [ ] DKIM private key is `chmod 600`, owned by `opendkim`, and **never** committed to git.
- [ ] DMARC starts at `p=none`; tighten to `quarantine`/`reject` once reports look clean.

---

## 11. Operations

**Watch mail flow**
```bash
tail -f /var/log/mail.log
```

**Queue**
```bash
mailq                  # what is waiting
postqueue -f           # flush now
postsuper -d ALL       # ⚠️ delete every queued message
```

**Health**
```bash
systemctl status postfix opendkim
opendkim-testkey -d yourdomain.com -s mail -vvv
```

**Score your deliverability** — send a message to the address shown at
[mail-tester.com](https://www.mail-tester.com) and read the report. It grades SPF, DKIM,
DMARC, PTR, content and blacklists in one shot.

**Rotate the DKIM key** (yearly is good practice): generate a new selector
(e.g. `mail2`), publish its TXT record, update `KeyTable`/`SigningTable`, reload, and
remove the old record after a week.

---

## 12. Porting to a new project

1. Confirm **port 25 is open** and **PTR is set** — before anything else.
2. Run Part A (install, `myhostname` = PTR, DKIM key, milter wiring).
3. Publish the three DNS records — **one** SPF record only.
4. Create the table + `mailin` role; install the script; add the `storedb` transport;
   open `inet_interfaces`; add `relay_domains`.
5. Publish the MX record (**DNS only** if behind Cloudflare).
6. Point your app at `127.0.0.1:25` with **no auth** and the loopback TLS exception.
7. Work through Part E in order.

Everything is domain‑agnostic. Substitute `yourdomain.com`, the hostname and the DB DSN
and it drops onto any Linux box.

### Reference implementation in this repo

| Concern | File |
|---|---|
| Sending, templates, branded HTML layout | `src/server/email.ts` |
| Logging sends to the Sent folder | `src/server/mailbox.ts` |
| Mail client server functions (list/read/send/delete) | `src/lib/mail.functions.ts` |
| Mail client UI | `src/routes/admin.mail.tsx` |
| `email_messages` schema | `src/server/db/schema.ts` |
| Restricted support‑only role | `src/server/auth/context.ts` (`requireMailAccess`) |

---

*Written from a working production deployment: Ubuntu 24.04, Postfix 3.8.6,
OpenDKIM 2.11, PostgreSQL 16, Node 20.*
