// services/rankingService.js

const Thought = require("../schemas/thoughts");

class RankingService {
  /**
   * Calculate ranking score for a thought
   * Formula: (likes * weight_likes) + (views * weight_views) + (recency_boost)
   */
  calculateRankingScore() {
    const WEIGHTS = {
      likes: 100, // Each like worth 100 points
      views: 1, // Each view worth 1 point
      timeDecay: 0.95, // Decay factor per hour
    };

    const likeScore = thought.likeCount * WEIGHTS.likes;
    const viewScore = thought.views * WEIGHTS.views;

    // Time decay - newer posts rank higher
    const hoursSinceCreation =
      (Date.now() - new Date(thought.createdAt)) / (1000 * 60 * 60);
    const recencyBoost = Math.pow(WEIGHTS.timeDecay, hoursSinceCreation);

    // Engagement rate bonus
    const engagementRate = thought.likeCount / Math.max(thought.views, 1);
    const engagementBonus = engagementRate > 0.1 ? 50 : 0;

    const totalScore = (likeScore + viewScore + engagementBonus) * recencyBoost;

    return Math.round(totalScore * 1000) / 1000; // Round to 3 decimals
  }

  /**
   * Update ranking score whenever engagement changes
   */
  async updateThoughtRankingScore(thoughtId) {
    const thought = await Thought.findById(thoughtId);
    if (!thought) return;

    const newScore = this.calculateRankingScore(thought);
    await Thought.findByIdAndUpdate(thoughtId, {
      rankingScore: newScore,
      lastEngagementAt: new Date(),
    });

    // Emit event for real-time UI update
    eventEmitter.emit("thought:rankingUpdated", {
      thoughtId,
      newScore,
    });
  }

  /**
   * Get trending thoughts
   */
  async getTrendingThoughts(limit = 20, skip = 0) {
    return await Thought.find({ isPublic: true })
      .sort({ rankingScore: -1, createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate("userId", "username userAvatar")
      .lean();
  }

  /**
   * Get feed for a specific time period
   */
  async getFeedByTimeRange(startTime, endTime, limit = 20) {
    return await Thought.find({
      isPublic: true,
      createdAt: { $gte: startTime, $lte: endTime },
    })
      .sort({ rankingScore: -1 })
      .limit(limit)
      .populate("userId", "username userAvatar");
  }
}

module.exports = new RankingService();
