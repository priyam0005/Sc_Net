const Profile = require("../schemas/Profile");
const Person = require("../schemas/userData");
const jwt = require("jsonwebtoken");
const { default: mongoose } = require("mongoose");

const Profilecontroller = {
  async getProfile(req, res) {
    try {
      const { displayName } = req.params;

      const user = await Profile.find({ displayName }).populate("userId");

      if (!user || user.length == 0) {
        res.status(404).json({
          message: "user not found",
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async sendRequest(req, res) {
    try {
      const { userId } = req.params;
      const senderId = req.user.id;

      if (!userId) {
        return res.status(400).json({
          message: "The userId is needed, baby girl.",
        });
      }

      if (!senderId) {
        return res.status(400).json({
          message: "Check if your user info is present, baby boy.",
        });
      }

      const user = await Profile.findOneAndUpdate(
        { userId },
        {
          $addToSet: { receivedRequests: senderId }, // sender sending request to user
        },
        { new: true }
      );

      const sender = await Profile.findOneAndUpdate(
        { userId: senderId },
        {
          $addToSet: { sentRequests: userId },
        },
        { new: true }
      );

      console.log(user);
      console.log(sender);

      const mora = Profile.findOne({ senderId });

      console.log(userId);
      console.log(senderId);

      const nora = await Profile.findOne({ userId })
        .populate("bio", "displayName")
        .lean();

      res.status(200).json({
        success: true,
        data: nora,
        message: "the friend req list should be added.",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Something went wrong on the server.",
        error: error.message,
      });
    }
  },

  async acccepRequest(req, res) {
    try {
      const userId = req.user.id;
      const { senderId } = req.body;

      const sender = await Profile.findOneAndUpdate(
        { userId: senderId },
        {
          $pull: { sentRequests: userId },
          $addToSet: { friends: userId },
        }
      );

      const user = await Profile.findOneAndUpdate(
        { userId },
        {
          $pull: {
            receivedRequests: senderId,
          },
          $addToSet: {
            friends: senderId,
          },
        }
      );

      console.log(user);

      res.status(201).json({
        success: true,
        message: "request Accepted",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async rejectReq(req, res) {
    try {
      const userId = req.user.id;
      const { senderId } = req.body;

      const user = await Profile.findOneAndUpdate(
        { userId },
        {
          $pull: { receivedRequests: senderId },
        }
      );

      const sender = await Profile.findOneAndUpdate(
        { userId: senderId },
        {
          $pull: {
            sentRequests: userId,
          },
        }
      );

      localStorage.removeItem("list");

      res.status(200).json({
        success: true,
        message: "The request was rejected by user",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async getuserProfile(req, res) {
    try {
      const { userId } = req.params;

      const user = await Profile.find({ userId }).populate("userId");

      if (!user) {
        res.status(404).json({
          message: "user not found",
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  },

  async getMyProfile(req, res) {
    try {
      const userId = req.user.id;

      let profile = await Profile.findOne({ userId }).populate(
        "userId",
        "username email"
      );

      if (!profile) {
        redirect("/updateProfile");
        profile = new Profile({ userId });
      }

      await profile.save();

      profile = await Profile.findOne({ userId })
        .populate("userId", "username email")
        .lean();

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      res.status(200).json({
        success: false,
        message: error.message,
      });
    }
  },

  async updateProfile(req, res) {
    try {
      const userId = req.user.id;

      if (!userId) {
        return res.status(404).json({ message: "profile not found" });
      }

      const { profilePic, displayName, mood, bio } = req.body;

      const profile = await Profile.findOneAndUpdate(
        { userId },
        {
          profilePic,
          displayName,
          mood,
          bio,
          LastOnline: new Date(),
        },
        { new: true, upsert: true }
      )
        .populate("userId", "username email")
        .lean();
      res.status(200).json({
        success: true,
        message: "Profile succesfully upadated ",
        data: profile,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "server error",
        error: error.message,
      });
    }
  },

  async createProfile(req, res) {
    try {
      const userId = req.user.id;

      console.log(userId);

      const { displayName, bio, mood, profilePic } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "the user id is required" });
      }

      const users = new Profile({
        userId,
        displayName,
        bio,
        profilePic,
        LastOnline: new Date(),
        mood,
      });

      const savedProfile = await users.save();

      const PopulatedProfile = savedProfile.toObject();

      return res.status(201).json({
        success: true,
        message: "Profile created Finally ",
        data: PopulatedProfile,
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  },

  async Reqlist(req, res) {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: "Unauthorized: User not authenticated.",
        });
      }
      const id = req.user.id;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid user ID format." });
      }

      const userList = await Profile.aggregate([
        {
          $match: {
            userId: new mongoose.Types.ObjectId(id),
          },
        },
        {
          $lookup: {
            from: "profiles", // Make sure this is the correct collection name for your Profile model
            localField: "receivedRequests",
            foreignField: "userId",
            as: "requestedusers",
          },
        },
        {
          $project: {
            _id: 0, // Exclude the main profile's _id
            // Project the desired fields from the 'requestedusers' array
            // You can call this field whatever you like, e.g., 'receivedRequestsDetails'
            receivedRequestsDetails: {
              $map: {
                input: "$requestedusers", // The array created by $lookup
                as: "user", // Alias for each item in the array
                in: {
                  userId: "$$user.userId", // The actual userId from the looked-up profile
                  profilePic: "$$user.profilePic", // The profilePic from the looked-up profile
                  displayName: "$$user.displayName", // The displayName from the looked-up profile
                },
              },
            },
          },
        },
      ]);

      console.log("Aggregated user list:", JSON.stringify(userList, null, 2));

      return res.status(200).json({ success: true, data: userList });
    } catch (error) {
      console.error("Error in Reqlist:", error);
      return res.status(500).json({ success: false, message: error.message });
    }
  },

  //creating an api which will be use data aggregation by getting the users friend id from the body

  async friendList(req, res) {
    try {
      const id = req.params;
      const friendList = await Profile.aggregate([
        {
          $match: { userId: new mongoose.Types.ObjectId(id) },
        },
        {
          $lookup: {
            from: "profiles",
            localField: "friends",
            foreignField: "userId",
            as: "friends",
          },
        },
        {
          $unwind: "$friends",
        },
        {
          $project: {
            _id: 0,
            profilePic: "$friends.profilePic",
            displayName: "$friends.displayName",
            userId: "$friends.userId",
          },
        },
      ]);

      res.status(200).json({
        succcess: true,
        data: friendList,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        messsage: error.message,
      });
    }
  },

  async friends(req, res) {
    try {
      const id = req.user.id || req.body;

      const friendsList = await Profile.aggregate([
        {
          $match: { userId: new mongoose.Types.ObjectId(id) },
        },
        {
          $lookup: {
            from: "profiles",
            localField: "friends",
            foreignField: "userId",
            as: "friend",
          },
        },
        {
          $unwind: "$friend",
        },
        {
          $project: {
            _id: 0,
            userId: "$friend.userId",
            profilePic: "$friend.profilePic",
            displayName: "$friend.displayName",
          },
        },
      ]);
      res.status(200).json({ success: true, data: friendsList });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  async deleteProfile(req, res) {
    try {
      const userId = req.user.id;

      const profile = await Profile.findOneAndDelete({ userId });

      if (!profile) {
        res.status(404).json({ message: "Profile not found" });
      }

      res.status(200).json({
        success: true,
        message: "Id is deleted succesfully",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "server error",
        error: error.message,
      });
    }
  },
};

module.exports = Profilecontroller;
