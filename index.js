const {
  Client,
  GuildMember,
  GatewayIntentBits,
  ApplicationCommandOptionType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Colors
} = require("discord.js");
const { Player, useMainPlayer, QueueRepeatMode } = require("discord-player");
const { DefaultExtractors } = require('@discord-player/extractor');
const config = require("./config.json");
const token = process.env.DISCORD_TOKEN || config.token;

const helpMessage = [
  "📚 Command yang bisa dipakai:",
  `• \`${config.prefix}play <query>\` - Putar / tambah lagu ke queue`,
  `• \`${config.prefix}add <query>\` - Tambah lagu ke queue`,
  `• \`${config.prefix}queue\` - Lihat queue`,
  `• \`${config.prefix}shuffle\` - Shuffle queue`,
  `• \`${config.prefix}skip\` - Skip lagu yang sedang diputar`,
  `• \`${config.prefix}stop\` - Stop & kosongkan queue`,
  `• \`${config.prefix}help\` - Menampilkan daftar command ini`,
].join("\n");

const client = new Client({
  intents: [
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.Guilds,
    GatewayIntentBits.MessageContent
  ]
});

client.on("ready", () => {
  console.log("Bot is online!");
  client.user.setActivity({ name: "🎶 | Music Time | .help ", type: 2 }); // type 2 is LISTENING
});

client.on("error", console.error);
client.on("warn", console.warn);

// Initialize player instance
const player = new Player(client);

// Load default extractors (YouTube, Spotify, SoundCloud, etc.)
player.extractors.loadMulti(DefaultExtractors);

// Setup event listeners for the player
function getQueueTextChannel(queue) {
  return queue?.metadata?.channel ?? queue?.metadata?.interaction?.channel ?? null;
}

function formatQueueLines(queue, maxItems = 20) {
  const currentTrack = queue?.currentTrack;
  const upcomingTracks = queue?.tracks?.toArray?.() ?? queue?.tracks?.data ?? [];
  const visibleTracks = upcomingTracks.slice(0, maxItems);

  const lines = [];
  lines.push(`Now playing: ${currentTrack?.title ?? "Unknown"}`);
  lines.push("");

  if (visibleTracks.length) {
    lines.push("Up next:");
    for (let index = 0; index < visibleTracks.length; index += 1) {
      const track = visibleTracks[index];
      lines.push(`${index + 1}. ${track?.title ?? "Unknown"}`);
    }
  } else {
    lines.push("Up next: (empty)");
  }

  if (upcomingTracks.length > visibleTracks.length) {
    lines.push("");
    lines.push(`...and ${upcomingTracks.length - visibleTracks.length} more`);
  }

  return lines.join("\n");
}

function buildPlayerMessagePayload(queue) {
  const track = queue.currentTrack;
  const paused = !!queue?.node?.isPaused?.();

  const requestedByUser = track?.requestedBy ?? queue?.metadata?.requestedBy ?? queue?.metadata?.interaction?.user;
  const requestedByText = requestedByUser?.id ? `<@${requestedByUser.id}>` : (requestedByUser?.toString?.() ?? "Unknown");

  const title = track?.title ?? "Unknown";
  const url = track?.url;
  const author = track?.author ?? "Unknown";
  const duration = track?.duration ?? "Unknown";
  const repeatMode = queue?.repeatMode ?? QueueRepeatMode.OFF;
  const loopStatus =
    repeatMode === QueueRepeatMode.OFF ? "Off" :
    repeatMode === QueueRepeatMode.TRACK ? "Track" :
    repeatMode === QueueRepeatMode.QUEUE ? "Queue" :
    repeatMode === QueueRepeatMode.AUTOPLAY ? "Autoplay" :
    "Off";

  const embed = new EmbedBuilder()
    .setColor(Colors.Green)
    .setTitle("Now Playing")
    .setDescription(
      [
        url ? `[**${title}**](${url})` : `**${title}**`,
        `By ${author}`,
        "",
        `Requested by ${requestedByText}`,
        "",
        `Loop: ${loopStatus}`,
        "",
        `Duration: \`${duration}\``
      ].join("\n")
    );

  const hasPrevious = (queue?.history?.tracks?.size ?? 0) > 0;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("music_prev")
      .setEmoji("⏮️")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!hasPrevious),
    new ButtonBuilder()
      .setCustomId("music_pause")
      .setEmoji(paused ? "▶️" : "⏸️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_next")
      .setEmoji("⏭️")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("music_repeat")
      .setEmoji("🔁")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!queue)
  );

  return { embeds: [embed], components: [row] };
}

async function upsertPlayerMessage(queue) {
  const channel = getQueueTextChannel(queue);
  if (!channel || !channel.send) return;

  const payload = buildPlayerMessagePayload(queue);
  const existing = queue?.metadata?.playerMessage;

  if (existing?.edit) {
    try {
      await existing.edit(payload);
      return;
    } catch {
      // fallthrough to sending a new message
    }
  }

  const msg = await channel.send(payload);
  if (queue?.metadata) queue.metadata.playerMessage = msg;
}

player.events.on("error", (queue, error) => {
  console.log(`[${queue.guild.name}] Error emitted from the queue: ${error.message}`);
});

player.events.on("playerError", (queue, error) => {
  console.log(`[${queue.guild.name}] Error emitted from the player: ${error.message}`);
});

player.events.on("playerStart", (queue, track) => {
  void upsertPlayerMessage(queue);
});

player.events.on("audioTrackAdd", (queue, track) => {
  const channel = getQueueTextChannel(queue);
  channel?.send?.(`🎶 | Track **${track.title}** queued!`);
});

player.events.on("disconnect", (queue) => {
  const channel = getQueueTextChannel(queue);
  channel?.send?.("❌ | I was manually disconnected from the voice channel, clearing queue!");
});

player.events.on("emptyChannel", (queue) => {
  const channel = getQueueTextChannel(queue);
  channel?.send?.("❌ | Nobody is in the voice channel, leaving...");
});

player.events.on("emptyQueue", (queue) => {
  const channel = getQueueTextChannel(queue);
  channel?.send?.("✅ | Queue finished!");
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;
  if (!client.application?.owner) await client.application?.fetch();

  if (message.content === "!deploy" && message.author.id === client.application?.owner?.id) {
    await message.guild.commands.set([
      {
        name: "play",
        description: "Plays a song from youtube",
        options: [
          {
            name: "query",
            type: ApplicationCommandOptionType.String,
            description: "The song you want to play",
            required: true
          }
        ]
      },
      { name: "shuffle", description: "Shuffle the queue" },
      { name: "queue", description: "Show the queue list" },
      { name: "skip", description: "Skip to the current song" },
      { name: "stop", description: "Stop the player" },
      { name: "help", description: "Show the list of available commands" },
    ]);
    await message.reply("Deployed!");
  }

  if (message.content === `${config.prefix}help`) {
    return void message.reply(helpMessage);
  }

  // Prefix commands (play/add/queue/skip/stop/help)
  if (!message.content.startsWith(config.prefix)) return;
  const [rawCommand, ...args] = message.content.slice(config.prefix.length).trim().split(/\s+/);
  const command = (rawCommand || "").toLowerCase();

  if (!command) return;
  if (command === "help") {
    return void message.reply(helpMessage);
  }

  // Ignore unknown prefix commands
  const isPlayCommand = command === "play" || command === "add" || command === "addqueue" || command === "aq" || command === "qadd";
  const isQueueCommand = command === "queue" || command === "q";
  const isShuffleCommand = command === "shuffle" || command === "mix";
  const isSkipCommand = command === "skip";
  const isStopCommand = command === "stop";
  if (!isPlayCommand && !isQueueCommand && !isShuffleCommand && !isSkipCommand && !isStopCommand) return;

  if (isQueueCommand) {
    const queue = useMainPlayer().nodes.get(message.guildId);
    if (!queue || !queue.isPlaying()) {
      return void message.reply("❌ | No music is being played!");
    }

    const queueText = formatQueueLines(queue, 25);
    return void message.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Green)
          .setTitle("Queue List")
          .setDescription(`\`\`\`\n${queueText}\n\`\`\``)
      ]
    });
  }

  if (!(message.member instanceof GuildMember) || !message.member.voice.channel) {
    return void message.reply("You are not in a voice channel!");
  }

  const botVoiceChannelId = message.guild.members.me?.voice?.channelId;
  if (botVoiceChannelId && message.member.voice.channelId !== botVoiceChannelId) {
    return void message.reply("You are not in my voice channel!");
  }

  if (isPlayCommand) {
    const query = args.join(" ").trim();
    if (!query) {
      return void message.reply(`Format: \`${config.prefix}${command} <query/url>\``);
    }

    try {
      await player.play(message.member.voice.channel, query, {
        requestedBy: message.author,
        nodeOptions: {
          metadata: {
            channel: message.channel,
            requestedBy: message.author
          }
        }
      });
      return void message.reply("⏱ | Loading your track...");
    } catch (e) {
      return void message.reply(`Something went wrong: ${e.message}`);
    }
  }

  if (isShuffleCommand) {
    const queue = useMainPlayer().nodes.get(message.guildId);
    if (!queue || !queue.isPlaying()) return void message.reply("❌ | No music is being played!");

    queue.toggleShuffle(false);
    const queueText = formatQueueLines(queue, 25);
    return void message.reply({
      content: "🔀 | Queue shuffled!",
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Green)
          .setTitle("Queue List")
          .setDescription(`\`\`\`\n${queueText}\n\`\`\``)
      ]
    });
  }

  if (isSkipCommand) {
    const queue = useMainPlayer().nodes.get(message.guildId);
    if (!queue || !queue.isPlaying()) return void message.reply("❌ | No music is being played!");

    const currentTrack = queue.currentTrack;
    queue.node.skip();
    return void message.reply(`✅ | Skipped **${currentTrack?.title ?? "Unknown"}**!`);
  }

  if (isStopCommand) {
    const queue = useMainPlayer().nodes.get(message.guildId);
    if (!queue || !queue.isPlaying()) return void message.reply("❌ | No music is being played!");

    queue.delete();
    return void message.reply("🛑 | Stopped the player!");
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    if (!interaction.guildId) return;
    if (!interaction.customId?.startsWith("music_")) return;

    const queue = useMainPlayer().nodes.get(interaction.guildId);
    if (!queue || !queue.isPlaying()) {
      return void interaction.reply({ content: "❌ | No music is being played!", ephemeral: true });
    }

    if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
      return void interaction.reply({ content: "You are not in a voice channel!", ephemeral: true });
    }

    const botVoiceChannelId = interaction.guild.members.me?.voice?.channelId;
    if (botVoiceChannelId && interaction.member.voice.channelId !== botVoiceChannelId) {
      return void interaction.reply({ content: "You are not in my voice channel!", ephemeral: true });
    }

    await interaction.deferUpdate();
    try {
      switch (interaction.customId) {
        case "music_prev":
          await queue.history.back(true);
          break;
        case "music_pause": {
          const paused = queue.node.isPaused();
          queue.node.setPaused(!paused);
          break;
        }
        case "music_next":
          queue.node.skip();
          break;
        case "music_repeat": {
          const current = queue.repeatMode ?? QueueRepeatMode.OFF;
          queue.setRepeatMode(current === QueueRepeatMode.OFF ? QueueRepeatMode.QUEUE : QueueRepeatMode.OFF);
          break;
        }
        default:
          break;
      }

      // Track changes (prev/next) will trigger playerStart and refresh anyway,
      // but we also refresh immediately for pause/repeat.
      if (queue?.metadata) queue.metadata.playerMessage = interaction.message;
      await interaction.message.edit(buildPlayerMessagePayload(queue));
    } catch {
      // ignore to avoid breaking the interaction
    }
    return;
  }

  if (!interaction.isChatInputCommand() || !interaction.guildId) return;

  if (interaction.commandName === "help") {
    return void interaction.reply({ content: helpMessage, ephemeral: true });
  }

  if (interaction.commandName === "queue") {
    await interaction.deferReply();
    const queue = useMainPlayer().nodes.get(interaction.guildId);
    if (!queue || !queue.isPlaying()) return void interaction.followUp({ content: "❌ | No music is being played!" });

    const queueText = formatQueueLines(queue, 25);
    return interaction.followUp({
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Green)
          .setTitle("Queue List")
          .setDescription(`\`\`\`\n${queueText}\n\`\`\``)
      ]
    });
  }

  if (!(interaction.member instanceof GuildMember) || !interaction.member.voice.channel) {
    return void interaction.reply({ content: "You are not in a voice channel!", ephemeral: true });
  }

  if (interaction.guild.members.me.voice.channelId && interaction.member.voice.channelId !== interaction.guild.members.me.voice.channelId) {
    return void interaction.reply({ content: "You are not in my voice channel!", ephemeral: true });
  }

  if (interaction.commandName === "play") {
    await interaction.deferReply();
    const query = interaction.options.getString("query");

    try {
      await player.play(interaction.member.voice.channel, query, {
        requestedBy: interaction.user,
        nodeOptions: {
          metadata: {
            interaction,
            channel: interaction.channel,
            requestedBy: interaction.user
          }
        }
      });

      return interaction.followUp({ content: `⏱ | Loading your track...` });
    } catch (e) {
      return interaction.followUp(`Something went wrong: ${e.message}`);
    }

  } else if (interaction.commandName === "shuffle") {
    await interaction.deferReply();
    const queue = useMainPlayer().nodes.get(interaction.guildId);
    if (!queue || !queue.isPlaying()) return void interaction.followUp({ content: "❌ | No music is being played!" });

    queue.toggleShuffle(false);
    const queueText = formatQueueLines(queue, 25);
    return interaction.followUp({
      content: "🔀 | Queue shuffled!",
      embeds: [
        new EmbedBuilder()
          .setColor(Colors.Green)
          .setTitle("Queue List")
          .setDescription(`\`\`\`\n${queueText}\n\`\`\``)
      ]
    });

  } else if (interaction.commandName === "skip") {
    await interaction.deferReply();
    const queue = useMainPlayer().nodes.get(interaction.guildId);
    if (!queue || !queue.isPlaying()) return void interaction.followUp({ content: "❌ | No music is being played!" });
    
    const currentTrack = queue.currentTrack;
    queue.node.skip();
    return void interaction.followUp({ content: `✅ | Skipped **${currentTrack.title}**!` });

  } else if (interaction.commandName === "stop") {
    await interaction.deferReply();
    const queue = useMainPlayer().nodes.get(interaction.guildId);
    if (!queue || !queue.isPlaying()) return void interaction.followUp({ content: "❌ | No music is being played!" });
    
    queue.delete();
    return void interaction.followUp({ content: "🛑 | Stopped the player!" });

  } else {
    interaction.reply({ content: "Unknown command!", ephemeral: true });
  }
});

if (!token) {
  console.error("Missing bot token. Set DISCORD_TOKEN or fill config.json token locally.");
  process.exit(1);
}

client.login(token);
