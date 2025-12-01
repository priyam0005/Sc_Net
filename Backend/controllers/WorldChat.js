const PublicMessage = require("../schemas/PublicChat");

function CreateWorldChat(io) {
  const onlineUsers = new Map();

  // In-memory message cache (NO DB READ ON CONNECT)
  let messageCache = [];
  const MAX_CACHE = 50;

  // Message write queue with batching
  let writeQueue = [];
  let isWriting = false;

  // Debounced online count updates
  let onlineCountTimer = null;

  // Initialize cache on startup
  (async () => {
    try {
      messageCache = await PublicMessage.find({})
        .sort({ timestamp: -1 })
        .limit(MAX_CACHE)
        .lean()
        .select("SenderTag SenderName content timestamp profilePic replyTo")
        .exec();
      console.log(`✅ Cache loaded: ${messageCache.length} messages`);
    } catch (err) {
      console.error("❌ Cache init failed:", err);
      messageCache = [];
    }
  })();

  // Batch write messages to DB (every 500ms or 10 messages)
  async function flushWriteQueue() {
    if (isWriting || writeQueue.length === 0) return;

    isWriting = true;
    const batch = writeQueue.splice(0, 20);

    try {
      if (batch.length === 1) {
        await PublicMessage.create(batch[0]);
      } else {
        await PublicMessage.insertMany(batch, { ordered: false });
      }
      console.log(`✅ Saved ${batch.length} messages to DB`);
    } catch (err) {
      console.error("❌ Batch write failed:", err);
      writeQueue.unshift(...batch);
    } finally {
      isWriting = false;

      if (writeQueue.length > 0) {
        setImmediate(flushWriteQueue);
      }
    }
  }

  // Auto-flush queue every 500ms
  setInterval(flushWriteQueue, 500);

  function getuserTag(socket) {
    const socketId = socket.id || "unknown";
    const ip =
      socket.handshake?.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
      socket.handshake?.headers?.["x-real-ip"] ||
      socket.handshake?.address;

    if (ip) {
      const cleaned = ip.replace(/[^a-zA-Z0-9]/g, "").slice(-6);
      return `User-${cleaned}`;
    }
    return `User-${socketId.substring(0, 5)}`;
  }

  // Debounced online count broadcaster
  function broadcastOnlineCount() {
    if (onlineCountTimer) return;

    onlineCountTimer = setTimeout(() => {
      io.emit("online_count", onlineUsers.size);
      onlineCountTimer = null;
    }, 200);
  }

  io.on("connection", (socket) => {
    const senderTag = getuserTag(socket);
    let senderName = senderTag;
    let profilePic = null;
    let isInitialized = false;

    console.log(`✅ New connection: ${socket.id} → Tag: ${senderTag}`);

    // Send cache INSTANTLY (no await, no DB)
    socket.emit("public_chat_history", messageCache);

    // ADDED: Error handling
    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error);
    });

    // Fast auto-join (100ms instead of 3000ms)
    const autoJoinTimer = setTimeout(() => {
      if (!isInitialized) {
        isInitialized = true;
        onlineUsers.set(socket.id, {
          tag: senderTag,
          name: senderName,
          profilePic,
        });
        socket.emit("name_changed", {
          name: senderName,
          tag: senderTag,
          profilePic: null,
        });
        socket.broadcast.emit("user_joined", {
          tag: senderTag,
          name: senderName,
        });
        broadcastOnlineCount();
      }
    }, 100);

    socket.on("set_name", (name, userProfilePic) => {
      clearTimeout(autoJoinTimer);

      const newName = typeof name === "string" ? name.trim() : "";

      if (newName && newName.length > 0 && newName.length <= 20) {
        senderName = newName;
      } else if (newName === "") {
        senderName = senderTag;
      }

      if (
        typeof userProfilePic === "string" &&
        userProfilePic.startsWith("data:image/")
      ) {
        profilePic = userProfilePic;
      } else if (userProfilePic === null || userProfilePic === "") {
        profilePic = null;
      }

      onlineUsers.set(socket.id, {
        tag: senderTag,
        name: senderName,
        profilePic,
      });

      // ONLY emit to sender
      socket.emit("name_changed", {
        name: senderName,
        tag: senderTag,
        profilePic,
      });

      if (isInitialized) {
        socket.broadcast.emit("user_name_changed", {
          tag: senderTag,
          newName: senderName,
          profilePic,
        });
      } else {
        isInitialized = true;
        socket.broadcast.emit("user_joined", {
          tag: senderTag,
          name: senderName,
        });
      }

      broadcastOnlineCount();
      console.log(`✅ Name set: ${senderName} (#${senderTag})`);
    });

    socket.on("send_public_message", (data) => {
      clearTimeout(autoJoinTimer);

      // Initialize user instantly if not already
      if (!isInitialized) {
        isInitialized = true;
        onlineUsers.set(socket.id, {
          tag: senderTag,
          name: senderName,
          profilePic,
        });
        socket.broadcast.emit("user_joined", {
          tag: senderTag,
          name: senderName,
        });
        broadcastOnlineCount();
      }

      let content, replyTo, messageProfilePic;

      if (typeof data === "string") {
        content = data;
        replyTo = null;
        messageProfilePic = profilePic;
      } else {
        content = data.content;
        replyTo = data.replyTo || null;
        messageProfilePic = data.profilePic || profilePic;

        if (data.profilePic) {
          profilePic = data.profilePic;
          const u = onlineUsers.get(socket.id);
          if (u) u.profilePic = profilePic;
        }
      }

      const trimmedContent = content?.trim();
      if (!trimmedContent) return;

      const msgObj = {
        SenderTag: senderTag,
        SenderName: senderName,
        content: trimmedContent,
        timestamp: new Date(),
        profilePic: messageProfilePic,
      };

      if (replyTo?.id) {
        msgObj.replyTo = {
          id: replyTo.id,
          senderName: replyTo.senderName || "Anonymous",
          content: replyTo.content?.substring(0, 100) || "",
        };
      }

      // Generate temporary ID and emit IMMEDIATELY
      const tempId = `${Date.now()}-${socket.id.substring(0, 4)}`;
      const messageToEmit = { ...msgObj, _id: tempId };

      // EMIT FIRST - NO WAITING
      io.emit("received_message", messageToEmit);

      // Update cache immediately (in memory)
      messageCache.unshift(msgObj);
      if (messageCache.length > MAX_CACHE) {
        messageCache = messageCache.slice(0, MAX_CACHE);
      }

      // Queue DB write (batched, non-blocking)
      writeQueue.push(msgObj);

      // Trigger immediate flush if queue is getting large
      if (writeQueue.length >= 10) {
        setImmediate(flushWriteQueue);
      }
    });

    socket.on("disconnect", (reason) => {
      clearTimeout(autoJoinTimer);
      console.log(`❌ Client disconnected: ${socket.id}, Reason: ${reason}`);

      if (isInitialized) {
        onlineUsers.delete(socket.id);
        socket.broadcast.emit("user_left", {
          tag: senderTag,
          name: senderName,
        });
        broadcastOnlineCount();
      }
    });
  });

  // Periodic cache refresh (every 2 minutes)
  setInterval(async () => {
    if (isWriting) return;

    try {
      const fresh = await PublicMessage.find({})
        .sort({ timestamp: -1 })
        .limit(MAX_CACHE)
        .lean()
        .select("SenderTag SenderName content timestamp profilePic replyTo")
        .exec();
      messageCache = fresh;
      console.log("🔄 Cache refreshed");
    } catch (err) {
      console.error("❌ Cache refresh error:", err);
    }
  }, 2 * 60 * 1000);

  // Graceful shutdown - flush remaining messages
  process.on("SIGINT", async () => {
    console.log("🛑 Flushing remaining messages...");
    await flushWriteQueue();
    console.log("✅ Shutdown complete");
    process.exit(0);
  });
}

module.exports = CreateWorldChat;
