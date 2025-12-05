// routes/thoughts.js
const Thought = require("../schemas/thoughts");
const rankingService = require("../services/rankingServices");

// Middleware helper to get io instance
const getIO = (req) => {
  return req.app.get("io");
};

// CREATE thought
const createThought = async (req, res) => {
  try {
    const { content } = req.body;
    console.log(req.user.id);

    // Validate required fields
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: "Content is required" });
    }

    const thought = new Thought({
      userId: req.user.id,
      username: req.user.username,
      content,
      rankingScore: 0,
      likes: [],
      likeCount: 0,
      views: 0,
      viewedBy: [],
      isPublic: true,
    });

    await thought.save();

    // Emit real-time event
    const io = getIO(req);
    if (io) {
      io.emit("thought:created", thought);
    }

    res.status(201).json(thought);
  } catch (err) {
    console.error("Error creating thought:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET feed (trending/ranked)
const getFeed = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Validate pagination parameters
    if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({ error: "Invalid pagination parameters" });
    }

    const skip = (pageNum - 1) * limitNum;

    const thoughts = await rankingService.getTrendingThoughts(limitNum, skip);
    const total = await Thought.countDocuments({ isPublic: true });

    res.json({
      thoughts,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (err) {
    console.error("Error fetching feed:", err);
    res.status(500).json({ error: err.message });
  }
};

// LIKE thought
const likeThought = async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);

    if (!thought) {
      return res.status(404).json({ error: "Thought not found" });
    }

    // Initialize arrays if they don't exist
    if (!thought.likes) {
      thought.likes = [];
    }

    // Check if user already liked
    const userIdString = req.user.id.toString();
    const alreadyLiked = thought.likes.some(
      (id) => id.toString() === userIdString
    );

    if (alreadyLiked) {
      // Unlike
      thought.likes = thought.likes.filter(
        (id) => id.toString() !== userIdString
      );
    } else {
      // Like
      thought.likes.push(req.user.id);
    }

    thought.likeCount = thought.likes.length;
    await thought.save();

    // Recalculate ranking
    await rankingService.updateThoughtRankingScore(req.params.id);

    // Emit real-time event
    const io = getIO(req);
    if (io) {
      io.emit("thought:liked", {
        thoughtId: req.params.id,
        likeCount: thought.likeCount,
        userId: req.user.id,
        isLiked: !alreadyLiked,
      });
    }

    res.json({
      success: true,
      thought,
      isLiked: !alreadyLiked,
    });
  } catch (err) {
    console.error("Error liking thought:", err);
    res.status(500).json({ error: err.message });
  }
};

// TRACK VIEW
const trackView = async (req, res) => {
  try {
    const updateQuery = {
      $inc: { views: 1 },
    };

    // Only track unique views if user is authenticated
    if (req.user?.id) {
      updateQuery.$addToSet = { viewedBy: req.user.id };
    }

    const thought = await Thought.findByIdAndUpdate(
      req.params.id,
      updateQuery,
      { new: true }
    );

    if (!thought) {
      return res.status(404).json({ error: "Thought not found" });
    }

    // Recalculate ranking (don't await to improve response time)
    rankingService.updateThoughtRankingScore(req.params.id).catch((err) => {
      console.error("Error updating ranking score:", err);
    });

    res.json({
      success: true,
      views: thought.views,
    });
  } catch (err) {
    console.error("Error tracking view:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET single thought
const getThought = async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);

    if (!thought) {
      return res.status(404).json({ error: "Thought not found" });
    }

    if (!thought.isPublic) {
      // Check if user is the owner
      if (!req.user || thought.userId.toString() !== req.user.id) {
        return res.status(403).json({ error: "This thought is private" });
      }
    }

    res.json(thought);
  } catch (err) {
    console.error("Error fetching thought:", err);
    res.status(500).json({ error: err.message });
  }
};

// DELETE thought
const deleteThought = async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);

    if (!thought) {
      return res.status(404).json({ error: "Thought not found" });
    }

    if (thought.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Unauthorized: You can only delete your own thoughts" });
    }

    await Thought.findByIdAndDelete(req.params.id);

    // Emit real-time event
    const io = getIO(req);
    if (io) {
      io.emit("thought:deleted", { thoughtId: req.params.id });
    }

    res.json({
      success: true,
      message: "Thought deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting thought:", err);
    res.status(500).json({ error: err.message });
  }
};

// UPDATE thought
const updateThought = async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);

    if (!thought) {
      return res.status(404).json({ error: "Thought not found" });
    }

    if (thought.userId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ error: "Unauthorized: You can only edit your own thoughts" });
    }

    const { content } = req.body;

    if (content !== undefined) {
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ error: "Content cannot be empty" });
      }
      thought.content = content;
    }

    thought.updatedAt = Date.now();
    await thought.save();

    // Emit real-time event
    const io = getIO(req);
    if (io) {
      io.emit("thought:updated", thought);
    }

    res.json({
      success: true,
      thought,
    });
  } catch (err) {
    console.error("Error updating thought:", err);
    res.status(500).json({ error: err.message });
  }
};

// GET user's thoughts
const getUserThoughts = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = { userId: req.params.userId };

    // Only show public thoughts unless viewing own profile
    if (!req.user || req.user.id !== req.params.userId) {
      query.isPublic = true;
    }

    const thoughts = await Thought.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const total = await Thought.countDocuments(query);

    res.json({
      thoughts,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error("Error fetching user thoughts:", err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createThought,
  getFeed,
  likeThought,
  trackView,
  getThought,
  deleteThought,
  updateThought,
  getUserThoughts,
};
