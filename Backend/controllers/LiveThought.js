// socket/handlers.js
const rankingService = require("../services/rankingServices");
const Thought = require("../schemas/thoughts");

module.exports = (io, socket) => {
  // User joins the wall (virtual room)
  socket.on("join-wall", (wallId) => {
    socket.join(`wall-${wallId}`);
    console.log(`User joined wall: ${wallId}`);
  });

  // New thought created - broadcast to all connected clients
  socket.on("thought-created", async (thoughtData) => {
    const thought = await Thought.findById(thoughtData._id).populate(
      "userId",
      "username userAvatar"
    );

    // Emit to everyone in the wall
    io.to(`wall-${thoughtData.wallId}`).emit("new-thought", thought);
  });

  // Like received - update ranking in real-time
  socket.on("thought-liked", async (thoughtId) => {
    await rankingService.updateThoughtRankingScore(thoughtId);

    const thought = await Thought.findById(thoughtId);
    io.to(`wall-${thoughtId}`).emit("thought-updated", {
      thoughtId,
      likeCount: thought.likeCount,
      rankingScore: thought.rankingScore,
    });
  });

  // View tracked
  socket.on("thought-viewed", async (thoughtId) => {
    await rankingService.updateThoughtRankingScore(thoughtId);

    io.to(`wall-${thoughtId}`).emit("view-count-updated", {
      thoughtId,
      viewCount: (await Thought.findById(thoughtId)).views,
    });
  });
};
