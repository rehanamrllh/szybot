# Discord Music Bot

Bot musik Discord berbasis `discord.js` v14 dan `discord-player` v7 dengan dukungan prefix command, queue, shuffle, repeat, dan tombol kontrol player seperti di screenshot.

## Fitur

- Mainkan lagu dari judul, URL, atau query pencarian
- Prefix command untuk `play`, `add`, `queue`, `shuffle`, `skip`, `stop`, dan `help`
- Queue list yang menampilkan lagu aktif dan daftar antrean
- Now Playing embed dengan tombol kontrol:
  - previous
  - pause / resume
  - next
  - repeat
- Status loop terlihat langsung di embed player

## Persyaratan

- Node.js 18+ direkomendasikan
- Bot Discord dengan intent berikut:
  - `Guilds`
  - `GuildMessages`
  - `MessageContent`
  - `GuildVoiceStates`
- FFmpeg tersedia lewat dependency `ffmpeg-static`

## Instalasi

```bash
npm install
```

## Konfigurasi

Isi token bot lewat environment variable:

```bash
set DISCORD_TOKEN=your_bot_token
```

Atau untuk PowerShell:

```powershell
$env:DISCORD_TOKEN="your_bot_token"
```

Prefix bisa diubah di [config.json](config.json).

## Menjalankan bot

```bash
node index.js
```

## Command

### Prefix

- `.play <query>` atau `.add <query>` — putar atau tambah lagu ke queue
- `.queue` — tampilkan daftar queue
- `.shuffle` — acak queue
- `.skip` — lewati lagu aktif
- `.stop` — hentikan player dan kosongkan queue
- `.help` — tampilkan bantuan

### Slash command

- `/play`
- `/queue`
- `/shuffle`
- `/skip`
- `/stop`
- `/help`

## Kontrol Player

Saat lagu diputar, bot akan mengirim embed **Now Playing** dengan tombol:

- ⏮️ previous
- ⏸️ pause
- ▶️ resume
- ⏭️ next
- 🔁 repeat

## Catatan

- Jangan commit token bot ke GitHub.
- Jika ingin menyimpan konfigurasi lokal, gunakan file lokal yang tidak di-commit atau environment variable.
