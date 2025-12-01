const Post = require('../schemas/newschema');

//getting Posts data of a user (self)
const PostHandler = {
  async GetMyPosts(req, res) {
    try {
      const userId = req.user.id;
      if (!userId) {
        res.status(404).json({ message: 'Post not found' });
      }
      const UserPost = await Post.find({ userId })
        .populate('userId', 'username email')
        .lean();

      if (!UserPost) {
        res.status(404).json({
          success: false,
          message: 'User Post not found',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Post fetching succesfully completed ',
        data: UserPost,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async CreatePost(req, res) {
    try {
      const userId = req.user.id;

      if (!userId) {
        res.status(404).json({ message: 'Token is missing ' });
      }

      const { title, content, mediurl } = req.body;

      const post = await new Post({
        userId,
        title,
        content,
        mediurl,
      });

      const savedPost = await post.save();

      const PopulatedPost = await Post.findById(savedPost._id)
        .populate('userId', 'username email')
        .lean();

      console.log(PopulatedPost._id);

      res.status(201).json({
        success: true,
        message: 'The post created succesfully ',
        data: PopulatedPost,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async deletePost(req, res) {
    try {
      const userId = req.user.id;

      if (!userId) {
        res.status(404).json({ message: 'Post not found in the database' });
      }

      const post = await Post.findOne({ userId });

      res.status(201).json({
        success: true,
        message: 'Post deleted succesfully',
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  async UpdatePost(req, res) {
    try {
      const userId = req.user.id;

      if (!userId) {
        res.status(404).json({
          success: false,
          message: 'Post id is missing',
        });
      }

      const { title, content, mediaUrl } = req.body;

      const post = await Post.findOneAndUpdate(
        { id },
        { title, content, mediaUrl }
      );
      const savedPost = await post.save();
      const PopulatedPost = savedPost.toObject();

      res.status(201).json({
        success: true,
        message: 'Post uploded succesfully',
        data: PopulatedPost,
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  },

  async getPostsByUserId(req, res) {
    try {
      const { id } = req.params;

      const posts = await Post.find({
        userId: id,
        isPublished: true,
      })
        .populate('userId', 'username email')
        .lean();
      if (posts.length === 0) {
        res.status(404).json({
          message: 'NO POSTS FOUND FOR THIS USER',
        });
      }

      res.json({
        success: true,
        message: 'so number of the posts are fuck ',
        data: posts,
        count: posts.length,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getPostById(req, res) {
    try {
      const { postid } = req.params;

      const post = await Post.findById(postid)
        .populate('userId', 'username email')
        .populate('likes', 'viewcount');

      if (!post) {
        res.status(404).json({
          success: false,
          message: 'cant find the Post in the database ',
        });
      }

      await Post.findByIdAndUpdate(postid, { $inc: { viewCount: 1 } });

      res.json({
        success: true,
        data: post,
      });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getallPosts(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;
      const posts = await Post.find({ isPublished: true })
        .populate('userId', 'username email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const totalPost = await Post.countDocuments({ isPublished: true });

      res.status(200).json({
        success: true,
        data: posts,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalPost / limit),
          totalPost,
          postsPerPage: limit,
        },
      });
    } catch (error) {
      res.status(200).json({ message: error.message });
    }
  },

  async ToggleLike(req, res) {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await Post.findOne({ postId });

    if (!post) {
      res.status(404).json({
        success: false,
        message: 'id not found babygirl',
      });

      const hasliked = post.likes.includes(userId);

      if (hasliked) {
        await Post.findByIdAndUpdate(postId, { $pull: { likes: userId } });

        res.status.json({
          success: true,
          message: 'Post unliked',
          liked: false,
        });
      } else {
        await Post.findByIdAndUpdate({ postId }, { $push: { likes: userId } });
        {
          res.status(200).json({
            success: true,
            message: 'POST GOT  A LIKE ',
            liked: true,
          });
        }
      }
    }
  },
};

module.exports = PostHandler;
